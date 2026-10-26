require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Task = require('./models/tasks');
const authRoutes = require('./routes/auth');
const auth = require('./middleware/auth');
const validateTaskInput = require('./middleware/validateTaskInput');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ================================
// 1. DATABASE CONNECTION
// ================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch((err) => console.error('MongoDB Connection Error:', err.message));

// ================================
// 2. AUTH ROUTES (public — no token needed to register/login/google/forgot-password)
// ================================
app.use('/', authRoutes);

// ================================
// 3. TASK ROUTES (protected — auth middleware runs first on every one)
// ================================

// GET /tasks - fetch all tasks, with creator name + role attached
app.get('/tasks', auth, async (req, res, next) => {
  try {
    const tasks = await Task.find()
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    next(err);
  }
});

// GET /tasks/:id - fetch single task
app.get('/tasks/:id', auth, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('createdBy', 'name role');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

// POST /tasks - create a new task, owned by whoever is logged in
app.post('/tasks', auth, validateTaskInput, async (req, res, next) => {
  try {
    const task = await Task.create({ ...req.body, createdBy: req.user.id });
    const populated = await task.populate('createdBy', 'name role');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
});

// PUT /tasks/:id - update a task (creator only)
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

    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

// DELETE /tasks/:id - delete a task (creator only)
app.delete('/tasks/:id', auth, async (req, res, next) => {
  try {
    const existing = await Task.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (existing.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete tasks you created',
      });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ================================
// 4. ERROR HANDLER (must stay last)
// ================================
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
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
