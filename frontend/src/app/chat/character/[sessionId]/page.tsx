'use client'

// Character Dialogue Page - InKnowing MVP 4.0
// Business Logic Conservation: Character dialogue session page with immersive conversation

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { ChatContainer } from '@/components/chat/chat-container'
import { Loader2 } from 'lucide-react'
import { useChatStore } from '@/stores/chat'

function CharacterDialoguePageContent() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [bookId, setBookId] = useState<string>('')
  const [characterId, setCharacterId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { activeSessions, loadMessages } = useChatStore()

  useEffect(() => {
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
          setCharacterId(session.session.character_id || '')

          // Verify this is a character session
          if (session.session.type !== 'character') {
            throw new Error('This is not a character dialogue session')
          }

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
            // Verify this is a character session
            if (loadedSession.session.type !== 'character') {
              throw new Error('This is not a character dialogue session')
            }

            setBookId(loadedSession.session.book_id)
            setCharacterId(loadedSession.session.character_id || '')
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
  }, [sessionId, activeSessions, loadMessages, router])

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
          <p className="text-muted-foreground">加载角色对话中...</p>
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

  // No book or character ID error
  if (!bookId || !characterId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-4 text-6xl">🎭</div>
          <h2 className="text-xl font-semibold mb-2">会话信息不完整</h2>
          <p className="text-muted-foreground mb-4">
            无法找到该会话对应的角色信息
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
      type="character"
      bookId={bookId}
      characterId={characterId}
      onSessionEnd={handleSessionEnd}
    />
  )
}

export default function CharacterDialoguePage() {
  const params = useParams()
  const sessionId = params.sessionId as string

  return (
    <AuthGuard redirectTo={`/auth/login?redirect=/chat/character/${sessionId}`}>
      <CharacterDialoguePageContent />
    </AuthGuard>
  )
}