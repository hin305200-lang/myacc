import { prisma } from './prisma'
import {
  getQuotesForSymbols,
  getSymbolQuote,
  isTradableSymbol,
  resolveExecutableQuote,
  type ClientQuoteTip,
} from './market-prices'
import { contractSizeFor } from './instrument-specs'
import { evaluateMarginLevel, MARGIN_CALL_LEVEL, STOP_OUT_LEVEL } from './trading-risk'

/** Default platform leverage (1:10). Per-user leverage may differ. */
export const DEFAULT_LEVERAGE = 10

/** Money stored in USD with 2 dp; prices use instrument digits. */
export function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function roundPrice(n: number, digits = 5) {
  const f = 10 ** digits
  return Math.round((n + Number.EPSILON) * f) / f
}

export function calculateMargin({
  lotSize,
  price,
  leverage,
  symbol,
}: {
  lotSize: number
  price: number
  leverage: number
  symbol: string
}) {
  // Margin = Trade Value / Leverage ; Trade Value = lots × contract × price
  const lev = Math.max(1, leverage || DEFAULT_LEVERAGE)
  const tradeValue = lotSize * contractSizeFor(symbol) * price
  return tradeValue / lev
}

function calculateCommission(symbol: string, lotSize: number, price: number) {
  if (['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD'].includes(symbol)) {
    return lotSize * contractSizeFor(symbol) * price * 0.001
  }
  if (['AAPL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'GOOGL', 'META', 'NFLX', 'AMD'].includes(symbol)) {
    return 1 * lotSize
  }
  if (['SPX500', 'NAS100', 'DJI30', 'DAX40'].includes(symbol)) return 3 * lotSize
  if (['XAUUSD', 'XAGUSD', 'UKOIL', 'USOIL'].includes(symbol)) return 5 * lotSize
  return 7 * lotSize
}

/**
 * Floating / realized P/L in account currency (USD).
 * BUY  : (currentBid  - openAsk)  × contract × volume
 * SELL : (openBid     - currentAsk) × contract × volume
 * openPrice is the fill price (ASK for BUY, BID for SELL).
 */
export function calculateProfit(input: {
  side: string
  lotSize: number
  openPrice: number
  currentPrice: number
  symbol: string
}) {
  const diff =
    input.side === 'BUY'
      ? input.currentPrice - input.openPrice
      : input.openPrice - input.currentPrice
  return diff * contractSizeFor(input.symbol) * input.lotSize
}

export type AccountMetrics = {
  balance: number
  credit: number
  equity: number
  margin: number
  freeMargin: number
  /** null when no margin used — display as N/A / ∞ */
  marginLevel: number | null
  leverage: number
  floatingProfit: number
  floatingLoss: number
  netFloatingPl: number
  marginCallLevel: number
  stopOutLevel: number
  marginAlert: ReturnType<typeof evaluateMarginLevel>
}

type OpenPosRow = {
  id: string
  symbol: string
  side: string
  lotSize: any
  openPrice: any
  currentPrice: any
  stopLoss: any
  takeProfit: any
  marginUsed: any
  swap: any
  commission: any
  profit: any
  openedAt: Date
}

function executablePrice(side: string, bid: number, ask: number) {
  // Mark-to-market: BUY closes/values at BID; SELL at ASK
  return side === 'BUY' ? bid : ask
}

function slTpHit(side: string, bid: number, ask: number, stopLoss?: number | null, takeProfit?: number | null) {
  const px = executablePrice(side, bid, ask)
  if (side === 'BUY') {
    if (stopLoss != null && px <= stopLoss) return 'SL' as const
    if (takeProfit != null && px >= takeProfit) return 'TP' as const
  } else {
    if (stopLoss != null && px >= stopLoss) return 'SL' as const
    if (takeProfit != null && px <= takeProfit) return 'TP' as const
  }
  return null
}

async function settleClose(
  position: OpenPosRow,
  userId: string,
  closePrice: number,
  profit: number,
  reason: string
): Promise<AccountMetrics | null> {
  // Avoid interactive $transaction — Supabase/PgBouncer often fails with
  // "Unable to start a transaction in the given time".
  const realized = roundMoney(profit)

  const closed = await prisma.position.updateMany({
    where: { id: position.id, userId, status: 'OPEN' },
    data: {
      status: 'CLOSED',
      closePrice,
      currentPrice: closePrice,
      profit: realized,
      closedAt: new Date(),
    },
  })
  if (closed.count === 0) throw new Error('Order not found')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return null

  const balanceBefore = Number(user.balance)
  const newBalance = roundMoney(balanceBefore + realized)

  await Promise.all([
    prisma.closedTrade.create({
      data: {
        userId,
        symbol: position.symbol,
        side: position.side,
        lotSize: position.lotSize,
        openPrice: position.openPrice,
        closePrice,
        profit: realized,
        swap: position.swap,
        commission: position.commission,
        openedAt: position.openedAt,
      },
    }),
    prisma.transaction.create({
      data: {
        userId,
        type: realized >= 0 ? 'TRADE_PROFIT' : 'TRADE_LOSS',
        amount: realized,
        balanceBefore,
        balanceAfter: newBalance,
        note: reason,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { balance: newBalance },
    }),
  ])

  return applyAccountTotals(userId)
}

/** Fast equity refresh from DB numbers only (no external quote calls). */
export async function applyAccountTotals(userId: string): Promise<AccountMetrics | null> {
  const [user, positions] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.position.findMany({ where: { userId, status: 'OPEN' } }),
  ])
  if (!user) return null

  let floating = 0
  let margin = 0
  let floatingProfit = 0
  let floatingLoss = 0
  for (const pos of positions) {
    const p = Number(pos.profit)
    floating += p
    margin += Number(pos.marginUsed)
    if (p >= 0) floatingProfit += p
    else floatingLoss += p
  }

  const balance = Number(user.balance)
  const credit = Number((user as any).credit ?? 0)
  const equity = roundMoney(balance + credit + floating)
  margin = roundMoney(margin)
  const freeMargin = roundMoney(equity - margin)
  const marginLevel = margin > 0 ? roundMoney((equity / margin) * 100) : null
  const leverage = Math.max(1, user.leverage || DEFAULT_LEVERAGE)

  await prisma.user.update({
    where: { id: userId },
    data: {
      equity,
      margin,
      freeMargin,
      marginLevel: marginLevel ?? 0,
      leverage,
    },
  })

  return {
    balance: roundMoney(balance),
    credit: roundMoney(credit),
    equity,
    margin,
    freeMargin,
    marginLevel,
    leverage,
    floatingProfit: roundMoney(floatingProfit),
    floatingLoss: roundMoney(floatingLoss),
    netFloatingPl: roundMoney(floating),
    marginCallLevel: MARGIN_CALL_LEVEL,
    stopOutLevel: STOP_OUT_LEVEL,
    marginAlert: evaluateMarginLevel(marginLevel, margin),
  }
}

