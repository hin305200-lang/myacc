'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  BarChart3, Wallet, Settings, Bell, FileText, MessageSquare, 
  CheckSquare, RefreshCw, Info, LogOut, Menu, X, User
} from 'lucide-react'

interface TradeMarketsLayoutProps {
  children: React.ReactNode
  account: {
    balance: number
    credit: number
    equity: number
    margin: number
    freeMargin: number
    marginLevel: number
    profit: number
  }
  userId?: string
  onLogout?: () => void
  onLogin?: () => void
  activePage?: string
  onPageChange?: (page: string) => void
}

export default function TradeMarketsLayout({ 
  children, 
  account, 
  userId,
  onLogout,
  onLogin,
  activePage = 'chart',
  onPageChange
}: TradeMarketsLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeNav, setActiveNav] = useState(activePage)

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
    setActiveNav(id)
    onPageChange?.(id)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const money = (value: number) => (userId ? `$${formatCurrency(value)}` : '—')

  return (
    <div className="h-screen flex flex-col bg-[#0a0e27] text-white overflow-hidden">
      {/* Top Header */}
      <div className="h-auto min-h-[56px] bg-[#111538] border-b border-[#1e293b] flex flex-col sm:flex-row items-start sm:items-center justify-between px-2 sm:px-4 py-2 sm:py-0 flex-shrink-0 shadow-sm">
        {/* Logo */}
        <Link href="/landing" className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition cursor-pointer mb-2 sm:mb-0">
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded bg-gradient-to-br from-[#6366f1] to-[#3b82f6] flex items-center justify-center">
            <span className="text-xs sm:text-sm font-black text-white">TM</span>
          </div>
          <span className="text-base sm:text-lg font-semibold text-white">TradeMarkets</span>
        </Link>

        {/* Account Summary - Responsive */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 lg:gap-6 text-[10px] sm:text-xs w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex flex-col">
            <span className="text-[#94a3b8]">Balance</span>
            <span className="text-white font-semibold text-xs sm:text-sm">{money(account.balance)}</span>
          </div>
          <div className="flex flex-col hidden sm:flex">
            <span className="text-[#94a3b8]">Credit</span>
            <span className="text-white font-semibold text-xs sm:text-sm">{money(account.credit)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#94a3b8]">Equity</span>
            <span className="text-white font-semibold text-xs sm:text-sm">{money(account.equity)}</span>
          </div>
          <div className="flex flex-col hidden md:flex">
            <span className="text-[#94a3b8]">Margin</span>
            <span className="text-white font-semibold text-xs sm:text-sm">{money(account.margin)}</span>
          </div>
          <div className="flex flex-col hidden lg:flex">
            <span className="text-[#94a3b8]">Free margin</span>
            <span className="text-white font-semibold text-xs sm:text-sm">{money(account.freeMargin)}</span>
          </div>
          <div className="flex flex-col hidden xl:flex">
            <span className="text-[#94a3b8]">Margin level</span>
            <span className="text-white font-semibold text-xs sm:text-sm">
              {userId ? (account.marginLevel > 0 ? `${Number(account.marginLevel).toFixed(2)}%` : '—') : '—'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#94a3b8]">P/L</span>
            <span className={`font-semibold text-xs sm:text-sm ${userId && account.profit >= 0 ? 'text-[#22c55e]' : userId ? 'text-[#ef4444]' : 'text-[#94a3b8]'}`}>
              {userId ? `${account.profit >= 0 ? '+' : ''}$${formatCurrency(account.profit)}` : '—'}
            </span>
          </div>
        </div>

        {/* User ID and Menu */}
        <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-0 w-full sm:w-auto justify-end">
          {userId ? (
            <>
              <span className="text-[10px] sm:text-xs text-[#94a3b8] hidden sm:inline">{userId.substring(0, 8)}</span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs text-[#94a3b8] hover:text-white hover:bg-[#1e293b] rounded transition"
                >
                  Logout
                </button>
              )}
            </>
          ) : (
            onLogin && (
              <button
                onClick={onLogin}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold bg-[#6366f1] text-white rounded hover:bg-[#4f46e5] transition"
              >
                Login / Sign Up
              </button>
            )
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 sm:p-2 hover:bg-[#1e293b] rounded transition text-[#94a3b8]"
          >
            <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation - Responsive */}
        {sidebarOpen && (
          <div className="hidden sm:flex w-14 lg:w-16 bg-[#111538] border-r border-[#1e293b] flex-col items-center py-3 sm:py-4 gap-2 flex-shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeNav === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded transition ${
                    isActive 
                      ? 'bg-[#6366f1] text-white' 
                      : 'text-[#94a3b8] hover:bg-[#1e293b] hover:text-white'
                  }`}
                  title={item.label}
                >
                  <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
                </button>
              )
            })}
            <div className="flex-1" />
            <button
              onClick={onLogout}
              className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded text-[#94a3b8] hover:bg-[#1e293b] hover:text-white transition"
              title="Logout"
            >
              <LogOut className="h-4 w-4 lg:h-5 lg:w-5" />
            </button>
            <div className="text-[8px] text-[#64748b] mt-2 text-center px-1">
              Ver: 5.6.95
            </div>
          </div>
        )}
        
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="sm:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
        )}
        {sidebarOpen && (
          <div className="sm:hidden fixed left-0 top-14 bottom-0 w-64 bg-[#111538] border-r border-[#1e293b] flex flex-col py-4 gap-2 z-50 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeNav === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleNavClick(item.id)
                    setSidebarOpen(false)
                  }}
                  className={`w-full px-4 py-3 flex items-center gap-3 rounded transition ${
                    isActive 
                      ? 'bg-[#6366f1] text-white' 
                      : 'text-[#94a3b8] hover:bg-[#1e293b] hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              )
            })}
            <div className="flex-1" />
            <button
              onClick={onLogout}
              className="w-full px-4 py-3 flex items-center gap-3 rounded text-[#94a3b8] hover:bg-[#1e293b] hover:text-white transition"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
