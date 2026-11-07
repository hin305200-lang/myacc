import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from './prisma'
import { hashPassword, verifyPassword } from './password'
import { signAccessToken, signRefreshToken, verifyAccessToken, type AuthPayload } from './auth-tokens'
import { getCandles, getMarketCatalog, getMarketSnapshot } from './market-prices'
import { closePosition, placeMarketOrder, recalculateAccount } from './trading'

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

async function buildTokens(user: { id: string; email: string; role: string; status?: string }) {
  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  }
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(payload),
    signRefreshToken(payload),
  ])
  return {
    accessToken,
    refreshToken,
    user: {
      ...payload,
      status: user.status ?? 'PENDING',
    },
  }
}

async function requireAdmin(req: NextRequest): Promise<AuthPayload | NextResponse> {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  if (auth.role !== 'ADMIN') {
    return json({ error: 'Admin access required' }, 403)
  }
  return auth
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
    // New accounts stay PENDING until an admin approves trading.
    const user = await prisma.user.create({
      data: {
        fullName: parsed.data.fullName,
        email,
        phoneNumber: parsed.data.phoneNumber?.trim() || null,
        passwordHash,
        role: 'USER',
        status: 'PENDING',
        balance: 0,
        credit: 0,
        equity: 0,
        margin: 0,
        freeMargin: 0,
        marginLevel: 0,
        leverage: 10,
      },
    })

    const tokens = await buildTokens(user)
    return json(
      {
        ...tokens,
        message:
          'Account created. An administrator must approve your account before you can open trades.',
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
    const dbUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, role: true, status: true, fullName: true },
    })
    if (!dbUser) return json({ error: 'Unauthorized' }, 401)
    return json({
      user: {
        userId: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        status: dbUser.status,
        fullName: dbUser.fullName,
      },
    })
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
    // Full mark-to-market (batched quotes) — kept fast for live equity/P/L
    const metrics = await recalculateAccount(userId)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        balance: true,
        credit: true,
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
        credit: Number(user.credit),
        equity: Number(user.equity),
        freeMargin: Number(user.freeMargin),
        margin: Number(user.margin),
        marginLevel: metrics?.marginLevel ?? null,
        leverage: user.leverage || 10,
        profit: metrics?.netFloatingPl ?? 0,
        floatingProfit: metrics?.floatingProfit ?? 0,
        floatingLoss: metrics?.floatingLoss ?? 0,
        netFloatingPl: metrics?.netFloatingPl ?? 0,
        marginCallLevel: metrics?.marginCallLevel,
        stopOutLevel: metrics?.stopOutLevel,
        marginAlert: metrics?.marginAlert ?? { level: 'ok' },
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
        credit: Number((user as any).credit ?? 0),
        equity: Number(user.equity),
        freeMargin: Number(user.freeMargin),
        margin: Number(user.margin),
        marginLevel: Number(user.marginLevel),
        leverage: user.leverage || 10,
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
    // Light path: return open positions without blocking on a full market sweep.
    // Summary polling already recalculates floating P/L.
    const positions = await prisma.position.findMany({
      where: { userId: auth.userId, status: 'OPEN' },
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

  if (req.method === 'POST' && parts.length === 1) {
    const body = await readJsonBody(req)
    const parsed = z
      .object({
        symbol: z.string().min(1).max(20),
        side: z.enum(['BUY', 'SELL']),
        lotSize: z.number().positive().min(0.01).max(1000),
        stopLoss: z.number().positive().optional(),
        takeProfit: z.number().positive().optional(),
      })
      .safeParse(body)
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400)
    try {
      const { position, account } = await placeMarketOrder(auth.userId, parsed.data)
      return json(
        {
          data: {
            ...position,
            lotSize: Number(position.lotSize),
            openPrice: Number(position.openPrice),
            currentPrice: Number(position.currentPrice),
            marginUsed: Number(position.marginUsed),
            commission: Number(position.commission),
            profit: Number(position.profit),
          },
          account,
        },
        201
      )
    } catch (error: any) {
      return json({ error: error?.message || 'Order failed' }, 400)
    }
  }

  if (req.method === 'POST' && parts[1] && parts[2] === 'close') {
    try {
      const result = await closePosition(parts[1], auth.userId)
      return json(result)
    } catch (error: any) {
      return json({ error: error?.message || 'Close failed' }, 400)
    }
  }

  return null
}

async function handleMarket(req: NextRequest, parts: string[]): Promise<HandlerResult> {
  if (req.method === 'GET' && parts[1] === 'symbols') {
    const data = await getMarketSnapshot(true)
    return json({ data })
  }

  if (req.method === 'GET' && parts[1] === 'catalog') {
    const data = await getMarketCatalog()
    return json({ data })
  }

  if (req.method === 'GET' && parts[1] === 'candles') {
    const symbol = (req.nextUrl.searchParams.get('symbol') || 'EURUSD').toUpperCase()
    const bars = Number(req.nextUrl.searchParams.get('bars') || 120)
    const data = await getCandles(symbol, bars)
    return json({ data })
  }

  return null
}

