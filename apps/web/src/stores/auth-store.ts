'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

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
  /** False until localStorage rehydration finishes — avoid flash-login modal */
  _hasHydrated: boolean
  setHasHydrated: (value: boolean) => void
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
      _hasHydrated: false,
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      setCredentials: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'nexus-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

/** Hook: true after persisted session has been read from localStorage */
export function useAuthHydrated() {
  return useAuthStore((s) => s._hasHydrated)
}
