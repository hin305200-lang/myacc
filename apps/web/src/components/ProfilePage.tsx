'use client'

import { User, Mail, Phone, Edit2, Save, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { useAuthStore } from '@/stores/auth-store'
import { getPageTheme, type PageAppearance } from '@/lib/page-theme'
import AccountPageShell, { AccountPanel, AccountStat } from '@/components/AccountPageShell'

export default function ProfilePage({
  appearance = 'terminal',
  compact = false,
}: {
  appearance?: PageAppearance
  compact?: boolean
}) {
  const t = getPageTheme(appearance)
  const isBank = appearance === 'banking'
  const { profile, isLoading, update, updating } = useProfile()
  const user = useAuthStore((s) => s.user)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        email: profile.email || '',
        phoneNumber: profile.phoneNumber || '',
      })
    }
  }, [profile])

  const handleSave = async () => {
    try {
      await update({
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
      })
      setMessage({ type: 'success', text: 'Profile updated successfully' })
      setIsEditing(false)
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' })
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        email: profile.email || '',
        phoneNumber: profile.phoneNumber || '',
      })
    }
    setIsEditing(false)
    setMessage(null)
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${isBank ? 'py-8' : 'h-full bg-[#0a0e27]'}`}>
        <div className={t.label}>Loading profile...</div>
      </div>
    )
  }

  const form = (
    <>
      {message && (
        <div
          className={`p-3 rounded-xl text-sm border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}
        >
          {message.text}
        </div>
      )}

      {!isBank && !compact && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <AccountStat label="Status" value={String(user?.status || '—')} accent="cyan" />
          <AccountStat label="KYC" value={String(user?.kycStatus || '—')} accent="amber" />
          <AccountStat label="Leverage" value={`1:${profile?.leverage || 10}`} accent="violet" />
        </div>
      )}

      <AccountPanel glow={!(isBank || compact)} className={isBank && compact ? '!p-0 border-0 bg-transparent shadow-none' : ''}>
        <div className={`flex items-center justify-between mb-4 ${isBank && compact ? 'px-0' : ''}`}>
          <h2 className={`text-sm font-semibold ${isBank ? t.heading : 'text-white'}`}>Personal information</h2>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-3 py-1.5 text-xs font-semibold text-white"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={updating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {updating ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-xs font-medium ${isBank ? t.label : 'text-slate-400'} mb-1.5 flex items-center gap-2`}>
              <User className="h-3.5 w-3.5" />
              Full name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className={
                  isBank
                    ? t.input
                    : 'w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/50'
                }
                placeholder="Enter your full name"
              />
            ) : (
              <div
                className={`px-3 py-2.5 rounded-xl text-sm ${
                  isBank ? 'bg-slate-50 border border-slate-200 text-slate-900' : 'bg-white/[0.03] border border-white/10 text-white'
                }`}
              >
                {profile?.fullName || 'Not set'}
              </div>
            )}
          </div>

          <div>
            <label className={`block text-xs font-medium ${isBank ? t.label : 'text-slate-400'} mb-1.5 flex items-center gap-2`}>
              <Mail className="h-3.5 w-3.5" />
              Email
            </label>
            {isEditing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={
                  isBank
                    ? t.input
                    : 'w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/50'
                }
                placeholder="Enter your email"
              />
            ) : (
              <div
                className={`px-3 py-2.5 rounded-xl text-sm ${
                  isBank ? 'bg-slate-50 border border-slate-200 text-slate-900' : 'bg-white/[0.03] border border-white/10 text-white'
                }`}
              >
                {profile?.email || 'Not set'}
              </div>
            )}
          </div>

          <div>
            <label className={`block text-xs font-medium ${isBank ? t.label : 'text-slate-400'} mb-1.5 flex items-center gap-2`}>
              <Phone className="h-3.5 w-3.5" />
              Phone number
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className={
                  isBank
                    ? t.input
                    : 'w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/50'
                }
                placeholder="Enter your phone number"
              />
            ) : (
              <div
                className={`px-3 py-2.5 rounded-xl text-sm ${
                  isBank ? 'bg-slate-50 border border-slate-200 text-slate-900' : 'bg-white/[0.03] border border-white/10 text-white'
                }`}
              >
                {profile?.phoneNumber || 'Not set'}
              </div>
            )}
          </div>

          {profile && (
            <div className={`pt-3 border-t ${isBank ? 'border-slate-200' : 'border-white/[0.08]'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className={`${isBank ? t.label : 'text-slate-500'} mb-1 text-xs`}>Account ID</div>
                  <div className={`font-mono text-xs ${isBank ? t.heading : 'text-slate-200'}`}>{profile.id}</div>
                </div>
                <div>
                  <div className={`${isBank ? t.label : 'text-slate-500'} mb-1 text-xs`}>Leverage</div>
                  <div className={isBank ? t.heading : 'text-white'}>1:{profile.leverage || 10}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AccountPanel>
    </>
  )

  if (isBank || compact) {
    return <div className={isBank && compact ? 'p-4 space-y-3' : t.page}>{form}</div>
  }

  return (
    <AccountPageShell
      icon={User}
      eyebrow="Identity"
      title="Profile"
      subtitle="Manage the identity details used for KYC and support."
    >
      {form}
    </AccountPageShell>
  )
}
