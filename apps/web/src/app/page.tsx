'use client'

import { useEffect, useMemo, useState } from 'react'
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
  usePriceSocket,
  useMarketCatalog,
} from '@/hooks/useMarketData'
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
  const { user, accessToken, setCredentials, logout: storeLogout } = useAuthStore()
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
          credit: Number((accountSummary as any).credit ?? 0),
          equity: Number(accountSummary.equity),
          freeMargin: Number(accountSummary.freeMargin),
          margin: Number(accountSummary.margin),
          marginLevel: Number(accountSummary.marginLevel),
          profit: Number((accountSummary as any).profit ?? 0), // floating P/L
        }
      : { ...EMPTY_TRADING_ACCOUNT }
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

  const symbols = useSymbolsWithSocket()
  const marketCatalog = useMarketCatalog()
  const dataSource = marketCatalog?.dataSource ?? symbols[0]?.dataSource ?? 'simulated'
  const { snapshot: priceSnapshot } = usePriceSocket()
  const [selectedSymbol, setSelectedSymbol] = useState(symbols[0])
  useEffect(() => {
    if (!selectedSymbol && symbols.length > 0) {
      setSelectedSymbol(symbols[0])
    }
  }, [symbols, selectedSymbol])

  useEffect(() => {
    if (accessToken || authAttempted) return
    if (!isDemoAutoLoginEnabled()) {
      setAuthAttempted(true)
      setShowAuth(true)
      return
    }
    const ensureAuth = async () => {
      setAuthAttempted(true)
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
          }>('/auth/register', { fullName: 'Demo User', email: demoEmail, password: demoPassword })

          setCredentials({
            user: tokens.user as UserPayload,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          })
        } catch (error) {
          console.error('Automatic login failed', error)
          setShowAuth(true) // fall back to manual login/signup
        }
      }
    }
    ensureAuth()
  }, [accessToken, authAttempted, demoEmail, demoPassword, setCredentials])

  const { positions: openPositions, refetch: refetchPositions } = useOpenPositions()

  // Update positions with real-time prices
  const positions = useMemo(() => {
    return openPositions.map((order) => {
      // Get real-time price from socket snapshot
      const marketPrice = priceSnapshot.find((s) => s.symbol === order.symbol)
      const currentPrice = marketPrice
        ? order.side === 'BUY'
          ? marketPrice.bid
          : marketPrice.ask
        : Number(order.currentPrice)

      // Calculate real-time profit
      const size = contractSize(order.symbol)
      const priceDiff = order.side === 'BUY' 
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
        profit: realTimeProfit,
      }
    })
  }, [openPositions, priceSnapshot])

  // Keep account status fresh so trading stays locked until admin approval.
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
        // ignore — user may still browse
      }
    })()
    return () => {
      cancelled = true
    }
  }, [accessToken, setCredentials])

  const canTrade = !!accessToken && user?.status === 'ACTIVE'

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
      const response = await apiClient.post(
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
      // Immediately refresh positions and account
      await refetchPositions()
      queryClient.invalidateQueries({ queryKey: ['positions-open'] })
      queryClient.invalidateQueries({ queryKey: ['account-summary'] })
      // Also refetch after a short delay to ensure backend has processed
      setTimeout(() => {
        refetchPositions()
        queryClient.refetchQueries({ queryKey: ['positions-open'] })
        queryClient.refetchQueries({ queryKey: ['account-summary'] })
      }, 500)
      setIsMobileTradeOpen(false)
      // Show success notification
      setToast({ message: `${side} order executed successfully for ${selectedSymbol.symbol}`, type: 'success' })
      console.log('Trade executed successfully:', response)
    } catch (error: any) {
      console.error('Trade failed', error)
      // Show error notification to user
      const errorMessage = error?.response?.data?.error?.message || error?.message || 'Trade execution failed. Please check your balance and try again.'
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
    try {
      await apiClient.post(`/orders/${id}/close`, {}, accessToken)
      // Immediately refresh positions and account
      await Promise.all([
        refetchPositions(),
        queryClient.invalidateQueries({ queryKey: ['account-summary'] }),
        queryClient.refetchQueries({ queryKey: ['account-summary'] }),
      ])
      setToast({ message: 'Position closed successfully. Balance updated.', type: 'success' })
      console.log('Position closed successfully')
    } catch (error: any) {
      console.error('Close position failed', error)
      const errorMessage = error?.response?.data?.error?.message || error?.message || 'Failed to close position. Please try again.'
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
            {/* Desktop View - Only visible on desktop */}
            <div className="hidden lg:flex flex-1 flex-col lg:flex-row overflow-hidden">
              {/* Chart Panel (Center-Left) */}
              <div className="flex-1 flex flex-col overflow-hidden bg-[#1a1d2e] min-w-0">
                {/* Chart Tabs */}
                <div className="flex items-center gap-1 px-3 py-2 border-b border-[#2d3142] bg-[#252836]">
                  <button className="px-3 py-1 text-xs font-semibold bg-[#4f46e5] text-white rounded">Chart</button>
                  <button className="px-3 py-1 text-xs font-semibold text-[#8e92a3] hover:text-white">News</button>
                  <button className="px-3 py-1 text-xs font-semibold text-[#8e92a3] hover:text-white">Heatmap</button>
                  <button className="ml-auto px-2 py-1 text-xs text-[#8e92a3] hover:text-white">+</button>
                </div>
                
                {/* Chart */}
                <div className="flex-1 overflow-hidden">
                  <TradingViewChart symbol={selectedMeta} />
                </div>

                {/* Bottom Panel */}
                <div className="h-[200px] border-t border-[#1e293b]">
                  <BottomPanel positions={positions} onClosePosition={handleClosePosition} />
                </div>
              </div>

              {/* Market Watch (Center-Right) */}
              <div className="w-[280px] xl:w-[300px] border-l border-[#1e293b] flex-shrink-0">
                <MarketWatch
                  symbols={symbols}
                  selectedSymbol={selectedSymbol}
                  onSelectSymbol={setSelectedSymbol}
                  dataSource={dataSource}
                />
              </div>

              {/* Order Panel (Right Sidebar) */}
              <div className="w-[320px] xl:w-[340px] border-l border-[#1e293b] flex-shrink-0">
                <OrderPanel
                  symbol={selectedSymbol}
                  lotSize={lotSize}
                  onLotSizeChange={setLotSize}
                  onTrade={handleTrade}
                  tradeLoading={tradeLoading}
                  tradingLocked={!!accessToken && !canTrade}
                  tradingLockedReason="Pending admin approval — use Chat to contact support"
                />
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
