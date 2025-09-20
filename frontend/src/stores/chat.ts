// Chat Store - InKnowing MVP 4.0
// Business Logic Conservation: Manages dialogue sessions and real-time messaging

import { create } from 'zustand'
import { api } from '@/lib/api'
import { createWebSocketManager } from '@/lib/websocket-manager'
import type {
  DialogueSession,
  DialogueMessage,
  WebSocketMessage,
  Reference
} from '@/types/api'
import type {
  WebSocketManager,
  ConnectionState,
  StreamControl,
  WebSocketEvent
} from '@/types/websocket'

interface ChatSession {
  session: DialogueSession
  messages: DialogueMessage[]
  isActive: boolean
  isLoading: boolean
  ws: WebSocketManager | null
  wsState: ConnectionState
  streamingMessageId: string | null
  streamControl: StreamControl | null
  error: string | null
  messageQueue: string[]
  lastActivityTime: number
}

interface ChatState {
  // State
  activeSessions: Map<string, ChatSession>
  currentSessionId: string | null
  isLoading: boolean
  error: string | null

  // Actions
  createBookDialogue: (bookId: string, initialQuestion?: string) => Promise<string>
  createCharacterDialogue: (bookId: string, characterId: string, initialMessage?: string) => Promise<string>
  sendMessage: (sessionId: string, content: string) => Promise<void>
  connectWebSocket: (sessionId: string) => void
  disconnectWebSocket: (sessionId: string) => void
  loadMessages: (sessionId: string, page?: number) => Promise<void>
  endSession: (sessionId: string) => Promise<void>
  setCurrentSession: (sessionId: string | null) => void
  clearError: () => void

  // Streaming actions
  startStreaming: (sessionId: string, messageId: string) => StreamControl | null
  pauseStreaming: (sessionId: string) => void
  resumeStreaming: (sessionId: string) => void
  cancelStreaming: (sessionId: string) => void

  // Queue management
  flushMessageQueue: (sessionId: string) => Promise<void>
  clearMessageQueue: (sessionId: string) => void

  // Internal actions
  addSession: (session: DialogueSession) => void
  updateSession: (sessionId: string, updates: Partial<ChatSession>) => void
  addMessage: (sessionId: string, message: DialogueMessage) => void
  updateStreamingMessage: (sessionId: string, content: string) => void
  removeSession: (sessionId: string) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  activeSessions: new Map(),
  currentSessionId: null,
  isLoading: false,
  error: null,

  // Create book dialogue session - Business Logic: Idle → Active Dialogue
  createBookDialogue: async (bookId: string, initialQuestion?: string) => {
    try {
      set({ isLoading: true, error: null })

      const session: DialogueSession = await api.dialogues.startBook(bookId, initialQuestion)

      // Add session to store
      get().addSession(session)
      set({ currentSessionId: session.id, isLoading: false })

      return session.id
    } catch (error) {
      const errorMessage = error instanceof Error ?
        (error.message === 'QUOTA_EXCEEDED' ? 'Quota exceeded. Please upgrade your membership to continue.' : error.message)
        : 'Failed to create dialogue'

      set({
        error: errorMessage,
        isLoading: false
      })
      throw error
    }
  },

  // Create character dialogue session - Business Logic: Character Selection → Immersive Dialogue
  createCharacterDialogue: async (bookId: string, characterId: string, initialMessage?: string) => {
    try {
      set({ isLoading: true, error: null })

      const session: DialogueSession = await api.dialogues.startCharacter(bookId, characterId, initialMessage)

      // Add session to store
      get().addSession(session)
      set({ currentSessionId: session.id, isLoading: false })

      return session.id
    } catch (error) {
      const errorMessage = error instanceof Error ?
        (error.message === 'QUOTA_EXCEEDED' ? 'Quota exceeded. Please upgrade your membership to continue.' : error.message)
        : 'Failed to create character dialogue'

      set({
        error: errorMessage,
        isLoading: false
      })
      throw error
    }
  },

