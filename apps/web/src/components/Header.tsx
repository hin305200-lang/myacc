'use client'

import { User, ChevronDown } from 'lucide-react'

interface HeaderProps {
  account: {
    balance: number
    credit?: number
    equity: number
    freeMargin: number
    margin: number
    marginLevel: number
    profit?: number
  }
  currentTime: Date
  onOpenProfile: () => void
  onOpenChat: () => void
}

export default function Header({ account, currentTime, onOpenProfile, onOpenChat }: HeaderProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) + ' ' + date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' UTC+0'
  }

  return (
    <header className="h-14 bg-bg-panel border-b border-[#1e293b] flex items-center justify-between px-4">
      {/* Logo & Account Selector */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
            <span className="text-white font-bold">N</span>
          </div>
          <span className="font-bold text-lg hidden xl:block">Nexus Trade</span>
        </div>

        {/* Account Selector */}
        <button className="flex items-center gap-2 px-3 py-1.5 bg-bg-secondary border border-[#1e293b] rounded-md hover:border-accent-purple transition-colors">
          <span className="text-sm">10038 - 360 DEMO (USD)</span>
          <ChevronDown size={16} className="text-[#64748b]" />
        </button>
      </div>

      {/* Stats — Balance / Credit / Equity / Free Margin / Margin / Margin Level / Floating P/L */}
      <div className="flex items-center gap-6">
        <StatItem label="BALANCE" value={account.balance} currency="USD" />
        <StatItem label="CREDIT" value={account.credit ?? 0} currency="USD" />
        <StatItem label="EQUITY" value={account.equity} currency="USD" />
        <StatItem label="FREE MARGIN" value={account.freeMargin} currency="USD" />
        <StatItem label="MARGIN" value={account.margin} currency="USD" />
        <StatItem label="MARGIN LEVEL" value={account.marginLevel} suffix="%" />
        
        {/* Floating P/L */}
        <div className="px-4 py-2 bg-accent-cyan/10 border border-accent-cyan rounded-md">
          <div className="text-[10px] text-[#64748b] uppercase tracking-wide">Floating P/L</div>
          <div className="text-accent-cyan font-bold font-mono">
            {(account.profit ?? 0).toFixed(2)} <span className="text-xs font-normal">USD</span>
          </div>
        </div>
      </div>

      {/* Time & User */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-[10px] text-[#64748b] uppercase">Platform Time</div>
          <div className="text-xs text-[#94a3b8]">{formatTime(currentTime)}</div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenChat}
            className="px-3 py-2 rounded bg-bg-secondary border border-[#1e293b] hover:border-accent-purple text-xs"
          >
            Chat
          </button>
          <button
            onClick={onOpenProfile}
            className="w-9 h-9 rounded-full bg-bg-secondary border-2 border-[#1e293b] hover:border-accent-purple transition-colors flex items-center justify-center"
          >
            <User size={18} className="text-[#94a3b8]" />
          </button>
        </div>
      </div>
    </header>
  )
}

function StatItem({ 
  label, 
  value, 
  currency, 
  suffix 
}: { 
  label: string
  value: number
  currency?: string
  suffix?: string
}) {
  const formatValue = (val: number) => {
    if (val >= 1000) {
      return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    return val.toFixed(2)
  }

  return (
    <div className="text-center">
      <div className="text-[10px] text-[#64748b] uppercase tracking-wide">{label}</div>
      <div className="text-sm font-semibold font-mono">
        {formatValue(value)}{suffix}
      </div>
      {currency && <div className="text-[10px] text-[#64748b]">{currency}</div>}
    </div>
  )
}

