// Dialogue Hooks - InKnowing MVP 4.0
// Business Logic Conservation: Dialogue session and message management

import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { api } from '@/lib/api'
import { swrConfig } from './swr-config'
import { useAuthStore } from '@/stores/auth'
import type {
  DialogueSession,
  DialogueMessage,
  DialogueContext
} from '@/types/api'

// Hook for dialogue history - Business Logic: User conversation history
export function useDialogueHistory(params: {
  book_id?: string
  type?: 'book' | 'character'
  page?: number
  limit?: number
} = {}) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  const queryString = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined)
    ) as Record<string, string>
  ).toString()

  const key = isAuthenticated
    ? `/dialogues/history${queryString ? `?${queryString}` : ''}`
    : null

  const { data, error, isLoading, mutate } = useSWR<{
    sessions: DialogueSession[]
    pagination: any
  }>(
    key,
    () => api.dialogues.getHistory(params),
    {
      ...swrConfig,
      revalidateOnFocus: false, // Don't auto-refresh history
    }
  )

  return {
    sessions: data?.sessions || [],
    pagination: data?.pagination || null,
    isLoading,
    error,
    mutate,
  }
}

// Hook for infinite loading of dialogue history
export function useDialogueHistoryInfinite(params: {
  book_id?: string
  type?: 'book' | 'character'
  limit?: number
} = {}) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (!isAuthenticated) return null
    if (previousPageData && !previousPageData.pagination?.has_next) return null

    const queryParams = {
      ...params,
      page: pageIndex + 1,
    }

    const queryString = new URLSearchParams(
      Object.fromEntries(
        Object.entries(queryParams).filter(([_, value]) => value !== undefined)
      ) as Record<string, string>
    ).toString()

    return `/dialogues/history?${queryString}`
  }

  const { data, error, size, setSize, isLoading, mutate } = useSWRInfinite<{
    sessions: DialogueSession[]
    pagination: any
  }>(
    getKey,
    (url) => {
      const searchParams = new URLSearchParams(url.split('?')[1])
      const fetchParams = {
        ...params,
        page: parseInt(searchParams.get('page') || '1'),
      }
      return api.dialogues.getHistory(fetchParams)
    },
    swrConfig
  )

  const sessions = data ? data.flatMap(page => page.sessions) : []
  const hasMore = data ? data[data.length - 1]?.pagination?.has_next ?? false : false

  return {
    sessions,
    isLoading,
    error,
    hasMore,
    loadMore: () => setSize(size + 1),
    mutate,
  }
}

// Hook for dialogue messages - Business Logic: Message history retrieval
export function useDialogueMessages(sessionId: string | null, page = 1, limit = 20) {
  const key = sessionId ? `/dialogues/${sessionId}/messages?page=${page}&limit=${limit}` : null

  const { data, error, isLoading, mutate } = useSWR<{
    messages: DialogueMessage[]
    pagination: any
  }>(
    key,
    () => sessionId ? api.dialogues.getMessages(sessionId, page, limit) : null,
    {
      ...swrConfig,
      revalidateOnFocus: false, // Don't auto-refresh messages
    }
  )

  return {
    messages: data?.messages || [],
    pagination: data?.pagination || null,
    isLoading,
    error,
    mutate,
  }
}

