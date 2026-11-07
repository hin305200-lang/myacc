'use client'

import {
  Info,
  Clock,
  Shield,
  Gauge,
  Headphones,
  BookOpen,
  AlertTriangle,
  Globe2,
  Layers,
} from 'lucide-react'
import AccountPageShell, { AccountPanel, AccountStat } from '@/components/AccountPageShell'

const SPECS = [
  { label: 'Default leverage', value: '1:10', note: 'Per-account leverage may differ' },
  { label: 'Min lot size', value: '0.01', note: 'Step 0.01 lots' },
  { label: 'Execution', value: 'Market', note: 'Fill at live BID / ASK' },
  { label: 'Margin call', value: '100%', note: 'Warning when level drops' },
  { label: 'Stop out', value: '50%', note: 'Positions may auto-close' },
  { label: 'Base currency', value: 'USD', note: 'Wallet & P/L settled in USD' },
]

const HOURS = [
  { market: 'FX majors', hours: 'Sun 22:00 – Fri 22:00 UTC', status: 'Session based' },
  { market: 'Metals (XAU/XAG)', hours: 'Aligned with FX hours', status: 'Session based' },
  { market: 'Crypto', hours: '24/7 when feed is live', status: 'Always on' },
  { market: 'Indices / oil', hours: 'Exchange hours (feed dependent)', status: 'Session based' },
]

export default function InfoPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  return (
    <AccountPageShell
      icon={Info}
      eyebrow="Platform"
      title="Info"
      subtitle="Trading rules, market hours, risk controls, and how to get help."
      actions={
        <button
          type="button"
          onClick={() => onNavigate?.('chat')}
          className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/20"
        >
          <Headphones className="h-3.5 w-3.5" />
          Contact support
        </button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AccountStat label="Broker model" value="CFD" hint="TradeMarkets terminal" accent="violet" />
        <AccountStat label="Quote feed" value="Live" hint="BID / ASK executable" accent="cyan" />
        <AccountStat label="KYC" value="Required" hint="Before live trading" accent="amber" />
        <AccountStat label="Support" value="In-app" hint="Chat · Documents" accent="emerald" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AccountPanel glow>
          <div className="mb-3 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-cyan-300" />
            <h2 className="text-sm font-semibold text-white">Trading specifications</h2>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {SPECS.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-3 py-2.5">
                <div>
                  <div className="text-sm text-slate-200">{row.label}</div>
                  <div className="text-[11px] text-slate-500">{row.note}</div>
                </div>
                <div className="font-mono text-sm font-semibold text-cyan-200">{row.value}</div>
              </div>
            ))}
          </div>
        </AccountPanel>

        <AccountPanel glow>
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-300" />
            <h2 className="text-sm font-semibold text-white">Market hours</h2>
          </div>
          <ul className="space-y-2.5">
            {HOURS.map((row) => (
              <li
                key={row.market}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white">{row.market}</span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                    {row.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{row.hours}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            When the feed marks a symbol closed or unavailable, new orders pause and last official BID/ASK stay visible.
          </p>
        </AccountPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AccountPanel>
          <div className="mb-2 flex items-center gap-2 text-emerald-300">
            <Shield className="h-4 w-4" />
            <h3 className="text-sm font-semibold text-white">Account & KYC</h3>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            New accounts stay pending until an admin reviews KYC. Use Documents to upload ID and Chat for status questions.
          </p>
          <button
            type="button"
            onClick={() => onNavigate?.('reports')}
            className="mt-3 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
          >
            Open KYC / Documents →
          </button>
        </AccountPanel>

        <AccountPanel>
          <div className="mb-2 flex items-center gap-2 text-cyan-300">
            <Layers className="h-4 w-4" />
            <h3 className="text-sm font-semibold text-white">Wallet flow</h3>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Deposit and withdrawal requests are reviewed by ops. Free margin updates after approval; open trades reserve margin.
          </p>
          <button
            type="button"
            onClick={() => onNavigate?.('wallet')}
            className="mt-3 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
          >
            Open Wallet →
          </button>
        </AccountPanel>

        <AccountPanel>
          <div className="mb-2 flex items-center gap-2 text-violet-300">
            <BookOpen className="h-4 w-4" />
            <h3 className="text-sm font-semibold text-white">Workspace map</h3>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Chart for execution, Tasks for onboarding, Notifications for alerts, Settings for preferences, Profile for identity.
          </p>
          <button
            type="button"
            onClick={() => onNavigate?.('tasks')}
            className="mt-3 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
          >
            Open Tasks →
          </button>
        </AccountPanel>
      </div>

      <AccountPanel className="border-amber-400/20 bg-amber-500/[0.05]">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <h3 className="text-sm font-semibold text-amber-100">Risk disclosure</h3>
            <p className="mt-1 text-xs leading-relaxed text-amber-100/70">
              Leveraged CFDs can result in losses exceeding deposits. Only trade with capital you can afford to risk.
              Past performance is not a guarantee of future results. Market gaps and feed outages can affect fills and P/L.
            </p>
          </div>
        </div>
      </AccountPanel>

      <AccountPanel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Globe2 className="mt-0.5 h-4 w-4 text-slate-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">TradeMarkets</h3>
              <p className="text-xs text-slate-400">
                Secure trading workspace · live quotes · admin-supervised funding & KYC
              </p>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">barrattcookelimited.com</div>
        </div>
      </AccountPanel>
    </AccountPageShell>
  )
}
