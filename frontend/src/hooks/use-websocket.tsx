// WebSocket React Hook - InKnowing MVP 4.0
// Business Logic Conservation: React integration for WebSocket functionality

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createWebSocketManager } from '@/lib/websocket-manager'
import { api } from '@/lib/api'
import type {
  WebSocketManager,
  ConnectionState,
  ConnectionStatus,
  StreamControl,
  WebSocketEvent,
  WebSocketConfig,
  MessageQueue
} from '@/types/websocket'

interface UseWebSocketOptions {
  dialogueId: string
  autoConnect?: boolean
  onMessage?: (message: WebSocketEvent) => void
  onStreamStart?: (data: { streamId: string; message: WebSocketEvent }) => void
  onStreamChunk?: (data: { streamId: string; chunk: string }) => void
  onStreamEnd?: (data: { streamId: string; content: string }) => void
  onTyping?: (data: any) => void
  onError?: (error: any) => void
  onStatusChange?: (status: { from: ConnectionState; to: ConnectionState }) => void
  debug?: boolean
}

interface UseWebSocketReturn {
  // Connection management
  connect: () => Promise<void>
  disconnect: () => void
  reconnect: () => Promise<void>

  // Message handling
  sendMessage: (content: string) => void
  sendEvent: (event: Partial<WebSocketEvent>) => void

  // Stream control
  startStream: (messageId: string) => StreamControl
  pauseStream: (streamId: string) => void
  resumeStream: (streamId: string) => void
  cancelStream: (streamId: string) => void

  // State
  connectionState: ConnectionState
  connectionStatus: ConnectionStatus
  isConnected: boolean
  isReconnecting: boolean
  messageQueue: MessageQueue

  // Metrics
  latency: number
  messageCount: { sent: number; received: number }
  errors: any[]
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    dialogueId,
    autoConnect = true,
    onMessage,
    onStreamStart,
    onStreamChunk,
    onStreamEnd,
    onTyping,
    onError,
    onStatusChange,
    debug = false
  } = options

  const managerRef = useRef<WebSocketManager | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    state: 'disconnected',
    latency: 0,
    lastPing: null,
    lastPong: null,
    reconnectAttempt: 0,
    messagesSent: 0,
    messagesReceived: 0,
    bytesReceived: 0,
    bytesSent: 0,
    errors: []
  })
  const [isConnected, setIsConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)

  // Initialize WebSocket manager
  useEffect(() => {
    if (!dialogueId) return

    const token = api.getAuthToken()
    const wsUrl = api.createWebSocketUrl(dialogueId, token || undefined)

    const config: WebSocketConfig = {
      url: wsUrl.replace(/\/dialogue\/.*/, ''), // Extract base URL
      dialogueId,
      token: token || undefined,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      reconnectBackoff: 1.5,
      heartbeatInterval: 30000,
      messageTimeout: 60000,
      debug
    }

    const manager = createWebSocketManager(config)
    managerRef.current = manager

    // Set up event listeners
    manager.on('open', () => {
      setIsConnected(true)
      setIsReconnecting(false)
      updateStatus()
    })

    manager.on('close', () => {
      setIsConnected(false)
      updateStatus()
    })

    manager.on('reconnecting', () => {
      setIsReconnecting(true)
      updateStatus()
    })

    manager.on('status_change', (data) => {
      setConnectionState(data.to)
      onStatusChange?.(data)
      updateStatus()
    })

    manager.on('message', (message) => {
      onMessage?.(message)
      updateStatus()
    })

    manager.on('stream_start', (data) => {
      onStreamStart?.(data)
    })

    manager.on('stream_chunk', (data) => {
      onStreamChunk?.(data)
    })

    manager.on('stream_end', (data) => {
      onStreamEnd?.(data)
    })

    manager.on('typing', (data) => {
      onTyping?.(data)
    })

    manager.on('error', (error) => {
      onError?.(error)
      updateStatus()
    })

    // Auto-connect if enabled
    if (autoConnect) {
      manager.connect().catch(console.error)
    }

    function updateStatus() {
      if (managerRef.current) {
        const status = managerRef.current.getStatus()
        setConnectionStatus(status)
        setConnectionState(status.state)
      }
    }

    // Initial status update
    updateStatus()

    // Cleanup on unmount
    return () => {
      manager.destroy()
      managerRef.current = null
    }
  }, [dialogueId]) // Only re-initialize if dialogueId changes

  // Connection methods
  const connect = useCallback(async () => {
    if (managerRef.current) {
      await managerRef.current.connect()
    }
  }, [])

  const disconnect = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.disconnect()
    }
  }, [])

  const reconnect = useCallback(async () => {
    if (managerRef.current) {
      await managerRef.current.reconnect()
    }
  }, [])

  // Message methods
  const sendMessage = useCallback((content: string) => {
    if (managerRef.current) {
      managerRef.current.sendMessage(content)
    }
  }, [])

  const sendEvent = useCallback((event: Partial<WebSocketEvent>) => {
    if (managerRef.current) {
      managerRef.current.send(event)
    }
  }, [])

  // Stream methods
  const startStream = useCallback((messageId: string): StreamControl => {
    if (managerRef.current) {
      return managerRef.current.startStream(messageId)
    }
    // Return dummy control if no manager
    return {
      pause: () => {},
      resume: () => {},
      cancel: () => {},
      speed: 1,
      setSpeed: () => {}
    }
  }, [])

  const pauseStream = useCallback((streamId: string) => {
    if (managerRef.current) {
      managerRef.current.pauseStream(streamId)
    }
  }, [])

  const resumeStream = useCallback((streamId: string) => {
    if (managerRef.current) {
      managerRef.current.resumeStream(streamId)
    }
  }, [])

  const cancelStream = useCallback((streamId: string) => {
    if (managerRef.current) {
      managerRef.current.cancelStream(streamId)
    }
  }, [])

  // Get message queue
  const messageQueue = useMemo(() => {
    if (managerRef.current) {
      return managerRef.current.getQueue()
    }
    return {
      pending: [],
      failed: [],
      add: () => {},
      retry: () => {},
      clear: () => {},
      flush: async () => {}
    }
  }, [connectionStatus]) // Update when connection status changes

  return {
    // Connection management
    connect,
    disconnect,
    reconnect,

    // Message handling
    sendMessage,
    sendEvent,

    // Stream control
    startStream,
    pauseStream,
    resumeStream,
    cancelStream,

    // State
    connectionState,
    connectionStatus,
    isConnected,
    isReconnecting,
    messageQueue,

    // Metrics
    latency: connectionStatus.latency,
    messageCount: {
      sent: connectionStatus.messagesSent,
      received: connectionStatus.messagesReceived
    },
    errors: connectionStatus.errors
  }
}

