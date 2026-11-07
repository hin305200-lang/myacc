'use client'

import { X, Minus, Plus } from 'lucide-react'

interface SymbolView {
  symbol: string
  bid: number
  ask: number
  spread: number
  changePercent: number
  icon: string
}

interface MobileTradePanelProps {
  isOpen: boolean
  onClose: () => void
  symbol: SymbolView
  lotSize: number
  onLotSizeChange: (size: number) => void
  onTrade: (side: 'BUY' | 'SELL') => void
  tradeLoading?: boolean
}

export default function MobileTradePanel({
  isOpen,
  onClose,
  symbol,
  lotSize,
  onLotSizeChange,
  onTrade,
  tradeLoading = false,
}: MobileTradePanelProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg-panel rounded-t-3xl z-50 animate-slide-up">
        {/* Drag Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 rounded-full bg-[#64748b]" />
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#64748b] hover:text-white"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="px-6 pb-8">
          {/* Symbol Info */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold">
                {symbol.icon}
              </span>
              <div>
                <div className="font-bold text-lg">{symbol.symbol}</div>
                <div className="text-sm text-[#64748b]">Spread: {symbol.spread}</div>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm ${
              symbol.changePercent >= 0 ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'
            }`}>
              {symbol.changePercent >= 0 ? '+' : ''}{symbol.changePercent.toFixed(2)}%
            </div>
          </div>

          {/* Buy/Sell Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => onTrade('SELL')}
              disabled={tradeLoading}
              className="py-5 bg-gradient-to-b from-red-500 to-red-700 rounded-xl active:scale-[0.98] transition-transform shadow-lg shadow-red-900/30 disabled:opacity-60"
            >
              <div className="text-xs text-red-200 mb-1">SELL</div>
              <div className="text-2xl font-bold font-mono">{symbol.bid.toFixed(symbol.bid > 100 ? 2 : 5)}</div>
            </button>

            <button
              onClick={() => onTrade('BUY')}
              disabled={tradeLoading}
              className="py-5 bg-gradient-to-b from-green-500 to-green-700 rounded-xl active:scale-[0.98] transition-transform shadow-lg shadow-green-900/30 disabled:opacity-60"
            >
              <div className="text-xs text-green-200 mb-1">BUY</div>
              <div className="text-2xl font-bold font-mono">{symbol.ask.toFixed(symbol.ask > 100 ? 2 : 5)}</div>
            </button>
          </div>

          {/* Volume */}
          <div className="mb-4">
            <label className="block text-xs text-[#64748b] uppercase mb-2">Volume (Lots)</label>
            <div className="grid grid-cols-[52px_minmax(0,1fr)_52px] items-center gap-3">
              <button
                type="button"
                aria-label="Decrease lot size"
                onClick={() => onLotSizeChange(Math.max(0.01, Number((lotSize - 0.01).toFixed(2))))}
                className="w-[52px] h-12 shrink-0 rounded-xl bg-bg-card border border-[#1e293b] flex items-center justify-center text-white hover:border-accent-purple active:scale-95 transition-all"
              >
                <Minus size={20} />
              </button>
              <input
                type="number"
                value={lotSize}
                onChange={(e) => onLotSizeChange(parseFloat(e.target.value) || 0.01)}
                className="w-full min-w-0 h-12 bg-bg-card border border-[#1e293b] rounded-xl text-center text-xl font-mono focus:outline-none focus:border-accent-purple [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                step="0.01"
                min="0.01"
              />
              <button
                type="button"
                aria-label="Increase lot size"
                onClick={() => onLotSizeChange(Number((lotSize + 0.01).toFixed(2)))}
                className="w-[52px] h-12 shrink-0 rounded-xl bg-[#6366f1] border border-[#6366f1] flex items-center justify-center text-white hover:bg-[#4f46e5] active:scale-95 transition-all"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Quick Lot Buttons */}
          <div className="flex gap-2 mb-6">
            {[0.01, 0.1, 0.5, 1.0].map((lot) => (
              <button
                key={lot}
                onClick={() => onLotSizeChange(lot)}
                className={`flex-1 py-2 rounded-lg text-sm font-mono transition-colors ${
                  lotSize === lot 
                    ? 'bg-accent-purple text-white' 
                    : 'bg-bg-card border border-[#1e293b] text-[#64748b] hover:text-white'
                }`}
              >
                {lot}
              </button>
            ))}
          </div>

          {/* Stop Loss & Take Profit */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs text-[#64748b] uppercase mb-2">Stop Loss</label>
              <input
                type="number"
                placeholder="0.00000"
                className="w-full h-12 bg-bg-card border border-[#1e293b] rounded-xl px-4 font-mono focus:outline-none focus:border-accent-purple"
              />
            </div>
            <div>
              <label className="block text-xs text-[#64748b] uppercase mb-2">Take Profit</label>
              <input
                type="number"
                placeholder="0.00000"
                className="w-full h-12 bg-bg-card border border-[#1e293b] rounded-xl px-4 font-mono focus:outline-none focus:border-accent-purple"
              />
            </div>
          </div>

          {/* Margin Info */}
          <div className="flex justify-between text-sm text-[#64748b] mb-6 px-1">
            <span>Required Margin:</span>
            <span className="font-mono">${(lotSize * 1000 * symbol.bid / 100).toFixed(2)}</span>
          </div>

          {/* Create Order Button */}
          <button
            onClick={() => onTrade('BUY')}
            disabled={tradeLoading}
            className="w-full py-4 bg-gradient-to-r from-accent-purple to-accent-blue rounded-xl font-semibold text-lg active:scale-[0.98] transition-transform shadow-lg shadow-accent-purple/30 disabled:opacity-60"
          >
            {tradeLoading ? 'Processing...' : 'Create Order'}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}

