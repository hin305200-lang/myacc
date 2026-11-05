# Deploy to https://barrattcookelimited.com

## Current situation

`barrattcookelimited.com` is served by **GitHub Pages** (README only). The trading app is **Next.js + a separate API** — GitHub Pages cannot run it.

You need:

| Service | Host | Role |
|---------|------|------|
| **Web** | `barrattcookelimited.com` | Vercel (Next.js `apps/web`) |
| **API** | `api.barrattcookelimited.com` | Railway / Render / Fly (`apps/api`) |
| **Database** | Supabase | Postgres (`DATABASE_URL` + `DIRECT_URL`) |

---

## Step 1 — Stop GitHub Pages on this domain

1. GitHub → **hin305200-lang/myacc** → **Settings → Pages**
2. Remove custom domain **barrattcookelimited.com** (or disable Pages)
3. Delete **CNAME** file from the repo if present (branch `main`)

Until this is done, DNS may keep pointing at GitHub instead of Vercel.

---

## Step 2 — Deploy the web app (Vercel)

1. [vercel.com](https://vercel.com) → **Import** → `hin305200-lang/myacc`
2. **Root Directory:** leave as repo root (uses `/vercel.json`) *or* set to `apps/web` and use its build settings
3. **Environment variables:**

   | Name | Value |
   |------|--------|
   | `NEXT_PUBLIC_API_URL` | `https://api.barrattcookelimited.com` |
   | `NEXT_PUBLIC_WS_URL` | `wss://api.barrattcookelimited.com` |
   | `NEXT_PUBLIC_ENABLE_DEMO_AUTOLOGIN` | `false` |

4. Deploy → **Settings → Domains** → add `barrattcookelimited.com` and `www.barrattcookelimited.com`
5. At your DNS host, point **A/CNAME** as Vercel instructs (often CNAME to `cname.vercel-dns.com`)

---

## Step 3 — Deploy the API

Example: **Railway** or **Render** with `apps/api/Dockerfile` or:

- **Build:** `npm ci && npm run build --workspace @nexus-trade/api`
- **Start:** `cd apps/api && npx prisma migrate deploy && node dist/server.js`
- **Port:** `4000`

**Environment variables:**

```env
NODE_ENV=production
PORT=4000
JWT_SECRET=<long random secret>
DATABASE_URL=<supabase pooled url>
DIRECT_URL=<supabase direct url>
CORS_ORIGINS=https://barrattcookelimited.com,https://www.barrattcookelimited.com
MARKET_API_KEY=<optional>
```

Add custom domain **`api.barrattcookelimited.com`** (CNAME to Railway/Render).

Run once on Supabase:

```bash
cd apps/api && npx prisma migrate deploy
npm run db:migrate-from-sqlite   # only if moving old SQLite data
```

---

## Step 4 — Verify

- https://barrattcookelimited.com → trading UI (not README)
- https://api.barrattcookelimited.com/health → OK
- Browser devtools → Network: API calls go to `api.barrattcookelimited.com`, not `localhost`
- Register / login / wallet / trade smoke test

---

## Code defaults (already in repo)

- If `NEXT_PUBLIC_API_URL` is unset on production host `barrattcookelimited.com`, the web app uses `https://api.barrattcookelimited.com`
- API CORS in production allows `barrattcookelimited.com` and `www`
- Demo auto-login is **off** in production unless `NEXT_PUBLIC_ENABLE_DEMO_AUTOLOGIN=true`
