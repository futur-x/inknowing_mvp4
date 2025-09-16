// Chat Component Types - InKnowing MVP 4.0
// Business Logic Conservation: Frontend chat component types aligned with API

import type { DialogueMessage, DialogueSession, Reference } from './api'

// ==================== Chat UI Types ====================
export interface ChatUIState {
  isTyping: boolean
  isSidebarOpen: boolean
  isScrollAtBottom: boolean
  hasNewMessages: boolean
  messageInput: string
  selectedMessageId: string | null
  replyToMessageId: string | null
}

export interface ChatMessage extends DialogueMessage {
  status?: 'sending' | 'sent' | 'failed'
  isStreaming?: boolean
  streamedContent?: string
  retryCount?: number
}

export interface ChatSession extends DialogueSession {
  messages: ChatMessage[]
  unreadCount?: number
  lastReadMessageId?: string | null
  isTyping?: boolean
  connectionStatus?: 'connected' | 'connecting' | 'disconnected' | 'error'
}

// ==================== Component Props Types ====================
export interface ChatContainerProps {
  sessionId: string
  type: 'book' | 'character'
  bookId: string
  characterId?: string
  onSessionEnd?: () => void
}

export interface MessageListProps {
  messages: ChatMessage[]
  isLoading?: boolean
  isTyping?: boolean
  onRetry?: (messageId: string) => void
  onCopy?: (content: string) => void
  onFeedback?: (messageId: string, feedback: 'like' | 'dislike') => void
  onLoadMore?: () => void
  hasMore?: boolean
}

export interface MessageItemProps {
  message: ChatMessage
  isCurrentUser: boolean
  showActions?: boolean
  onRetry?: () => void
  onCopy?: () => void
  onFeedback?: (feedback: 'like' | 'dislike') => void
}

export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onKeyPress?: (e: React.KeyboardEvent) => void
  isDisabled?: boolean
  isLoading?: boolean
  placeholder?: string
  maxLength?: number
  showCharCount?: boolean
  onFileAttach?: (file: File) => void
  allowFileAttachment?: boolean
  quickActions?: QuickAction[]
}

export interface ChatSidebarProps {
  session: ChatSession | null
  book?: {
    id: string
    title: string
    author: string
    cover?: string | null
  }
  character?: {
    id: string
    name: string
    description: string
  }
  quota?: {
    used: number
    total: number
    remaining: number
  }
  recentSessions?: ChatSession[]
  onSessionSelect?: (sessionId: string) => void
  onNewSession?: () => void
  onCloseSidebar?: () => void
  isMobile?: boolean
}

export interface TypingIndicatorProps {
  characterName?: string
  size?: 'small' | 'medium' | 'large'
}

// ==================== Chat Features Types ====================
export interface QuickAction {
  id: string
  label: string
  icon?: React.ReactNode
  prompt: string
  category?: 'greeting' | 'question' | 'analysis' | 'custom'
}

export interface ChatExportOptions {
  format: 'txt' | 'md' | 'json' | 'pdf'
  includeMetadata?: boolean
  includeTimestamps?: boolean
  includeReferences?: boolean
}

export interface ChatSearchOptions {
  query: string
  role?: 'user' | 'assistant' | 'all'
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface MessageAction {
  id: string
  icon: React.ReactNode
  label: string
  handler: (message: ChatMessage) => void
  showWhen?: (message: ChatMessage) => boolean
}

// ==================== Hook Types ====================
export interface UseChatOptions {
  sessionId?: string
  autoConnect?: boolean
  autoReconnect?: boolean
  reconnectInterval?: number
  maxRetries?: number
  onMessage?: (message: ChatMessage) => void
  onTyping?: (isTyping: boolean) => void
  onError?: (error: Error) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export interface UseChatReturn {
  session: ChatSession | null
  messages: ChatMessage[]
  isLoading: boolean
  isTyping: boolean
  isStreaming: boolean
  streamingContent: string
  error: string | null
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error' | 'reconnecting'
  sendMessage: (content: string) => Promise<void>
  retryMessage: (messageId: string) => Promise<void>
  loadMoreMessages: () => Promise<void>
  clearError: () => void
  endSession: () => Promise<void>
  exportChat: (options: ChatExportOptions) => Promise<Blob>
  searchMessages: (options: ChatSearchOptions) => ChatMessage[]
  // Stream control
  pauseStream: () => void
  resumeStream: () => void
  cancelStream: () => void
}

// ==================== WebSocket Event Types ====================
export interface ChatWebSocketEvents {
  onOpen?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
  onError?: (event: Event) => void
  onMessage?: (data: any) => void
  onReconnect?: (attempt: number) => void
}

// ==================== Styling Types ====================
export interface ChatTheme {
  backgroundColor: string
  textColor: string
  userMessageBg: string
  assistantMessageBg: string
  inputBg: string
  borderColor: string
  accentColor: string
  errorColor: string
  successColor: string
}

export interface ChatLayoutConfig {
  sidebarPosition: 'left' | 'right'
  sidebarWidth: number
  messageMaxWidth: number
  inputHeight: number
  showTimestamps: boolean
  showAvatars: boolean
  compactMode: boolean
}

// ==================== Animation Types ====================
export interface MessageAnimation {
  type: 'fade' | 'slide' | 'scale' | 'none'
  duration: number
  delay?: number
  stagger?: number
}

export interface ScrollBehavior {
  smooth: boolean
  autoScroll: boolean
  scrollThreshold: number
  showNewMessageIndicator: boolean
}

// ==================== Accessibility Types ====================
export interface ChatA11y {
  enableKeyboardShortcuts: boolean
  announceNewMessages: boolean
  highContrastMode: boolean
  focusTrap: boolean
  ariaLabels: Record<string, string>
}

// ==================== Performance Types ====================
export interface ChatPerformanceConfig {
  messageBufferSize: number
  virtualScrolling: boolean
  lazyLoadImages: boolean
  debounceTypingIndicator: number
  throttleScroll: number
  maxMessagesInDOM: number
}

// ==================== Error Types ====================
export interface ChatError {
  code: 'QUOTA_EXCEEDED' | 'CONNECTION_FAILED' | 'SESSION_EXPIRED' | 'INVALID_MESSAGE' | 'SERVER_ERROR'
  message: string
  retryable: boolean
  retryAfter?: number
}

// ==================== Utility Types ====================
export type MessageRole = 'user' | 'assistant' | 'system'
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'reconnecting'
export type MessageStatus = 'sending' | 'sent' | 'failed'

export interface MessageMetadata {
  editedAt?: string
  deliveredAt?: string
  readAt?: string
  retryCount?: number
  errorMessage?: string
}