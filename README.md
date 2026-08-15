# Pulse — Blood Donor Matching & Emergency Response

A full-stack platform that matches hospitals' emergency blood requests to nearby
eligible donors using an explainable AI ranking engine.

**Live demo flow:** Hospital posts a request → engine scores every eligible donor
on compatibility, distance, readiness, availability, and reliability → donor sees
the match and accepts → request status updates.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + Tailwind CSS v4 + Framer Motion |
| Backend | Node.js + Express |
| Database | PostgreSQL via Supabase (with Row Level Security) |
| Auth | Supabase Auth (JWT) |
| Hosting | Vercel (frontend) + Render (backend) |

---

## Project structure

```
blooddonor/
├── backend/
│   ├── schema.sql              ← run this in Supabase SQL Editor first
│   ├── src/
│   │   ├── server.js           ← Express app entry point
│   │   ├── config/supabase.js  ← Supabase admin client
│   │   ├── middleware/         ← auth guard, error handler
│   │   ├── routes/             ← auth, requests, responses, profiles
│   │   └── services/
│   │       └── donorRanking.js ← the AI matching engine
│   ├── test/                   ← 16 passing tests (npm test)
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/               ← Landing, Auth, Dashboard, Profile
    │   ├── pages/dashboard/     ← DonorDashboard, HospitalDashboard
    │   ├── components/          ← PulseLine, ScoreRing, DashboardShell, States
    │   ├── context/AuthContext.jsx
    │   └── lib/                 ← supabase.js, api.js
    └── .env.example
```

---

## 1. Set up Supabase (5 min)

1. Go to [supabase.com](https://supabase.com) → **New Project**. Pick any name/region, set a DB password (save it somewhere).
2. Once the project is ready, open **SQL Editor → New Query**.
3. Paste the entire contents of `backend/schema.sql` and click **Run**.
   This creates all tables, indexes, foreign keys, and Row Level Security policies.
4. Go to **Project Settings → API**. You'll need three values:
   - `Project URL` → used as `SUPABASE_URL` (backend) and `VITE_SUPABASE_URL` (frontend)
   - `anon public` key → used as `VITE_SUPABASE_ANON_KEY` (frontend)
   - `service_role` key → used as `SUPABASE_SERVICE_ROLE_KEY` (backend only — **never expose this in frontend code**)

---

## 2. Run the backend locally (2 min)

```bash
cd backend
cp .env.example .env
# open .env and paste in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npm install
npm test        # confirm all 16 tests pass
npm run dev      # starts on http://localhost:4000
```

Check it's alive: `curl http://localhost:4000/health` → `{"status":"ok"}`

---

## 3. Run the frontend locally (2 min)

```bash
cd frontend
cp .env.example .env.local
# open .env.local and paste in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
# leave VITE_API_URL as http://localhost:4000 for local dev
npm install
npm run dev       # starts on http://localhost:5173
```

Open `http://localhost:5173` — register a hospital account and a donor account
(use two different browsers or an incognito window), post a request as the
hospital, and watch the AI ranking work.

---

## 4. Deploy the backend to Render (10 min)

1. Push this repo to GitHub (see step 6 below if you haven't yet).
2. Go to [render.com](https://render.com) → **New → Web Service** → connect your GitHub repo.
3. Set:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free is fine for a demo
4. Under **Environment**, add:
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key
   - `FRONTEND_URL` = leave blank for now, you'll add it after step 5
   - `NODE_ENV` = `production`
5. Click **Create Web Service**. Wait for the build to finish, then copy the
   live URL (looks like `https://your-app.onrender.com`).

**Note:** Render's free tier sleeps after 15 min of inactivity — the first
request after a sleep takes ~30–50 seconds to wake up. If you're demoing live,
hit `/health` a minute before you go on stage to warm it up.

---

## 5. Deploy the frontend to Vercel (5 min)

1. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import the same GitHub repo.
2. Set:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (should auto-detect)
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
   - `VITE_API_URL` = your Render backend URL from step 4 (e.g. `https://your-app.onrender.com`)
4. Click **Deploy**. Copy the live URL (e.g. `https://your-app.vercel.app`).

---

## 6. Connect the two (2 min)

Go back to Render → your backend service → **Environment** → set:
- `FRONTEND_URL` = your Vercel URL from step 5

Click **Save, rebuild and deploy**. This locks CORS down to only accept
requests from your live frontend.

---

## 7. Push to GitHub (if you haven't)

```bash
cd blooddonor
git init
git add .
git commit -m "Blood donor matching platform"
git branch -M main
git remote add origin https://github.com/varunsr05-cp/YOUR_REPO_NAME.git
git push -u origin main
```

Both Render and Vercel auto-deploy on every push to `main` after this.

---

## 🔐 Security

- **Authentication:** Supabase Auth with bcrypt + server-side JWT verification.
- **Database Security:** Row Level Security (RLS) enabled on every table.
- **Secrets:** `service_role` key stored only in backend environment variables.
- **Input Validation:** All API inputs validated with `express-validator`.
- **Rate Limiting:** 300 requests/15 min; auth routes limited to 20 requests/15 min.
- **HTTP Security:** Helmet security headers + production-origin-only CORS.
- **SQL Injection Protection:** Supabase parameterized queries; no raw SQL concatenation.
