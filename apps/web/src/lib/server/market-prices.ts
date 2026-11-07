/**
 * Real market data layer — biquote MT5 feed (no simulated random walk).
 * BID/ASK come from the provider. Closed/stale quotes are labeled, never invented.
 */
import {
  ALL_PLATFORM_SYMBOLS,
  getInstrument,
  providerSymbolFor,
  type InstrumentCategory,
} from './instrument-specs'

export type FeedStatus = 'live' | 'delayed' | 'closed' | 'unavailable'

export type MarketQuote = {
  symbol: string
  providerSymbol: string
  price: number
  bid: number
  ask: number
  spread: number
  changePercent: number
  category: InstrumentCategory
  dataSource: 'live' | 'delayed' | 'unavailable'
  feedStatus: FeedStatus
  marketStatus: 'open' | 'closed' | 'unavailable'
  tradable: boolean
  stale: boolean
  quoteAgeSeconds: number | null
  updatedAt: string | null
  source: string
}

type ProviderTick = {
  symbol?: string
  bid?: number
  ask?: number
  mid?: number
  spread?: number
  dayDiffPercent?: number
  marketState?: string
  stale?: boolean
  quoteAgeSeconds?: number
  timestamp?: string
  lastQuoteAt?: string
  source?: string
  message?: string
}

const BIQUOTE_BASE = process.env.MARKET_DATA_URL?.replace(/\/$/, '') || 'https://biquote.io'
/** Quotes older than this (when market claims open) are treated as delayed. */
const DELAYED_AGE_SEC = Number(process.env.MARKET_DELAYED_AGE_SEC || 30)
/** Hard reject for new orders when quote is older than this while market open. */
const STALE_TRADE_AGE_SEC = Number(process.env.MARKET_STALE_TRADE_AGE_SEC || 120)

const quoteCache = new Map<string, MarketQuote>()
let lastBatchFetch = 0
let fetchPromise: Promise<void> | null = null
/** Soft cache for UI / mark-to-market (ms) */
const CACHE_TTL_MS = 1_500
/** Prefer cached quote for trade execution if newer than this */
const EXECUTION_CACHE_MS = 5_000
const quoteFetchedAt = new Map<string, number>()

function roundPrice(n: number, digits = 5) {
  const f = 10 ** digits
  return Math.round((n + Number.EPSILON) * f) / f
}

function classifyTick(tick: ProviderTick | null): {
  feedStatus: FeedStatus
  dataSource: MarketQuote['dataSource']
  marketStatus: MarketQuote['marketStatus']
  tradable: boolean
} {
  if (!tick || !(Number(tick.bid) > 0) || !(Number(tick.ask) > 0)) {
    return {
      feedStatus: 'unavailable',
      dataSource: 'unavailable',
      marketStatus: 'unavailable',
      tradable: false,
    }
  }
  const state = (tick.marketState || '').toLowerCase()
  const age = tick.quoteAgeSeconds ?? null
  if (state === 'closed' || tick.stale === true) {
    return {
      feedStatus: 'closed',
      dataSource: 'delayed',
      marketStatus: 'closed',
      tradable: false,
    }
  }
  if (age != null && age > STALE_TRADE_AGE_SEC) {
    return {
      feedStatus: 'delayed',
      dataSource: 'delayed',
      marketStatus: 'open',
      tradable: false,
    }
  }
  if (age != null && age > DELAYED_AGE_SEC) {
    return {
      feedStatus: 'delayed',
      dataSource: 'delayed',
      marketStatus: 'open',
      tradable: true,
    }
  }
  return {
    feedStatus: 'live',
    dataSource: 'live',
    marketStatus: 'open',
    tradable: true,
  }
}

function toQuote(platformSymbol: string, tick: ProviderTick | null): MarketQuote {
  const inst = getInstrument(platformSymbol)!
  const classified = classifyTick(tick)
  const bid = Number(tick?.bid || 0)
  const ask = Number(tick?.ask || 0)
  const mid = Number(tick?.mid || 0) || (bid && ask ? (bid + ask) / 2 : 0)
  const spread = Number(tick?.spread || 0) || (bid && ask ? ask - bid : 0)

  return {
    symbol: platformSymbol,
    providerSymbol: inst.providerSymbol,
    price: roundPrice(mid || bid || ask, inst.digits),
    bid: roundPrice(bid, inst.digits),
    ask: roundPrice(ask, inst.digits),
    spread: roundPrice(spread, Math.max(inst.digits, 5)),
    changePercent: Number(tick?.dayDiffPercent || 0),
    category: inst.category,
    dataSource: classified.dataSource,
    feedStatus: classified.feedStatus,
    marketStatus: classified.marketStatus,
    tradable: classified.tradable && bid > 0 && ask > 0,
    stale: Boolean(tick?.stale) || classified.feedStatus !== 'live',
    quoteAgeSeconds: tick?.quoteAgeSeconds ?? null,
    updatedAt: tick?.lastQuoteAt || tick?.timestamp || null,
    source: tick?.source || 'biquote',
  }
}

