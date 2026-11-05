# Migrate Nexus Trade from SQLite to Supabase Postgres

Your **Next.js app does not talk to the database directly** — the **Fastify API** (`apps/api`) uses Prisma. Migrating the API database is enough; the web app keeps calling `NEXT_PUBLIC_API_URL` as today.

## 1. Create Supabase project

1. [supabase.com](https://supabase.com) → New project → save the database password.
2. **Project Settings → Database → Connection string**
   - **Transaction pooler** (port **6543**) → `DATABASE_URL` (add `?pgbouncer=true`)
   - **Session / Direct** (port **5432**) → `DIRECT_URL`

Example `apps/api/.env`:

```env
DATABASE_URL="postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
SQLITE_DATABASE_PATH="./dev.db"
```

Keep `JWT_SECRET` and `PORT` as before.

## 2. Apply Postgres schema (no data yet)

From repo root or `apps/api`:

```bash
cd apps/api
npm run prisma:generate
npx prisma migrate dev --name init_postgres
```

If you prefer not to use migrations in dev:

```bash
npx prisma db push
```

(`migrate dev` uses `DIRECT_URL` for applying SQL.)

## 3. Copy SQLite data into Supabase

Default SQLite file with your users: **`apps/api/dev.db`** (6 users in typical dev).

```bash
cd apps/api
npm run db:migrate-from-sqlite
```

The script reads SQLite and inserts into Postgres with `skipDuplicates` (safe to re-run).

## 4. Run the stack

```bash
cd ../..   # monorepo root
npm run dev
```

Confirm login, wallet balances, and open positions match what you had on SQLite.

## 5. Optional cleanup

- Archive `apps/api/dev.db` (do not delete until you verify Supabase).
- Remove `SQLITE_DATABASE_PATH` from `.env` when done.

## Troubleshooting

| Issue | Fix |
|--------|-----|
| `P1001` can't reach database | Unpause project in Supabase; verify password. On **Render/Railway**, use **pooler** hosts (`aws-0-….pooler.supabase.com`), not `db.….supabase.co:5432` — set `DIRECT_URL` to **session pooler** port 5432 and `DATABASE_URL` to **transaction pooler** port 6543 with `?pgbouncer=true`. |
| Migration fails on pooler | Use `DIRECT_URL` on 5432; ensure `directUrl` is set in `schema.prisma`. |
| Empty Postgres after migrate | Point `SQLITE_DATABASE_PATH` at the file that has data (`./dev.db`). |
| Prisma client out of date | `npm run prisma:generate` in `apps/api`. |

## What did **not** change

- Route handlers, services, and Next.js pages — same Prisma models.
- Auth, trading, wallet logic — unchanged.
- You do **not** need `@supabase/supabase-js` unless you later add Supabase Auth or Realtime in the browser.

## Production note

Use the **pooler** URL for the API server. Run `prisma migrate deploy` in CI/CD with `DIRECT_URL` set. Enable Supabase backups and rotate `JWT_SECRET` independently of the DB password.
