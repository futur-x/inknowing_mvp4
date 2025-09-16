// WebSocket Types - InKnowing MVP 4.0
// Business Logic Conservation: Real-time communication protocol types

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'

export type MessageType =
  | 'user_message'
  | 'ai_response'
  | 'ai_streaming'
  | 'typing'
  | 'error'
  | 'system'
  | 'heartbeat'
  | 'ack'
  | 'stream_start'
  | 'stream_chunk'
  | 'stream_end'

export interface WebSocketConfig {
  url: string
  dialogueId: string
  token?: string
  reconnectAttempts?: number
  reconnectDelay?: number
  reconnectBackoff?: number
  heartbeatInterval?: number
  messageTimeout?: number
  debug?: boolean
}

export interface WebSocketEvent {
  type: MessageType
  dialogueId: string
  messageId?: string
  content?: string
  metadata?: WebSocketMetadata
  timestamp: string
  sequence?: number
}

export interface WebSocketMetadata {
  userId?: string
  sessionId?: string
  isStreaming?: boolean
  streamId?: string
  chunkIndex?: number
  totalChunks?: number
  references?: Reference[]
  tokensUsed?: number
  modelUsed?: string
  error?: string
  retryCount?: number
}

export interface StreamControl {
  pause: () => void
  resume: () => void
  cancel: () => void
  speed: number
  setSpeed: (speed: number) => void
}

export interface ConnectionStatus {
  state: ConnectionState
  latency: number
  lastPing: string | null
  lastPong: string | null
  reconnectAttempt: number
  messagesSent: number
  messagesReceived: number
  bytesReceived: number
  bytesSent: number
  errors: ConnectionError[]
}

export interface ConnectionError {
  code: string
  message: string
  timestamp: string
  recoverable: boolean
}

export interface MessageQueue {
  pending: QueuedMessage[]
  failed: QueuedMessage[]
  add: (message: QueuedMessage) => void
  retry: (messageId: string) => void
  clear: () => void
  flush: () => Promise<void>
}

export interface QueuedMessage {
  id: string
  type: MessageType
  content: string
  timestamp: string
  retries: number
  maxRetries: number
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export interface WebSocketManager {
  // Connection management
  connect: () => Promise<void>
  disconnect: () => void
  reconnect: () => Promise<void>

  // Message handling
  send: (message: Partial<WebSocketEvent>) => void
  sendMessage: (content: string) => void

  // Stream control
  startStream: (messageId: string) => StreamControl
  pauseStream: (streamId: string) => void
  resumeStream: (streamId: string) => void
  cancelStream: (streamId: string) => void

  // State access
  getStatus: () => ConnectionStatus
  getConnectionState: () => ConnectionState
  isConnected: () => boolean

  // Event listeners
  on: (event: WebSocketEventType, handler: WebSocketEventHandler) => void
  off: (event: WebSocketEventType, handler: WebSocketEventHandler) => void
  once: (event: WebSocketEventType, handler: WebSocketEventHandler) => void

  // Queue management
  getQueue: () => MessageQueue
  flushQueue: () => Promise<void>

  // Cleanup
  destroy: () => void
}

export type WebSocketEventType =
  | 'open'
  | 'close'
  | 'error'
  | 'message'
  | 'reconnecting'
  | 'stream_start'
  | 'stream_chunk'
  | 'stream_end'
  | 'typing'
  | 'status_change'

export type WebSocketEventHandler = (data?: any) => void

// Reference type from API types
export interface Reference {
  type: 'chapter' | 'page' | 'paragraph' | 'character_memory'
  chapter?: number | null
  page?: number | null
  text: string
  highlight: string
}

// Performance metrics
export interface PerformanceMetrics {
  connectionTime: number
  averageLatency: number
  messageRate: number
  errorRate: number
  reconnectCount: number
  uptime: number
  messagesProcessed: number
  bytesTransferred: number
}

// Debug event for development
export interface DebugEvent {
  type: 'send' | 'receive' | 'connect' | 'disconnect' | 'error' | 'reconnect'
  data: any
  timestamp: string
  metadata?: Record<string, any>
}