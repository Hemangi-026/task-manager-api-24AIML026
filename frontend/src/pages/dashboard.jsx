import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTasks } from '../api';
import Spinner from '../components/spinner';

function StatCard({ icon, value, label, color }) {
  return (
    <div className={`dash-stat dash-stat--${color}`}>
      <span className="dash-stat__icon">{icon}</span>
      <div>
        <p className="dash-stat__value">{value}</p>
        <p className="dash-stat__label">{label}</p>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/login');
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getTasks()
      .then((res) => setTasks(res.data))
      .catch((err) => { if (err.status === 401) { logout(); navigate('/login'); }})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (authLoading || loading) return <Spinner />;

  // ---- Derived stats ----
  const total     = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending   = total - completed;
  const high      = tasks.filter((t) => t.priority === 'high' && !t.completed).length;
  const overdue   = tasks.filter((t) => {
    if (!t.dueDate || t.completed) return false;
    return new Date(t.dueDate) < new Date();
  }).length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  // Recent 5 tasks
  const recent = [...tasks].slice(0, 5);

  // Tasks by priority
  const byPriority = {
    high:   tasks.filter((t) => t.priority === 'high').length,
    medium: tasks.filter((t) => t.priority === 'medium').length,
    low:    tasks.filter((t) => t.priority === 'low').length,
  };

  return (
    <section className="dashboard">
      {/* ---- Welcome header ---- */}
      <div className="dashboard__header">
        <div>
          <h1>
            👋 Welcome back,{' '}
            <span className="dashboard__name">{user?.name || 'there'}</span>!
            {user?.isAdmin && <span className="admin-badge" style={{ marginLeft: '0.6rem' }}>ADMIN</span>}
          </h1>
          <p className="subtitle">Here's what's happening with your tasks today.</p>
        </div>
        <Link to="/" className="btn">+ New Task</Link>
      </div>

      {/* ---- Stat cards ---- */}
      <div className="dashboard__stats">
        <StatCard icon="📋" value={total}     label="Total Tasks"    color="default" />
        <StatCard icon="✅" value={completed} label="Completed"      color="green"   />
        <StatCard icon="⏳" value={pending}   label="Pending"        color="orange"  />
        <StatCard icon="🔥" value={high}      label="High Priority"  color="red"     />
        <StatCard icon="⚠️" value={overdue}   label="Overdue"        color="red"     />
      </div>

      {/* ---- Overall progress ---- */}
      <div className="dashboard__progress-card">
        <div className="dashboard__progress-header">
          <h2>Overall Progress</h2>
          <span className="dashboard__pct">{pct}% complete</span>
        </div>
        <div className="progress-bar-track" style={{ height: '12px', borderRadius: '999px' }}>
          <div
            className="progress-bar-fill"
            style={{ width: `${pct}%`, height: '100%', borderRadius: '999px' }}
          />
        </div>
        <div className="dashboard__progress-legend">
          <span>🟢 Completed: {completed}</span>
          <span>🟡 Pending: {pending}</span>
          <span>🔴 Overdue: {overdue}</span>
        </div>
      </div>

      {/* ---- Priority breakdown + Recent tasks ---- */}
      <div className="dashboard__two-col">
        {/* Priority breakdown */}
        <div className="dashboard__card">
          <h2>By Priority</h2>
          <div className="dashboard__priority-bars">
            {[
              { label: 'High',   count: byPriority.high,   color: '#f44336', bg: '#fce4ec' },
              { label: 'Medium', count: byPriority.medium, color: '#ff9800', bg: '#fff3e0' },
              { label: 'Low',    count: byPriority.low,    color: '#4caf50', bg: '#e8f5e9' },
            ].map(({ label, count, color, bg }) => (
              <div key={label} className="dashboard__priority-row">
                <span className="priority-badge" style={{ background: bg, color, minWidth: '58px' }}>
                  {label}
                </span>
                <div className="priority-track">
                  <div
                    className="priority-fill"
                    style={{
                      width: total ? `${(count / total) * 100}%` : '0%',
                      background: color,
                    }}
                  />
                </div>
                <span className="priority-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent tasks */}
        <div className="dashboard__card">
          <div className="dashboard__card-header">
            <h2>Recent Tasks</h2>
            <Link to="/" className="dash-link">View all →</Link>
          </div>
          {recent.length === 0 ? (
            <p className="no-results">No tasks yet.</p>
          ) : (
            <ul className="dashboard__recent-list">
              {recent.map((t) => (
                <li key={t._id} className={`dashboard__recent-item ${t.completed ? 'done' : ''}`}>
                  <span className={`priority-badge priority-badge--${t.priority}`} style={{ minWidth: '52px' }}>
                    {t.priority}
                  </span>
                  <span className="dashboard__recent-title"
                    style={{ textDecoration: t.completed ? 'line-through' : 'none' }}>
                    {t.title}
                  </span>
                  <span className={`status-pill ${t.completed ? 'status-pill--done' : 'status-pill--pending'}`}>
                    {t.completed ? '✓' : '…'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ---- Quick links ---- */}
      <div className="dashboard__quick-links">
        <Link to="/"          className="quick-link">📋 Tasks &amp; Projects</Link>
        <Link to="/analytics" className="quick-link">📊 Analytics</Link>
        <Link to="/projects"  className="quick-link">🗂 GitHub Projects</Link>
        <Link to="/contact"   className="quick-link">✉️ Contact</Link>
        {user?.isAdmin && <Link to="/admin" className="quick-link quick-link--admin">⚡ Admin Dashboard</Link>}
      </div>
    </section>
  );
}

export default Dashboard;
