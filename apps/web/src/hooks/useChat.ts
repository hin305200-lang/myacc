'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'

export type ChatMessage = {
  id: string
  userId: string
  adminId?: string | null
  fromRole: 'USER' | 'ADMIN'
  content: string
  createdAt: string
  readAt?: string | null
  userName?: string
  userEmail?: string
  userStatus?: string
  pending?: boolean
}

export type ChatThreadPreview = ChatMessage

const POLL_MS = 800

function upsertMessage(list: ChatMessage[] | undefined, msg: ChatMessage): ChatMessage[] {
  const prev = list ?? []
  if (prev.some((m) => m.id === msg.id)) {
    return prev.map((m) => (m.id === msg.id ? { ...m, ...msg, pending: false } : m))
  }
  // Replace optimistic temp message with the real one (same content, near time)
  const withoutTemp = prev.filter(
    (m) =>
      !(
        m.pending &&
        m.content === msg.content &&
        m.fromRole === msg.fromRole &&
        m.userId === msg.userId
      )
  )
  return [...withoutTemp, msg]
}

/** Keep local "Sending…" bubbles until the server row arrives */
function mergeWithPending(
  server: ChatMessage[],
  cached: ChatMessage[] | undefined
): ChatMessage[] {
  const pending = (cached ?? []).filter((m) => m.pending)
  if (pending.length === 0) return server
  const extras = pending.filter(
    (p) =>
      !server.some(
        (s) =>
          s.content === p.content &&
          s.fromRole === p.fromRole &&
          s.userId === p.userId &&
          Math.abs(new Date(s.createdAt).getTime() - new Date(p.createdAt).getTime()) < 60_000
      )
  )
  return extras.length ? [...server, ...extras] : server
}

export const useChat = () => {
  const token = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'ADMIN'

  const threadsQuery = useQuery({
    queryKey: ['chat-threads'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ChatThreadPreview[] }>('/chat/threads', token ?? undefined)
      return res.data
    },
    enabled: !!token,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
    staleTime: 0,
  })

  const [activeUserId, setActiveUserId] = useState<string | null>(null)

  const threadKeyUserId = isAdmin ? activeUserId : user?.userId ?? null

  const threadQuery = useQuery({
    queryKey: ['chat-thread', threadKeyUserId],
    queryFn: async () => {
      let server: ChatMessage[] = []
      if (isAdmin) {
        if (!activeUserId) return []
        const res = await apiClient.get<{ data: ChatMessage[] }>(
          `/chat/thread/${activeUserId}`,
          token ?? undefined
        )
        server = res.data
      } else {
        const res = await apiClient.get<{ data: ChatMessage[] }>('/chat/threads', token ?? undefined)
        server = res.data
      }
      const cached = queryClient.getQueryData<ChatMessage[]>(['chat-thread', threadKeyUserId])
      return mergeWithPending(server, cached)
    },
    enabled: !!token && !!threadKeyUserId,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
    staleTime: 0,
  })

  useEffect(() => {
    if (!isAdmin && user?.userId) {
      setActiveUserId(user.userId)
    }
  }, [isAdmin, user?.userId])

  const patchThreadCache = (userId: string, msg: ChatMessage) => {
    const key = ['chat-thread', userId]
    queryClient.setQueryData<ChatMessage[]>(key, (old) => upsertMessage(old, msg))
  }

  const patchThreadsPreview = (msg: ChatMessage) => {
    queryClient.setQueryData<ChatThreadPreview[]>(['chat-threads'], (old) => {
      if (!isAdmin) {
        // User view stores full thread in this key too
        return upsertMessage(old as ChatMessage[] | undefined, msg) as ChatThreadPreview[]
      }
      const prev = old ?? []
      const rest = prev.filter((t) => t.userId !== msg.userId)
      const existing = prev.find((t) => t.userId === msg.userId)
      return [
        {
          ...msg,
          userName: existing?.userName ?? msg.userName,
          userEmail: existing?.userEmail ?? msg.userEmail,
          userStatus: existing?.userStatus ?? msg.userStatus,
        },
        ...rest,
      ]
    })
  }

  const sendUserMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiClient.post<{ data: ChatMessage }>('/chat/send', { content }, token ?? undefined)
      return res.data
    },
    onMutate: async (content) => {
      if (!user?.userId) return
      const optimistic: ChatMessage = {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: user.userId,
        fromRole: 'USER',
        content,
        createdAt: new Date().toISOString(),
        pending: true,
      }
      await queryClient.cancelQueries({ queryKey: ['chat-thread', user.userId] })
      patchThreadCache(user.userId, optimistic)
      patchThreadsPreview(optimistic)
      return { optimisticId: optimistic.id }
    },
    onSuccess: (msg) => {
      if (!user?.userId) return
      patchThreadCache(user.userId, { ...msg, pending: false })
      patchThreadsPreview({ ...msg, pending: false })
    },
    onError: (_err, _content, ctx) => {
      if (!user?.userId || !ctx?.optimisticId) return
      queryClient.setQueryData<ChatMessage[]>(['chat-thread', user.userId], (old) =>
        (old ?? []).filter((m) => m.id !== ctx.optimisticId)
      )
    },
  })

  const sendAdminMutation = useMutation({
    mutationFn: async ({ userId, content }: { userId: string; content: string }) => {
      const res = await apiClient.post<{ data: ChatMessage }>(
        '/chat/send-admin',
        { userId, content },
        token ?? undefined
      )
      return res.data
    },
    onMutate: async ({ userId, content }) => {
      const optimistic: ChatMessage = {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId,
        adminId: user?.userId,
        fromRole: 'ADMIN',
        content,
        createdAt: new Date().toISOString(),
        pending: true,
      }
      await queryClient.cancelQueries({ queryKey: ['chat-thread', userId] })
      patchThreadCache(userId, optimistic)
      patchThreadsPreview(optimistic)
      return { optimisticId: optimistic.id, userId }
    },
    onSuccess: (msg, variables) => {
      patchThreadCache(variables.userId, { ...msg, pending: false })
      patchThreadsPreview({ ...msg, pending: false })
    },
    onError: (_err, variables, ctx) => {
      if (!ctx?.optimisticId) return
      queryClient.setQueryData<ChatMessage[]>(['chat-thread', variables.userId], (old) =>
        (old ?? []).filter((m) => m.id !== ctx.optimisticId)
      )
    },
  })

  const markRead = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.post('/chat/read', { userId }, token ?? undefined)
    },
    onSuccess: (_data, userId) => {
      queryClient.setQueryData<ChatMessage[]>(['chat-thread', userId], (old) =>
        (old ?? []).map((m) =>
          !m.readAt &&
          ((isAdmin && m.fromRole === 'USER') || (!isAdmin && m.fromRole === 'ADMIN'))
            ? { ...m, readAt: new Date().toISOString() }
            : m
        )
      )
      if (isAdmin) {
        void queryClient.invalidateQueries({ queryKey: ['chat-threads'] })
      }
    },
  })

  return {
    isAdmin,
    threads: threadsQuery.data ?? [],
    threadsLoading: threadsQuery.isLoading,
    activeUserId,
    setActiveUserId,
    messages: threadQuery.data ?? [],
    messagesLoading: threadQuery.isLoading,
    sendMessage: sendUserMutation.mutateAsync,
    sendAdminMessage: sendAdminMutation.mutateAsync,
    // Don't block the input while a previous send is in flight — optimistic UI covers it
    sending: false,
    markRead: markRead.mutateAsync,
  }
}
