import { contractSize } from '@/lib/contract-sizes'

export type OpenPositionLike = {
  id: string
  symbol: string
  side: string
  lotSize?: number | string
  openPrice?: number | string
  currentPrice?: number | string
  marginUsed?: number | string | null
  profit?: number | string
  openedAt?: string
  stopLoss?: number | string | null
  takeProfit?: number | string | null
  swap?: number | string | null
  commission?: number | string | null
}

/** Used margin for one position — prefer stored marginUsed; else lots × contract × open / leverage. */
export function calcPositionMargin(order: OpenPositionLike, leverage = 10): number {
  const stored = Number(order.marginUsed)
  if (Number.isFinite(stored) && stored > 0) return stored
  const lots = Number(order.lotSize)
  const price = Number(order.openPrice)
  const lev = Math.max(1, leverage || 10)
  if (!(lots > 0) || !(price > 0)) return 0
  return (lots * contractSize(String(order.symbol || '')) * price) / lev
}

/** Gross used margin across all opens (BUY and SELL both count — no hedge netting). */
export function sumUsedMargin(orders: OpenPositionLike[], leverage = 10): number {
  return orders.reduce((sum, order) => sum + calcPositionMargin(order, leverage), 0)
}

export type LiveQuote = { bid?: number; ask?: number }

/** Same formula for row Net profit and header Profit — one source of truth. */
export function calcPositionLiveProfit(
  order: OpenPositionLike,
  quote?: LiveQuote | null
): { currentPrice: number; profit: number } {
  const openPrice = Number(order.openPrice)
  const lotSize = Number(order.lotSize)
  const side = String(order.side || '').toUpperCase()
  const fallback = Number(order.currentPrice)
  const bid = Number(quote?.bid)
  const ask = Number(quote?.ask)
  const currentPrice =
    bid > 0 && ask > 0 ? (side === 'BUY' ? bid : ask) : fallback > 0 ? fallback : openPrice

  const size = contractSize(String(order.symbol || ''))
  const priceDiff = side === 'BUY' ? currentPrice - openPrice : openPrice - currentPrice
  const profit = priceDiff * size * lotSize
  return {
    currentPrice,
    profit: Number.isFinite(profit) ? profit : Number(order.profit) || 0,
  }
}

export function mapLivePositions<T extends OpenPositionLike>(
  openPositions: T[],
  quotes: Record<string, LiveQuote | undefined>
) {
  let totalProfit = 0
  let floatingProfit = 0
  let floatingLoss = 0

  const positions = openPositions.map((order) => {
    const quote = quotes[order.symbol] || quotes[String(order.symbol || '').toUpperCase()]
    const { currentPrice, profit } = calcPositionLiveProfit(order, quote)
    totalProfit += profit
    if (profit >= 0) floatingProfit += profit
    else floatingLoss += profit

    return {
      id: order.id,
      openTime: order.openedAt || '',
      symbol: order.symbol,
      volume: Number(order.lotSize),
      side: (String(order.side).toUpperCase() === 'SELL' ? 'SELL' : 'BUY') as 'BUY' | 'SELL',
      openPrice: Number(order.openPrice),
      currentPrice,
      stopLoss: order.stopLoss ? Number(order.stopLoss) : 0,
      takeProfit: order.takeProfit ? Number(order.takeProfit) : 0,
      swap: order.swap ? Number(order.swap) : 0,
      commission: order.commission ? Number(order.commission) : 0,
      profit,
    }
  })

  return { positions, totalProfit, floatingProfit, floatingLoss }
}
