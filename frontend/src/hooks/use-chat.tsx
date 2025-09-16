'use client'

// Use Chat Hook - InKnowing MVP 4.0
// Business Logic Conservation: Chat management hook integrating with chat store

import { useEffect, useCallback, useState, useRef } from 'react'
import { useChatStore, useCurrentSession, useSessionMessages } from '@/stores/chat'
import { useWebSocket } from './use-websocket'
import type {
  UseChatOptions,
  UseChatReturn,
  ChatMessage,
  ChatSession,
  ChatExportOptions,
  ChatSearchOptions,
  ConnectionStatus,
} from '@/types/chat'
import type { WebSocketEvent } from '@/types/websocket'

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    sessionId,
    autoConnect = true,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxRetries = 3,
    onMessage,
    onTyping,
    onError,
    onConnect,
    onDisconnect,
  } = options

  // Chat store
  const {
    activeSessions,
    currentSessionId,
    isLoading: storeLoading,
    error: storeError,
    sendMessage: storeSendMessage,
    connectWebSocket,
    disconnectWebSocket,
    loadMessages: storeLoadMessages,
    endSession: storeEndSession,
    setCurrentSession,
    clearError: storeClearError,
    startStreaming,
    pauseStreaming,
    resumeStreaming,
    cancelStreaming,
    flushMessageQueue,
  } = useChatStore()

  // Local state
  const [isTyping, setIsTyping] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)

  // Get current session
  const session = sessionId
    ? (activeSessions.get(sessionId) as ChatSession | undefined)
    : useCurrentSession() as ChatSession | null

  // Get session messages
  const messages = useSessionMessages(sessionId || currentSessionId || undefined) as ChatMessage[]

  // Get connection state from session
  const wsState = session?.wsState || 'disconnected'
  const connectionStatus = wsState as ConnectionStatus

  // Initialize session
  useEffect(() => {
    if (sessionId && sessionId !== currentSessionId) {
      setCurrentSession(sessionId)
    }
  }, [sessionId, currentSessionId, setCurrentSession])

  // WebSocket connection management
  useEffect(() => {
    if (!session || !autoConnect) return

    // Connect WebSocket through store
    connectWebSocket(session.id)

    // Handle connection state changes
    const handleStateChange = () => {
      const currentSession = activeSessions.get(session.id)
      if (currentSession) {
        if (currentSession.wsState === 'connected') {
          reconnectAttemptsRef.current = 0
          onConnect?.()
          // Flush queued messages
          flushMessageQueue(session.id)
        } else if (currentSession.wsState === 'disconnected') {
          onDisconnect?.()
          if (autoReconnect && reconnectAttemptsRef.current < maxRetries) {
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++
              connectWebSocket(session.id)
            }, reconnectInterval)
          }
        }
      }
    }

    // Monitor session state
    const interval = setInterval(handleStateChange, 500)

    return () => {
      clearInterval(interval)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (session) {
        disconnectWebSocket(session.id)
        onDisconnect?.()
      }
    }
  }, [
    session,
    autoConnect,
    autoReconnect,
    reconnectInterval,
    maxRetries,
    connectWebSocket,
    disconnectWebSocket,
    flushMessageQueue,
    activeSessions,
    onConnect,
    onDisconnect,
  ])

  // Monitor typing and streaming state from session
  useEffect(() => {
    if (session?.isTyping !== undefined) {
      setIsTyping(session.isTyping)
      onTyping?.(session.isTyping)
    }

    // Check if streaming
    if (session?.streamingMessageId) {
      setIsStreaming(true)
      // Find streaming message
      const streamingMsg = messages.find(m => m.id === session.streamingMessageId)
      if (streamingMsg) {
        setStreamingContent(streamingMsg.content)
      }
    } else {
      setIsStreaming(false)
      setStreamingContent('')
    }
  }, [session?.isTyping, session?.streamingMessageId, messages, onTyping])

  // Monitor new messages
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      onMessage?.(lastMessage)
    }
  }, [messages, onMessage])

  // Monitor errors
  useEffect(() => {
    if (storeError) {
      onError?.(new Error(storeError))
    }
  }, [storeError, onError])

  // Send message with fallback support
  const sendMessage = useCallback(
    async (content: string) => {
      if (!session) {
        throw new Error('No active session')
      }

      try {
        // Send through store (will use WebSocket if connected, HTTP otherwise)
        await storeSendMessage(session.id, content)
      } catch (error) {
        // If WebSocket fails, message is queued automatically
        console.error('Failed to send message:', error)
        throw error
      }
    },
    [session, storeSendMessage]
  )

  // Retry failed message
  const retryMessage = useCallback(
    async (messageId: string) => {
      const message = messages.find((m) => m.id === messageId)
      if (!message || !session) {
        throw new Error('Message or session not found')
      }

      if (message.role !== 'user') {
        throw new Error('Can only retry user messages')
      }

      try {
        await storeSendMessage(session.id, message.content)
      } catch (error) {
        throw error
      }
    },
    [messages, session, storeSendMessage]
  )

  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (!session) return

    const currentPage = Math.ceil(messages.length / 50) + 1
    await storeLoadMessages(session.id, currentPage)
  }, [session, messages.length, storeLoadMessages])

  // Clear error
  const clearError = useCallback(() => {
    storeClearError()
  }, [storeClearError])

  // End session
  const endSession = useCallback(async () => {
    if (!session) return

    await storeEndSession(session.id)
  }, [session, storeEndSession])

  // Export chat
  const exportChat = useCallback(
    async (options: ChatExportOptions): Promise<Blob> => {
      if (!messages || messages.length === 0) {
        throw new Error('No messages to export')
      }

      let content = ''

      switch (options.format) {
        case 'txt':
          content = messages
            .map((msg) => {
              let text = `${msg.role === 'user' ? 'You' : 'Assistant'}: ${msg.content}`
              if (options.includeTimestamps && msg.timestamp) {
                text = `[${new Date(msg.timestamp).toLocaleString()}] ${text}`
              }
              return text
            })
            .join('\n\n')
          break

        case 'md':
          content = `# Chat Export\n\n`
          if (options.includeMetadata && session) {
            content += `**Session ID**: ${session.id}\n`
            content += `**Book**: ${session.book_title}\n`
            if (session.character_name) {
              content += `**Character**: ${session.character_name}\n`
            }
            content += `**Date**: ${new Date(session.created_at).toLocaleDateString()}\n\n`
            content += '---\n\n'
          }
          content += messages
            .map((msg) => {
              let text = msg.role === 'user'
                ? `**You**: ${msg.content}`
                : `**Assistant**: ${msg.content}`
              if (options.includeTimestamps && msg.timestamp) {
                text = `_${new Date(msg.timestamp).toLocaleString()}_\n\n${text}`
              }
              if (options.includeReferences && msg.references?.length) {
                text += '\n\n_References:_\n'
                msg.references.forEach((ref) => {
                  text += `- ${ref.highlight}\n`
                })
              }
              return text
            })
            .join('\n\n---\n\n')
          break

        case 'json':
          const exportData = {
            session: options.includeMetadata ? session : undefined,
            messages: messages.map((msg) => ({
              ...msg,
              timestamp: options.includeTimestamps ? msg.timestamp : undefined,
              references: options.includeReferences ? msg.references : undefined,
            })),
          }
          content = JSON.stringify(exportData, null, 2)
          break

        case 'pdf':
          // PDF export would require additional libraries
          throw new Error('PDF export not yet implemented')

        default:
          throw new Error(`Unsupported format: ${options.format}`)
      }

      const mimeTypes = {
        txt: 'text/plain',
        md: 'text/markdown',
        json: 'application/json',
        pdf: 'application/pdf',
      }

      return new Blob([content], { type: mimeTypes[options.format] })
    },
    [messages, session]
  )

  // Search messages
  const searchMessages = useCallback(
    (options: ChatSearchOptions): ChatMessage[] => {
      if (!messages) return []

      return messages.filter((msg) => {
        // Filter by role
        if (options.role && options.role !== 'all' && msg.role !== options.role) {
          return false
        }

        // Filter by date range
        if (options.dateRange && msg.timestamp) {
          const msgDate = new Date(msg.timestamp)
          if (msgDate < options.dateRange.start || msgDate > options.dateRange.end) {
            return false
          }
        }

        // Filter by query
        if (options.query) {
          const query = options.query.toLowerCase()
          return msg.content.toLowerCase().includes(query)
        }

        return true
      })
    },
    [messages]
  )

  // Stream control functions
  const handlePauseStream = useCallback(() => {
    if (session?.id) {
      pauseStreaming(session.id)
    }
  }, [session?.id, pauseStreaming])

  const handleResumeStream = useCallback(() => {
    if (session?.id) {
      resumeStreaming(session.id)
    }
  }, [session?.id, resumeStreaming])

  const handleCancelStream = useCallback(() => {
    if (session?.id) {
      cancelStreaming(session.id)
    }
  }, [session?.id, cancelStreaming])

  return {
    session: session as ChatSession | null,
    messages,
    isLoading: storeLoading || (session?.isLoading ?? false),
    isTyping,
    isStreaming,
    streamingContent,
    error: storeError || (session?.error ?? null),
    connectionStatus,
    sendMessage,
    retryMessage,
    loadMoreMessages,
    clearError,
    endSession,
    exportChat,
    searchMessages,
    // Stream controls
    pauseStream: handlePauseStream,
    resumeStream: handleResumeStream,
    cancelStream: handleCancelStream,
  }
}

export default useChat