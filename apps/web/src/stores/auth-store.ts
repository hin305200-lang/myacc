'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserPayload = {
  userId: string
  email: string
  role: 'USER' | 'ADMIN'
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | string
}

type AuthState = {
  user: UserPayload | null
  accessToken: string | null
  refreshToken: string | null
  setCredentials: (payload: {
    user: UserPayload
    accessToken: string
    refreshToken: string
  }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setCredentials: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'nexus-auth',
    }
  )
)


