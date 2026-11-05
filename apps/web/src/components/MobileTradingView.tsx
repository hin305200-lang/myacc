'use client'

import { useState } from 'react'
import { BarChart3, List, Zap } from 'lucide-react'
import TradingViewChart from './TradingViewChart'
import MarketWatch from './MarketWatch'
import OrderPanel from './OrderPanel'
import BottomPanel from './BottomPanel'

interface MobileTradingViewProps {
  selectedSymbol: any
  symbols: any[]
  symbolMeta: Record<string, { icon: string }>
  dataSource?: 'live' | 'simulated'
  onSelectSymbol: (symbol: any) => void
  lotSize: number
  onLotSizeChange: (size: number) => void
  onTrade: (side: 'BUY' | 'SELL', stopLoss?: number, takeProfit?: number) => void
  tradeLoading: boolean
  positions: any[]
  onClosePosition: (id: string) => void
}

type MobileView = 'chart' | 'market' | 'order'

export default function MobileTradingView({
  selectedSymbol,
  symbols,
  symbolMeta,
  dataSource = 'simulated',
  onSelectSymbol,
  lotSize,
  onLotSizeChange,
  onTrade,
  tradeLoading,
  positions,
  onClosePosition,
}: MobileTradingViewProps) {
  const [activeView, setActiveView] = useState<MobileView>('chart')

  const selectedMeta = selectedSymbol ? {
    ...selectedSymbol,
    icon: symbolMeta[selectedSymbol.symbol]?.icon ?? '₿',
    changePercent: selectedSymbol.changePercent,
  } : {
    symbol: 'EURUSD',
    bid: 1.0850,
    ask: 1.0852,
    spread: 0.0002,
    changePercent: 0.12,
    icon: '€',
  }

  return (
    <div className="lg:hidden h-full flex flex-col bg-[#0a0e27]">
      {/* Active View Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'chart' && (
          <div className="h-full flex flex-col bg-[#1a1d2e]">
            {/* Chart Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d3142] bg-gradient-to-r from-[#252836] to-[#1a1d2e]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">{selectedSymbol?.symbol || 'EURUSD'}</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${selectedSymbol?.changePercent >= 0 ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
                    {selectedSymbol?.changePercent >= 0 ? '+' : ''}{selectedSymbol?.changePercent?.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#94a3b8] mb-0.5">Price</div>
                <div className="text-sm font-mono font-bold text-white">
                  {selectedSymbol?.bid?.toFixed(5) || '1.00000'}
                </div>
              </div>
            </div>
            
            {/* Chart */}
            <div className="flex-1 overflow-hidden min-h-[400px]">
              <TradingViewChart symbol={selectedMeta} />
            </div>

            {/* Bottom Panel */}
            <div className="h-[140px] border-t border-[#1e293b]">
              <BottomPanel positions={positions} onClosePosition={onClosePosition} />
            </div>
          </div>
        )}

        {activeView === 'market' && (
          <div className="h-full bg-[#1a1d2e]">
            <MarketWatch
              symbols={symbols}
              selectedSymbol={selectedSymbol}
              dataSource={dataSource}
              onSelectSymbol={(symbol) => {
                onSelectSymbol(symbol)
                setActiveView('chart')
              }}
            />
          </div>
        )}

        {activeView === 'order' && (
          <div className="h-full bg-gradient-to-br from-[#1a1d2e] via-[#151824] to-[#0f1219]">
            <OrderPanel
              symbol={selectedSymbol}
              lotSize={lotSize}
              onLotSizeChange={onLotSizeChange}
              onTrade={onTrade}
              tradeLoading={tradeLoading}
            />
          </div>
        )}
      </div>

      {/* Mobile Navigation Bar - Advanced Design */}
      <div className="h-20 bg-gradient-to-t from-[#111538] via-[#0d1230] to-[#111538] border-t border-[#1e293b] flex items-center justify-around px-2 shadow-2xl relative z-50">
        {/* Background Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#6366f1]/5 to-transparent pointer-events-none" />
        
        <button
          onClick={() => setActiveView('chart')}
          className={`flex flex-col items-center justify-center gap-1.5 px-5 py-2.5 rounded-2xl transition-all relative overflow-hidden group ${
            activeView === 'chart'
              ? 'text-white bg-gradient-to-b from-[#6366f1]/30 to-[#6366f1]/10'
              : 'text-[#94a3b8] hover:text-white'
          }`}
        >
          {activeView === 'chart' && (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1]/20 via-[#6366f1]/10 to-transparent" />
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-transparent via-[#6366f1] to-transparent" />
            </>
          )}
          <div className={`relative transition-all duration-300 ${activeView === 'chart' ? 'scale-110' : 'group-hover:scale-105'}`}>
            <BarChart3 className="h-7 w-7" />
            {activeView === 'chart' && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-[#6366f1] rounded-full animate-pulse shadow-lg shadow-[#6366f1]/50" />
            )}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider transition-all ${
            activeView === 'chart' ? 'text-white' : 'text-[#94a3b8]'
          }`}>Chart</span>
        </button>

        <button
          onClick={() => setActiveView('market')}
          className={`flex flex-col items-center justify-center gap-1.5 px-5 py-2.5 rounded-2xl transition-all relative overflow-hidden group ${
            activeView === 'market'
              ? 'text-white bg-gradient-to-b from-[#6366f1]/30 to-[#6366f1]/10'
              : 'text-[#94a3b8] hover:text-white'
          }`}
        >
          {activeView === 'market' && (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1]/20 via-[#6366f1]/10 to-transparent" />
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-transparent via-[#6366f1] to-transparent" />
            </>
          )}
          <div className={`relative transition-all duration-300 ${activeView === 'market' ? 'scale-110' : 'group-hover:scale-105'}`}>
            <List className="h-7 w-7" />
            {activeView === 'market' && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-[#6366f1] rounded-full animate-pulse shadow-lg shadow-[#6366f1]/50" />
            )}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider transition-all ${
            activeView === 'market' ? 'text-white' : 'text-[#94a3b8]'
          }`}>Market</span>
        </button>

        <button
          onClick={() => setActiveView('order')}
          className={`flex flex-col items-center justify-center gap-1.5 px-5 py-2.5 rounded-2xl transition-all relative overflow-hidden group ${
            activeView === 'order'
              ? 'text-white bg-gradient-to-b from-[#6366f1]/30 to-[#6366f1]/10'
              : 'text-[#94a3b8] hover:text-white'
          }`}
        >
          {activeView === 'order' && (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1]/20 via-[#6366f1]/10 to-transparent" />
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-transparent via-[#6366f1] to-transparent" />
            </>
          )}
          <div className={`relative transition-all duration-300 ${activeView === 'order' ? 'scale-110' : 'group-hover:scale-105'}`}>
            <Zap className="h-7 w-7" />
            {activeView === 'order' && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-[#6366f1] rounded-full animate-pulse shadow-lg shadow-[#6366f1]/50" />
            )}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider transition-all ${
            activeView === 'order' ? 'text-white' : 'text-[#94a3b8]'
          }`}>Trade</span>
        </button>
      </div>
    </div>
  )
}
