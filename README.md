# Seedlynx — Vercel Edition

Static landing page + serverless booking API + admin dashboard.
Originally Express/MongoDB; converted to **Vercel serverless functions** + **Vercel Postgres** (free tier).

## Project structure

```
seedlynx/
├── api/                       # Serverless functions (auto-routed by Vercel)
│   ├── _lib/
│   │   ├── auth.js            # JWT helpers
│   │   ├── cors.js            # CORS + preflight
│   │   └── db.js              # Postgres + lazy schema/admin seed
│   ├── auth/
│   │   ├── login.js           # POST /api/auth/login
│   │   └── me.js              # GET  /api/auth/me  (protected)
│   ├── bookings/
│   │   ├── index.js           # GET (admin) + POST (public) /api/bookings
│   │   └── [id].js            # GET / PUT / DELETE /api/bookings/:id
│   └── health.js              # GET /api/health
├── public/                    # Static frontend served at /
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   ├── assets/...
│   └── admin/
│       ├── index.html         # /admin
│       ├── admin.css
│       └── admin.js
├── package.json
├── vercel.json
└── .env.example
```

## 1 · Deploy (the easy way)

1. Create a new GitHub repo, push these files.
2. Go to <https://vercel.com/new> → import the repo → click **Deploy**.
3. Open your new project → **Storage → Create Database → Postgres** (Hobby/free tier). Vercel auto-injects all `POSTGRES_*` env vars.
4. **Settings → Environment Variables** add:
   - `JWT_SECRET` = any long random string
   - *(optional)* `CLIENT_ORIGIN` = `https://your-domain.vercel.app`
5. Click **Redeploy** so the new env vars apply.
6. Done — the database tables and a default admin user are created automatically on the first request.

## 2 · Default admin credentials

```
username: admin
password: admin123
```

⚠️ **Change immediately in production.** The seed only runs if no admin row exists. To rotate, open the Vercel Postgres dashboard → run:

```sql
-- generate a new bcrypt hash locally:  node -e "console.log(require('bcryptjs').hashSync('NEW_PASSWORD',12))"
UPDATE admins SET password = '<paste-hash>' WHERE username = 'admin';
```

## 3 · Run locally

```bash
npm install
npm i -g vercel
vercel link            # link to your Vercel project
vercel env pull        # downloads POSTGRES_* + JWT_SECRET into .env.local
npm run dev            # http://localhost:3000
```

The frontend uses **relative URLs** (`/api/...`), so it works locally and in production with no code changes.

## 4 · API reference

| Method | Path                   | Auth   | Purpose                  |
| ------ | ---------------------- | ------ | ------------------------ |
| GET    | `/api/health`          | public | health check             |
| POST   | `/api/auth/login`      | public | admin login → JWT        |
| GET    | `/api/auth/me`         | admin  | current admin            |
| POST   | `/api/bookings`        | public | create booking           |
| GET    | `/api/bookings`        | admin  | list (filter `?status=`) |
| GET    | `/api/bookings/:id`    | admin  | get one                  |
| PUT    | `/api/bookings/:id`    | admin  | update                   |
| DELETE | `/api/bookings/:id`    | admin  | delete                   |

Send admin-only requests with header `Authorization: Bearer <token>`.

## 5 · What changed vs the original

- **Express server removed** — each route is now an isolated serverless function under `/api/*`.
- **MongoDB → Vercel Postgres** — `bookings` and `admins` tables; unique `(date, time)` constraint replaces Mongo compound index.
- **Schema + admin seed run lazily** on the first request (idempotent), so you don't need a migration step.
- **Frontend `API_BASE`** changed from `http://localhost:5000/api` to `/api` (relative).
- **CORS** is permissive by default; lock it down with the `CLIENT_ORIGIN` env var.
