'use client'

// Message List Component - InKnowing MVP 4.0
// Business Logic Conservation: Scrollable message history with auto-scroll and loading states

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { MessageItem } from './message-item'
import { TypingIndicator } from './typing-indicator'
import { Button } from '@/components/ui/button'
import { ArrowDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MessageListProps } from '@/types/chat'

export function MessageList({
  messages,
  isLoading = false,
  isTyping = false,
  onRetry,
  onCopy,
  onFeedback,
  onLoadMore,
  hasMore = false,
}: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [isScrollAtBottom, setIsScrollAtBottom] = useState(true)
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false)

  // Check if scroll is at bottom
  const checkScrollPosition = useCallback(() => {
    if (!listRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = listRef.current
    const threshold = 100 // pixels from bottom
    const atBottom = scrollHeight - scrollTop - clientHeight < threshold

    setIsScrollAtBottom(atBottom)

    if (atBottom) {
      setShowNewMessageIndicator(false)
    }
  }, [])

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (!bottomRef.current) return

    bottomRef.current.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end',
    })

    setShowNewMessageIndicator(false)
  }, [])

  // Handle scroll event
  const handleScroll = useCallback(() => {
    checkScrollPosition()

    // Load more messages when scrolling to top
    if (!listRef.current || !hasMore || isLoading) return

    const { scrollTop } = listRef.current
    if (scrollTop === 0 && onLoadMore) {
      onLoadMore()
    }
  }, [checkScrollPosition, hasMore, isLoading, onLoadMore])

  // Auto-scroll on new messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]

    if (lastMessage) {
      // Auto-scroll if user sent the message or is at bottom
      if (lastMessage.role === 'user' || isScrollAtBottom) {
        scrollToBottom()
      } else {
        // Show new message indicator if not at bottom
        setShowNewMessageIndicator(true)
      }
    }
  }, [messages, isScrollAtBottom, scrollToBottom])

  // Scroll to bottom on mount
  useEffect(() => {
    scrollToBottom(false)
  }, [scrollToBottom])

  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="mb-4 text-6xl">💬</div>
          <h3 className="text-lg font-medium mb-2">开始对话</h3>
          <p className="text-muted-foreground">
            发送您的第一条消息，开始与书籍或角色的智能对话
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex-1 flex flex-col">
      {/* Messages container */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 space-y-6"
        onScroll={handleScroll}
      >
        {/* Load more indicator */}
        {hasMore && (
          <div className="flex justify-center py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoading}
              className="text-muted-foreground"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  加载中...
                </>
              ) : (
                '加载更多消息'
              )}
            </Button>
          </div>
        )}

        {/* Message items */}
        <div className="space-y-6">
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isCurrentUser={message.role === 'user'}
              onRetry={onRetry ? () => onRetry(message.id) : undefined}
              onCopy={onCopy}
              onFeedback={onFeedback ? (feedback) => onFeedback(message.id, feedback) : undefined}
            />
          ))}
        </div>

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3">
            <div className="h-8 w-8 shrink-0" /> {/* Avatar placeholder */}
            <TypingIndicator />
          </div>
        )}

        {/* Bottom anchor for auto-scroll */}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* New message indicator */}
      {showNewMessageIndicator && !isScrollAtBottom && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => scrollToBottom()}
            className="shadow-lg"
          >
            <ArrowDown className="h-4 w-4 mr-1" />
            新消息
          </Button>
        </div>
      )}
    </div>
  )
}

export default MessageList