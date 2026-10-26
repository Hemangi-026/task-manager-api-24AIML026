# Task Manager — 24AIML026

Full-stack task management app built with React + Vite (frontend) and Express + MongoDB (backend).

## Structure

```
task-manager/
├── frontend/   ← React + Vite SPA
└── backend/    ← Express REST API + MongoDB
```

## Backend

### Setup

```bash
cd backend
npm install
```

Create a `.env` file (see `.env` for the required keys):

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/taskdb
JWT_SECRET=your_long_random_secret
GOOGLE_CLIENT_ID=your_google_client_id    # optional
CLIENT_URL=http://localhost:5173          # for password reset emails
EMAIL_USER=your_gmail@gmail.com           # optional
EMAIL_PASS=your_gmail_app_password        # optional
```

### Run

```bash
npm run dev    # nodemon (auto-restart)
npm start      # node (production)
```

Server starts at `http://localhost:5000`.

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | — | Register a new user |
| POST | `/login` | — | Email/password login → JWT |
| POST | `/google` | — | Google OAuth login → JWT |
| POST | `/forgot-password` | — | Send password reset email |
| POST | `/reset-password/:token` | — | Reset password via token |
| GET | `/me` | ✅ | Get current user |
| PUT | `/me` | ✅ | Update name / role |
| GET | `/tasks` | ✅ | List all tasks |
| GET | `/tasks/:id` | ✅ | Get single task |
| POST | `/tasks` | ✅ | Create task |
| PUT | `/tasks/:id` | ✅ | Update task (creator only) |
| DELETE | `/tasks/:id` | ✅ | Delete task (creator only) |

---

## Frontend

### Setup

```bash
cd frontend
npm install
```

Optional: create a `.env` file:

```
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### Run

```bash
npm run dev      # dev server at http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview production build
```

### Routes

| Path | Component | Auth required |
|------|-----------|---------------|
| `/` | Tasks board | ✅ (redirects to /login) |
| `/login` | Login | — |
| `/register` | Register | — |
| `/forgot-password` | Forgot Password | — |
| `/reset-password/:token` | Reset Password | — |
| `/profile` | Profile | ✅ |

All route-level components are lazy-loaded with `React.lazy()` and `Suspense`.
