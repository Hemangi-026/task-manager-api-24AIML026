import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../components/spinner';
import ErrorMessage from '../components/errormessage';
import Toast from '../components/toast';
import { useAuth } from '../context/AuthContext';
import { getTasks, createTask, updateTask, deleteTask } from '../api';

const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function Tasks() {
  const { isAuthenticated, loading: authLoading, logout, user } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Create-task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  const [busyTaskId, setBusyTaskId] = useState(null);

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAuthFailure = (err) => {
    if (err.status === 401) {
      logout();
      navigate('/login');
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);

    getTasks()
      .then((res) => setTasks(res.data))
      .catch((err) => {
        if (!handleAuthFailure(err)) setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [retryCount, isAuthenticated]);

  const handleRetry = () => setRetryCount((c) => c + 1);

  // ---------- Create (optimistic) ----------
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !priority) return;

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
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');

    try {
      const res = await createTask({
        title: optimisticTask.title,
        description: optimisticTask.description,
        priority: optimisticTask.priority,
        dueDate: optimisticTask.dueDate,
      });
      setTasks((prev) =>
        prev.map((t) => (t._id === optimisticTask._id ? res.data : t))
      );
      showToast('Task created successfully');
    } catch (err) {
      setTasks((prev) => prev.filter((t) => t._id !== optimisticTask._id));
      if (!handleAuthFailure(err)) {
        showToast(`Failed to create task: ${err.message}`, 'error');
      }
    } finally {
      setCreating(false);
    }
  };

  // ---------- Toggle completed ----------
  const handleToggleCompleted = async (task) => {
    setBusyTaskId(task._id);
    try {
      const res = await updateTask(task._id, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t._id === task._id ? res.data : t)));
      showToast('Task updated');
    } catch (err) {
      if (!handleAuthFailure(err)) {
        showToast(`Failed to update task: ${err.message}`, 'error');
      }
    } finally {
      setBusyTaskId(null);
    }
  };

  // ---------- Delete ----------
  const handleDelete = async (task) => {
    const confirmed = window.confirm(`Delete "${task.title}"? This can't be undone.`);
    if (!confirmed) return;

    setBusyTaskId(task._id);
    try {
      await deleteTask(task._id);
      setTasks((prev) => prev.filter((t) => t._id !== task._id));
      showToast('Task deleted');
    } catch (err) {
      if (!handleAuthFailure(err)) {
        showToast(`Failed to delete task: ${err.message}`, 'error');
      }
    } finally {
      setBusyTaskId(null);
    }
  };

  if (authLoading || !isAuthenticated) return <Spinner />;
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={handleRetry} />;

  return (
    <section className="tasks-page">
      <h1>Tasks</h1>
      <p className="subtitle">
        Anyone signed in can leave a task here — the owner will see it along with your name and role.
      </p>

      {/* ---- Create form ---- */}
      <form className="task-form task-form--full" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Task title"
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
        <div className="task-form-row">
          <div className="task-form-field">
            <label htmlFor="priority">Priority *</label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              required
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="task-form-field">
            <label htmlFor="dueDate">Due date (optional)</label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <button type="submit" className="btn" disabled={creating}>
          {creating ? 'Adding...' : 'Add Task'}
        </button>
      </form>

      {/* ---- Task list ---- */}
      {tasks.length === 0 ? (
        <p className="no-results">No tasks yet — add one above.</p>
      ) : (
        <div className="task-grid">
          {tasks.map((task) => {
            const isOwner =
              user &&
              task.createdBy &&
              (task.createdBy._id === user.id || task.createdBy.id === user.id);
            const creatorName = task.createdBy?.name || 'Unknown';
            const creatorRole = task.createdBy?.role;

            return (
              <div className="task-card" key={task._id}>
                <div className={`priority-badge priority-badge--${task.priority}`}>
                  {PRIORITY_LABEL[task.priority] || task.priority}
                </div>

                <h3 style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
                  {task.title}
                </h3>
                <p>{task.description || 'No description.'}</p>

                {task.dueDate && (
                  <p className="task-due">Due {formatDate(task.dueDate)}</p>
                )}

                <p className="task-creator">
                  Created by <strong>{creatorName}</strong>
                  {creatorRole ? ` (${creatorRole})` : ''}
                </p>

                <div className="task-actions">
                  <button
                    className="btn btn-outline"
                    disabled={busyTaskId === task._id}
                    onClick={() => handleToggleCompleted(task)}
                  >
                    {busyTaskId === task._id
                      ? 'Working...'
                      : task.completed
                      ? 'Mark incomplete'
                      : 'Mark complete'}
                  </button>
                  {isOwner && (
                    <button
                      className="btn btn-danger"
                      disabled={busyTaskId === task._id}
                      onClick={() => handleDelete(task)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Toast toast={toast} />
    </section>
  );
}

export default Tasks;