/**
 * Exact trading-account formulas:
 * Balance     = settled cash (deposits, withdrawals, closed P/L, commissions)
 * Credit      = broker bonus
 * Floating P/L = sum of unrealized open-trade P/L
 * Equity      = Balance + Credit + Floating P/L
 * Margin      = sum of reserved collateral for open trades
 * Free Margin = Equity − Margin
 * Margin Level = (Equity / Margin) × 100   (null when no margin)
 *
 * Also enforces SL/TP and stop-out using live BID/ASK.
 */
export async function recalculateAccount(userId: string): Promise<AccountMetrics | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return null

  const leverage = Math.max(1, user.leverage || DEFAULT_LEVERAGE)
  let openPositions = (await prisma.position.findMany({
    where: { userId, status: 'OPEN' },
    orderBy: { openedAt: 'asc' },
  })) as OpenPosRow[]

  if (openPositions.length === 0) {
    return applyAccountTotals(userId)
  }

  // One batch quote fetch for all open symbols (not 1 HTTP call per position)
  const quotes = await getQuotesForSymbols(openPositions.map((p) => p.symbol))
  const toClose: Array<{ pos: OpenPosRow; price: number; profit: number; reason: string }> = []
  const updates: Array<ReturnType<typeof prisma.position.update>> = []

  for (const pos of openPositions) {
    const market = quotes.get(pos.symbol.toUpperCase())
    const bid = market && market.bid > 0 ? market.bid : Number(pos.currentPrice)
    const ask = market && market.ask > 0 ? market.ask : Number(pos.currentPrice)
    const currentPrice = executablePrice(pos.side, bid, ask)

    const profit = calculateProfit({
      side: pos.side,
      lotSize: Number(pos.lotSize),
      openPrice: Number(pos.openPrice),
      currentPrice,
      symbol: pos.symbol,
    })

    const marginUsed = calculateMargin({
      lotSize: Number(pos.lotSize),
      price: Number(pos.openPrice),
      leverage,
      symbol: pos.symbol,
    })

    updates.push(
      prisma.position.update({
        where: { id: pos.id },
        data: {
          currentPrice: roundPrice(currentPrice),
          profit: roundMoney(profit),
          marginUsed: roundMoney(marginUsed),
        },
      })
    )

    const hit = slTpHit(
      pos.side,
      bid,
      ask,
      pos.stopLoss != null ? Number(pos.stopLoss) : null,
      pos.takeProfit != null ? Number(pos.takeProfit) : null
    )
    if (hit) {
      toClose.push({
        pos: { ...pos, profit: roundMoney(profit), currentPrice } as OpenPosRow,
        price: currentPrice,
        profit,
        reason: hit === 'SL' ? 'Stop Loss triggered' : 'Take Profit triggered',
      })
    }
  }

  if (updates.length) await Promise.all(updates)

  for (const item of toClose) {
    await settleClose(item.pos, userId, item.price, item.profit, item.reason)
  }

  // Stop-out loop (rare) — use already-fetched quotes when possible
  let guard = 0
  while (guard++ < 20) {
    const metrics = await applyAccountTotals(userId)
    if (!metrics || metrics.marginAlert.level !== 'stop_out' || metrics.margin <= 0) {
      return metrics
    }
    openPositions = (await prisma.position.findMany({
      where: { userId, status: 'OPEN' },
      orderBy: { profit: 'asc' },
    })) as OpenPosRow[]
    const worst = openPositions[0]
    if (!worst) return metrics

    const market = quotes.get(worst.symbol.toUpperCase()) || (await getSymbolQuote(worst.symbol))
    const bid = market && market.bid > 0 ? market.bid : Number(worst.currentPrice)
    const ask = market && market.ask > 0 ? market.ask : Number(worst.currentPrice)
    const closePrice = executablePrice(worst.side, bid, ask)
    const profit = calculateProfit({
      side: worst.side,
      lotSize: Number(worst.lotSize),
      openPrice: Number(worst.openPrice),
      currentPrice: closePrice,
      symbol: worst.symbol,
    })
    await settleClose(worst, userId, closePrice, profit, `Stop-out at margin level ${metrics.marginLevel}%`)
  }

  return applyAccountTotals(userId)
}

