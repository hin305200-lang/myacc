import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { marketService } from '../services/market.service'

export const registerMarketRoutes = (app: FastifyInstance) => {
  app.get('/market/symbols', async () => ({
    data: marketService.getSymbols(),
  }))

  app.get('/market/catalog', async () => ({
    data: marketService.getCatalog(),
  }))

  app.get('/market/symbols/:symbol', async (request, reply) => {
    const params = z.object({ symbol: z.string().min(1) }).safeParse(request.params)
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid symbol' })
    }
    const asset = marketService.getSymbol(params.data.symbol.toUpperCase())
    if (!asset) {
      return reply.status(404).send({ error: 'Symbol not found' })
    }
    return { data: asset }
  })

  app.get('/market/candles', async (request, reply) => {
    const schema = z.object({ symbol: z.string().default('EURUSD') })
    const result = schema.safeParse(request.query)
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid symbol parameter' })
    }
    const symbol = result.data.symbol.toUpperCase()
    try {
      const data = await marketService.getCandles(symbol)
      return { data, meta: { symbol, dataSource: marketService.getCatalog().dataSource } }
    } catch (error: any) {
      return reply.status(404).send({ error: error.message ?? 'Failed to load candles' })
    }
  })
}
