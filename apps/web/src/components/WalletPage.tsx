'use client'

import { useState } from 'react'
import { Wallet, ArrowDownCircle, ArrowUpCircle, History } from 'lucide-react'
import {
  useAccountSummary,
  useAccountDashboard,
  useTransactions,
} from '@/hooks/useMarketData'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getPageTheme, type PageAppearance } from '@/lib/page-theme'

export default function WalletPage({ appearance = 'terminal' }: { appearance?: PageAppearance }) {
  const t = getPageTheme(appearance)
  const isBank = appearance === 'banking'
  const account = useAccountSummary()
  const { data: dashboard } = useAccountDashboard()
  const { data: transactions = [] } = useTransactions()
  const { accessToken } = useAuthStore()
  const queryClient = useQueryClient()
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [payoutDetails, setPayoutDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { data: deposits = [] } = useQuery({
    queryKey: ['account-deposits'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { id: string; amount: number; status: string; createdAt: string }[] }>(
        '/account/deposits',
        accessToken ?? undefined
      )
      return res.data
    },
    enabled: !!accessToken,
  })

  const { data: withdrawals = [] } = useQuery({
    queryKey: ['account-withdrawals'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { id: string; amount: number; status: string; createdAt: string }[] }>(
        '/account/withdrawals',
        accessToken ?? undefined
      )
      return res.data
    },
    enabled: !!accessToken,
  })

  const balance = Number(account?.balance ?? 0)
  const equity = Number(account?.equity ?? 0)
  const freeMargin = Number(account?.freeMargin ?? 0)
  const margin = Number(account?.margin ?? 0)
  const marginLevel = Number(account?.marginLevel ?? 0)

  const invalidateWallet = () => {
    queryClient.invalidateQueries({ queryKey: ['account-summary'] })
    queryClient.invalidateQueries({ queryKey: ['account-dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['account-transactions'] })
    queryClient.invalidateQueries({ queryKey: ['account-deposits'] })
    queryClient.invalidateQueries({ queryKey: ['account-withdrawals'] })
  }

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount)
    if (!depositAmount || amount < 10) {
      setMessage({ type: 'error', text: 'Minimum deposit request is $10' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      await apiClient.post(
        '/account/deposit-request',
        { amount, note: 'User deposit request' },
        accessToken ?? undefined
      )
      setMessage({
        type: 'success',
        text: 'Deposit request submitted. Funds are credited only after admin verification — not instant.',
      })
      setDepositAmount('')
      invalidateWallet()
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : 'Failed to submit deposit request'
      setMessage({ type: 'error', text })
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount)
    if (!withdrawAmount || amount < 10) {
      setMessage({ type: 'error', text: 'Minimum withdrawal request is $10' })
      return
    }
    if (!payoutDetails.trim()) {
      setMessage({ type: 'error', text: 'Enter payout details (bank / wallet reference)' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      await apiClient.post(
        '/account/withdrawal-request',
        { amount, payoutDetails: payoutDetails.trim() },
        accessToken ?? undefined
      )
      setMessage({
        type: 'success',
        text: 'Withdrawal request submitted for review. Balance updates only after approval.',
      })
      setWithdrawAmount('')
      setPayoutDetails('')
      invalidateWallet()
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : 'Failed to submit withdrawal'
      setMessage({ type: 'error', text })
    } finally {
      setLoading(false)
    }
  }

  const statusColor = (status: string) => {
    if (status === 'APPROVED' || status === 'COMPLETED') return 'text-emerald-400'
    if (status === 'REJECTED') return 'text-red-400'
    return 'text-amber-400'
  }

  return (
    <div className={t.page}>
      <div className={isBank ? 'space-y-4' : 'max-w-5xl mx-auto'}>
        {!isBank && (
        <div className="mb-4 sm:mb-6">
          <h1 className={`text-2xl sm:text-3xl font-bold ${t.title} mb-2 flex items-center gap-2 sm:gap-3`}>
            <Wallet className="h-6 w-6 sm:h-8 sm:w-8" />
            Wallet
          </h1>
          <p className={`text-sm sm:text-base ${t.subtitle}`}>
            Balances from your ledger. Deposits and withdrawals require backend verification.
          </p>
        </div>
        )}

        <div className={`grid grid-cols-2 ${isBank ? 'gap-2' : 'lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6'}`}>
          <div className={t.cardMuted}>
            <div className={`text-xs ${t.label} mb-1`}>Available (free margin)</div>
            <div className={`text-xl font-bold font-mono ${t.heading}`}>${freeMargin.toFixed(2)}</div>
          </div>
          <div className={t.cardMuted}>
            <div className={`text-xs ${t.label} mb-1`}>Balance</div>
            <div className={`text-xl font-bold font-mono ${t.heading}`}>${balance.toFixed(2)}</div>
          </div>
          <div className={t.cardMuted}>
            <div className={`text-xs ${t.label} mb-1`}>Credit</div>
            <div className={`text-xl font-bold font-mono ${t.heading}`}>
              ${Number((account as any)?.credit ?? 0).toFixed(2)}
            </div>
          </div>
          <div className={t.cardMuted}>
            <div className={`text-xs ${t.label} mb-1`}>In positions (margin)</div>
            <div className={`text-xl font-bold font-mono ${t.heading}`}>
              ${(dashboard?.invested ?? margin).toFixed(2)}
            </div>
          </div>
          <div className={t.cardMuted}>
            <div className={`text-xs ${t.label} mb-1`}>Unrealized P/L</div>
            <div
              className={`text-xl font-bold font-mono ${
                (dashboard?.unrealizedPnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              ${(dashboard?.unrealizedPnl ?? 0).toFixed(2)}
            </div>
          </div>
        </div>

        {!isBank && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-sm">
          <div className={t.cardMuted}>
            <span className={t.label}>Equity </span>
            <span className={`font-mono ${t.heading}`}>${equity.toFixed(2)}</span>
          </div>
          <div className={t.cardMuted}>
            <span className={t.label}>Daily realized P/L </span>
            <span className={`font-mono ${t.heading}`}>${(dashboard?.dailyRealizedPnl ?? 0).toFixed(2)}</span>
          </div>
          <div className={t.cardMuted}>
            <span className={t.label}>Margin level </span>
            <span className={`font-mono ${t.heading}`}>
              {marginLevel > 0 ? `${marginLevel.toFixed(1)}%` : 'N/A'}
            </span>
          </div>
        </div>
        )}

        <div className={`grid grid-cols-1 ${isBank ? 'gap-3' : 'lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6'}`}>
          <div className={t.card}>
            <h2 className={`text-lg font-semibold ${t.heading} mb-4 flex items-center gap-2`}>
              <ArrowDownCircle className="h-5 w-5 text-emerald-400" />
              Deposit request
            </h2>
            <p className={`text-xs mb-3 ${t.label}`}>
              No payment gateway connected — admin approves after manual payment verification.
            </p>
            <div className="space-y-4">
              <input
                type="number"
                min={10}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Amount (USD)"
                className={t.input}
              />
              <button
                onClick={handleDeposit}
                disabled={loading}
                className={t.btn}
              >
                Submit deposit request
              </button>
            </div>
          </div>

          <div className={t.card}>
            <h2 className={`text-lg font-semibold ${t.heading} mb-4 flex items-center gap-2`}>
              <ArrowUpCircle className="h-5 w-5 text-amber-400" />
              Withdrawal request
            </h2>
            <div className="space-y-3">
              <input
                type="number"
                min={10}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount (max: free margin)"
                className={t.input}
              />
              <input
                value={payoutDetails}
                onChange={(e) => setPayoutDetails(e.target.value)}
                placeholder="Payout details (IBAN, wallet address, etc.)"
                className={t.input}
              />
              <button
                onClick={handleWithdraw}
                disabled={loading}
                className={t.btn}
              >
                Submit withdrawal request
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`mb-4 p-4 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-500/10 text-red-300 border border-red-500/30'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className={`grid grid-cols-1 ${isBank ? 'gap-3' : 'lg:grid-cols-2 gap-4 mb-6'}`}>
          <div className={t.card}>
            <h3 className={`text-sm font-semibold ${t.heading} mb-3`}>Recent deposits</h3>
            <ul className="space-y-2 text-xs max-h-40 overflow-y-auto">
              {deposits.length === 0 && <li className="text-slate-500">No deposit requests yet</li>}
              {deposits.map((d) => (
                <li key={d.id} className="flex justify-between border-b border-[#1e293b]/50 pb-1">
                  <span className={statusColor(d.status)}>{d.status}</span>
                  <span className={`font-mono ${t.heading}`}>${Number(d.amount).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={t.card}>
            <h3 className={`text-sm font-semibold ${t.heading} mb-3`}>Recent withdrawals</h3>
            <ul className="space-y-2 text-xs max-h-40 overflow-y-auto">
              {withdrawals.length === 0 && <li className="text-slate-500">No withdrawal requests yet</li>}
              {withdrawals.map((w) => (
                <li key={w.id} className="flex justify-between border-b border-[#1e293b]/50 pb-1">
                  <span className={statusColor(w.status)}>{w.status}</span>
                  <span className={`font-mono ${t.heading}`}>${Number(w.amount).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={t.card}>
          <h2 className={`text-lg font-semibold ${t.heading} mb-4 flex items-center gap-2`}>
            <History className={`h-5 w-5 ${t.label}`} />
            Ledger transactions
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className={`${t.label} uppercase`}>
                <tr>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-right py-2">Balance after</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-slate-500">
                      No ledger entries yet
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="border-t border-[#1e293b]/50">
                      <td className="py-2 text-slate-400">{new Date(tx.createdAt).toLocaleString()}</td>
                      <td className={`py-2 ${t.body}`}>{tx.type}</td>
                      <td
                        className={`py-2 text-right font-mono ${
                          tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {tx.amount >= 0 ? '+' : ''}
                        {Number(tx.amount).toFixed(2)}
                      </td>
                      <td className={`py-2 text-right font-mono ${t.heading}`}>
                        ${Number(tx.balanceAfter).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
