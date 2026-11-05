import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { PositionStatus } from '../types/enums'
import { z } from 'zod'

export const registerAccountRoutes = (app: FastifyInstance) => {
  app.register((instance, _, done) => {
    instance.addHook('preHandler', instance.authenticate)

    instance.get('/account/summary', async (request) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user.userId },
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
      return {
        data: user && {
          ...user,
          balance: Number(user.balance),
          equity: Number(user.equity),
          freeMargin: Number(user.freeMargin),
          margin: Number(user.margin),
          marginLevel: Number(user.marginLevel),
        },
      }
    })

    instance.get('/account/positions/open', async (request) => {
      const positions = await prisma.position.findMany({
        where: { userId: request.user.userId, status: 'OPEN' satisfies PositionStatus },
        orderBy: { openedAt: 'desc' },
      })
      return {
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
      }
    })

    instance.get('/account/positions/closed', async (request) => {
      const positions = await prisma.closedTrade.findMany({
        where: { userId: request.user.userId },
        orderBy: { closedAt: 'desc' },
        take: 100,
      })
      return {
        data: positions.map((pos) => ({
          ...pos,
          lotSize: Number(pos.lotSize),
          openPrice: Number(pos.openPrice),
          closePrice: Number(pos.closePrice),
          profit: Number(pos.profit),
          swap: Number(pos.swap),
          commission: Number(pos.commission),
        })),
      }
    })

    instance.get('/account/transactions', async (request) => {
      const tx = await prisma.transaction.findMany({
        where: { userId: request.user.userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      return {
        data: tx.map((t) => ({
          ...t,
          amount: Number(t.amount),
          balanceBefore: Number(t.balanceBefore),
          balanceAfter: Number(t.balanceAfter),
        })),
      }
    })

    instance.post('/account/deposit-request', async (request, reply) => {
      const schema = z.object({
        amount: z.number().min(10),
        note: z.string().optional(),
      })
      const parsed = schema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() })
      }
      const requestRecord = await prisma.depositRequest.create({
        data: {
          userId: request.user.userId,
          amount: parsed.data.amount,
          note: parsed.data.note,
        },
      })
      return { data: requestRecord }
    })

    instance.get('/account/deposits', async (request) => {
      const rows = await prisma.depositRequest.findMany({
        where: { userId: request.user.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return {
        data: rows.map((row) => ({ ...row, amount: Number(row.amount) })),
      }
    })

    instance.post('/account/withdrawal-request', async (request, reply) => {
      const schema = z.object({
        amount: z.number().positive().min(10),
        payoutDetails: z.string().min(5).max(500),
        note: z.string().optional(),
      })
      const parsed = schema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid withdrawal request' })
      }

      const user = await prisma.user.findUnique({ where: { id: request.user.userId } })
      if (!user) {
        return reply.status(404).send({ error: 'User not found' })
      }

      const withdrawable = Number(user.freeMargin)
      if (parsed.data.amount > withdrawable) {
        return reply.status(400).send({ error: 'Insufficient withdrawable balance' })
      }

      const pendingMargin = await prisma.withdrawalRequest.count({
        where: { userId: request.user.userId, status: 'PENDING' },
      })
      if (pendingMargin > 0) {
        return reply.status(400).send({ error: 'You already have a pending withdrawal request' })
      }

      const record = await prisma.withdrawalRequest.create({
        data: {
          userId: request.user.userId,
          amount: parsed.data.amount,
          payoutDetails: parsed.data.payoutDetails,
          note: parsed.data.note,
        },
      })

      return { data: { ...record, amount: Number(record.amount) } }
    })

    instance.get('/account/withdrawals', async (request) => {
      const rows = await prisma.withdrawalRequest.findMany({
        where: { userId: request.user.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return {
        data: rows.map((row) => ({ ...row, amount: Number(row.amount) })),
      }
    })

    instance.get('/account/dashboard', async (request) => {
      const userId = request.user.userId
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        return { data: null }
      }

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

      const recentDeposits = await prisma.depositRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })
      const recentWithdrawals = await prisma.withdrawalRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })

      const favorites = await prisma.userFavorite.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })

      return {
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
      }
    })

    instance.get('/account/favorites', async (request) => {
      const favorites = await prisma.userFavorite.findMany({
        where: { userId: request.user.userId },
        orderBy: { createdAt: 'desc' },
      })
      return { data: favorites.map((f) => f.symbol) }
    })

    instance.post('/account/favorites', async (request, reply) => {
      const schema = z.object({ symbol: z.string().min(1).max(20) })
      const parsed = schema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid symbol' })
      }
      const symbol = parsed.data.symbol.toUpperCase()
      await prisma.userFavorite.upsert({
        where: { userId_symbol: { userId: request.user.userId, symbol } },
        create: { userId: request.user.userId, symbol },
        update: {},
      })
      return { data: { symbol } }
    })

    instance.delete('/account/favorites/:symbol', async (request) => {
      const params = z.object({ symbol: z.string() }).parse(request.params)
      await prisma.userFavorite.deleteMany({
        where: { userId: request.user.userId, symbol: params.symbol.toUpperCase() },
      })
      return { success: true }
    })

    done()
  })
}