async function handleChat(req: NextRequest, parts: string[]): Promise<HandlerResult> {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const messageSelect = {
    id: true,
    userId: true,
    adminId: true,
    fromRole: true,
    content: true,
    createdAt: true,
    readAt: true,
  } as const

  // GET /chat/threads — admin: latest per user; user: full own thread
  if (req.method === 'GET' && parts[1] === 'threads') {
    if (auth.role === 'ADMIN') {
      const latest = await prisma.message.findMany({
        orderBy: { createdAt: 'desc' },
        select: messageSelect,
        take: 300,
      })
      const grouped = Object.values(
        latest.reduce((acc: Record<string, (typeof latest)[number]>, msg) => {
          if (!acc[msg.userId]) acc[msg.userId] = msg
          return acc
        }, {})
      )
      const userIds = grouped.map((m) => m.userId)
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fullName: true, email: true, status: true },
      })
      const byId = Object.fromEntries(users.map((u) => [u.id, u]))
      return json({
        data: grouped.map((m) => ({
          ...m,
          userName: byId[m.userId]?.fullName ?? 'User',
          userEmail: byId[m.userId]?.email ?? '',
          userStatus: byId[m.userId]?.status ?? 'PENDING',
        })),
      })
    }

    const messages = await prisma.message.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'asc' },
      select: messageSelect,
    })
    return json({ data: messages })
  }

  // POST /chat/send — any logged-in user (including PENDING) → admin inbox
  if (req.method === 'POST' && parts[1] === 'send') {
    const body = await readJsonBody(req)
    const parsed = z.object({ content: z.string().min(1).max(2000) }).safeParse(body)
    if (!parsed.success) return json({ error: 'Message required' }, 400)

    const message = await prisma.message.create({
      data: {
        userId: auth.userId,
        fromRole: 'USER',
        content: parsed.data.content.trim(),
      },
      select: messageSelect,
    })
    return json({ data: message }, 201)
  }

  // GET /chat/thread/:userId — admin only
  if (req.method === 'GET' && parts[1] === 'thread' && parts[2]) {
    if (auth.role !== 'ADMIN') return json({ error: 'Admin only' }, 403)
    const messages = await prisma.message.findMany({
      where: { userId: parts[2] },
      orderBy: { createdAt: 'asc' },
      select: messageSelect,
    })
    return json({ data: messages })
  }

  // POST /chat/send-admin — admin reply into a user thread
  if (req.method === 'POST' && parts[1] === 'send-admin') {
    if (auth.role !== 'ADMIN') return json({ error: 'Admin only' }, 403)
    const body = await readJsonBody(req)
    const parsed = z
      .object({ userId: z.string().min(1), content: z.string().min(1).max(2000) })
      .safeParse(body)
    if (!parsed.success) return json({ error: 'Invalid message' }, 400)

    const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } })
    if (!target) return json({ error: 'User not found' }, 404)

    const message = await prisma.message.create({
      data: {
        userId: parsed.data.userId,
        adminId: auth.userId,
        fromRole: 'ADMIN',
        content: parsed.data.content.trim(),
      },
      select: messageSelect,
    })
    return json({ data: message }, 201)
  }

  // POST /chat/read
  if (req.method === 'POST' && parts[1] === 'read') {
    const body = await readJsonBody(req)
    const parsed = z.object({ userId: z.string().min(1) }).safeParse(body)
    if (!parsed.success) return json({ error: 'Invalid request' }, 400)
    if (auth.role !== 'ADMIN' && parsed.data.userId !== auth.userId) {
      return json({ error: 'Forbidden' }, 403)
    }
    await prisma.message.updateMany({
      where: {
        userId: parsed.data.userId,
        readAt: null,
        ...(auth.role !== 'ADMIN' ? { fromRole: 'ADMIN' } : { fromRole: 'USER' }),
      },
      data: { readAt: new Date() },
    })
    return json({ success: true })
  }

  return null
}

