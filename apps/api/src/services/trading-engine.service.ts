import EventEmitter from 'node:events'
import { prisma } from '../lib/prisma'
import type { MarketSymbol } from './market.service'
import { priceFeedService } from './price-feed.service'
import { PositionStatus, TradeSide, TransactionType } from '../types/enums'

// Contract sizes for all asset types (industry standard)
const CONTRACT_SIZES: Record<string, number> = {
  // Forex: 100,000 units of base currency (standard lot)
  EURUSD: 100000,
  GBPUSD: 100000,
  USDJPY: 100000,
  AUDUSD: 100000,
  EURNOK: 100000,
  USDQAR: 100000,
  USDMXN: 100000,
  // Crypto: 1 unit of base currency
  BTCUSD: 1,
  ETHUSD: 1,
  SOLUSD: 1,
  XRPUSD: 1,
  // Commodities: Contract size in units
  XAUUSD: 100,      // 100 troy ounces per contract
  XAGUSD: 5000,     // 5,000 troy ounces per contract
  UKOIL: 1000,      // 1,000 barrels per contract
  USOIL: 1000,      // 1,000 barrels per contract
  // Indices: 1 unit per contract (CFD)
  SPX500: 1,
  NAS100: 1,
  DJI30: 1,
  DAX40: 1,
  // Stocks: 1 share per contract (CFD)
  AAPL: 1,
  MSFT: 1,
  AMZN: 1,
  TSLA: 1,
  NVDA: 1,
  GOOGL: 1,
  META: 1,
  NFLX: 1,
  AMD: 1,
  default: 100000,  // Default for forex
}

export class TradingEngineService extends EventEmitter {
  constructor() {
    super()
  }

  contractSize(symbol: string) {
    return CONTRACT_SIZES[symbol] ?? CONTRACT_SIZES.default
  }

  async placeMarketOrder(
    userId: string,
    input: { symbol: string; side: TradeSide; lotSize: number; stopLoss?: number; takeProfit?: number }
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new Error('User not found')
    }
    
    // Ensure user is active
    if (user.status !== 'ACTIVE') {
      throw new Error('Account is not active. Please contact support.')
    }

    const market = priceFeedService.getSnapshot().find((s) => s.symbol === input.symbol)
    if (!market) {
      throw new Error('Symbol unavailable')
    }

    const price = input.side === 'BUY' ? market.ask : market.bid
    const marginRequired = this.calculateMargin({
      lotSize: input.lotSize,
      price,
      leverage: user.leverage,
      symbol: input.symbol,
    })

    // Validate stop loss and take profit
    if (input.stopLoss) {
      const isValidSL = input.side === 'BUY' 
        ? input.stopLoss < price 
        : input.stopLoss > price
      if (!isValidSL) {
        throw new Error(`Stop loss must be ${input.side === 'BUY' ? 'below' : 'above'} entry price`)
      }
    }

    if (input.takeProfit) {
      const isValidTP = input.side === 'BUY'
        ? input.takeProfit > price
        : input.takeProfit < price
      if (!isValidTP) {
        throw new Error(`Take profit must be ${input.side === 'BUY' ? 'above' : 'below'} entry price`)
      }
    }

    if (user.freeMargin < marginRequired) {
      throw new Error(`Insufficient margin. Required: $${marginRequired.toFixed(2)}, Available: $${Number(user.freeMargin).toFixed(2)}`)
    }

    // Calculate commission (typically $7 per lot for forex, varies for other assets)
    const commission = this.calculateCommission(input.symbol, input.lotSize)

    const position = await prisma.position.create({
      data: {
        userId,
        symbol: input.symbol,
        side: input.side,
        lotSize: input.lotSize,
        openPrice: price,
        currentPrice: price,
        stopLoss: input.stopLoss,
        takeProfit: input.takeProfit,
        marginUsed: marginRequired,
        commission,
        status: 'OPEN',
      },
    })

    // Deduct commission from balance
    await prisma.user.update({
      where: { id: userId },
      data: {
        balance: Number(user.balance) - commission,
        margin: Number(user.margin) + marginRequired,
        freeMargin: Number(user.freeMargin) - marginRequired - commission,
      },
    })

