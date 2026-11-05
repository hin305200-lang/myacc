import EventEmitter from 'node:events'
import { env } from '../config/env'
import type { MarketSymbol } from './market.service'

type ProviderName = 'twelvedata' | 'alphaVantage'

type SymbolConfig = {
  brokerSymbol: string
  providerSymbol: string
  alphaParams?: { from: string; to: string }
  category: 'forex' | 'crypto' | 'stocks' | 'commodities' | 'indices'
}

type Candle = {
  time: number
  open: number
  high: number
  low: number
  close: number
}

const SYMBOL_CONFIG: SymbolConfig[] = [
  // Forex
  { brokerSymbol: 'EURUSD', providerSymbol: 'EUR/USD', alphaParams: { from: 'EUR', to: 'USD' }, category: 'forex' },
  { brokerSymbol: 'GBPUSD', providerSymbol: 'GBP/USD', alphaParams: { from: 'GBP', to: 'USD' }, category: 'forex' },
  { brokerSymbol: 'USDJPY', providerSymbol: 'USD/JPY', alphaParams: { from: 'USD', to: 'JPY' }, category: 'forex' },
  { brokerSymbol: 'AUDUSD', providerSymbol: 'AUD/USD', alphaParams: { from: 'AUD', to: 'USD' }, category: 'forex' },
  { brokerSymbol: 'EURNOK', providerSymbol: 'EUR/NOK', alphaParams: { from: 'EUR', to: 'NOK' }, category: 'forex' },
  { brokerSymbol: 'USDQAR', providerSymbol: 'USD/QAR', alphaParams: { from: 'USD', to: 'QAR' }, category: 'forex' },
  { brokerSymbol: 'USDMXN', providerSymbol: 'USD/MXN', alphaParams: { from: 'USD', to: 'MXN' }, category: 'forex' },
  // Crypto
  { brokerSymbol: 'BTCUSD', providerSymbol: 'BTC/USD', category: 'crypto' },
  { brokerSymbol: 'ETHUSD', providerSymbol: 'ETH/USD', category: 'crypto' },
  { brokerSymbol: 'SOLUSD', providerSymbol: 'SOL/USD', category: 'crypto' },
  { brokerSymbol: 'XRPUSD', providerSymbol: 'XRP/USD', category: 'crypto' },
  // Commodities
  { brokerSymbol: 'XAUUSD', providerSymbol: 'XAU/USD', category: 'commodities' },
  { brokerSymbol: 'XAGUSD', providerSymbol: 'XAG/USD', category: 'commodities' },
  { brokerSymbol: 'UKOIL', providerSymbol: 'UKOIL', category: 'commodities' },
  { brokerSymbol: 'USOIL', providerSymbol: 'USOIL', category: 'commodities' },
  // Indices
  { brokerSymbol: 'SPX500', providerSymbol: 'SPX', category: 'indices' },
  { brokerSymbol: 'NAS100', providerSymbol: 'NAS100', category: 'indices' },
  { brokerSymbol: 'DJI30', providerSymbol: 'DJI', category: 'indices' },
  { brokerSymbol: 'DAX40', providerSymbol: 'DAX', category: 'indices' },
  // Stocks (US)
  { brokerSymbol: 'AAPL', providerSymbol: 'AAPL', category: 'stocks' },
  { brokerSymbol: 'MSFT', providerSymbol: 'MSFT', category: 'stocks' },
  { brokerSymbol: 'AMZN', providerSymbol: 'AMZN', category: 'stocks' },
  { brokerSymbol: 'TSLA', providerSymbol: 'TSLA', category: 'stocks' },
  { brokerSymbol: 'NVDA', providerSymbol: 'NVDA', category: 'stocks' },
  { brokerSymbol: 'GOOGL', providerSymbol: 'GOOGL', category: 'stocks' },
  { brokerSymbol: 'META', providerSymbol: 'META', category: 'stocks' },
  { brokerSymbol: 'NFLX', providerSymbol: 'NFLX', category: 'stocks' },
  { brokerSymbol: 'AMD', providerSymbol: 'AMD', category: 'stocks' },
]

const fallbackSeed: Record<string, number> = {
  // forex
  EURUSD: 1.102,
  GBPUSD: 1.279,
  USDJPY: 151.3,
  AUDUSD: 0.665,
  EURNOK: 11.25,
  USDQAR: 3.64,
  USDMXN: 17.0,
  // crypto
  BTCUSD: 68250,
  ETHUSD: 3450,
  SOLUSD: 110,
  XRPUSD: 0.62,
  // commodities
  XAUUSD: 2375,
  XAGUSD: 28.4,
  UKOIL: 79.2,
  USOIL: 76.5,
  // indices
  SPX500: 5450,
  NAS100: 18750,
  DJI30: 39850,
  DAX40: 18800,
  // stocks
  AAPL: 225,
  MSFT: 465,
  AMZN: 195,
  TSLA: 240,
  NVDA: 495,
  GOOGL: 145,
  META: 485,
  NFLX: 620,
  AMD: 165,
}

