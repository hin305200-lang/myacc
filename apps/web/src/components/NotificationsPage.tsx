'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  CheckCheck,
  ShieldAlert,
  Wallet,
} from 'lucide-react'
import AccountPageShell, { AccountPanel, AccountStat } from '@/components/AccountPageShell'
import { useAuthStore } from '@/stores/auth-store'
import { useAccountSummary } from '@/hooks/useMarketData'

type NType = 'success' | 'warning' | 'info' | 'risk'

type Notification = {
  id: string
  type: NType
  title: string
  message: string
  time: string
  read: boolean
}

const STORAGE_KEY = 'nexus-notifications-v1'

function iconFor(type: NType) {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-emerald-300" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-300" />
    case 'risk':
      return <ShieldAlert className="h-4 w-4 text-rose-300" />
    default:
      return <Info className="h-4 w-4 text-cyan-300" />
  }
}

function buildLiveNotices(input: {
  status?: string
  kycStatus?: string
  marginLevel: number | null
  freeMargin: number
}): Notification[] {
  const items: Notification[] = []
  const status = String(input.status || '').toUpperCase()
  const kyc = String(input.kycStatus || '').toUpperCase()

  if (status && status !== 'ACTIVE') {
    items.push({
      id: 'acct-pending',
      type: 'warning',
      title: 'Account awaiting approval',
      message: 'Trading stays locked until an admin activates your account after KYC review.',
      time: 'Live',
      read: false,
    })
  }
  if (kyc && kyc !== 'APPROVED' && status !== 'ACTIVE') {
    items.push({
      id: 'kyc-needed',
      type: 'info',
      title: 'KYC incomplete',
      message: 'Open Documents to submit ID and personal details.',
      time: 'Live',
      read: false,
    })
  }
  if (input.marginLevel != null && input.marginLevel > 0 && input.marginLevel < 100) {
    items.push({
      id: 'margin-warn',
      type: 'risk',
      title: 'Margin level warning',
      message: `Margin level is ${input.marginLevel.toFixed(1)}%. Reduce exposure or add funds.`,
      time: 'Live',
      read: false,
    })
  }
  if (input.freeMargin < 5 && status === 'ACTIVE') {
    items.push({
      id: 'low-free',
      type: 'warning',
      title: 'Low free margin',
      message: 'Free margin is nearly exhausted. New orders may be rejected.',
      time: 'Live',
      read: false,
    })
  }
  return items
}

export default function NotificationsPage() {
  const user = useAuthStore((s) => s.user)
  const account = useAccountSummary()
  const [stored, setStored] = useState<Notification[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setStored(JSON.parse(raw))
        return
      }
    } catch {
      /* ignore */
    }
    const seed: Notification[] = [
      {
        id: 'welcome',
        type: 'success',
        title: 'Welcome to TradeMarkets',
        message: 'Complete Tasks and KYC to unlock live trading.',
        time: 'Just now',
        read: false,
      },
      {
        id: 'wallet-tip',
        type: 'info',
        title: 'Funding tip',
        message: 'Deposit requests appear in Wallet and are reviewed by operations.',
        time: 'System',
        read: false,
      },
    ]
    setStored(seed)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
  }, [])

  const live = useMemo(
    () =>
      buildLiveNotices({
        status: user?.status,
        kycStatus: user?.kycStatus,
        marginLevel: account?.marginLevel == null ? null : Number(account.marginLevel),
        freeMargin: Number(account?.freeMargin ?? 0),
      }),
    [user, account]
  )

  const notifications = useMemo(() => {
    const ids = new Set(live.map((n) => n.id))
    return [...live, ...stored.filter((n) => !ids.has(n.id))]
  }, [live, stored])

  const unread = notifications.filter((n) => !n.read).length

  const persist = (next: Notification[]) => {
    setStored(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const markRead = (id: string) => {
    persist(stored.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAll = () => {
    persist(stored.map((n) => ({ ...n, read: true })))
  }

  const remove = (id: string) => {
    persist(stored.filter((n) => n.id !== id))
  }

  return (
    <AccountPageShell
      icon={Bell}
      eyebrow="Alerts"
      title="Notifications"
      subtitle="Live risk signals plus your session notices."
      actions={
        <button
          type="button"
          onClick={markAll}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all read
        </button>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <AccountStat label="Unread" value={String(unread)} accent="amber" />
        <AccountStat label="Live signals" value={String(live.length)} accent="rose" />
        <AccountStat
          label="Free margin"
          value={`$${Number(account?.freeMargin ?? 0).toFixed(2)}`}
          accent="cyan"
          hint="From account summary"
        />
      </div>

      <AccountPanel glow className="!p-0 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Bell className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-400">You&apos;re all caught up</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`flex gap-3 px-4 py-3.5 sm:px-5 ${
                  n.read ? 'bg-transparent' : 'bg-cyan-500/[0.04]'
                }`}
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                  {iconFor(n.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{n.title}</h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{n.message}</p>
                      <p className="mt-1.5 text-[10px] uppercase tracking-wider text-slate-500">{n.time}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!n.read && !live.some((l) => l.id === n.id) ? (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"
                        >
                          Read
                        </button>
                      ) : null}
                      {!live.some((l) => l.id === n.id) ? (
                        <button
                          type="button"
                          onClick={() => remove(n.id)}
                          className="rounded-md p-1 text-slate-500 hover:bg-white/5 hover:text-white"
                          aria-label="Dismiss"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <Wallet className="h-3.5 w-3.5 text-slate-600" />
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AccountPanel>
    </AccountPageShell>
  )
}
