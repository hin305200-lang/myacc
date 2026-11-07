'use client'

import { useState } from 'react'
import { Search, Star, Settings, Plus, RefreshCw, Sparkles, Bot, TrendingUp, AlertCircle, X } from 'lucide-react'
import TradingChart from './TradingChart'

interface SymbolRow {
  symbol: string
  price: number
  bid: number
  ask: number
  spread: number
  changePercent: number
  icon: string
}

interface SidebarProps {
  symbols: SymbolRow[]
  selectedSymbol: SymbolRow
  onSelectSymbol: (symbol: SymbolRow) => void
  lotSize: number
  onLotSizeChange: (size: number) => void
  onTrade: (side: 'BUY' | 'SELL', stopLoss?: number, takeProfit?: number) => void
  tradeLoading?: boolean
}

export default function Sidebar({
  symbols,
  selectedSymbol,
  onSelectSymbol,
  lotSize,
  onLotSizeChange,
  onTrade,
  tradeLoading = false,
}: SidebarProps) {
  const [symbolTab, setSymbolTab] = useState<'favorites' | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null)
  const [detailModalSymbol, setDetailModalSymbol] = useState<SymbolRow | null>(null)
  const [orderModalSymbol, setOrderModalSymbol] = useState<SymbolRow | null>(null)
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [leverage, setLeverage] = useState(50)
  const [pendingPrice, setPendingPrice] = useState('')

  const filteredSymbols = symbols.filter((s) =>
    s.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="relative h-full flex flex-col overflow-hidden border-r border-white/5 bg-gradient-to-b from-[#0f162e] via-[#0d1328] to-[#0a0f1f]">
      <div className="pointer-events-none absolute -right-6 top-12 h-28 w-28 rounded-full bg-[#22d3ee]/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -left-10 bottom-14 h-24 w-24 rounded-full bg-[#7c3aed]/12 blur-3xl" aria-hidden />

      {/* Symbol Filter */}
      <div className="relative z-10 p-4 border-b border-white/5 bg-white/5 backdrop-blur-sm">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setSymbolTab('favorites')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold tracking-tight transition ${
              symbolTab === 'favorites'
                ? 'bg-white/15 text-white shadow-inner shadow-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Star size={12} />
            Favorites
          </button>
          <button
            onClick={() => setSymbolTab('all')}
            className={`flex-1 rounded-xl px-3 py-2 text-[11px] font-semibold tracking-tight transition ${
              symbolTab === 'all'
                ? 'bg-white/15 text-white shadow-inner shadow-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All symbols
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search for asset to trade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-accent-purple focus:bg-white/10"
          />
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-4 gap-2 mt-3 px-2 text-[10px] text-slate-500 uppercase tracking-[0.14em]">
          <span>Symbol</span>
          <span className="text-right">Price</span>
          <span className="text-right">Spread</span>
          <span className="text-right">Change</span>
        </div>
      </div>

      {/* Popular Section */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-[0.14em]">
          <span className="h-px flex-1 bg-white/10" />
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-white/10 bg-white/5">
            <Sparkles size={12} className="text-accent-cyan" />
            Popular pairs
          </span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        {/* All Symbol Trade Cards */}
        <div className="space-y-3">
          {filteredSymbols.map((symbol) => (
            <TradeCard
              key={symbol.symbol}
              symbol={symbol}
              isSelected={selectedSymbol.symbol === symbol.symbol}
              isExpanded={expandedSymbol === symbol.symbol}
              onSelect={() => {
                onSelectSymbol(symbol)
                setExpandedSymbol(expandedSymbol === symbol.symbol ? null : symbol.symbol)
              }}
              onDoubleClick={() => setDetailModalSymbol(symbol)}
              onOpenOrderModal={(s) => {
                setOrderModalSymbol(s)
                setOrderType('MARKET')
                setStopLoss('')
                setTakeProfit('')
                setPendingPrice('')
                setLeverage(50)
              }}
              lotSize={lotSize}
              onLotSizeChange={onLotSizeChange}
              onTrade={onTrade}
              tradeLoading={tradeLoading}
            />
          ))}
        </div>
      </div>

      {/* Order Modal */}
      {orderModalSymbol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOrderModalSymbol(null)} />
          <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f172a] via-[#0c1220] to-[#0b0f1f] p-5 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                  {orderModalSymbol.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold tracking-tight">{orderModalSymbol.symbol}</p>
                  <p className="text-[11px] text-slate-400">
                    Spread {orderModalSymbol.spread.toFixed(orderModalSymbol.spread > 10 ? 2 : 5)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOrderModalSymbol(null)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:border-accent-purple"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 mb-3">
              <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <label className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Order Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['MARKET', 'LIMIT'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setOrderType(t)}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                        orderType === t ? 'bg-accent-purple text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {orderType === 'LIMIT' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Pending Price</label>
                    <input
                      value={pendingPrice}
                      onChange={(e) => setPendingPrice(e.target.value)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-purple"
                      placeholder="1.08650"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <label className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Risk Controls</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase">Stop Loss</span>
                    <input
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-purple"
                      placeholder="0.00000"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase">Take Profit</span>
                    <input
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-purple"
                      placeholder="0.00000"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 uppercase">Leverage</span>
                  <input
                    type="range"
                    min={1}
                    max={500}
                    value={leverage}
                    onChange={(e) => setLeverage(Number(e.target.value))}
                    className="w-full accent-accent-purple"
                  />
                  <div className="text-xs text-slate-300">x{leverage}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] items-center">
              <button
                onClick={() => {
                  if (tradeLoading) return
                  const sl = stopLoss ? parseFloat(stopLoss) : undefined
                  const tp = takeProfit ? parseFloat(takeProfit) : undefined
                  onTrade('SELL', sl, tp)
                  setOrderModalSymbol(null)
                }}
                disabled={tradeLoading}
                className="w-full py-3 rounded-xl bg-[#1e2a3d] border border-red-400/30 hover:border-red-300/60 text-left px-3 shadow-lg shadow-red-900/30 disabled:opacity-60 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="text-[11px] text-red-200 mb-1">SELL</div>
                <div className="text-xl font-bold font-mono">{orderModalSymbol.bid.toFixed(orderModalSymbol.bid > 100 ? 2 : 5)}</div>
              </button>

              <div className="text-center">
                <div className="text-[10px] text-slate-400 mb-1">LOT / VOLUME</div>
                <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2 max-w-[200px] mx-auto">
                  <button
                    type="button"
                    aria-label="Decrease lot size"
                    onClick={() => onLotSizeChange(Math.max(0.01, Number((lotSize - 0.01).toFixed(2))))}
                    className="h-9 w-10 shrink-0 rounded border border-white/10 bg-white/5 text-white hover:border-accent-purple"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={lotSize}
                    onChange={(e) => onLotSizeChange(parseFloat(e.target.value) || 0.01)}
                    className="w-full min-w-0 h-9 rounded border border-white/10 bg-white/5 text-center text-sm font-mono focus:outline-none focus:border-accent-purple [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    step="0.01"
                    min="0.01"
                  />
                  <button
                    type="button"
                    aria-label="Increase lot size"
                    onClick={() => onLotSizeChange(Number((lotSize + 0.01).toFixed(2)))}
                    className="h-9 w-10 shrink-0 rounded bg-[#6366f1] border border-[#6366f1] text-white hover:bg-[#4f46e5]"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  if (tradeLoading) return
                  const sl = stopLoss ? parseFloat(stopLoss) : undefined
                  const tp = takeProfit ? parseFloat(takeProfit) : undefined
                  onTrade('BUY', sl, tp)
                  setOrderModalSymbol(null)
                }}
                disabled={tradeLoading}
                className="w-full py-3 rounded-xl bg-[#1e2a3d] border border-green-300/40 hover:border-green-200/70 text-left px-3 shadow-lg shadow-green-900/30 disabled:opacity-60 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="text-[11px] text-green-200 mb-1">BUY</div>
                <div className="text-xl font-bold font-mono">{orderModalSymbol.ask.toFixed(orderModalSymbol.ask > 100 ? 2 : 5)}</div>
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>Type: {orderType}</span>
              <span>SL: {stopLoss || '—'}</span>
              <span>TP: {takeProfit || '—'}</span>
              <span>Lev: x{leverage}</span>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal - Double Click */}
      {detailModalSymbol && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDetailModalSymbol(null)} />
          <div className="relative w-full max-w-7xl h-[90vh] rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f172a] via-[#0c1220] to-[#0b0f1f] shadow-2xl shadow-black/50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg font-semibold">
                  {detailModalSymbol.icon}
                </span>
                <div>
                  <p className="text-lg font-semibold tracking-tight">{detailModalSymbol.symbol}</p>
                  <p className="text-[11px] text-slate-400">
                    Spread {detailModalSymbol.spread.toFixed(detailModalSymbol.spread > 10 ? 2 : 5)} ·{' '}
                    <span className={detailModalSymbol.changePercent >= 0 ? 'text-profit' : 'text-loss'}>
                      {detailModalSymbol.changePercent >= 0 ? '+' : ''}
                      {detailModalSymbol.changePercent.toFixed(2)}%
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalSymbol(null)}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:border-accent-purple"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 p-6 overflow-auto">
              {/* Left: Chart */}
              <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] overflow-hidden">
                <TradingChart
                  symbol={detailModalSymbol}
                  candles={[]}
                />
              </div>

              {/* Right: AI Advice & Controls */}
              <div className="space-y-4">
                {/* AI Recommendations */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="h-5 w-5 text-accent-cyan" />
                    <p className="text-sm font-semibold">AI Trading Recommendations</p>
                  </div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 text-profit mt-0.5" />
                      <div>
                        <p className="font-semibold text-white">Signal: Bullish Bias</p>
                        <p className="text-slate-400">Current momentum suggests upward trend continuation</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-300 mt-0.5" />
                      <div>
                        <p className="font-semibold text-white">Risk Level: Moderate</p>
                        <p className="text-slate-400">Volatility within normal range · Risk guard active</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Settings className="h-4 w-4 text-accent-purple mt-0.5" />
                      <div>
                        <p className="font-semibold text-white">Suggested SL/TP</p>
                        <p className="text-slate-400">Stop Loss: 0.7% · Take Profit: 1.5% (3x ladder)</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advanced Controls */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <p className="text-sm font-semibold">Advanced Order Settings</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-500 uppercase">Stop Loss</label>
                      <input
                        value={stopLoss}
                        onChange={(e) => setStopLoss(e.target.value)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-purple"
                        placeholder="Auto: 0.7%"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-500 uppercase">Take Profit</label>
                      <input
                        value={takeProfit}
                        onChange={(e) => setTakeProfit(e.target.value)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-purple"
                        placeholder="Auto: 1.5%"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 uppercase">Leverage</label>
                    <input
                      type="range"
                      min={1}
                      max={500}
                      value={leverage}
                      onChange={(e) => setLeverage(Number(e.target.value))}
                      className="w-full accent-accent-purple"
                    />
                    <div className="text-xs text-slate-300">x{leverage}</div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 uppercase">Order Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['MARKET', 'LIMIT'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setOrderType(t)}
                          className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                            orderType === t ? 'bg-accent-purple text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Trade Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      if (tradeLoading) return
                      onTrade('SELL')
                      setDetailModalSymbol(null)
                    }}
                    disabled={tradeLoading}
                    className="w-full py-4 rounded-xl bg-gradient-to-br from-[#2a1b1b] via-[#1e2a3d] to-[#1b1f2d] border border-red-400/40 hover:border-red-300/70 transition-all shadow-lg shadow-red-900/30 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="text-[11px] text-red-200 mb-1">SELL</div>
                    <div className="text-xl font-bold font-mono">{detailModalSymbol.bid.toFixed(detailModalSymbol.bid > 100 ? 2 : 5)}</div>
                  </button>

                  <button
                    onClick={() => {
                      if (tradeLoading) return
                      onTrade('BUY')
                      setDetailModalSymbol(null)
                    }}
                    disabled={tradeLoading}
                    className="w-full py-4 rounded-xl bg-gradient-to-br from-[#1b2a1f] via-[#1e2a3d] to-[#1b1f2d] border border-green-300/50 hover:border-green-200/80 transition-all shadow-lg shadow-green-900/30 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="text-[11px] text-green-200 mb-1">BUY</div>
                    <div className="text-xl font-bold font-mono">{detailModalSymbol.ask.toFixed(detailModalSymbol.ask > 100 ? 2 : 5)}</div>
                  </button>
                </div>

                <div className="text-center text-xs text-slate-400">
                  Volume: {lotSize} lots · Leverage: x{leverage}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TradeCard({
  symbol,
  isSelected,
  isExpanded,
  onSelect,
  onDoubleClick,
  onOpenOrderModal,
  lotSize,
  onLotSizeChange,
  onTrade,
  tradeLoading = false,
}: {
  symbol: SymbolRow
  isSelected: boolean
  isExpanded: boolean
  onSelect: () => void
  onDoubleClick: () => void
  onOpenOrderModal: (symbol: SymbolRow) => void
  lotSize: number
  onLotSizeChange: (size: number) => void
  onTrade: (side: 'BUY' | 'SELL') => void
  tradeLoading?: boolean
}) {
  let clickTimeout: NodeJS.Timeout | null = null

  const handleClick = () => {
    if (clickTimeout) {
      clearTimeout(clickTimeout)
      clickTimeout = null
      onDoubleClick()
    } else {
      clickTimeout = setTimeout(() => {
        onSelect()
        clickTimeout = null
      }, 300)
    }
  }
  return (
    <div
      onClick={handleClick}
      className={`w-full overflow-visible rounded-2xl border border-white/8 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur cursor-pointer ${
        isSelected ? 'ring-1 ring-accent-purple shadow-lg shadow-purple-900/30' : 'shadow-[0_10px_40px_rgba(0,0,0,0.35)]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
            {symbol.icon}
          </span>
          <span className="font-semibold text-sm tracking-tight">{symbol.symbol}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1 hover:bg-white/5 rounded" title="Info">
            <Settings size={14} className="text-slate-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpenOrderModal(symbol)
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-white/5 hover:bg-white/10 transition"
          >
            <Plus size={12} />
            Create Order
          </button>
          <button className="p-1 hover:bg-white/5 rounded" title="Refresh">
            <RefreshCw size={14} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-center gap-3 px-3 py-1 text-[11px] text-slate-400">
        <span>Spread: {symbol.spread.toFixed(5)}</span>
        <span className={symbol.changePercent >= 0 ? 'text-profit' : 'text-loss'}>
          {symbol.changePercent >= 0 ? '+' : ''}
          {symbol.changePercent.toFixed(2)}%
        </span>
        <button className="ml-auto">
          <Star size={12} />
        </button>
      </div>

      {/* Trade Buttons - Only visible when expanded */}
      {isExpanded && (
        <div className="p-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/10 text-sm font-semibold">{symbol.icon}</span>
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-tight">{symbol.symbol}</div>
                <div className="text-[10px] text-slate-500">Spread: {symbol.spread.toFixed(5)}</div>
              </div>
            </div>
            <span className={`rounded-full px-2 py-1 text-[11px] ${symbol.changePercent >= 0 ? 'bg-profit/15 text-profit' : 'bg-loss/15 text-loss'}`}>
              {symbol.changePercent >= 0 ? '+' : ''}
              {symbol.changePercent.toFixed(2)}%
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 items-center">
            {/* Sell Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onTrade('SELL'); }}
              disabled={tradeLoading}
              className="w-full py-4 px-4 bg-gradient-to-br from-[#2a1b1b] via-[#1e2a3d] to-[#1b1f2d] border border-red-400/40 rounded-xl hover:border-red-300/70 transition-all shadow-lg shadow-red-900/30 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="text-[11px] text-red-200 mb-1">SELL</div>
              <div className="text-xl font-bold font-mono">{symbol.bid.toFixed(symbol.bid > 100 ? 2 : 5)}</div>
            </button>

            {/* Lot Size */}
            <div className="text-center">
              <div className="text-[10px] text-slate-400 mb-1">LOT / VOLUME</div>
              <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2 max-w-[200px] mx-auto">
                <button
                  type="button"
                  aria-label="Decrease lot size"
                  onClick={(e) => {
                    e.stopPropagation()
                    onLotSizeChange(Math.max(0.01, Number((lotSize - 0.01).toFixed(2))))
                  }}
                  className="h-9 w-10 shrink-0 rounded border border-white/10 bg-white/5 text-white hover:border-accent-purple"
                >
                  −
                </button>
                <input
                  type="number"
                  value={lotSize}
                  onChange={(e) => onLotSizeChange(parseFloat(e.target.value) || 0.01)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full min-w-0 h-9 rounded border border-white/10 bg-white/5 text-center text-sm font-mono focus:outline-none focus:border-accent-purple [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  step="0.01"
                  min="0.01"
                />
                <button
                  type="button"
                  aria-label="Increase lot size"
                  onClick={(e) => {
                    e.stopPropagation()
                    onLotSizeChange(Number((lotSize + 0.01).toFixed(2)))
                  }}
                  className="h-9 w-10 shrink-0 rounded bg-[#6366f1] border border-[#6366f1] text-white hover:bg-[#4f46e5]"
                >
                  +
                </button>
              </div>
            </div>

            {/* Buy Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onTrade('BUY'); }}
              disabled={tradeLoading}
              className="w-full py-4 px-4 bg-gradient-to-br from-[#1b2a1f] via-[#1e2a3d] to-[#1b1f2d] border border-green-300/50 rounded-xl hover:border-green-200/80 transition-all shadow-lg shadow-green-900/30 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="text-[11px] text-green-200 mb-1">BUY</div>
              <div className="text-xl font-bold font-mono">{symbol.ask.toFixed(symbol.ask > 100 ? 2 : 5)}</div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

