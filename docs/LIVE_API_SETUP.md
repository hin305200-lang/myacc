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
4. In the service **Environment**, set:
   - `DATABASE_URL` (Supabase pooled)
   - `DIRECT_URL` (Supabase direct)
5. Wait until **Live** — open `https://myacc-api.onrender.com/health` → `{"status":"ok",...}`

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
