import { contractSize } from '@/lib/contract-sizes'

/** Normalize account leverage — 0 / NaN must not collapse to 1:1 by accident. */
export function effectiveLeverage(leverage?: number | null): number {
  const n = Number(leverage)
  if (Number.isFinite(n) && n >= 1) return Math.floor(n)
  return 10
}

/**
 * Required margin = (lots × contract size × price) / leverage
 * Same formula for every asset.
 * Example: 1 BTCUSD lot (= 100 BTC) @ $75,950 with 1:10
 *   → (1 × 100 × 75950) / 10 = $759,500
 */
export function estimateMargin(input: {
  symbol: string
  lotSize: number
  price: number
  leverage?: number | null
}): number {
  const lots = Number(input.lotSize)
  const price = Number(input.price)
  if (!(lots > 0) || !(price > 0)) return 0
  const lev = effectiveLeverage(input.leverage)
  const notional = lots * contractSize(input.symbol) * price
  return notional / lev
}

/** Units in one full lot (e.g. BTCUSD → 100 BTC). */
export function unitsPerLot(symbol: string): number {
  return contractSize(symbol)
}

/** Volume in base units for the chosen lot size. */
export function volumeInUnits(symbol: string, lotSize: number): number {
  return Number(lotSize) * contractSize(symbol)
}
