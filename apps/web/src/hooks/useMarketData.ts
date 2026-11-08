'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { io, Socket } from 'socket.io-client'
import { apiClient } from '@/lib/api-client'
import { getWsBaseUrl } from '@/lib/public-env'
import { useAuthStore } from '@/stores/auth-store'

const categoryFor = (symbol: string): MarketSymbol['category'] => {
  const forex = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'EURNOK', 'USDQAR', 'USDMXN']
  const crypto = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD']
  const commodities = ['XAUUSD', 'XAGUSD', 'UKOIL', 'USOIL']
  const indices = ['SPX500', 'NAS100', 'DJI30', 'DAX40']
  if (forex.includes(symbol)) return 'forex'
  if (crypto.includes(symbol)) return 'crypto'
  if (commodities.includes(symbol)) return 'commodities'
  if (indices.includes(symbol)) return 'indices'
  return 'stocks'
}

const withMeta = (
  row: Omit<MarketSymbol, 'category' | 'dataSource' | 'tradable' | 'marketStatus' | 'feedStatus'>
): MarketSymbol => ({
  ...row,
  category: categoryFor(row.symbol),
  dataSource: 'delayed',
  feedStatus: 'delayed',
  // Fallback quotes are still executable so open/close never hard-locks the desk
  tradable: Number(row.bid) > 0 && Number(row.ask) > 0,
  marketStatus: 'open',
})

const fallbackSymbols: MarketSymbol[] = [
  // Forex
  withMeta({ symbol: 'EURUSD', price: 1.1023, bid: 1.1022, ask: 1.1024, spread: 0.0002, changePercent: 0.12 }),
  withMeta({ symbol: 'GBPUSD', price: 1.2791, bid: 1.2790, ask: 1.2792, spread: 0.0002, changePercent: -0.05 }),
  withMeta({ symbol: 'USDJPY', price: 151.34, bid: 151.33, ask: 151.35, spread: 0.02, changePercent: 0.08 }),
  withMeta({ symbol: 'AUDUSD', price: 0.665, bid: 0.6649, ask: 0.6651, spread: 0.0002, changePercent: 0.15 }),
  withMeta({ symbol: 'EURNOK', price: 11.25, bid: 11.248, ask: 11.252, spread: 0.004, changePercent: 0.18 }),
  withMeta({ symbol: 'USDQAR', price: 3.64, bid: 3.639, ask: 3.641, spread: 0.002, changePercent: 0.05 }),
  withMeta({ symbol: 'USDMXN', price: 17.0, bid: 16.99, ask: 17.01, spread: 0.02, changePercent: 0.12 }),
  withMeta({ symbol: 'BTCUSD', price: 68250, bid: 68240, ask: 68260, spread: 20, changePercent: 1.2 }),
  withMeta({ symbol: 'ETHUSD', price: 3450, bid: 3445, ask: 3455, spread: 10, changePercent: 0.8 }),
  withMeta({ symbol: 'SOLUSD', price: 110, bid: 109.95, ask: 110.05, spread: 0.1, changePercent: 2.5 }),
  withMeta({ symbol: 'XRPUSD', price: 0.62, bid: 0.6198, ask: 0.6202, spread: 0.0004, changePercent: 0.65 }),
  withMeta({ symbol: 'XAUUSD', price: 2375.50, bid: 2375.25, ask: 2375.75, spread: 0.5, changePercent: 0.25 }),
  withMeta({ symbol: 'XAGUSD', price: 28.40, bid: 28.38, ask: 28.42, spread: 0.04, changePercent: 0.35 }),
  withMeta({ symbol: 'UKOIL', price: 79.20, bid: 79.18, ask: 79.22, spread: 0.04, changePercent: -0.20 }),
  withMeta({ symbol: 'USOIL', price: 76.50, bid: 76.48, ask: 76.52, spread: 0.04, changePercent: -0.15 }),
  withMeta({ symbol: 'SPX500', price: 5450, bid: 5448, ask: 5452, spread: 4, changePercent: 0.35 }),
  withMeta({ symbol: 'NAS100', price: 18750, bid: 18745, ask: 18755, spread: 10, changePercent: 0.42 }),
  withMeta({ symbol: 'DJI30', price: 39850, bid: 39840, ask: 39860, spread: 20, changePercent: 0.28 }),
  withMeta({ symbol: 'DAX40', price: 18800, bid: 18795, ask: 18805, spread: 10, changePercent: 0.38 }),
  withMeta({ symbol: 'AAPL', price: 225.50, bid: 225.45, ask: 225.55, spread: 0.1, changePercent: 0.55 }),
  withMeta({ symbol: 'MSFT', price: 465.20, bid: 465.15, ask: 465.25, spread: 0.1, changePercent: 0.32 }),
  withMeta({ symbol: 'AMZN', price: 195.80, bid: 195.75, ask: 195.85, spread: 0.1, changePercent: 0.18 }),
  withMeta({ symbol: 'TSLA', price: 240.30, bid: 240.25, ask: 240.35, spread: 0.1, changePercent: -0.25 }),
  withMeta({ symbol: 'NVDA', price: 495.75, bid: 495.70, ask: 495.80, spread: 0.1, changePercent: 1.15 }),
  withMeta({ symbol: 'GOOGL', price: 145.60, bid: 145.55, ask: 145.65, spread: 0.1, changePercent: 0.48 }),
  withMeta({ symbol: 'META', price: 485.20, bid: 485.15, ask: 485.25, spread: 0.1, changePercent: 0.65 }),
  withMeta({ symbol: 'NFLX', price: 620, bid: 619.95, ask: 620.05, spread: 0.1, changePercent: 0.85 }),
  withMeta({ symbol: 'AMD', price: 165, bid: 164.95, ask: 165.05, spread: 0.1, changePercent: 1.25 }),
]

