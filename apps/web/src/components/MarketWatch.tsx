'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Search, Star } from 'lucide-react'
import type { MarketSymbol } from '@/hooks/useMarketData'
import { useAuthStore } from '@/stores/auth-store'
import { apiClient } from '@/lib/api-client'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface MarketWatchProps {
  symbols: MarketSymbol[]
  selectedSymbol: MarketSymbol | null
  onSelectSymbol: (symbol: MarketSymbol) => void
  dataSource?: 'live' | 'delayed' | 'unavailable' | 'simulated'
  embedded?: boolean
}

const CATEGORY_GROUPS: { id: MarketSymbol['category'] | 'popular'; label: string }[] = [
  { id: 'popular', label: 'POPULAR' },
  { id: 'forex', label: 'FX' },
  { id: 'crypto', label: 'CRYPTO' },
  { id: 'commodities', label: 'COMMODITIES' },
  { id: 'indices', label: 'INDICES' },
  { id: 'stocks', label: 'STOCKS' },
]

const POPULAR = ['EURUSD', 'GBPUSD', 'XAUUSD', 'BTCUSD', 'USDJPY', 'NAS100', 'AAPL']

export default function MarketWatch({
  symbols,
  selectedSymbol,
  onSelectSymbol,
  dataSource = 'delayed',
  embedded = false,
}: MarketWatchProps) {
  const [tab, setTab] = useState<'favorites' | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    popular: true,
    forex: true,
    crypto: false,
    commodities: false,
    indices: false,
    stocks: false,
  })
  const { accessToken } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: string[] }>('/account/favorites', accessToken ?? undefined)
      return res.data
    },
    enabled: !!accessToken,
  })

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return symbols.filter((s) => {
      if (q && !s.symbol.toLowerCase().includes(q)) return false
      if (tab === 'favorites' && !favorites.includes(s.symbol)) return false
      return true
    })
  }, [symbols, searchQuery, tab, favorites])

  const toggleFavorite = async (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!accessToken) return
    const isFav = favorites.includes(symbol)
    if (isFav) {
      await apiClient.delete(`/account/favorites/${symbol}`, accessToken)
    } else {
      await apiClient.post('/account/favorites', { symbol }, accessToken)
    }
    queryClient.invalidateQueries({ queryKey: ['favorites'] })
    queryClient.invalidateQueries({ queryKey: ['account-dashboard'] })
  }

  const formatPrice = (price: number) => {
    if (price > 1000) return price.toFixed(2)
    if (price > 100) return price.toFixed(2)
    if (price > 10) return price.toFixed(3)
    if (price > 1) return price.toFixed(5)
    return price.toFixed(5)
  }

  const formatSpread = (s: MarketSymbol) => {
    const spread = Number(s.spread || Math.abs(s.ask - s.bid) || 0)
    if (spread >= 1) return spread.toFixed(2)
    if (spread >= 0.01) return spread.toFixed(3)
    return spread.toFixed(5)
  }

  const groupSymbols = (groupId: string) => {
    if (groupId === 'popular') {
      return filtered.filter((s) => POPULAR.includes(s.symbol))
    }
    return filtered.filter((s) => s.category === groupId)
  }

  return (
    <div
      className={`h-full flex flex-col bg-[#15181d] min-w-0 ${
        embedded ? 'rounded-2xl border border-[#2a2e35] overflow-hidden' : 'border-r border-[#2a2e35]'
      }`}
    >
      {/* Favorites / All Symbols */}
      <div className="flex items-center border-b border-[#2a2e35]">
        <button
          type="button"
          onClick={() => setTab('favorites')}
          className={`flex-1 py-2.5 text-[11px] font-semibold tracking-wide ${
            tab === 'favorites'
              ? 'text-white border-b-2 border-[#4b9fff]'
              : 'text-[#6b7280] hover:text-[#c8cdd5]'
          }`}
        >
          FAVORITES
        </button>
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`flex-1 py-2.5 text-[11px] font-semibold tracking-wide ${
            tab === 'all'
              ? 'text-white border-b-2 border-[#4b9fff]'
              : 'text-[#6b7280] hover:text-[#c8cdd5]'
          }`}
        >
          ALL SYMBOLS
        </button>
      </div>

      <div className="px-2.5 py-2 border-b border-[#2a2e35]">
        <div className="flex items-center gap-2 rounded bg-[#1a1d21] border border-[#2a2e35] px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-[#6b7280]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for assets to trade..."
            className="flex-1 bg-transparent text-[11px] text-white placeholder-[#6b7280] focus:outline-none"
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[9px] text-[#6b7280] uppercase tracking-wide">
            {dataSource === 'live' ? 'Live feed' : dataSource === 'unavailable' ? 'Feed down' : 'Delayed / closed'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-1 px-2 py-1.5 text-[9px] uppercase tracking-wide text-[#6b7280] border-b border-[#2a2e35]">
        <span>Symbol</span>
        <span className="w-16 text-right">Price</span>
        <span className="w-12 text-right">Spread</span>
        <span className="w-14 text-right">Change %</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'favorites' && filtered.length === 0 ? (
          <div className="px-3 py-8 text-center text-[11px] text-[#6b7280]">
            Star symbols to add favorites
          </div>
        ) : (
          CATEGORY_GROUPS.map((group) => {
            if (tab === 'favorites') {
              // Flat list for favorites
              return null
            }
            const rows = groupSymbols(group.id)
            if (rows.length === 0 && searchQuery) return null
            const open = openGroups[group.id] !== false
            return (
              <div key={group.id} className="border-b border-[#1f2329]">
                <button
                  type="button"
                  onClick={() => setOpenGroups((g) => ({ ...g, [group.id]: !open }))}
                  className="w-full flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold tracking-wide text-[#9ca3af] hover:bg-[#1a1d21]"
                >
                  {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  {group.label}
                  <span className="ml-auto text-[#6b7280]">{rows.length}</span>
                </button>
                {open &&
                  rows.map((symbol) => (
                    <SymbolRow
                      key={symbol.symbol}
                      symbol={symbol}
                      selected={selectedSymbol?.symbol === symbol.symbol}
                      isFav={favorites.includes(symbol.symbol)}
                      onSelect={onSelectSymbol}
                      onToggleFav={toggleFavorite}
                      formatPrice={formatPrice}
                      formatSpread={formatSpread}
                    />
                  ))}
              </div>
            )
          })
        )}

        {tab === 'favorites' &&
          filtered.map((symbol) => (
            <SymbolRow
              key={symbol.symbol}
              symbol={symbol}
              selected={selectedSymbol?.symbol === symbol.symbol}
              isFav={favorites.includes(symbol.symbol)}
              onSelect={onSelectSymbol}
              onToggleFav={toggleFavorite}
              formatPrice={formatPrice}
              formatSpread={formatSpread}
            />
          ))}
      </div>
    </div>
  )
}

function SymbolRow({
  symbol,
  selected,
  isFav,
  onSelect,
  onToggleFav,
  formatPrice,
  formatSpread,
}: {
  symbol: MarketSymbol
  selected: boolean
  isFav: boolean
  onSelect: (s: MarketSymbol) => void
  onToggleFav: (symbol: string, e: React.MouseEvent) => void
  formatPrice: (n: number) => string
  formatSpread: (s: MarketSymbol) => string
}) {
  const up = symbol.changePercent >= 0
  return (
    <button
      type="button"
      onClick={() => onSelect(symbol)}
      className={`w-full grid grid-cols-[1fr_auto_auto_auto] gap-1 items-center px-2 py-1.5 text-left border-b border-[#1f2329]/80 ${
        selected ? 'bg-[#1e3a5f]/50' : 'hover:bg-[#1a1d21]'
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => onToggleFav(symbol.symbol, e)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onToggleFav(symbol.symbol, e as any)
          }}
          className="shrink-0"
        >
          <Star className={`h-3 w-3 ${isFav ? 'fill-amber-400 text-amber-400' : 'text-[#4b5563]'}`} />
        </span>
        <span className="text-[11px] font-semibold text-white truncate">{symbol.symbol}</span>
      </div>
      <span className="w-16 text-right font-mono text-[11px] text-[#e5e7eb]">{formatPrice(symbol.bid)}</span>
      <span className="w-12 text-right font-mono text-[10px] text-[#9ca3af]">{formatSpread(symbol)}</span>
      <span
        className={`w-14 text-right font-mono text-[10px] font-semibold ${
          up ? 'text-[#22c55e]' : 'text-[#ef4444]'
        }`}
      >
        {up ? '+' : ''}
        {symbol.changePercent.toFixed(2)}
      </span>
    </button>
  )
}
