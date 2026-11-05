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
    
    // Initialize new user with starting balance and proper account setup
    const startingBalance = 250
    const user = await prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email.toLowerCase(),
        phoneNumber: input.phoneNumber?.trim() || null,
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
        balance: startingBalance,
        equity: startingBalance,
        margin: 0,
        freeMargin: startingBalance,
        marginLevel: 0,
        leverage: 100, // Default leverage 1:100
      },
    })

    // Create a welcome transaction record
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