// Base prices for all symbols (matching backend fallbackSeed)
const symbolBasePrices: Record<string, number> = {
  // Forex
  EURUSD: 1.102,
  GBPUSD: 1.279,
  USDJPY: 151.3,
  AUDUSD: 0.665,
  EURNOK: 11.25,
  USDQAR: 3.64,
  USDMXN: 17.0,
  // Crypto
  BTCUSD: 68250,
  ETHUSD: 3450,
  SOLUSD: 110,
  XRPUSD: 0.62,
  // Commodities
  XAUUSD: 2375,
  XAGUSD: 28.4,
  UKOIL: 79.2,
  USOIL: 76.5,
  // Indices
  SPX500: 5450,
  NAS100: 18750,
  DJI30: 39850,
  DAX40: 18800,
  // Stocks
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

const generateFallbackCandles = (basePrice: number = 1.1): Candle[] => {
  const candles: Candle[] = []
  const now = Date.now()
  let price = basePrice
  
  for (let i = 200; i >= 0; i--) {
    const time = now - i * 60 * 1000 // 1 minute intervals going back
    const volatility = basePrice > 1000 ? 0.002 : basePrice > 10 ? 0.001 : 0.0001
    const drift = (Math.random() - 0.48) * volatility
    price += drift
    
    const open = price
    const change = (Math.random() - 0.5) * volatility * 2
    const close = open + change
    const high = Math.max(open, close) + Math.abs(Math.random() * volatility * 0.5)
    const low = Math.min(open, close) - Math.abs(Math.random() * volatility * 0.5)
    
    candles.push({ time, open, high, low, close })
    price = close
  }
  return candles
}

const fallbackCandles = generateFallbackCandles()

export type MarketSymbol = {
  symbol: string
  price: number
  bid: number
  ask: number
  spread: number
  changePercent: number
  category: 'forex' | 'crypto' | 'stocks' | 'commodities' | 'indices'
  dataSource: 'live' | 'delayed' | 'unavailable'
  feedStatus?: 'live' | 'delayed' | 'closed' | 'unavailable'
  tradable: boolean
  marketStatus: 'open' | 'closed' | 'unavailable'
  stale?: boolean
  quoteAgeSeconds?: number | null
  updatedAt?: string | null
  providerSymbol?: string
  source?: string
}

export type MarginAlert =
  | { level: 'ok' }
  | { level: 'margin_call'; marginLevel: number; threshold: number; message: string }
  | { level: 'stop_out'; marginLevel: number; threshold: number; message: string }

export type AccountSummary = {
  id?: string
  fullName?: string
  email?: string
  balance: number
  credit: number
  equity: number
  freeMargin: number
  margin: number
  /** null when no used margin — show N/A */
  marginLevel: number | null
  leverage?: number
  profit?: number // net floating P/L
  floatingProfit?: number
  floatingLoss?: number
  netFloatingPl?: number
  marginCallLevel?: number
  stopOutLevel?: number
  marginAlert?: MarginAlert
}

function normalizeAccountSummary(raw: unknown): AccountSummary | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const margin = Number(o.margin ?? 0)
  const rawLevel = o.marginLevel
  const marginLevel =
    margin <= 0 || rawLevel == null || rawLevel === ''
      ? null
      : Number(rawLevel)
  return {
    id: o.id as string | undefined,
    fullName: o.fullName as string | undefined,
    email: o.email as string | undefined,
    balance: Number(o.balance ?? 0),
    credit: Number(o.credit ?? 0),
    equity: Number(o.equity ?? 0),
    freeMargin: Number(o.freeMargin ?? 0),
    margin,
    marginLevel: marginLevel != null && Number.isFinite(marginLevel) ? marginLevel : null,
    leverage: o.leverage != null ? Number(o.leverage) : undefined,
    profit: o.profit != null ? Number(o.profit) : Number(o.netFloatingPl ?? 0),
    floatingProfit: o.floatingProfit != null ? Number(o.floatingProfit) : undefined,
    floatingLoss: o.floatingLoss != null ? Number(o.floatingLoss) : undefined,
    netFloatingPl: o.netFloatingPl != null ? Number(o.netFloatingPl) : undefined,
    marginCallLevel: o.marginCallLevel != null ? Number(o.marginCallLevel) : undefined,
    stopOutLevel: o.stopOutLevel != null ? Number(o.stopOutLevel) : undefined,
    marginAlert: (o.marginAlert as MarginAlert) || { level: 'ok' },
  }
}

