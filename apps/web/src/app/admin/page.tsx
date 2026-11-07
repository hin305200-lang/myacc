'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import ChatPage from '@/components/ChatPage'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Loader2,
  MessageSquare,
  Shield,
  Users,
  Wallet,
  Pencil,
} from 'lucide-react'

type AdminUser = {
  id: string
  fullName: string
  email: string
  phoneNumber?: string | null
  role: 'USER' | 'ADMIN'
  balance: number
  equity: number
  freeMargin: number
  status: string
  kycStatus?: string
  country?: string | null
  idType?: string | null
  documentCount?: number
  openPositions?: number
  createdAt: string
}

type UserDetail = AdminUser & {
  dateOfBirth?: string | null
  address?: string | null
  nationality?: string | null
  idNumber?: string | null
  credit?: number
  kycDocuments: {
    id: string
    docType: string
    fileName: string
    mimeType: string
    createdAt: string
  }[]
}

type AdminPosition = {
  id: string
  userId: string
  symbol: string
  side: string
  lotSize: number
  openPrice: number
  currentPrice: number
  profit: number
  openedAt: string
  stopLoss?: number | null
  takeProfit?: number | null
}

type Tab = 'approvals' | 'kyc' | 'positions' | 'chat' | 'wallet'

export default function AdminDashboard() {
  const { accessToken, user, _hasHydrated, setHasHydrated } = useAuthStore()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('approvals')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [docPreview, setDocPreview] = useState<{
    fileName: string
    mimeType: string
    dataBase64: string
  } | null>(null)
  const [editingPos, setEditingPos] = useState<AdminPosition | null>(null)
  const [posForm, setPosForm] = useState({
    openPrice: '',
    currentPrice: '',
    profit: '',
    openedAt: '',
  })
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHasHydrated(true))
    if (useAuthStore.persist.hasHydrated()) setHasHydrated(true)
    return unsub
  }, [setHasHydrated])

  const isAdminRole = String(user?.role || '').toUpperCase() === 'ADMIN'

  useEffect(() => {
    if (!_hasHydrated) return
    if (!accessToken || !isAdminRole) router.replace('/')
  }, [_hasHydrated, accessToken, isAdminRole, router])

  const isAdminReady = _hasHydrated && !!accessToken && isAdminRole

  const {
    data: users,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-users', accessToken],
    queryFn: async () => {
      // If access expired, silently refresh then retry once
      const run = async (token: string) => {
        const res = await apiClient.get<{ data: AdminUser[] }>('/admin/users', token)
        return res.data
      }
      try {
        return await run(accessToken!)
      } catch (err: any) {
        const refresh = useAuthStore.getState().refreshToken
        if (!refresh) throw err
        try {
          const tokens = await apiClient.post<{
            accessToken: string
            refreshToken: string
            user: { userId: string; email: string; role: string; status?: string; kycStatus?: string }
          }>('/auth/refresh', { refreshToken: refresh })
          const role = String(tokens.user.role || 'USER').toUpperCase() as 'USER' | 'ADMIN'
          useAuthStore.getState().setCredentials({
            user: { ...tokens.user, role },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          })
          return await run(tokens.accessToken)
        } catch {
          throw err
        }
      }
    },
    enabled: isAdminReady,
    refetchInterval: 8000,
    retry: 1,
  })

  const { data: deposits, refetch: refetchDeposits } = useQuery({
    queryKey: ['admin-deposits'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: any[] }>('/admin/deposits', accessToken ?? undefined)
      return res.data
    },
    enabled: isAdminReady,
  })

  const { data: withdrawals, refetch: refetchWithdrawals } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: any[] }>('/admin/withdrawals', accessToken ?? undefined)
      return res.data
    },
    enabled: isAdminReady,
  })

  const { data: userDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['admin-user', selectedUserId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: UserDetail }>(
        `/admin/users/${selectedUserId}`,
        accessToken ?? undefined
      )
      return res.data
    },
    enabled: isAdminReady && !!selectedUserId,
  })

  const { data: userPositions, refetch: refetchPositions } = useQuery({
    queryKey: ['admin-user-positions', selectedUserId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: AdminPosition[] }>(
        `/admin/users/${selectedUserId}/positions`,
        accessToken ?? undefined
      )
      return res.data
    },
    enabled: isAdminReady && !!selectedUserId && (tab === 'positions' || tab === 'kyc'),
  })

  const pendingUsers = useMemo(
    () =>
      (users ?? [])
        .filter((u) => u.role !== 'ADMIN' && u.status === 'PENDING')
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [users]
  )

  const sortedUsers = useMemo(
    () =>
      [...(users ?? [])].sort((a, b) => {
        const rank = (s: string) => (s === 'PENDING' ? 0 : s === 'ACTIVE' ? 1 : 2)
        const kycRank = (s?: string) => (s === 'SUBMITTED' ? 0 : s === 'REQUIRED' ? 1 : 2)
        return rank(a.status) - rank(b.status) || kycRank(a.kycStatus) - kycRank(b.kycStatus)
      }),
    [users]
  )

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const approveTrading = async (id: string) => {
    setBusy(true)
    try {
      await apiClient.post(
        `/admin/users/${id}/status`,
        { status: 'ACTIVE', startingBalance: 350 },
        accessToken ?? undefined
      )
      flash('Account approved (+$350)')
      await refetch()
    } catch (e: any) {
      flash(e?.message || 'Approve failed')
    } finally {
      setBusy(false)
    }
  }

  const setKyc = async (id: string, kycStatus: 'APPROVED' | 'REJECTED') => {
    setBusy(true)
    try {
      await apiClient.post(`/admin/users/${id}/kyc`, { kycStatus }, accessToken ?? undefined)
      flash(`KYC ${kycStatus.toLowerCase()}`)
      await Promise.all([refetch(), refetchDetail()])
    } catch (e: any) {
      flash(e?.message || 'KYC update failed')
    } finally {
      setBusy(false)
    }
  }

  const viewDoc = async (userId: string, docId: string) => {
    setBusy(true)
    try {
      const res = await apiClient.get<{
        data: { fileName: string; mimeType: string; dataBase64: string }
      }>(`/admin/users/${userId}/documents/${docId}`, accessToken ?? undefined)
      setDocPreview(res.data)
    } catch (e: any) {
      flash(e?.message || 'Could not open document')
    } finally {
      setBusy(false)
    }
  }

  const openEditPos = (pos: AdminPosition) => {
    setEditingPos(pos)
    const local = new Date(pos.openedAt)
    const pad = (n: number) => String(n).padStart(2, '0')
    const localStr = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`
    setPosForm({
      openPrice: String(pos.openPrice),
      currentPrice: String(pos.currentPrice),
      profit: String(pos.profit),
      openedAt: localStr,
    })
  }

  const savePos = async () => {
    if (!editingPos) return
    setBusy(true)
    try {
      await apiClient.patch(
        `/admin/positions/${editingPos.id}`,
        {
          openPrice: Number(posForm.openPrice),
          currentPrice: Number(posForm.currentPrice),
          profit: Number(posForm.profit),
          openedAt: new Date(posForm.openedAt).toISOString(),
        },
        accessToken ?? undefined
      )
      flash('Position updated')
      setEditingPos(null)
      await refetchPositions()
    } catch (e: any) {
      flash(e?.message || 'Edit failed')
    } finally {
      setBusy(false)
    }
  }

  if (!isAdminReady) {
    return (
      <div className="min-h-screen bg-[#0a0e27] text-white flex items-center justify-center text-sm text-[#94a3b8]">
        {_hasHydrated ? 'Admin access required…' : 'Loading…'}
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: typeof Users; count?: number }[] = [
    { id: 'approvals', label: 'Approvals', icon: Users, count: pendingUsers.length },
    {
      id: 'kyc',
      label: 'KYC / Docs',
      icon: FileText,
      count: (users ?? []).filter((u) => u.kycStatus === 'SUBMITTED').length,
    },
    { id: 'positions', label: 'Positions', icon: Pencil },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
  ]

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white">
      <header className="sticky top-0 z-30 border-b border-[#1e293b] bg-[#0f1432]/95 backdrop-blur px-3 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[#94a3b8] text-xs">
              <Shield className="h-3.5 w-3.5" /> Administrator
            </div>
            <h1 className="text-lg sm:text-2xl font-semibold truncate">Control Center</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#1e293b] text-xs text-[#94a3b8] hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Trade
            </Link>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 rounded-lg bg-[#6366f1] text-xs font-semibold"
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-3 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap border ${
                  active
                    ? 'bg-[#6366f1]/20 border-[#6366f1]/50 text-white'
                    : 'border-transparent text-[#94a3b8] hover:bg-[#161b3d]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {typeof t.count === 'number' && t.count > 0 && (
                  <span className="ml-1 rounded-full bg-[#6366f1] px-1.5 text-[10px] font-bold">
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </header>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-[#161b3d] border border-[#6366f1]/40 px-4 py-2 text-sm shadow-xl">
          {toast}
        </div>
      )}

      <main className="max-w-6xl mx-auto p-3 sm:p-6 space-y-4">
        {tab === 'approvals' && (
          <section className="space-y-3">
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
              <strong>{users?.length ?? 0}</strong> total account(s) ·{' '}
              <strong>{pendingUsers.length}</strong> waiting for trading approval (PENDING). All
              registered users are listed below.
            </div>
            {isLoading && (
              <div className="flex items-center gap-2 text-[#94a3b8] text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 space-y-2">
                <p>Failed to load users: {(error as Error)?.message || 'Unknown error'}</p>
                <p className="text-xs text-red-200/80">
                  Sign out and log in again with your admin account, then reopen /admin.
                </p>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded bg-red-500/20 text-xs"
                  onClick={() => void refetch()}
                >
                  Retry
                </button>
              </div>
            )}
            {!isLoading && !error && (users?.length ?? 0) === 0 && (
              <p className="text-sm text-[#94a3b8]">No users found in the database yet.</p>
            )}

            {/* Mobile cards */}
            <div className="grid gap-3 md:hidden">
              {sortedUsers.map((u) => (
                <div key={u.id} className="rounded-xl border border-[#1e293b] bg-[#161b3d] p-4 space-y-2">
                  <div className="flex justify-between gap-2">
                    <div>
                      <div className="font-semibold">{u.fullName}</div>
                      <div className="text-xs text-[#94a3b8] break-all">{u.email}</div>
                    </div>
                    <StatusPill status={u.status} />
                  </div>
                  <div className="text-xs text-[#94a3b8] flex flex-wrap gap-2">
                    <span>KYC: {u.kycStatus || 'REQUIRED'}</span>
                    <span>· Docs: {u.documentCount ?? 0}</span>
                    <span>· Bal: ${Number(u.balance).toFixed(2)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {u.status !== 'ACTIVE' && u.role !== 'ADMIN' && (
                      <button
                        disabled={busy}
                        className="px-3 py-1.5 rounded bg-green-600/25 text-green-300 text-xs"
                        onClick={() => void approveTrading(u.id)}
                      >
                        Approve trading
                      </button>
                    )}
                    <button
                      className="px-3 py-1.5 rounded bg-[#6366f1]/20 text-[#a5b4fc] text-xs"
                      onClick={() => {
                        setSelectedUserId(u.id)
                        setTab('kyc')
                      }}
                    >
                      View KYC
                    </button>
                    <button
                      className="px-3 py-1.5 rounded border border-[#1e293b] text-xs text-[#94a3b8]"
                      onClick={() => {
                        setSelectedUserId(u.id)
                        setTab('positions')
                      }}
                    >
                      Positions
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-[#1e293b] bg-[#161b3d]">
              <table className="w-full text-sm">
                <thead className="text-left text-[#94a3b8] text-xs uppercase bg-[#0f1432]">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">KYC</th>
                    <th className="px-4 py-3">Docs</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((u) => (
                    <tr key={u.id} className="border-t border-[#1e293b]">
                      <td className="px-4 py-3 font-medium">{u.fullName}</td>
                      <td className="px-4 py-3 text-[#94a3b8]">{u.email}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={u.status} />
                      </td>
                      <td className="px-4 py-3 text-xs">{u.kycStatus || 'REQUIRED'}</td>
                      <td className="px-4 py-3">{u.documentCount ?? 0}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        ${Number(u.balance).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#94a3b8]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {u.status !== 'ACTIVE' && u.role !== 'ADMIN' && (
                            <button
                              disabled={busy}
                              className="px-2 py-1 rounded bg-green-600/20 text-green-300 text-xs"
                              onClick={() => void approveTrading(u.id)}
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
                          <button
                            className="px-2 py-1 rounded bg-[#6366f1]/20 text-[#a5b4fc] text-xs"
                            onClick={() => {
                              setSelectedUserId(u.id)
                              setTab('kyc')
                            }}
                          >
                            KYC
                          </button>
                          <button
                            className="px-2 py-1 rounded border border-[#1e293b] text-xs"
                            onClick={() => {
                              setSelectedUserId(u.id)
                              setTab('positions')
                            }}
                          >
                            Edit P/L
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'kyc' && (
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 space-y-2">
              <h2 className="text-sm font-semibold text-[#94a3b8] uppercase">Select user</h2>
              <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
                {sortedUsers
                  .filter((u) => u.role !== 'ADMIN')
                  .map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUserId(u.id)}
                      className={`w-full text-left rounded-xl border px-3 py-3 ${
                        selectedUserId === u.id
                          ? 'border-[#6366f1] bg-[#6366f1]/15'
                          : 'border-[#1e293b] bg-[#161b3d]'
                      }`}
                    >
                      <div className="font-medium text-sm">{u.fullName}</div>
                      <div className="text-[11px] text-[#94a3b8] truncate">{u.email}</div>
                      <div className="text-[11px] mt-1 flex gap-2">
                        <span>{u.status}</span>
                        <span>· KYC {u.kycStatus || 'REQUIRED'}</span>
                        <span>· {u.documentCount ?? 0} docs</span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            <div className="lg:col-span-3 rounded-xl border border-[#1e293b] bg-[#161b3d] p-4 min-h-[320px]">
              {!selectedUserId && (
                <p className="text-sm text-[#94a3b8]">Pick a user to review KYC and documents.</p>
              )}
              {selectedUserId && !userDetail && (
                <div className="flex items-center gap-2 text-[#94a3b8] text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading profile…
                </div>
              )}
              {userDetail && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{userDetail.fullName}</h3>
                      <p className="text-sm text-[#94a3b8]">{userDetail.email}</p>
                      <p className="text-xs text-[#64748b] mt-1">
                        Phone: {userDetail.phoneNumber || '—'} · Country:{' '}
                        {userDetail.country || '—'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={busy}
                        className="px-3 py-1.5 rounded bg-green-600/25 text-green-300 text-xs"
                        onClick={() => void setKyc(userDetail.id, 'APPROVED')}
                      >
                        Approve KYC
                      </button>
                      <button
                        disabled={busy}
                        className="px-3 py-1.5 rounded bg-red-600/25 text-red-300 text-xs"
                        onClick={() => void setKyc(userDetail.id, 'REJECTED')}
                      >
                        Reject KYC
                      </button>
                      {userDetail.status !== 'ACTIVE' && (
                        <button
                          disabled={busy}
                          className="px-3 py-1.5 rounded bg-[#6366f1]/25 text-[#a5b4fc] text-xs"
                          onClick={() => void approveTrading(userDetail.id)}
                        >
                          Approve trading
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <Info label="Account status" value={userDetail.status} />
                    <Info label="KYC status" value={userDetail.kycStatus || 'REQUIRED'} />
                    <Info label="Date of birth" value={userDetail.dateOfBirth || '—'} />
                    <Info label="Nationality" value={userDetail.nationality || '—'} />
                    <Info label="ID type" value={userDetail.idType || '—'} />
                    <Info label="ID number" value={userDetail.idNumber || '—'} />
                    <div className="sm:col-span-2">
                      <Info label="Address" value={userDetail.address || '—'} />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">Uploaded documents</h4>
                    {(userDetail.kycDocuments || []).length === 0 ? (
                      <p className="text-xs text-[#64748b]">No documents uploaded.</p>
                    ) : (
                      <div className="space-y-2">
                        {userDetail.kycDocuments.map((d) => (
                          <div
                            key={d.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-[#1e293b] bg-[#0d1230] px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="text-sm truncate">{d.fileName}</div>
                              <div className="text-[11px] text-[#64748b]">
                                {d.docType} · {new Date(d.createdAt).toLocaleString()}
                              </div>
                            </div>
                            <button
                              className="shrink-0 px-2 py-1 rounded bg-[#6366f1]/20 text-[#a5b4fc] text-xs"
                              onClick={() => void viewDoc(userDetail.id, d.id)}
                            >
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {tab === 'positions' && (
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 space-y-2">
              <h2 className="text-sm font-semibold text-[#94a3b8] uppercase">Select user</h2>
              <div className="max-h-[50vh] overflow-y-auto space-y-2">
                {sortedUsers
                  .filter((u) => u.role !== 'ADMIN')
                  .map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUserId(u.id)}
                      className={`w-full text-left rounded-xl border px-3 py-3 ${
                        selectedUserId === u.id
                          ? 'border-[#6366f1] bg-[#6366f1]/15'
                          : 'border-[#1e293b] bg-[#161b3d]'
                      }`}
                    >
                      <div className="font-medium text-sm">{u.fullName}</div>
                      <div className="text-[11px] text-[#94a3b8]">
                        Open positions: {u.openPositions ?? 0}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
            <div className="lg:col-span-3 space-y-3">
              <h2 className="text-sm font-semibold text-[#94a3b8] uppercase">
                Edit open price / time / profit & loss
              </h2>
              {!selectedUserId && (
                <p className="text-sm text-[#94a3b8]">Select a user to edit their positions.</p>
              )}
              {(userPositions || []).map((pos) => (
                <div
                  key={pos.id}
                  className="rounded-xl border border-[#1e293b] bg-[#161b3d] p-4 space-y-2"
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <div className="font-semibold">
                        {pos.symbol} · {pos.side} · {pos.lotSize} lots
                      </div>
                      <div className="text-xs text-[#94a3b8]">
                        Opened {new Date(pos.openedAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      className="px-2 py-1 rounded bg-[#6366f1]/20 text-[#a5b4fc] text-xs inline-flex items-center gap-1"
                      onClick={() => openEditPos(pos)}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <Info label="Open" value={String(pos.openPrice)} />
                    <Info label="Current" value={String(pos.currentPrice)} />
                    <Info
                      label="Profit / Loss"
                      value={`${pos.profit >= 0 ? '+' : ''}${pos.profit.toFixed(2)}`}
                    />
                    <Info label="ID" value={pos.id.slice(0, 8)} />
                  </div>
                </div>
              ))}
              {selectedUserId && (userPositions || []).length === 0 && (
                <p className="text-sm text-[#64748b]">No open positions for this user.</p>
              )}
            </div>
          </section>
        )}

        {tab === 'chat' && (
          <section className="rounded-xl border border-[#1e293b] overflow-hidden bg-[#161b3d] h-[70vh] min-h-[420px]">
            <ChatPage />
          </section>
        )}

        {tab === 'wallet' && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WalletList
              title="Withdrawal requests"
              items={withdrawals}
              onRefresh={() => refetchWithdrawals()}
              onApprove={(id) =>
                apiClient
                  .post(`/admin/withdrawals/${id}/resolve`, { action: 'APPROVE' }, accessToken ?? undefined)
                  .then(() => {
                    refetchWithdrawals()
                    refetch()
                  })
              }
              onReject={(id) =>
                apiClient
                  .post(`/admin/withdrawals/${id}/resolve`, { action: 'REJECT' }, accessToken ?? undefined)
                  .then(() => refetchWithdrawals())
              }
            />
            <WalletList
              title="Deposit requests"
              items={deposits}
              onRefresh={() => refetchDeposits()}
              onApprove={(id) =>
                apiClient
                  .post(`/admin/deposits/${id}/resolve`, { action: 'APPROVE' }, accessToken ?? undefined)
                  .then(() => refetchDeposits())
              }
              onReject={(id) =>
                apiClient
                  .post(`/admin/deposits/${id}/resolve`, { action: 'REJECT' }, accessToken ?? undefined)
                  .then(() => refetchDeposits())
              }
            />
          </section>
        )}
      </main>

      {docPreview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-xl border border-[#1e293b] bg-[#0f1432] p-4">
            <div className="flex justify-between items-center mb-3 gap-2">
              <div className="text-sm font-semibold truncate">{docPreview.fileName}</div>
              <button
                className="text-xs px-2 py-1 rounded border border-[#1e293b]"
                onClick={() => setDocPreview(null)}
              >
                Close
              </button>
            </div>
            {docPreview.mimeType.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={docPreview.fileName}
                src={`data:${docPreview.mimeType};base64,${docPreview.dataBase64}`}
                className="max-w-full rounded-lg"
              />
            ) : (
              <iframe
                title={docPreview.fileName}
                src={`data:${docPreview.mimeType};base64,${docPreview.dataBase64}`}
                className="w-full h-[70vh] rounded-lg bg-white"
              />
            )}
          </div>
        </div>
      )}

      {editingPos && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-xl border border-[#1e293b] bg-[#0f1432] p-4 space-y-3">
            <h3 className="font-semibold">
              Edit {editingPos.symbol} {editingPos.side}
            </h3>
            <label className="block text-xs text-[#94a3b8]">
              Open price
              <input
                type="number"
                step="any"
                value={posForm.openPrice}
                onChange={(e) => setPosForm((f) => ({ ...f, openPrice: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-[#1e293b] bg-[#0d1230] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-[#94a3b8]">
              Current price
              <input
                type="number"
                step="any"
                value={posForm.currentPrice}
                onChange={(e) => setPosForm((f) => ({ ...f, currentPrice: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-[#1e293b] bg-[#0d1230] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-[#94a3b8]">
              Profit / Loss
              <input
                type="number"
                step="any"
                value={posForm.profit}
                onChange={(e) => setPosForm((f) => ({ ...f, profit: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-[#1e293b] bg-[#0d1230] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-[#94a3b8]">
              Open time
              <input
                type="datetime-local"
                value={posForm.openedAt}
                onChange={(e) => setPosForm((f) => ({ ...f, openedAt: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-[#1e293b] bg-[#0d1230] px-3 py-2 text-sm"
              />
            </label>
            <div className="flex gap-2 pt-1">
              <button
                className="flex-1 py-2 rounded-lg border border-[#1e293b] text-sm"
                onClick={() => setEditingPos(null)}
              >
                Cancel
              </button>
              <button
                disabled={busy}
                className="flex-1 py-2 rounded-lg bg-[#6366f1] text-sm font-semibold disabled:opacity-50"
                onClick={() => void savePos()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'ACTIVE'
      ? 'bg-green-500/15 text-green-300'
      : status === 'SUSPENDED'
        ? 'bg-red-500/15 text-red-300'
        : 'bg-yellow-500/15 text-yellow-200'
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{status}</span>
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#1e293b] bg-[#0d1230] px-3 py-2">
      <div className="text-[10px] uppercase text-[#64748b]">{label}</div>
      <div className="text-sm break-words">{value}</div>
    </div>
  )
}

function WalletList({
  title,
  items,
  onRefresh,
  onApprove,
  onReject,
}: {
  title: string
  items?: any[]
  onRefresh: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#161b3d] p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">{title}</h2>
        <button onClick={onRefresh} className="text-xs text-[#94a3b8]">
          Refresh
        </button>
      </div>
      <div className="space-y-2 max-h-80 overflow-auto">
        {(items || []).map((req) => (
          <div key={req.id} className="border border-[#1e293b] rounded-lg p-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="truncate">{req.user?.fullName ?? req.userId}</span>
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
                  onClick={() => onApprove(req.id)}
                >
                  Approve
                </button>
                <button
                  className="flex-1 py-1 rounded bg-red-600/20 text-red-300 text-xs"
                  onClick={() => onReject(req.id)}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
        {!items?.length && <p className="text-xs text-[#94a3b8]">No requests</p>}
      </div>
    </div>
  )
}
