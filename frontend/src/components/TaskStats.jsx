/**
 * TaskStats — lazy-loaded chart component (Practical 8 post-lab task).
 *
 * This component imports recharts (~180 kB unpacked), making it a good
 * candidate for lazy loading. It is NOT included in the main bundle —
 * Vite emits it as a separate chunk downloaded only when the user opens
 * the stats panel on the Tasks page.
 *
 * Shows:
 *  • Bar chart — task count by priority (low / medium / high)
 *  • Pie chart — completed vs pending tasks
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const PRIORITY_COLORS = {
  low:    '#4caf50',
  medium: '#ff9800',
  high:   '#f44336',
};

const PIE_COLORS = ['#4caf50', '#9e9e9e'];

function TaskStats({ tasks }) {
  if (!tasks || tasks.length === 0) {
    return <p className="stats-empty">No tasks yet — add one to see stats.</p>;
  }

  // --- Priority distribution ---
  const priorityCounts = tasks.reduce(
    (acc, t) => {
      acc[t.priority] = (acc[t.priority] || 0) + 1;
      return acc;
    },
    { low: 0, medium: 0, high: 0 }
  );

  const barData = [
    { name: 'Low',    count: priorityCounts.low,    fill: PRIORITY_COLORS.low },
    { name: 'Medium', count: priorityCounts.medium, fill: PRIORITY_COLORS.medium },
    { name: 'High',   count: priorityCounts.high,   fill: PRIORITY_COLORS.high },
  ];

  // --- Completed vs pending ---
  const completedCount = tasks.filter((t) => t.completed).length;
  const pieData = [
    { name: 'Completed', value: completedCount },
    { name: 'Pending',   value: tasks.length - completedCount },
  ];

  return (
    <div className="stats-panel">
      <h2 className="stats-title">📊 Task Stats</h2>

      <div className="stats-charts">
        {/* --- Bar chart: priority breakdown --- */}
        <div className="stats-chart-box">
          <h3>By Priority</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 13 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {barData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* --- Pie chart: completed vs pending --- */}
        <div className="stats-chart-box">
          <h3>Completion</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="stats-summary">
        {tasks.length} task{tasks.length !== 1 ? 's' : ''} total —{' '}
        {completedCount} completed, {tasks.length - completedCount} pending
      </p>
    </div>
  );
}

export default TaskStats;
