import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { tradingEngine } from '../services/trading-engine.service'
import { priceFeedService } from '../services/price-feed.service'
import { prisma } from '../lib/prisma'
import { PositionStatus } from '../types/enums'

export const registerOrderRoutes = (app: FastifyInstance) => {
  const orderSchema = z.object({
    symbol: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/),
    side: z.enum(['BUY', 'SELL']),
    lotSize: z.number().positive().min(0.01).max(1000),
    stopLoss: z.number().positive().optional(),
    takeProfit: z.number().positive().optional(),
  })

  app.post(
    '/orders',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = orderSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() })
      }

      if (!priceFeedService.isTradableSymbol(parsed.data.symbol)) {
        return reply.status(400).send({ error: 'Symbol is not available for trading' })
      }

      try {
        const position = await tradingEngine.placeMarketOrder(request.user.userId, {
          symbol: parsed.data.symbol,
          side: parsed.data.side,
          lotSize: parsed.data.lotSize,
          stopLoss: parsed.data.stopLoss,
          takeProfit: parsed.data.takeProfit,
        })
        // Recalculate account to update equity, marginLevel, etc.
        await tradingEngine.recalculateAccounts(new Set([request.user.userId]))
        app.io?.to(request.user.userId).emit('orders:new', position)
        return reply.code(201).send({ data: position })
      } catch (error: any) {
        return reply.status(400).send({ error: error.message })
      }
    }
  )

  app.get(
    '/orders',
    { preHandler: [app.authenticate] },
    async (request) => {
      const positions = await prisma.position.findMany({
        where: { userId: request.user.userId, status: 'OPEN' satisfies PositionStatus },
        orderBy: { openedAt: 'desc' },
      })
      return { data: positions }
    }
  )

  app.post(
    '/orders/:id/close',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string() })
      const params = paramsSchema.parse(request.params)
      const position = await prisma.position.findFirst({
        where: { id: params.id, userId: request.user.userId, status: 'OPEN' satisfies PositionStatus },
      })
      if (!position) {
        return reply.status(404).send({ error: 'Order not found' })
      }
      await tradingEngine.closePosition(position.id, request.user.userId)
      // Account recalculation is already done in closePosition, but ensure it's emitted
      await tradingEngine.recalculateAccounts(new Set([request.user.userId]))
      return reply.send({ success: true })
    }
  )
}