// Hook for infinite loading of dialogue messages (useful for chat scrolling)
export function useDialogueMessagesInfinite(sessionId: string | null, limit = 20) {
  const getKey = (pageIndex: number, previousPageData: any) => {
    if (!sessionId) return null
    if (previousPageData && !previousPageData.pagination?.has_prev) return null

    return `/dialogues/${sessionId}/messages?page=${pageIndex + 1}&limit=${limit}`
  }

  const { data, error, size, setSize, isLoading, mutate } = useSWRInfinite<{
    messages: DialogueMessage[]
    pagination: any
  }>(
    getKey,
    (url) => {
      const searchParams = new URLSearchParams(url.split('?')[1])
      const page = parseInt(searchParams.get('page') || '1')
      return sessionId ? api.dialogues.getMessages(sessionId, page, limit) : null
    },
    {
      ...swrConfig,
      revalidateOnFocus: false,
    }
  )

  // For chat, we want oldest messages first, so reverse the order
  const messages = data ? data.reverse().flatMap(page => page.messages.reverse()) : []
  const hasMore = data ? data[0]?.pagination?.has_prev ?? false : false

  return {
    messages,
    isLoading,
    error,
    hasMore,
    loadMore: () => setSize(size + 1),
    mutate,
    // Helper to add new message to cache
    addMessage: (message: DialogueMessage) => {
      if (data) {
        const newData = [...data]
        // Add to the last (most recent) page
        if (newData.length > 0) {
          newData[newData.length - 1] = {
            ...newData[newData.length - 1],
            messages: [...newData[newData.length - 1].messages, message]
          }
        }
        mutate(newData, false)
      }
    }
  }
}

// Hook for dialogue context - Business Logic: Conversation context tracking
export function useDialogueContext(sessionId: string | null) {
  const key = sessionId ? `/dialogues/${sessionId}/context` : null

  const { data, error, isLoading, mutate } = useSWR<DialogueContext>(
    key,
    () => sessionId ? api.dialogues.getContext(sessionId) : null,
    {
      ...swrConfig,
      refreshInterval: 1000 * 30, // Refresh every 30 seconds during active dialogue
      revalidateOnFocus: false,
    }
  )

  return {
    context: data,
    isLoading,
    error,
    mutate,
    // Helper getters
    bookContext: data?.book_context || null,
    characterContext: data?.character_context || null,
    currentChapter: data?.book_context?.current_chapter || null,
    discussedTopics: data?.book_context?.discussed_topics || [],
    keyReferences: data?.book_context?.key_references || [],
    characterState: data?.character_context?.character_state || null,
    rememberedFacts: data?.character_context?.remembered_facts || [],
  }
}

// Hook for managing active dialogue sessions
export function useActiveDialogues() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  // Get recent active sessions (limit to last 10)
  const { sessions, isLoading, error, mutate } = useDialogueHistory({
    limit: 10,
  })

  // Filter only active sessions
  const activeSessions = sessions.filter(session => session.status === 'active')

  return {
    sessions: activeSessions,
    isLoading,
    error,
    mutate,
    // Helper functions
    hasActiveSessions: activeSessions.length > 0,
    sessionCount: activeSessions.length,
    // Get most recent session
    mostRecentSession: activeSessions.length > 0
      ? activeSessions.sort((a, b) =>
          new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
        )[0]
      : null,
  }
}

// Hook for dialogue session analytics (useful for tracking user engagement)
export function useDialogueAnalytics(sessionId: string | null) {
  const { messages } = useDialogueMessages(sessionId)
  const { context } = useDialogueContext(sessionId)

  if (!sessionId || !messages) {
    return {
      messageCount: 0,
      userMessageCount: 0,
      aiMessageCount: 0,
      averageMessageLength: 0,
      topicsDiscussed: 0,
      referencesCount: 0,
      duration: null,
    }
  }

  const userMessages = messages.filter(m => m.role === 'user')
  const aiMessages = messages.filter(m => m.role === 'assistant')

  const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0)
  const averageLength = messages.length > 0 ? totalLength / messages.length : 0

  const startTime = messages.length > 0 ? new Date(messages[0].timestamp) : null
  const endTime = messages.length > 0 ? new Date(messages[messages.length - 1].timestamp) : null
  const duration = startTime && endTime ? endTime.getTime() - startTime.getTime() : null

  return {
    messageCount: messages.length,
    userMessageCount: userMessages.length,
    aiMessageCount: aiMessages.length,
    averageMessageLength: Math.round(averageLength),
    topicsDiscussed: context?.book_context?.discussed_topics.length || 0,
    referencesCount: context?.book_context?.key_references.length || 0,
    duration,
    // Formatted duration
    durationFormatted: duration ? `${Math.round(duration / 60000)} minutes` : null,
  }
}