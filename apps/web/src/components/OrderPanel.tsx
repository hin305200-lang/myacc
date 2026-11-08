'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { TrendingUp, TrendingDown, Shield } from 'lucide-react'
import { contractSize } from '@/lib/contract-sizes'
import { effectiveLeverage, estimateMargin } from '@/lib/estimate-margin'
import { formatVolumeUnits, minPriceChange, swapRates, unitLabel } from '@/lib/instrument-display'

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
  const submittingRef = useRef(false)
  // Only hard-block when there is no executable bid/ask (allow last-price fills when feed is closed)
  const noQuote = !symbol || !(Number(symbol.bid) > 0) || !(Number(symbol.ask) > 0)
  const marketUnavailable = Boolean(symbol?.marketStatus === 'unavailable' && noQuote)
  const buttonsDisabled =
    tradeLoading || submittingRef.current || tradingLocked || marketUnavailable || noQuote
  const lev = effectiveLeverage(leverage)
  const estimatedMarginBuy = useMemo(() => {
    if (!symbol) return 0
    return estimateMargin({
      symbol: symbol.symbol,
      lotSize,
      price: symbol.ask,
      leverage: lev,
    })
  }, [symbol, lotSize, lev])
  const estimatedMarginSell = useMemo(() => {
    if (!symbol) return 0
    return estimateMargin({
      symbol: symbol.symbol,
      lotSize,
      price: symbol.bid,
      leverage: lev,
    })
  }, [symbol, lotSize, lev])

  useEffect(() => {
    if (!tradeLoading) submittingRef.current = false
  }, [tradeLoading])

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

  const handleTrade = (side: 'BUY' | 'SELL') => {
    if (tradeLoading || tradingLocked || marketClosed || symbol?.tradable === false || submittingRef.current) {
      return
    }
    submittingRef.current = true
    const sl = stopLoss ? parseFloat(stopLoss) : undefined
    const tp = takeProfit ? parseFloat(takeProfit) : undefined
    setTradeSuccess(side)
    setTimeout(() => setTradeSuccess(null), 2000)
    onTrade(side, sl, tp)
    setStopLoss('')
    setTakeProfit('')
  }

  return (
    <div className="h-full w-full max-w-full box-border flex flex-col bg-gradient-to-br from-[#1a1d2e] via-[#151824] to-[#0f1219] relative overflow-x-hidden overflow-y-auto">
      {/* Symbol Info */}
      <div className="px-2 py-2 border-b border-[#2d3142]/50 bg-[#252836]/40 backdrop-blur-sm relative z-10">
        <div className="flex items-center justify-between gap-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold text-white truncate">{symbol.symbol}</span>
            <div
              className={`px-1 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                symbol.changePercent >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
              }`}
            >
              {symbol.changePercent >= 0 ? '+' : ''}
              {symbol.changePercent.toFixed(2)}%
            </div>
          </div>
          {symbol.changePercent >= 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-[#22c55e] shrink-0" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-[#ef4444] shrink-0" />
          )}
        </div>
      </div>

      <div className="px-2 py-2.5 border-b border-[#2d3142]/50 space-y-2 relative z-10 w-full max-w-full box-border">
        <button
          onClick={() => handleTrade('SELL')}
          disabled={buttonsDisabled}
          className={`w-full py-3 rounded-lg relative overflow-hidden transition ${
            buttonsDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110'
          } bg-gradient-to-br from-[#2a1b1b] via-[#1f1414] to-[#1a0f0f] border border-[#ef4444]/50 ${tradeSuccess === 'SELL' ? 'ring-1 ring-[#ef4444]' : ''}`}
        >
          <div className="text-[9px] text-[#ef4444] mb-0.5 font-semibold tracking-wider uppercase">SELL</div>
          <div className="text-base font-bold text-white font-mono">{formatPrice(symbol.bid)}</div>
        </button>

        {/* Compact lot stepper — always fits inside panel width */}
        <div className="flex items-center gap-1 w-full max-w-full box-border rounded-md border border-[#2d3142]/50 bg-[#252836]/50 p-1">
          <button
            type="button"
            aria-label="Decrease lot size"
            onClick={() => onLotSizeChange(Math.max(0.01, Number((lotSize - 0.01).toFixed(2))))}
            className="h-8 w-8 shrink-0 rounded-md bg-[#252836] border border-[#2d3142] text-sm font-bold text-white hover:border-[#6366f1]"
          >
            −
          </button>
          <input
            type="number"
            value={lotSize}
            onChange={(e) => onLotSizeChange(parseFloat(e.target.value) || 0.01)}
            className="flex-1 min-w-0 h-8 px-1 bg-transparent text-white text-center font-mono text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            step="0.01"
            min="0.01"
          />
          <button
            type="button"
            aria-label="Increase lot size"
            onClick={() => onLotSizeChange(Number((lotSize + 0.01).toFixed(2)))}
            className="h-8 w-8 shrink-0 rounded-md bg-[#6366f1] border border-[#6366f1] text-sm font-bold text-white hover:bg-[#4f46e5]"
          >
            +
          </button>
        </div>

        <button
          onClick={() => handleTrade('BUY')}
          disabled={buttonsDisabled}
          className={`w-full py-3 rounded-lg relative overflow-hidden transition ${
            buttonsDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110'
          } bg-gradient-to-br from-[#1b2a1f] via-[#152018] to-[#0f1812] border border-[#10b981]/50 ${tradeSuccess === 'BUY' ? 'ring-1 ring-[#10b981]' : ''}`}
        >
          <div className="text-[9px] text-[#10b981] mb-0.5 font-semibold tracking-wider uppercase">BUY</div>
          <div className="text-base font-bold text-white font-mono">{formatPrice(symbol.ask)}</div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-2 relative z-10 w-full max-w-full box-border">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="h-3 w-3 text-[#94a3b8] shrink-0" />
            <div className="text-[10px] font-semibold text-white">Risk Management</div>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[9px] text-[#64748b] block mb-1 uppercase tracking-wider">Stop Loss</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Optional"
                className="w-full max-w-full box-border px-2 py-1.5 bg-[#252836] border border-[#1e293b] rounded text-xs text-white font-mono focus:outline-none focus:border-[#6366f1]"
              />
            </div>
            <div>
              <label className="text-[9px] text-[#64748b] block mb-1 uppercase tracking-wider">Take Profit</label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="Optional"
                className="w-full max-w-full box-border px-2 py-1.5 bg-[#252836] border border-[#1e293b] rounded text-xs text-white font-mono focus:outline-none focus:border-[#6366f1]"
              />
            </div>
          </div>
        </div>

        <div className="text-[10px] text-[#94a3b8] space-y-1 pt-2 border-t border-[#1e293b]">
          <div className="flex justify-between items-center gap-1 py-0.5">
            <span className="shrink-0">Volume (Lot)</span>
            <span className="text-white font-mono truncate text-right">
              {lotSize} Lot = {formatVolumeUnits(symbol.symbol, lotSize)}
            </span>
          </div>
          <div className="flex justify-between items-center gap-1 py-0.5">
            <span className="shrink-0">1 Lot</span>
            <span className="text-white font-mono truncate">
              {contractSize(symbol.symbol).toLocaleString()} {unitLabel(symbol.symbol)}
            </span>
          </div>
          <div className="flex justify-between items-center gap-1 py-0.5">
            <span className="shrink-0">Required Margin</span>
            <span className="text-[#f59e0b] font-mono truncate font-semibold">
              ${estimatedMarginBuy.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center gap-1 py-0.5">
            <span className="shrink-0">Est. margin SELL</span>
            <span className="text-[#ef4444] font-mono truncate">
              ${estimatedMarginSell.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center gap-1 py-0.5">
            <span className="shrink-0">Spread</span>
            <span className="text-white font-mono truncate">{formatPrice(symbol.spread)}</span>
          </div>
          <div className="flex justify-between items-center gap-1 py-0.5">
            <span className="shrink-0">Leverage</span>
            <span className="text-white font-semibold">1:{lev}</span>
          </div>
          <div className="flex justify-between items-center gap-1 py-0.5">
            <span className="shrink-0">Swap Buy (1 Lot)</span>
            <span className="text-white font-mono truncate">{swapRates(symbol.symbol).buy.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center gap-1 py-0.5">
            <span className="shrink-0">Swap Sell (1 Lot)</span>
            <span className="text-white font-mono truncate">{swapRates(symbol.symbol).sell.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center gap-1 py-0.5">
            <span className="shrink-0">Minimum change</span>
            <span className="text-white font-mono truncate">{minPriceChange(symbol.symbol)}</span>
          </div>
          <div className="flex justify-between items-center gap-1 py-0.5">
            <span className="shrink-0">Commission</span>
            <span className="text-white font-mono truncate">—</span>
          </div>
          <p className="pt-1 text-[9px] leading-relaxed text-[#64748b]">
            Margin = (lots × contract × price) ÷ leverage — same for all assets.
            {symbol.symbol === 'BTCUSD'
              ? ` 1 lot = 100 BTC → @ ask ÷ 1:${lev} ≈ $${estimatedMarginBuy.toLocaleString(undefined, { maximumFractionDigits: 0 })}.`
              : null}
          </p>
          {symbol.marketStatus && symbol.marketStatus !== 'open' && !noQuote && (
            <div className="pt-1 text-[11px] text-amber-300">
              Market {symbol.marketStatus} — using last BID/ASK for fills.
            </div>
          )}
          {noQuote && (
            <div className="pt-1 text-[11px] text-amber-300">
              Waiting for a quote — trading paused until BID/ASK arrive.
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