export type OrderResult = {
  position: any
  account: AccountMetrics | null
}

export async function placeMarketOrder(
  userId: string,
  input: {
    symbol: string
    side: 'BUY' | 'SELL'
    lotSize: number
    stopLoss?: number
    takeProfit?: number
    bid?: number
    ask?: number
    quoteTs?: number
  }
): Promise<OrderResult> {
  const symbol = input.symbol.toUpperCase()
  if (!isTradableSymbol(symbol)) {
    throw new Error('Symbol is not available for trading')
  }

  // Prefer client live tip / warm cache — avoid price-provider HTTP on the hot path
  const market = await resolveExecutableQuote(symbol, {
    bid: input.bid,
    ask: input.ask,
    quoteTs: input.quoteTs,
  })
  const price = input.side === 'BUY' ? market.ask : market.bid

  if (input.stopLoss != null) {
    const ok = input.side === 'BUY' ? input.stopLoss < price : input.stopLoss > price
    if (!ok) {
      throw new Error(`Stop loss must be ${input.side === 'BUY' ? 'below' : 'above'} entry price`)
    }
  }
  if (input.takeProfit != null) {
    const ok = input.side === 'BUY' ? input.takeProfit > price : input.takeProfit < price
    if (!ok) {
      throw new Error(`Take profit must be ${input.side === 'BUY' ? 'above' : 'below'} entry price`)
    }
  }

  // No interactive transaction (PgBouncer/Supabase pooler cannot start them reliably).
  const [user, openPositions] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.position.findMany({
      where: { userId, status: 'OPEN' },
      select: { marginUsed: true, profit: true },
    }),
  ])
  if (!user) throw new Error('User not found')
  if (user.status !== 'ACTIVE') {
    throw new Error('Account is not active. Please wait for admin approval before trading.')
  }

  const leverage = Math.max(1, user.leverage || DEFAULT_LEVERAGE)
  const marginRequired = calculateMargin({
    lotSize: input.lotSize,
    price,
    leverage,
    symbol,
  })
  const marginUsed = roundMoney(marginRequired)
  const commission = roundMoney(calculateCommission(symbol, input.lotSize, price))

  let usedMargin = 0
  let floating = 0
  for (const pos of openPositions) {
    usedMargin += Number(pos.marginUsed)
    floating += Number(pos.profit)
  }
  const balance = Number(user.balance)
  const credit = Number((user as any).credit ?? 0)
  const available = roundMoney(balance + credit + floating - usedMargin)
  if (available < marginRequired) {
    throw new Error(
      `Insufficient free margin. Required: $${marginUsed.toFixed(2)}, Available: $${available.toFixed(2)}`
    )
  }

  const newBalance = roundMoney(balance - commission)
  // Gross margin: existing opens + this fill (BUY and SELL both add — no hedge netting)
  const marginAfter = roundMoney(usedMargin + marginUsed)
  const equityAfter = roundMoney(newBalance + credit + floating)
  const freeAfter = roundMoney(equityAfter - marginAfter)
  const levelAfter = marginAfter > 0 ? roundMoney((equityAfter / marginAfter) * 100) : 0

  const position = await prisma.position.create({
    data: {
      userId,
      symbol,
      side: input.side,
      lotSize: input.lotSize,
      openPrice: price,
      currentPrice: price,
      stopLoss: input.stopLoss,
      takeProfit: input.takeProfit,
      marginUsed,
      commission,
      profit: 0,
      status: 'OPEN',
    },
  })

  await Promise.all([
    ...(commission !== 0
      ? [
          prisma.transaction.create({
            data: {
              userId,
              type: 'ADJUSTMENT',
              amount: -commission,
              balanceBefore: balance,
              balanceAfter: newBalance,
              note: `Commission ${symbol} ${input.side} ${input.lotSize} lot`,
            },
          }),
        ]
      : []),
    prisma.user.update({
      where: { id: userId },
      data: {
        balance: newBalance,
        margin: marginAfter,
        equity: equityAfter,
        freeMargin: freeAfter,
        marginLevel: levelAfter,
        leverage,
      },
    }),
  ])

  const account = await applyAccountTotals(userId)
  return { position, account }
}

