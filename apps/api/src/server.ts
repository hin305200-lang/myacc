import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import { Server as SocketIOServer } from 'socket.io'
import { env, getAllowedCorsOrigins } from './config/env'
import { registerHealthRoutes } from './routes/health'
import { registerMarketRoutes } from './routes/market'
import { registerOrderRoutes } from './routes/orders'
import { registerAuthRoutes } from './routes/auth'
import { registerAdminRoutes } from './routes/admin'
import { registerAccountRoutes } from './routes/account'
import { registerProfileRoutes } from './routes/profile'
import { registerChatRoutes } from './routes/chat'
import { priceFeedService } from './services/price-feed.service'
import { tradingEngine } from './services/trading-engine.service'
void tradingEngine

const buildServer = () => {
  const app = Fastify({
    logger: true
  })

  const corsOrigins = getAllowedCorsOrigins()
  app.register(cors, {
    origin: corsOrigins === true ? true : corsOrigins,
    credentials: true,
  })

  app.register(jwt, {
    secret: env.JWT_SECRET
  })

  app.register(websocket)

  app.decorate(
    'authenticate',
    async (request: any, reply: any) => {
      try {
        await request.jwtVerify()
      } catch (err) {
        reply.send(err)
      }
    }
  )

  registerHealthRoutes(app)
  registerMarketRoutes(app)
  registerOrderRoutes(app)
  registerAccountRoutes(app)
  registerAuthRoutes(app)
  registerAdminRoutes(app)
  registerProfileRoutes(app)
  registerChatRoutes(app)

  let io: SocketIOServer

  app.addHook('onReady', async () => {
    const server = app.server
    const socketOrigins = corsOrigins === true ? '*' : corsOrigins
    io = new SocketIOServer(server, {
      cors: {
        origin: socketOrigins,
        credentials: true,
      },
    })
    app.decorate('io', io)
    priceFeedService.on('price:update', (snapshot) => {
      io.emit('price:update', snapshot)
    })
    tradingEngine.on('account:update', ({ userId, account }) => {
      io.to(userId).emit('account:update', account)
    })
    tradingEngine.on('position:update', ({ userId }) => {
      io.to(userId).emit('position:update', { timestamp: Date.now() })
    })
    await priceFeedService.start()
    io.on('connection', (socket) => {
      socket.emit('connected', { timestamp: Date.now() })
      socket.on('auth:join', async (token: string) => {
        try {
          const payload = await app.jwt.verify(token)
          socket.join(payload.userId)
          socket.emit('auth:joined', { ok: true })
        } catch (error) {
          socket.emit('auth:joined', { ok: false })
        }
      })
    })
  })

  return app
}

const start = async () => {
  const app = buildServer()
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    console.log(`🚀 API ready on http://localhost:${env.PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

if (process.env.NODE_ENV !== 'test') {
  start()
}

export type AppServer = ReturnType<typeof buildServer>