async function handleAdmin(req: NextRequest, parts: string[]): Promise<HandlerResult> {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  if (req.method === 'GET' && parts[1] === 'users') {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        balance: true,
        credit: true,
        equity: true,
        margin: true,
        freeMargin: true,
        marginLevel: true,
        leverage: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return json({
      data: users.map((u) => ({
        ...u,
        balance: Number(u.balance),
        credit: Number(u.credit),
        equity: Number(u.equity),
        margin: Number(u.margin),
        freeMargin: Number(u.freeMargin),
        marginLevel: Number(u.marginLevel),
        leverage: u.leverage || 10,
      })),
    })
  }

  // Approve / suspend trading for a user (also accepts PATCH)
  if (
    (req.method === 'POST' || req.method === 'PATCH') &&
    parts[1] === 'users' &&
    parts[2] &&
    parts[3] === 'status'
  ) {
    const body = await readJsonBody(req)
    const parsed = z
      .object({
        status: z.enum(['ACTIVE', 'PENDING', 'SUSPENDED']),
        startingBalance: z.number().min(0).optional(),
        /** Broker Credit / bonus — separate from Balance */
        credit: z.number().min(0).optional(),
      })
      .safeParse(body)
    if (!parsed.success) return json({ error: 'Invalid status' }, 400)

    const user = await prisma.user.findUnique({ where: { id: parts[2] } })
    if (!user) return json({ error: 'User not found' }, 404)

    const becomingActive = parsed.data.status === 'ACTIVE' && user.status !== 'ACTIVE'
    // Starting funds go into Balance (settled cash), not broker Credit.
    const startingDeposit = becomingActive ? parsed.data.startingBalance ?? 350 : 0

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        status: parsed.data.status,
        leverage: 10,
        ...(typeof parsed.data.credit === 'number' ? { credit: parsed.data.credit } : {}),
        ...(startingDeposit > 0
          ? {
              balance: Number(user.balance) + startingDeposit,
              // Equity / free margin refreshed below via recalculateAccount
              margin: 0,
              marginLevel: 0,
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        balance: true,
        credit: true,
        equity: true,
        freeMargin: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (startingDeposit > 0) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'DEPOSIT',
          amount: startingDeposit,
          balanceBefore: Number(user.balance),
          balanceAfter: Number(user.balance) + startingDeposit,
          note: 'Admin approved account — starting balance',
        },
      })
    }

    const metrics = await recalculateAccount(user.id)
    return json({
      data: {
        ...updated,
        balance: metrics?.balance ?? Number(updated.balance),
        credit: metrics?.credit ?? Number(updated.credit),
        equity: metrics?.equity ?? Number(updated.equity),
        freeMargin: metrics?.freeMargin ?? Number(updated.freeMargin),
        margin: metrics?.margin ?? 0,
        marginLevel: metrics?.marginLevel ?? 0,
      },
    })
  }

  if (req.method === 'GET' && parts[1] === 'deposits') {
    const requests = await prisma.depositRequest.findMany({
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return json({
      data: requests.map((r) => ({ ...r, amount: Number(r.amount) })),
    })
  }

  if (req.method === 'POST' && parts[1] === 'deposits' && parts[2] && parts[3] === 'resolve') {
    const body = await readJsonBody(req)
    const parsed = z
      .object({ action: z.enum(['APPROVE', 'REJECT']), note: z.string().optional() })
      .safeParse(body)
    if (!parsed.success) return json({ error: 'Invalid action' }, 400)
    const deposit = await prisma.depositRequest.findUnique({ where: { id: parts[2] } })
    if (!deposit || deposit.status !== 'PENDING') {
      return json({ error: 'Request not found' }, 404)
    }
    const status = parsed.data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
    await prisma.depositRequest.update({
      where: { id: deposit.id },
      data: { status, note: parsed.data.note, resolvedAt: new Date() },
    })
    if (status === 'APPROVED') {
      const user = await prisma.user.findUnique({ where: { id: deposit.userId } })
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            balance: Number(user.balance) + Number(deposit.amount),
          },
        })
        await prisma.transaction.create({
          data: {
            userId: user.id,
            type: 'DEPOSIT',
            amount: deposit.amount,
            balanceBefore: user.balance,
            balanceAfter: Number(user.balance) + Number(deposit.amount),
            note: parsed.data.note,
          },
        })
        await recalculateAccount(user.id)
      }
    }
    return json({ success: true })
  }

  if (req.method === 'GET' && parts[1] === 'withdrawals') {
    const requests = await prisma.withdrawalRequest.findMany({
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return json({
      data: requests.map((r) => ({ ...r, amount: Number(r.amount) })),
    })
  }

  if (req.method === 'POST' && parts[1] === 'withdrawals' && parts[2] && parts[3] === 'resolve') {
    const body = await readJsonBody(req)
    const parsed = z
      .object({ action: z.enum(['APPROVE', 'REJECT']), note: z.string().optional() })
      .safeParse(body)
    if (!parsed.success) return json({ error: 'Invalid action' }, 400)
    const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id: parts[2] } })
    if (!withdrawal || withdrawal.status !== 'PENDING') {
      return json({ error: 'Request not found' }, 404)
    }
    const status = parsed.data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
    await prisma.withdrawalRequest.update({
      where: { id: withdrawal.id },
      data: { status, note: parsed.data.note, resolvedAt: new Date() },
    })
    if (status === 'APPROVED') {
      const user = await prisma.user.findUnique({ where: { id: withdrawal.userId } })
      if (user) {
        const amount = Number(withdrawal.amount)
        await prisma.user.update({
          where: { id: user.id },
          data: {
            balance: Number(user.balance) - amount,
          },
        })
        await prisma.transaction.create({
          data: {
            userId: user.id,
            type: 'WITHDRAWAL',
            amount: -amount,
            balanceBefore: user.balance,
            balanceAfter: Number(user.balance) - amount,
            note: parsed.data.note,
          },
        })
        await recalculateAccount(user.id)
      }
    }
    return json({ success: true })
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
    if (root === 'market') return await handleMarket(req, parts)
    if (root === 'admin') return await handleAdmin(req, parts)
    if (root === 'chat') return await handleChat(req, parts)
  } catch (error: any) {
    console.error('[local-api]', error)
    return json({ error: error?.message || 'Internal server error' }, 500)
  }

  return null
}
