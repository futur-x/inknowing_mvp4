'use client'

// WebSocket Demo Page - InKnowing MVP 4.0
// Business Logic Conservation: Demonstrates real-time WebSocket chat functionality

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@/hooks/use-chat'
import { ChatContainer } from '@/components/chat/chat-container'
import { StreamingMessage } from '@/components/chat/streaming-message'
import { ConnectionStatusIndicator, ConnectionMetrics } from '@/components/chat/connection-status'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  Wifi,
  WifiOff,
  Activity,
  Send,
  Pause,
  Play,
  X,
  Zap
} from 'lucide-react'

export default function ChatDemoPage() {
  const router = useRouter()
  const [sessionId] = useState('demo-session-001')
  const [messageInput, setMessageInput] = useState('')
  const [streamSpeed, setStreamSpeed] = useState(1)

  // Use enhanced chat hook with WebSocket support
  const {
    session,
    messages,
    isLoading,
    isTyping,
    isStreaming,
    streamingContent,
    error,
    connectionStatus,
    sendMessage,
    retryMessage,
    pauseStream,
    resumeStream,
    cancelStream,
    clearError,
  } = useChat({
    sessionId,
    autoConnect: true,
    autoReconnect: true,
    reconnectInterval: 3000,
    maxRetries: 5,
    onMessage: (message) => {
      console.log('New message received:', message)
    },
    onTyping: (typing) => {
      console.log('Typing status:', typing)
    },
    onConnect: () => {
      console.log('WebSocket connected!')
    },
    onDisconnect: () => {
      console.log('WebSocket disconnected')
    },
    onError: (err) => {
      console.error('WebSocket error:', err)
    },
  })

  // Mock connection status for demo
  const mockConnectionStatus = {
    state: connectionStatus as any,
    latency: connectionStatus === 'connected' ? 35 : 0,
    lastPing: connectionStatus === 'connected' ? new Date().toISOString() : null,
    lastPong: connectionStatus === 'connected' ? new Date().toISOString() : null,
    reconnectAttempt: connectionStatus === 'reconnecting' ? 1 : 0,
    messagesSent: messages.filter(m => m.role === 'user').length,
    messagesReceived: messages.filter(m => m.role === 'assistant').length,
    bytesReceived: 1024 * messages.length,
    bytesSent: 512 * messages.filter(m => m.role === 'user').length,
    errors: error ? [{
      code: 'TEST_ERROR',
      message: error,
      timestamp: new Date().toISOString(),
      recoverable: true
    }] : []
  }

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageInput.trim()) return

    const content = messageInput
    setMessageInput('')

    try {
      await sendMessage(content)
    } catch (err) {
      console.error('Failed to send message:', err)
      setMessageInput(content) // Restore input on error
    }
  }

  // Demo streaming message content
  const demoStreamingContent = `这是一个演示流式响应的示例消息。

WebSocket 允许我们实时接收 AI 的响应，逐字符显示，提供更好的用户体验。

## 主要特性

1. **实时通信** - 使用 WebSocket 进行双向通信
2. **流式响应** - 逐字符显示 AI 回复
3. **自动重连** - 断线后自动尝试重新连接
4. **消息队列** - 离线时缓存消息，连接后自动发送
5. **错误处理** - 优雅处理各种连接和消息错误

## 代码示例

\`\`\`typescript
// 创建 WebSocket 连接
const ws = createWebSocketManager({
  url: 'ws://localhost:8888/ws',
  dialogueId: sessionId,
  token: authToken,
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  heartbeatInterval: 30000
})

// 监听消息
ws.on('message', (message) => {
  console.log('Received:', message)
})

// 发送消息
ws.sendMessage('Hello, AI!')
\`\`\`

## 性能优势

- 低延迟：WebSocket 保持长连接，减少握手开销
- 实时性：消息立即推送，无需轮询
- 节省带宽：相比 HTTP 轮询，大幅减少网络流量
- 更好的用户体验：流式显示让等待不再枯燥

继续探索更多功能...`

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">WebSocket Chat Demo</h1>
          <p className="text-muted-foreground">
            Real-time communication with streaming AI responses
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/discovery')}>
          Back to Discovery
        </Button>
      </div>

      {/* Connection Status */}
      <ConnectionStatusIndicator
        state={connectionStatus as any}
        status={mockConnectionStatus}
        onReconnect={() => console.log('Manual reconnect')}
        showDetails
        compact={false}
      />

      <Tabs defaultValue="chat" className="mt-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat">Chat Interface</TabsTrigger>
          <TabsTrigger value="streaming">Streaming Demo</TabsTrigger>
          <TabsTrigger value="metrics">Connection Metrics</TabsTrigger>
        </TabsList>

        {/* Chat Interface Tab */}
        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Live Chat Session</CardTitle>
                <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
                  {connectionStatus === 'connected' ? (
                    <>
                      <Wifi className="h-3 w-3 mr-1" />
                      Connected
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 mr-1" />
                      {connectionStatus}
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-96 overflow-y-auto mb-4 p-4 bg-muted/50 rounded-lg">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground ml-12'
                            : 'bg-secondary mr-12'
                        }`}
                      >
                        <p className="text-sm font-medium mb-1">
                          {msg.role === 'user' ? 'You' : 'AI Assistant'}
                        </p>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="bg-secondary p-3 rounded-lg mr-12">
                        <p className="text-sm font-medium mb-1">AI Assistant</p>
                        <div className="flex gap-1">
                          <span className="animate-bounce">•</span>
                          <span className="animate-bounce delay-100">•</span>
                          <span className="animate-bounce delay-200">•</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 border rounded-lg"
                  disabled={isLoading || connectionStatus !== 'connected'}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !messageInput.trim() || connectionStatus !== 'connected'}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Streaming Demo Tab */}
        <TabsContent value="streaming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Streaming Message Demo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    Reset Demo
                  </Button>

                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Speed:</span>
                    <select
                      value={streamSpeed}
                      onChange={(e) => setStreamSpeed(Number(e.target.value))}
                      className="text-sm bg-background border rounded px-2 py-1"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={1}>1x</option>
                      <option value={2}>2x</option>
                      <option value={5}>5x</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <StreamingMessage
                    content={demoStreamingContent}
                    isStreaming={true}
                    progress={65}
                    references={[
                      {
                        type: 'paragraph',
                        text: 'WebSocket protocol documentation',
                        highlight: 'Real-time bidirectional communication',
                        chapter: null,
                        page: null
                      }
                    ]}
                    onPause={() => console.log('Pause streaming')}
                    onResume={() => console.log('Resume streaming')}
                    onCancel={() => console.log('Cancel streaming')}
                    onSpeedChange={(speed) => setStreamSpeed(speed)}
                    speed={streamSpeed}
                    showControls
                    autoScroll
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                <CardTitle>Connection Metrics</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ConnectionMetrics status={mockConnectionStatus} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>WebSocket Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Implemented</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>✅ Auto-reconnect with exponential backoff</li>
                    <li>✅ Message streaming support</li>
                    <li>✅ Connection state management</li>
                    <li>✅ Message queue for offline support</li>
                    <li>✅ Heartbeat/keep-alive</li>
                    <li>✅ Error handling and recovery</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium">Performance</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>📊 Low latency (~35ms)</li>
                    <li>📊 Reduced bandwidth usage</li>
                    <li>📊 Real-time message delivery</li>
                    <li>📊 Efficient binary support</li>
                    <li>📊 Compression support</li>
                    <li>📊 Connection pooling</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}