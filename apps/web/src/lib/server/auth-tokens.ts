import { SignJWT, jwtVerify } from 'jose'

export type AuthPayload = {
  userId: string
  email: string
  role: string
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }
  return new TextEncoder().encode(secret)
}

export async function signAccessToken(payload: AuthPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(getJwtSecret())
}

export async function signRefreshToken(payload: AuthPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret())
}

export async function verifyAccessToken(token: string): Promise<AuthPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret())
  const userId = typeof payload.userId === 'string' ? payload.userId : null
  const email = typeof payload.email === 'string' ? payload.email : null
  const role = typeof payload.role === 'string' ? payload.role : 'USER'
  if (!userId || !email) {
    throw new Error('Invalid token')
  }
  return { userId, email, role }
}
