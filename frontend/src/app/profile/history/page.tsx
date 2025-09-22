'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft,
  BookOpen,
  MessageSquare,
  Clock,
  Calendar,
  TrendingUp,
  Download,
  Filter
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface DialogueHistory {
  id: string
  bookId: string
  bookTitle: string
  bookCover?: string
  type: 'book' | 'character'
  characterName?: string
  lastMessage: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

interface ReadingHistory {
  bookId: string
  bookTitle: string
  bookAuthor: string
  bookCover?: string
  readingTime: number // in minutes
  lastRead: string
  progress: number // percentage
}

function HistoryPageContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('dialogues')
  const [dialogueHistory, setDialogueHistory] = useState<DialogueHistory[]>([])
  const [readingHistory, setReadingHistory] = useState<ReadingHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      // TODO: Fetch from API
      // Simulated data for now
      setDialogueHistory([
        {
          id: '1',
          bookId: '1',
          bookTitle: '三体',
          type: 'book',
          lastMessage: '关于黑暗森林理论...',
          messageCount: 15,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ])
      setReadingHistory([
        {
          bookId: '1',
          bookTitle: '三体',
          bookAuthor: '刘慈欣',
          readingTime: 120,
          lastRead: new Date().toISOString(),
          progress: 65
        }
      ])
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportHistory = () => {
    // TODO: Implement export functionality
    const data = {
      dialogues: dialogueHistory,
      reading: readingHistory,
      exportedAt: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inknowing-history-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/profile')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">历史记录</h1>
        </div>
        <Button
          variant="outline"
          onClick={exportHistory}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          导出数据
        </Button>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总对话数</p>
                <p className="text-2xl font-bold">{dialogueHistory.length}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">阅读书籍</p>
                <p className="text-2xl font-bold">{readingHistory.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总阅读时间</p>
                <p className="text-2xl font-bold">
                  {Math.round(readingHistory.reduce((acc, item) => acc + item.readingTime, 0) / 60)}h
                </p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">本月活跃</p>
                <p className="text-2xl font-bold">15天</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dialogues">对话历史</TabsTrigger>
          <TabsTrigger value="reading">阅读历史</TabsTrigger>
        </TabsList>

        {/* Dialogue History */}
        <TabsContent value="dialogues" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>最近的对话</CardTitle>
                <Button variant="ghost" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  筛选
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  加载中...
                </div>
              ) : dialogueHistory.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">暂无对话记录</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push('/books')}
                  >
                    开始探索书籍
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {dialogueHistory.map((dialogue) => (
                      <div
                        key={dialogue.id}
                        className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/chat/${dialogue.bookId}?sessionId=${dialogue.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{dialogue.bookTitle}</h4>
                              {dialogue.type === 'character' && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                  {dialogue.characterName}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {dialogue.lastMessage}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {dialogue.messageCount} 条消息
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(dialogue.updatedAt), 'MM月dd日', { locale: zhCN })}
                              </span>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            继续对话
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reading History */}
        <TabsContent value="reading" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>阅读记录</CardTitle>
                <Button variant="ghost" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  筛选
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  加载中...
                </div>
              ) : readingHistory.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">暂无阅读记录</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push('/books')}
                  >
                    发现好书
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {readingHistory.map((book) => (
                      <div
                        key={book.bookId}
                        className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/books/${book.bookId}`)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center text-white text-xs">
                            {book.bookCover || book.bookTitle.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{book.bookTitle}</h4>
                            <p className="text-sm text-muted-foreground">{book.bookAuthor}</p>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span>阅读进度</span>
                                <span className="font-medium">{book.progress}%</span>
                              </div>
                              <div className="w-full bg-secondary rounded-full h-1.5">
                                <div
                                  className="bg-primary rounded-full h-1.5 transition-all"
                                  style={{ width: `${book.progress}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {book.readingTime} 分钟
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(book.lastRead), 'MM月dd日', { locale: zhCN })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <AuthGuard redirectTo="/auth/login?redirect=/profile/history">
      <HistoryPageContent />
    </AuthGuard>
  )
}