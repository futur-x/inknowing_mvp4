'use client'

// Message Item Component - InKnowing MVP 4.0
// Business Logic Conservation: Individual message display with actions

import React, { useState, useMemo } from 'react'
import { format, formatRelative } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Copy,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Check,
  AlertCircle,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MessageItemProps } from '@/types/chat'

export function MessageItem({
  message,
  isCurrentUser,
  showActions = true,
  onRetry,
  onCopy,
  onFeedback,
}: MessageItemProps) {
  const [copied, setCopied] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState<'like' | 'dislike' | null>(null)

  // Format timestamp
  const timestamp = useMemo(() => {
    if (!message.timestamp) return ''
    const date = new Date(message.timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return formatRelative(date, now, { locale: zhCN })
    }
    return format(date, 'PPp', { locale: zhCN })
  }, [message.timestamp])

  // Handle copy action
  const handleCopy = async () => {
    if (!onCopy) return

    try {
      await navigator.clipboard.writeText(message.content)
      onCopy(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Handle feedback action
  const handleFeedback = (type: 'like' | 'dislike') => {
    if (!onFeedback) return

    setFeedbackGiven(type)
    onFeedback(type)
  }

  // Markdown components for rich text rendering
  const markdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <div className="relative">
          <div className="absolute top-2 right-2 text-xs text-muted-foreground">
            {match[1]}
          </div>
          <SyntaxHighlighter
            style={tomorrow}
            language={match[1]}
            PreTag="div"
            className="!mt-0 !mb-0"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className={cn('bg-muted px-1.5 py-0.5 rounded-sm text-sm', className)} {...props}>
          {children}
        </code>
      )
    },
    p({ children }: any) {
      return <p className="mb-4 last:mb-0">{children}</p>
    },
    ul({ children }: any) {
      return <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>
    },
    ol({ children }: any) {
      return <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>
    },
    blockquote({ children }: any) {
      return (
        <blockquote className="border-l-4 border-primary/20 pl-4 italic text-muted-foreground mb-4">
          {children}
        </blockquote>
      )
    },
    a({ href, children }: any) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {children}
        </a>
      )
    },
  }

  // Render message status indicator
  const renderStatusIcon = () => {
    if (!message.status || message.status === 'sent') return null

    switch (message.status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-muted-foreground animate-pulse" />
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-destructive" />
      default:
        return null
    }
  }

  // Render references if any
  const renderReferences = () => {
    if (!message.references || message.references.length === 0) return null

    return (
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="text-xs text-muted-foreground mb-2">参考内容：</div>
        <div className="space-y-2">
          {message.references.map((ref, index) => (
            <div
              key={index}
              className="text-xs bg-muted/50 rounded-md p-2"
            >
              {ref.type === 'chapter' && ref.chapter && (
                <span className="font-medium">第 {ref.chapter} 章 - </span>
              )}
              {ref.type === 'page' && ref.page && (
                <span className="font-medium">第 {ref.page} 页 - </span>
              )}
              <span className="text-muted-foreground">{ref.highlight}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex gap-3 group',
        isCurrentUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={isCurrentUser ? undefined : '/ai-avatar.png'} />
        <AvatarFallback>
          {isCurrentUser ? 'Me' : 'AI'}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col gap-1 max-w-[70%]',
          isCurrentUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3 relative',
            isCurrentUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted',
            message.status === 'failed' && 'border-2 border-destructive'
          )}
        >
          {/* Streaming indicator */}
          {message.isStreaming && (
            <div className="absolute -bottom-2 left-4">
              <div className="flex gap-1">
                <span className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                <span className="h-2 w-2 bg-primary rounded-full animate-bounce delay-100" />
                <span className="h-2 w-2 bg-primary rounded-full animate-bounce delay-200" />
              </div>
            </div>
          )}

          {/* Message content */}
          <div className={cn(
            'prose prose-sm max-w-none',
            isCurrentUser && 'prose-invert'
          )}>
            {message.role === 'assistant' ? (
              <ReactMarkdown components={markdownComponents}>
                {message.streamedContent || message.content}
              </ReactMarkdown>
            ) : (
              <p className="whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}
          </div>

          {/* References */}
          {!isCurrentUser && renderReferences()}
        </div>

        {/* Message Footer */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {/* Timestamp */}
          <span>{timestamp}</span>

          {/* Status icon */}
          {renderStatusIcon()}

          {/* Retry for failed messages */}
          {message.status === 'failed' && onRetry && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => onRetry()}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              重试
            </Button>
          )}
        </div>

        {/* Action Buttons */}
        {showActions && !isCurrentUser && message.status === 'sent' && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Copy button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>

            {/* Feedback buttons */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 w-8 p-0',
                feedbackGiven === 'like' && 'text-green-500'
              )}
              onClick={() => handleFeedback('like')}
              disabled={feedbackGiven !== null}
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 w-8 p-0',
                feedbackGiven === 'dislike' && 'text-red-500'
              )}
              onClick={() => handleFeedback('dislike')}
              disabled={feedbackGiven !== null}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageItem