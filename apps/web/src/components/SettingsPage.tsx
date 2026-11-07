'use client'

import { useEffect, useState } from 'react'
import { Settings, Bell, Shield, Monitor, Save, Check } from 'lucide-react'
import AccountPageShell, { AccountPanel } from '@/components/AccountPageShell'
import { useAuthStore } from '@/stores/auth-store'

const STORAGE_KEY = 'nexus-settings-v1'

type Prefs = {
  emailAlerts: boolean
  pushAlerts: boolean
  tradeSounds: boolean
  compactTickets: boolean
  confirmClose: boolean
}

const DEFAULTS: Prefs = {
  emailAlerts: true,
  pushAlerts: true,
  tradeSounds: false,
  compactTickets: false,
  confirmClose: true,
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? 'bg-cyan-500' : 'bg-white/15'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  )
}

function Row({
  title,
  detail,
  checked,
  onChange,
}: {
  title: string
  detail: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="text-xs text-slate-400">{detail}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) })
    } catch {
      /* ignore */
    }
  }, [])

  const update = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }))
    setSaved(false)
  }

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <AccountPageShell
      icon={Settings}
      eyebrow="Preferences"
      title="Settings"
      subtitle="Control alerts, confirmations, and terminal behavior for this device."
      actions={
        <button
          type="button"
          onClick={save}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20"
        >
          {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {saved ? 'Saved' : 'Save preferences'}
        </button>
      }
    >
      <AccountPanel glow>
        <div className="mb-1 flex items-center gap-2">
          <Shield className="h-4 w-4 text-violet-300" />
          <h2 className="text-sm font-semibold text-white">Account</h2>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Signed in as <span className="text-slate-200">{user?.email || 'guest'}</span>
          {user?.status ? (
            <>
              {' '}
              · status <span className="font-mono text-cyan-200">{user.status}</span>
            </>
          ) : null}
        </p>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-xs text-slate-400">
          Password resets and 2FA are handled by support after KYC. Use Chat if you need an account security change.
        </div>
      </AccountPanel>

      <AccountPanel>
        <div className="mb-1 flex items-center gap-2">
          <Bell className="h-4 w-4 text-cyan-300" />
          <h2 className="text-sm font-semibold text-white">Alerts</h2>
        </div>
        <div className="divide-y divide-white/[0.06]">
          <Row
            title="Email alerts"
            detail="Deposits, withdrawals, and KYC status updates"
            checked={prefs.emailAlerts}
            onChange={(v) => update('emailAlerts', v)}
          />
          <Row
            title="Push / browser alerts"
            detail="Margin warnings and fill confirmations in-session"
            checked={prefs.pushAlerts}
            onChange={(v) => update('pushAlerts', v)}
          />
          <Row
            title="Trade sounds"
            detail="Audio cue when an order fills"
            checked={prefs.tradeSounds}
            onChange={(v) => update('tradeSounds', v)}
          />
        </div>
      </AccountPanel>

      <AccountPanel>
        <div className="mb-1 flex items-center gap-2">
          <Monitor className="h-4 w-4 text-emerald-300" />
          <h2 className="text-sm font-semibold text-white">Terminal</h2>
        </div>
        <div className="divide-y divide-white/[0.06]">
          <Row
            title="Compact order ticket"
            detail="Prefer denser lot / SL / TP controls"
            checked={prefs.compactTickets}
            onChange={(v) => update('compactTickets', v)}
          />
          <Row
            title="Confirm before close"
            detail="Ask before closing an open position"
            checked={prefs.confirmClose}
            onChange={(v) => update('confirmClose', v)}
          />
        </div>
      </AccountPanel>
    </AccountPageShell>
  )
}
