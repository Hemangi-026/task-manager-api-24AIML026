import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../components/spinner';
import ErrorMessage from '../components/errormessage';
import Toast from '../components/toast';
import TaskCard from '../components/TaskCard';
import { useAuth } from '../context/AuthContext';
import { getTasks, createTask, updateTask, deleteTask, getAiSuggestion } from '../api';

// recharts chunk — downloaded only when user clicks "📊 Stats"
const TaskStats = lazy(() => import('../components/TaskStats'));

function Tasks() {
  const { isAuthenticated, loading: authLoading, logout, user } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showStats, setShowStats]   = useState(false);

  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority]       = useState('medium');
  const [dueDate, setDueDate]         = useState('');
  const [creating, setCreating]       = useState(false);

  // ---- Practical 13: AI suggestion state ----
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiSuggested, setAiSuggested]   = useState(false); // true when field came from AI
  const [aiMessage, setAiMessage]       = useState('');    // fallback or error message

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

  // ---- Practical 13: Ask Gemini for description + priority ----
  const handleAiSuggest = async () => {
    if (!title.trim() || title.trim().length < 3) {
      showToast('Enter at least 3 characters in the title first', 'error');
      return;
    }
    setAiLoading(true);
    setAiMessage('');
    setAiSuggested(false);

    try {
      const res = await getAiSuggestion(title.trim());

      if (res.fallback) {
        // Graceful degradation — AI unavailable, app keeps working
        setAiMessage(res.message || 'AI suggestion unavailable. You can still fill in manually.');
      } else {
        // Apply AI suggestions — user can edit them before submitting
        if (res.description) setDescription(res.description);
        if (res.priority)    setPriority(res.priority);
        setAiSuggested(true);
        setAiMessage(res.reason ? `AI reasoning: ${res.reason}` : '');
        showToast('✨ AI suggestion applied — review and edit before submitting');
      }
    } catch (err) {
      // Graceful degradation — network/auth error, app keeps working
      if (err.status === 429) {
        setAiMessage(err.message || 'Rate limited — wait a moment before trying again.');
      } else {
        setAiMessage('AI suggestion failed. You can still create the task manually.');
      }
    } finally {
      setAiLoading(false);
    }
  };

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
    setAiSuggested(false); setAiMessage('');

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
      {/* ---- Header ---- */}
      <div className="tasks-header">
        <div>
          <h1>
            Tasks
            {user?.isAdmin && <span className="admin-badge">ADMIN</span>}
          </h1>
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

      {/* ---- Admin banner ---- */}
      {user?.isAdmin && (
        <div className="admin-banner">
          <strong>⚡ Admin mode:</strong> you can see and delete every user's tasks.
        </div>
      )}

      {/* ---- Lazy stats panel ---- */}
      {showStats && (
        <Suspense fallback={<Spinner />}>
          <TaskStats tasks={tasks} />
        </Suspense>
      )}

      {/* ---- Create form ---- */}
      <form className="task-form" onSubmit={handleCreate}>
        <div className="task-form-main">
          {/* Title + AI button side by side */}
          <div className="task-form-title-row">
            <input
              type="text"
              placeholder="Task title *"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setAiSuggested(false); setAiMessage(''); }}
              required
            />
            <button
              type="button"
              className="btn btn-ai"
              onClick={handleAiSuggest}
              disabled={aiLoading || !title.trim()}
              title="Ask Gemini AI to suggest a description and priority"
            >
              {aiLoading ? '⏳ Thinking…' : '✨ AI Suggest'}
            </button>
          </div>

          {/* AI disclaimer — shown when description came from AI */}
          {aiSuggested && (
            <div className="ai-disclaimer">
              🤖 <strong>AI-generated suggestion</strong> — please review and edit before submitting.
              The description and priority below were suggested by Gemini AI.
            </div>
          )}

          {/* Fallback / rate limit message */}
          {aiMessage && !aiSuggested && (
            <div className="ai-fallback">{aiMessage}</div>
          )}

          {/* Reason message */}
          {aiMessage && aiSuggested && (
            <div className="ai-reason">💡 {aiMessage}</div>
          )}

          <textarea
            placeholder="Description (optional — or use AI Suggest above)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={aiSuggested ? 'ai-filled' : ''}
          />
        </div>

        <div className="task-form-row">
          <div className="task-form-field">
            <label htmlFor="priority">
              Priority {aiSuggested && <span className="ai-tag">AI</span>}
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className={aiSuggested ? 'ai-filled' : ''}
            >
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
