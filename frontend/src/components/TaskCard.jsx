import { memo } from 'react';

const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

/**
 * TaskCard — memoised so it only re-renders when its own task data or
 * busyTaskId changes. Without memo, every keystroke in the create form
 * re-renders the entire task list unnecessarily.
 */
const TaskCard = memo(function TaskCard({ task, user, busyTaskId, onToggle, onDelete }) {
  const isOwner =
    user &&
    task.createdBy &&
    (task.createdBy._id === user.id || task.createdBy.id === user.id);

  const canDelete = user?.isAdmin || isOwner;

  const isBusy = busyTaskId === task._id;
  const creatorName = task.createdBy?.name || 'Unknown';
  const creatorRole = task.createdBy?.role;

  return (
    <div className="task-card">
      <div className={`priority-badge priority-badge--${task.priority}`}>
        {PRIORITY_LABEL[task.priority] || task.priority}
      </div>

      <h3 style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
        {task.title}
      </h3>

      <p className="task-desc">{task.description || 'No description.'}</p>

      {task.dueDate && (
        <p className="task-due">📅 Due {formatDate(task.dueDate)}</p>
      )}

      <p className="task-creator">
        👤 <strong>{creatorName}</strong>
        {creatorRole ? <span className="task-creator-role"> · {creatorRole}</span> : ''}
      </p>

      <div className="task-actions">
        <button
          className={`btn ${task.completed ? 'btn-outline' : 'btn-complete'}`}
          disabled={isBusy}
          onClick={() => onToggle(task)}
        >
          {isBusy ? '…' : task.completed ? 'Undo' : '✓ Complete'}
        </button>

        {canDelete && (
          <button
            className="btn btn-danger"
            disabled={isBusy}
            onClick={() => onDelete(task)}
          >
            🗑 Delete
          </button>
        )}
      </div>
    </div>
  );
});

export default TaskCard;
