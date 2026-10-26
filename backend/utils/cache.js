/**
 * cache.js — shared node-cache instance for the Task Manager backend.
 *
 * Practical 9: In-Memory Caching
 *
 * Design decisions:
 *  - TTL = 60 s  : tasks change infrequently; 60 s is a reasonable freshness window.
 *  - checkperiod = 120 s : background sweep to evict expired keys automatically.
 *  - A single module-level instance is shared across all route files (Node.js
 *    caches `require()` results, so this is a true singleton per process).
 *
 * Cache keys used:
 *  - 'all_tasks'       : result of GET /tasks
 *  - 'task_<id>'       : result of GET /tasks/:id
 *
 * Invalidation strategy:
 *  - POST /tasks   → delete 'all_tasks'          (new task added)
 *  - PUT  /tasks/:id → delete 'all_tasks' + 'task_<id>'  (task changed)
 *  - DELETE /tasks/:id → delete 'all_tasks' + 'task_<id>'
 *
 * Why invalidate on every write?
 *  If we didn't, users would see stale data for up to 60 s after a change.
 *  Invalidation ensures the cache and database are always consistent.
 */
const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL: 60,        // seconds before a key expires automatically
  checkperiod: 120,  // seconds between automatic expired-key sweeps
  useClones: false,  // skip deep-cloning for performance (we don't mutate cached objects)
});

// ---- Hit / miss counters (for GET /cache/stats debug endpoint) ----
let hits   = 0;
let misses = 0;

module.exports = {
  cache,
  recordHit:  () => hits++,
  recordMiss: () => misses++,
  getStats:   () => ({
    hits,
    misses,
    ratio: hits + misses === 0 ? 'N/A' : `${((hits / (hits + misses)) * 100).toFixed(1)}%`,
    keys: cache.keys(),
    nodeStats: cache.getStats(),
  }),
};
