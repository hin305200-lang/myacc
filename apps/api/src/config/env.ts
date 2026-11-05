import { config } from 'dotenv'
import { z } from 'zod'

config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  MARKET_API_KEY: z.string().optional(),
  MARKET_API_PROVIDER: z.enum(['twelvedata', 'alphaVantage']).default('twelvedata'),
  /** Comma-separated origins, e.g. https://barrattcookelimited.com,https://www.barrattcookelimited.com */
  CORS_ORIGINS: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables', parsed.error.flatten().fieldErrors)
  throw new Error('Invalid environment variables')
}

export const env = parsed.data

export function getAllowedCorsOrigins(): string[] | true {
  const raw = env.CORS_ORIGINS?.trim()
  if (!raw) {
    return env.NODE_ENV === 'production'
      ? ['https://barrattcookelimited.com', 'https://www.barrattcookelimited.com']
      : true
  }
  if (raw === '*') return true
  return raw.split(',').map((o) => o.trim()).filter(Boolean)
}
