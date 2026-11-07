export type MarketQuote = {
  symbol: string
  price: number
  bid: number
  ask: number
  spread: number
  changePercent: number
  category: 'forex' | 'crypto' | 'stocks' | 'commodities' | 'indices'
}

const SEED: Record<string, { price: number; category: MarketQuote['category'] }> = {
  EURUSD: { price: 1.102, category: 'forex' },
  GBPUSD: { price: 1.279, category: 'forex' },
  USDJPY: { price: 151.3, category: 'forex' },
  AUDUSD: { price: 0.665, category: 'forex' },
  EURNOK: { price: 11.25, category: 'forex' },
  USDQAR: { price: 3.64, category: 'forex' },
  USDMXN: { price: 17.0, category: 'forex' },
  BTCUSD: { price: 68250, category: 'crypto' },
  ETHUSD: { price: 3450, category: 'crypto' },
  SOLUSD: { price: 110, category: 'crypto' },
  XRPUSD: { price: 0.62, category: 'crypto' },
  XAUUSD: { price: 2375, category: 'commodities' },
  XAGUSD: { price: 28.4, category: 'commodities' },
  UKOIL: { price: 79.2, category: 'commodities' },
  USOIL: { price: 76.5, category: 'commodities' },
  SPX500: { price: 5450, category: 'indices' },
  NAS100: { price: 18750, category: 'indices' },
  DJI30: { price: 39850, category: 'indices' },
  DAX40: { price: 18800, category: 'indices' },
  AAPL: { price: 225, category: 'stocks' },
  MSFT: { price: 465, category: 'stocks' },
  AMZN: { price: 195, category: 'stocks' },
  TSLA: { price: 240, category: 'stocks' },
  NVDA: { price: 495, category: 'stocks' },
  GOOGL: { price: 145, category: 'stocks' },
  META: { price: 485, category: 'stocks' },
  NFLX: { price: 620, category: 'stocks' },
  AMD: { price: 165, category: 'stocks' },
}

const liveCache = new Map<string, number>()
let lastFetch = 0
let fetchPromise: Promise<void> | null = null

function spreadFor(price: number) {
  if (price > 1000) return price * 0.0002
  if (price > 10) return 0.02
  return 0.0002
}

function toQuote(symbol: string, price: number, category: MarketQuote['category']): MarketQuote {
  const spread = spreadFor(price)
  const seed = SEED[symbol]?.price ?? price
  const changePercent = seed ? ((price - seed) / seed) * 100 : 0
  return {
    symbol,
    price,
    bid: price - spread / 2,
    ask: price + spread / 2,
    spread,
    changePercent,
    category,
  }
}

async function refreshLivePrices() {
  const now = Date.now()
  if (now - lastFetch < 20_000) return
  if (fetchPromise) return fetchPromise

  fetchPromise = (async () => {
    try {
      // Free forex rates (no API key)
      const fx = await fetch('https://api.frankfurter.app/latest?from=USD', {
        next: { revalidate: 30 },
      }).then((r) => (r.ok ? r.json() : null))
      if (fx?.rates) {
        const eur = fx.rates.EUR
        const gbp = fx.rates.GBP
        const jpy = fx.rates.JPY
        const aud = fx.rates.AUD
        const mxn = fx.rates.MXN
        const nok = fx.rates.NOK
        if (eur) liveCache.set('EURUSD', 1 / eur)
        if (gbp) liveCache.set('GBPUSD', 1 / gbp)
        if (jpy) liveCache.set('USDJPY', jpy)
        if (aud) liveCache.set('AUDUSD', 1 / aud)
        if (mxn) liveCache.set('USDMXN', mxn)
        if (nok && eur) liveCache.set('EURNOK', nok / eur)
      }
    } catch {
      // keep seeds
    }

    try {
      // Free crypto (no API key)
      const crypto = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple&vs_currencies=usd',
        { next: { revalidate: 30 } }
      ).then((r) => (r.ok ? r.json() : null))
      if (crypto?.bitcoin?.usd) liveCache.set('BTCUSD', crypto.bitcoin.usd)
      if (crypto?.ethereum?.usd) liveCache.set('ETHUSD', crypto.ethereum.usd)
      if (crypto?.solana?.usd) liveCache.set('SOLUSD', crypto.solana.usd)
      if (crypto?.ripple?.usd) liveCache.set('XRPUSD', crypto.ripple.usd)
    } catch {
      // keep seeds
    }

    lastFetch = Date.now()
  })().finally(() => {
    fetchPromise = null
  })

  return fetchPromise
}

function drifted(seed: number) {
  // Mild random walk so charts/ticks feel alive between live refreshes
  const pct = (Math.sin(Date.now() / 15000 + seed) + Math.random() * 0.4 - 0.2) * 0.0008
  return seed * (1 + pct)
}

export async function getMarketSnapshot(): Promise<MarketQuote[]> {
  await refreshLivePrices()
  return Object.entries(SEED).map(([symbol, cfg]) => {
    const live = liveCache.get(symbol)
    const price = live ?? drifted(cfg.price)
    return toQuote(symbol, price, cfg.category)
  })
}

export async function getSymbolQuote(symbol: string): Promise<MarketQuote | null> {
  const snap = await getMarketSnapshot()
  return snap.find((s) => s.symbol === symbol.toUpperCase()) ?? null
}

export function isTradableSymbol(symbol: string) {
  return Boolean(SEED[symbol.toUpperCase()])
}

export function generateCandles(symbol: string, bars = 120) {
  const seed = liveCache.get(symbol) ?? SEED[symbol]?.price ?? 1.1
  const candles = []
  let price = seed * 0.995
  const now = Math.floor(Date.now() / 1000)
  for (let i = bars; i >= 0; i--) {
    const drift = (Math.random() - 0.48) * seed * 0.0015
    const open = price
    const close = Math.max(seed * 0.5, open + drift)
    const high = Math.max(open, close) * (1 + Math.random() * 0.0008)
    const low = Math.min(open, close) * (1 - Math.random() * 0.0008)
    candles.push({ time: now - i * 60, open, high, low, close })
    price = close
  }
  return candles
}