const ACCOUNT_SUMMARY_CACHE = 'nexus-account-summary-v1'

export function readCachedAccountSummary(userId?: string | null): AccountSummary | undefined {
  if (typeof window === 'undefined' || !userId) return undefined
  try {
    const raw = localStorage.getItem(ACCOUNT_SUMMARY_CACHE)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { userId?: string; data?: unknown }
    if (parsed.userId && parsed.userId !== userId) return undefined
    return normalizeAccountSummary(parsed.data)
  } catch {
    return undefined
  }
}

export function writeCachedAccountSummary(userId: string, data: AccountSummary) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      ACCOUNT_SUMMARY_CACHE,
      JSON.stringify({ userId, data, at: Date.now() })
    )
  } catch {
    /* ignore quota */
  }
}

export function clearCachedAccountSummary() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(ACCOUNT_SUMMARY_CACHE)
  } catch {
    /* ignore */
  }
}

export type Candle = {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export const useMarketCatalog = () => {
  const { data } = useQuery({
    queryKey: ['market-catalog'],
    queryFn: async () => {
      const response = await apiClient.get<{
        data: {
          dataSource: 'live' | 'delayed' | 'unavailable'
          dataSourceNote: string
          provider?: string
          symbolsLive?: number
          symbolsTotal?: number
        }
      }>('/market/catalog')
      return response.data
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
  return data
}

function normalizeSymbol(s: MarketSymbol): MarketSymbol {
  const bid = Number(s.bid)
  const ask = Number(s.ask)
  const dataSource = (s.dataSource as MarketSymbol['dataSource']) || 'unavailable'
  return {
    ...s,
    changePercent: Number(s.changePercent),
    bid,
    ask,
    price: Number(s.price) || (bid && ask ? (bid + ask) / 2 : 0),
    spread: Number(s.spread ?? (ask && bid ? ask - bid : 0)),
    category: s.category || categoryFor(s.symbol),
    dataSource,
    feedStatus: s.feedStatus || (dataSource === 'live' ? 'live' : dataSource === 'delayed' ? 'delayed' : 'unavailable'),
    tradable: Boolean(s.tradable),
    marketStatus: s.marketStatus || 'unavailable',
  }
}

export const useMarketSymbols = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['market-symbols'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: MarketSymbol[] }>('/market/symbols')
      return response.data.map(normalizeSymbol)
    },
    refetchInterval: 5_000,
  })

  return {
    symbols: data ?? fallbackSymbols,
    isLoading,
    error,
  }
}

