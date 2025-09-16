'use client'

// Chat Container Component - InKnowing MVP 4.0
// Business Logic Conservation: Main chat interface orchestrating all components

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MessageList } from './message-list'
import { ChatInput } from './chat-input'
import { ChatSidebar } from './chat-sidebar'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Menu, X, AlertCircle, Loader2 } from 'lucide-react'
import { useChat } from '@/hooks/use-chat'
import { useUserStore } from '@/stores/user'
import { cn } from '@/lib/utils'
import type { ChatContainerProps, QuickAction } from '@/types/chat'

export function ChatContainer({
  sessionId,
  type,
  bookId,
  characterId,
  onSessionEnd,
}: ChatContainerProps) {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Get user quota
  const { membership } = useUserStore()

  // Use chat hook
  const {
    session,
    messages,
    isLoading,
    isTyping,
    error,
    connectionStatus,
    sendMessage,
    retryMessage,
    loadMoreMessages,
    clearError,
    endSession,
  } = useChat({
    sessionId,
    autoConnect: true,
    autoReconnect: true,
  })

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageInput.trim()) return

    const content = messageInput
    setMessageInput('')

    try {
      await sendMessage(content)
    } catch (error) {
      console.error('Failed to send message:', error)
      // Message input will be restored if needed
      setMessageInput(content)
    }
  }

  // Handle retry message
  const handleRetryMessage = async (messageId: string) => {
    try {
      await retryMessage(messageId)
    } catch (error) {
      console.error('Failed to retry message:', error)
    }
  }

  // Handle copy message
  const handleCopyMessage = (content: string) => {
    // Copy handled in MessageItem component
    console.log('Message copied')
  }

  // Handle message feedback
  const handleMessageFeedback = (messageId: string, feedback: 'like' | 'dislike') => {
    // TODO: Send feedback to backend
    console.log('Message feedback:', messageId, feedback)
  }

  // Handle end session
  const handleEndSession = async () => {
    try {
      await endSession()
      onSessionEnd?.()
      router.push('/discovery')
    } catch (error) {
      console.error('Failed to end session:', error)
    }
    setShowEndDialog(false)
  }

  // Handle new session
  const handleNewSession = () => {
    router.push(`/discovery/book/${bookId}`)
  }

  // Handle session select
  const handleSessionSelect = (selectedSessionId: string) => {
    if (type === 'book') {
      router.push(`/chat/book/${selectedSessionId}`)
    } else {
      router.push(`/chat/character/${selectedSessionId}`)
    }
  }

  // Quick actions for chat input
  const quickActions: QuickAction[] = type === 'book'
    ? [
        {
          id: 'summary',
          label: '总结',
          prompt: '请总结这本书的主要内容',
          category: 'analysis',
        },
        {
          id: 'themes',
          label: '主题',
          prompt: '这本书的核心主题是什么？',
          category: 'analysis',
        },
        {
          id: 'recommend',
          label: '推荐',
          prompt: '有哪些类似的书籍推荐？',
          category: 'question',
        },
      ]
    : [
        {
          id: 'greeting',
          label: '问候',
          prompt: '你好，很高兴认识你',
          category: 'greeting',
        },
        {
          id: 'background',
          label: '背景',
          prompt: '能介绍一下你的背景故事吗？',
          category: 'question',
        },
        {
          id: 'personality',
          label: '性格',
          prompt: '你是什么样的性格？',
          category: 'question',
        },
      ]

  // Mock book and character data (should come from props or API)
  const book = {
    id: bookId,
    title: session?.book_title || '加载中...',
    author: '作者名',
    cover: null,
  }

  const character = characterId
    ? {
        id: characterId,
        name: session?.character_name || '角色',
        description: '角色描述',
      }
    : undefined

  // Calculate quota
  const quota = membership
    ? {
        used: membership.quota_used,
        total: membership.quota_total,
        remaining: membership.quota_total - membership.quota_used,
      }
    : undefined

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Desktop */}
      {!isMobile && (
        <ChatSidebar
          session={session}
          book={book}
          character={character}
          quota={quota}
          onNewSession={handleNewSession}
          onSessionSelect={handleSessionSelect}
        />
      )}

      {/* Sidebar - Mobile */}
      {isMobile && isSidebarOpen && (
        <ChatSidebar
          session={session}
          book={book}
          character={character}
          quota={quota}
          onNewSession={handleNewSession}
          onSessionSelect={handleSessionSelect}
          onCloseSidebar={() => setIsSidebarOpen(false)}
          isMobile
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="md:hidden"
                >
                  {isSidebarOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              )}

              {/* Session Info */}
              <div>
                <h1 className="text-lg font-semibold">
                  {type === 'book' ? '书籍对话' : '角色对话'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {session?.book_title}
                  {character && ` - ${character.name}`}
                </p>
              </div>
            </div>

            {/* End Session Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEndDialog(true)}
            >
              结束对话
            </Button>
          </div>

          {/* Connection Status */}
          {connectionStatus !== 'connected' && (
            <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-950/20 border-t">
              <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                {connectionStatus === 'connecting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在连接...
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    连接已断开，使用备用通道
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={clearError}
                className="ml-4"
              >
                关闭
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Message List */}
        <MessageList
          messages={messages}
          isLoading={isLoading}
          isTyping={isTyping}
          onRetry={handleRetryMessage}
          onCopy={handleCopyMessage}
          onFeedback={handleMessageFeedback}
          onLoadMore={loadMoreMessages}
          hasMore={messages.length >= 50}
        />

        {/* Chat Input */}
        <ChatInput
          value={messageInput}
          onChange={setMessageInput}
          onSend={handleSendMessage}
          isDisabled={!session || session.status === 'ended'}
          isLoading={isLoading || isTyping}
          quickActions={quickActions}
        />
      </div>

      {/* End Session Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认结束对话？</AlertDialogTitle>
            <AlertDialogDescription>
              结束对话后，您可以在历史记录中查看本次对话内容。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndSession}>
              确认结束
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ChatContainer