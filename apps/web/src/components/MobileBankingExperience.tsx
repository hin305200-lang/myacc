'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  History,
  LogOut,
  Menu,
  Search,
  Star,
  User,
  X,
} from 'lucide-react'
import MobileTradingView from './MobileTradingView'
import WalletPage from './WalletPage'
import ProfilePage from './ProfilePage'
import SettingsPage from './SettingsPage'
import NotificationsPage from './NotificationsPage'
import DocumentsPage from './DocumentsPage'
import ChatPage from './ChatPage'
import TasksPage from './TasksPage'
import InfoPage from './InfoPage'
import { formatMarginLevelIfAuth, formatPlIfAuth } from '@/lib/account-display'
import { useAuthStore } from '@/stores/auth-store'
import { apiClient } from '@/lib/api-client'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export type MobileBankTab =
  | 'trade'
  | 'positions'
  | 'history'
  | 'account'
  | 'wallet'
  | 'profile'
  | 'settings'
  | 'notifications'
  | 'documents'
  | 'chat'
  | 'tasks'
  | 'info'
  | 'chart'

interface AccountSummary {
  balance: number
  credit: number
  equity: number
  freeMargin: number
  margin: number
  marginLevel: number | null
  profit: number
  floatingProfit?: number
  floatingLoss?: number
}

interface MobileBankingExperienceProps {
  account: AccountSummary
  userName?: string
  accountId?: string
  onLogout?: () => void
  onLogin?: () => void
  onRegister?: () => void
  isAuthenticated: boolean
  selectedSymbol: any
  symbols: any[]
  symbolMeta: Record<string, { icon: string }>
  dataSource?: 'live' | 'delayed' | 'unavailable' | 'simulated'
  onSelectSymbol: (symbol: any) => void
  lotSize: number
  onLotSizeChange: (size: number) => void
  onTrade: (side: 'BUY' | 'SELL', stopLoss?: number, takeProfit?: number) => void
  tradeLoading: boolean
  positions: any[]
  onClosePosition: (id: string) => void
}

const SYMBOL_ICONS: Record<string, string> = {
  EURUSD: '🇪🇺',
  GBPUSD: '🇬🇧',
  USDJPY: '🇯🇵',
  AUDUSD: '🇦🇺',
  EURNOK: '🇳🇴',
  USDQAR: '🇶🇦',
  USDMXN: '🇲🇽',
  BTCUSD: '₿',
  ETHUSD: 'Ξ',
  SOLUSD: '◎',
  XRPUSD: '✕',
  XAUUSD: '🥇',
  XAGUSD: '🥈',
  UKOIL: '🛢',
  USOIL: '🛢',
  SPX500: '📈',
  NAS100: '💻',
  DJI30: '📊',
  DAX40: '🇩🇪',
  AAPL: '🍎',
  MSFT: '🪟',
  AMZN: '📦',
  TSLA: '🚗',
  NVDA: '🎮',
  GOOGL: '🔍',
  META: '📘',
  NFLX: '🎬',
  AMD: '💡',
}

function moneyTone(value: number, auth: boolean) {
  if (!auth) return 'text-[#94a3b8]'
  if (value > 0) return 'text-[#22c55e]'
  if (value < 0) return 'text-[#ef4444]'
  return 'text-white'
}

function formatMoneyEn(value: number, auth: boolean) {
  if (!auth) return '—'
  const abs = Math.abs(value)
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs)
  const sign = value < 0 ? '-' : ''
  return `${sign}${formatted} USD`
}