export const useCandles = (symbol: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['candles', symbol],
    queryFn: async () => {
      try {
        const response = await apiClient.get<{ data: Candle[] }>(`/market/candles?symbol=${symbol}`)
        return response.data
      } catch (err) {
        console.warn('Failed to fetch candles, using fallback:', err)
        // Generate fallback based on symbol's base price
        const basePrice = symbolBasePrices[symbol] ?? 1.1
        return generateFallbackCandles(basePrice)
      }
    },
    refetchInterval: 60_000,
    enabled: Boolean(symbol),
    retry: false,
  })

  const basePrice = symbol ? (symbolBasePrices[symbol] ?? 1.1) : 1.1
  const candles = data ?? (symbol ? generateFallbackCandles(basePrice) : fallbackCandles)
  
  return { candles, isLoading }
}

export const useOpenPositions = () => {
  const token = useAuthStore((state) => state.accessToken)
  const socket = useSharedSocket()
  const queryClient = useQueryClient()
  
  const { data, refetch } = useQuery({
    queryKey: ['positions-open'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: any[] }>('/account/positions/open', token ?? undefined)
      return response.data
    },
    enabled: !!token,
    // Live P/L comes from SignalR ticks; poll only to sync open/closed set
    refetchInterval: 8_000,
  })

  // Listen for position updates from socket
  useEffect(() => {
    if (!socket || !token) return
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['positions-open'] })
      refetch()
    }
    socket.on('position:update', handler)
    socket.on('orders:new', handler)
    return () => {
      socket.off('position:update', handler)
      socket.off('orders:new', handler)
    }
  }, [socket, token, queryClient, refetch])

  return { positions: data ?? [], refetch }
}

export type ClosedTrade = {
  id: string
  symbol: string
  side: 'BUY' | 'SELL'
  lotSize: number
  openPrice: number
  closePrice: number
  profit: number
  swap?: number
  commission?: number
  openedAt: string
  closedAt: string
}

export const useClosedPositions = () => {
  const token = useAuthStore((state) => state.accessToken)
  const { data, refetch, isLoading, isFetching } = useQuery({
    queryKey: ['positions-closed'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: ClosedTrade[] }>(
        '/account/positions/closed',
        token ?? undefined
      )
      return response.data ?? []
    },
    enabled: !!token,
    staleTime: 5_000,
    refetchOnMount: 'always',
  })

  return { trades: data ?? [], refetch, isLoading, isFetching }
}

let sharedSocket: Socket | null = null

export const useSharedSocket = () => {
  const token = useAuthStore((state) => state.accessToken)
  const [socket, setSocket] = useState<Socket | null>(sharedSocket)

  useEffect(() => {
    const url = getWsBaseUrl()
    if (!url) {
      setSocket(null)
      return
    }
    if (!sharedSocket) {
      sharedSocket = io(url)
    }
    const instance = sharedSocket
    if (token) {
      instance.emit('auth:join', token)
    }
    setSocket(instance)
    return () => {}
  }, [token])

  return socket
}

