'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronRight,
  Home,
  LineChart,
  LogOut,
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

export type MobileBankTab = 'home' | 'markets' | 'trade' | 'wallet' | 'profile' | 'settings' | 'notifications' | 'documents' | 'chat'

interface AccountSummary {
  balance: number
  equity: number
  freeMargin: number
  profit: number
}

interface MobileBankingExperienceProps {
  account: AccountSummary
  userName?: string
  onLogout?: () => void
  onLogin?: () => void
  isAuthenticated: boolean
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

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

export default function MobileBankingExperience(props: MobileBankingExperienceProps) {
  const [tab, setTab] = useState<MobileBankTab>('home')
  const { data: transactions = [] } = useTransactions()

  const go = (next: MobileBankTab) => setTab(next)

  const firstName = props.userName?.split(' ')[0] ?? 'Guest'

  return (
    <div className="mobile-banking-app flex h-[100dvh] flex-col bg-[#eef1f6] text-slate-900">
      <header className="bank-mobile-header shrink-0 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Good day</p>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">{firstName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go('notifications')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200/80"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={() => go('profile')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e3a5f] text-sm font-semibold text-white shadow-sm"
            >
              {firstName.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
        <Link href="/landing" className="mt-2 inline-block text-[11px] font-medium text-[#2563eb]">
          Barratt Cooke · TradeMarkets
        </Link>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-24">
        {tab === 'home' && (
          <HomeTab
            account={props.account}
            transactions={transactions}
            positions={props.positions}
            onNavigate={go}
            isAuthenticated={props.isAuthenticated}
            onLogin={props.onLogin}
          />
        )}
        {tab === 'markets' && (
          <MobileTradingView
            layout="banking"
            initialView="market"
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
          />
        )}
        {tab === 'trade' && (
          <MobileTradingView
            layout="banking"
            initialView="chart"
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
          />
        )}
        {tab === 'wallet' && <WalletPage appearance="banking" />}
        {tab === 'profile' && (
          <ProfileBankMenu
            onNavigate={go}
            onLogout={props.onLogout}
            isAuthenticated={props.isAuthenticated}
            onLogin={props.onLogin}
          />
        )}
        {tab === 'settings' && (
          <BankingSubpage title="Settings">
            <SettingsPage />
          </BankingSubpage>
        )}
        {tab === 'notifications' && (
          <BankingSubpage title="Notifications">
            <NotificationsPage />
          </BankingSubpage>
        )}
        {tab === 'documents' && (
          <BankingSubpage title="Documents">
            <DocumentsPage />
          </BankingSubpage>
        )}
        {tab === 'chat' && (
          <BankingSubpage title="Support">
            <ChatPage />
          </BankingSubpage>
        )}
      </main>

      <nav className="bank-mobile-tabbar fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/90 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-end justify-between">
          <TabButton active={tab === 'home'} label="Home" icon={Home} onClick={() => go('home')} />
          <TabButton active={tab === 'markets'} label="Markets" icon={TrendingUp} onClick={() => go('markets')} />
          <TabButton active={tab === 'trade'} label="Trade" icon={LineChart} onClick={() => go('trade')} />
          <TabButton active={tab === 'wallet'} label="Wallet" icon={WalletIcon} onClick={() => go('wallet')} />
          <TabButton active={tab === 'profile'} label="Profile" icon={User} onClick={() => go('profile')} />
        </div>
      </nav>
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
      className={`flex min-w-[4rem] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition ${
        active ? 'text-[#2563eb]' : 'text-slate-400'
      }`}
    >
      <Icon className={`h-6 w-6 ${active ? 'stroke-[2.5]' : 'stroke-2'}`} />
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  )
}

function HomeTab({
  account,
  transactions,
  positions,
  onNavigate,
  isAuthenticated,
  onLogin,
}: {
  account: AccountSummary
  transactions: { id: string; type: string; amount: number; createdAt: string }[]
  positions: any[]
  onNavigate: (tab: MobileBankTab) => void
  isAuthenticated: boolean
  onLogin?: () => void
}) {
  return (
    <div className="space-y-4 pb-4">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f2744] via-[#1e3a5f] to-[#2563eb] p-5 text-white shadow-lg shadow-[#1e3a5f]/25">
        <p className="text-sm font-medium text-blue-100/90">Total balance</p>
        <p className="mt-1 font-mono text-3xl font-bold tracking-tight">{formatMoney(account.balance)}</p>
        <div className="mt-4 flex gap-6 text-sm">
          <div>
            <p className="text-blue-100/80">Equity</p>
            <p className="font-semibold">{formatMoney(account.equity)}</p>
          </div>
          <div>
            <p className="text-blue-100/80">Available</p>
            <p className="font-semibold">{formatMoney(account.freeMargin)}</p>
          </div>
          <div>
            <p className="text-blue-100/80">P/L</p>
            <p className={`font-semibold ${account.profit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              {account.profit >= 0 ? '+' : ''}
              {formatMoney(account.profit)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-4 gap-2">
        <QuickAction icon={ArrowDownLeft} label="Deposit" onClick={() => onNavigate('wallet')} />
        <QuickAction icon={ArrowUpRight} label="Withdraw" onClick={() => onNavigate('wallet')} />
        <QuickAction icon={LineChart} label="Trade" onClick={() => onNavigate('trade')} />
        <QuickAction icon={TrendingUp} label="Markets" onClick={() => onNavigate('markets')} />
      </section>

      {!isAuthenticated && onLogin && (
        <button
          type="button"
          onClick={onLogin}
          className="w-full rounded-2xl bg-[#2563eb] py-3 text-sm font-semibold text-white shadow-sm"
        >
          Sign in to your account
        </button>
      )}

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Open positions</h2>
          <button type="button" onClick={() => onNavigate('trade')} className="text-xs font-semibold text-[#2563eb]">
            View
          </button>
        </div>
        {positions.length === 0 ? (
          <p className="text-sm text-slate-500">No open trades</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {positions.slice(0, 4).map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium text-slate-800">
                  {p.symbol}{' '}
                  <span className="text-xs text-slate-500">{p.side}</span>
                </span>
                <span className={`font-mono font-semibold ${p.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {p.profit >= 0 ? '+' : ''}
                  {formatMoney(p.profit)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
          <button type="button" onClick={() => onNavigate('wallet')} className="text-xs font-semibold text-[#2563eb]">
            See all
          </button>
        </div>
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-500">No transactions yet</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {transactions.slice(0, 5).map((tx) => (
              <li key={tx.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-800">{tx.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`font-mono text-sm font-semibold ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {tx.amount >= 0 ? '+' : ''}
                  {formatMoney(tx.amount)}
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
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl bg-white py-3 shadow-sm ring-1 ring-slate-200/80 active:scale-[0.98]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eff6ff] text-[#2563eb]">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-[11px] font-semibold text-slate-700">{label}</span>
    </button>
  )
}

function ProfileBankMenu({
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
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <ProfilePage appearance="banking" compact />
      </div>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <MenuRow label="Settings" onClick={() => onNavigate('settings')} />
        <MenuRow label="Notifications" onClick={() => onNavigate('notifications')} />
        <MenuRow label="Documents" onClick={() => onNavigate('documents')} />
        <MenuRow label="Support chat" onClick={() => onNavigate('chat')} />
      </div>
      {isAuthenticated ? (
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3 text-sm font-semibold text-red-600 shadow-sm"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      ) : (
        onLogin && (
          <button
            type="button"
            onClick={onLogin}
            className="w-full rounded-2xl bg-[#2563eb] py-3 text-sm font-semibold text-white"
          >
            Sign in
          </button>
        )
      )}
    </div>
  )
}

function BankingSubpage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pb-4">
      <h2 className="mb-3 px-1 text-base font-semibold text-slate-900">{title}</h2>
      <div className="mobile-banking-subpage overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
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
      className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3.5 text-left text-sm font-medium text-slate-800 last:border-0 active:bg-slate-50"
    >
      {label}
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </button>
  )
}