export async function closePosition(
  positionId: string,
  userId: string,
  tip?: ClientQuoteTip
) {
  const position = await prisma.position.findFirst({
    where: { id: positionId, userId, status: 'OPEN' },
  })
  if (!position) throw new Error('Order not found')

  let bid = Number(position.currentPrice)
  let ask = Number(position.currentPrice)
  try {
    const market = await resolveExecutableQuote(position.symbol, tip)
    if (market.bid > 0) bid = market.bid
    if (market.ask > 0) ask = market.ask
  } catch {
    // Fall back to last marked price on the position — never block close on feed errors
    const tipBid = tip?.bid != null ? Number(tip.bid) : NaN
    const tipAsk = tip?.ask != null ? Number(tip.ask) : NaN
    if (tipBid > 0) bid = tipBid
    if (tipAsk > 0) ask = tipAsk
  }

  const currentPrice = executablePrice(position.side, bid, ask)
  const profit = roundMoney(
    calculateProfit({
      side: position.side,
      lotSize: Number(position.lotSize),
      openPrice: Number(position.openPrice),
      currentPrice,
      symbol: position.symbol,
    })
  )

  const account = await settleClose(position as any, userId, currentPrice, profit, 'Manual close')
  return { success: true, profit, closePrice: currentPrice, account }
}
