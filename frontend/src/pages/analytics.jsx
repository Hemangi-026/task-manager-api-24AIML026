/**
 * Analytics page — Practical 8 supplementary requirement.
 * This entire page (including recharts) is lazy-loaded via React.lazy()
 * in App.jsx — the chunk is only downloaded when the user navigates here.
 */
import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTasks } from '../api';
import Spinner from '../components/spinner';

// Recharts components — lazy-loaded inside an already-lazy page
// (they share the same chunk since we're in a dynamic import boundary)
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  low:    '#4caf50',
  medium: '#ff9800',
  high:   '#f44336',
  completed: '#6366f1',
  pending:   '#94a3b8',
};

function Analytics() {
  const { isAuthenticated, loading: authLoading, logout } = useAuth();
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

  // ---- Data preparation ----
  const total     = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending   = total - completed;

  const statusData = [
    { name: 'Completed', value: completed, fill: COLORS.completed },
    { name: 'Pending',   value: pending,   fill: COLORS.pending   },
  ];

  const priorityData = ['low', 'medium', 'high'].map((p) => ({
    name:      p.charAt(0).toUpperCase() + p.slice(1),
    Total:     tasks.filter((t) => t.priority === p).length,
    Completed: tasks.filter((t) => t.priority === p && t.completed).length,
    fill:      COLORS[p],
  }));

  // Group tasks by creation date (last 7 days)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const timelineData = last7.map((date) => ({
    date: date.slice(5), // MM-DD
    Created: tasks.filter((t) => t.createdAt?.slice(0, 10) === date).length,
    Done:    tasks.filter((t) => t.completed && t.updatedAt?.slice(0, 10) === date).length,
  }));

  return (
    <section className="analytics-page">
      <div className="page-heading">
        <h1>📊 Analytics <span className="lazy-badge">Lazy</span></h1>
        <p className="subtitle">
          This page (including recharts) is lazy-loaded — it downloads as a separate
          chunk only when you navigate here.
        </p>
      </div>

      {total === 0 ? (
        <p className="no-results" style={{ padding: '3rem 0' }}>
          No tasks yet — create some tasks to see analytics.
        </p>
      ) : (
        <>
          {/* ---- Summary row ---- */}
          <div className="analytics-summary">
            {[
              { label: 'Total',     value: total,     color: '#6366f1' },
              { label: 'Completed', value: completed, color: '#4caf50' },
              { label: 'Pending',   value: pending,   color: '#ff9800' },
              { label: '% Done',    value: `${total ? Math.round((completed / total) * 100) : 0}%`, color: '#6366f1' },
            ].map(({ label, value, color }) => (
              <div key={label} className="analytics-stat" style={{ borderTop: `3px solid ${color}` }}>
                <p className="analytics-stat__value" style={{ color }}>{value}</p>
                <p className="analytics-stat__label">{label}</p>
              </div>
            ))}
          </div>

          <div className="analytics-charts">
            {/* Status Pie */}
            <div className="analytics-chart-box">
              <h3>Status Distribution</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                    paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Priority Bar */}
            <div className="analytics-chart-box">
              <h3>Tasks by Priority</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={priorityData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 13, fill: 'var(--text-muted)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="Total" radius={[4, 4, 0, 0]}>
                    {priorityData.map((e) => <Cell key={e.name} fill={e.fill} />)}
                  </Bar>
                  <Bar dataKey="Completed" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Timeline Line chart */}
            <div className="analytics-chart-box analytics-chart-box--wide">
              <h3>Activity — Last 7 Days</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={timelineData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="Created" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Done"    stroke="#4caf50" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default Analytics;
