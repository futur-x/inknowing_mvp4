'use client'

// Chat Sidebar Component - InKnowing MVP 4.0
// Business Logic Conservation: Session info, book/character details, quota display

import React from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Book,
  User,
  MessageSquare,
  Plus,
  X,
  Clock,
  Zap,
  ChevronRight,
  Info,
  History
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatSidebarProps } from '@/types/chat'

export function ChatSidebar({
  session,
  book,
  character,
  quota,
  recentSessions,
  onSessionSelect,
  onNewSession,
  onCloseSidebar,
  isMobile = false,
}: ChatSidebarProps) {
  // Calculate quota percentage
  const quotaPercentage = quota
    ? ((quota.total - quota.remaining) / quota.total) * 100
    : 0

  // Sidebar content
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">对话信息</h3>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCloseSidebar}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* New Session Button */}
        {onNewSession && (
          <Button
            variant="outline"
            className="w-full"
            onClick={onNewSession}
          >
            <Plus className="h-4 w-4 mr-2" />
            新建对话
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {/* Book Information */}
        {book && (
          <div className="p-4 border-b">
            <div className="flex items-start gap-3">
              <div className="shrink-0">
                {book.cover ? (
                  <div className="relative w-16 h-20 rounded-md overflow-hidden bg-muted">
                    <Image
                      src={book.cover}
                      alt={book.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-20 rounded-md bg-muted flex items-center justify-center">
                    <Book className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{book.title}</h4>
                <p className="text-sm text-muted-foreground truncate">
                  {book.author}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Character Information */}
        {character && (
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">对话角色</span>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <h4 className="font-medium mb-1">{character.name}</h4>
              <p className="text-xs text-muted-foreground line-clamp-3">
                {character.description}
              </p>
            </div>
          </div>
        )}

        {/* Session Info */}
        {session && (
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">当前会话</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">会话类型</span>
                <span>{session.type === 'book' ? '书籍对话' : '角色对话'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">消息数量</span>
                <span>{session.message_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">开始时间</span>
                <span>
                  {formatDistanceToNow(new Date(session.created_at), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                </span>
              </div>
              {session.connectionStatus && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">连接状态</span>
                  <span
                    className={cn(
                      'flex items-center gap-1',
                      session.connectionStatus === 'connected'
                        ? 'text-green-500'
                        : session.connectionStatus === 'connecting'
                        ? 'text-yellow-500'
                        : 'text-red-500'
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        session.connectionStatus === 'connected'
                          ? 'bg-green-500'
                          : session.connectionStatus === 'connecting'
                          ? 'bg-yellow-500 animate-pulse'
                          : 'bg-red-500'
                      )}
                    />
                    {session.connectionStatus === 'connected'
                      ? '已连接'
                      : session.connectionStatus === 'connecting'
                      ? '连接中'
                      : '未连接'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quota Information */}
        {quota && (
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">对话配额</span>
            </div>
            <div className="space-y-3">
              <Progress value={quotaPercentage} className="h-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  已使用 {quota.used}/{quota.total}
                </span>
                <span className={cn(
                  quota.remaining < 5 ? 'text-orange-500' : 'text-green-500'
                )}>
                  剩余 {quota.remaining}
                </span>
              </div>
              {quota.remaining < 5 && (
                <div className="bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 text-xs p-2 rounded-md">
                  配额即将用尽，升级会员获取更多对话次数
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {recentSessions && recentSessions.length > 0 && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">最近对话</span>
            </div>
            <div className="space-y-2">
              {recentSessions.map((recentSession) => (
                <button
                  key={recentSession.id}
                  onClick={() => onSessionSelect?.(recentSession.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg transition-colors',
                    'hover:bg-muted',
                    session?.id === recentSession.id && 'bg-muted'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        {recentSession.type === 'book' ? (
                          <Book className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <User className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium truncate">
                          {recentSession.book_title}
                        </span>
                      </div>
                      {recentSession.character_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          与 {recentSession.character_name} 对话
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        <span>{recentSession.message_count}</span>
                        <span>·</span>
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(
                            new Date(recentSession.last_message_at),
                            { addSuffix: false, locale: zhCN }
                          )}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground text-center">
          InKnowing AI 对话系统
        </div>
      </div>
    </div>
  )

  // Mobile: Use Sheet component
  if (isMobile) {
    return (
      <Sheet open={true} onOpenChange={(open) => !open && onCloseSidebar?.()}>
        <SheetContent side="left" className="p-0 w-80">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: Regular sidebar
  return (
    <div className="w-80 border-r bg-background h-full">
      <SidebarContent />
    </div>
  )
}

export default ChatSidebar