  // Send message - Business Logic: User Input → AI Response
  sendMessage: async (sessionId: string, content: string) => {
    try {
      const session = get().activeSessions.get(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      // Add to message queue
      const messageQueue = [...session.messageQueue, content]
      get().updateSession(sessionId, {
        isLoading: true,
        error: null,
        messageQueue,
        lastActivityTime: Date.now()
      })

      // Create user message immediately for optimistic UI
      const userMessage: DialogueMessage = {
        id: `temp_${Date.now()}`,
        session_id: sessionId,
        role: 'user',
        content,
        references: [],
        timestamp: new Date().toISOString(),
        tokens_used: 0,
        model_used: 'user'
      }
      get().addMessage(sessionId, userMessage)

      // If WebSocket is connected, send via WebSocket
      if (session.ws && session.ws.isConnected()) {
        session.ws.sendMessage(content)
        return
      }

      // Fallback to HTTP API using api client
      const message: DialogueMessage = await api.dialogues.sendMessage(sessionId, content)
      get().addMessage(sessionId, message)
      get().updateSession(sessionId, { isLoading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ?
        (error.message === 'QUOTA_EXCEEDED' ? 'Quota exceeded. Please upgrade your membership to continue.' : error.message)
        : 'Failed to send message'

      get().updateSession(sessionId, {
        isLoading: false,
        error: errorMessage
      })
      throw error
    }
  },

  // Connect WebSocket for real-time messaging
  connectWebSocket: (sessionId: string) => {
    const session = get().activeSessions.get(sessionId)
    if (!session || session.ws) return

    try {
      const token = api.getAuthToken()
      const ws = createWebSocketManager({
        url: 'ws://localhost:8888',
        dialogueId: sessionId,
        token: token || undefined,
        reconnectAttempts: 5,
        reconnectDelay: 1000,
        reconnectBackoff: 1.5,
        heartbeatInterval: 30000,
        messageTimeout: 60000,
        debug: process.env.NODE_ENV === 'development'
      })

      // Set up event handlers
      ws.on('open', () => {
        console.log(`WebSocket connected for session ${sessionId}`)
        get().updateSession(sessionId, {
          ws,
          wsState: 'connected',
          error: null
        })

        // Flush message queue after connection
        get().flushMessageQueue(sessionId)
      })

      ws.on('status_change', ({ to }: { to: ConnectionState }) => {
        get().updateSession(sessionId, { wsState: to })
      })

      // Handle regular messages
      ws.on('message', (message: WebSocketEvent) => {
        if (message.type === 'ai_response' && message.content) {
          const aiMessage: DialogueMessage = {
            id: message.messageId || Date.now().toString(),
            session_id: sessionId,
            role: 'assistant',
            content: message.content,
            references: message.metadata?.references || [],
            timestamp: message.timestamp,
            tokens_used: message.metadata?.tokensUsed || 0,
            model_used: message.metadata?.modelUsed || 'unknown'
          }
          get().addMessage(sessionId, aiMessage)
          get().updateSession(sessionId, {
            isLoading: false,
            lastActivityTime: Date.now()
          })
        }
      })

      // Handle streaming
      ws.on('stream_start', ({ streamId, message }: any) => {
        const streamingMessage: DialogueMessage = {
          id: streamId,
          session_id: sessionId,
          role: 'assistant',
          content: '',
          references: [],
          timestamp: new Date().toISOString(),
          tokens_used: 0,
          model_used: 'streaming'
        }
        get().addMessage(sessionId, streamingMessage)
        get().updateSession(sessionId, {
          streamingMessageId: streamId,
          isLoading: true
        })
      })

      ws.on('stream_chunk', ({ streamId, chunk }: any) => {
        const currentSession = get().activeSessions.get(sessionId)
        if (currentSession?.streamingMessageId === streamId) {
          get().updateStreamingMessage(sessionId, chunk)
        }
      })

      ws.on('stream_end', ({ streamId, content, metadata }: any) => {
        get().updateSession(sessionId, {
          streamingMessageId: null,
          streamControl: null,
          isLoading: false,
          lastActivityTime: Date.now()
        })

        // Update the final message with complete content
        if (content) {
          const messages = get().activeSessions.get(sessionId)?.messages || []
          const messageIndex = messages.findIndex(m => m.id === streamId)
          if (messageIndex !== -1) {
            messages[messageIndex].content = content
            messages[messageIndex].references = metadata?.references || []
            messages[messageIndex].tokens_used = metadata?.tokensUsed || 0
            get().updateSession(sessionId, { messages: [...messages] })
          }
        }
      })

      // Handle typing indicators
      ws.on('typing', (data: any) => {
        get().updateSession(sessionId, { isLoading: data.isTyping })
      })

      // Handle errors
      ws.on('error', (error: any) => {
        console.error('WebSocket error:', error)
        get().updateSession(sessionId, {
          error: error.message || 'Connection error',
          isLoading: false
        })
      })

      ws.on('close', ({ code, reason }: any) => {
        console.log(`WebSocket disconnected for session ${sessionId}`, code, reason)
        get().updateSession(sessionId, { wsState: 'disconnected' })
      })

      // Connect the WebSocket
      ws.connect()

      get().updateSession(sessionId, { ws, wsState: 'connecting' })
    } catch (error) {
      console.error(`Failed to create WebSocket for session ${sessionId}:`, error)
      get().updateSession(sessionId, {
        error: error instanceof Error ? error.message : 'Failed to connect WebSocket'
      })
    }
  },

  // Disconnect WebSocket
  disconnectWebSocket: (sessionId: string) => {
    const session = get().activeSessions.get(sessionId)
    if (session?.ws) {
      session.ws.disconnect()
      session.ws.destroy()
      get().updateSession(sessionId, {
        ws: null,
        wsState: 'disconnected',
        streamingMessageId: null,
        streamControl: null
      })
    }
  },

  // Start streaming for a message
  startStreaming: (sessionId: string, messageId: string) => {
    const session = get().activeSessions.get(sessionId)
    if (!session?.ws) return null

    const control = session.ws.startStream(messageId)
    get().updateSession(sessionId, {
      streamingMessageId: messageId,
      streamControl: control
    })

    return control
  },

  // Pause streaming
  pauseStreaming: (sessionId: string) => {
    const session = get().activeSessions.get(sessionId)
    if (session?.streamingMessageId && session.ws) {
      session.ws.pauseStream(session.streamingMessageId)
    }
  },

  // Resume streaming
  resumeStreaming: (sessionId: string) => {
    const session = get().activeSessions.get(sessionId)
    if (session?.streamingMessageId && session.ws) {
      session.ws.resumeStream(session.streamingMessageId)
    }
  },

  // Cancel streaming
  cancelStreaming: (sessionId: string) => {
    const session = get().activeSessions.get(sessionId)
    if (session?.streamingMessageId && session.ws) {
      session.ws.cancelStream(session.streamingMessageId)
      get().updateSession(sessionId, {
        streamingMessageId: null,
        streamControl: null,
        isLoading: false
      })
    }
  },

  // Flush message queue
  flushMessageQueue: async (sessionId: string) => {
    const session = get().activeSessions.get(sessionId)
    if (!session?.ws || !session.ws.isConnected() || session.messageQueue.length === 0) {
      return
    }

    const queue = [...session.messageQueue]
    get().updateSession(sessionId, { messageQueue: [] })

    for (const message of queue) {
      session.ws.sendMessage(message)
    }
  },

  // Clear message queue
  clearMessageQueue: (sessionId: string) => {
    get().updateSession(sessionId, { messageQueue: [] })
  },

  // Load message history - Business Logic: Retrieve conversation history
  loadMessages: async (sessionId: string, page = 1) => {
    try {
      const data = await api.dialogues.getMessages(sessionId, page, 50)
      const messages: DialogueMessage[] = data.messages

      // Update session with messages
      const session = get().activeSessions.get(sessionId)
      if (session) {
        const updatedSession = {
          ...session,
          messages: page === 1 ? messages : [...messages, ...session.messages],
        }
        get().activeSessions.set(sessionId, updatedSession)
        set({ activeSessions: new Map(get().activeSessions) })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load messages'
      get().updateSession(sessionId, { error: errorMessage })
      throw error
    }
  },

  // End dialogue session - Business Logic: Active → Completed
  endSession: async (sessionId: string) => {
    try {
      // Disconnect WebSocket if active
      get().disconnectWebSocket(sessionId)

      // Update session status
      get().updateSession(sessionId, { isActive: false })

      // If this was the current session, clear it
      if (get().currentSessionId === sessionId) {
        set({ currentSessionId: null })
      }
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  },

  // Set current active session
  setCurrentSession: (sessionId: string | null) => {
    set({ currentSessionId: sessionId })
  },

  // Clear error state
  clearError: () => set({ error: null }),

  // Internal actions
  addSession: (session: DialogueSession) => {
    const chatSession: ChatSession = {
      session,
      messages: [],
      isActive: true,
      isLoading: false,
      ws: null,
      wsState: 'disconnected',
      streamingMessageId: null,
      streamControl: null,
      error: null,
      messageQueue: [],
      lastActivityTime: Date.now()
    }
    get().activeSessions.set(session.id, chatSession)
    set({ activeSessions: new Map(get().activeSessions) })

    // Auto-connect WebSocket for new session
    get().connectWebSocket(session.id)
  },

  updateSession: (sessionId: string, updates: Partial<ChatSession>) => {
    const session = get().activeSessions.get(sessionId)
    if (session) {
      const updatedSession = { ...session, ...updates }
      get().activeSessions.set(sessionId, updatedSession)
      set({ activeSessions: new Map(get().activeSessions) })
    }
  },

  addMessage: (sessionId: string, message: DialogueMessage) => {
    const session = get().activeSessions.get(sessionId)
    if (session) {
      const updatedSession = {
        ...session,
        messages: [...session.messages, message],
        lastActivityTime: Date.now()
      }
      get().activeSessions.set(sessionId, updatedSession)
      set({ activeSessions: new Map(get().activeSessions) })
    }
  },

  updateStreamingMessage: (sessionId: string, chunk: string) => {
    const session = get().activeSessions.get(sessionId)
    if (session && session.streamingMessageId) {
      const messages = [...session.messages]
      const messageIndex = messages.findIndex(m => m.id === session.streamingMessageId)

      if (messageIndex !== -1) {
        messages[messageIndex].content += chunk
        get().updateSession(sessionId, { messages })
      }
    }
  },

  removeSession: (sessionId: string) => {
    get().disconnectWebSocket(sessionId)
    get().activeSessions.delete(sessionId)
    set({ activeSessions: new Map(get().activeSessions) })

    if (get().currentSessionId === sessionId) {
      set({ currentSessionId: null })
    }
  },
}))

// Selectors for common use cases
export const useCurrentSession = () => {
  const currentSessionId = useChatStore(state => state.currentSessionId)
  const sessions = useChatStore(state => state.activeSessions)

  return currentSessionId ? sessions.get(currentSessionId) : null
}

export const useSessionMessages = (sessionId?: string) => {
  const sessions = useChatStore(state => state.activeSessions)
  const session = sessionId ? sessions.get(sessionId) : null
  return session?.messages || []
}

export const useChatLoading = () => useChatStore(state => state.isLoading)
export const useChatError = () => useChatStore(state => state.error)

// Chat session helpers
export const useActiveSessions = () => {
  const sessions = useChatStore(state => state.activeSessions)
  return Array.from(sessions.values())
}

export const useSessionCount = () => {
  const sessions = useChatStore(state => state.activeSessions)
  return sessions.size
}