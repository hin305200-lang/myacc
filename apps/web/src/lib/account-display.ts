export const EMPTY_TRADING_ACCOUNT = {
  balance: 0,
  credit: 0,
  equity: 0,
  freeMargin: 0,
  margin: 0,
  marginLevel: 0,
  profit: 0,
} as const

export function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

/** Hide monetary values until the user is authenticated (real account). */
export function formatUsdIfAuth(value: number, authenticated: boolean) {
  if (!authenticated) return '—'
  return formatUsd(value)
}

export function formatPlIfAuth(value: number, authenticated: boolean) {
  if (!authenticated) return '—'
  const prefix = value >= 0 ? '+' : ''
  return `${prefix}${formatUsd(value)}`
}

export function formatMarginLevelIfAuth(level: number, authenticated: boolean) {
  if (!authenticated) return '—'
  if (level <= 0) return '—'
  return `${level.toFixed(1)}%`
}

export function maskAccountId(userId?: string) {
  if (!userId) return null
  if (userId.length <= 8) return userId
  return `${userId.slice(0, 4)}…${userId.slice(-4)}`
}
