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
import TasksPage from '@/components/TasksPage'
import InfoPage from '@/components/InfoPage'
import { AuthModal } from '@/components/AuthModal'
import { Toast } from '@/components/Toast'
import { useAuthStore, type UserPayload } from '@/stores/auth-store'
import { apiClient } from '@/lib/api-client'
import {
  useAccountSummary,
  useOpenPositions,
  useSymbolsWithSocket,
  useMarketCatalog,
  clearCachedAccountSummary,
  writeCachedAccountSummary,
  type MarketSymbol,
} from '@/hooks/useMarketData'
import { useLiveMarketTicks } from '@/hooks/useLiveMarketTicks'
import { isDemoAutoLoginEnabled } from '@/lib/public-env'
import { mapLivePositions, sumUsedMargin } from '@/lib/live-position-pnl'
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
    clearCachedAccountSummary()
    queryClient.removeQueries({ queryKey: ['account-summary'] })
    queryClient.removeQueries({ queryKey: ['account-summary-mark'] })
    queryClient.removeQueries({ queryKey: ['account-dashboard'] })
    queryClient.removeQueries({ queryKey: ['account-transactions'] })
    queryClient.removeQueries({ queryKey: ['positions-open'] })
  }
  const [activePage, setActivePage] = useState('chart')
  const accountSummary = useAccountSummary()
  const [lotSize, setLotSize] = useState(0.01)
  const [isMobileTradeOpen, setIsMobileTradeOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'chart' | 'positions'>('chart')
  const [authAttempted, setAuthAttempted] = useState(false)
  const [tradeLoading, setTradeLoading] = useState(false)
  const tradeInFlightRef = useRef(false)
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
            // Validate session and warm account numbers in parallel for instant header metrics
            const mePromise = apiClient.get<{ user: UserPayload }>('/auth/me', savedAccess)
            void queryClient.prefetchQuery({
              queryKey: ['account-summary'],
              queryFn: async () => {
                const res = await apiClient.get<{ data: unknown }>('/account/summary', savedAccess)
                return res.data
              },
            })
            await mePromise
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

  // One pass: row Net profit + header Profit from the same liveTicks map (same frame)
  const { positions, account } = useMemo(() => {
    const quoteMap: Record<string, { bid?: number; ask?: number }> = {}
    for (const s of symbols) {
      const tick = liveTicks[s.symbol]
      quoteMap[s.symbol] = {
        bid: Number(tick?.bid ?? s.bid),
        ask: Number(tick?.ask ?? s.ask),
      }
    }
    const live = mapLivePositions(openPositions, quoteMap)

    if (!accessToken || !accountSummary) {
      return {
        positions: live.positions,
        account: { ...EMPTY_TRADING_ACCOUNT, marginAlert: { level: 'ok' as const } },
      }
    }

    const balance = Number(accountSummary.balance)
    const credit = Number(accountSummary.credit ?? 0)
    const leverage = Number(accountSummary.leverage ?? 10)
    // Gross margin from every open (BUY + SELL) — never net opposite sides to 0
    const margin = sumUsedMargin(openPositions, leverage)
    const equity = balance + credit + live.totalProfit
    const freeMargin = equity - margin
    const marginLevel = margin > 0 ? (equity / margin) * 100 : null

    return {
      positions: live.positions,
      account: {
        balance,
        credit,
        equity,
        freeMargin,
        margin,
        marginLevel,
        profit: live.totalProfit,
        floatingProfit: live.floatingProfit,
        floatingLoss: live.floatingLoss,
        marginAlert: accountSummary.marginAlert ?? { level: 'ok' as const },
      },
    }
  }, [accessToken, accountSummary, openPositions, symbols, liveTicks])

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

  // Keep account status fresh; silently refresh tokens if access expired
  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    ;(async () => {
      try {
        const me = await apiClient.get<{
          user: {
            userId: string
            email: string
            role: string
            status?: string
            kycStatus?: string
          }
          accessToken?: string
          refreshToken?: string
        }>('/auth/me', accessToken)
        if (cancelled || !me?.user) return
        const role = String(me.user.role || 'USER').toUpperCase() as 'USER' | 'ADMIN'
        setCredentials({
          user: {
            userId: me.user.userId,
            email: me.user.email,
            role,
            status: me.user.status,
            kycStatus: me.user.kycStatus,
          },
          accessToken: me.accessToken || accessToken,
          refreshToken:
            me.refreshToken || useAuthStore.getState().refreshToken || accessToken,
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
    const next = {
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
    }
    queryClient.setQueryData(['account-summary'], next)
    const uid = useAuthStore.getState().user?.userId
    if (uid) writeCachedAccountSummary(uid, next)
  }

  const handleTrade = async (side: 'BUY' | 'SELL', stopLoss?: number, takeProfit?: number) => {
    if (!selectedSymbol || !accessToken || tradeLoading || tradeInFlightRef.current) {
      return
    }
    if (!canTrade) {
      setToast({
        message: 'Your account is waiting for admin approval. You can message support in Chat.',
        type: 'error',
      })
      return
    }
    tradeInFlightRef.current = true
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
          bid: selectedSymbol.bid,
          ask: selectedSymbol.ask,
          quoteTs: Date.now(),
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
          const rest = (prev || []).filter((p) => p.id !== mapped.id)
          return [mapped, ...rest]
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
      tradeInFlightRef.current = false
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
    const openRow = openPositions.find((p) => p.id === id)
    const market = openRow ? symbols.find((s) => s.symbol === openRow.symbol) : undefined
    // Optimistic remove for instant UI
    queryClient.setQueryData(['positions-open'], (prev: any[] | undefined) =>
      (prev || []).filter((p) => p.id !== id)
    )
    try {
      const result = await apiClient.post<{ success: boolean; profit: number; account?: any }>(
        `/orders/${id}/close`,
        {
          bid: market?.bid,
          ask: market?.ask,
          quoteTs: Date.now(),
        },
        accessToken
      )
      applyAccountFromResponse((result as any).account)
      setToast({ message: 'Position closed', type: 'success' })
      void refetchPositions()
      void queryClient.invalidateQueries({ queryKey: ['positions-closed'] })
      void queryClient.invalidateQueries({ queryKey: ['account-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['account-transactions'] })
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
      case 'tasks':
        return <TasksPage onNavigate={setActivePage} />
      case 'info':
        return <InfoPage onNavigate={setActivePage} />
      case 'chart':
      default:
        return (
          <>
            {/* Desktop ModMount layout: Watch LEFT · Chart CENTER · Order RIGHT · Positions BOTTOM */}
            <div className="hidden lg:flex flex-1 overflow-hidden bg-[#0a0e27] min-h-0">
              {/* Left — Market Watch (full height) */}
              <div className="w-[240px] xl:w-[260px] flex-shrink-0 h-full min-w-0">
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

                  {/* Right — order ticket (narrow so +/− fits on screen) */}
                  <div className="w-[200px] xl:w-[220px] min-w-0 flex-shrink-0 border-l border-[#2d3142] bg-[#1a1d2e] overflow-hidden">
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
              <div className="border-t border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-center text-sm text-yellow-100 flex flex-col sm:flex-row items-center justify-center gap-2">
                <span>
                  Complete KYC (Documents) and wait for admin approval — trading stays locked until then.
                </span>
                <button
                  type="button"
                  className="px-3 py-1 rounded bg-[#6366f1] text-white text-xs font-semibold"
                  onClick={() => setActivePage('reports')}
                >
                  Open KYC / Documents
                </button>
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
