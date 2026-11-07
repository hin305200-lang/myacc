import { prisma } from './prisma'
import { getSymbolQuote, isTradableSymbol } from './market-prices'

/** Platform leverage: 1:10 */
export const DEFAULT_LEVERAGE = 10

const CONTRACT_SIZES: Record<string, number> = {
  EURUSD: 100000,
  GBPUSD: 100000,
  USDJPY: 100000,
  AUDUSD: 100000,
  EURNOK: 100000,
  USDQAR: 100000,
  USDMXN: 100000,
  BTCUSD: 1,
  ETHUSD: 1,
  SOLUSD: 1,
  XRPUSD: 1,
  XAUUSD: 100,
  XAGUSD: 5000,
  UKOIL: 1000,
  USOIL: 1000,
  SPX500: 1,
  NAS100: 1,
  DJI30: 1,
  DAX40: 1,
  AAPL: 1,
  MSFT: 1,
  AMZN: 1,
  TSLA: 1,
  NVDA: 1,
  GOOGL: 1,
  META: 1,
  NFLX: 1,
  AMD: 1,
  default: 100000,
}

function contractSize(symbol: string) {
  return CONTRACT_SIZES[symbol] ?? CONTRACT_SIZES.default
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
  const lev = Math.max(1, leverage || DEFAULT_LEVERAGE)
  return (lotSize * contractSize(symbol) * price) / lev
}

function calculateCommission(symbol: string, lotSize: number, price: number) {
  if (['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD'].includes(symbol)) {
    return lotSize * contractSize(symbol) * price * 0.001
  }
  if (['AAPL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'GOOGL', 'META', 'NFLX', 'AMD'].includes(symbol)) {
    return 1 * lotSize
  }
  if (['SPX500', 'NAS100', 'DJI30', 'DAX40'].includes(symbol)) return 3 * lotSize
  if (['XAUUSD', 'XAGUSD', 'UKOIL', 'USOIL'].includes(symbol)) return 5 * lotSize
  return 7 * lotSize
}

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
  return diff * contractSize(input.symbol) * input.lotSize
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100
}

/**
 * Standard trading-account metrics:
 * - Balance: settled cash (after commissions / closed P/L)
 * - Equity: balance + floating P/L
 * - Margin: sum of margin used by open positions
 * - Free margin: equity − margin
 * - Margin level: (equity / margin) × 100%  (0 when no margin)
 */
export async function recalculateAccount(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return null

  const leverage = Math.max(1, user.leverage || DEFAULT_LEVERAGE)
  const openPositions = await prisma.position.findMany({
    where: { userId, status: 'OPEN' },
  })

  let floating = 0
  let margin = 0

  for (const pos of openPositions) {
    const market = await getSymbolQuote(pos.symbol)
    const currentPrice = market
      ? pos.side === 'BUY'
        ? market.bid
        : market.ask
      : Number(pos.currentPrice)

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

    floating += profit
    margin += marginUsed

    await prisma.position.update({
      where: { id: pos.id },
      data: {
        currentPrice,
        profit: roundMoney(profit),
        marginUsed: roundMoney(marginUsed),
      },
    })
  }

  const balance = Number(user.balance)
  const equity = roundMoney(balance + floating)
  margin = roundMoney(margin)
  const freeMargin = roundMoney(equity - margin)
  const marginLevel = margin > 0 ? roundMoney((equity / margin) * 100) : 0

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      equity,
      margin,
      freeMargin,
      marginLevel,
      leverage,
    },
  })

  return {
    balance: roundMoney(Number(updated.balance)),
    equity: Number(updated.equity),
    margin: Number(updated.margin),
    freeMargin: Number(updated.freeMargin),
    marginLevel: Number(updated.marginLevel),
    leverage: updated.leverage,
    floatingProfit: roundMoney(floating),
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

  // Fresh metrics before risk checks
  const metrics = await recalculateAccount(userId)
  const leverage = Math.max(1, user.leverage || DEFAULT_LEVERAGE)

  const market = await getSymbolQuote(symbol)
  if (!market) throw new Error('Symbol unavailable')

  const price = input.side === 'BUY' ? market.ask : market.bid
  const marginRequired = calculateMargin({
    lotSize: input.lotSize,
    price,
    leverage,
    symbol,
  })

  if (input.stopLoss) {
    const ok = input.side === 'BUY' ? input.stopLoss < price : input.stopLoss > price
    if (!ok) {
      throw new Error(`Stop loss must be ${input.side === 'BUY' ? 'below' : 'above'} entry price`)
    }
  }
  if (input.takeProfit) {
    const ok = input.side === 'BUY' ? input.takeProfit > price : input.takeProfit < price
    if (!ok) {
      throw new Error(`Take profit must be ${input.side === 'BUY' ? 'above' : 'below'} entry price`)
    }
  }

  const available = metrics?.freeMargin ?? Number(user.freeMargin)
  if (available < marginRequired) {
    throw new Error(
      `Insufficient margin. Required: $${marginRequired.toFixed(2)}, Available: $${available.toFixed(2)}`
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

  // Commission settles against balance; margin/equity/freeMargin come from recalculate
  await prisma.user.update({
    where: { id: userId },
    data: {
      balance: roundMoney(Number(user.balance) - commission),
    },
  })

  await recalculateAccount(userId)
  return position
}

export async function closePosition(positionId: string, userId: string) {
  const position = await prisma.position.findFirst({
    where: { id: positionId, userId, status: 'OPEN' },
  })
  if (!position) throw new Error('Order not found')

  const market = await getSymbolQuote(position.symbol)
  const currentPrice =
    position.side === 'BUY'
      ? market?.bid ?? Number(position.currentPrice)
      : market?.ask ?? Number(position.currentPrice)

  const profit = roundMoney(
    calculateProfit({
      side: position.side,
      lotSize: Number(position.lotSize),
      openPrice: Number(position.openPrice),
      currentPrice,
      symbol: position.symbol,
    })
  )

  await prisma.position.update({
    where: { id: positionId },
    data: {
      status: 'CLOSED',
      closePrice: currentPrice,
      currentPrice,
      profit,
      closedAt: new Date(),
    },
  })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { success: true, profit }

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
      closePrice: currentPrice,
      profit,
      swap: position.swap,
      commission: position.commission,
      openedAt: position.openedAt,
    },
  })

  await prisma.transaction.create({
    data: {
      userId,
      type: profit >= 0 ? 'TRADE_PROFIT' : 'TRADE_LOSS',
      amount: profit,
      balanceBefore: Number(user.balance),
      balanceAfter: newBalance,
    },
  })

  await recalculateAccount(userId)
  return { success: true, profit }
}
