require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');

const Task              = require('./models/tasks');
const authRoutes        = require('./routes/auth');
const auth              = require('./middleware/auth');
const validateTaskInput = require('./middleware/validateTaskInput');
const { cache, recordHit, recordMiss, getStats } = require('./utils/cache');

const app  = express();
const PORT = process.env.PORT || 5000;

// Cache key constants — avoids typos across routes
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

/**
 * GET /tasks
 * Practical 9: served from cache when available (TTL 60 s).
 * Response headers:
 *   X-Cache          : HIT | MISS
 *   X-Cache-TTL      : seconds remaining (only on HIT)
 *   X-Response-Time  : ms taken to build this response
 */
app.get('/tasks', auth, async (req, res, next) => {
  const start   = Date.now();
  const cached  = cache.get(CACHE_ALL_TASKS);

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
    console.log(`[CACHE] GET /tasks → MISS — fetched from DB and cached (60 s TTL)`);
    res.json({ success: true, count: tasks.length, data: tasks, fromCache: false });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /tasks/:id
 * Cached individually per task ID.
 */
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
    console.log(`[CACHE] GET /tasks/${req.params.id} → HIT`);
    return res.json({ success: true, data: cached, fromCache: true });
  }

  try {
    recordMiss();
    const task = await Task.findById(req.params.id).populate('createdBy', 'name role');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    cache.set(key, task);
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Response-Time', `${Date.now() - start}ms`);
    console.log(`[CACHE] GET /tasks/${req.params.id} → MISS — cached`);
    res.json({ success: true, data: task, fromCache: false });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /tasks
 * Invalidates the all-tasks cache so the next GET reflects the new task.
 */
app.post('/tasks', auth, validateTaskInput, async (req, res, next) => {
  try {
    const task      = await Task.create({ ...req.body, createdBy: req.user.id });
    const populated = await task.populate('createdBy', 'name role');

    // Invalidate — new task must appear on next GET /tasks
    cache.del(CACHE_ALL_TASKS);
    console.log('[CACHE] POST /tasks → invalidated all_tasks');

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /tasks/:id
 * Invalidates both the single-task cache and the all-tasks cache.
 */
app.put('/tasks/:id', auth, validateTaskInput, async (req, res, next) => {
  try {
    const existing = await Task.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (existing.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit tasks you created',
      });
    }

    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name role');

    // Invalidate both caches
    cache.del(taskKey(req.params.id));
    cache.del(CACHE_ALL_TASKS);
    console.log(`[CACHE] PUT /tasks/${req.params.id} → invalidated task_${req.params.id} + all_tasks`);

    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /tasks/:id
 * Invalidates both the single-task cache and the all-tasks cache.
 */
app.delete('/tasks/:id', auth, async (req, res, next) => {
  try {
    const existing = await Task.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (!req.user.isAdmin && existing.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete tasks you created',
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    // Invalidate both caches
    cache.del(taskKey(req.params.id));
    cache.del(CACHE_ALL_TASKS);
    console.log(`[CACHE] DELETE /tasks/${req.params.id} → invalidated task_${req.params.id} + all_tasks`);

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ================================
// 4. CACHE DEBUG ENDPOINT
// GET /cache/stats — shows hit/miss counters, active keys, TTLs
// Useful for Postman screenshots for the practical report.
// ================================
app.get('/cache/stats', auth, (req, res) => {
  res.json({ success: true, data: getStats() });
});

// ================================
// 5. ERROR HANDLER (must stay last)
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
});
