/**
 * ProgressChart — lazy-loaded task progress bar chart.
 *
 * Shows task counts by status (Pending / Completed) and priority
 * (Low / Medium / High) in two side-by-side bar charts.
 *
 * This component is lazy-loaded from projects.jsx so recharts
 * is NOT bundled in the main chunk.
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import Spinner from './spinner';

// Matches the purple/violet palette visible in the reference screenshot
const STATUS_COLORS  = ['#9c7fe8', '#c084fc'];   // pending, completed
const PRIORITY_COLORS = {
  low:    '#7dd3b0',
  medium: '#f4a66a',
  high:   '#f07070',
};

function ProgressChart({ tasks, loading }) {
  if (loading) return <Spinner />;

  if (!tasks || tasks.length === 0) {
    return (
      <div className="progress-chart-empty">
        <p>No tasks yet — add some tasks to see the progress chart.</p>
      </div>
    );
  }

  // ---- Status data ----
  const pending   = tasks.filter((t) => !t.completed).length;
  const completed = tasks.filter((t) => t.completed).length;

  const statusData = [
    { name: 'Pending',   count: pending,   fill: STATUS_COLORS[0] },
    { name: 'Completed', count: completed, fill: STATUS_COLORS[1] },
  ];

  // ---- Priority data ----
  const priorityCounts = tasks.reduce(
    (acc, t) => { acc[t.priority] = (acc[t.priority] || 0) + 1; return acc; },
    { low: 0, medium: 0, high: 0 }
  );

  const priorityData = [
    { name: 'Low',    count: priorityCounts.low,    fill: PRIORITY_COLORS.low },
    { name: 'Medium', count: priorityCounts.medium, fill: PRIORITY_COLORS.medium },
    { name: 'High',   count: priorityCounts.high,   fill: PRIORITY_COLORS.high },
  ];

  // ---- Summary numbers ----
  const total      = tasks.length;
  const pct        = total ? Math.round((completed / total) * 100) : 0;
  const overdue    = tasks.filter((t) => {
    if (!t.dueDate || t.completed) return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  return (
    <div className="progress-chart">
      {/* ---- Summary row ---- */}
      <div className="progress-summary">
        <div className="progress-summary__item">
          <span className="progress-summary__val">{total}</span>
          <span className="progress-summary__label">Total</span>
        </div>
        <div className="progress-summary__item progress-summary__item--green">
          <span className="progress-summary__val">{completed}</span>
          <span className="progress-summary__label">Done</span>
        </div>
        <div className="progress-summary__item progress-summary__item--purple">
          <span className="progress-summary__val">{pending}</span>
          <span className="progress-summary__label">Pending</span>
        </div>
        <div className="progress-summary__item progress-summary__item--red">
          <span className="progress-summary__val">{overdue}</span>
          <span className="progress-summary__label">Overdue</span>
        </div>
        <div className="progress-summary__item progress-summary__item--accent">
          <span className="progress-summary__val">{pct}%</span>
          <span className="progress-summary__label">Complete</span>
        </div>
      </div>

      {/* ---- Overall progress bar ---- */}
      <div className="progress-bar-wrap">
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${pct}%` }}
            title={`${pct}% complete`}
          />
        </div>
        <span className="progress-bar-label">{pct}% complete</span>
      </div>

      {/* ---- Charts side by side ---- */}
      <div className="progress-charts-row">
        {/* Status chart */}
        <div className="progress-chart-box">
          <h3>By Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={statusData}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              barSize={52}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: 'var(--text-muted)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority chart */}
        <div className="progress-chart-box">
          <h3>By Priority</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={priorityData}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              barSize={44}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: 'var(--text-muted)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {priorityData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default ProgressChart;
