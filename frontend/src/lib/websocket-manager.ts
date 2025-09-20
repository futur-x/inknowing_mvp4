// WebSocket Manager - InKnowing MVP 4.0
// Business Logic Conservation: Centralized WebSocket connection management

import type {
  ConnectionState,
  ConnectionStatus,
  ConnectionError,
  MessageQueue,
  QueuedMessage,
  WebSocketConfig,
  WebSocketEvent,
  WebSocketEventType,
  WebSocketEventHandler,
  WebSocketManager,
  StreamControl,
  PerformanceMetrics,
  DebugEvent,
  MessageType
} from '@/types/websocket'

export class WebSocketManagerImpl implements WebSocketManager {
  private ws: WebSocket | null = null
  private config: Required<WebSocketConfig>
  private connectionState: ConnectionState = 'disconnected'
  private reconnectAttempt = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private messageTimeoutTimers = new Map<string, NodeJS.Timeout>()

  // Event handling
  private eventHandlers = new Map<WebSocketEventType, Set<WebSocketEventHandler>>()

  // Message queue
  private messageQueue: QueuedMessage[] = []
  private failedMessages: QueuedMessage[] = []

  // Stream control
  private activeStreams = new Map<string, StreamControl>()
  private streamBuffers = new Map<string, string[]>()

  // Metrics
  private metrics: PerformanceMetrics = {
    connectionTime: 0,
    averageLatency: 0,
    messageRate: 0,
    errorRate: 0,
    reconnectCount: 0,
    uptime: 0,
    messagesProcessed: 0,
    bytesTransferred: 0
  }

  // Status tracking
  private status: ConnectionStatus = {
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
  }

