'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, type UserPayload } from '@/stores/auth-store'

type Props = {
  open: boolean
  onClose: () => void
}

type AuthMode = 'login' | 'register'

export function AuthModal({ open, onClose }: Props) {
  const { setCredentials } = useAuthStore()
  const [mode, setMode] = useState<AuthMode>('login')
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    // reset transient messages when reopened
    setStatus(null)
  }, [open])

  // Clear form when switching modes
  useEffect(() => {
    if (mode === 'register') {
      setFullName('')
      setPhoneNumber('')
      setEmail('')
      setPassword('')
    }
  }, [mode])

  const handleSubmit = async () => {
    const nextMode = mode
    const nextEmail = email
    const nextPassword = password
    const nextFullName = fullName
    const nextPhone = phoneNumber.trim()

    if (!nextEmail || !nextPassword) {
      setStatus('Please enter email and password')
      return
    }

    if (nextMode === 'register' && !nextFullName) {
      setStatus('Please enter your full name')
      return
    }

    if (nextMode === 'register' && nextPhone.length < 6) {
      setStatus('Please enter a valid phone number')
      return
    }

    setLoading(true)
    setStatus(null)
    try {
      if (nextMode === 'login') {
        const tokens = await apiClient.post<{
          accessToken: string
          refreshToken: string
          user: UserPayload
        }>('/auth/login', { email: nextEmail, password: nextPassword })
        const role = String(tokens.user.role || 'USER').toUpperCase() as UserPayload['role']
        setCredentials({
          user: { ...tokens.user, role },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        })
        setStatus(
          tokens.user.status && tokens.user.status !== 'ACTIVE'
            ? 'Signed in. Waiting for admin approval before trading.'
            : 'Signed in successfully'
        )
        setTimeout(() => onClose(), 1000)
        return
      }

      const response = await apiClient.post<{
        accessToken: string
        refreshToken: string
        user: UserPayload
        message?: string
      }>('/auth/register', {
        fullName: nextFullName || 'New Trader',
        email: nextEmail,
        password: nextPassword,
        phoneNumber: nextPhone,
      })
      
      // Ensure we have the required fields
      if (!response.accessToken || !response.user) {
        throw new Error('Invalid response from server. Please try again.')
      }

      const role = String(response.user.role || 'USER').toUpperCase() as UserPayload['role']
      setCredentials({ 
        user: { ...response.user, role }, 
        accessToken: response.accessToken, 
        refreshToken: response.refreshToken 
      })
      
      setStatus(
        response.message ||
          'Account created. An administrator must approve your account before you can trade.'
      )
      
      // Don't reload immediately - let user see success message
      setTimeout(() => {
        onClose()
        // Small delay before reload to ensure state is saved
        setTimeout(() => {
          window.location.reload()
        }, 300)
      }, 2000)
    } catch (error: any) {
      console.error('Auth error:', error)
      const errorMessage = error?.message || error?.error?.message || error?.error || 'Something went wrong. Please try again.'
      setStatus(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f172a] via-[#0b1220] to-[#0a0f1c] p-6 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent-cyan">Access</p>
            <h2 className="text-2xl font-semibold leading-tight text-white">Secure trading workspace</h2>
            <p className="text-sm text-slate-400">Login or create a demo account in seconds.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm rounded-full border border-white/10 px-2 py-1">
            Close
          </button>
        </div>

        <div className="mt-4 flex rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === 'login' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-300 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === 'register' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-300 hover:text-white'
            }`}
          >
            Sign up
          </button>
        </div>

        <div className="mt-5 space-y-3" onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}>
          {mode === 'register' && (
            <>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.12em] text-slate-400">Full name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-0 focus:border-accent-purple focus:bg-white/10"
                  placeholder="Your name"
                  minLength={3}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.12em] text-slate-400">Phone number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-0 focus:border-accent-purple focus:bg-white/10"
                  placeholder="+1 555 000 0000"
                  minLength={6}
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.12em] text-slate-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-0 focus:border-accent-purple focus:bg-white/10"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.12em] text-slate-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-0 focus:border-accent-purple focus:bg-white/10"
              placeholder="••••••••"
              minLength={6}
              required
            />
            {mode === 'register' && (
              <p className="text-xs text-slate-500">Minimum 6 characters</p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => void handleSubmit()}
              disabled={loading}
              className="inline-flex justify-center rounded-lg bg-gradient-to-r from-[#7c3aed] via-[#2563eb] to-[#22d3ee] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}
            </button>
          </div>

          {status && (
            <p className={`text-sm ${status.includes('successfully') || status.includes('created') ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
