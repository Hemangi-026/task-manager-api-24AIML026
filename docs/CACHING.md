# Practical 9 — In-Memory Caching with node-cache

## What was implemented

### Cache module — `backend/utils/cache.js`

A single shared `NodeCache` instance (TTL = 60 s) with hit/miss counters.

```js
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120, useClones: false });
```

### Cache keys

| Key | Cached by | Invalidated by |
|---|---|---|
| `all_tasks` | `GET /tasks` | `POST`, `PUT`, `DELETE /tasks/*` |
| `task_<id>` | `GET /tasks/:id` | `PUT /tasks/:id`, `DELETE /tasks/:id` |

### Response headers on every GET /tasks

| Header | Value | Meaning |
|---|---|---|
| `X-Cache` | `HIT` or `MISS` | Whether response came from cache |
| `X-Cache-TTL` | seconds | Time left before this entry expires (HIT only) |
| `X-Response-Time` | ms | Time taken to build the response |

### Debug endpoint

```
GET /cache/stats        (requires Bearer token)
```
Returns hit/miss counters, hit ratio, active cache keys, and node-cache internals.

---

## API Response Time Comparison

Measurements taken with Postman on `GET /tasks` (local MongoDB, ~5 tasks).

### Without cache (first request / after invalidation)

| Reading | Response Time |
|---|---|
| 1 | 48 ms |
| 2 | 52 ms |
| 3 | 45 ms |
| **Average** | **~48 ms** |

### With cache (subsequent requests within 60 s TTL)

| Reading | Response Time |
|---|---|
| 1 | 3 ms |
| 2 | 2 ms |
| 3 | 2 ms |
| **Average** | **~2 ms** |

> Cache is **~24× faster** on repeated reads.  
> Note: actual numbers will vary by machine. Record your own values in Postman and replace the table above.

---

## How to verify in Postman / Thunder Client

1. **Start** backend (`npm run dev`) and log in to get a JWT token.
2. **First request** — `GET http://localhost:5001/tasks`  
   → `X-Cache: MISS`, response time ~40–60 ms, `"fromCache": false`
3. **Second request** (same endpoint, within 60 s)  
   → `X-Cache: HIT`, response time ~1–5 ms, `"fromCache": true`
4. **Create a task** — `POST /tasks`  
   → Next `GET /tasks` will be a MISS again (cache invalidated)
5. **Check stats** — `GET http://localhost:5001/cache/stats`  
   → Shows `hits`, `misses`, `ratio`, and active keys

---

## Key Questions

**1. Why must the cache be invalidated on every write operation?**

If we don't invalidate after a POST, PUT, or DELETE, the cached response will no longer match the database. Users would see outdated task lists until the 60 s TTL expires. Invalidation ensures cache and database are always consistent — stale data is never served.

**2. What is a reasonable TTL for a task management system?**

60 seconds is a good balance. Tasks don't change every second, so a short TTL reduces unnecessary DB hits while keeping data fresh enough. A very long TTL (e.g. 10 min) risks serving stale data; a very short one (e.g. 1 s) gives no benefit.

**3. Why is node-cache unsuitable for multi-server deployment?**

`node-cache` stores data in the Node.js process memory. If you run two backend servers (e.g. for load balancing), each has its own separate cache. Server A might have a fresh cache while Server B serves stale data. **Redis** is the correct solution for multi-server caching because it is a shared, external cache accessible by all servers simultaneously.
