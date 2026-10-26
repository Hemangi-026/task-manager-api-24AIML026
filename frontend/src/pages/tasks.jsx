import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../components/spinner';
import ErrorMessage from '../components/errormessage';
import Toast from '../components/toast';
import TaskCard from '../components/TaskCard';
import { useAuth } from '../context/AuthContext';
import { getTasks, createTask, updateTask, deleteTask } from '../api';

/**
 * TaskStats is lazy-loaded — recharts (~180 kB) is NOT in the main bundle.
 * Vite emits it as a separate chunk downloaded only when the user clicks
 * "Show Stats" for the first time.
 */
const TaskStats = lazy(() => import('../components/TaskStats'));

function Tasks() {
  const { isAuthenticated, loading: authLoading, logout, user } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showStats, setShowStats]   = useState(false);

  // Create-task form
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority]     = useState('medium');
  const [dueDate, setDueDate]       = useState('');
  const [creating, setCreating]     = useState(false);

  const [busyTaskId, setBusyTaskId] = useState(null);
  const [toast, setToast]           = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAuthFailure = (err) => {
    if (err.status === 401) { logout(); navigate('/login'); return true; }
    return false;
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/login');
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    getTasks()
      .then((res) => setTasks(res.data))
      .catch((err) => { if (!handleAuthFailure(err)) setError(err.message); })
      .finally(() => setLoading(false));
  }, [retryCount, isAuthenticated]);

  const handleRetry = () => setRetryCount((c) => c + 1);

  // ---------- Create (optimistic) ----------
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const optimisticTask = {
      _id: `temp-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: dueDate || null,
      completed: false,
      createdBy: { name: user?.name || 'You', role: user?.role || '' },
    };

    setTasks((prev) => [optimisticTask, ...prev]);
    setCreating(true);
    setTitle(''); setDescription(''); setPriority('medium'); setDueDate('');

    try {
      const res = await createTask({
        title: optimisticTask.title,
        description: optimisticTask.description,
        priority: optimisticTask.priority,
        dueDate: optimisticTask.dueDate,
      });
      setTasks((prev) => prev.map((t) => (t._id === optimisticTask._id ? res.data : t)));
      showToast('Task created ✓');
    } catch (err) {
      setTasks((prev) => prev.filter((t) => t._id !== optimisticTask._id));
      if (!handleAuthFailure(err)) showToast(`Failed: ${err.message}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  // ---------- Toggle (useCallback — stable ref for TaskCard memo) ----------
  const handleToggle = useCallback(async (task) => {
    setBusyTaskId(task._id);
    try {
      const res = await updateTask(task._id, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t._id === task._id ? res.data : t)));
      showToast('Task updated');
    } catch (err) {
      if (!handleAuthFailure(err)) showToast(`Failed: ${err.message}`, 'error');
    } finally {
      setBusyTaskId(null);
    }
  }, []);

  // ---------- Delete ----------
  const handleDelete = useCallback(async (task) => {
    if (!window.confirm(`Delete "${task.title}"? This can't be undone.`)) return;
    setBusyTaskId(task._id);
    try {
      await deleteTask(task._id);
      setTasks((prev) => prev.filter((t) => t._id !== task._id));
      showToast('Task deleted');
    } catch (err) {
      if (!handleAuthFailure(err)) showToast(`Failed: ${err.message}`, 'error');
    } finally {
      setBusyTaskId(null);
    }
  }, []);

  if (authLoading || !isAuthenticated) return <Spinner />;
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={handleRetry} />;

  return (
    <section className="tasks-page">
      {/* ---- Header row ---- */}
      <div className="tasks-header">
        <div>
          <h1>Tasks</h1>
          <p className="subtitle">
            Anyone signed in can leave a task — the owner sees your name and role.
          </p>
        </div>
        <button
          className={`btn btn-stats ${showStats ? 'btn-stats--active' : ''}`}
          onClick={() => setShowStats((s) => !s)}
        >
          {showStats ? 'Hide Stats' : '📊 Stats'}
        </button>
      </div>

      {/* ---- Lazy-loaded stats panel ---- */}
      {showStats && (
        <Suspense fallback={<Spinner />}>
          <TaskStats tasks={tasks} />
        </Suspense>
      )}

      {/* ---- Create form ---- */}
      <form className="task-form" onSubmit={handleCreate}>
        <div className="task-form-main">
          <input
            type="text"
            placeholder="Task title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="task-form-row">
          <div className="task-form-field">
            <label htmlFor="priority">Priority</label>
            <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="task-form-field">
            <label htmlFor="dueDate">Due date</label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-add" disabled={creating}>
            {creating ? 'Adding…' : '+ Add Task'}
          </button>
        </div>
      </form>

      {/* ---- Task list ---- */}
      {tasks.length === 0 ? (
        <p className="no-results">No tasks yet — add one above.</p>
      ) : (
        <div className="task-grid">
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              user={user}
              busyTaskId={busyTaskId}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Toast toast={toast} />
    </section>
  );
}

export default Tasks;
