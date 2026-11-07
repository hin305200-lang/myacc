import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from './prisma'
import { hashPassword, verifyPassword } from './password'
import { signAccessToken, signRefreshToken, verifyAccessToken, type AuthPayload } from './auth-tokens'

type HandlerResult = NextResponse | null

const registerSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  phoneNumber: z.string().min(6).max(20).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

function isLocalApiConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim() && process.env.JWT_SECRET?.trim())
}

async function readJsonBody(req: NextRequest) {
  try {
    return await req.json()
  } catch {
    return null
  }
}

async function requireUser(req: NextRequest): Promise<AuthPayload | NextResponse> {
  const header = req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) {
    return json({ error: 'Unauthorized' }, 401)
  }
  try {
    return await verifyAccessToken(token)
  } catch {
    return json({ error: 'Unauthorized' }, 401)
  }
}

async function buildTokens(user: { id: string; email: string; role: string }) {
  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  }
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(payload),
    signRefreshToken(payload),
  ])
  return { accessToken, refreshToken, user: payload }
}

async function handleAuth(req: NextRequest, parts: string[]): Promise<HandlerResult> {
  const action = parts[1]

  if (req.method === 'POST' && action === 'register') {
    const body = await readJsonBody(req)
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      const first =
        Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ||
        parsed.error.flatten().formErrors[0] ||
        'Invalid input'
      return json({ error: first }, 400)
    }

    const email = parsed.data.email.toLowerCase()
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return json({ error: 'Email already registered' }, 400)
    }

    const passwordHash = await hashPassword(parsed.data.password)
    const startingBalance = 250
    const user = await prisma.user.create({
      data: {
        fullName: parsed.data.fullName,
        email,
        phoneNumber: parsed.data.phoneNumber?.trim() || null,
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
        balance: startingBalance,
        equity: startingBalance,
        margin: 0,
        freeMargin: startingBalance,
        marginLevel: 0,
        leverage: 100,
      },
    })

    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'DEPOSIT',
        amount: startingBalance,
        balanceBefore: 0,
        balanceAfter: startingBalance,
        note: 'Initial account balance',
      },
    })

    const tokens = await buildTokens(user)
    return json(
      {
        ...tokens,
        message: 'Account created successfully. Welcome to TradeMarkets!',
      },
      201
    )
  }

  if (req.method === 'POST' && action === 'login') {
    const body = await readJsonBody(req)
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return json({ error: parsed.error.flatten() }, 400)
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    })
    if (!user) {
      return json({ error: 'Invalid credentials' }, 401)
    }

    const valid = await verifyPassword(user.passwordHash, parsed.data.password)
    if (!valid) {
      return json({ error: 'Invalid credentials' }, 401)
    }

    return json(await buildTokens(user))
  }

  if (req.method === 'GET' && action === 'me') {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    return json({ user: auth })
  }

  return null
}