    this.emit('position:update', { userId })
    return position
  }

  calculateCommission(symbol: string, lotSize: number): number {
    // Commission rates per lot (industry standard)
    const commissionRates: Record<string, number> = {
      // Forex: $7 per lot
      EURUSD: 7,
      GBPUSD: 7,
      USDJPY: 7,
      AUDUSD: 7,
      EURNOK: 7,
      USDQAR: 7,
      USDMXN: 7,
      // Crypto: 0.1% of trade value
      BTCUSD: 0.001,
      ETHUSD: 0.001,
      SOLUSD: 0.001,
      XRPUSD: 0.001,
      // Commodities: $5 per lot
      XAUUSD: 5,
      XAGUSD: 5,
      UKOIL: 5,
      USOIL: 5,
      // Indices: $3 per lot
      SPX500: 3,
      NAS100: 3,
      DJI30: 3,
      DAX40: 3,
      // Stocks: $1 per lot
      AAPL: 1,
      MSFT: 1,
      AMZN: 1,
      TSLA: 1,
      NVDA: 1,
      GOOGL: 1,
      META: 1,
      NFLX: 1,
      AMD: 1,
    }

    const rate = commissionRates[symbol] ?? 7
    // For crypto, commission is percentage-based
    if (symbol.includes('USD') && ['BTC', 'ETH', 'SOL', 'XRP'].some(c => symbol.startsWith(c))) {
      const market = priceFeedService.getSnapshot().find((s) => s.symbol === symbol)
      if (market) {
        const contract = this.contractSize(symbol)
        const tradeValue = lotSize * contract * market.price
        return tradeValue * rate
      }
    }
    // For others, commission is per lot
    return rate * lotSize
  }

  calculateMargin({ lotSize, price, leverage, symbol }: { lotSize: number; price: number; leverage: number; symbol: string }) {
    const contract = this.contractSize(symbol)
    const lev = Math.max(1, leverage || 10)
    return (lotSize * contract * price) / lev
  }

  calculateProfit(position: { side: TradeSide; lotSize: number; openPrice: number; currentPrice: number; symbol: string }) {
    const contract = this.contractSize(position.symbol)
    const diff = position.side === 'BUY' ? position.currentPrice - position.openPrice : position.openPrice - position.currentPrice
    return diff * contract * position.lotSize
  }

  async processPriceTick(snapshot: MarketSymbol[]) {
    const symbols = snapshot.map((s) => s.symbol)
    if (symbols.length === 0) return

    const positions = await prisma.position.findMany({
      where: { status: 'OPEN', symbol: { in: symbols } },
      include: { user: true },
    })

    for (const position of positions) {
      const market = snapshot.find((s) => s.symbol === position.symbol)
      if (!market) continue
      const currentPrice = position.side === 'BUY' ? market.bid : market.ask
      const profit = this.calculateProfit({
        side: position.side,
        lotSize: Number(position.lotSize),
        openPrice: Number(position.openPrice),
        currentPrice,
        symbol: position.symbol,
      })

      const hitStop =
        position.stopLoss &&
        ((position.side === 'BUY' && currentPrice <= position.stopLoss) ||
          (position.side === 'SELL' && currentPrice >= position.stopLoss))

      const hitTake =
        position.takeProfit &&
        ((position.side === 'BUY' && currentPrice >= position.takeProfit) ||
          (position.side === 'SELL' && currentPrice <= position.takeProfit))

      if (hitStop || hitTake) {
        await this.closePosition(position.id, position.userId, currentPrice, profit, hitStop ? 'STOPPED' : 'CLOSED')
        continue
      }

      await prisma.position.update({
        where: { id: position.id },
        data: {
          currentPrice,
          profit,
        },
      })
      this.emit('position:update', { userId: position.userId })
    }

    await this.recalculateAccounts(new Set(positions.map((p) => p.userId)))
  }

  async closePosition(
    positionId: string,
    userId: string,
    closePrice?: number,
    profitOverride?: number,
    status: PositionStatus = 'CLOSED'
  ) {
    const position = await prisma.position.findUnique({ where: { id: positionId } })
    if (!position || position.status !== 'OPEN') return null

    const market = priceFeedService.getSnapshot().find((s) => s.symbol === position.symbol)
    const currentPrice = closePrice ?? (position.side === 'BUY' ? market?.bid ?? position.currentPrice : market?.ask ?? position.currentPrice)
    const profit =
      profitOverride ??
      this.calculateProfit({
        side: position.side,
        lotSize: Number(position.lotSize),
        openPrice: Number(position.openPrice),
        currentPrice,
        symbol: position.symbol,
      })

    await prisma.position.update({
      where: { id: positionId },
      data: {
        status,
        closePrice: currentPrice,
        profit,
        closedAt: new Date(),
      },
    })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return profit

    // Add profit and return margin (commission already deducted on open)
    const newBalance = Number(user.balance) + profit
    const newMargin = Math.max(0, Number(user.margin) - Number(position.marginUsed))
    const newFreeMargin = Number(user.freeMargin) + Number(position.marginUsed)
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        balance: newBalance,
        margin: newMargin,
        freeMargin: newFreeMargin,
      },
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
        type: (profit >= 0 ? 'TRADE_PROFIT' : 'TRADE_LOSS') satisfies TransactionType,
        amount: profit,
        balanceBefore: Number(user.balance),
        balanceAfter: Number(updatedUser.balance),
      },
    })

    await this.recalculateAccounts(new Set([userId]))
    return profit
  }

  async recalculateAccounts(userIds: Set<string>) {
    for (const userId of userIds) {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) continue
      const openPositions = await prisma.position.findMany({ where: { userId, status: 'OPEN' } })

      const margin = openPositions.reduce((sum, pos) => sum + Number(pos.marginUsed), 0)
      const floating = openPositions.reduce((sum, pos) => sum + Number(pos.profit), 0)
      const equity = Number(user.balance) + floating
      const freeMargin = equity - margin
      const marginLevel = margin > 0 ? (equity / margin) * 100 : 0

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          equity,
          margin,
          freeMargin,
          marginLevel,
        },
      })
      this.emit('account:update', { userId, account: updated })
    }
  }
}

export const tradingEngine = new TradingEngineService()

priceFeedService.on('price:update', (snapshot) => {
  tradingEngine.processPriceTick(snapshot).catch((err) => console.error('[trading-engine]', err))
})

