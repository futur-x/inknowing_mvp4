'use client'

// Chat Input Component - InKnowing MVP 4.0
// Business Logic Conservation: Multi-line input with send controls and character count

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Send,
  Paperclip,
  Mic,
  Sparkles,
  ChevronDown,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatInputProps } from '@/types/chat'

export function ChatInput({
  value,
  onChange,
  onSend,
  onKeyPress,
  isDisabled = false,
  isLoading = false,
  placeholder = '输入您的消息...',
  maxLength = 2000,
  showCharCount = true,
  onFileAttach,
  allowFileAttachment = false,
  quickActions,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [rows, setRows] = useState(1)

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to get accurate scrollHeight
    textarea.style.height = 'auto'

    // Calculate new rows based on scrollHeight
    const lineHeight = 24 // Approximate line height in pixels
    const minRows = 1
    const maxRows = 6
    const newRows = Math.min(
      maxRows,
      Math.max(minRows, Math.floor(textarea.scrollHeight / lineHeight))
    )

    setRows(newRows)
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [])

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (newValue.length <= maxLength) {
      onChange(newValue)
      adjustTextareaHeight()
    }
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !isDisabled && !isLoading) {
        onSend()
      }
    }

    onKeyPress?.(e)
  }

  // Handle send button click
  const handleSend = () => {
    if (value.trim() && !isDisabled && !isLoading) {
      onSend()
    }
  }

  // Handle file attachment
  const handleFileAttach = () => {
    if (!onFileAttach) return

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,application/pdf,.txt,.doc,.docx'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        onFileAttach(file)
      }
    }
    input.click()
  }

  // Handle quick action selection
  const handleQuickAction = (prompt: string) => {
    onChange(prompt)
    textareaRef.current?.focus()
  }

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Reset height when value is cleared
  useEffect(() => {
    if (!value) {
      setRows(1)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }, [value])

  // Calculate character count
  const charCount = value.length
  const charPercentage = (charCount / maxLength) * 100

  return (
    <div className="border-t bg-background">
      <div className="container max-w-4xl mx-auto p-4">
        {/* Quick Actions */}
        {quickActions && quickActions.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action.prompt)}
                disabled={isDisabled || isLoading}
                className="shrink-0"
              >
                {action.icon}
                <span className="ml-1">{action.label}</span>
              </Button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-2 items-end">
          {/* Textarea Container */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              id="chat-message-input"
              name="message"
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              disabled={isDisabled || isLoading}
              rows={rows}
              className={cn(
                'resize-none pr-12 transition-all',
                'min-h-[48px] max-h-[144px]',
                isLoading && 'opacity-50'
              )}
              style={{ height: 'auto' }}
              autoComplete="off"
              aria-label="Message input"
            />

            {/* Character Count */}
            {showCharCount && (
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                <span
                  className={cn(
                    charPercentage > 90 && 'text-orange-500',
                    charPercentage === 100 && 'text-red-500'
                  )}
                >
                  {charCount}
                </span>
                <span className="text-muted-foreground/50">/{maxLength}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1">
            {/* File Attachment */}
            {allowFileAttachment && onFileAttach && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFileAttach}
                disabled={isDisabled || isLoading}
                className="shrink-0"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            )}

            {/* Voice Input (placeholder for future) */}
            <Button
              variant="ghost"
              size="icon"
              disabled={true}
              className="shrink-0"
              title="语音输入 (即将推出)"
            >
              <Mic className="h-4 w-4" />
            </Button>

            {/* AI Suggestions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isDisabled || isLoading}
                  className="shrink-0"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={() => handleQuickAction('请为我总结这本书的主要观点')}>
                  📚 总结主要观点
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction('这个角色的性格特点是什么？')}>
                  👤 分析角色性格
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction('书中最精彩的情节是什么？')}>
                  ✨ 精彩情节回顾
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction('这本书想传达什么深层含义？')}>
                  💭 探讨深层含义
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction('有哪些相似的书籍推荐？')}>
                  📖 相似书籍推荐
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={!value.trim() || isDisabled || isLoading}
              size="icon"
              className="shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Input Hints */}
        <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
          <div>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> 发送
            <span className="mx-2">·</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Shift + Enter</kbd> 换行
          </div>
          {isLoading && (
            <div className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              AI 正在响应...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatInput