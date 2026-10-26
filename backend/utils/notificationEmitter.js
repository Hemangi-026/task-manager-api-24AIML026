/**
 * Practical 10 — Asynchronous Background Notification System
 * Using Node.js built-in EventEmitter (no external packages needed).
 *
 * Architecture:
 *   POST/DELETE /tasks
 *       │
 *       ├─► res.json()          ← API responds IMMEDIATELY (~12 ms)
 *       │
 *       └─► emitter.emit(...)   ← non-blocking: decoupled from response
 *                │
 *                └─► setImmediate + setTimeout(2000ms)
 *                        │
 *                        └─► console.log([Background Notification] ...)
 *
 * Key design decisions:
 *  - setImmediate() ensures the listener runs AFTER the current I/O cycle,
 *    completely outside the req/res call stack.
 *  - The 2-second simulated delay proves non-blocking: the HTTP response
 *    returns in ~12 ms while the handler waits 2 s in the background.
 *  - captureRejections: true routes any async handler rejection to 'error'.
 *  - An explicit 'error' listener prevents unhandled-error process crashes.
 */
const EventEmitter = require('events');

class NotificationEmitter extends EventEmitter {
  constructor(options = {}) {
    super({ captureRejections: true, ...options });

    // Simulated slow-handler delay (ms). 2000 ms demonstrates non-blocking.
    this.delayMs = options.delayMs !== undefined ? options.delayMs : 2000;

    // In-memory audit log — last 100 entries, newest first
    this.logs = [];

    // Counters for the debug endpoint
    this.stats = {
      taskCreatedCount: 0,
      taskDeletedCount: 0,
      errorCount: 0,
    };

    this._registerListeners();
  }

  // ---- helpers ----
  _recordLog(entry) {
    this.logs.unshift(entry);
    if (this.logs.length > 100) this.logs.pop();
  }

  getLogs()  { return [...this.logs]; }
  getStats() {
    return { ...this.stats, delayMs: this.delayMs, activeLogsCount: this.logs.length };
  }
  clearLogs() {
    this.logs = [];
    this.stats = { taskCreatedCount: 0, taskDeletedCount: 0, errorCount: 0 };
  }
  setDelay(ms) {
    const n = parseInt(ms, 10);
    if (Number.isNaN(n) || n < 0) throw new Error('delayMs must be a non-negative integer');
    this.delayMs = n;
    return this.delayMs;
  }

  // ---- register all listeners ----
  _registerListeners() {

    // ------------------------------------------------------------------
    // 1. 'task-created' — non-blocking, logs after delayMs
    // ------------------------------------------------------------------
    this.on('task-created', (data) => {
      const responseTime = Date.now(); // timestamp API already responded

      setImmediate(async () => {
        try {
          if (this.delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, this.delayMs));
          }

          // Simulate error for testing the error event listener
          if (data?.simulateError) {
            throw new Error(
              `Simulated error for task: "${data?.task?.title || 'Unknown'}"`
            );
          }

          const task       = data?.task || {};
          const title      = task.title || 'Untitled';
          const timestamp  = data?.timestamp || new Date().toISOString();
          const user       = data?.user || task.createdBy || {};
          const assignedTo = user.name || user.email || String(user) || 'Unassigned';

          this.stats.taskCreatedCount++;

          const msg = `[Background Notification] Task Created: "${title}" | Timestamp: ${timestamp} | Assigned User: ${assignedTo} | Handler ran ${Date.now() - responseTime}ms after API response`;
          console.log(msg);

          this._recordLog({
            id:          `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            event:       'task-created',
            title,
            timestamp,
            assignedUser: assignedTo,
            taskId:      task._id || null,
            message:     msg,
            processedAt: new Date().toISOString(),
          });
        } catch (err) {
          this.emit('error', err);
        }
      });
    });

    // ------------------------------------------------------------------
    // 2. 'task-deleted' — distinct log format
    // ------------------------------------------------------------------
    this.on('task-deleted', (data) => {
      setImmediate(async () => {
        try {
          const task      = data?.task || {};
          const title     = task.title || 'Untitled';
          const taskId    = task._id || data?.taskId || 'Unknown';
          const timestamp = data?.timestamp || new Date().toISOString();
          const user      = data?.user || {};
          const deletedBy = user.name || user.email || 'User';

          this.stats.taskDeletedCount++;

          const msg = `[Background Notification] Task Deleted: "${title}" (ID: ${taskId}) | Timestamp: ${timestamp} | Action By: ${deletedBy}`;
          console.log(msg);

          this._recordLog({
            id:          `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            event:       'task-deleted',
            title,
            taskId,
            timestamp,
            deletedBy,
            message:     msg,
            processedAt: new Date().toISOString(),
          });
        } catch (err) {
          this.emit('error', err);
        }
      });
    });

    // ------------------------------------------------------------------
    // 3. 'error' — catches any exception thrown inside a handler.
    //    Without this, Node.js throws an uncaughtException and crashes.
    // ------------------------------------------------------------------
    this.on('error', (err) => {
      this.stats.errorCount++;
      const msg = `[Notification Error] ${err?.message || String(err)}`;
      console.error(msg);
      this._recordLog({
        id:        `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        event:     'error',
        message:   msg,
        stack:     err?.stack,
        timestamp: new Date().toISOString(),
      });
    });
  }
}

// Export a singleton — the same instance is shared across all route files
module.exports = new NotificationEmitter();
