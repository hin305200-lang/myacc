'use client'

import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Zap, Shield } from 'lucide-react'
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
            <Zap className="h-6 w-6 text-[#4f46e5] animate-pulse" />
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
    <div className="h-full flex flex-col bg-gradient-to-br from-[#1a1d2e] via-[#151824] to-[#0f1219] border-l border-[#2d3142]/50 relative overflow-hidden">
      {/* Animated background glow */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#4f46e5] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#22d3ee] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <div className="px-3 py-2 border-b border-[#2d3142]/50 bg-[#252836]/50 backdrop-blur-sm relative z-10">
        <button className="text-xs text-[#8e92a3] hover:text-white transition flex items-center gap-1">
          <span>←</span> Asset
        </button>
      </div>

      {/* Symbol Info */}
      <div className="px-3 py-3 border-b border-[#2d3142]/50 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{symbol.symbol}</span>
            <div className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
              symbol.changePercent >= 0 
                ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30' 
                : 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'
            }`}>
              {symbol.changePercent >= 0 ? '+' : ''}{symbol.changePercent.toFixed(2)}%
            </div>
          </div>
          {symbol.changePercent >= 0 ? (
            <TrendingUp className="h-4 w-4 text-[#10b981] animate-pulse" />
          ) : (
            <TrendingDown className="h-4 w-4 text-[#ef4444] animate-pulse" />
          )}
        </div>
      </div>

      {/* Buy/Sell Buttons - Futuristic Design */}
      <div className="px-3 py-3 border-b border-[#2d3142]/50 space-y-3 relative z-10">
        {/* SELL Button */}
        <button
          onClick={() => handleTrade('SELL')}
          disabled={buttonsDisabled}
          className={`w-full py-5 rounded-xl relative overflow-hidden transition-all transform ${
            tradeSuccess === 'SELL'
              ? 'scale-105 shadow-2xl shadow-[#ef4444]/50'
              : 'hover:scale-[1.02] hover:shadow-xl hover:shadow-[#ef4444]/30'
          } ${
            buttonsDisabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'active:scale-[0.98]'
          } bg-gradient-to-br from-[#2a1b1b] via-[#1f1414] to-[#1a0f0f] border-2 border-[#ef4444]/50`}
        >
          {/* Animated glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ef4444]/20 to-transparent animate-shimmer" />
          <div className="relative z-10">
            <div className="text-xs text-[#ef4444] mb-1 font-semibold tracking-wider uppercase flex items-center gap-2">
              <Zap className="h-3 w-3" />
              SELL
            </div>
            <div className="text-2xl font-bold text-white font-mono tracking-tight">
              {formatPrice(symbol.bid)}
            </div>
          </div>
          {tradeSuccess === 'SELL' && (
            <div className="absolute inset-0 bg-[#ef4444]/20 animate-ping" />
          )}
        </button>

        {/* Lot Size - Futuristic Input */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-[#252836]/30 border border-[#2d3142]/50 backdrop-blur-sm">
          <button
            onClick={() => onLotSizeChange(Math.max(0.01, lotSize - 0.01))}
            className="px-3 py-2 bg-[#252836] border border-[#2d3142] rounded-lg text-white hover:bg-[#2d3142] hover:border-[#4f46e5] transition-all active:scale-95"
          >
            −
          </button>
          <input
            type="number"
            value={lotSize}
            onChange={(e) => onLotSizeChange(parseFloat(e.target.value) || 0.01)}
            className="flex-1 px-3 py-2 bg-[#252836] border border-[#2d3142] rounded-lg text-white text-center font-mono focus:outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 transition-all"
            step="0.01"
            min="0.01"
          />
          <button
            onClick={() => onLotSizeChange(lotSize + 0.01)}
            className="px-3 py-2 bg-[#252836] border border-[#2d3142] rounded-lg text-white hover:bg-[#2d3142] hover:border-[#4f46e5] transition-all active:scale-95"
          >
            +
          </button>
        </div>

        {/* BUY Button */}
        <button
          onClick={() => handleTrade('BUY')}
          disabled={buttonsDisabled}
          className={`w-full py-5 rounded-xl relative overflow-hidden transition-all transform ${
            tradeSuccess === 'BUY'
              ? 'scale-105 shadow-2xl shadow-[#10b981]/50'
              : 'hover:scale-[1.02] hover:shadow-xl hover:shadow-[#10b981]/30'
          } ${
            buttonsDisabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'active:scale-[0.98]'
          } bg-gradient-to-br from-[#1b2a1f] via-[#152018] to-[#0f1812] border-2 border-[#10b981]/50`}
        >
          {/* Animated glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#10b981]/20 to-transparent animate-shimmer" />
          <div className="relative z-10">
            <div className="text-xs text-[#10b981] mb-1 font-semibold tracking-wider uppercase flex items-center gap-2">
              <Zap className="h-3 w-3" />
              BUY
            </div>
            <div className="text-2xl font-bold text-white font-mono tracking-tight">
              {formatPrice(symbol.ask)}
            </div>
          </div>
          {tradeSuccess === 'BUY' && (
            <div className="absolute inset-0 bg-[#10b981]/20 animate-ping" />
          )}
        </button>

        {/* High/Low - Futuristic Display */}
        <div className="flex justify-between text-xs pt-2">
          <div className="px-2 py-1 rounded bg-[#252836]/30 border border-[#2d3142]/50">
            <span className="text-[#8e92a3]">Low: </span>
            <span className="text-white font-mono">{formatPrice(symbol.bid * 0.99)}</span>
          </div>
          <div className="px-2 py-1 rounded bg-[#252836]/30 border border-[#2d3142]/50">
            <span className="text-[#8e92a3]">High: </span>
            <span className="text-white font-mono">{formatPrice(symbol.ask * 1.01)}</span>
          </div>
        </div>
      </div>

      {/* Asset Details - Futuristic Scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 relative z-10">
        {/* Risk Management Section */}
        <div className="pt-3 border-t border-[#2d3142]/50 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-[#4f46e5]" />
            <div className="text-xs font-semibold text-white">Risk Management</div>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-[#8e92a3] block mb-1.5 uppercase tracking-wider">Stop Loss</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 bg-[#252836]/50 border border-[#2d3142] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 transition-all backdrop-blur-sm"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#8e92a3] block mb-1.5 uppercase tracking-wider">Take Profit</label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 bg-[#252836]/50 border border-[#2d3142] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 transition-all backdrop-blur-sm"
              />
            </div>
          </div>
        </div>

        {/* Asset Details */}
        <div className="text-xs text-[#8e92a3] space-y-2 pt-3 border-t border-[#2d3142]/50">
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
