# Nexus Trade — platform status (2026-11-05)

Project path: `/Users/adam/Desktop/ai chat/nexus-trade`  
Run: `npm run dev` → web `http://localhost:3000`, API `http://localhost:4000`

## Completed (verified against API / DB)

### Markets & assets (28 symbols)

| Category     | Symbols |
|-------------|---------|
| Forex       | EURUSD, GBPUSD, USDJPY, AUDUSD, EURNOK, USDQAR, USDMXN |
| Crypto      | BTCUSD, ETHUSD, SOLUSD, XRPUSD |
| Commodities | XAUUSD, XAGUSD, UKOIL, USOIL |
| Indices     | SPX500, NAS100, DJI30, DAX40 |
| Stocks      | AAPL, MSFT, AMZN, TSLA, NVDA, GOOGL, META, NFLX, AMD |

- `GET /market/symbols` — category, `dataSource` (`live` \| `simulated`), `tradable`, prices  
- `GET /market/catalog` — full asset list + data source note  
- `GET /market/candles?symbol=` — validated symbol; returns candle series  
- UI: category filters, search, favorites (star), **Live / Simulated** badge on market watch  
- Orders rejected for unknown / non-tradable symbols  

**Market data:** Without `MARKET_API_KEY`, prices are **simulated drift** (labeled `simulated`). With a key, provider quotes are **live** (still not a regulated exchange feed).

### Auth & accounts

- Register (full name, email, password, optional phone), login, JWT sessions  
- Argon2 password hashing, per-user wallet in SQLite via Prisma  
- New users: **$250** starter balance + ledger `DEPOSIT` row (demo credit, not a real payment)  
- Account summary + socket `account:update` with numeric normalization on the client  

### Trading

- Market orders with margin checks, open/close positions, closed trade history  
- Contract sizes aligned backend ↔ frontend P/L display  

### Wallet & ledger

- `GET /account/dashboard` — balance, equity, invested margin, unrealized / daily realized P/L, recent deposit/withdrawal rows, favorites  
- Deposit **requests** (min $10) — balance increases only after **admin approve**  
- Withdrawal **requests** (min $10, payout details) — balance decreases only after **admin approve** + ledger `WITHDRAWAL`  
- `GET /account/transactions`, deposits list, withdrawals list  
- Wallet page wired to real APIs (fixed `useAccountSummary` usage)  

### Admin (`/admin`, role `ADMIN`)

- Users list, deposit approve/reject, **withdrawal approve/reject**  
- Game-mode controls (training / demo tooling — not for production finance)  

### Database

- Models: `WithdrawalRequest`, `UserFavorite` (applied via `npx prisma db push` in `apps/api`)  

---

## Partial / UI-only (needs backend or third party)

| Area | Status |
|------|--------|
| Email verification | Not implemented (requires SMTP + token store) |
| Forgot / reset password | Not implemented |
| 2FA | Not implemented |
| KYC / AML | Not implemented |
| In-app notifications | Static UI pages; no persistent notification service |
| Profile picture upload | Not implemented |
| Real payment deposits | **No gateway** — manual admin approval only |
| Real payout rails | **No PSP** — admin records approval; no bank API |
| Rate limiting / CSRF | Minimal; harden before public launch |
| Audit log on all admin money actions | Partial (`AdminActionLog` exists; not all paths write to it) |
| Pending withdrawal fund lock | Pending withdrawals do **not** reserve balance yet (race possible if user opens new trades) |

---

## Integration test results (API, local)

- Register → `GET /account/dashboard` (balance 250)  
- `POST /account/favorites` { ETHUSD }  
- `POST /orders` BUY ETHUSD 0.01  
- `GET /market/candles?symbol=XAUUSD` (121 bars)  
- Catalog returns **28** tradable assets  

Restart API after pulling route changes: `cd apps/api && npm run dev`.

---

## Before production

1. Set `MARKET_API_KEY` (and document delayed vs live vendor terms).  
2. Integrate a **payment provider** with signed webhooks; never credit on client-only success.  
3. Integrate **payout provider** or manual ops workflow with withdrawal balance **holds** in DB transactions.  
4. SMTP for verify / reset; optional 2FA (TOTP).  
5. Security pass: rate limits, helmet, CORS, secrets rotation, backups, penetration test.  
6. Legal: jurisdiction, KYC/AML, disclaimers (simulated vs live data).  
7. Remove or gate **admin game mode** and direct balance adjust in production.  

---

## Honest scope statement

This is a **working demo trading stack** (real DB, real margin math, real order lifecycle) suitable for controlled pilots and UX testing. It is **not** a licensed broker or bank. Real-money readiness requires the integrations and controls listed above.
