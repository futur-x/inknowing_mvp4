'use client'

// Book Dialogue Page - InKnowing MVP 4.0
// Business Logic Conservation: Book dialogue session page with real-time messaging

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { ChatContainer } from '@/components/chat/chat-container'
import { Loader2 } from 'lucide-react'
import { useChatStore } from '@/stores/chat'

function BookDialoguePageContent() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [bookId, setBookId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const activeSessions = useChatStore(state => state.activeSessions)
  const loadMessages = useChatStore(state => state.loadMessages)
  const connectWebSocket = useChatStore(state => state.connectWebSocket)
  const setCurrentSession = useChatStore(state => state.setCurrentSession)

  // Get current session without causing re-renders
  const currentSession = activeSessions.get(sessionId)
  const hasSession = !!currentSession
  const sessionBookId = currentSession?.session.book_id
  const messageCount = currentSession?.messages.length ?? 0

  // Effect for loading session data
  useEffect(() => {
    // Skip if we already have the session with bookId
    if (hasSession && sessionBookId && bookId === sessionBookId) {
      setIsLoading(false)
      return
    }

    // Load session data
    const loadSession = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Always load messages from API on mount
        await loadMessages(sessionId)

        // Set as current session
        setCurrentSession(sessionId)

        // Connect WebSocket for real-time messaging
        connectWebSocket(sessionId)

        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load session:', error)
        setError(error instanceof Error ? error.message : 'Failed to load session')
        setIsLoading(false)
      }
    }

    loadSession()
  }, [sessionId, hasSession, messageCount, loadMessages, bookId, sessionBookId])

  // Effect for updating bookId when session is loaded
  useEffect(() => {
    if (hasSession && sessionBookId && bookId !== sessionBookId) {
      setBookId(sessionBookId)
    }
  }, [hasSession, sessionBookId, bookId])

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

export default function BookDialoguePage() {
  const params = useParams()
  const sessionId = params.sessionId as string

  return (
    <AuthGuard redirectTo={`/auth/login?redirect=/chat/book/${sessionId}`}>
      <BookDialoguePageContent />
    </AuthGuard>
  )
}