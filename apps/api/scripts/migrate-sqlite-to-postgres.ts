/**
 * Copies all rows from the local SQLite file into Postgres (Supabase).
 * Prerequisites:
 *   1. Postgres schema applied: npx prisma migrate deploy
 *   2. DATABASE_URL + DIRECT_URL in apps/api/.env point at Supabase
 *
 * Usage (from apps/api):
 *   npm install -D better-sqlite3 @types/better-sqlite3
 *   npm run db:migrate-from-sqlite
 */
import path from 'node:path'
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Database from 'better-sqlite3'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '../.env') })

const prisma = new PrismaClient()

const sqlitePath =
  process.env.SQLITE_DATABASE_PATH ??
  path.join(__dirname, '../dev.db')

type Row = Record<string, unknown>

function all(table: string): Row[] {
  const db = new Database(sqlitePath, { readonly: true, fileMustExist: true })
  try {
    return db.prepare(`SELECT * FROM "${table}"`).all() as Row[]
  } finally {
    db.close()
  }
}

function dec(value: unknown): string | number {
  if (value === null || value === undefined) return 0
  return value as string | number
}

function date(value: unknown): Date {
  return new Date(String(value))
}

async function main() {
  if (!process.env.DATABASE_URL?.startsWith('postgres')) {
    throw new Error('DATABASE_URL must be a Postgres URL (Supabase) before running this script.')
  }

  console.log(`Reading SQLite: ${sqlitePath}`)

  const users = all('User')
  const positions = all('Position')
  const closedTrades = all('ClosedTrade')
  const transactions = all('Transaction')
  const depositRequests = all('DepositRequest')
  const withdrawalRequests = all('WithdrawalRequest')
  const favorites = all('UserFavorite')
  const messages = all('Message')
  const adminLogs = all('AdminActionLog')
  const gameActions = all('GameModeAction')

  console.log('Counts:', {
    users: users.length,
    positions: positions.length,
    closedTrades: closedTrades.length,
    transactions: transactions.length,
    depositRequests: depositRequests.length,
    withdrawalRequests: withdrawalRequests.length,
    favorites: favorites.length,
    messages: messages.length,
    adminLogs: adminLogs.length,
    gameActions: gameActions.length,
  })

  await prisma.$transaction(async (tx) => {
    if (users.length) {
      await tx.user.createMany({
        data: users.map((u) => ({
          id: String(u.id),
          email: String(u.email),
          passwordHash: String(u.passwordHash),
          fullName: String(u.fullName),
          phoneNumber: u.phoneNumber != null ? String(u.phoneNumber) : null,
          role: String(u.role),
          status: String(u.status),
          balance: dec(u.balance),
          equity: dec(u.equity),
          margin: dec(u.margin),
          freeMargin: dec(u.freeMargin),
          marginLevel: dec(u.marginLevel),
          leverage: Number(u.leverage),
          createdAt: date(u.createdAt),
          updatedAt: date(u.updatedAt),
        })),
        skipDuplicates: true,
      })
    }

    if (positions.length) {
      await tx.position.createMany({
        data: positions.map((p) => ({
          id: String(p.id),
          userId: String(p.userId),
          symbol: String(p.symbol),
          side: String(p.side),
          lotSize: dec(p.lotSize),
          openPrice: dec(p.openPrice),
          currentPrice: dec(p.currentPrice),
          stopLoss: p.stopLoss != null ? dec(p.stopLoss) : null,
          takeProfit: p.takeProfit != null ? dec(p.takeProfit) : null,
          marginUsed: dec(p.marginUsed),
          swap: dec(p.swap),
          commission: dec(p.commission),
          profit: dec(p.profit),
          status: String(p.status),
          openedAt: date(p.openedAt),
          closedAt: p.closedAt ? date(p.closedAt) : null,
          closePrice: p.closePrice != null ? dec(p.closePrice) : null,
        })),
        skipDuplicates: true,
      })
    }

    if (closedTrades.length) {
      await tx.closedTrade.createMany({
        data: closedTrades.map((c) => ({
          id: String(c.id),
          userId: String(c.userId),
          symbol: String(c.symbol),
          side: String(c.side),
          lotSize: dec(c.lotSize),
          openPrice: dec(c.openPrice),
          closePrice: dec(c.closePrice),
          profit: dec(c.profit),
          swap: dec(c.swap),
          commission: dec(c.commission),
          openedAt: date(c.openedAt),
          closedAt: date(c.closedAt),
        })),
        skipDuplicates: true,
      })
    }

    if (transactions.length) {
      await tx.transaction.createMany({
        data: transactions.map((t) => ({
          id: String(t.id),
          userId: String(t.userId),
          type: String(t.type),
          amount: dec(t.amount),
          balanceBefore: dec(t.balanceBefore),
          balanceAfter: dec(t.balanceAfter),
          note: t.note != null ? String(t.note) : null,
          createdAt: date(t.createdAt),
        })),
        skipDuplicates: true,
      })
    }

    if (depositRequests.length) {
      await tx.depositRequest.createMany({
        data: depositRequests.map((d) => ({
          id: String(d.id),
          userId: String(d.userId),
          amount: dec(d.amount),
          status: String(d.status),
          note: d.note != null ? String(d.note) : null,
          createdAt: date(d.createdAt),
          resolvedAt: d.resolvedAt ? date(d.resolvedAt) : null,
        })),
        skipDuplicates: true,
      })
    }

    if (withdrawalRequests.length) {
      await tx.withdrawalRequest.createMany({
        data: withdrawalRequests.map((w) => ({
          id: String(w.id),
          userId: String(w.userId),
          amount: dec(w.amount),
          status: String(w.status),
          payoutDetails: w.payoutDetails != null ? String(w.payoutDetails) : null,
          note: w.note != null ? String(w.note) : null,
          createdAt: date(w.createdAt),
          resolvedAt: w.resolvedAt ? date(w.resolvedAt) : null,
        })),
        skipDuplicates: true,
      })
    }

    if (favorites.length) {
      await tx.userFavorite.createMany({
        data: favorites.map((f) => ({
          id: String(f.id),
          userId: String(f.userId),
          symbol: String(f.symbol),
          createdAt: date(f.createdAt),
        })),
        skipDuplicates: true,
      })
    }

    if (messages.length) {
      await tx.message.createMany({
        data: messages.map((m) => ({
          id: String(m.id),
          userId: String(m.userId),
          adminId: m.adminId != null ? String(m.adminId) : null,
          fromRole: String(m.fromRole),
          content: String(m.content),
          createdAt: date(m.createdAt),
          readAt: m.readAt ? date(m.readAt) : null,
        })),
        skipDuplicates: true,
      })
    }

    if (adminLogs.length) {
      await tx.adminActionLog.createMany({
        data: adminLogs.map((a) => ({
          id: String(a.id),
          adminId: String(a.adminId),
          action: String(a.action),
          payload: String(a.payload),
          createdAt: date(a.createdAt),
        })),
        skipDuplicates: true,
      })
    }

    if (gameActions.length) {
      await tx.gameModeAction.createMany({
        data: gameActions.map((g) => ({
          id: String(g.id),
          adminId: String(g.adminId),
          action: String(g.action),
          parameters: String(g.parameters),
          createdAt: date(g.createdAt),
        })),
        skipDuplicates: true,
      })
    }
  })

  const verify = await prisma.user.count()
  console.log(`Done. Postgres User count: ${verify}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
