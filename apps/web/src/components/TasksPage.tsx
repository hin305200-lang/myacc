'use client'

import { useMemo } from 'react'
import {
  CheckSquare,
  Circle,
  CheckCircle2,
  FileText,
  Wallet,
  BarChart3,
  User,
  MessageSquare,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import AccountPageShell, { AccountPanel, AccountStat } from '@/components/AccountPageShell'
import { useAuthStore } from '@/stores/auth-store'
import { useAccountSummary, useOpenPositions, useAccountDashboard } from '@/hooks/useMarketData'
import { useProfile } from '@/hooks/useProfile'

type TaskId = 'profile' | 'kyc' | 'deposit' | 'trade' | 'chat'

type Task = {
  id: TaskId
  title: string
  detail: string
  done: boolean
  page: string
  icon: typeof FileText
}

export default function TasksPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const account = useAccountSummary()
  const { positions } = useOpenPositions()
  const { data: dashboard } = useAccountDashboard()
  const { profile } = useProfile()

  const tasks = useMemo<Task[]>(() => {
    const kycOk =
      String(user?.kycStatus || '').toUpperCase() === 'APPROVED' ||
      String(user?.status || '').toUpperCase() === 'ACTIVE'
    const accountActive = String(user?.status || '').toUpperCase() === 'ACTIVE'
    const hasDeposit =
      Number(account?.balance ?? 0) > 0 ||
      (dashboard?.recentDeposits?.length ?? 0) > 0
    const hasTrade = (positions?.length ?? 0) > 0
    const profileComplete = Boolean(profile?.fullName?.trim() && profile?.phoneNumber?.trim())

    return [
      {
        id: 'profile' as const,
        title: 'Complete your profile',
        detail: 'Add full name and phone so support can verify your account.',
        done: profileComplete,
        page: 'profile',
        icon: User,
      },
      {
        id: 'kyc' as const,
        title: 'Submit KYC documents',
        detail: 'Upload ID and personal details. Trading unlocks after admin approval.',
        done: kycOk && accountActive,
        page: 'reports',
        icon: FileText,
      },
      {
        id: 'deposit' as const,
        title: 'Fund your wallet',
        detail: 'Request a deposit so free margin is available for market orders.',
        done: hasDeposit,
        page: 'wallet',
        icon: Wallet,
      },
      {
        id: 'trade' as const,
        title: 'Place your first trade',
        detail: 'Open a BUY or SELL from the chart once the account is approved.',
        done: hasTrade,
        page: 'chart',
        icon: BarChart3,
      },
      {
        id: 'chat' as const,
        title: 'Message support (optional)',
        detail: 'Ask about deposits, KYC status, or platform questions in Chat.',
        done: false,
        page: 'chat',
        icon: MessageSquare,
      },
    ].map((t) => (t.id === 'chat' ? { ...t, done: false } : t))
  }, [user, account, dashboard, positions, profile])

  const required = tasks.filter((t) => t.id !== 'chat')
  const doneCount = required.filter((t) => t.done).length
  const pct = Math.round((doneCount / Math.max(1, required.length)) * 100)

  if (!accessToken) {
    return (
      <AccountPageShell
        icon={CheckSquare}
        eyebrow="Onboarding"
        title="Tasks"
        subtitle="Sign in to track your account setup checklist."
      >
        <AccountPanel glow>
          <p className="text-sm text-slate-300">Log in from the header to unlock guided setup tasks.</p>
        </AccountPanel>
      </AccountPageShell>
    )
  }

  return (
    <AccountPageShell
      icon={CheckSquare}
      eyebrow="Onboarding"
      title="Tasks"
      subtitle="Finish these steps to get fully funded and trading-ready."
      actions={
        <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200">
          {doneCount}/{required.length} complete · {pct}%
        </div>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AccountStat label="Progress" value={`${pct}%`} hint="Required steps" accent="cyan" />
        <AccountStat label="Done" value={String(doneCount)} hint="Completed" accent="emerald" />
        <AccountStat
          label="Remaining"
          value={String(required.length - doneCount)}
          hint="Still open"
          accent="amber"
        />
        <AccountStat
          label="Status"
          value={String(user?.status || '—')}
          hint={`KYC ${String(user?.kycStatus || 'pending')}`}
          accent="violet"
        />
      </div>

      <AccountPanel glow>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-300" />
          <h2 className="text-sm font-semibold text-white">Setup checklist</h2>
        </div>
        <div className="mb-5 h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <ul className="space-y-3">
          {tasks.map((task) => {
            const Icon = task.icon
            return (
              <li
                key={task.id}
                className={`group flex flex-col gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:justify-between ${
                  task.done
                    ? 'border-emerald-400/20 bg-emerald-500/[0.06]'
                    : 'border-white/[0.07] bg-white/[0.02] hover:border-cyan-400/25 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                      task.done
                        ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                        : 'border-white/10 bg-white/5 text-slate-300'
                    }`}
                  >
                    {task.done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-slate-400" />
                      <p className="text-sm font-semibold text-white">{task.title}</p>
                      {task.id === 'chat' ? (
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                          Optional
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{task.detail}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate?.(task.page)}
                  className="inline-flex items-center justify-center gap-1.5 self-stretch rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white transition hover:border-cyan-400/40 hover:bg-cyan-400/10 sm:self-center"
                >
                  {task.done ? 'Open' : 'Continue'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      </AccountPanel>
    </AccountPageShell>
  )
}
