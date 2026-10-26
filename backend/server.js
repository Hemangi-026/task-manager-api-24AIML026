require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');

const Task              = require('./models/tasks');
const authRoutes        = require('./routes/auth');
const auth              = require('./middleware/auth');
const validateTaskInput = require('./middleware/validateTaskInput');
const { cache, recordHit, recordMiss, getStats } = require('./utils/cache');

// Practical 10: EventEmitter-based background notification system
const notifier = require('./utils/notificationEmitter');

const app  = express();
const PORT = process.env.PORT || 5000;

const CACHE_ALL_TASKS = 'all_tasks';
const taskKey = (id) => `task_${id}`;

app.use(cors());
app.use(express.json());

// ================================
// 1. DATABASE CONNECTION
// ================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch((err) => console.error('MongoDB Connection Error:', err.message));

// ================================
// 2. AUTH ROUTES (public)
// ================================
app.use('/', authRoutes);

// ================================
// 3. TASK ROUTES (protected)
// ================================

// GET /tasks — cache-first (Practical 9)
app.get('/tasks', auth, async (req, res, next) => {
  const start  = Date.now();
  const cached = cache.get(CACHE_ALL_TASKS);

  if (cached) {
    recordHit();
    const ttl = cache.getTtl(CACHE_ALL_TASKS);
    const remainingSec = ttl ? Math.round((ttl - Date.now()) / 1000) : 0;
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('X-Cache-TTL', remainingSec);
    res.setHeader('X-Response-Time', `${Date.now() - start}ms`);
    console.log(`[CACHE] GET /tasks → HIT (${remainingSec}s TTL remaining)`);
    return res.json({ success: true, count: cached.length, data: cached, fromCache: true });
  }

  try {
    recordMiss();
    const tasks = await Task.find()
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });

    cache.set(CACHE_ALL_TASKS, tasks);
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Response-Time', `${Date.now() - start}ms`);
    console.log('[CACHE] GET /tasks → MISS — fetched from DB and cached (60s TTL)');
    res.json({ success: true, count: tasks.length, data: tasks, fromCache: false });
  } catch (err) {
    next(err);
  }
});

// GET /tasks/:id — per-task cache
app.get('/tasks/:id', auth, async (req, res, next) => {
  const start  = Date.now();
  const key    = taskKey(req.params.id);
  const cached = cache.get(key);

  if (cached) {
    recordHit();
    const ttl = cache.getTtl(key);
    const remainingSec = ttl ? Math.round((ttl - Date.now()) / 1000) : 0;
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('X-Cache-TTL', remainingSec);
    res.setHeader('X-Response-Time', `${Date.now() - start}ms`);
    return res.json({ success: true, data: cached, fromCache: true });
  }

  try {
    recordMiss();
    const task = await Task.findById(req.params.id).populate('createdBy', 'name role');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    cache.set(key, task);
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Response-Time', `${Date.now() - start}ms`);
    res.json({ success: true, data: task, fromCache: false });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /tasks
 * Practical 10: after saving to DB and sending 201, emit 'task-created'.
 * The emit is FIRE-AND-FORGET — it does NOT block the response.
 * The API returns ~12 ms; the handler logs after delayMs (default 2000 ms).
 */
app.post('/tasks', auth, validateTaskInput, async (req, res, next) => {
  const apiStart = Date.now(); // to show non-blocking in console

  try {
    const task      = await Task.create({ ...req.body, createdBy: req.user.id });
    const populated = await task.populate('createdBy', 'name role');

    cache.del(CACHE_ALL_TASKS);
    console.log('[CACHE] POST /tasks → invalidated all_tasks');

    // ── Practical 10: emit BEFORE sending response so timestamp is accurate ──
    const simulateError = req.body.simulateNotificationError === true;
    notifier.emit('task-created', {
      task:          populated.toObject ? populated.toObject() : populated,
      user:          populated.createdBy,
      timestamp:     new Date().toISOString(),
      simulateError,
    });

    // API response — returns immediately, before the 2-s handler fires
    const apiDuration = Date.now() - apiStart;
    console.log(`[API] POST /tasks responded in ${apiDuration}ms (notification fires asynchronously in ${notifier.delayMs}ms)`);
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
});

// PUT /tasks/:id
app.put('/tasks/:id', auth, validateTaskInput, async (req, res, next) => {
  try {
    const existing = await Task.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Task not found' });
    if (existing.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only edit tasks you created' });
    }

    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    }).populate('createdBy', 'name role');

    cache.del(taskKey(req.params.id));
    cache.del(CACHE_ALL_TASKS);
    console.log(`[CACHE] PUT /tasks/${req.params.id} → invalidated`);

    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /tasks/:id
 * Practical 10: emit 'task-deleted' after removing from DB.
 */
app.delete('/tasks/:id', auth, async (req, res, next) => {
  const apiStart = Date.now();

  try {
    const existing = await Task.findById(req.params.id).populate('createdBy', 'name role');
    if (!existing) return res.status(404).json({ success: false, message: 'Task not found' });
    if (!req.user.isAdmin && existing.createdBy._id?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only delete tasks you created' });
    }

    await Task.findByIdAndDelete(req.params.id);

    cache.del(taskKey(req.params.id));
    cache.del(CACHE_ALL_TASKS);
    console.log(`[CACHE] DELETE /tasks/${req.params.id} → invalidated`);

    // ── Practical 10: emit 'task-deleted' ──
    notifier.emit('task-deleted', {
      task:      existing.toObject ? existing.toObject() : existing,
      user:      existing.createdBy,
      taskId:    req.params.id,
      timestamp: new Date().toISOString(),
    });

    const apiDuration = Date.now() - apiStart;
    console.log(`[API] DELETE /tasks responded in ${apiDuration}ms (notification fires asynchronously)`);
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ================================
// 4. CACHE DEBUG ENDPOINT (Practical 9)
// ================================
app.get('/cache/stats', auth, (req, res) => {
  res.json({ success: true, data: getStats() });
});

// ================================
// 5. NOTIFICATION DEBUG ENDPOINTS (Practical 10)
// ================================

// GET /notifications/logs — recent event log + stats
app.get('/notifications/logs', auth, (req, res) => {
  res.json({ success: true, stats: notifier.getStats(), logs: notifier.getLogs() });
});

// POST /notifications/reset — clear counters + log buffer
app.post('/notifications/reset', auth, (req, res) => {
  notifier.clearLogs();
  res.json({ success: true, message: 'Notification logs and counters cleared' });
});

// POST /notifications/delay — change simulated slow delay at runtime
app.post('/notifications/delay', auth, (req, res) => {
  try {
    const newDelay = notifier.setDelay(req.body.delayMs);
    res.json({ success: true, message: `Delay updated to ${newDelay}ms` });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /notifications/simulate-error — fires a task-created event that throws
app.post('/notifications/simulate-error', auth, (req, res) => {
  notifier.emit('task-created', {
    task:          { title: 'Simulated Error Task', _id: 'simulated' },
    user:          { name: 'Test User' },
    timestamp:     new Date().toISOString(),
    simulateError: true,
  });
  res.json({
    success: true,
    message: 'Error simulation dispatched — check server console and GET /notifications/logs',
  });
});

// ================================
// 6. ERROR HANDLER (must stay last)
// ================================
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid task ID format' });
  }
  res.status(500).json({ success: false, message: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`[Notification System] EventEmitter ready — delay: ${notifier.delayMs}ms`);
});
