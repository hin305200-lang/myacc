'use client'

import { useMemo, useState } from 'react'
import { Search, Star, TrendingDown, TrendingUp } from 'lucide-react'
import type { MarketSymbol } from '@/hooks/useMarketData'
import { useAuthStore } from '@/stores/auth-store'
import { apiClient } from '@/lib/api-client'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface MarketWatchProps {
  symbols: MarketSymbol[]
  selectedSymbol: MarketSymbol | null
  onSelectSymbol: (symbol: MarketSymbol) => void
  dataSource?: 'live' | 'simulated'
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'forex', label: 'Forex' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'commodities', label: 'Commodities' },
  { id: 'indices', label: 'Indices' },
  { id: 'stocks', label: 'Stocks' },
  { id: 'favorites', label: '★ Favorites' },
] as const

export default function MarketWatch({
  symbols,
  selectedSymbol,
  onSelectSymbol,
  dataSource = 'simulated',
}: MarketWatchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['id']>('all')
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

  const filteredSymbols = useMemo(() => {
    return symbols.filter((s) => {
      const matchesSearch = s.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory =
        category === 'all' ||
        (category === 'favorites' ? favorites.includes(s.symbol) : s.category === category)
      return matchesSearch && matchesCategory
    })
  }, [symbols, searchQuery, category, favorites])

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
    if (price > 1) return price.toFixed(4)
    return price.toFixed(5)
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#1a1d2e] to-[#151824] border-l border-[#2d3142] min-w-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2d3142] bg-[#252836]/90">
        <span className="text-xs font-bold text-white uppercase tracking-wider">Markets</span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border ${
            dataSource === 'live'
              ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
              : 'border-amber-500/40 text-amber-400 bg-amber-500/10'
          }`}
        >
          {dataSource === 'live' ? 'Live data' : 'Simulated'}
        </span>
      </div>

      <div className="px-2 py-2 border-b border-[#2d3142] flex flex-wrap gap-1">
        {CATEGORIES.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setCategory(id)}
            className={`px-2 py-1 text-[10px] font-semibold rounded-md transition ${
              category === id
                ? 'bg-[#6366f1] text-white'
                : 'bg-[#0f1219] text-[#8e92a3] border border-[#2d3142] hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-3 py-2 border-b border-[#2d3142] flex items-center gap-2">
        <Search className="h-3.5 w-3.5 text-[#64748b]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search symbol…"
          className="flex-1 bg-transparent text-xs text-white placeholder-[#64748b] focus:outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-[#252836]/90 sticky top-0 z-10">
            <tr className="text-[9px] text-[#64748b] uppercase tracking-wider">
              <th className="w-6" />
              <th className="text-left px-1 py-1.5">Symbol</th>
              <th className="text-right px-2 py-1.5">Bid</th>
              <th className="text-right px-2 py-1.5">Chg%</th>
            </tr>
          </thead>
          <tbody>
            {filteredSymbols.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-[#64748b] text-xs">
                  No symbols in this category
                </td>
              </tr>
            ) : (
              filteredSymbols.map((symbol) => {
                const isSelected = selectedSymbol?.symbol === symbol.symbol
                const isFav = favorites.includes(symbol.symbol)
                return (
                  <tr
                    key={symbol.symbol}
                    onClick={() => onSelectSymbol(symbol)}
                    className={`cursor-pointer transition border-b border-[#2d3142]/30 ${
                      isSelected ? 'bg-[#6366f1]/15 border-l-2 border-l-[#6366f1]' : 'hover:bg-[#252836]/60'
                    }`}
                  >
                    <td className="px-1 py-1.5">
                      <button onClick={(e) => toggleFavorite(symbol.symbol, e)} className="p-0.5">
                        <Star
                          className={`h-3 w-3 ${
                            isFav ? 'fill-amber-400 text-amber-400' : 'text-[#64748b] hover:text-amber-400'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-1 py-1.5">
                      <div className="font-semibold text-white">{symbol.symbol}</div>
                      <div className="text-[9px] text-[#64748b] capitalize">{symbol.category}</div>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-white">
                      {formatPrice(symbol.bid)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <span
                        className={`inline-flex items-center gap-0.5 font-semibold font-mono ${
                          symbol.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {symbol.changePercent >= 0 ? (
                          <TrendingUp className="h-2.5 w-2.5" />
                        ) : (
                          <TrendingDown className="h-2.5 w-2.5" />
                        )}
                        {symbol.changePercent >= 0 ? '+' : ''}
                        {symbol.changePercent.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
