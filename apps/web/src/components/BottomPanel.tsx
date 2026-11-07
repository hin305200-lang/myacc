'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface Position {
  id: string
  openTime: string
  symbol: string
  volume: number
  side: 'BUY' | 'SELL'
  openPrice: number
  currentPrice: number
  stopLoss: number
  takeProfit: number
  swap: number
  commission: number
  profit: number
}

interface BottomPanelProps {
  positions: Position[]
  onClosePosition: (id: string) => void
  onCloseAll?: () => void
}

type Tab = 'open' | 'pending' | 'finance' | 'closed'

export default function BottomPanel({ positions, onClosePosition, onCloseAll }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('open')
  const [closingId, setClosingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  const formatDate = (date: string) => {
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return '—'
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  const formatPrice = (price: number) => {
    if (price > 100) return price.toFixed(2)
    if (price > 10) return price.toFixed(3)
    if (price > 1) return price.toFixed(5)
    return price.toFixed(5)
  }

  const handleClose = async (id: string) => {
    setClosingId(id)
    try {
      await onClosePosition(id)
    } finally {
      setTimeout(() => setClosingId(null), 400)
    }
  }

  const allSelected = positions.length > 0 && positions.every((p) => selected[p.id])
  const toggleAll = () => {
    if (allSelected) {
      setSelected({})
      return
    }
    const next: Record<string, boolean> = {}
    positions.forEach((p) => {
      next[p.id] = true
    })
    setSelected(next)
  }

  const closeSelectedOrAll = async () => {
    const ids = positions.filter((p) => selected[p.id]).map((p) => p.id)
    const targets = ids.length ? ids : positions.map((p) => p.id)
    if (onCloseAll && !ids.length) {
      onCloseAll()
      return
    }
    for (const id of targets) {
      await handleClose(id)
    }
    setSelected({})
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'open', label: 'OPEN POSITIONS' },
    { id: 'pending', label: 'PENDING ORDERS' },
    { id: 'finance', label: 'FINANCE' },
    { id: 'closed', label: 'CLOSED POSITIONS' },
  ]

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-[#1a1d2e] via-[#151824] to-[#0f1219] border-t border-[#2d3142]/50">
      <div className="flex items-center gap-1 px-2 border-b border-[#2d3142]/50 bg-[#252836]/50 backdrop-blur-sm min-h-[36px]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-2 text-[10px] font-semibold tracking-wide rounded-t transition ${
              activeTab === t.id
                ? 'text-white bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] shadow-lg shadow-[#4f46e5]/30'
                : 'text-[#8e92a3] hover:text-white hover:bg-[#2d3142]/50'
            }`}
          >
            {t.label}
            {t.id === 'open' && positions.length > 0 ? (
              <span className="ml-1 text-[#94a3b8]">({positions.length})</span>
            ) : null}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 pr-1">
          <button
            type="button"
            onClick={toggleAll}
            className="text-[10px] text-[#94a3b8] hover:text-white px-2 py-1"
          >
            SELECT ALL
          </button>
          <button
            type="button"
            onClick={closeSelectedOrAll}
            disabled={positions.length === 0}
            className="h-6 w-6 flex items-center justify-center rounded border border-[#1e293b] text-[#94a3b8] hover:text-[#ef4444] hover:border-[#ef4444]/40 disabled:opacity-40"
            title="Close selected / all"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'open' && (
          <table className="w-full text-[11px] min-w-[900px]">
            <thead className="sticky top-0 bg-[#252836] z-10">
              <tr className="text-[9px] uppercase tracking-wide text-[#64748b] border-b border-[#1e293b]">
                <th className="w-8 px-2 py-2" />
                <th className="text-left px-2 py-2 font-medium">Date</th>
                <th className="text-left px-2 py-2 font-medium">Symbol</th>
                <th className="text-right px-2 py-2 font-medium">Volume</th>
                <th className="text-left px-2 py-2 font-medium">Side</th>
                <th className="text-right px-2 py-2 font-medium">Open price</th>
                <th className="text-right px-2 py-2 font-medium">Current price</th>
                <th className="text-right px-2 py-2 font-medium">S/L</th>
                <th className="text-right px-2 py-2 font-medium">T/P</th>
                <th className="text-right px-2 py-2 font-medium">Swap</th>
                <th className="text-right px-2 py-2 font-medium">Net profit</th>
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-10 text-[#64748b]">
                    No open positions
                  </td>
                </tr>
              ) : (
                positions.map((position) => {
                  const isClosing = closingId === position.id
                  const profitUp = position.profit >= 0
                  return (
                    <tr
                      key={position.id}
                      className={`border-b border-[#1e293b] hover:bg-[#252836]/80 ${
                        isClosing ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={!!selected[position.id]}
                          onChange={() =>
                            setSelected((s) => ({ ...s, [position.id]: !s[position.id] }))
                          }
                          className="accent-[#6366f1]"
                        />
                      </td>
                      <td className="px-2 py-2 text-[#94a3b8] font-mono whitespace-nowrap">
                        {formatDate(position.openTime)}
                      </td>
                      <td className="px-2 py-2 font-semibold text-white">{position.symbol}</td>
                      <td className="px-2 py-2 text-right font-mono text-[#e5e7eb]">
                        {position.volume.toFixed(2)}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`font-semibold ${
                            position.side === 'BUY' ? 'text-[#22c55e]' : 'text-[#ef4444]'
                          }`}
                        >
                          {position.side}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-[#e5e7eb]">
                        {formatPrice(position.openPrice)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-[#e5e7eb]">
                        {formatPrice(position.currentPrice)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {position.stopLoss > 0 ? (
                          <span className="font-mono text-[#e5e7eb]">{formatPrice(position.stopLoss)}</span>
                        ) : (
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded border border-[#1e293b] text-[#64748b]">
                            <Plus className="h-3 w-3" />
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {position.takeProfit > 0 ? (
                          <span className="font-mono text-[#e5e7eb]">{formatPrice(position.takeProfit)}</span>
                        ) : (
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded border border-[#1e293b] text-[#64748b]">
                            <Plus className="h-3 w-3" />
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-[#94a3b8]">
                        {position.swap.toFixed(2)}
                      </td>
                      <td
                        className={`px-2 py-2 text-right font-mono font-semibold ${
                          profitUp ? 'text-[#22c55e]' : 'text-[#ef4444]'
                        }`}
                      >
                        {profitUp ? '' : '-'}
                        {Math.abs(position.profit).toFixed(2)} USD
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleClose(position.id)}
                          disabled={isClosing}
                          className="h-6 w-6 inline-flex items-center justify-center rounded text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#1e293b] disabled:opacity-40"
                          title="Close position"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'pending' && (
          <EmptyState label="No pending orders" />
        )}
        {activeTab === 'finance' && (
          <EmptyState label="No finance records" />
        )}
        {activeTab === 'closed' && (
          <EmptyState label="No closed positions" />
        )}
      </div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="h-full min-h-[120px] flex items-center justify-center text-[12px] text-[#64748b]">
      {label}
    </div>
  )
}
