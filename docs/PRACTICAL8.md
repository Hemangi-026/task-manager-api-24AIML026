# Practical 8 — React Performance Optimisation: Lazy Loading

## What was implemented

### 1. Route-based code splitting (`frontend/src/App.jsx`)

All route-level page components are loaded with `React.lazy()` and wrapped in a single `<Suspense>` boundary. React Router renders a `<Spinner />` fallback while the chunk downloads.

```jsx
const Tasks        = lazy(() => import('./pages/tasks'));
const Login        = lazy(() => import('./pages/login'));
const Register     = lazy(() => import('./pages/register'));
const ForgotPassword = lazy(() => import('./pages/forgotpassword'));
const ResetPassword  = lazy(() => import('./pages/resetpassword'));
const Profile      = lazy(() => import('./pages/profile'));
const NotFound     = lazy(() => import('./pages/notfound'));
```

### 2. Lazy-loaded heavy component — TaskStats chart

`TaskStats` imports **recharts** (~180 kB unpacked). It is lazy-loaded inside `tasks.jsx` so recharts is never bundled with the main entry point.

```jsx
// tasks.jsx — only downloaded when the user clicks "📊 Stats"
const TaskStats = lazy(() => import('../components/TaskStats'));

// Rendered with its own Suspense boundary inside the page
{showStats && (
  <Suspense fallback={<Spinner />}>
    <TaskStats tasks={tasks} />
  </Suspense>
)}
```

### 3. Memoised task rows — `TaskCard` (`frontend/src/components/TaskCard.jsx`)

Each task card is extracted into a `React.memo()` component. Before this change, every keystroke in the "Task title" input re-rendered the entire task list. After memoisation, individual cards only re-render when their own `task` prop or `busyTaskId` changes.

```jsx
const TaskCard = memo(function TaskCard({ task, user, busyTaskId, onToggle, onDelete }) {
  // ...
});
```

`handleToggle` and `handleDelete` are wrapped in `useCallback` in the parent so their references stay stable across renders, which is required for `memo` to be effective.

---

## Before / After Bundle Comparison

| Metric | Before | After |
|---|---|---|
| Total JS output files | 10 | 12 |
| Main bundle (raw) | 263.56 kB | 263.72 kB |
| Main bundle (gzip) | 83.82 kB | 83.89 kB |
| TaskStats chunk | — | 329.72 kB (recharts) |
| TaskStats (gzip) | — | 97.05 kB |
| Initial JS on first load | 263.56 kB | 263.72 kB (TaskStats NOT downloaded) |
| JS downloaded if Stats opened | 263.56 kB | 263.72 + 329.72 = 593.44 kB |

**Key point:** A user who never clicks "Stats" never downloads recharts at all. The main bundle stays the same size — the chart library is fully isolated in its own chunk.

---

## Key Questions

**1. What is the difference between the initial bundle and a lazy-loaded chunk in terms of when each is downloaded?**

The initial bundle is requested immediately when the browser parses `index.html`. A lazy-loaded chunk is a separate file that the browser only requests when React first tries to render that component — triggered by user navigation or interaction (e.g. clicking "Stats").

**2. Why does lazy loading improve perceived performance even though the total amount of code downloaded eventually stays the same?**

The browser can parse and execute the page faster because it has less JavaScript to process on initial load. The recharts chunk (329 kB) only downloads after the user explicitly requests it, at which point the app is already interactive. The `<Suspense>` spinner provides instant feedback so the wait feels expected rather than a blank screen.

**3. In what situations would lazy loading not be worth the added complexity?**

- Very small apps where all pages combined are under ~30 kB — the extra HTTP round-trip costs more than it saves.
- Apps where every user visits every route in sequence immediately.
- SSR frameworks like Next.js that handle code splitting automatically at the framework level.

---

## How to verify in DevTools

1. Run `npm run build` — confirm `TaskStats-*.js` appears as a separate file.
2. Run `npm run preview` — open `http://localhost:4173`.
3. Open DevTools → **Network** tab → filter to **JS** → hard-reload (`Ctrl+Shift+R`).
4. Confirm only `index-*.js` and the current route chunk download on initial load — no `TaskStats` chunk.
5. Click **📊 Stats** — watch `TaskStats-*.js` appear in the Network tab at that moment.
6. Throttle to **Slow 3G** and repeat step 5 to see the spinner fallback while the chunk loads.
