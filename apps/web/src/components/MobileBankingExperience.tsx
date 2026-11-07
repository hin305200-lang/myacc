'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Briefcase,
  ChevronRight,
  LineChart,
  LogOut,
  Radio,
  TrendingDown,
  TrendingUp,
  User,
  Wallet as WalletIcon,
} from 'lucide-react'
import MobileTradingView from './MobileTradingView'
import WalletPage from './WalletPage'
import ProfilePage from './ProfilePage'
import SettingsPage from './SettingsPage'
import NotificationsPage from './NotificationsPage'
import DocumentsPage from './DocumentsPage'
import ChatPage from './ChatPage'
import { useTransactions } from '@/hooks/useMarketData'
import {
  formatMarginLevelIfAuth,
  formatPlIfAuth,
  formatUsdIfAuth,
  maskAccountId,
} from '@/lib/account-display'

export type MobileBankTab =
  | 'home'
  | 'markets'
  | 'trade'
  | 'wallet'
  | 'profile'
  | 'settings'
  | 'notifications'
  | 'documents'
  | 'chat'

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

export default function MobileBankingExperience(props: MobileBankingExperienceProps) {
  const [tab, setTab] = useState<MobileBankTab>('home')
  const { data: transactions = [] } = useTransactions()
  const go = (next: MobileBankTab) => setTab(next)
  const auth = props.isAuthenticated
  const displayName = auth ? (props.userName ?? 'Client') : 'Guest'
  const accountRef = maskAccountId(props.accountId)
  const requireAuth = props.onLogin ?? (() => {})

  const movers = useMemo(() => {
    return [...props.symbols]
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 6)
  }, [props.symbols])

  return (
    <div className="mobile-trading-app flex h-[100dvh] flex-col bg-[#070b1a] text-white">
      <header className="shrink-0 border-b border-[#1e293b] bg-[#0a0e27]/95 px-4 pb-3 pt-[max(0.65rem,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366f1] to-[#3b82f6] text-xs font-black">
                TM
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#64748b]">
                  {auth ? 'Live trading account' : 'Market access only'}
                </p>
                <h1 className="text-sm font-semibold text-white">{displayName}</h1>
                {auth && accountRef && (
                  <p className="font-mono text-[10px] text-[#64748b]">Acct #{accountRef}</p>
                )}
              </div>
            </div>
            <Link href="/landing" className="mt-1 inline-block text-[10px] text-[#6366f1]">
              Barratt Cooke Limited
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {!auth && (
              <button
                type="button"
                onClick={requireAuth}
                className="rounded-lg bg-[#6366f1] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white"
              >
                Sign in
              </button>
            )}
            <LiveBadge live={props.dataSource === 'live'} label={props.dataSource === 'live' ? 'Live' : props.dataSource === 'unavailable' ? 'Down' : 'Delayed'} />
            <button
              type="button"
              onClick={() => go('notifications')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111538] ring-1 ring-[#1e293b]"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4 text-[#94a3b8]" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <MetricChip label="Balance" value={formatUsdIfAuth(props.account.balance, auth)} />
          <MetricChip label="Credit" value={formatUsdIfAuth(props.account.credit, auth)} />
          <MetricChip label="Equity" value={formatUsdIfAuth(props.account.equity, auth)} highlight />
          <MetricChip label="Margin" value={formatUsdIfAuth(props.account.margin, auth)} />
          <MetricChip label="Free margin" value={formatUsdIfAuth(props.account.freeMargin, auth)} />
          <MetricChip
            label="Margin level"
            value={formatMarginLevelIfAuth(props.account.marginLevel, auth)}
          />
          <MetricChip
            label="P/L"
            value={formatPlIfAuth(props.account.profit, auth)}
            tone={auth ? (props.account.profit >= 0 ? 'up' : 'down') : undefined}
          />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-28 pt-4">
        {tab === 'home' && (
          <AccountHomeTab
            account={props.account}
            transactions={transactions}
            positions={props.positions}
            movers={movers}
            symbolMeta={props.symbolMeta}
            onNavigate={go}
            onSelectSymbol={(s) => {
              props.onSelectSymbol(s)
              go('trade')
            }}
            isAuthenticated={props.isAuthenticated}
            onLogin={props.onLogin}
            onRegister={props.onRegister}
          />
        )}
        {tab === 'markets' && (
          <MobileTradingView
            layout="account"
            initialView="market"
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
        )}
        {tab === 'trade' && (
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
        )}
        {tab === 'wallet' &&
          (auth ? (
            <div className="mobile-trading-subpage -mx-1 overflow-hidden rounded-2xl border border-[#1e293b] bg-[#0a0e27]">
              <WalletPage appearance="terminal" />
            </div>
          ) : (
            <GuestFundsPanel onLogin={requireAuth} onRegister={props.onRegister ?? requireAuth} />
          ))}
        {tab === 'profile' && (
          <ProfileTradingMenu
            onNavigate={go}
            onLogout={props.onLogout}
            isAuthenticated={props.isAuthenticated}
            onLogin={props.onLogin}
          />
        )}
        {tab === 'settings' && (
          <TradingSubpage title="Settings">
            <SettingsPage />
          </TradingSubpage>
        )}
        {tab === 'notifications' && (
          <TradingSubpage title="Notifications">
            <NotificationsPage />
          </TradingSubpage>
        )}
        {tab === 'documents' && (
          <TradingSubpage title="Documents">
            <DocumentsPage />
          </TradingSubpage>
        )}
        {tab === 'chat' && (
          <TradingSubpage title="Support">
            <ChatPage />
          </TradingSubpage>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#1e293b] bg-[#0a0e27]/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-end justify-between">
          <TabButton active={tab === 'home'} label="Account" icon={Briefcase} onClick={() => go('home')} />
          <TabButton active={tab === 'markets'} label="Markets" icon={TrendingUp} onClick={() => go('markets')} />
          <TabButton active={tab === 'trade'} label="Trade" icon={LineChart} onClick={() => go('trade')} />
          <TabButton active={tab === 'wallet'} label="Funds" icon={WalletIcon} onClick={() => go('wallet')} />
          <TabButton active={tab === 'profile'} label="Profile" icon={User} onClick={() => go('profile')} />
        </div>
      </nav>
    </div>
  )
}

function LiveBadge({ live, label }: { live: boolean; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
        live ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/25'
      }`}
    >
      <Radio className={`h-3 w-3 ${live ? 'animate-pulse' : ''}`} />
      {label || (live ? 'Live' : 'Delayed')}
    </span>
  )
}

function MetricChip({
  label,
  value,
  highlight,
  tone,
}: {
  label: string
  value: string
  highlight?: boolean
  tone?: 'up' | 'down'
}) {
  return (
    <div
      className={`shrink-0 rounded-xl px-3 py-2 ring-1 ${
        highlight ? 'bg-[#6366f1]/15 ring-[#6366f1]/40' : 'bg-[#111538] ring-[#1e293b]'
      }`}
    >
      <p className="text-[9px] font-semibold uppercase tracking-wider text-[#64748b]">{label}</p>
      <p
        className={`font-mono text-xs font-bold ${
          tone === 'up' ? 'text-emerald-400' : tone === 'down' ? 'text-red-400' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function TabButton({
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
      className={`flex min-w-[3.5rem] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition ${
        active ? 'text-[#22d3ee]' : 'text-[#64748b]'
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : 'stroke-2'}`} />
      <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
      {active && <span className="h-0.5 w-5 rounded-full bg-[#22d3ee]" />}
    </button>
  )
}

function AccountHomeTab({
  account,
  transactions,
  positions,
  movers,
  symbolMeta,
  onNavigate,
  onSelectSymbol,
  isAuthenticated,
  onLogin,
  onRegister,
}: {
  account: AccountSummary
  transactions: { id: string; type: string; amount: number; createdAt: string }[]
  positions: any[]
  movers: any[]
  symbolMeta: Record<string, { icon: string }>
  onNavigate: (tab: MobileBankTab) => void
  onSelectSymbol: (symbol: any) => void
  isAuthenticated: boolean
  onLogin?: () => void
  onRegister?: () => void
}) {
  const auth = isAuthenticated

  return (
    <div className="space-y-4 pb-4">
      {!auth ? (
        <section className="relative overflow-hidden rounded-2xl border border-[#1e293b] bg-[#111538] p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#64748b]">Client portal</p>
          <h2 className="mt-2 text-xl font-bold text-white">Sign in to your trading account</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">
            Balances, margin, and positions are shown only after login. You can still browse live markets and charts.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onLogin}
              className="rounded-xl bg-[#6366f1] py-3 text-sm font-bold text-white"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="rounded-xl border border-[#6366f1]/50 bg-[#0d1230] py-3 text-sm font-bold text-[#a5b4fc]"
            >
              Open account
            </button>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-2xl border border-[#6366f1]/30 bg-gradient-to-br from-[#111538] via-[#0d1230] to-[#070b1a] p-5 shadow-[0_0_40px_rgba(99,102,241,0.12)]">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#6366f1]/20 blur-2xl" />
          <p className="text-xs font-medium uppercase tracking-widest text-[#94a3b8]">Account equity</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-tight text-white">
            {formatUsdIfAuth(account.equity, true)}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-[#0a0e27]/80 py-2 ring-1 ring-[#1e293b]">
              <p className="text-[9px] uppercase text-[#64748b]">Margin lvl</p>
              <p className="font-mono text-sm font-semibold text-[#22d3ee]">
                {formatMarginLevelIfAuth(account.marginLevel, true)}
              </p>
            </div>
            <div className="rounded-xl bg-[#0a0e27]/80 py-2 ring-1 ring-[#1e293b]">
              <p className="text-[9px] uppercase text-[#64748b]">Open P/L</p>
              <p
                className={`font-mono text-sm font-semibold ${account.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {formatPlIfAuth(account.profit, true)}
              </p>
            </div>
            <div className="rounded-xl bg-[#0a0e27]/80 py-2 ring-1 ring-[#1e293b]">
              <p className="text-[9px] uppercase text-[#64748b]">Positions</p>
              <p className="font-mono text-sm font-semibold text-white">{positions.length}</p>
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-4 gap-2">
        <QuickAction
          icon={LineChart}
          label="Trade"
          onClick={() => (auth ? onNavigate('trade') : onLogin?.())}
          accent="purple"
        />
        <QuickAction icon={TrendingUp} label="Markets" onClick={() => onNavigate('markets')} accent="cyan" />
        <QuickAction
          icon={ArrowDownLeft}
          label="Deposit"
          onClick={() => (auth ? onNavigate('wallet') : onLogin?.())}
          accent="green"
        />
        <QuickAction
          icon={ArrowUpRight}
          label="Withdraw"
          onClick={() => (auth ? onNavigate('wallet') : onLogin?.())}
          accent="amber"
        />
      </section>

      <section className="rounded-2xl border border-[#1e293b] bg-[#111538] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Activity className="h-4 w-4 text-[#22d3ee]" />
            Market movers
          </h2>
          <button type="button" onClick={() => onNavigate('markets')} className="text-xs font-semibold text-[#6366f1]">
            Watchlist
          </button>
        </div>
        <ul className="space-y-2">
          {movers.map((s) => {
            const up = s.changePercent >= 0
            return (
              <li key={s.symbol}>
                <button
                  type="button"
                  onClick={() => onSelectSymbol(s)}
                  className="flex w-full items-center justify-between rounded-xl bg-[#0d1230] px-3 py-2.5 ring-1 ring-[#1e293b] active:bg-[#161b3d]"
                >
                  <div className="flex items-center gap-2 text-left">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#161b3d] text-xs font-bold">
                      {symbolMeta[s.symbol]?.icon ?? s.symbol.slice(0, 2)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{s.symbol}</p>
                      <p className="font-mono text-[11px] text-[#94a3b8]">{s.bid?.toFixed(5)}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-lg px-2 py-1 font-mono text-xs font-bold ${
                      up ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {up ? '+' : ''}
                    {s.changePercent?.toFixed(2)}%
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-[#1e293b] bg-[#111538] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Open positions</h2>
          <button type="button" onClick={() => onNavigate('trade')} className="text-xs font-semibold text-[#6366f1]">
            Terminal
          </button>
        </div>
        {!auth ? (
          <p className="text-sm text-[#64748b]">Sign in to view open positions and margin usage.</p>
        ) : positions.length === 0 ? (
          <p className="text-sm text-[#64748b]">No open trades — tap Trade to open a position.</p>
        ) : (
          <ul className="space-y-2">
            {positions.map((p) => (
              <li
                key={p.id}
                className="rounded-xl bg-[#0d1230] px-3 py-3 ring-1 ring-[#1e293b]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">
                      {p.symbol}{' '}
                      <span className={`text-xs ${p.side === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{p.side}</span>
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-[#64748b]">
                      {p.volume} lot · open {p.openPrice} → {p.currentPrice?.toFixed?.(5) ?? p.currentPrice}
                    </p>
                  </div>
                  <p className={`font-mono text-sm font-bold ${p.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatPlIfAuth(p.profit, true)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[#1e293b] bg-[#111538] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Account ledger</h2>
          <button type="button" onClick={() => onNavigate('wallet')} className="text-xs font-semibold text-[#6366f1]">
            Funds
          </button>
        </div>
        {!auth ? (
          <p className="text-sm text-[#64748b]">Account ledger available after sign in.</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-[#64748b]">No ledger entries yet</p>
        ) : (
          <ul className="divide-y divide-[#1e293b]">
            {transactions.slice(0, 6).map((tx) => (
              <li key={tx.id} className="flex items-center justify-between py-2.5 first:pt-0">
                <div>
                  <p className="text-sm font-medium text-white">{tx.type.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-[#64748b]">{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
                <span className={`font-mono text-sm font-semibold ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatPlIfAuth(tx.amount, true)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  accent: 'purple' | 'cyan' | 'green' | 'amber'
}) {
  const ring =
    accent === 'purple'
      ? 'ring-[#6366f1]/40 text-[#a5b4fc]'
      : accent === 'cyan'
        ? 'ring-[#22d3ee]/40 text-[#22d3ee]'
        : accent === 'green'
          ? 'ring-emerald-500/40 text-emerald-400'
          : 'ring-amber-500/40 text-amber-400'
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-[#1e293b] bg-[#111538] py-3 active:scale-[0.98]"
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-[#0d1230] ring-1 ${ring}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">{label}</span>
    </button>
  )
}

function GuestFundsPanel({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  return (
    <section className="rounded-2xl border border-[#1e293b] bg-[#111538] p-6 text-center">
      <WalletIcon className="mx-auto h-10 w-10 text-[#6366f1]" />
      <h2 className="mt-3 text-lg font-bold text-white">Funds & wallet</h2>
      <p className="mt-2 text-sm text-[#94a3b8]">
        Deposits, withdrawals, and balances are linked to your trading account. Sign in to continue.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={onLogin} className="rounded-xl bg-[#6366f1] py-3 text-sm font-bold text-white">
          Sign in
        </button>
        <button
          type="button"
          onClick={onRegister}
          className="rounded-xl border border-[#1e293b] bg-[#0d1230] py-3 text-sm font-bold text-white"
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
  return (
    <div className="space-y-4 pb-4">
      <div className="overflow-hidden rounded-2xl border border-[#1e293b] bg-[#111538]">
        <ProfilePage appearance="terminal" compact />
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#1e293b] bg-[#111538]">
        <MenuRow label="Settings" onClick={() => onNavigate('settings')} />
        <MenuRow label="Notifications" onClick={() => onNavigate('notifications')} />
        <MenuRow label="Documents & reports" onClick={() => onNavigate('documents')} />
        <MenuRow label="Support chat" onClick={() => onNavigate('chat')} />
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
          <button
            type="button"
            onClick={onLogin}
            className="w-full rounded-xl bg-[#6366f1] py-3 text-sm font-bold text-white"
          >
            Sign in
          </button>
        )
      )}
    </div>
  )
}

function TradingSubpage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pb-4">
      <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wide text-[#94a3b8]">{title}</h2>
      <div className="mobile-trading-subpage overflow-hidden rounded-2xl border border-[#1e293b] bg-[#111538]">
        {children}
      </div>
    </div>
  )
}

function MenuRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between border-b border-[#1e293b] px-4 py-3.5 text-left text-sm font-medium text-white last:border-0 active:bg-[#0d1230]"
    >
      {label}
      <ChevronRight className="h-4 w-4 text-[#64748b]" />
    </button>
  )
}
