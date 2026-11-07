'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type AdminUser = {
  id: string
  fullName: string
  email: string
  role: 'USER' | 'ADMIN'
  balance: number
  equity: number
  freeMargin: number
  status: string
  createdAt: string
}

export default function AdminDashboard() {
  const { accessToken, user } = useAuthStore()
  const router = useRouter()
  const [gameUserId, setGameUserId] = useState('')
  const [gameAmount, setGameAmount] = useState(50)
  const [gameOutcome, setGameOutcome] = useState<'WIN' | 'LOSS'>('WIN')
  const [priceSymbol, setPriceSymbol] = useState('EURUSD')
  const [pricePips, setPricePips] = useState(10)

  useEffect(() => {
    if (!accessToken || user?.role !== 'ADMIN') {
      router.replace('/')
    }
  }, [accessToken, user, router])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: AdminUser[] }>('/admin/users', accessToken ?? undefined)
      return res.data
    },
    enabled: !!accessToken && user?.role === 'ADMIN',
  })

  if (!accessToken || user?.role !== 'ADMIN') {
    return null
  }

  const { data: deposits, refetch: refetchDeposits } = useQuery({
    queryKey: ['admin-deposits'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: any[] }>('/admin/deposits', accessToken ?? undefined)
      return res.data
    },
    enabled: !!accessToken && user?.role === 'ADMIN',
  })

  const { data: withdrawals, refetch: refetchWithdrawals } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: any[] }>('/admin/withdrawals', accessToken ?? undefined)
      return res.data
    },
    enabled: !!accessToken && user?.role === 'ADMIN',
  })

  const handleGameOutcome = async () => {
    await apiClient.post(
      '/admin/game/force-outcome',
      { userId: gameUserId, outcome: gameOutcome, amount: gameAmount },
      accessToken ?? undefined
    )
  }

  const handleForcePrice = async () => {
    await apiClient.post(
      '/admin/game/force-price',
      { symbol: priceSymbol, pips: pricePips },
      accessToken ?? undefined
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#94a3b8]">Administrator</p>
            <h1 className="text-2xl font-semibold">Control Center</h1>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-bg-panel border border-[#1e293b] hover:border-accent-purple transition-colors"
          >
            Refresh
          </button>
        </header>

        <section className="bg-bg-panel border border-[#1e293b] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#1e293b] flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Users</h2>
              <p className="text-xs text-[#94a3b8]">Approve students, adjust balances, monitor performance.</p>
            </div>
            {isLoading && <span className="text-xs text-[#94a3b8]">Loading...</span>}
            {error && <span className="text-xs text-red-400">Failed to load</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[#94a3b8] text-xs uppercase bg-[#0f1432]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-right">Equity</th>
                  <th className="px-4 py-3 text-right">Free Margin</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((u) => (
                  <tr key={u.id} className="border-t border-[#1e293b]">
                    <td className="px-4 py-3 font-medium">{u.fullName}</td>
                    <td className="px-4 py-3 text-[#94a3b8]">{u.email}</td>
                    <td className="px-4 py-3">{u.role}</td>
                    <td className="px-4 py-3 text-right font-mono">${Number(u.balance).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono">${Number(u.equity).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono">${Number(u.freeMargin).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          u.status === 'ACTIVE'
                            ? 'bg-green-500/10 text-green-400'
                            : u.status === 'SUSPENDED'
                              ? 'bg-red-500/10 text-red-300'
                              : 'bg-yellow-500/10 text-yellow-300'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#94a3b8] text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {u.status !== 'ACTIVE' && u.role !== 'ADMIN' && (
                          <button
                            className="px-2 py-1 rounded bg-green-600/20 text-green-300 text-xs"
                            onClick={() =>
                              apiClient
                                .post(
                                  `/admin/users/${u.id}/status`,
                                  { status: 'ACTIVE', startingBalance: 250 },
                                  accessToken ?? undefined
                                )
                                .then(() => refetch())
                            }
                          >
                            Approve trading
                          </button>
                        )}
                        {u.status === 'ACTIVE' && u.role !== 'ADMIN' && (
                          <button
                            className="px-2 py-1 rounded bg-red-600/20 text-red-300 text-xs"
                            onClick={() =>
                              apiClient
                                .post(
                                  `/admin/users/${u.id}/status`,
                                  { status: 'SUSPENDED' },
                                  accessToken ?? undefined
                                )
                                .then(() => refetch())
                            }
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-bg-panel border border-[#1e293b] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Withdrawal Requests</h2>
              <button onClick={() => refetchWithdrawals()} className="text-xs text-[#94a3b8]">
                Refresh
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-auto pr-2">
              {withdrawals?.map((req) => (
                <div key={req.id} className="border border-[#1e293b] rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span>{req.user?.fullName ?? req.userId}</span>
                    <span className="font-mono">${Number(req.amount).toFixed(2)}</span>
                  </div>
                  {req.payoutDetails && (
                    <p className="text-xs text-[#94a3b8] mt-1 truncate">{req.payoutDetails}</p>
                  )}
                  <div className="flex justify-between text-xs text-[#94a3b8] mt-1">
                    <span>{req.status}</span>
                    <span>{new Date(req.createdAt).toLocaleString()}</span>
                  </div>
                  {req.status === 'PENDING' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        className="flex-1 py-1 rounded bg-green-600/20 text-green-300 text-xs"
                        onClick={() =>
                          apiClient
                            .post(
                              `/admin/withdrawals/${req.id}/resolve`,
                              { action: 'APPROVE' },
                              accessToken ?? undefined
                            )
                            .then(() => {
                              refetchWithdrawals()
                              refetch()
                            })
                        }
                      >
                        Approve
                      </button>
                      <button
                        className="flex-1 py-1 rounded bg-red-600/20 text-red-300 text-xs"
                        onClick={() =>
                          apiClient
                            .post(
                              `/admin/withdrawals/${req.id}/resolve`,
                              { action: 'REJECT' },
                              accessToken ?? undefined
                            )
                            .then(() => refetchWithdrawals())
                        }
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {!withdrawals?.length && (
                <p className="text-xs text-[#94a3b8]">No withdrawal requests</p>
              )}
            </div>
          </div>
          <div className="bg-bg-panel border border-[#1e293b] rounded-xl p-4 space-y-4">
            <h2 className="text-lg font-semibold">Game Mode Controls</h2>
            <div className="space-y-2">
              <p className="text-xs text-[#94a3b8] uppercase">Force Outcome</p>
              <input
                value={gameUserId}
                onChange={(e) => setGameUserId(e.target.value)}
                placeholder="User ID"
                className="w-full bg-bg-card border border-[#1e293b] rounded px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <select
                  value={gameOutcome}
                  onChange={(e) => setGameOutcome(e.target.value as 'WIN' | 'LOSS')}
                  className="flex-1 bg-bg-card border border-[#1e293b] rounded px-3 py-2 text-sm"
                >
                  <option value="WIN">Win</option>
                  <option value="LOSS">Loss</option>
                </select>
                <input
                  type="number"
                  value={gameAmount}
                  onChange={(e) => setGameAmount(Number(e.target.value))}
                  className="w-24 bg-bg-card border border-[#1e293b] rounded px-3 py-2 text-sm"
                />
              </div>
              <button
                className="w-full py-2 rounded bg-gradient-to-r from-accent-purple to-accent-blue"
                onClick={handleGameOutcome}
              >
                Apply
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-[#94a3b8] uppercase">Force Price</p>
              <div className="flex gap-2">
                <input
                  value={priceSymbol}
                  onChange={(e) => setPriceSymbol(e.target.value)}
                  className="flex-1 bg-bg-card border border-[#1e293b] rounded px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  value={pricePips}
                  onChange={(e) => setPricePips(Number(e.target.value))}
                  className="w-24 bg-bg-card border border-[#1e293b] rounded px-3 py-2 text-sm"
                />
              </div>
              <button className="w-full py-2 rounded bg-bg-card border border-[#1e293b]" onClick={handleForcePrice}>
                Push Price
              </button>
            </div>
          </div>
          <div className="bg-bg-panel border border-[#1e293b] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Deposit Requests</h2>
              <button onClick={() => refetchDeposits()} className="text-xs text-[#94a3b8]">
                Refresh
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-auto pr-2">
              {deposits?.map((req) => (
                <div key={req.id} className="border border-[#1e293b] rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span>{req.user.fullName}</span>
                    <span className="font-mono">${Number(req.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#94a3b8] mt-1">
                    <span>{req.status}</span>
                    <span>{new Date(req.createdAt).toLocaleString()}</span>
                  </div>
                  {req.status === 'PENDING' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        className="flex-1 py-1 rounded bg-green-600/20 text-green-300 text-xs"
                        onClick={() =>
                          apiClient
                            .post(`/admin/deposits/${req.id}/resolve`, { action: 'APPROVE' }, accessToken ?? undefined)
                            .then(() => refetchDeposits())
                        }
                      >
                        Approve
                      </button>
                      <button
                        className="flex-1 py-1 rounded bg-red-600/20 text-red-300 text-xs"
                        onClick={() =>
                          apiClient
                            .post(`/admin/deposits/${req.id}/resolve`, { action: 'REJECT' }, accessToken ?? undefined)
                            .then(() => refetchDeposits())
                        }
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

