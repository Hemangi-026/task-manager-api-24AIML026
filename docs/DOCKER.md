# Practical 11 — Containerisation with Docker and Docker Compose

## Architecture

```
Host Machine (Browser / Developer)
│
│  http://localhost:3000  or  :5173  →  Frontend (Nginx)
│  http://localhost:5001             →  Backend (Express)
│  mongodb://localhost:27017         →  MongoDB (direct access)
│
└─── Docker Bridge Network: taskmanager-network
        │
        ├── frontend  (Nginx container, port 80)
        │       └── serves compiled React /dist
        │
        ├── backend   (Node 20 container, port 5001)
        │       ├── Express REST API
        │       ├── node-cache (Practical 9)
        │       └── EventEmitter notifications (Practical 10)
        │
        └── mongodb   (mongo:6.0 container, port 27017)
                └── named volume: mongodb_data → /data/db
```

---

## Files

| File | Purpose |
|---|---|
| `backend/Dockerfile` | Node 20 alpine image, `npm ci --omit=dev`, health check on `/cache/stats` |
| `frontend/Dockerfile` | 2-stage: Node builds Vite → Nginx serves static files |
| `frontend/nginx.conf` | SPA routing (`try_files`), gzip, 1-year asset caching |
| `docker-compose.yml` | Orchestrates all 3 services with network + volume |
| `backend/.dockerignore` | Excludes node_modules, .env, logs |
| `frontend/.dockerignore` | Excludes node_modules, dist, .env |

---

## Start the entire app with one command

```bash
cd task-manager
docker compose up --build
```

Then open:
- **Frontend** → http://localhost:3000
- **Backend API** → http://localhost:5001
- **Cache stats** → http://localhost:5001/cache/stats (needs Bearer token)

---

## Stop

```bash
docker compose down          # stop containers, keep data
docker compose down -v       # stop containers + wipe MongoDB data
```

---

## Key Questions

**1. Why does the backend reference MongoDB by service name `mongodb` instead of `localhost`?**

Inside a Docker container, `localhost` refers to that container itself — not other containers. Docker Compose creates an internal DNS resolver on the bridge network. Every service is reachable by its service name as a hostname. So the backend uses `MONGO_URI=mongodb://mongodb:27017/taskdb` where `mongodb` resolves to the MongoDB container's IP automatically.

**2. What is the difference between `EXPOSE` in a Dockerfile and `ports` in docker-compose.yml?**

`EXPOSE` is documentation — it tells Docker (and humans reading the file) which port the process inside the container listens on. It does NOT publish the port to the host machine.

`ports` in docker-compose.yml actually publishes the port: `"5001:5001"` maps host port 5001 to container port 5001, making it reachable from your browser.

**3. Why is it bad practice to copy `node_modules` into the Docker image?**

- `node_modules` built on macOS/Windows may contain native binaries incompatible with the Linux Alpine container.
- It bloats the image by hundreds of MB unnecessarily.
- It's slower to build because COPY is not cached the same way RUN npm ci is.
- Running `npm ci` inside the container ensures dependencies are installed for the correct OS and architecture, making the build reproducible and portable.

---

## Verification checklist

```bash
# 1. All 3 containers running and healthy
docker compose ps

# 2. All containers on the same network
docker network inspect taskmanager_internal_network

# 3. Data persists after restart
# - Create a task at http://localhost:3000
# - docker compose down
# - docker compose up -d
# - Refresh the page — task still there
```
