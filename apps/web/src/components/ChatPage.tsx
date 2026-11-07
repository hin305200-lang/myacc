'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageSquare, Send, User, Shield } from 'lucide-react'
import { useChat } from '@/hooks/useChat'

export default function ChatPage() {
  const {
    isAdmin,
    threads,
    threadsLoading,
    activeUserId,
    setActiveUserId,
    messages,
    messagesLoading,
    sendMessage,
    sendAdminMessage,
    sending,
    markRead,
  } = useChat()

  const [content, setContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAdmin && threads.length > 0 && !activeUserId) {
      setActiveUserId(threads[0].userId)
    }
    if (isAdmin && threads.length > 0 && !activeUserId) {
      setActiveUserId(threads[0].userId)
    }
  }, [isAdmin, threads, activeUserId, setActiveUserId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (activeUserId && messages.length > 0) {
      // Mark messages as read when viewing thread
      const unreadMessages = messages.filter(
        m => m.userId === activeUserId && 
        ((isAdmin && m.fromRole === 'USER') || (!isAdmin && m.fromRole === 'ADMIN')) &&
        !m.readAt
      )
      if (unreadMessages.length > 0) {
        markRead(activeUserId).catch(console.error)
      }
    }
  }, [activeUserId, messages, isAdmin, markRead])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!content.trim() || sending) return
    const text = content.trim()
    setContent('')
    try {
      if (isAdmin) {
        if (!activeUserId) return
        await sendAdminMessage({ userId: activeUserId, content: text })
      } else {
        await sendMessage(text)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-[#0a0e27]">
      {/* Sidebar for Admin */}
      {isAdmin && (
        <div className="w-full lg:w-64 bg-[#161b3d] border-b lg:border-b-0 lg:border-r border-[#1e293b] flex flex-col max-h-[200px] lg:max-h-none">
          <div className="p-4 border-b border-[#1e293b]">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#94a3b8]" />
              Conversations
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threadsLoading ? (
              <div className="p-4 text-center text-[#94a3b8]">Loading...</div>
            ) : threads.length === 0 ? (
              <div className="p-4 text-center text-[#94a3b8] text-sm">No conversations yet</div>
            ) : (
              threads.map((thread) => {
                const unreadCount = messages.filter(
                  m => m.userId === thread.userId && m.fromRole === 'USER' && !m.readAt
                ).length
                return (
                  <button
                    key={thread.id}
                    onClick={() => setActiveUserId(thread.userId)}
                    className={`w-full text-left px-4 py-3 border-b border-[#1e293b] hover:bg-[#161b3d]/50 transition ${
                      activeUserId === thread.userId ? 'bg-[#161b3d] border-l-4 border-l-[#94a3b8]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {thread.userName || thread.userEmail || thread.userId.substring(0, 8)}
                      </div>
                      {unreadCount > 0 && (
                        <span className="bg-[#6366f1] text-white text-xs px-2 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {thread.userEmail && (
                      <div className="text-[11px] text-[#64748b] truncate mb-0.5">{thread.userEmail}</div>
                    )}
                    <div className="text-xs text-[#94a3b8] truncate">{thread.content}</div>
                    <div className="text-[10px] text-[#a69b8a] mt-1 flex items-center justify-between gap-2">
                      <span>{formatTime(thread.createdAt)}</span>
                      {thread.userStatus && (
                        <span className={thread.userStatus === 'ACTIVE' ? 'text-green-400' : 'text-yellow-300'}>
                          {thread.userStatus}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-[#1e293b] bg-[#161b3d]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#94a3b8]" />
            {isAdmin
              ? `Chat with ${
                  threads.find((t) => t.userId === activeUserId)?.userName ||
                  threads.find((t) => t.userId === activeUserId)?.userEmail ||
                  activeUserId?.substring(0, 8) ||
                  'User'
                }`
              : 'Support Chat'}
          </h2>
          <p className="text-xs text-[#94a3b8] mt-1">
            {isAdmin
              ? 'All user messages arrive here — reply below'
              : 'Message the admin anytime (even before account approval)'}
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0e27]">
          {messagesLoading ? (
            <div className="text-center text-[#94a3b8] py-8">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-[#1e293b] mx-auto mb-4" />
              <p className="text-[#94a3b8]">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.fromRole === 'ADMIN' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    msg.fromRole === 'ADMIN'
                      ? 'bg-[#6366f1] text-white'
                      : 'bg-[#161b3d] border border-[#1e293b] text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">
                      {msg.fromRole === 'ADMIN' ? 'Admin' : 'You'}
                    </span>
                    <span className="text-[10px] opacity-70">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[#1e293b] bg-[#161b3d]">
          <form onSubmit={handleSend} className="flex gap-2">
            <textarea
              className="flex-1 px-4 py-2 border border-[#1e293b] rounded-lg bg-[#0d1230] text-white focus:outline-none focus:ring-2 focus:ring-[#94a3b8] resize-none"
              rows={2}
              placeholder="Type your message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <button
              type="submit"
              disabled={sending || !content.trim() || (isAdmin && !activeUserId)}
              className="px-6 py-2 bg-[#6366f1] text-white rounded-lg hover:bg-[#4f46e5] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
