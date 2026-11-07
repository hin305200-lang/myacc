import argon2 from 'argon2'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { UserRole, UserStatus } from '../types/enums'

export class AuthService {
  constructor(private app: FastifyInstance) {}

  async registerUser(input: { fullName: string; email: string; password: string; phoneNumber?: string }) {
    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } })
    if (existing) {
      throw new Error('Email already registered')
    }

    const passwordHash = await argon2.hash(input.password)
    
    // New accounts stay at $0 / PENDING until admin approval (then $350 @ 1:10).
    const user = await prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email.toLowerCase(),
        phoneNumber: input.phoneNumber?.trim() || null,
        passwordHash,
        role: 'USER',
        status: 'PENDING',
        balance: 0,
        equity: 0,
        margin: 0,
        freeMargin: 0,
        marginLevel: 0,
        leverage: 10,
      },
    })

    return this.buildTokens(user)
  }

  async loginUser(input: { email: string; password: string }) {
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } })
    if (!user) {
      throw new Error('Invalid credentials')
    }

    const passwordValid = await argon2.verify(user.passwordHash, input.password)
    if (!passwordValid) {
      throw new Error('Invalid credentials')
    }

    return this.buildTokens(user)
  }

  private buildTokens(user: { id: string; email: string; role: UserRole }) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    }
    const accessToken = this.app.jwt.sign(payload, { expiresIn: '15m' })
    const refreshToken = this.app.jwt.sign(payload, { expiresIn: '7d' })
    return { accessToken, refreshToken, user: payload }
  }
}

