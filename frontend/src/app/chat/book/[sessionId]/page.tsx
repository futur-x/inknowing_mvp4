'use client'

// Book Dialogue Page - InKnowing MVP 4.0
// Business Logic Conservation: Book dialogue session page with real-time messaging

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChatContainer } from '@/components/chat/chat-container'
import { Loader2 } from 'lucide-react'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'

export default function BookDialoguePage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [bookId, setBookId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { isAuthenticated } = useAuthStore()
  const { activeSessions, loadMessages } = useChatStore()

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    // Load session data
    const loadSession = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Check if session exists in store
        const session = activeSessions.get(sessionId)

        if (session) {
          // Session exists in store
          setBookId(session.session.book_id)

          // Load messages if not already loaded
          if (session.messages.length === 0) {
            await loadMessages(sessionId)
          }
        } else {
          // Session not in store, load from API
          await loadMessages(sessionId)

          // Check again after loading
          const loadedSession = activeSessions.get(sessionId)
          if (loadedSession) {
            setBookId(loadedSession.session.book_id)
          } else {
            throw new Error('Session not found')
          }
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load session:', error)
        setError(error instanceof Error ? error.message : 'Failed to load session')
        setIsLoading(false)
      }
    }

    loadSession()
  }, [sessionId, isAuthenticated, activeSessions, loadMessages, router])

  // Handle session end
  const handleSessionEnd = () => {
    router.push('/discovery')
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">加载对话中...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-4 text-6xl">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">加载失败</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => router.push('/discovery')}
            className="text-primary hover:underline"
          >
            返回发现页面
          </button>
        </div>
      </div>
    )
  }

  // No book ID error
  if (!bookId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-4 text-6xl">📚</div>
          <h2 className="text-xl font-semibold mb-2">会话信息不完整</h2>
          <p className="text-muted-foreground mb-4">
            无法找到该会话对应的书籍信息
          </p>
          <button
            onClick={() => router.push('/discovery')}
            className="text-primary hover:underline"
          >
            返回发现页面
          </button>
        </div>
      </div>
    )
  }

  return (
    <ChatContainer
      sessionId={sessionId}
      type="book"
      bookId={bookId}
      onSessionEnd={handleSessionEnd}
    />
  )
}