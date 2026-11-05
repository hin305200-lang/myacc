import { priceFeedService } from './price-feed.service'

export type AssetCategory = 'forex' | 'crypto' | 'stocks' | 'commodities' | 'indices'

export type MarketSymbol = {
  symbol: string
  price: number
  bid: number
  ask: number
  spread: number
  changePercent: number
  category: AssetCategory
  dataSource: 'live' | 'simulated'
  tradable: boolean
  marketStatus: 'open'
}

class MarketService {
  private enrich(snapshot: ReturnType<typeof priceFeedService.getSnapshot>[number]): MarketSymbol {
    const category = priceFeedService.getSymbolCategory(snapshot.symbol) ?? 'forex'
    return {
      ...snapshot,
      category,
      dataSource: priceFeedService.getDataSourceMode(),
      tradable: priceFeedService.isTradableSymbol(snapshot.symbol),
      marketStatus: 'open',
    }
  }

  getSymbols(): MarketSymbol[] {
    return priceFeedService.getSnapshot().map((symbol) => this.enrich(symbol))
  }

  getSymbol(symbol: string): MarketSymbol | null {
    const found = priceFeedService.getSnapshot().find((s) => s.symbol === symbol)
    return found ? this.enrich(found) : null
  }

  getCatalog() {
    return {
      dataSource: priceFeedService.getDataSourceMode(),
      dataSourceNote:
        priceFeedService.getDataSourceMode() === 'live'
          ? 'Prices from configured market data provider (Twelve Data / Alpha Vantage).'
          : 'Simulated prices with realistic drift — configure MARKET_API_KEY for live quotes.',
      assets: priceFeedService.getSymbolCatalog(),
    }
  }

  async getCandles(symbol: string) {
    if (!priceFeedService.isTradableSymbol(symbol)) {
      throw new Error('Unknown symbol')
    }
    return priceFeedService.getCandles(symbol)
  }
}

export const marketService = new MarketService()
