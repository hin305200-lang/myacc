import { prisma } from './prisma'
import { assertExecutableQuote, getSymbolQuote, isTradableSymbol } from './market-prices'
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
) {
  await prisma.position.update({
    where: { id: position.id },
    data: {
      status: 'CLOSED',
      closePrice,
      currentPrice: closePrice,
      profit: roundMoney(profit),
      closedAt: new Date(),
    },
  })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return

  const newBalance = roundMoney(Number(user.balance) + profit)
  await prisma.user.update({
    where: { id: userId },
    data: { balance: newBalance },
  })

  await prisma.closedTrade.create({
    data: {
      userId,
      symbol: position.symbol,
      side: position.side,
      lotSize: position.lotSize,
      openPrice: position.openPrice,
      closePrice,
      profit: roundMoney(profit),
      swap: position.swap,
      commission: position.commission,
      openedAt: position.openedAt,
    },
  })

  await prisma.transaction.create({
    data: {
      userId,
      type: profit >= 0 ? 'TRADE_PROFIT' : 'TRADE_LOSS',
      amount: roundMoney(profit),
      balanceBefore: Number(user.balance),
      balanceAfter: newBalance,
      note: reason,
    },
  })
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

  // Pass 1 — mark to market + SL/TP
  const toClose: Array<{ pos: OpenPosRow; price: number; profit: number; reason: string }> = []

  for (const pos of openPositions) {
    const market = await getSymbolQuote(pos.symbol)
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

    await prisma.position.update({
      where: { id: pos.id },
      data: {
        currentPrice: roundPrice(currentPrice),
        profit: roundMoney(profit),
        marginUsed: roundMoney(marginUsed),
      },
    })

    const hit = slTpHit(
      pos.side,
      bid,
      ask,
      pos.stopLoss != null ? Number(pos.stopLoss) : null,
      pos.takeProfit != null ? Number(pos.takeProfit) : null
    )
    if (hit) {
      toClose.push({
        pos,
        price: currentPrice,
        profit,
        reason: hit === 'SL' ? 'Stop Loss triggered' : 'Take Profit triggered',
      })
    }
  }

  for (const item of toClose) {
    await settleClose(item.pos, userId, item.price, item.profit, item.reason)
  }

  if (toClose.length) {
    openPositions = (await prisma.position.findMany({
      where: { userId, status: 'OPEN' },
      orderBy: { openedAt: 'asc' },
    })) as OpenPosRow[]
  }

  const computeTotals = async () => {
    const positions = (await prisma.position.findMany({
      where: { userId, status: 'OPEN' },
    })) as OpenPosRow[]
    const freshUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!freshUser) return null

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

    const balance = Number(freshUser.balance)
    const credit = Number((freshUser as any).credit ?? 0)
    const equity = roundMoney(balance + credit + floating)
    margin = roundMoney(margin)
    const freeMargin = roundMoney(equity - margin)
    const marginLevel = margin > 0 ? roundMoney((equity / margin) * 100) : null

    return {
      positions,
      balance,
      credit,
      equity,
      margin,
      freeMargin,
      marginLevel,
      floating: roundMoney(floating),
      floatingProfit: roundMoney(floatingProfit),
      floatingLoss: roundMoney(floatingLoss),
      leverage: Math.max(1, freshUser.leverage || DEFAULT_LEVERAGE),
    }
  }

  // Pass 2 — stop-out: close worst losers until margin level recovers (or no positions left)
  let guard = 0
  while (guard++ < 50) {
    const totals = await computeTotals()
    if (!totals) return null
    const alert = evaluateMarginLevel(totals.marginLevel, totals.margin)
    if (alert.level !== 'stop_out' || totals.positions.length === 0) break

    const worst = [...totals.positions].sort((a, b) => Number(a.profit) - Number(b.profit))[0]
    if (!worst) break

    const market = await getSymbolQuote(worst.symbol)
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
    await settleClose(worst, userId, closePrice, profit, `Stop-out at margin level ${totals.marginLevel}%`)
  }

  const finals = await computeTotals()
  if (!finals) return null

  const marginAlert = evaluateMarginLevel(finals.marginLevel, finals.margin)

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      equity: finals.equity,
      margin: finals.margin,
      freeMargin: finals.freeMargin,
      // Persist 0 when N/A so DB column stays non-null; API exposes null separately
      marginLevel: finals.marginLevel ?? 0,
      leverage: finals.leverage,
    },
  })

  return {
    balance: roundMoney(Number(updated.balance)),
    credit: roundMoney(finals.credit),
    equity: Number(updated.equity),
    margin: Number(updated.margin),
    freeMargin: Number(updated.freeMargin),
    marginLevel: finals.marginLevel,
    leverage: updated.leverage,
    floatingProfit: finals.floatingProfit,
    floatingLoss: finals.floatingLoss,
    netFloatingPl: finals.floating,
    marginCallLevel: MARGIN_CALL_LEVEL,
    stopOutLevel: STOP_OUT_LEVEL,
    marginAlert,
  }
}

export async function placeMarketOrder(
  userId: string,
  input: {
    symbol: string
    side: 'BUY' | 'SELL'
    lotSize: number
    stopLoss?: number
    takeProfit?: number
  }
) {
  const symbol = input.symbol.toUpperCase()
  if (!isTradableSymbol(symbol)) {
    throw new Error('Symbol is not available for trading')
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')
  if (user.status !== 'ACTIVE') {
    throw new Error('Account is not active. Please wait for admin approval before trading.')
  }

  const metrics = await recalculateAccount(userId)
  const leverage = Math.max(1, user.leverage || DEFAULT_LEVERAGE)

  // Never accept a manual/random price — force a fresh executable quote
  const market = await assertExecutableQuote(symbol)
  const price = input.side === 'BUY' ? market.ask : market.bid

  const marginRequired = calculateMargin({
    lotSize: input.lotSize,
    price,
    leverage,
    symbol,
  })

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

  const available = metrics?.freeMargin ?? Number(user.freeMargin)
  if (available < marginRequired) {
    throw new Error(
      `Insufficient free margin. Required: $${roundMoney(marginRequired).toFixed(2)}, Available: $${roundMoney(available).toFixed(2)}`
    )
  }

  const commission = roundMoney(calculateCommission(symbol, input.lotSize, price))
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
      marginUsed: roundMoney(marginRequired),
      commission,
      profit: 0,
      status: 'OPEN',
    },
  })

  // Commission settles into Balance
  await prisma.user.update({
    where: { id: userId },
    data: {
      balance: roundMoney(Number(user.balance) - commission),
    },
  })

  if (commission !== 0) {
    await prisma.transaction.create({
      data: {
        userId,
        type: 'ADJUSTMENT',
        amount: -commission,
        balanceBefore: Number(user.balance),
        balanceAfter: roundMoney(Number(user.balance) - commission),
        note: `Commission ${symbol} ${input.side} ${input.lotSize} lot`,
      },
    })
  }

  await recalculateAccount(userId)
  return position
}

export async function closePosition(positionId: string, userId: string) {
  const position = await prisma.position.findFirst({
    where: { id: positionId, userId, status: 'OPEN' },
  })
  if (!position) throw new Error('Order not found')

  const market = await getSymbolQuote(position.symbol, { force: true })
  const bid = market && market.bid > 0 ? market.bid : Number(position.currentPrice)
  const ask = market && market.ask > 0 ? market.ask : Number(position.currentPrice)
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

  await settleClose(position as any, userId, currentPrice, profit, 'Manual close')
  await recalculateAccount(userId)
  return { success: true, profit, closePrice: currentPrice }
}
