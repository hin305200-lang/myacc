import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AuthService } from '../services/auth.service'

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

export const registerAuthRoutes = (app: FastifyInstance) => {
  const authService = new AuthService(app)

  app.post('/auth/register', async (request, reply) => {
    try {
      const result = registerSchema.safeParse(request.body)
      if (!result.success) {
        const errors = result.error.flatten()
        const firstError = errors.fieldErrors
          ? Object.values(errors.fieldErrors)[0]?.[0] || 'Invalid input'
          : errors.formErrors?.[0] || 'Invalid input'
        return reply.status(400).send({ error: firstError })
      }

      const tokens = await authService.registerUser(result.data)
      
      if (!tokens || !tokens.accessToken || !tokens.user) {
        return reply.status(500).send({ error: 'Failed to create account. Please try again.' })
      }
      
      return reply.code(201).send({
        ...tokens,
        message: 'Account created successfully. Welcome to TradeMarkets!'
      })
    } catch (error: any) {
      console.error('Registration error:', error)
      // Provide more specific error messages
      const errorMessage = error.message || 'Registration failed. Please try again.'
      return reply.status(400).send({ error: errorMessage })
    }
  })

  app.post('/auth/login', async (request, reply) => {
    const result = loginSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    try {
      const tokens = await authService.loginUser(result.data)
      return reply.send(tokens)
    } catch (error: any) {
      return reply.status(401).send({ error: error.message })
    }
  })

  app.get(
    '/auth/me',
    { preHandler: [app.authenticate] },
    async (request) => {
      return { user: request.user }
    }
  )
}