async function handleAccount(req: NextRequest, parts: string[]): Promise<HandlerResult> {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.userId
  const section = parts[1]
  const detail = parts[2]

  if (req.method === 'GET' && section === 'summary') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        balance: true,
        equity: true,
        freeMargin: true,
        margin: true,
        marginLevel: true,
        leverage: true,
      },
    })
    return json({
      data: user && {
        ...user,
        balance: Number(user.balance),
        equity: Number(user.equity),
        freeMargin: Number(user.freeMargin),
        margin: Number(user.margin),
        marginLevel: Number(user.marginLevel),
      },
    })
  }

  if (req.method === 'GET' && section === 'positions' && detail === 'open') {
    const positions = await prisma.position.findMany({
      where: { userId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    })
    return json({
      data: positions.map((pos) => ({
        ...pos,
        lotSize: Number(pos.lotSize),
        openPrice: Number(pos.openPrice),
        currentPrice: Number(pos.currentPrice),
        stopLoss: pos.stopLoss ? Number(pos.stopLoss) : null,
        takeProfit: pos.takeProfit ? Number(pos.takeProfit) : null,
        marginUsed: Number(pos.marginUsed),
        swap: Number(pos.swap),
        commission: Number(pos.commission),
        profit: Number(pos.profit),
      })),
    })
  }

  if (req.method === 'GET' && section === 'positions' && detail === 'closed') {
    const positions = await prisma.closedTrade.findMany({
      where: { userId },
      orderBy: { closedAt: 'desc' },
      take: 100,
    })
    return json({
      data: positions.map((pos) => ({
        ...pos,
        lotSize: Number(pos.lotSize),
        openPrice: Number(pos.openPrice),
        closePrice: Number(pos.closePrice),
        profit: Number(pos.profit),
        swap: Number(pos.swap),
        commission: Number(pos.commission),
      })),
    })
  }

  if (req.method === 'GET' && section === 'transactions') {
    const tx = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return json({
      data: tx.map((t) => ({
        ...t,
        amount: Number(t.amount),
        balanceBefore: Number(t.balanceBefore),
        balanceAfter: Number(t.balanceAfter),
      })),
    })
  }

  if (req.method === 'GET' && section === 'dashboard') {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return json({ data: null })

    const openPositions = await prisma.position.findMany({
      where: { userId, status: 'OPEN' },
    })
    const closedToday = await prisma.closedTrade.findMany({
      where: {
        userId,
        closedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    })

    const unrealized = openPositions.reduce((sum, p) => sum + Number(p.profit), 0)
    const realizedToday = closedToday.reduce((sum, p) => sum + Number(p.profit), 0)
    const invested = openPositions.reduce((sum, p) => sum + Number(p.marginUsed), 0)

    const [recentDeposits, recentWithdrawals, favorites] = await Promise.all([
      prisma.depositRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.withdrawalRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.userFavorite.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    ])

    return json({
      data: {
        balance: Number(user.balance),
        equity: Number(user.equity),
        freeMargin: Number(user.freeMargin),
        margin: Number(user.margin),
        marginLevel: Number(user.marginLevel),
        invested,
        unrealizedPnl: unrealized,
        dailyRealizedPnl: realizedToday,
        openPositionsCount: openPositions.length,
        recentDeposits: recentDeposits.map((d) => ({ ...d, amount: Number(d.amount) })),
        recentWithdrawals: recentWithdrawals.map((w) => ({ ...w, amount: Number(w.amount) })),
        favoriteSymbols: favorites.map((f) => f.symbol),
      },
    })
  }

  if (req.method === 'GET' && section === 'favorites') {
    const favorites = await prisma.userFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    return json({ data: favorites.map((f) => f.symbol) })
  }

  if (req.method === 'POST' && section === 'favorites') {
    const body = await readJsonBody(req)
    const parsed = z.object({ symbol: z.string().min(1).max(20) }).safeParse(body)
    if (!parsed.success) return json({ error: 'Invalid symbol' }, 400)
    const symbol = parsed.data.symbol.toUpperCase()
    await prisma.userFavorite.upsert({
      where: { userId_symbol: { userId, symbol } },
      create: { userId, symbol },
      update: {},
    })
    return json({ data: { symbol } })
  }

  if (req.method === 'DELETE' && section === 'favorites' && detail) {
    await prisma.userFavorite.deleteMany({
      where: { userId, symbol: detail.toUpperCase() },
    })
    return json({ success: true })
  }

  if (req.method === 'POST' && section === 'deposit-request') {
    const body = await readJsonBody(req)
    const parsed = z
      .object({ amount: z.number().min(10), note: z.string().optional() })
      .safeParse(body)
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400)
    const requestRecord = await prisma.depositRequest.create({
      data: {
        userId,
        amount: parsed.data.amount,
        note: parsed.data.note,
      },
    })
    return json({ data: requestRecord })
  }

  if (req.method === 'GET' && section === 'deposits') {
    const rows = await prisma.depositRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return json({ data: rows.map((row) => ({ ...row, amount: Number(row.amount) })) })
  }

  if (req.method === 'POST' && section === 'withdrawal-request') {
    const body = await readJsonBody(req)
    const parsed = z
      .object({
        amount: z.number().positive().min(10),
        payoutDetails: z.string().min(5).max(500),
        note: z.string().optional(),
      })
      .safeParse(body)
    if (!parsed.success) return json({ error: 'Invalid withdrawal request' }, 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return json({ error: 'User not found' }, 404)
    if (parsed.data.amount > Number(user.freeMargin)) {
      return json({ error: 'Insufficient withdrawable balance' }, 400)
    }
    const pending = await prisma.withdrawalRequest.count({
      where: { userId, status: 'PENDING' },
    })
    if (pending > 0) {
      return json({ error: 'You already have a pending withdrawal request' }, 400)
    }

    const record = await prisma.withdrawalRequest.create({
      data: {
        userId,
        amount: parsed.data.amount,
        payoutDetails: parsed.data.payoutDetails,
        note: parsed.data.note,
      },
    })
    return json({ data: { ...record, amount: Number(record.amount) } })
  }

  if (req.method === 'GET' && section === 'withdrawals') {
    const rows = await prisma.withdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return json({ data: rows.map((row) => ({ ...row, amount: Number(row.amount) })) })
  }

  return null
}

async function handleOrders(req: NextRequest, parts: string[]): Promise<HandlerResult> {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  if (req.method === 'GET' && parts.length === 1) {
    const positions = await prisma.position.findMany({
      where: { userId: auth.userId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    })
    return json({ data: positions })
  }

  // Full market-order engine still lives on apps/api; keep a clear response here.
  if (req.method === 'POST') {
    return json(
      {
        error:
          'Live order execution requires the trading API worker. Account and auth are available now.',
      },
      503
    )
  }

  return null
}

/**
 * Serves auth/account/health from this Next.js deployment when DATABASE_URL + JWT_SECRET are set.
 * Returns null when the path should fall through to an upstream proxy (if configured).
 */
export async function tryHandleLocalApi(
  req: NextRequest,
  pathSegments: string[]
): Promise<NextResponse | null> {
  if (!isLocalApiConfigured()) return null

  const parts = pathSegments.map((p) => decodeURIComponent(p))
  const root = parts[0]

  if (req.method === 'GET' && (root === 'health' || parts.length === 0)) {
    try {
      await prisma.$queryRaw`SELECT 1`
      return json({ ok: true, service: 'nexus-web-local-api', database: 'up' })
    } catch (error: any) {
      return json(
        { ok: false, service: 'nexus-web-local-api', database: 'down', error: error?.message },
        503
      )
    }
  }

  try {
    if (root === 'auth') return await handleAuth(req, parts)
    if (root === 'account') return await handleAccount(req, parts)
    if (root === 'orders') return await handleOrders(req, parts)
  } catch (error: any) {
    console.error('[local-api]', error)
    return json({ error: error?.message || 'Internal server error' }, 500)
  }

  return null
}