const FALLBACK_SYMBOLS: MarketSymbol[] = SYMBOL_CONFIG.map((config) => {
  const base = fallbackSeed[config.brokerSymbol] ?? 1.05
  const spread = base > 1000 ? base * 0.0002 : base > 10 ? 0.02 : 0.0002
  return {
    symbol: config.brokerSymbol,
    price: base,
    bid: base - spread / 2,
    ask: base + spread / 2,
    spread,
    changePercent: 0,
  }
})

const REFRESH_INTERVAL_MS = 15_000

class PriceFeedService extends EventEmitter {
  private cache = new Map<string, MarketSymbol>()
  private candlesCache = new Map<string, Candle[]>()
  private timer?: NodeJS.Timeout
  private provider: ProviderName = env.MARKET_API_PROVIDER
  private apiKey = env.MARKET_API_KEY

  constructor() {
    super()
  }

  async start() {
    await this.refreshAll()
    this.timer = setInterval(() => this.refreshAll(), REFRESH_INTERVAL_MS)
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
    }
  }

  getSnapshot(): MarketSymbol[] {
    if (this.cache.size === 0) {
      return FALLBACK_SYMBOLS
    }
    return Array.from(this.cache.values())
  }

  getDataSourceMode(): 'live' | 'simulated' {
    return this.apiKey ? 'live' : 'simulated'
  }

  getSymbolCatalog() {
    return SYMBOL_CONFIG.map((config) => ({
      symbol: config.brokerSymbol,
      category: config.category,
      providerSymbol: config.providerSymbol,
      tradable: true,
    }))
  }

  isTradableSymbol(symbol: string) {
    return SYMBOL_CONFIG.some((config) => config.brokerSymbol === symbol)
  }

  getSymbolCategory(symbol: string): SymbolConfig['category'] | null {
    return SYMBOL_CONFIG.find((config) => config.brokerSymbol === symbol)?.category ?? null
  }

  async getCandles(symbol: string): Promise<Candle[]> {
    if (!this.apiKey) {
      return this.generateFallbackCandles(symbol)
    }

    try {
      if (this.provider === 'twelvedata') {
        return await this.fetchTwelveDataCandles(symbol)
      }
      return await this.fetchAlphaVantageCandles(symbol)
    } catch (error) {
      console.error('Failed to load candles', error)
      return this.generateFallbackCandles(symbol)
    }
  }

  private async refreshAll() {
    const updates = await Promise.all(
      SYMBOL_CONFIG.map(async (config) => {
        const marketSymbol = await this.fetchSymbol(config)
        if (marketSymbol) {
          this.cache.set(config.brokerSymbol, marketSymbol)
          return marketSymbol
        }
        // fallback with gentle random drift to simulate ticks
        const prev = this.cache.get(config.brokerSymbol) ?? FALLBACK_SYMBOLS.find((s) => s.symbol === config.brokerSymbol)
        if (!prev) return null
        const drift = this.randomDrift(prev.price, config.category)
        const bid = drift - prev.spread / 2
        const ask = drift + prev.spread / 2
        const updated: MarketSymbol = {
          ...prev,
          price: drift,
          bid,
          ask,
          changePercent: ((drift - (fallbackSeed[config.brokerSymbol] ?? prev.price)) / (fallbackSeed[config.brokerSymbol] ?? prev.price)) * 100,
        }
        this.cache.set(config.brokerSymbol, updated)
        return updated
      })
    )

    const snapshot = updates.filter(Boolean) as MarketSymbol[]
    if (snapshot.length === 0) {
      snapshot.push(...FALLBACK_SYMBOLS)
    }

    this.emit('price:update', snapshot)
  }

  private randomDrift(price: number, category: SymbolConfig['category']) {
    const baseVol =
      category === 'crypto'
        ? price * 0.0015
        : category === 'stocks'
          ? price * 0.0006
          : category === 'indices'
            ? price * 0.0004
            : category === 'commodities'
              ? price * 0.0008
              : price * 0.0003
    const move = (Math.random() - 0.5) * baseVol
    const next = price + move
    return Math.max(next, price * 0.98) // keep it sane
  }

  private async fetchSymbol(config: SymbolConfig): Promise<MarketSymbol | null> {
    if (!this.apiKey) {
      return null
    }

    try {
      if (this.provider === 'twelvedata') {
        const url = new URL('https://api.twelvedata.com/quote')
        url.searchParams.set('symbol', config.providerSymbol)
        url.searchParams.set('apikey', this.apiKey)
        const response = await fetch(url)
        const data = (await response.json()) as any
        if (data?.status === 'error') throw new Error(data.message)
        return {
          symbol: config.brokerSymbol,
          price: Number(data.close),
          bid: Number(data.bid ?? data.close),
          ask: Number(data.ask ?? data.close),
          spread: Math.abs(Number(data.ask ?? data.close) - Number(data.bid ?? data.close)),
          changePercent: Number(data.percent_change ?? 0),
        }
      }

      if (this.provider === 'alphaVantage' && config.alphaParams) {
        const url = new URL('https://www.alphavantage.co/query')
        url.searchParams.set('function', 'CURRENCY_EXCHANGE_RATE')
        url.searchParams.set('from_currency', config.alphaParams.from)
        url.searchParams.set('to_currency', config.alphaParams.to)
        url.searchParams.set('apikey', this.apiKey)
        const response = await fetch(url)
        const data = (await response.json()) as any
        const payload = data['Realtime Currency Exchange Rate']
        if (!payload) throw new Error('Missing payload')
        const price = Number(payload['5. Exchange Rate'])
        const bid = Number(payload['8. Bid Price'] ?? price)
        const ask = Number(payload['9. Ask Price'] ?? price)
        return {
          symbol: config.brokerSymbol,
          price,
          bid,
          ask,
          spread: Math.abs(ask - bid),
          changePercent: Number(payload['10. Change Percent']?.replace('%', '')) || 0,
        }
      }

      return null
    } catch (error) {
      console.error(`[price-feed] Failed to fetch ${config.brokerSymbol}`, error)
      return null
    }
  }

  private async fetchTwelveDataCandles(symbol: string): Promise<Candle[]> {
    const config = SYMBOL_CONFIG.find((s) => s.brokerSymbol === symbol)
    if (!config) return this.generateFallbackCandles(symbol)
    const url = new URL('https://api.twelvedata.com/time_series')
    url.searchParams.set('symbol', config.providerSymbol)
    url.searchParams.set('interval', '1min')
    url.searchParams.set('outputsize', '120')
    url.searchParams.set('apikey', this.apiKey!)
    const response = await fetch(url)
    const data = (await response.json()) as any
    if (!data?.values) {
      throw new Error('Missing candle data')
    }
    return data.values
      .map((value: any) => ({
        time: Date.parse(value.datetime),
        open: Number(value.open),
        high: Number(value.high),
        low: Number(value.low),
        close: Number(value.close),
      }))
      .reverse()
  }

  private async fetchAlphaVantageCandles(symbol: string): Promise<Candle[]> {
    const config = SYMBOL_CONFIG.find((s) => s.brokerSymbol === symbol)
    if (!config?.alphaParams) return this.generateFallbackCandles(symbol)
    const url = new URL('https://www.alphavantage.co/query')
    url.searchParams.set('function', 'FX_INTRADAY')
    url.searchParams.set('from_symbol', config.alphaParams.from)
    url.searchParams.set('to_symbol', config.alphaParams.to)
    url.searchParams.set('interval', '1min')
    url.searchParams.set('apikey', this.apiKey!)
    const response = await fetch(url)
    const data = (await response.json()) as any
    const series = data['Time Series FX (1min)']
    if (!series) throw new Error('Missing candle data')
    return Object.entries(series)
      .map(([time, value]: [string, any]) => ({
        time: Date.parse(time),
        open: Number(value['1. open']),
        high: Number(value['2. high']),
        low: Number(value['3. low']),
        close: Number(value['4. close']),
      }))
      .sort((a, b) => a.time - b.time)
  }

  private generateFallbackCandles(symbol: string): Candle[] {
    const base = this.cache.get(symbol)?.price ?? 1.05
    const candles: Candle[] = []
    for (let i = 120; i >= 0; i -= 1) {
      const time = Date.now() - i * 60 * 1000
      const open = base + (Math.random() - 0.5) * 0.004
      const close = open + (Math.random() - 0.5) * 0.004
      const high = Math.max(open, close) + Math.random() * 0.002
      const low = Math.min(open, close) - Math.random() * 0.002
      candles.push({ time, open, high, low, close })
    }
    return candles
  }

  applyManualAdjustment(symbol: string, updater: (snapshot: MarketSymbol) => MarketSymbol) {
    const current = this.cache.get(symbol) ?? FALLBACK_SYMBOLS.find((s) => s.symbol === symbol)
    if (!current) return
    const updated = updater(current)
    this.cache.set(symbol, updated)
    this.emit('price:update', this.getSnapshot())
  }
}

export const priceFeedService = new PriceFeedService()
export type CandleData = Candle

