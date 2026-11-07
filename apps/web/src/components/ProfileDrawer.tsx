'use client'

import { useState, useEffect } from 'react'
import { useProfile } from '@/hooks/useProfile'

type Props = {
  open: boolean
  onClose: () => void
}

export function ProfileDrawer({ open, onClose }: Props) {
  const { profile, isLoading, update, updating } = useProfile()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [leverage, setLeverage] = useState(10)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName ?? '')
      setEmail(profile.email ?? '')
      setLeverage(profile.leverage ?? 10)
    }
  }, [profile])

  const handleSave = async () => {
    setStatus(null)
    try {
      await update({ fullName, email, leverage })
      setStatus('Saved')
    } catch (err: any) {
      setStatus(err?.message ?? 'Failed')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md h-full bg-bg-secondary border-l border-[#1e293b] flex flex-col">
        <div className="p-4 border-b border-[#1e293b] flex items-center justify-between">
          <h2 className="text-lg font-semibold">Profile & Settings</h2>
          <button onClick={onClose} className="text-[#94a3b8] hover:text-white">Close</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <p className="text-sm text-[#94a3b8]">Loading...</p>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs text-[#94a3b8]">Full Name</label>
                <input
                  className="w-full bg-bg-card border border-[#1e293b] rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-purple"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#94a3b8]">Email</label>
                <input
                  type="email"
                  className="w-full bg-bg-card border border-[#1e293b] rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-purple"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#94a3b8]">Leverage</label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  className="w-full bg-bg-card border border-[#1e293b] rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-purple"
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value) || 1)}
                />
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-[#1e293b] flex items-center justify-between">
          <div className="text-xs text-[#94a3b8]">{status}</div>
          <button
            onClick={handleSave}
            disabled={updating}
            className="px-4 py-2 rounded bg-accent-purple text-white font-semibold disabled:opacity-60"
          >
            {updating ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

