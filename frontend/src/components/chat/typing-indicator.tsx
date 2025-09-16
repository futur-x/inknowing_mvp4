'use client'

// Typing Indicator Component - InKnowing MVP 4.0
// Business Logic Conservation: Visual feedback during AI response generation

import React from 'react'
import { cn } from '@/lib/utils'
import type { TypingIndicatorProps } from '@/types/chat'

export function TypingIndicator({
  characterName,
  size = 'medium',
}: TypingIndicatorProps) {
  const sizeClasses = {
    small: 'h-6',
    medium: 'h-8',
    large: 'h-10',
  }

  const dotSizeClasses = {
    small: 'h-1.5 w-1.5',
    medium: 'h-2 w-2',
    large: 'h-2.5 w-2.5',
  }

  return (
    <div className={cn('flex items-center gap-2', sizeClasses[size])}>
      <div className="bg-muted rounded-2xl px-4 py-2 flex items-center gap-2">
        {characterName && (
          <span className="text-xs text-muted-foreground mr-1">
            {characterName} 正在输入
          </span>
        )}
        <div className="flex gap-1">
          <span
            className={cn(
              'bg-muted-foreground/60 rounded-full animate-bounce',
              dotSizeClasses[size]
            )}
            style={{ animationDelay: '0ms' }}
          />
          <span
            className={cn(
              'bg-muted-foreground/60 rounded-full animate-bounce',
              dotSizeClasses[size]
            )}
            style={{ animationDelay: '150ms' }}
          />
          <span
            className={cn(
              'bg-muted-foreground/60 rounded-full animate-bounce',
              dotSizeClasses[size]
            )}
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  )
}

export default TypingIndicator