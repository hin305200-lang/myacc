import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'
import { gameModeService } from '../services/game-mode.service'

export const registerAdminRoutes = (app: FastifyInstance) => {
  app.register((instance, _, done) => {
    instance.addHook('preHandler', instance.authenticate)
    instance.addHook('preHandler', async (request, reply) => {
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Admin access required' })
      }
    })

    instance.get('/admin/users', async () => {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          balance: true,
          equity: true,
          freeMargin: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })
      return { data: users }
    })

    instance.post('/admin/users/:id/balance', async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().cuid() })
      const bodySchema = z.object({
        amount: z.number(),
        note: z.string().optional(),
      })

      const params = paramsSchema.parse(request.params)
      const body = bodySchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const user = await prisma.user.findUnique({ where: { id: params.id } })
      if (!user) {
        return reply.status(404).send({ error: 'User not found' })
      }

      const updated = await prisma.user.update({
        where: { id: params.id },
        data: {
          balance: user.balance + body.data.amount,
          equity: user.equity + body.data.amount,
          freeMargin: user.freeMargin + body.data.amount,
        },
      })

      await prisma.transaction.create({
        data: {
          userId: params.id,
          type: body.data.amount >= 0 ? 'CREDIT' : 'ADJUSTMENT',
          amount: body.data.amount,
          balanceBefore: user.balance,
          balanceAfter: updated.balance,
          note: body.data.note,
        },
      })

      return { data: updated }
    })

    instance.get('/admin/deposits', async () => {
      const requests = await prisma.depositRequest.findMany({
        include: { user: { select: { fullName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      })
      return { data: requests }
    })

    instance.post('/admin/deposits/:id/resolve', async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().cuid() })
      const bodySchema = z.object({
        action: z.enum(['APPROVE', 'REJECT']),
        note: z.string().optional(),
      })
      const params = paramsSchema.parse(request.params)
      const body = bodySchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }
      const deposit = await prisma.depositRequest.findUnique({ where: { id: params.id } })
      if (!deposit || deposit.status !== 'PENDING') {
        return reply.status(404).send({ error: 'Request not found' })
      }
      const status = body.data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
      await prisma.depositRequest.update({
        where: { id: params.id },
        data: { status, note: body.data.note, resolvedAt: new Date() },
      })
      if (status === 'APPROVED') {
        const user = await prisma.user.findUnique({ where: { id: deposit.userId } })
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              balance: Number(user.balance) + Number(deposit.amount),
              equity: Number(user.equity) + Number(deposit.amount),
              freeMargin: Number(user.freeMargin) + Number(deposit.amount),
            },
          })
          await prisma.transaction.create({
            data: {
              userId: user.id,
              type: 'DEPOSIT',
              amount: deposit.amount,
              balanceBefore: user.balance,
              balanceAfter: Number(user.balance) + Number(deposit.amount),
              note: body.data.note,
            },
          })
        }
      }
      return { success: true }
    })

    instance.get('/admin/withdrawals', async () => {
      const requests = await prisma.withdrawalRequest.findMany({
        include: { user: { select: { fullName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      })
      return {
        data: requests.map((row) => ({ ...row, amount: Number(row.amount) })),
      }
    })

    instance.post('/admin/withdrawals/:id/resolve', async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().cuid() })
      const bodySchema = z.object({
        action: z.enum(['APPROVE', 'REJECT']),
        note: z.string().optional(),
      })
      const params = paramsSchema.parse(request.params)
      const body = bodySchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id: params.id } })
      if (!withdrawal || withdrawal.status !== 'PENDING') {
        return reply.status(404).send({ error: 'Request not found' })
      }

      const status = body.data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
      await prisma.withdrawalRequest.update({
        where: { id: params.id },
        data: { status, note: body.data.note, resolvedAt: new Date() },
      })

      if (status === 'APPROVED') {
        const user = await prisma.user.findUnique({ where: { id: withdrawal.userId } })
        if (!user) {
          return reply.status(404).send({ error: 'User not found' })
        }
        const amount = Number(withdrawal.amount)
        if (amount > Number(user.freeMargin)) {
          return reply.status(400).send({ error: 'User no longer has sufficient free margin' })
        }
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: {
            balance: Number(user.balance) - amount,
            equity: Number(user.equity) - amount,
            freeMargin: Number(user.freeMargin) - amount,
          },
        })
        await prisma.transaction.create({
          data: {
            userId: user.id,
            type: 'WITHDRAWAL',
            amount: -amount,
            balanceBefore: user.balance,
            balanceAfter: updated.balance,
            note: body.data.note ?? withdrawal.payoutDetails,
          },
        })
      }

      return { success: true }
    })

    instance.post('/admin/game/force-outcome', async (request, reply) => {
      const bodySchema = z.object({
        userId: z.string().cuid(),
        outcome: z.enum(['WIN', 'LOSS']),
        amount: z.number().positive().default(50),
      })
      const body = bodySchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }
      await gameModeService.forceClosePositions(body.data.userId, body.data.outcome, body.data.amount, request.user.userId)
      return { success: true }
    })

    instance.post('/admin/game/force-price', async (request, reply) => {
      const bodySchema = z.object({
        symbol: z.string(),
        pips: z.number(),
      })
      const body = bodySchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }
      await gameModeService.adjustPrice(body.data.symbol, body.data.pips, request.user.userId)
      return { success: true }
    })

    done()
  })
}

