# ⚡ TaskFlow — Team Task Manager

A full-stack team task management app with role-based access control, Kanban boards, and real-time dashboards.

**Live Demo:** taskflow-production-cbd9.up.railway.app **
**Demo Login:** `admin@demo.com` / `demo123`

---

## 🚀 Features

### Authentication & Roles
- JWT-based signup/login
- Two roles: **Admin** (full access) and **Member** (project-scoped)
- Role-based route protection on both frontend and backend

### Projects
- Create, edit, archive, and delete projects
- Invite/remove team members with per-project roles (admin/member)
- Progress tracking with task completion bar

### Tasks
- Create tasks with title, description, priority, status, assignee, and due date
- **Kanban Board** view with 4 columns: To Do → In Progress → Review → Done
- **List view** with sortable table
- Move tasks between statuses via drag-style quick actions
- Comment threads on tasks
- Overdue detection and visual warnings

### Dashboard
- Personal stats: total, in-progress, review, done, overdue
- Assigned + created tasks at a glance
- Recent project activity feed

### Admin Panel
- View all users in the workspace

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Axios, date-fns, Lucide Icons |
| Backend | Node.js, Express 4 |
| Database | SQLite via better-sqlite3 (zero-config, Railway-friendly) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | express-validator |
| Build | Vite |
| Deploy | Railway |

---

## 📦 Local Setup

### Prerequisites
- Node.js 18+
- npm

### 1. Clone
```bash
git clone https://github.com/yourusername/taskflow.git
cd taskflow
```

### 2. Install dependencies
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 3. Seed demo data (optional)
```bash
cd backend && node seed.js
```

### 4. Run in development

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev     # runs on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev     # runs on http://localhost:5173
```

The Vite dev server proxies `/api/*` to `localhost:5000` automatically.

---

## 🌐 Deploy to Railway

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/taskflow.git
git push -u origin main
```

### Step 2 — Create Railway Project
1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `taskflow` repository
4. Railway auto-detects the `railway.toml` config

### Step 3 — Environment Variables
In Railway dashboard → your service → **Variables**, add:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | `any-long-random-string-here` |
| `PORT` | `5000` (Railway sets this automatically) |

### Step 4 — Deploy
Railway will:
1. Install all dependencies
2. Build the React frontend
3. Run the seed script (creates demo accounts + sample data)
4. Start the Express server (serves both API + frontend)

Your app will be live at `https://your-project-name.railway.app` 🎉

---

## 🗂️ Project Structure

```
taskflow/
├── backend/
│   ├── db/
│   │   └── database.js       # SQLite init & schema
│   ├── middleware/
│   │   └── auth.js           # JWT auth + RBAC middleware
│   ├── routes/
│   │   ├── auth.js           # /api/auth/*
│   │   ├── projects.js       # /api/projects/*
│   │   └── tasks.js          # /api/tasks/*
│   ├── seed.js               # Demo data seed
│   └── server.js             # Express app entry
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── TaskModal.jsx
│       │   └── UI.jsx        # Shared components
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── pages/
│       │   ├── AuthPage.jsx
│       │   ├── Dashboard.jsx
│       │   ├── ProjectsPage.jsx
│       │   ├── ProjectDetail.jsx
│       │   └── OtherPages.jsx
│       ├── api.js            # Axios API layer
│       ├── App.jsx           # Router
│       └── styles.css        # Global design system
├── railway.toml              # Railway deploy config
└── README.md
```

---

## 🔐 API Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login, get JWT |
| GET | `/api/auth/me` | ✅ | Get current user |
| GET | `/api/auth/users` | ✅ | List all users |

### Projects
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/projects` | ✅ | List accessible projects |
| POST | `/api/projects` | ✅ | Create project |
| GET | `/api/projects/:id` | ✅ | Get project + members |
| PUT | `/api/projects/:id` | ✅ Admin | Update project |
| DELETE | `/api/projects/:id` | ✅ Admin | Delete project |
| POST | `/api/projects/:id/members` | ✅ Admin | Add member |
| DELETE | `/api/projects/:id/members/:userId` | ✅ Admin | Remove member |

### Tasks
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/tasks/dashboard` | ✅ | Personal dashboard data |
| GET | `/api/tasks/project/:id` | ✅ | Tasks for a project |
| POST | `/api/tasks` | ✅ | Create task |
| PUT | `/api/tasks/:id` | ✅ | Update task |
| DELETE | `/api/tasks/:id` | ✅ | Delete task |
| GET | `/api/tasks/:id/comments` | ✅ | Get comments |
| POST | `/api/tasks/:id/comments` | ✅ | Add comment |

---

## 👤 Demo Accounts

| Email | Password | Role |
|---|---|---|
| admin@demo.com | demo123 | Admin |
| member@demo.com | demo123 | Member |
| jordan@demo.com | demo123 | Member |
| riley@demo.com | demo123 | Member |

---

## 📄 License

MIT
