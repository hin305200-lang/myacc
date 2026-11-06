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
  layout?: 'terminal' | 'banking' | 'account'
  initialView?: 'chart' | 'market' | 'order'
  showNav?: boolean
  isAuthenticated?: boolean
  onRequireAuth?: () => void
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
  layout = 'terminal',
  initialView = 'chart',
  showNav = true,
  isAuthenticated = true,
  onRequireAuth,
}: MobileTradingViewProps) {
  const [activeView, setActiveView] = useState<MobileView>(initialView)
  const isAccount = layout === 'account' || layout === 'banking'

  const selectedMeta = selectedSymbol
    ? {
        ...selectedSymbol,
        icon: symbolMeta[selectedSymbol.symbol]?.icon ?? '₿',
        changePercent: selectedSymbol.changePercent,
      }
    : {
        symbol: 'EURUSD',
        bid: 1.085,
        ask: 1.0852,
        spread: 0.0002,
        changePercent: 0.12,
        icon: '€',
      }

  const shellClass = isAccount
    ? 'h-full flex flex-col min-h-[420px]'
    : 'lg:hidden h-full flex flex-col bg-[#0a0e27]'

  const panelClass = isAccount
    ? 'flex-1 overflow-hidden rounded-2xl border border-[#1e293b] bg-[#111538] shadow-[0_8px_32px_rgba(0,0,0,0.35)]'
    : 'flex-1 overflow-hidden'

  return (
    <div className={shellClass}>
      {isAccount && (
        <div className="mb-3 flex rounded-xl bg-[#0d1230] p-1 ring-1 ring-[#1e293b]">
          {(
            [
              { id: 'chart' as const, label: 'Chart', icon: BarChart3 },
              { id: 'market' as const, label: 'Watchlist', icon: List },
              { id: 'order' as const, label: 'Ticket', icon: Zap },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveView(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold uppercase tracking-wide transition ${
                activeView === id
                  ? 'bg-gradient-to-b from-[#6366f1] to-[#4f46e5] text-white shadow-md'
                  : 'text-[#94a3b8]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      <div className={panelClass}>
        {activeView === 'chart' && (
          <div className="flex h-full flex-col bg-[#1a1d2e]">
            <div className="flex items-center justify-between border-b border-[#2d3142] bg-gradient-to-r from-[#252836] to-[#1a1d2e] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{selectedSymbol?.symbol || 'EURUSD'}</span>
                <span
                  className={`rounded px-2 py-0.5 font-mono text-xs ${
                    selectedSymbol?.changePercent >= 0
                      ? 'bg-[#22c55e]/20 text-[#22c55e]'
                      : 'bg-[#ef4444]/20 text-[#ef4444]'
                  }`}
                >
                  {selectedSymbol?.changePercent >= 0 ? '+' : ''}
                  {selectedSymbol?.changePercent?.toFixed(2)}%
                </span>
              </div>
              <div className="text-right">
                <div className="mb-0.5 text-[10px] uppercase tracking-wider text-[#64748b]">Bid / Ask</div>
                <div className="font-mono text-sm font-bold text-white">
                  {selectedSymbol?.bid?.toFixed(5) || '—'}{' '}
                  <span className="text-[#64748b]">/</span>{' '}
                  {selectedSymbol?.ask?.toFixed(5) || '—'}
                </div>
              </div>
            </div>

            <div className="min-h-[280px] flex-1 overflow-hidden">
              <TradingViewChart symbol={selectedMeta} />
            </div>

            {isAccount && (
              <div className="border-t border-[#1e293b] bg-[#0d1230] p-3">
                {!isAuthenticated ? (
                  <button
                    type="button"
                    onClick={onRequireAuth}
                    className="w-full rounded-xl bg-gradient-to-r from-[#6366f1] to-[#3b82f6] py-3.5 text-sm font-bold uppercase tracking-wide text-white"
                  >
                    Sign in to place orders
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={tradeLoading}
                      onClick={() => onTrade('SELL')}
                      className="rounded-xl bg-gradient-to-b from-[#ef4444] to-[#dc2626] py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-red-900/30 disabled:opacity-50"
                    >
                      Sell {lotSize} lot
                    </button>
                    <button
                      type="button"
                      disabled={tradeLoading}
                      onClick={() => onTrade('BUY')}
                      className="rounded-xl bg-gradient-to-b from-[#22c55e] to-[#16a34a] py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-green-900/30 disabled:opacity-50"
                    >
                      Buy {lotSize} lot
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className={`border-t border-[#1e293b] ${isAccount ? 'h-[120px]' : 'h-[140px]'}`}>
              <BottomPanel positions={positions} onClosePosition={onClosePosition} />
            </div>
          </div>
        )}

        {activeView === 'market' && (
          <div className="h-full min-h-[360px] bg-[#1a1d2e]">
            <MarketWatch
              symbols={symbols}
              selectedSymbol={selectedSymbol}
              dataSource={dataSource}
              embedded={isAccount}
              onSelectSymbol={(symbol) => {
                onSelectSymbol(symbol)
                setActiveView('chart')
              }}
            />
          </div>
        )}

        {activeView === 'order' && (
          <div className="h-full min-h-[360px] bg-gradient-to-br from-[#1a1d2e] via-[#151824] to-[#0f1219]">
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

      {showNav && !isAccount && (
        <div className="relative z-50 flex h-20 items-center justify-around border-t border-[#1e293b] bg-gradient-to-t from-[#111538] via-[#0d1230] to-[#111538] px-2 shadow-2xl">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#6366f1]/5 to-transparent" />
          {/* terminal nav buttons — unchanged pattern */}
          <NavBtn active={activeView === 'chart'} label="Chart" onClick={() => setActiveView('chart')}>
            <BarChart3 className="h-7 w-7" />
          </NavBtn>
          <NavBtn active={activeView === 'market'} label="Market" onClick={() => setActiveView('market')}>
            <List className="h-7 w-7" />
          </NavBtn>
          <NavBtn active={activeView === 'order'} label="Trade" onClick={() => setActiveView('order')}>
            <Zap className="h-7 w-7" />
          </NavBtn>
        </div>
      )}
    </div>
  )
}

function NavBtn({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl px-5 py-2.5 transition-all ${
        active ? 'bg-gradient-to-b from-[#6366f1]/30 to-[#6366f1]/10 text-white' : 'text-[#94a3b8]'
      }`}
    >
      {children}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  )
}