  private connectionStartTime: number | null = null
  private lastActivityTime: number = Date.now()
  private messageSequence = 0

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      reconnectBackoff: 1.5,
      heartbeatInterval: 30000,
      messageTimeout: 60000,
      debug: false,
      ...config
    }

    // Auto-connect on creation
    this.connect()
  }

  // Connection management
  async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return
    }

    this.updateConnectionState('connecting')
    this.connectionStartTime = Date.now()

    try {
      const url = this.buildWebSocketUrl()
      this.ws = new WebSocket(url)

      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onerror = this.handleError.bind(this)
      this.ws.onclose = this.handleClose.bind(this)

      // Wait for connection with timeout
      await this.waitForConnection(10000)
    } catch (error) {
      this.handleConnectionError(error as Error)
      throw error
    }
  }

  disconnect(): void {
    this.clearTimers()

    if (this.ws) {
      this.ws.close(1000, 'User disconnected')
      this.ws = null
    }

    this.updateConnectionState('disconnected')
    this.emit('close', { reason: 'User disconnected' })
  }

  async reconnect(): Promise<void> {
    if (this.reconnectAttempt >= this.config.reconnectAttempts) {
      this.updateConnectionState('error')
      this.emit('error', {
        message: 'Max reconnection attempts reached',
        code: 'MAX_RECONNECT_ATTEMPTS'
      })
      return
    }

    this.reconnectAttempt++
    this.updateConnectionState('reconnecting')
    this.emit('reconnecting', { attempt: this.reconnectAttempt })

    // Calculate backoff delay
    const delay = this.config.reconnectDelay * Math.pow(
      this.config.reconnectBackoff,
      this.reconnectAttempt - 1
    )

    await new Promise(resolve => setTimeout(resolve, delay))

    try {
      await this.connect()
      this.reconnectAttempt = 0
      this.metrics.reconnectCount++

      // Flush queued messages after successful reconnection
      await this.flushQueue()
    } catch (error) {
      // Schedule next reconnection attempt
      this.scheduleReconnect()
    }
  }

  // Message handling
  send(message: Partial<WebSocketEvent>): void {
    const fullMessage: WebSocketEvent = {
      type: message.type || 'user_message',
      dialogueId: this.config.dialogueId,
      timestamp: new Date().toISOString(),
      sequence: ++this.messageSequence,
      ...message
    }

    if (this.isConnected()) {
      this.sendDirectly(fullMessage)
    } else {
      this.queueMessage(fullMessage)
    }
  }

  sendMessage(content: string): void {
    this.send({
      type: 'user_message',
      content,
      messageId: this.generateMessageId()
    })
  }

  // Stream control
  startStream(messageId: string): StreamControl {
    const control: StreamControl = {
      pause: () => this.pauseStream(messageId),
      resume: () => this.resumeStream(messageId),
      cancel: () => this.cancelStream(messageId),
      speed: 1,
      setSpeed: (speed: number) => {
        const stream = this.activeStreams.get(messageId)
        if (stream) {
          stream.speed = Math.max(0.1, Math.min(10, speed))
        }
      }
    }

    this.activeStreams.set(messageId, control)
    this.streamBuffers.set(messageId, [])

    return control
  }

  pauseStream(streamId: string): void {
    const stream = this.activeStreams.get(streamId)
    if (stream) {
      this.send({
        type: 'system',
        content: 'pause_stream',
        metadata: { streamId }
      })
    }
  }

  resumeStream(streamId: string): void {
    const stream = this.activeStreams.get(streamId)
    if (stream) {
      this.send({
        type: 'system',
        content: 'resume_stream',
        metadata: { streamId }
      })
    }
  }

  cancelStream(streamId: string): void {
    const stream = this.activeStreams.get(streamId)
    if (stream) {
      this.send({
        type: 'system',
        content: 'cancel_stream',
        metadata: { streamId }
      })

      this.activeStreams.delete(streamId)
      this.streamBuffers.delete(streamId)
      this.emit('stream_end', { streamId, cancelled: true })
    }
  }

  // State access
  getStatus(): ConnectionStatus {
    return { ...this.status }
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  isConnected(): boolean {
    return this.connectionState === 'connected' &&
           this.ws?.readyState === WebSocket.OPEN
  }

  // Event listeners
  on(event: WebSocketEventType, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  off(event: WebSocketEventType, handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  once(event: WebSocketEventType, handler: WebSocketEventHandler): void {
    const onceHandler = (data?: any) => {
      handler(data)
      this.off(event, onceHandler)
    }
    this.on(event, onceHandler)
  }

  // Queue management
  getQueue(): MessageQueue {
    return {
      pending: [...this.messageQueue],
      failed: [...this.failedMessages],
      add: (message: QueuedMessage) => {
        this.messageQueue.push(message)
      },
      retry: (messageId: string) => {
        const message = this.failedMessages.find(m => m.id === messageId)
        if (message) {
          this.failedMessages = this.failedMessages.filter(m => m.id !== messageId)
          message.retries = 0
          this.messageQueue.push(message)
          this.flushQueue()
        }
      },
      clear: () => {
        this.messageQueue = []
        this.failedMessages = []
      },
      flush: () => this.flushQueue()
    }
  }

  async flushQueue(): Promise<void> {
    if (!this.isConnected() || this.messageQueue.length === 0) {
      return
    }

    const messages = [...this.messageQueue]
    this.messageQueue = []

    for (const queued of messages) {
      try {
        await this.sendQueuedMessage(queued)
        queued.onSuccess?.()
      } catch (error) {
        queued.retries++

        if (queued.retries >= queued.maxRetries) {
          this.failedMessages.push(queued)
          queued.onError?.(error as Error)
        } else {
          this.messageQueue.push(queued)
        }
      }
    }
  }

  // Cleanup
  destroy(): void {
    this.clearTimers()
    this.disconnect()
    this.eventHandlers.clear()
    this.activeStreams.clear()
    this.streamBuffers.clear()
    this.messageQueue = []
    this.failedMessages = []
  }

  // Private methods
  private buildWebSocketUrl(): string {
    const { url, dialogueId, token } = this.config
    const baseUrl = url.replace(/^http/, 'ws')
    // Backend expects /v1/dialogues/ws/{session_id}
    const wsUrl = `${baseUrl.replace(/\/ws$/, '')}/v1/dialogues/ws/${dialogueId}`

    if (token) {
      return `${wsUrl}?token=${encodeURIComponent(token)}`
    }

    return wsUrl
  }

  private handleOpen(event: Event): void {
    if (this.connectionStartTime) {
      this.metrics.connectionTime = Date.now() - this.connectionStartTime
    }

    this.updateConnectionState('connected')
    this.reconnectAttempt = 0
    this.startHeartbeat()

    this.emit('open', event)
    this.debug('connect', { url: this.config.url })
  }

  private handleMessage(event: MessageEvent): void {
    this.lastActivityTime = Date.now()
    this.status.messagesReceived++
    this.status.bytesReceived += event.data.length
    this.metrics.messagesProcessed++

    try {
      const message: WebSocketEvent = JSON.parse(event.data)

      // Handle different message types
      switch (message.type) {
        case 'heartbeat':
          this.handleHeartbeat(message)
          break

        case 'stream_start':
          this.handleStreamStart(message)
          break

        case 'stream_chunk':
          this.handleStreamChunk(message)
          break

        case 'stream_end':
          this.handleStreamEnd(message)
          break

        case 'typing':
          this.emit('typing', message)
          break

        case 'error':
          this.handleErrorMessage(message)
          break

        case 'ack':
          this.handleAcknowledgment(message)
          break

        default:
          this.emit('message', message)
      }

      this.debug('receive', message)
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
      this.debug('error', { error, data: event.data })
    }
  }

  private handleError(event: Event): void {
    const error: ConnectionError = {
      code: 'WS_ERROR',
      message: 'WebSocket error occurred',
      timestamp: new Date().toISOString(),
      recoverable: true
    }

    this.status.errors.push(error)
    this.emit('error', error)
    this.debug('error', error)
  }

  private handleClose(event: CloseEvent): void {
    this.updateConnectionState('disconnected')
    this.clearTimers()

    const wasClean = event.wasClean
    const code = event.code

    // Determine if we should attempt reconnection
    const shouldReconnect = !wasClean &&
                           code !== 1000 && // Normal closure
                           code !== 1001 && // Going away
                           this.reconnectAttempt < this.config.reconnectAttempts

    if (shouldReconnect) {
      this.scheduleReconnect()
    }

    this.emit('close', { code, reason: event.reason, wasClean })
    this.debug('disconnect', { code, reason: event.reason })
  }

  private handleHeartbeat(message: WebSocketEvent): void {
    this.status.lastPong = new Date().toISOString()

    // Calculate latency
    if (this.status.lastPing) {
      const latency = Date.now() - new Date(this.status.lastPing).getTime()
      this.status.latency = latency

      // Update average latency
      const alpha = 0.1 // Smoothing factor
      this.metrics.averageLatency = alpha * latency +
                                    (1 - alpha) * this.metrics.averageLatency
    }
  }

  private handleStreamStart(message: WebSocketEvent): void {
    const streamId = message.metadata?.streamId || message.messageId
    if (streamId) {
      this.streamBuffers.set(streamId, [])
      this.emit('stream_start', { streamId, message })
    }
  }

  private handleStreamChunk(message: WebSocketEvent): void {
    const streamId = message.metadata?.streamId || message.messageId
    if (streamId && message.content) {
      const buffer = this.streamBuffers.get(streamId) || []
      buffer.push(message.content)
      this.streamBuffers.set(streamId, buffer)

      this.emit('stream_chunk', {
        streamId,
        chunk: message.content,
        chunkIndex: message.metadata?.chunkIndex,
        totalChunks: message.metadata?.totalChunks
      })
    }
  }

  private handleStreamEnd(message: WebSocketEvent): void {
    const streamId = message.metadata?.streamId || message.messageId
    if (streamId) {
      const buffer = this.streamBuffers.get(streamId) || []
      const fullContent = buffer.join('')

      this.emit('stream_end', {
        streamId,
        content: fullContent,
        metadata: message.metadata
      })

      // Clean up
      this.activeStreams.delete(streamId)
      this.streamBuffers.delete(streamId)
    }
  }

  private handleErrorMessage(message: WebSocketEvent): void {
    const error: ConnectionError = {
      code: 'MESSAGE_ERROR',
      message: message.metadata?.error || message.content || 'Unknown error',
      timestamp: message.timestamp,
      recoverable: false
    }

    this.status.errors.push(error)
    this.emit('error', error)
  }

  private handleAcknowledgment(message: WebSocketEvent): void {
    const messageId = message.metadata?.messageId || message.messageId
    if (messageId) {
      const timer = this.messageTimeoutTimers.get(messageId)
      if (timer) {
        clearTimeout(timer)
        this.messageTimeoutTimers.delete(messageId)
      }
    }
  }

  private sendDirectly(message: WebSocketEvent): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.queueMessage(message)
      return
    }

    const data = JSON.stringify(message)
    this.ws.send(data)

    this.status.messagesSent++
    this.status.bytesSent += data.length
    this.metrics.bytesTransferred += data.length

    // Set message timeout
    if (message.messageId && message.type !== 'heartbeat') {
      const timer = setTimeout(() => {
        this.handleMessageTimeout(message.messageId!)
      }, this.config.messageTimeout)

      this.messageTimeoutTimers.set(message.messageId, timer)
    }

    this.debug('send', message)
  }

  private queueMessage(message: WebSocketEvent | any): void {
    const queued: QueuedMessage = {
      id: message.messageId || this.generateMessageId(),
      type: message.type,
      content: JSON.stringify(message),
      timestamp: new Date().toISOString(),
      retries: 0,
      maxRetries: 3
    }

    this.messageQueue.push(queued)
  }

  private async sendQueuedMessage(queued: QueuedMessage): Promise<void> {
    const message = JSON.parse(queued.content)
    this.sendDirectly(message)
  }

  private handleMessageTimeout(messageId: string): void {
    this.messageTimeoutTimers.delete(messageId)

    const error: ConnectionError = {
      code: 'MESSAGE_TIMEOUT',
      message: `Message ${messageId} timed out`,
      timestamp: new Date().toISOString(),
      recoverable: true
    }

    this.status.errors.push(error)
    this.emit('error', error)
  }

  private startHeartbeat(): void {
    this.clearHeartbeat()

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.status.lastPing = new Date().toISOString()
        this.send({
          type: 'heartbeat',
          messageId: this.generateMessageId()
        })
      }
    }, this.config.heartbeatInterval)
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    const delay = this.config.reconnectDelay * Math.pow(
      this.config.reconnectBackoff,
      this.reconnectAttempt
    )

    this.reconnectTimer = setTimeout(() => {
      this.reconnect()
    }, delay)
  }

  private clearTimers(): void {
    this.clearHeartbeat()

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    for (const timer of this.messageTimeoutTimers.values()) {
      clearTimeout(timer)
    }
    this.messageTimeoutTimers.clear()
  }

  private updateConnectionState(state: ConnectionState): void {
    const previousState = this.connectionState
    this.connectionState = state
    this.status.state = state
    this.status.reconnectAttempt = this.reconnectAttempt

    if (previousState !== state) {
      this.emit('status_change', { from: previousState, to: state })
    }
  }

  private async waitForConnection(timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, timeout)

      const checkConnection = () => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          clearTimeout(timer)
          resolve()
        } else if (this.ws?.readyState === WebSocket.CLOSED) {
          clearTimeout(timer)
          reject(new Error('Connection closed'))
        } else {
          setTimeout(checkConnection, 100)
        }
      }

      checkConnection()
    })
  }

  private handleConnectionError(error: Error): void {
    const connectionError: ConnectionError = {
      code: 'CONNECTION_FAILED',
      message: error.message,
      timestamp: new Date().toISOString(),
      recoverable: true
    }

    this.status.errors.push(connectionError)
    this.updateConnectionState('error')
    this.emit('error', connectionError)

    // Schedule reconnection
    this.scheduleReconnect()
  }

  private emit(event: WebSocketEventType, data?: any): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in ${event} handler:`, error)
        }
      })
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private debug(type: string, data: any): void {
    if (!this.config.debug) return

    const debugEvent: DebugEvent = {
      type: type as any,
      data,
      timestamp: new Date().toISOString(),
      metadata: {
        state: this.connectionState,
        reconnectAttempt: this.reconnectAttempt,
        queueSize: this.messageQueue.length
      }
    }

    console.log('[WebSocket Debug]', debugEvent)
  }
}

// Factory function for creating WebSocket managers
export function createWebSocketManager(config: WebSocketConfig): WebSocketManager {
  return new WebSocketManagerImpl(config)
}