# Task Manager Backend — 24AIML026

Express + MongoDB REST API for the Task Manager application.

## Setup

```bash
npm install
```

Create a `.env` file:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/taskdb
JWT_SECRET=your_long_random_secret
GOOGLE_CLIENT_ID=your_google_client_id    # optional
CLIENT_URL=http://localhost:5173          # for password reset emails
EMAIL_USER=your_gmail@gmail.com           # optional
EMAIL_PASS=your_gmail_app_password        # optional
```

## Run

```bash
npm run dev    # nodemon (auto-restart on file changes)
npm start      # node (production)
```

Server starts at `http://localhost:5000`.

## API Endpoints

### Auth (public)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Register a new user (name, email, password, role) |
| POST | `/login` | Email/password login — returns JWT |
| POST | `/google` | Google OAuth login — verifies ID token, returns JWT |
| POST | `/forgot-password` | Send password reset email |
| POST | `/reset-password/:token` | Reset password using the emailed token |

### User (protected — requires `Authorization: Bearer <token>`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Get current user profile |
| PUT | `/me` | Update name and/or role |

### Tasks (protected)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tasks` | List all tasks (with creator name + role) |
| GET | `/tasks/:id` | Get a single task |
| POST | `/tasks` | Create a task |
| PUT | `/tasks/:id` | Update a task (creator only) |
| DELETE | `/tasks/:id` | Delete a task (creator only) |

## Tech Stack

- **Express 5** — web framework
- **Mongoose 9** — MongoDB ODM
- **bcryptjs** — password hashing
- **jsonwebtoken** — JWT auth
- **google-auth-library** — Google OAuth token verification
- **nodemailer** — password reset emails
- **nodemon** — dev auto-restart
