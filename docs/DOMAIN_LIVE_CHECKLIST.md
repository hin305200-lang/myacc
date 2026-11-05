# Make barrattcookelimited.com show your Vercel app

**Current issue (typical):** The domain still routes to **GitHub Pages** (`404 Site not found`), not Vercel. DNS is on **Cloudflare**; records must point to **Vercel**.

---

## 1. GitHub — release the domain

1. https://github.com/hin305200-lang/myacc → **Settings → Pages**
2. If **Custom domain** shows `barrattcookelimited.com`, click **Remove**
3. Confirm there is **no `CNAME` file** on `main` (already removed in repo)

---

## 2. Vercel — attach the domain

1. Open your **myacc** project on [vercel.com](https://vercel.com)
2. **Settings → General**
   - **Root Directory:** `apps/web`
   - **Node.js Version:** `26.x`
3. **Settings → Environment Variables** (Production):

   | Variable | Value |
   |----------|--------|
   | `NEXT_PUBLIC_API_URL` | `https://api.barrattcookelimited.com` |
   | `NEXT_PUBLIC_WS_URL` | `wss://api.barrattcookelimited.com` |
   | `NEXT_PUBLIC_ENABLE_DEMO_AUTOLOGIN` | `false` |

4. **Settings → Domains** → **Add**
   - `barrattcookelimited.com`
   - `www.barrattcookelimited.com`
5. Vercel shows required DNS records (copy them — use **Vercel’s values**, not guesses)

6. **Deployments** → latest **Production** → confirm **Ready**

Your preview URL (e.g. `myacc-xxx.vercel.app`) should load the trading UI **before** custom DNS works.

---

## 3. Cloudflare — point DNS to Vercel

Log in to Cloudflare → **barrattcookelimited.com** → **DNS → Records**

**Remove or edit** any record pointing to GitHub, e.g.:

- CNAME `@` → `hin305200-lang.github.io`
- CNAME `www` → `hin305200-lang.github.io`

**Add what Vercel asks for**, usually:

| Type | Name | Content | Proxy |
|------|------|---------|--------|
| A | `@` | `76.76.21.21` | DNS only (grey cloud) recommended for first setup |
| CNAME | `www` | `cname.vercel-dns.com` | DNS only |

Or use Vercel’s **recommended CNAME** for apex if shown.

**SSL/TLS:** **Full** (not Flexible) once Vercel has issued a cert.

Wait 5–30 minutes, then open https://barrattcookelimited.com

---

## 4. API + database (required for login/trading)

The website on Vercel is only the frontend. For auth, wallet, and trades you need:

| Host | Service |
|------|---------|
| `api.barrattcookelimited.com` | Deploy `apps/api` (Railway, Render, Fly, etc.) |
| Supabase | `DATABASE_URL` + `DIRECT_URL` on the API |

See [DEPLOY_BARRATTCOOKELIMITED.md](./DEPLOY_BARRATTCOOKELIMITED.md) § Step 3.

Cloudflare DNS example:

- CNAME `api` → your Railway/Render hostname

Test: https://api.barrattcookelimited.com/health → `{ "status": "ok" }` or similar

---

## 5. Verify

- [ ] https://barrattcookelimited.com → **Nexus Trade** UI (not GitHub 404)
- [ ] Browser DevTools → Network → requests go to `api.barrattcookelimited.com` (not `localhost:4000`)
- [ ] Register / login works
- [ ] https://www.barrattcookelimited.com redirects or loads same app

---

## Quick diagnosis

| What you see | Cause |
|--------------|--------|
| GitHub Pages 404 | DNS still → GitHub; fix Cloudflare + remove Pages domain |
| Vercel “Invalid Configuration” on domain | DNS not matching Vercel’s records |
| App loads but “Cannot connect to server” | API not deployed or `NEXT_PUBLIC_API_URL` missing/wrong |
| Login fails | Supabase / `JWT_SECRET` / API env not set |
