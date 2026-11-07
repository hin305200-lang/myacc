import { argon2id, argon2Verify } from 'hash-wasm'

/** Hash a password with argon2id (pure WASM — works on Vercel without native addons). */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return argon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 3,
    memorySize: 65536,
    hashLength: 32,
    outputType: 'encoded',
  })
}

/** Verify password against an encoded argon2 hash (argon2 / argon2id). */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash })
  } catch {
    return false
  }
}
