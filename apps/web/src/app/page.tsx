'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import TradingViewChart from '@/components/TradingViewChart'
import TradeMarketsLayout from '@/components/TradeMarketsLayout'
import MarketWatch from '@/components/MarketWatch'
import OrderPanel from '@/components/OrderPanel'
import BottomPanel from '@/components/BottomPanel'
import MobileBankingExperience from '@/components/MobileBankingExperience'
import WalletPage from '@/components/WalletPage'
import SettingsPage from '@/components/SettingsPage'
import NotificationsPage from '@/components/NotificationsPage'
import DocumentsPage from '@/components/DocumentsPage'
import ProfilePage from '@/components/ProfilePage'
import ChatPage from '@/components/ChatPage'
import { AuthModal } from '@/components/AuthModal'
import { Toast } from '@/components/Toast'
import { useAuthStore, type UserPayload } from '@/stores/auth-store'
import { apiClient } from '@/lib/api-client'
import {
  useAccountSummary,
  useOpenPositions,
  useSymbolsWithSocket,
  useMarketCatalog,
  type MarketSymbol,
} from '@/hooks/useMarketData'
import { useLiveMarketTicks } from '@/hooks/useLiveMarketTicks'
import { contractSize } from '@/lib/contract-sizes'
import { isDemoAutoLoginEnabled } from '@/lib/public-env'
import { useQueryClient } from '@tanstack/react-query'
import { EMPTY_TRADING_ACCOUNT } from '@/lib/account-display'

const symbolMeta: Record<string, { icon: string }> = {
  EURUSD: { icon: '€' },
  GBPUSD: { icon: '£' },
  USDQAR: { icon: '$' },
  USDMXN: { icon: '$' },
  EURNOK: { icon: 'kr' },
  USDJPY: { icon: '¥' },
  AUDUSD: { icon: 'A$' },
  BTCUSD: { icon: '₿' },
  ETHUSD: { icon: 'Ξ' },
  SOLUSD: { icon: '◎' },
  XRPUSD: { icon: '✕' },
  XAUUSD: { icon: '🥇' },
  XAGUSD: { icon: '🥈' },
  UKOIL: { icon: '🛢' },
  USOIL: { icon: '🛢' },
  SPX500: { icon: 'S&P' },
  NAS100: { icon: 'NDX' },
  DJI30: { icon: 'DJI' },
  DAX40: { icon: 'DAX' },
  AAPL: { icon: '🍎' },
  MSFT: { icon: 'MS' },
  AMZN: { icon: 'AZ' },
  TSLA: { icon: 'TS' },
  NVDA: { icon: 'NV' },
  GOOGL: { icon: 'GG' },
  META: { icon: 'FB' },
  NFLX: { icon: 'NF' },
  AMD: { icon: 'AMD' },
}

