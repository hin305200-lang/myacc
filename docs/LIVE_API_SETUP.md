# Fix “Cannot connect to server” / **404** on sign-up

**Supabase alone is not enough** — it is only the database. You still need the **Fastify API** (`apps/api`) deployed (Render/Railway) with `DATABASE_URL` pointing at Supabase.

The Vercel site is **frontend only**. Sign-up calls `/backend/auth/register`, which proxies to your live API.

---

## Step 1 — Supabase (if not done)

1. [supabase.com](https://supabase.com) → project → **Settings → Database**
2. Copy **Transaction pooler** URL → `DATABASE_URL`
3. Copy **Direct** URL → `DIRECT_URL`

---

## Step 2 — Deploy API on Render (free tier)

1. [render.com](https://render.com) → **New → Blueprint**
2. Connect repo **`hin305200-lang/myacc`**
3. Render reads **`render.yaml`** and creates **`myacc-api`**
4. In the service **Environment**, set **pooler** URLs from Supabase (**Settings → Database → Connection string**). Do **not** use the host `db.xxxx.supabase.co` on Render — it often fails with **P1001** (IPv6 / unreachable).

   | Render variable | Supabase UI | Example shape |
   |-----------------|-------------|----------------|
   | `DATABASE_URL` | **Transaction pooler**, port **6543** | `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` |
   | `DIRECT_URL` | **Session pooler**, port **5432** (same pooler host, not `db.…`) | `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:5432/postgres` |

   URL-encode special characters in the password (`@`, `#`, `%`, etc.).

   **Important:** Pooler URLs use username **`postgres.<project-ref>`** (e.g. `postgres.fuefkgitvfkvmkyttxzc`). The direct host uses plain `postgres` — that username will **not** work on the pooler (`P1000` authentication failed).

   You can delete **`DIRECT_URL`** on Render if **`DATABASE_URL`** is the 6543 pooler URI; startup derives session pooler for migrations.

5. In Supabase **Project Settings**, confirm the project is **not paused** (free tier pauses after inactivity).
6. Wait until **Live** — open `https://myacc-api.onrender.com/health` → `{"status":"ok",...}`

---

## Step 3 — Connect Vercel to the API

Vercel → **myacc** project → **Settings → Environment Variables** (Production):

| Variable | Example value |
|----------|----------------|
| `API_PROXY_TARGET` | `https://myacc-api.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | `wss://myacc-api.onrender.com` |
| `NEXT_PUBLIC_ENABLE_DEMO_AUTOLOGIN` | `false` |

Optional (instead of proxy, direct calls):

| `NEXT_PUBLIC_API_URL` | `https://myacc-api.onrender.com` |

**Redeploy** Vercel (Deployments → … → Redeploy).

---

## Step 4 — Test

1. https://www.barrattcookelimited.com → **Login / Sign Up**
2. Create account — should succeed (no “Cannot connect to server”)
3. DevTools → Network: `register` goes to `/backend/auth/register` or your Render URL → **200**

---

## Optional: custom API domain

Cloudflare DNS: CNAME **`api`** → Render hostname, then use:

- `NEXT_PUBLIC_API_URL=https://api.barrattcookelimited.com`
- `NEXT_PUBLIC_WS_URL=wss://api.barrattcookelimited.com`
