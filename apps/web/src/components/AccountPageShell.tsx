'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  icon: LucideIcon
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  wide?: boolean
}

/** Shared chrome for account / workspace pages — terminal-grade, not flat boxes. */
export default function AccountPageShell({
  icon: Icon,
  eyebrow = 'Workspace',
  title,
  subtitle,
  actions,
  children,
  wide = false,
}: Props) {
  return (
    <div className="relative h-full overflow-y-auto overflow-x-hidden bg-[#070b1a]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.18),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(34,211,238,0.08),transparent_40%),linear-gradient(180deg,#0a0e27_0%,#070b1a_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className={`relative mx-auto px-3 py-4 sm:px-5 sm:py-6 lg:px-8 ${wide ? 'max-w-6xl' : 'max-w-5xl'}`}>
        <header className="mb-5 sm:mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/90">
              <Icon className="h-3 w-3" />
              {eyebrow}
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">{title}</h1>
            {subtitle ? (
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
        </header>

        <div className="space-y-4 sm:space-y-5">{children}</div>
      </div>
    </div>
  )
}

export function AccountPanel({
  children,
  className = '',
  glow = false,
}: {
  children: ReactNode
  className?: string
  glow?: boolean
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#121833]/95 via-[#0e1428]/90 to-[#0a1020]/95 p-4 sm:p-5 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm ${
        glow ? 'before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-cyan-400/50 before:to-transparent' : ''
      } ${className}`}
    >
      {children}
    </section>
  )
}

export function AccountStat({
  label,
  value,
  hint,
  accent = 'cyan',
}: {
  label: string
  value: string
  hint?: string
  accent?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet'
}) {
  const accents = {
    cyan: 'from-cyan-500/20 to-transparent text-cyan-300',
    emerald: 'from-emerald-500/20 to-transparent text-emerald-300',
    amber: 'from-amber-500/20 to-transparent text-amber-300',
    rose: 'from-rose-500/20 to-transparent text-rose-300',
    violet: 'from-violet-500/20 to-transparent text-violet-300',
  }
  return (
    <div className={`rounded-xl border border-white/[0.06] bg-gradient-to-br ${accents[accent]} p-3.5`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold text-white tabular-nums">{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div> : null}
    </div>
  )
}