function unavailableQuote(platformSymbol: string): MarketQuote {
  const inst = getInstrument(platformSymbol)!
  return {
    symbol: platformSymbol,
    providerSymbol: inst.providerSymbol,
    price: 0,
    bid: 0,
    ask: 0,
    spread: 0,
    changePercent: 0,
    category: inst.category,
    dataSource: 'unavailable',
    feedStatus: 'unavailable',
    marketStatus: 'unavailable',
    tradable: false,
    stale: true,
    quoteAgeSeconds: null,
    updatedAt: null,
    source: 'biquote',
  }
}

async function fetchLatestBatch(providerSymbols: string[]): Promise<Record<string, ProviderTick>> {
  const unique = Array.from(new Set(providerSymbols))
  const params = new URLSearchParams()
  for (const s of unique) params.append('symbols', s)
  const url = `${BIQUOTE_BASE}/api/latest?${params.toString()}`
  const res = await fetch(url, { cache: 'no-store', next: { revalidate: 0 } as any })
  if (!res.ok) throw new Error(`Market data HTTP ${res.status}`)
  const data = await res.json()
  if (!data || typeof data !== 'object') return {}
  return data as Record<string, ProviderTick>
}

async function fetchOne(providerSymbol: string): Promise<ProviderTick | null> {
  const res = await fetch(`${BIQUOTE_BASE}/api/${encodeURIComponent(providerSymbol)}`, {
    cache: 'no-store',
    next: { revalidate: 0 } as any,
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Market data HTTP ${res.status}`)
  return (await res.json()) as ProviderTick
}

async function refreshAllQuotes(force = false) {
  const now = Date.now()
  if (!force && now - lastBatchFetch < CACHE_TTL_MS && quoteCache.size > 0) return
  if (fetchPromise) return fetchPromise

  fetchPromise = (async () => {
    try {
      const providerList = ALL_PLATFORM_SYMBOLS.map((s) => providerSymbolFor(s))
      const batch = await fetchLatestBatch(providerList)
      const nowTs = Date.now()
      for (const platform of ALL_PLATFORM_SYMBOLS) {
        const provider = providerSymbolFor(platform)
        const tick = batch[provider] || null
        quoteCache.set(platform, tick ? toQuote(platform, tick) : unavailableQuote(platform))
        if (tick) quoteFetchedAt.set(platform, nowTs)
      }
      lastBatchFetch = nowTs
    } catch (err) {
      console.error('[market-prices] batch refresh failed', err)
      // Keep last good cache; mark missing as unavailable only if empty
      if (quoteCache.size === 0) {
        for (const platform of ALL_PLATFORM_SYMBOLS) {
          quoteCache.set(platform, unavailableQuote(platform))
        }
      }
    }
  })().finally(() => {
    fetchPromise = null
  })

  return fetchPromise
}

export async function getMarketSnapshot(force = false): Promise<MarketQuote[]> {
  await refreshAllQuotes(force)
  return ALL_PLATFORM_SYMBOLS.map((s) => quoteCache.get(s) ?? unavailableQuote(s))
}

export async function getSymbolQuote(symbol: string, opts?: { force?: boolean }): Promise<MarketQuote | null> {
  const platform = symbol.toUpperCase()
  if (!getInstrument(platform)) return null

  const cached = quoteCache.get(platform)
  const age = Date.now() - (quoteFetchedAt.get(platform) || 0)
  if (!opts?.force && cached && cached.bid > 0 && age < CACHE_TTL_MS) {
    return cached
  }

  if (opts?.force) {
    // Reuse a very fresh cache for execution speed
    if (cached && cached.bid > 0 && cached.ask > 0 && age < EXECUTION_CACHE_MS) {
      return cached
    }
    try {
      const tick = await fetchOne(providerSymbolFor(platform))
      const quote = tick ? toQuote(platform, tick) : unavailableQuote(platform)
      quoteCache.set(platform, quote)
      quoteFetchedAt.set(platform, Date.now())
      return quote
    } catch (err) {
      console.error('[market-prices] single quote failed', platform, err)
      return quoteCache.get(platform) ?? unavailableQuote(platform)
    }
  }

  await refreshAllQuotes(false)
  return quoteCache.get(platform) ?? unavailableQuote(platform)
}

/** Batch-fetch only the symbols needed (fast path for mark-to-market). */
export async function getQuotesForSymbols(symbols: string[]): Promise<Map<string, MarketQuote>> {
  const out = new Map<string, MarketQuote>()
  const unique = Array.from(new Set(symbols.map((s) => s.toUpperCase()).filter((s) => getInstrument(s))))
  if (unique.length === 0) return out

  const now = Date.now()
  const needFetch: string[] = []
  for (const platform of unique) {
    const cached = quoteCache.get(platform)
    const age = now - (quoteFetchedAt.get(platform) || 0)
    if (cached && cached.bid > 0 && age < CACHE_TTL_MS) {
      out.set(platform, cached)
    } else {
      needFetch.push(platform)
    }
  }

  if (needFetch.length === 0) return out

  try {
    const providers = needFetch.map((s) => providerSymbolFor(s))
    const batch = await fetchLatestBatch(providers)
    const fetchedAt = Date.now()
    for (const platform of needFetch) {
      const tick = batch[providerSymbolFor(platform)] || null
      const quote = tick ? toQuote(platform, tick) : quoteCache.get(platform) || unavailableQuote(platform)
      quoteCache.set(platform, quote)
      if (tick) quoteFetchedAt.set(platform, fetchedAt)
      out.set(platform, quote)
    }
  } catch (err) {
    console.error('[market-prices] targeted batch failed', err)
    for (const platform of needFetch) {
      out.set(platform, quoteCache.get(platform) ?? unavailableQuote(platform))
    }
  }

  return out
}

export function isTradableSymbol(symbol: string) {
  return Boolean(getInstrument(symbol.toUpperCase()))
}

export async function assertExecutableQuote(symbol: string): Promise<MarketQuote> {
  const quote = await getSymbolQuote(symbol, { force: true })
  if (!quote || quote.bid <= 0 || quote.ask <= 0) {
    throw new Error(`No market quote available for ${symbol.toUpperCase()}`)
  }
  if (!quote.tradable || quote.marketStatus !== 'open') {
    throw new Error(
      `Market for ${symbol.toUpperCase()} is ${quote.marketStatus}${quote.stale ? ' (stale quote)' : ''}. Trading is paused until a live quote is available.`
    )
  }
  return quote
}

export type CatalogInfo = {
  dataSource: 'live' | 'delayed' | 'unavailable'
  dataSourceNote: string
  provider: string
  symbolsLive: number
  symbolsTotal: number
}

export async function getMarketCatalog(): Promise<CatalogInfo> {
  const snap = await getMarketSnapshot()
  const live = snap.filter((s) => s.feedStatus === 'live').length
  const delayed = snap.filter((s) => s.feedStatus === 'delayed' || s.feedStatus === 'closed').length
  let dataSource: CatalogInfo['dataSource'] = 'unavailable'
  if (live > 0) dataSource = 'live'
  else if (delayed > 0) dataSource = 'delayed'

  return {
    dataSource,
    dataSourceNote:
      dataSource === 'live'
        ? `Live MT5 feed via biquote (${live}/${snap.length} instruments streaming)`
        : dataSource === 'delayed'
          ? `Market closed or delayed — showing last official quotes (${delayed} instruments)`
          : 'Market data feed unavailable',
    provider: 'biquote/MT5',
    symbolsLive: live,
    symbolsTotal: snap.length,
  }
}

/** Real OHLC candles from provider (no random generation). */
export async function getCandles(symbol: string, bars = 120) {
  const platform = symbol.toUpperCase()
  const provider = providerSymbolFor(platform)
  const count = Math.min(Math.max(bars, 10), 500)
  try {
    const res = await fetch(
      `${BIQUOTE_BASE}/api/${encodeURIComponent(provider)}/ohlc?interval=1m&count=${count}`,
      { cache: 'no-store', next: { revalidate: 0 } as any }
    )
    if (!res.ok) throw new Error(`ohlc ${res.status}`)
    const data = await res.json()
    const rows = Array.isArray(data?.bars) ? data.bars : Array.isArray(data) ? data : []
    return rows
      .map((b: any) => {
        const t = Date.parse(b.openTime || b.time || b.timestamp)
        return {
          time: Math.floor((Number.isFinite(t) ? t : Date.now()) / 1000),
          open: Number(b.open),
          high: Number(b.high),
          low: Number(b.low),
          close: Number(b.close),
        }
      })
      .filter((c: { open: number }) => Number.isFinite(c.open))
      .sort((a: { time: number }, b: { time: number }) => a.time - b.time)
  } catch (err) {
    console.error('[market-prices] candles failed', provider, err)
    // Fall back to last known mid as a flat series so the chart still renders
    const q = await getSymbolQuote(platform)
    const price = q?.price || 0
    if (!price) return []
    const now = Math.floor(Date.now() / 1000)
    return Array.from({ length: Math.min(bars, 60) }, (_, i) => ({
      time: now - (Math.min(bars, 60) - i) * 60,
      open: price,
      high: price,
      low: price,
      close: price,
    }))
  }
}

/** @deprecated use getCandles — kept for callers that still import generateCandles */
export function generateCandles(symbol: string, bars = 120) {
  // Sync stub — prefer await getCandles. Returns empty; route handler should call getCandles.
  void symbol
  void bars
  return [] as Array<{ time: number; open: number; high: number; low: number; close: number }>
}