export default function TradingPlatform() {
  const { user, accessToken, refreshToken, setCredentials, logout: storeLogout, _hasHydrated } =
    useAuthStore()
  const queryClient = useQueryClient()
  const logout = () => {
    storeLogout()
    queryClient.removeQueries({ queryKey: ['account-summary'] })
    queryClient.removeQueries({ queryKey: ['account-dashboard'] })
    queryClient.removeQueries({ queryKey: ['account-transactions'] })
    queryClient.removeQueries({ queryKey: ['positions-open'] })
  }
  const [activePage, setActivePage] = useState('chart')
  const accountSummary = useAccountSummary()
  const account =
    accessToken && accountSummary
      ? {
          balance: Number(accountSummary.balance),
          credit: Number(accountSummary.credit ?? 0),
          equity: Number(accountSummary.equity),
          freeMargin: Number(accountSummary.freeMargin),
          margin: Number(accountSummary.margin),
          marginLevel: accountSummary.marginLevel,
          profit: Number(accountSummary.profit ?? 0),
          floatingProfit: Number(accountSummary.floatingProfit ?? 0),
          floatingLoss: Number(accountSummary.floatingLoss ?? 0),
          marginAlert: accountSummary.marginAlert ?? { level: 'ok' as const },
        }
      : { ...EMPTY_TRADING_ACCOUNT, marginAlert: { level: 'ok' as const } }
  const [lotSize, setLotSize] = useState(0.01)
  const [isMobileTradeOpen, setIsMobileTradeOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'chart' | 'positions'>('chart')
  const [authAttempted, setAuthAttempted] = useState(false)
  const [tradeLoading, setTradeLoading] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showNews, setShowNews] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showPulse, setShowPulse] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? 'demo@nexus.trade'
  const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? 'password123'

  // Mark hydrated if persist finished before React subscribed
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      useAuthStore.getState().setHasHydrated(true)
    })
    if (useAuthStore.persist.hasHydrated()) {
      useAuthStore.getState().setHasHydrated(true)
    }
    return unsub
  }, [])

  // Once logged in, never leave the auth modal open
  useEffect(() => {
    if (accessToken) setShowAuth(false)
  }, [accessToken])

  const restSymbols = useSymbolsWithSocket()
  const { ticks: liveTicks, connected: liveFeedConnected } = useLiveMarketTicks(true)
  const symbols = useMemo(() => {
    return restSymbols.map((s) => {
      const tick = liveTicks[s.symbol]
      return tick ? ({ ...s, ...tick, symbol: s.symbol } as MarketSymbol) : s
    })
  }, [restSymbols, liveTicks])
  const marketCatalog = useMarketCatalog()
  const dataSource =
    marketCatalog?.dataSource ??
    (liveFeedConnected ? 'live' : symbols.find((s) => s.dataSource === 'live')?.dataSource) ??
    'delayed'
  const [selectedSymbol, setSelectedSymbol] = useState<MarketSymbol | undefined>(symbols[0])
  useEffect(() => {
    if (!selectedSymbol && symbols.length > 0) {
      setSelectedSymbol(symbols[0])
      return
    }
    if (selectedSymbol) {
      const fresh = symbols.find((s) => s.symbol === selectedSymbol.symbol)
      if (fresh && (fresh.bid !== selectedSymbol.bid || fresh.ask !== selectedSymbol.ask)) {
        setSelectedSymbol(fresh)
      }
    }
  }, [symbols, selectedSymbol])

  const lastMarginAlert = useRef<string>('')
  useEffect(() => {
    const alert = account.marginAlert
    if (!alert || alert.level === 'ok') return
    if (lastMarginAlert.current === alert.message) return
    lastMarginAlert.current = alert.message
    setToast({
      message: alert.message,
      type: alert.level === 'stop_out' ? 'error' : 'info',
    })
  }, [account.marginAlert])

  // Wait for localStorage rehydrate before deciding to show login
  useEffect(() => {
    if (!_hasHydrated || authAttempted) return

    const boot = async () => {
      setAuthAttempted(true)
      const state = useAuthStore.getState()
      const savedAccess = state.accessToken
      const savedRefresh = state.refreshToken

      // Session already in localStorage — stay logged in (optionally refresh if expired)
      if (savedAccess || savedRefresh) {
        if (savedAccess) {
          try {
            await apiClient.get<{ user: UserPayload }>('/auth/me', savedAccess)
            setShowAuth(false)
            return
          } catch {
            // access may be expired — try refresh below
          }
        }
        if (savedRefresh) {
          try {
            const tokens = await apiClient.post<{
              accessToken: string
              refreshToken: string
              user: UserPayload
            }>('/auth/refresh', { refreshToken: savedRefresh })
            const role = String(tokens.user.role || 'USER').toUpperCase() as UserPayload['role']
            setCredentials({
              user: { ...tokens.user, role },
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
            })
            setShowAuth(false)
            return
          } catch {
            storeLogout()
          }
        } else {
          // Dead access token with no refresh — clear and prompt login
          storeLogout()
        }
      }

      if (!isDemoAutoLoginEnabled()) {
        setShowAuth(true)
        return
      }

      try {
        const tokens = await apiClient.post<{
          accessToken: string
          refreshToken: string
          user: UserPayload
        }>('/auth/login', { email: demoEmail, password: demoPassword })

        setCredentials({
          user: tokens.user as UserPayload,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        })
      } catch {
        try {
          const tokens = await apiClient.post<{
            accessToken: string
            refreshToken: string
            user: UserPayload
          }>('/auth/register', {
            fullName: 'Demo User',
            email: demoEmail,
            password: demoPassword,
          })

          setCredentials({
            user: tokens.user as UserPayload,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          })
        } catch (error) {
          console.error('Automatic login failed', error)
          setShowAuth(true)
        }
      }
    }

    void boot()
  }, [
    _hasHydrated,
    authAttempted,
    demoEmail,
    demoPassword,
    setCredentials,
    storeLogout,
  ])

  const { positions: openPositions, refetch: refetchPositions } = useOpenPositions()

  // Display positions with live BID/ASK overlay; backend remains source of truth on poll
  const positions = useMemo(() => {
    return openPositions.map((order) => {
      const marketPrice = symbols.find((s) => s.symbol === order.symbol)
      const currentPrice = marketPrice
        ? order.side === 'BUY'
          ? marketPrice.bid
          : marketPrice.ask
        : Number(order.currentPrice)

      const size = contractSize(order.symbol)
      const priceDiff =
        order.side === 'BUY'
          ? currentPrice - Number(order.openPrice)
          : Number(order.openPrice) - currentPrice
      const realTimeProfit = priceDiff * size * Number(order.lotSize)

      return {
        id: order.id,
        openTime: order.openedAt,
        symbol: order.symbol,
        volume: Number(order.lotSize),
        side: order.side,
        openPrice: Number(order.openPrice),
        currentPrice,
        stopLoss: order.stopLoss ? Number(order.stopLoss) : 0,
        takeProfit: order.takeProfit ? Number(order.takeProfit) : 0,
        swap: order.swap ? Number(order.swap) : 0,
        commission: order.commission ? Number(order.commission) : 0,
        // Prefer live overlay for UI; backend summary poll settles official P/L
        profit: Number.isFinite(realTimeProfit) ? realTimeProfit : Number(order.profit),
      }
    })
  }, [openPositions, symbols])

  // Keep account status fresh; silently refresh tokens if access expired
  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    ;(async () => {
      try {
        const me = await apiClient.get<{
          user: { userId: string; email: string; role: string; status?: string }
        }>('/auth/me', accessToken)
        if (cancelled || !me?.user) return
        const role = String(me.user.role || 'USER').toUpperCase() as 'USER' | 'ADMIN'
        setCredentials({
          user: {
            userId: me.user.userId,
            email: me.user.email,
            role,
            status: me.user.status,
          },
          accessToken,
          refreshToken: useAuthStore.getState().refreshToken || accessToken,
        })
      } catch {
        const savedRefresh = useAuthStore.getState().refreshToken
        if (!savedRefresh || cancelled) return
        try {
          const tokens = await apiClient.post<{
            accessToken: string
            refreshToken: string
            user: UserPayload
          }>('/auth/refresh', { refreshToken: savedRefresh })
          if (cancelled) return
          const role = String(tokens.user.role || 'USER').toUpperCase() as UserPayload['role']
          setCredentials({
            user: { ...tokens.user, role },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          })
        } catch {
          // Session truly gone — only then force login
          if (!cancelled) {
            storeLogout()
            setShowAuth(true)
          }
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [accessToken, setCredentials, storeLogout])

  const canTrade = !!accessToken && user?.status === 'ACTIVE'

  const applyAccountFromResponse = (account: any) => {
    if (!account || typeof account !== 'object') return
    queryClient.setQueryData(['account-summary'], {
      balance: Number(account.balance ?? 0),
      credit: Number(account.credit ?? 0),
      equity: Number(account.equity ?? 0),
      freeMargin: Number(account.freeMargin ?? 0),
      margin: Number(account.margin ?? 0),
      marginLevel: account.marginLevel == null ? null : Number(account.marginLevel),
      leverage: account.leverage != null ? Number(account.leverage) : undefined,
      profit: Number(account.netFloatingPl ?? account.profit ?? 0),
      floatingProfit: Number(account.floatingProfit ?? 0),
      floatingLoss: Number(account.floatingLoss ?? 0),
      netFloatingPl: Number(account.netFloatingPl ?? account.profit ?? 0),
      marginCallLevel: account.marginCallLevel,
      stopOutLevel: account.stopOutLevel,
      marginAlert: account.marginAlert ?? { level: 'ok' },
    })
  }

  const handleTrade = async (side: 'BUY' | 'SELL', stopLoss?: number, takeProfit?: number) => {
    if (!selectedSymbol || !accessToken || tradeLoading) {
      return
    }
    if (!canTrade) {
      setToast({
        message: 'Your account is waiting for admin approval. You can message support in Chat.',
        type: 'error',
      })
      return
    }
    setTradeLoading(true)
    try {
      const response = await apiClient.post<{ data: any; account?: any }>(
        '/orders',
        {
          symbol: selectedSymbol.symbol,
          side,
          lotSize,
          stopLoss: stopLoss ? parseFloat(stopLoss.toString()) : undefined,
          takeProfit: takeProfit ? parseFloat(takeProfit.toString()) : undefined,
        },
        accessToken
      )
      // Instant UI update from response — do not wait on follow-up fetches
      applyAccountFromResponse((response as any).account)
      if ((response as any).data) {
        queryClient.setQueryData(['positions-open'], (prev: any[] | undefined) => {
          const row = (response as any).data
          const mapped = {
            ...row,
            lotSize: Number(row.lotSize),
            openPrice: Number(row.openPrice),
            currentPrice: Number(row.currentPrice),
            marginUsed: Number(row.marginUsed),
            commission: Number(row.commission),
            profit: Number(row.profit ?? 0),
            openedAt: row.openedAt || new Date().toISOString(),
          }
          return [mapped, ...(prev || [])]
        })
      }
      setIsMobileTradeOpen(false)
      setToast({ message: `${side} ${selectedSymbol.symbol} filled`, type: 'success' })
      // Background sync (non-blocking)
      void refetchPositions()
      void queryClient.invalidateQueries({ queryKey: ['account-summary'] })
    } catch (error: any) {
      console.error('Trade failed', error)
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.message ||
        'Trade execution failed. Please check your balance and try again.'
      setToast({ message: errorMessage, type: 'error' })
    } finally {
      setTradeLoading(false)
    }
  }

  const handleClosePosition = async (id: string) => {
    if (!accessToken) return
    if (!canTrade) {
      setToast({
        message: 'Trading is locked until an admin approves your account.',
        type: 'error',
      })
      return
    }
    // Optimistic remove for instant UI
    queryClient.setQueryData(['positions-open'], (prev: any[] | undefined) =>
      (prev || []).filter((p) => p.id !== id)
    )
    try {
      const result = await apiClient.post<{ success: boolean; profit: number; account?: any }>(
        `/orders/${id}/close`,
        {},
        accessToken
      )
      applyAccountFromResponse((result as any).account)
      setToast({ message: 'Position closed', type: 'success' })
      void refetchPositions()
      void queryClient.invalidateQueries({ queryKey: ['account-summary'] })
    } catch (error: any) {
      console.error('Close position failed', error)
      void refetchPositions()
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.message ||
        'Failed to close position. Please try again.'
      setToast({ message: errorMessage, type: 'error' })
    }
  }

  if (!selectedSymbol) {
    return null
  }

  const selectedMeta = {
    ...selectedSymbol,
    icon: symbolMeta[selectedSymbol.symbol]?.icon ?? '₿',
    changePercent: selectedSymbol.changePercent,
  }

  const renderPage = () => {
    switch (activePage) {
      case 'wallet':
        return <WalletPage />
      case 'profile':
        return <ProfilePage />
      case 'settings':
        return <SettingsPage />
      case 'notifications':
        return <NotificationsPage />
      case 'reports':
        return <DocumentsPage />
      case 'chat':
        return <ChatPage />
      case 'chart':
      default:
        return (
          <>
            {/* Desktop ModMount layout: Watch LEFT · Chart CENTER · Order RIGHT · Positions BOTTOM */}
            <div className="hidden lg:flex flex-1 overflow-hidden bg-[#0a0e27] min-h-0">
              {/* Left — Market Watch (full height) */}
              <div className="w-[270px] xl:w-[300px] flex-shrink-0 h-full">
                <MarketWatch
                  symbols={symbols}
                  selectedSymbol={selectedSymbol}
                  onSelectSymbol={setSelectedSymbol}
                  dataSource={dataSource}
                />
              </div>

              {/* Right stack — chart + order on top, positions below */}
              <div className="flex-1 flex flex-col min-w-0 min-h-0">
                <div className="flex flex-1 min-h-0 overflow-hidden">
                  {/* Center chart */}
                  <div className="flex-1 flex flex-col min-w-0 bg-[#1a1d2e]">
                    <div className="h-9 flex-shrink-0 flex items-center gap-3 px-3 border-b border-[#2d3142] bg-[#252836]">
                      <span className="text-sm font-semibold tracking-wide text-white">
                        {selectedSymbol.symbol}
                      </span>
                      <span className="text-[11px] font-mono text-[#94a3b8]">
                        {selectedSymbol.bid.toFixed(selectedSymbol.bid > 100 ? 2 : 5)}
                      </span>
                      <span
                        className={`text-[11px] font-mono font-semibold ${
                          selectedSymbol.changePercent >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'
                        }`}
                      >
                        {selectedSymbol.changePercent >= 0 ? '+' : ''}
                        {selectedSymbol.changePercent.toFixed(2)}%
                      </span>
                      <span className="ml-auto text-[10px] uppercase tracking-wide text-[#8e92a3]">
                        {selectedSymbol.marketStatus === 'open' ? 'Market open' : 'Market closed'}
                      </span>
                    </div>
                    <div className="flex-1 overflow-hidden min-h-0">
                      <TradingViewChart symbol={selectedMeta} />
                    </div>
                  </div>

                  {/* Right — order ticket (kept, placed like a dealing panel) */}
                  <div className="w-[280px] xl:w-[300px] flex-shrink-0 border-l border-[#2d3142] bg-[#1a1d2e]">
                    <OrderPanel
                      symbol={selectedSymbol ?? null}
                      lotSize={lotSize}
                      onLotSizeChange={setLotSize}
                      onTrade={handleTrade}
                      tradeLoading={tradeLoading}
                      tradingLocked={!!accessToken && !canTrade}
                      tradingLockedReason="Pending admin approval — use Chat to contact support"
                      leverage={Number(accountSummary?.leverage ?? 10)}
                    />
                  </div>
                </div>

                {/* Bottom — open positions / pending / finance / closed */}
                <div className="h-[210px] xl:h-[230px] flex-shrink-0">
                  <BottomPanel
                    positions={positions}
                    onClosePosition={handleClosePosition}
                    onCloseAll={async () => {
                      for (const p of positions) {
                        await handleClosePosition(p.id)
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            {accessToken && !canTrade && (
              <div className="border-t border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-center text-sm text-yellow-100">
                Account pending admin approval — open Chat to message support. You cannot open or close trades until approved.
              </div>
            )}
          </>
        )
    }
  }

  const authModals = (
    <>
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  )

  const mobileChartProps = {
    account: {
      balance: account.balance,
      credit: account.credit,
      equity: account.equity,
      freeMargin: account.freeMargin,
      margin: account.margin,
      marginLevel: account.marginLevel,
      profit: account.profit,
    },
    userName: user?.email?.split('@')[0],
    accountId: user?.userId,
    onLogout: logout,
    onLogin: () => setShowAuth(true),
    onRegister: () => setShowAuth(true),
    isAuthenticated: !!accessToken,
    selectedSymbol,
    symbols,
    symbolMeta,
    dataSource,
    onSelectSymbol: setSelectedSymbol,
    lotSize,
    onLotSizeChange: setLotSize,
    onTrade: handleTrade,
    tradeLoading,
    positions,
    onClosePosition: handleClosePosition,
  }

  return (
    <>
      <div className="hidden lg:block h-screen overflow-hidden">
        <TradeMarketsLayout
          account={account}
          userId={user?.userId}
          onLogout={logout}
          onLogin={() => setShowAuth(true)}
          activePage={activePage}
          onPageChange={setActivePage}
        >
          {renderPage()}
          {authModals}
        </TradeMarketsLayout>
      </div>

      <div className="lg:hidden">
        <MobileBankingExperience {...mobileChartProps} />
        {authModals}
      </div>
    </>
  )
}
