'use client'

import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Shield } from 'lucide-react'
import { contractSize } from '@/lib/contract-sizes'

interface MarketSymbol {
  symbol: string
  bid: number
  ask: number
  spread: number
  changePercent: number
  icon?: string
  tradable?: boolean
  marketStatus?: 'open' | 'closed' | 'unavailable'
  dataSource?: string
}

interface OrderPanelProps {
  symbol: MarketSymbol | null
  lotSize: number
  onLotSizeChange: (size: number) => void
  onTrade: (side: 'BUY' | 'SELL', stopLoss?: number, takeProfit?: number) => void
  tradeLoading?: boolean
  tradingLocked?: boolean
  tradingLockedReason?: string
  leverage?: number
}

export default function OrderPanel({
  symbol,
  lotSize,
  onLotSizeChange,
  onTrade,
  tradeLoading = false,
  tradingLocked = false,
  tradingLockedReason,
  leverage = 10,
}: OrderPanelProps) {
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [tradeSuccess, setTradeSuccess] = useState<'BUY' | 'SELL' | null>(null)
  const marketClosed = Boolean(symbol && symbol.marketStatus && symbol.marketStatus !== 'open')
  const buttonsDisabled = tradeLoading || tradingLocked || marketClosed || symbol?.tradable === false
  const estimatedMargin = useMemo(() => {
    if (!symbol) return 0
    const lev = Math.max(1, leverage)
    return (lotSize * contractSize(symbol.symbol) * symbol.ask) / lev
  }, [symbol, lotSize, leverage])

  if (!symbol) {
    return (
      <div className="h-full flex items-center justify-center text-[#8e92a3] text-sm bg-gradient-to-br from-[#1a1d2e] via-[#151824] to-[#0f1219] min-w-0">
        <div className="text-center space-y-2">
          <div className="inline-block p-3 rounded-full bg-[#252836]/50 border border-[#2d3142]">
            <Shield className="h-6 w-6 text-[#64748b]" />
          </div>
          <p className="text-xs text-[#8e92a3]">Select a symbol to trade</p>
        </div>
      </div>
    )
  }

  const formatPrice = (price: number) => {
    if (price > 100) return price.toFixed(2)
    if (price > 10) return price.toFixed(3)
    if (price > 1) return price.toFixed(4)
    return price.toFixed(5)
  }

  const handleTrade = async (side: 'BUY' | 'SELL') => {
    const sl = stopLoss ? parseFloat(stopLoss) : undefined
    const tp = takeProfit ? parseFloat(takeProfit) : undefined
    
    // Show success animation
    setTradeSuccess(side)
    setTimeout(() => setTradeSuccess(null), 2000)
    
    onTrade(side, sl, tp)
    setStopLoss('')
    setTakeProfit('')
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-[#1a1d2e] via-[#151824] to-[#0f1219] relative overflow-x-hidden overflow-y-auto">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#4f46e5] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#22d3ee] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      {/* Symbol Info */}
      <div className="px-3 py-2.5 border-b border-[#2d3142]/50 bg-[#252836]/40 backdrop-blur-sm relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{symbol.symbol}</span>
            <div
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                symbol.changePercent >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
              }`}
            >
              {symbol.changePercent >= 0 ? '+' : ''}
              {symbol.changePercent.toFixed(2)}%
            </div>
          </div>
          {symbol.changePercent >= 0 ? (
            <TrendingUp className="h-4 w-4 text-[#22c55e]" />
          ) : (
            <TrendingDown className="h-4 w-4 text-[#ef4444]" />
          )}
        </div>
      </div>

      <div className="px-3 py-3 border-b border-[#2d3142]/50 space-y-2.5 relative z-10">
        <button
          onClick={() => handleTrade('SELL')}
          disabled={buttonsDisabled}
          className={`w-full py-4 rounded-xl relative overflow-hidden transition transform ${
            buttonsDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] hover:shadow-xl hover:shadow-[#ef4444]/30'
          } bg-gradient-to-br from-[#2a1b1b] via-[#1f1414] to-[#1a0f0f] border-2 border-[#ef4444]/50 ${tradeSuccess === 'SELL' ? 'ring-1 ring-[#ef4444]' : ''}`}
        >
          <div className="text-[10px] text-[#ef4444] mb-0.5 font-semibold tracking-wider uppercase">SELL</div>
          <div className="text-xl font-bold text-white font-mono">{formatPrice(symbol.bid)}</div>
        </button>

        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 rounded-lg border border-[#2d3142]/50 bg-[#252836]/50 p-1.5 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Decrease lot size"
            onClick={() => onLotSizeChange(Math.max(0.01, Number((lotSize - 0.01).toFixed(2))))}
            className="h-11 w-12 shrink-0 rounded-lg bg-[#252836] border border-[#2d3142] text-xl font-semibold text-white hover:border-[#6366f1]"
          >
            −
          </button>
          <input
            type="number"
            value={lotSize}
            onChange={(e) => onLotSizeChange(parseFloat(e.target.value) || 0.01)}
            className="w-full min-w-0 h-11 px-2 bg-transparent text-white text-center font-mono text-base focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            step="0.01"
            min="0.01"
          />
          <button
            type="button"
            aria-label="Increase lot size"
            onClick={() => onLotSizeChange(Number((lotSize + 0.01).toFixed(2)))}
            className="h-11 w-12 shrink-0 rounded-lg bg-[#6366f1] border border-[#6366f1] text-xl font-semibold text-white hover:bg-[#4f46e5]"
          >
            +
          </button>
        </div>

        <button
          onClick={() => handleTrade('BUY')}
          disabled={buttonsDisabled}
          className={`w-full py-4 rounded-xl relative overflow-hidden transition transform ${
            buttonsDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] hover:shadow-xl hover:shadow-[#10b981]/30'
          } bg-gradient-to-br from-[#1b2a1f] via-[#152018] to-[#0f1812] border-2 border-[#10b981]/50 ${tradeSuccess === 'BUY' ? 'ring-1 ring-[#10b981]' : ''}`}
        >
          <div className="text-[10px] text-[#10b981] mb-0.5 font-semibold tracking-wider uppercase">BUY</div>
          <div className="text-xl font-bold text-white font-mono">{formatPrice(symbol.ask)}</div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 relative z-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-3.5 w-3.5 text-[#94a3b8]" />
            <div className="text-[11px] font-semibold text-white">Risk Management</div>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-[#64748b] block mb-1 uppercase tracking-wider">Stop Loss</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 bg-[#252836] border border-[#1e293b] rounded text-xs text-white font-mono focus:outline-none focus:border-[#6366f1]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#64748b] block mb-1 uppercase tracking-wider">Take Profit</label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 bg-[#252836] border border-[#1e293b] rounded text-xs text-white font-mono focus:outline-none focus:border-[#6366f1]"
              />
            </div>
          </div>
        </div>

        <div className="text-[11px] text-[#94a3b8] space-y-1.5 pt-2 border-t border-[#1e293b]">
          <div className="flex justify-between items-center py-1">
            <span>Asset class:</span>
            <span className="text-white font-semibold">Forex FX Exotic</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Spread:</span>
            <span className="text-white font-mono">{formatPrice(symbol.spread)}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Min. position:</span>
            <span className="text-white font-mono">0.01</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Max. position:</span>
            <span className="text-white font-mono">100</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Leverage:</span>
            <span className="text-white font-semibold">1:{Math.max(1, leverage)}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Est. margin:</span>
            <span className="text-white font-mono">${estimatedMargin.toFixed(2)}</span>
          </div>
          {symbol.marketStatus && symbol.marketStatus !== 'open' && (
            <div className="pt-1 text-[11px] text-amber-300">
              Market {symbol.marketStatus} — last official BID/ASK shown. New orders paused.
            </div>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {tradeLoading && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-white font-semibold">Executing Trade...</p>
          </div>
        </div>
      )}
      {tradingLocked && !tradeLoading && (
        <div className="absolute inset-x-0 bottom-0 z-40 border-t border-yellow-500/30 bg-yellow-500/15 px-3 py-2 text-center text-xs text-yellow-100">
          {tradingLockedReason || 'Waiting for admin approval before trading'}
        </div>
      )}
      {!tradingLocked && marketClosed && !tradeLoading && (
        <div className="absolute inset-x-0 bottom-0 z-40 border-t border-amber-500/30 bg-amber-500/15 px-3 py-2 text-center text-xs text-amber-100">
          Market closed or quote stale — trading resumes when the live feed reopens
        </div>
      )}
    </div>
  )
}