export default function MobileBankingExperience(props: MobileBankingExperienceProps) {
  const [tab, setTab] = useState<MobileBankTab>('trade')
  const [menuOpen, setMenuOpen] = useState(false)
  const [watchTab, setWatchTab] = useState<'favorites' | 'all'>('favorites')
  const go = (next: MobileBankTab) => {
    setTab(next)
    setMenuOpen(false)
  }
  const auth = props.isAuthenticated
  const requireAuth = props.onLogin ?? (() => {})
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

  const watchSymbols = useMemo(() => {
    if (watchTab === 'favorites') {
      const favs = props.symbols.filter((s) => favorites.includes(s.symbol))
      // If no favorites yet, show a starter set so the screen isn't empty
      return favs.length > 0
        ? favs
        : props.symbols.filter((s) =>
            ['EURUSD', 'GBPUSD', 'XAUUSD', 'XAGUSD', 'BTCUSD', 'USDJPY'].includes(s.symbol)
          )
    }
    return props.symbols
  }, [props.symbols, watchTab, favorites])

  const toggleFavorite = async (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!accessToken) {
      requireAuth()
      return
    }
    const isFav = favorites.includes(symbol)
    if (isFav) await apiClient.delete(`/account/favorites/${symbol}`, accessToken)
    else await apiClient.post('/account/favorites', { symbol }, accessToken)
    queryClient.invalidateQueries({ queryKey: ['favorites'] })
  }

  return (
    <div className="mobile-trading-app flex h-[100dvh] flex-col bg-[#070b1a] text-white">
      {/* Top bar — logo · Deposit · menu */}
      <header className="shrink-0 border-b border-[#1e293b] bg-[#0a0e27]/95 px-3 pt-[max(0.55rem,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 pb-2">
          <Link href="/landing" className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366f1] to-[#3b82f6]">
            <span className="text-sm font-black tracking-tighter text-white">TM</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (auth ? go('wallet') : requireAuth())}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#10b981] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-[0_0_12px_rgba(16,185,129,0.35)]"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Deposit
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center text-white"
              aria-label="Menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Account metrics 2×3 grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-1 pb-3">
          <StatCell
            label="Profit"
            value={auth ? formatMoneyEn(props.account.profit, true) : '—'}
            className={moneyTone(props.account.profit, auth)}
          />
          <StatCell
            label="Margin Level"
            value={formatMarginLevelIfAuth(props.account.marginLevel, auth)}
            className={
              auth && props.account.marginLevel != null && props.account.marginLevel < 100
                ? 'text-[#f472b6]'
                : auth
                  ? 'text-white'
                  : 'text-[#94a3b8]'
            }
          />
          <StatCell
            label="Equity"
            value={formatMoneyEn(props.account.equity, auth)}
            className={moneyTone(props.account.equity, auth)}
          />
          <StatCell
            label="Balance"
            value={formatMoneyEn(props.account.balance, auth)}
            className={moneyTone(props.account.balance, auth)}
          />
          <StatCell
            label="Free Margin"
            value={formatMoneyEn(props.account.freeMargin, auth)}
            className={moneyTone(props.account.freeMargin, auth)}
          />
          <StatCell
            label="Margin"
            value={formatMoneyEn(props.account.margin, auth)}
            className={auth ? 'text-[#22c55e]' : 'text-[#94a3b8]'}
          />
        </div>
      </header>

      {/* News / calendar ticker */}
      <div className="mx-3 mb-2 flex items-center gap-2 overflow-hidden rounded-lg bg-[#111538] px-2.5 py-2">
        <span className="text-base leading-none">🇯🇵</span>
        <span className="font-mono text-[11px] text-[#94a3b8]">23:50</span>
        <span className="min-w-0 flex-1 truncate text-[12px] text-[#e5e7eb]">Foreign Bond Investment</span>
        <span className="shrink-0 text-[10px] text-[#64748b]">Impact</span>
        <span className="flex gap-0.5">
          <span className="h-2 w-2 rounded-[2px] bg-[#22c55e]" />
          <span className="h-2 w-2 rounded-[2px] bg-[#2d3142]" />
          <span className="h-2 w-2 rounded-[2px] bg-[#2d3142]" />
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#64748b]" />
      </div>

      {/* Main sheet */}
      <main className="relative min-h-0 flex-1 overflow-hidden rounded-t-2xl bg-[#111538] shadow-[0_-4px_24px_rgba(99,102,241,0.12)] ring-1 ring-[#1e293b]">
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-[#2d3142]" />
        </div>

        {tab === 'trade' && (
          <div className="flex h-[calc(100%-0.75rem)] flex-col">
            <div className="flex items-center border-b border-[#1e293b]">
              <button
                type="button"
                onClick={() => setWatchTab('favorites')}
                className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium ${
                  watchTab === 'favorites'
                    ? 'text-white border-b-2 border-[#22d3ee]'
                    : 'text-[#64748b]'
                }`}
              >
                <Star className={`h-3.5 w-3.5 ${watchTab === 'favorites' ? 'fill-[#22d3ee] text-[#22d3ee]' : ''}`} />
                Favorites
              </button>
              <button
                type="button"
                onClick={() => setWatchTab('all')}
                className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium ${
                  watchTab === 'all' ? 'text-white border-b-2 border-[#22d3ee]' : 'text-[#64748b]'
                }`}
              >
                <Search className="h-3.5 w-3.5" />
                All Symbols
              </button>
            </div>

            <div className="grid grid-cols-[1.2fr_1fr_0.9fr] px-3 py-2 text-[11px] text-[#64748b]">
              <span>Symbol</span>
              <span className="text-center">Price</span>
              <span className="text-right">Change</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-24">
              {watchSymbols.map((s) => {
                const up = Number(s.changePercent) >= 0
                const price = Number(s.bid || s.price || 0)
                const spreadPts = Math.round(Math.abs(Number(s.ask) - Number(s.bid)) * (price > 50 ? 10 : 100000))
                const low = price * 0.9985
                const high = price * 1.0015
                const closed = s.marketStatus && s.marketStatus !== 'open'
                return (
                  <button
                    key={s.symbol}
                    type="button"
                    onClick={() => {
                      props.onSelectSymbol(s)
                      go('chart')
                    }}
                    className="grid w-full grid-cols-[1.2fr_1fr_0.9fr] items-center border-b border-[#0d1230] px-3 py-3 text-left active:bg-[#111538]"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0d1230] text-sm">
                        {SYMBOL_ICONS[s.symbol] || props.symbolMeta[s.symbol]?.icon || s.symbol.slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-[14px] font-semibold text-white">{s.symbol}</p>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => toggleFavorite(s.symbol, e)}
                            className="text-[#4b5563]"
                          >
                            <Star
                              className={`h-3 w-3 ${
                                favorites.includes(s.symbol) ? 'fill-amber-400 text-amber-400' : ''
                              }`}
                            />
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748b]">Spread: {Math.max(1, spreadPts)}</p>
                      </div>
                    </div>

                    <div className="text-center">
                      {closed ? (
                        <p className="font-mono text-[11px] text-[#f59e0b]">Closed</p>
                      ) : null}
                      <p
                        className={`font-mono text-[15px] font-semibold ${
                          up ? 'text-[#22c55e]' : 'text-[#ef4444]'
                        }`}
                      >
                        {formatPrice(price)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#64748b]">
                        <span className="text-[#22c55e]">L</span>{' '}
                        <span className="font-mono text-[#94a3b8]">{formatPrice(low)}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className={`inline-flex items-center gap-0.5 font-mono text-[13px] font-semibold ${
                          up ? 'text-[#22c55e]' : 'text-[#ef4444]'
                        }`}
                      >
                        <span className="text-[9px]">{up ? '▲' : '▼'}</span>
                        {up ? '' : '-'}
                        {Math.abs(Number(s.changePercent || 0)).toFixed(2)}%
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#64748b]">
                        <span className="text-[#ef4444]">H</span>{' '}
                        <span className="font-mono text-[#94a3b8]">{formatPrice(high)}</span>
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'positions' && (
          <PositionsSheet
            auth={auth}
            positions={props.positions}
            onClose={props.onClosePosition}
            onLogin={requireAuth}
            onTrade={() => go('chart')}
          />
        )}

        {tab === 'history' && (
          <HistorySheet auth={auth} onLogin={requireAuth} onWallet={() => go('wallet')} />
        )}

        {tab === 'account' && (
          <div className="h-full overflow-y-auto px-3 pb-24 pt-2">
            <ProfileTradingMenu
              onNavigate={go}
              onLogout={props.onLogout}
              isAuthenticated={auth}
              onLogin={props.onLogin}
            />
          </div>
        )}

        {tab === 'chart' && (
          <div className="h-[calc(100%-0.5rem)] overflow-hidden pb-16">
            <MobileTradingView
              layout="account"
              initialView="chart"
              isAuthenticated={auth}
              onRequireAuth={requireAuth}
              selectedSymbol={props.selectedSymbol}
              symbols={props.symbols}
              symbolMeta={props.symbolMeta}
              dataSource={props.dataSource}
              onSelectSymbol={props.onSelectSymbol}
              lotSize={props.lotSize}
              onLotSizeChange={props.onLotSizeChange}
              onTrade={props.onTrade}
              tradeLoading={props.tradeLoading}
              positions={props.positions}
              onClosePosition={props.onClosePosition}
              showNav={false}
            />
          </div>
        )}

        {tab === 'wallet' && (
          <div className="h-full overflow-y-auto px-2 pb-24 pt-2">
            {auth ? (
              <div className="overflow-hidden rounded-xl border border-[#1e293b] bg-[#0a0e27]">
                <WalletPage appearance="terminal" />
              </div>
            ) : (
              <GuestGate onLogin={requireAuth} onRegister={props.onRegister ?? requireAuth} />
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="h-full overflow-hidden pb-20">
            <SettingsPage />
          </div>
        )}
        {tab === 'notifications' && (
          <div className="h-full overflow-hidden pb-20">
            <NotificationsPage />
          </div>
        )}
        {tab === 'documents' && (
          <div className="h-full overflow-hidden pb-20">
            <DocumentsPage />
          </div>
        )}
        {tab === 'chat' && (
          <div className="h-full overflow-hidden pb-20">
            <ChatPage />
          </div>
        )}
        {tab === 'tasks' && (
          <div className="h-full overflow-hidden pb-20">
            <TasksPage
              onNavigate={(page) => {
                if (page === 'reports') go('documents')
                else if (page === 'chart') go('trade')
                else go(page as MobileBankTab)
              }}
            />
          </div>
        )}
        {tab === 'info' && (
          <div className="h-full overflow-hidden pb-20">
            <InfoPage
              onNavigate={(page) => {
                if (page === 'reports') go('documents')
                else if (page === 'chart') go('trade')
                else go(page as MobileBankTab)
              }}
            />
          </div>
        )}
        {tab === 'profile' && (
          <div className="h-full overflow-hidden pb-20">
            <ProfilePage appearance="terminal" />
          </div>
        )}
      </main>

      {/* Bottom nav — Trade · Positions · History · Account */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#1e293b] bg-[#0a0e27]/95 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2">
          <NavItem
            active={tab === 'trade' || tab === 'chart'}
            label="Trade"
            icon={BarChart3}
            onClick={() => go('trade')}
          />
          <NavItem
            active={tab === 'positions'}
            label="Positions"
            icon={Briefcase}
            onClick={() => go('positions')}
          />
          <NavItem
            active={tab === 'history'}
            label="History"
            icon={CalendarDays}
            onClick={() => go('history')}
          />
          <NavItem
            active={tab === 'account' || tab === 'profile' || tab === 'wallet'}
            label="Account"
            icon={User}
            onClick={() => go('account')}
          />
        </div>
      </nav>

      {/* Side menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/60" onClick={() => setMenuOpen(false)} />
          <aside className="fixed right-0 top-0 z-[70] flex h-full w-[78%] max-w-xs flex-col bg-[#111538] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e293b] px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <span className="text-sm font-semibold">Menu</span>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close">
                <X className="h-5 w-5 text-[#94a3b8]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {[
                { id: 'trade' as const, label: 'Trade' },
                { id: 'positions' as const, label: 'Positions' },
                { id: 'history' as const, label: 'History' },
                { id: 'wallet' as const, label: 'Deposit / Wallet' },
                { id: 'chat' as const, label: 'Support chat' },
                { id: 'tasks' as const, label: 'Tasks' },
                { id: 'info' as const, label: 'Info' },
                { id: 'settings' as const, label: 'Settings' },
                { id: 'notifications' as const, label: 'Notifications' },
                { id: 'documents' as const, label: 'KYC / Documents' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go(item.id)}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm text-white active:bg-[#0d1230]"
                >
                  {item.label}
                  <ChevronRight className="h-4 w-4 text-[#64748b]" />
                </button>
              ))}
            </div>
            <div className="border-t border-[#1e293b] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {auth ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    props.onLogout?.()
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 py-3 text-sm font-semibold text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    requireAuth()
                  }}
                  className="w-full rounded-lg bg-[#10b981] py-3 text-sm font-semibold text-white"
                >
                  Sign in
                </button>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

function formatPrice(price: number) {
  if (!Number.isFinite(price) || price <= 0) return '—'
  if (price > 1000) return price.toFixed(2)
  if (price > 100) return price.toFixed(2)
  if (price > 10) return price.toFixed(3)
  return price.toFixed(5)
}

function StatCell({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div>
      <p className="text-[11px] text-[#64748b]">{label}</p>
      <p className={`mt-0.5 font-mono text-[17px] font-semibold leading-tight ${className || 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

function NavItem({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[4.25rem] flex-col items-center gap-0.5 px-2 py-1.5 ${
        active ? 'text-[#22d3ee]' : 'text-[#64748b]'
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? 'stroke-[2.4]' : ''}`} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}

function PositionsSheet({
  auth,
  positions,
  onClose,
  onLogin,
  onTrade,
}: {
  auth: boolean
  positions: any[]
  onClose: (id: string) => void
  onLogin: () => void
  onTrade: () => void
}) {
  if (!auth) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm text-[#94a3b8]">Sign in to view open positions.</p>
        <button type="button" onClick={onLogin} className="mt-4 rounded-lg bg-[#10b981] px-4 py-2 text-sm font-semibold">
          Sign in
        </button>
      </div>
    )
  }
  if (positions.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm text-[#94a3b8]">No open positions</p>
        <button type="button" onClick={onTrade} className="mt-4 text-sm font-semibold text-[#22d3ee]">
          Open a trade
        </button>
      </div>
    )
  }
  return (
    <div className="h-full overflow-y-auto px-3 pb-24 pt-2">
      <ul className="space-y-2">
        {positions.map((p) => (
          <li key={p.id} className="rounded-xl border border-[#1e293b] bg-[#111538] p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">
                  {p.symbol}{' '}
                  <span className={p.side === 'BUY' ? 'text-[#22c55e]' : 'text-[#ef4444]'}>{p.side}</span>
                </p>
                <p className="mt-1 font-mono text-[11px] text-[#64748b]">
                  {Number(p.volume).toFixed(2)} lot · {p.openPrice} → {Number(p.currentPrice).toFixed?.(5) ?? p.currentPrice}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-mono text-sm font-semibold ${p.profit >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {formatPlIfAuth(p.profit, true)}
                </p>
                <button
                  type="button"
                  onClick={() => onClose(p.id)}
                  className="mt-1 text-[11px] font-semibold text-[#ef4444]"
                >
                  Close
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function HistorySheet({
  auth,
  onLogin,
  onWallet,
}: {
  auth: boolean
  onLogin: () => void
  onWallet: () => void
}) {
  return (
    <div className="px-4 py-10 text-center">
      <History className="mx-auto h-8 w-8 text-[#64748b]" />
      <p className="mt-3 text-sm text-[#94a3b8]">
        {auth ? 'Closed trades and ledger entries appear in Funds.' : 'Sign in to view trading history.'}
      </p>
      <button
        type="button"
        onClick={auth ? onWallet : onLogin}
        className="mt-4 rounded-lg bg-[#10b981] px-4 py-2 text-sm font-semibold text-white"
      >
        {auth ? 'Open Funds' : 'Sign in'}
      </button>
    </div>
  )
}

function GuestGate({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  return (
    <section className="rounded-xl border border-[#1e293b] bg-[#111538] p-6 text-center">
      <h2 className="text-lg font-bold text-white">Funds & wallet</h2>
      <p className="mt-2 text-sm text-[#94a3b8]">Sign in to deposit, withdraw, and view balances.</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={onLogin} className="rounded-lg bg-[#10b981] py-3 text-sm font-bold text-white">
          Sign in
        </button>
        <button
          type="button"
          onClick={onRegister}
          className="rounded-lg border border-[#1e293b] bg-[#0a0e27] py-3 text-sm font-bold text-white"
        >
          Register
        </button>
      </div>
    </section>
  )
}

function ProfileTradingMenu({
  onNavigate,
  onLogout,
  isAuthenticated,
  onLogin,
}: {
  onNavigate: (tab: MobileBankTab) => void
  onLogout?: () => void
  isAuthenticated: boolean
  onLogin?: () => void
}) {
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN')
  return (
    <div className="space-y-3 pb-4">
      <div className="overflow-hidden rounded-xl border border-[#1e293b] bg-[#111538]">
        <ProfilePage appearance="terminal" compact />
      </div>
      <div className="overflow-hidden rounded-xl border border-[#1e293b] bg-[#111538]">
        <MenuRow label="Deposit / Wallet" onClick={() => onNavigate('wallet')} />
        <MenuRow label="Tasks" onClick={() => onNavigate('tasks')} />
        <MenuRow label="Info" onClick={() => onNavigate('info')} />
        <MenuRow label="Settings" onClick={() => onNavigate('settings')} />
        <MenuRow label="Notifications" onClick={() => onNavigate('notifications')} />
        <MenuRow label="KYC / Documents" onClick={() => onNavigate('documents')} />
        <MenuRow label="Support chat" onClick={() => onNavigate('chat')} />
        {isAdmin && (
          <a
            href="/admin"
            className="flex w-full items-center justify-between border-t border-[#1e293b] px-4 py-3.5 text-left text-sm text-[#a5b4fc]"
          >
            <span>Admin — approve accounts</span>
            <span className="text-[#64748b]">→</span>
          </a>
        )}
      </div>
      {isAuthenticated ? (
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-3 text-sm font-semibold text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      ) : (
        onLogin && (
          <button type="button" onClick={onLogin} className="w-full rounded-xl bg-[#10b981] py-3 text-sm font-bold text-white">
            Sign in
          </button>
        )
      )}
    </div>
  )
}

function SubpageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto px-3 pb-24 pt-2">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#94a3b8]">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-[#1e293b] bg-[#111538]">{children}</div>
    </div>
  )
}

function MenuRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between border-b border-[#1e293b] px-4 py-3.5 text-left text-sm font-medium text-white last:border-0 active:bg-[#0a0e27]"
    >
      {label}
      <ChevronRight className="h-4 w-4 text-[#64748b]" />
    </button>
  )
}
