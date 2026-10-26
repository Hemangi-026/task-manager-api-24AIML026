import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTasks, deleteTask } from '../api';
import Spinner from '../components/spinner';
import ErrorMessage from '../components/errormessage';
import Toast from '../components/toast';

// Chart lazy-loaded — only downloaded when "Show Chart" is clicked
const TaskStats = lazy(() => import('../components/TaskStats'));

const BASE_URL = 'http://localhost:5001';

async function fetchCacheStats(token) {
  const res = await fetch(`${BASE_URL}/cache/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  return body.data;
}

const PRIORITY_COLOR = { low: '#4caf50', medium: '#ff9800', high: '#f44336' };

function AdminDashboard() {
  const { user, token, isAuthenticated, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [showChart, setShowChart]   = useState(false);
  const [busyId, setBusyId]         = useState(null);
  const [toast, setToast]           = useState(null);

  // Filter / sort state
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus]     = useState('all');
  const [sortBy, setSortBy]                 = useState('newest');
  const [search, setSearch]                 = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) { navigate('/login'); return; }
      if (!user?.isAdmin)   { navigate('/');      return; }
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  // Load tasks + cache stats
  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) return;
    setLoading(true);
    setError(null);

    Promise.all([
      getTasks(),
      token ? fetchCacheStats(token) : Promise.resolve(null),
    ])
      .then(([tasksRes, stats]) => {
        setTasks(tasksRes.data);
        setCacheStats(stats);
      })
      .catch((err) => {
        if (err.status === 401) { logout(); navigate('/login'); }
        else setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, user]);

  const handleDelete = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    setBusyId(task._id);
    try {
      await deleteTask(task._id);
      setTasks((prev) => prev.filter((t) => t._id !== task._id));
      showToast('Task deleted');
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading || !isAuthenticated || !user?.isAdmin) return <Spinner />;
  if (loading) return <Spinner />;
  if (error)   return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;

  // Derived stats
  const totalTasks     = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const pendingTasks   = totalTasks - completedTasks;
  const highPriority   = tasks.filter((t) => t.priority === 'high').length;

  // Unique users
  const users = [...new Map(
    tasks
      .filter((t) => t.createdBy)
      .map((t) => [t.createdBy._id || t.createdBy.id, t.createdBy])
  ).values()];

  // Apply filters + sort
  let displayed = [...tasks];
  if (filterPriority !== 'all') displayed = displayed.filter((t) => t.priority === filterPriority);
  if (filterStatus === 'completed') displayed = displayed.filter((t) => t.completed);
  if (filterStatus === 'pending')   displayed = displayed.filter((t) => !t.completed);
  if (search) displayed = displayed.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.createdBy?.name || '').toLowerCase().includes(search.toLowerCase())
  );
  if (sortBy === 'newest')   displayed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (sortBy === 'oldest')   displayed.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (sortBy === 'priority') {
    const order = { high: 0, medium: 1, low: 2 };
    displayed.sort((a, b) => order[a.priority] - order[b.priority]);
  }

  return (
    <section className="admin-page">
      {/* ---- Header ---- */}
      <div className="admin-header">
        <div>
          <h1>⚡ Admin Dashboard <span className="admin-badge">ADMIN</span></h1>
          <p className="subtitle">Full overview of all tasks and users.</p>
        </div>
        <button
          className={`btn btn-stats ${showChart ? 'btn-stats--active' : ''}`}
          onClick={() => setShowChart((s) => !s)}
        >
          {showChart ? 'Hide Chart' : '📊 Show Chart'}
        </button>
      </div>

      {/* ---- Stat cards ---- */}
      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <span className="stat-icon">📋</span>
          <div>
            <p className="stat-value">{totalTasks}</p>
            <p className="stat-label">Total Tasks</p>
          </div>
        </div>
        <div className="admin-stat-card admin-stat-card--green">
          <span className="stat-icon">✅</span>
          <div>
            <p className="stat-value">{completedTasks}</p>
            <p className="stat-label">Completed</p>
          </div>
        </div>
        <div className="admin-stat-card admin-stat-card--orange">
          <span className="stat-icon">⏳</span>
          <div>
            <p className="stat-value">{pendingTasks}</p>
            <p className="stat-label">Pending</p>
          </div>
        </div>
        <div className="admin-stat-card admin-stat-card--red">
          <span className="stat-icon">🔥</span>
          <div>
            <p className="stat-value">{highPriority}</p>
            <p className="stat-label">High Priority</p>
          </div>
        </div>
        <div className="admin-stat-card admin-stat-card--purple">
          <span className="stat-icon">👥</span>
          <div>
            <p className="stat-value">{users.length}</p>
            <p className="stat-label">Active Users</p>
          </div>
        </div>
      </div>

      {/* ---- Cache stats ---- */}
      {cacheStats && (
        <div className="cache-stats-bar">
          <span className="cache-stats-title">🗄 Cache</span>
          <span className="cache-pill cache-pill--hit">Hits: {cacheStats.hits}</span>
          <span className="cache-pill cache-pill--miss">Misses: {cacheStats.misses}</span>
          <span className="cache-pill">Ratio: {cacheStats.ratio}</span>
          <span className="cache-pill">Keys: {cacheStats.keys?.length ?? 0}</span>
        </div>
      )}

      {/* ---- Chart ---- */}
      {showChart && (
        <Suspense fallback={<Spinner />}>
          <TaskStats tasks={tasks} />
        </Suspense>
      )}

      {/* ---- Users table ---- */}
      <div className="admin-section">
        <h2>👥 Users ({users.length})</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Role</th>
                <th>Tasks</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const uid = u._id || u.id;
                const userTasks = tasks.filter((t) =>
                  (t.createdBy?._id || t.createdBy?.id) === uid
                );
                const done = userTasks.filter((t) => t.completed).length;
                return (
                  <tr key={uid}>
                    <td>{i + 1}</td>
                    <td><strong>{u.name}</strong></td>
                    <td><span className="role-tag">{u.role || '—'}</span></td>
                    <td>{userTasks.length}</td>
                    <td>
                      {done} / {userTasks.length}
                      <div className="mini-progress">
                        <div
                          className="mini-progress__fill"
                          style={{ width: userTasks.length ? `${(done / userTasks.length) * 100}%` : '0%' }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- All tasks table ---- */}
      <div className="admin-section">
        <div className="admin-section-header">
          <h2>📋 All Tasks ({displayed.length})</h2>
          <div className="admin-filters">
            <input
              type="text"
              placeholder="🔍 Search title or user…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-search"
            />
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="all">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="priority">By priority</option>
            </select>
          </div>
        </div>

        {displayed.length === 0 ? (
          <p className="no-results">No tasks match the current filters.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created by</th>
                  <th>Due</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((task) => (
                  <tr key={task._id} className={task.completed ? 'row-done' : ''}>
                    <td>
                      <span style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
                        {task.title}
                      </span>
                    </td>
                    <td>
                      <span
                        className="priority-badge"
                        style={{
                          background: PRIORITY_COLOR[task.priority] + '22',
                          color: PRIORITY_COLOR[task.priority],
                        }}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${task.completed ? 'status-pill--done' : 'status-pill--pending'}`}>
                        {task.completed ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      {task.createdBy?.name || '—'}
                      {task.createdBy?.role && (
                        <span className="role-tag" style={{ marginLeft: '0.4rem' }}>
                          {task.createdBy.role}
                        </span>
                      )}
                    </td>
                    <td>
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString()
                        : '—'}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                        disabled={busyId === task._id}
                        onClick={() => handleDelete(task)}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Toast toast={toast} />
    </section>
  );
}

export default AdminDashboard;
