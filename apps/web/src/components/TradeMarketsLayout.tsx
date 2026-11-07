'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  Wallet,
  Settings,
  Bell,
  FileText,
  MessageSquare,
  CheckSquare,
  RefreshCw,
  Info,
  LogOut,
  ChevronDown,
  User,
} from 'lucide-react'

interface TradeMarketsLayoutProps {
  children: React.ReactNode
  account: {
    balance: number
    credit: number
    equity: number
    margin: number
    freeMargin: number
    marginLevel: number | null
    profit: number
    floatingProfit?: number
    floatingLoss?: number
    marginAlert?: { level: string; message?: string }
  }
  userId?: string
  onLogout?: () => void
  onLogin?: () => void
  activePage?: string
  onPageChange?: (page: string) => void
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function TradeMarketsLayout({
  children,
  account,
  userId,
  onLogout,
  onLogin,
  activePage = 'chart',
  onPageChange,
}: TradeMarketsLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const money = (value: number) => (userId ? `$${formatCurrency(value)}` : '—')
  const accountLabel = userId
    ? `${userId.slice(0, 5).toUpperCase()} — LIVE (USD)`
    : 'Guest — DEMO (USD)'

  const navItems = [
    { id: 'chart', icon: BarChart3, label: 'Chart' },
    { id: 'wallet', icon: Wallet, label: 'Wallet' },
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'settings', icon: Settings, label: 'Settings' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'reports', icon: FileText, label: 'Documents' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'refresh', icon: RefreshCw, label: 'Refresh' },
    { id: 'info', icon: Info, label: 'Info' },
  ]

  const handleNavClick = (id: string) => {
    if (id === 'refresh') {
      window.location.reload()
      return
    }
    onPageChange?.(id)
    setMenuOpen(false)
  }

  return (
    <div className="h-screen flex flex-col bg-[#12151a] text-white overflow-hidden">
      {/* ModMount-style top account bar */}
      <header className="h-12 flex-shrink-0 bg-[#1a1d21] border-b border-[#2a2e35] flex items-center justify-between px-3 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/landing" className="flex items-center gap-2 hover:opacity-90 shrink-0">
            <div className="h-7 w-7 rounded bg-[#2b3038] flex items-center justify-center border border-[#3a404a]">
              <span className="text-[10px] font-black tracking-tight">TM</span>
            </div>
            <span className="text-sm font-semibold tracking-wide hidden xl:inline">TradeMarkets</span>
          </Link>

          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#2a2e35] bg-[#15181d] text-[11px] text-[#c8cdd5] hover:border-[#3a404a] max-w-[220px]"
            title={accountLabel}
          >
            <span className="truncate font-medium">{accountLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 text-[#6b7280] shrink-0" />
          </button>
        </div>

        <div className="flex items-center gap-5 xl:gap-7 text-[11px] overflow-x-auto scrollbar-none">
          <Metric label="Balance" value={money(account.balance)} sub="USD" />
          <Metric label="Equity" value={money(account.equity)} sub="USD" />
          <Metric label="Free Funds" value={money(account.freeMargin)} sub="USD" />
          <Metric label="Margin" value={money(account.margin)} sub="USD" />
          <Metric
            label="Margin Level"
            value={
              userId
                ? account.marginLevel != null && account.marginLevel > 0
                  ? `${Number(account.marginLevel).toFixed(2)}%`
                  : 'N/A'
                : '—'
            }
          />
          <div className="flex flex-col leading-tight shrink-0">
            <span className="text-[10px] text-[#6b7280] uppercase tracking-wide">Profit</span>
            <span
              className={`font-semibold font-mono text-[13px] ${
                !userId
                  ? 'text-[#6b7280]'
                  : account.profit >= 0
                    ? 'text-[#22c55e]'
                    : 'text-[#ef4444]'
              }`}
            >
              {userId
                ? `${account.profit >= 0 ? '' : '-'}$${formatCurrency(Math.abs(account.profit))}`
                : '—'}
            </span>
          </div>
          {account.marginAlert && account.marginAlert.level !== 'ok' && (
            <div
              className={`text-[10px] font-semibold px-2 py-1 rounded shrink-0 ${
                account.marginAlert.level === 'stop_out'
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-yellow-500/20 text-yellow-200'
              }`}
            >
              {account.marginAlert.level === 'stop_out' ? 'STOP-OUT' : 'MARGIN CALL'}
            </div>
          )}
        </div>

        <div className="relative flex items-center gap-2 shrink-0">
          {userId ? (
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="h-8 w-8 rounded-full bg-[#15181d] border border-[#2a2e35] flex items-center justify-center text-[#9ca3af] hover:text-white hover:border-[#3a404a]"
              aria-label="Profile menu"
            >
              <User className="h-4 w-4" />
            </button>
          ) : (
            onLogin && (
              <button
                type="button"
                onClick={onLogin}
                className="px-3 py-1.5 text-[11px] font-semibold bg-[#2b3038] border border-[#3a404a] rounded hover:bg-[#343a44]"
              >
                Login / Sign Up
              </button>
            )
          )}

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-10 z-50 w-52 rounded-md border border-[#2a2e35] bg-[#1a1d21] shadow-xl py-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = activePage === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full px-3 py-2 flex items-center gap-2 text-left text-xs ${
                        active ? 'bg-[#252830] text-white' : 'text-[#c8cdd5] hover:bg-[#22262c]'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </button>
                  )
                })}
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onLogout()
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2 text-left text-xs text-[#ef4444] hover:bg-[#22262c] border-t border-[#2a2e35] mt-1"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">{children}</div>
    </div>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col leading-tight shrink-0">
      <span className="text-[10px] text-[#6b7280] uppercase tracking-wide">{label}</span>
      <span className="font-semibold font-mono text-[13px] text-white">
        {value}
        {sub ? <span className="ml-1 text-[10px] font-normal text-[#6b7280]">{sub}</span> : null}
      </span>
    </div>
  )
}
