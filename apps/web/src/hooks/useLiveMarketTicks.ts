'use client'

import { useEffect, useRef, useState } from 'react'
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr'
import { ALL_PROVIDER_SYMBOLS, toPlatformSymbol } from '@/lib/provider-symbols'
import type { MarketSymbol } from '@/hooks/useMarketData'

const HUB_URL = process.env.NEXT_PUBLIC_MARKET_WS_URL || 'https://biquote.io/hubs/tick'

type TickPayload = {
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
}

function tickToPartial(tick: TickPayload): Partial<MarketSymbol> & { symbol: string } | null {
  const provider = (tick.symbol || '').toUpperCase()
  if (!provider) return null
  const symbol = toPlatformSymbol(provider)
  const bid = Number(tick.bid || 0)
  const ask = Number(tick.ask || 0)
  if (!(bid > 0) || !(ask > 0)) return null
  const mid = Number(tick.mid || 0) || (bid + ask) / 2
  const state = (tick.marketState || '').toLowerCase()
  const closed = state === 'closed' || tick.stale === true
  const age = tick.quoteAgeSeconds ?? 0
  const live = !closed && age <= 30

  return {
    symbol,
    bid,
    ask,
    price: mid,
    spread: Number(tick.spread || ask - bid),
    changePercent: Number(tick.dayDiffPercent || 0),
    dataSource: live ? 'live' : 'delayed',
    feedStatus: closed ? 'closed' : live ? 'live' : 'delayed',
    marketStatus: closed ? 'closed' : 'open',
    tradable: !closed && age <= 120,
    stale: Boolean(tick.stale) || !live,
    quoteAgeSeconds: tick.quoteAgeSeconds ?? null,
    updatedAt: tick.lastQuoteAt || tick.timestamp || null,
  }
}

/**
 * Browser-side SignalR stream from biquote MT5 hub.
 * UI ticks update immediately; backend remains source of truth for P/L & balances.
 */
export function useLiveMarketTicks(enabled = true) {
  const [ticks, setTicks] = useState<Record<string, Partial<MarketSymbol>>>({})
  const [connected, setConnected] = useState(false)
  const connRef = useRef<HubConnection | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect([0, 1000, 2000, 5000, 10000])
      .configureLogging(LogLevel.Error)
      .build()

    connRef.current = connection

    connection.on('ReceiveTick', (tick: TickPayload) => {
      const partial = tickToPartial(tick)
      if (!partial) return
      setTicks((prev) => ({ ...prev, [partial.symbol]: partial }))
    })

    connection.onreconnected(async () => {
      if (cancelled) return
      setConnected(true)
      try {
        await connection.invoke('Subscribe', ALL_PROVIDER_SYMBOLS)
      } catch {
        /* ignore */
      }
    })
    connection.onreconnecting(() => setConnected(false))
    connection.onclose(() => setConnected(false))

    ;(async () => {
      try {
        await connection.start()
        if (cancelled) return
        setConnected(true)
        await connection.invoke('Subscribe', ALL_PROVIDER_SYMBOLS)
      } catch (err) {
        console.warn('[live-ticks] SignalR unavailable, falling back to REST polling', err)
        setConnected(false)
      }
    })()

    return () => {
      cancelled = true
      setConnected(false)
      if (connection.state !== HubConnectionState.Disconnected) {
        connection.stop().catch(() => undefined)
      }
      connRef.current = null
    }
  }, [enabled])

  return { ticks, connected }
}
