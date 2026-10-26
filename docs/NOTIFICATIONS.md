# Practical 10 — Asynchronous Background Notification System (EventEmitter)

## Overview

When a task is created or deleted, the API emits a Node.js `EventEmitter` event.
The response is sent **immediately** (~12 ms). The event handler runs 2 seconds later
in the background — completely decoupled from the HTTP request/response lifecycle.

---

## Architecture

```
POST /tasks
    │
    ├──► Task.create() → DB
    ├──► res.status(201).json(...)   ← API responds ~12 ms
    │
    └──► notifier.emit('task-created', payload)   ← fire-and-forget
              │
              └──► setImmediate()
                       │
                       └──► setTimeout(2000ms)   ← simulated slow work
                                │
                                └──► console.log([Background Notification] ...)
                                     notifier.logs.unshift(entry)
```

**Key**: `emit()` is called BEFORE `res.json()` so the timestamp is accurate,
but `setImmediate` ensures the handler runs outside the current call stack —
the response returns long before the 2-second handler fires.

---

## Files changed

| File | What changed |
|---|---|
| `backend/utils/notificationEmitter.js` | New — singleton `NotificationEmitter extends EventEmitter` |
| `backend/server.js` | `require('./utils/notificationEmitter')` + emit on POST/DELETE + 4 debug endpoints |

---

## Events

### `task-created`
Fired by `POST /tasks` after saving to MongoDB.

Console output (2 s after API response):
```
[Background Notification] Task Created: "Fix login bug" | Timestamp: 2026-10-26T... | Assigned User: Hemangi | Handler ran 2003ms after API response
```

### `task-deleted`
Fired by `DELETE /tasks/:id`.

```
[Background Notification] Task Deleted: "Fix login bug" (ID: 6ad...) | Timestamp: 2026-10-26T... | Action By: Hemangi
```

### `error`
Caught whenever a handler throws. Without this listener, Node.js crashes.

```
[Notification Error] Simulated error for task: "Simulated Error Task"
```

---

## Debug API Endpoints (all require Bearer token)

| Method | Path | Description |
|---|---|---|
| GET | `/notifications/logs` | Recent event log + hit/miss stats |
| POST | `/notifications/reset` | Clear counters + log buffer |
| POST | `/notifications/delay` | Change simulated delay `{ "delayMs": 500 }` |
| POST | `/notifications/simulate-error` | Trigger error event handler test |

---

## Measured Performance

API responds **immediately** while background handler waits 2000 ms.

| Sample | API Response Time | Background Handler | Blocked? |
|---|---|---|---|
| 1 | ~80 ms (cold start) | 2000 ms | NO |
| 2 | ~12 ms | 2000 ms | NO |
| 3 | ~11 ms | 2000 ms | NO |

*Record your own Postman timings and replace the table above.*

---

## Key Questions

**1. Why does emitting an event not block the API response?**

`setImmediate()` schedules the handler to run after the current I/O event completes.
By the time the handler executes, `res.json()` has already returned the HTTP response.
The 2-second `setTimeout` inside the handler only blocks that background task, not the event loop.

**2. What would happen if notification logic were placed directly in the POST route?**

The HTTP response would be delayed by 2 seconds on every task creation. Users would
experience slow API responses and the frontend would appear frozen until the notification finished.

**3. Why is EventEmitter suitable here but not for millions of events per day?**

EventEmitter is in-process — if the server restarts, all pending events are lost.
It has no retry logic, no persistence, and no distributed support. For high-volume
production systems, a dedicated message queue (RabbitMQ, BullMQ, Kafka) is appropriate.