// Context provider for sharing WebSocket across components
import { createContext, useContext, ReactNode } from 'react'

interface WebSocketContextValue extends UseWebSocketReturn {
  dialogueId: string
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

export function WebSocketProvider({
  children,
  dialogueId,
  ...options
}: {
  children: ReactNode
  dialogueId: string
} & Omit<UseWebSocketOptions, 'dialogueId'>) {
  const websocket = useWebSocket({ dialogueId, ...options })

  return (
    <WebSocketContext.Provider value={{ ...websocket, dialogueId }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider')
  }
  return context
}

// Hook for managing streaming messages
export function useStreamingMessage(messageId: string) {
  const [content, setContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [progress, setProgress] = useState(0)
  const bufferRef = useRef<string[]>([])
  const controlRef = useRef<StreamControl | null>(null)

  const startStreaming = useCallback((websocket: UseWebSocketReturn) => {
    setIsStreaming(true)
    setContent('')
    bufferRef.current = []

    controlRef.current = websocket.startStream(messageId)

    // Set up stream event handlers
    const handleChunk = (data: { streamId: string; chunk: string; chunkIndex?: number; totalChunks?: number }) => {
      if (data.streamId === messageId) {
        bufferRef.current.push(data.chunk)
        setContent(bufferRef.current.join(''))

        if (data.chunkIndex && data.totalChunks) {
          setProgress((data.chunkIndex / data.totalChunks) * 100)
        }
      }
    }

    const handleEnd = (data: { streamId: string; content: string }) => {
      if (data.streamId === messageId) {
        setContent(data.content)
        setIsStreaming(false)
        setProgress(100)
      }
    }

    return { handleChunk, handleEnd }
  }, [messageId])

  const pauseStreaming = useCallback(() => {
    controlRef.current?.pause()
  }, [])

  const resumeStreaming = useCallback(() => {
    controlRef.current?.resume()
  }, [])

  const cancelStreaming = useCallback(() => {
    controlRef.current?.cancel()
    setIsStreaming(false)
  }, [])

  const setSpeed = useCallback((speed: number) => {
    controlRef.current?.setSpeed(speed)
  }, [])

  return {
    content,
    isStreaming,
    progress,
    startStreaming,
    pauseStreaming,
    resumeStreaming,
    cancelStreaming,
    setSpeed
  }
}