export const usePriceSocket = () => {
  const socket = useSharedSocket()
  const [snapshot, setSnapshot] = useState<MarketSymbol[]>([])

  useEffect(() => {
    if (!socket) return
    const handler = (payload: MarketSymbol[]) => setSnapshot(payload)
    socket.on('price:update', handler)
    return () => {
      socket.off('price:update', handler)
    }
  }, [socket])

  return { socket, snapshot }
}

export const useSymbolsWithSocket = () => {
  const { symbols } = useMarketSymbols()
  const { snapshot } = usePriceSocket()
  const merged = useMemo(() => {
    const map = new Map(symbols.map((s) => [s.symbol, s]))
    snapshot.forEach((s) => {
      const prev = map.get(s.symbol)
      map.set(s.symbol, normalizeSymbol({ ...(prev || fallbackSymbols[0]), ...s, symbol: s.symbol }))
    })
    return Array.from(map.values())
  }, [symbols, snapshot])

  return merged.length > 0 ? merged : fallbackSymbols
}

export const useAccountSummary = () => {
  const token = useAuthStore((state) => state.accessToken)
  const userId = useAuthStore((state) => state.user?.userId)
  const socket = useSharedSocket()
  const queryClient = useQueryClient()
  const cached = useMemo(() => readCachedAccountSummary(userId), [userId])

  useEffect(() => {
    if (!socket) return
    const handler = (account: unknown) => {
      const normalized = normalizeAccountSummary(account)
      if (normalized) {
        queryClient.setQueryData(['account-summary'], normalized)
        if (userId) writeCachedAccountSummary(userId, normalized)
      }
    }
    socket.on('account:update', handler)
    return () => {
      socket.off('account:update', handler)
    }
  }, [socket, queryClient, userId])

  // Instant DB snapshot — shows balance/equity immediately (no market HTTP)
  const { data } = useQuery({
    queryKey: ['account-summary'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: unknown }>('/account/summary', token ?? undefined)
      const normalized = normalizeAccountSummary(response.data)
      if (normalized && userId) writeCachedAccountSummary(userId, normalized)
      return normalized
    },
    enabled: !!token,
    placeholderData: cached,
    staleTime: 1_000,
    refetchInterval: 2_000,
    refetchOnMount: 'always',
  })

  // Slower live mark-to-market for floating P/L / stop-out (does not block first paint)
  useQuery({
    queryKey: ['account-summary-mark'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: unknown }>(
        '/account/summary?mark=1',
        token ?? undefined
      )
      const normalized = normalizeAccountSummary(response.data)
      if (normalized) {
        queryClient.setQueryData(['account-summary'], normalized)
        if (userId) writeCachedAccountSummary(userId, normalized)
      }
      return normalized
    },
    enabled: !!token,
    staleTime: 4_000,
    refetchInterval: 5_000,
  })

  return data ?? cached
}

export type AccountDashboard = {
  balance: number
  equity: number
  freeMargin: number
  margin: number
  marginLevel: number
  invested: number
  unrealizedPnl: number
  dailyRealizedPnl: number
  openPositionsCount: number
  recentDeposits: { id: string; amount: number; status: string; createdAt: string }[]
  recentWithdrawals: { id: string; amount: number; status: string; createdAt: string }[]
  favoriteSymbols: string[]
}

export const useAccountDashboard = () => {
  const token = useAuthStore((state) => state.accessToken)
  return useQuery({
    queryKey: ['account-dashboard'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: AccountDashboard }>(
        '/account/dashboard',
        token ?? undefined
      )
      return response.data
    },
    enabled: !!token,
    refetchInterval: 15_000,
  })
}

export const useTransactions = () => {
  const token = useAuthStore((state) => state.accessToken)
  return useQuery({
    queryKey: ['account-transactions'],
    queryFn: async () => {
      const response = await apiClient.get<{
        data: { id: string; type: string; amount: number; balanceAfter: number; note?: string; createdAt: string }[]
      }>('/account/transactions', token ?? undefined)
      return response.data
    },
    enabled: !!token,
  })
}

