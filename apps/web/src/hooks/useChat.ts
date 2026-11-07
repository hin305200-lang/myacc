'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { useSharedSocket } from './useMarketData'

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
}

export type ChatThreadPreview = ChatMessage

export const useChat = () => {
  const token = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const socket = useSharedSocket()
  const isAdmin = user?.role === 'ADMIN'

  const threadsQuery = useQuery({
    queryKey: ['chat-threads'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ChatThreadPreview[] }>('/chat/threads', token ?? undefined)
      return res.data
    },
    enabled: !!token,
  })

  const [activeUserId, setActiveUserId] = useState<string | null>(null)

  const threadQuery = useQuery({
    queryKey: ['chat-thread', activeUserId],
    queryFn: async () => {
      if (!activeUserId) return []
      if (!isAdmin && activeUserId !== user?.userId) return []
      // admin fetch specific, user uses threads result
      if (isAdmin) {
        const res = await apiClient.get<{ data: ChatMessage[] }>(`/chat/thread/${activeUserId}`, token ?? undefined)
        return res.data
      }
      // For users, fetch their own thread
      const res = await apiClient.get<{ data: ChatMessage[] }>('/chat/threads', token ?? undefined)
      return res.data
    },
    enabled: !!token && (!!activeUserId || !isAdmin),
    refetchInterval: 2000, // Refetch every 2 seconds for real-time updates
  })

  useEffect(() => {
    if (!isAdmin && user?.userId) {
      setActiveUserId(user.userId)
    }
  }, [isAdmin, user?.userId])

  useEffect(() => {
    if (!socket) return
    const handler = (msg: ChatMessage) => {
      if (isAdmin) {
        queryClient.invalidateQueries({ queryKey: ['chat-threads'] })
        if (activeUserId === msg.userId) {
          queryClient.invalidateQueries({ queryKey: ['chat-thread', activeUserId] })
        }
      } else if (msg.userId === user?.userId) {
        queryClient.invalidateQueries({ queryKey: ['chat-threads'] })
        queryClient.invalidateQueries({ queryKey: ['chat-thread', user.userId] })
      }
    }
    socket.on('chat:new', handler)
    socket.on('chat:new-admin', handler)
    return () => {
      socket.off('chat:new', handler)
      socket.off('chat:new-admin', handler)
    }
  }, [socket, isAdmin, user?.userId, activeUserId, queryClient])

  const sendUserMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiClient.post<{ data: ChatMessage }>('/chat/send', { content }, token ?? undefined)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] })
      if (!isAdmin && user?.userId) {
        queryClient.invalidateQueries({ queryKey: ['chat-thread', user.userId] })
      }
      // Refetch immediately for real-time feel
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['chat-thread', activeUserId] })
      }, 100)
    },
  })

  const sendAdminMutation = useMutation({
    mutationFn: async ({ userId, content }: { userId: string; content: string }) => {
      const res = await apiClient.post<{ data: ChatMessage }>('/chat/send-admin', { userId, content }, token ?? undefined)
      return res.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] })
      queryClient.invalidateQueries({ queryKey: ['chat-thread', variables.userId] })
      // Refetch immediately for real-time feel
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['chat-thread', variables.userId] })
      }, 100)
    },
  })

  const markRead = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.post('/chat/read', { userId }, token ?? undefined)
    },
    onSuccess: (_data, userId) => {
      if (isAdmin) {
        queryClient.invalidateQueries({ queryKey: ['chat-threads'] })
      }
      queryClient.invalidateQueries({ queryKey: ['chat-thread', userId] })
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
    sending: sendUserMutation.isPending || sendAdminMutation.isPending,
    markRead: markRead.mutateAsync,
  }
}

