export const EMPTY_TRADING_ACCOUNT = {
  balance: 0,
  credit: 0,
  equity: 0,
  freeMargin: 0,
  margin: 0,
  marginLevel: null as number | null,
  profit: 0, // net floating P/L
  floatingProfit: 0,
  floatingLoss: 0,
}

/** Equity = Balance + Credit + Floating P/L */
export function computeEquity(balance: number, credit: number, floatingPl: number) {
  return balance + credit + floatingPl
}

/** Free Margin = Equity − Used Margin */
export function computeFreeMargin(equity: number, usedMargin: number) {
  return equity - usedMargin
}

/** Margin Level % = (Equity / Used Margin) × 100 */
export function computeMarginLevel(equity: number, usedMargin: number) {
  if (usedMargin <= 0) return 0
  return (equity / usedMargin) * 100
}

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

export function formatMarginLevelIfAuth(level: number | null | undefined, authenticated: boolean) {
  if (!authenticated) return '—'
  if (level == null || !Number.isFinite(level) || level <= 0) return 'N/A'
  return `${level.toFixed(1)}%`
}

export function maskAccountId(userId?: string) {
  if (!userId) return null
  if (userId.length <= 8) return userId
  return `${userId.slice(0, 4)}…${userId.slice(-4)}`
}
