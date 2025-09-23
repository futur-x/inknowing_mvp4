import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity, Users, MessageSquare, Clock, AlertCircle,
  Wifi, WifiOff, Eye, Ban, Send
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface RealtimeMessage {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  bookTitle: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isFlaged?: boolean;
}

interface ActiveSession {
  id: string;
  user: {
    id: string;
    nickname: string;
  };
  book: {
    title: string;
  };
  startTime: string;
  messageCount: number;
  lastActivity: string;
  status: 'active' | 'typing';
}

export default function DialogueRealtime() {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [realtimeMessages, setRealtimeMessages] = useState<RealtimeMessage[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [realtimeMessages]);

  const connectWebSocket = () => {
    try {
      // TODO: 实际WebSocket连接
      // wsRef.current = new WebSocket('ws://localhost:8000/api/v1/admin/dialogues/realtime');

      // wsRef.current.onopen = () => {
      //   setIsConnected(true);
      //   toast({ title: '已连接到实时监控' });
      // };

      // wsRef.current.onmessage = (event) => {
      //   const data = JSON.parse(event.data);
      //   handleRealtimeData(data);
      // };

      // wsRef.current.onclose = () => {
      //   setIsConnected(false);
      //   toast({ title: '实时监控连接已断开', variant: 'destructive' });
      // };

      // 模拟连接和数据
      setIsConnected(true);
      simulateRealtimeData();
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      toast({
        title: '连接失败',
        description: '无法连接到实时监控服务',
        variant: 'destructive'
      });
    }
  };

  const simulateRealtimeData = () => {
    // 模拟实时数据
    const mockSessions: ActiveSession[] = [
      {
        id: '1',
        user: { id: '1', nickname: '张三' },
        book: { title: '认知觉醒' },
        startTime: new Date(Date.now() - 600000).toISOString(),
        messageCount: 5,
        lastActivity: new Date().toISOString(),
        status: 'active'
      },
      {
        id: '2',
        user: { id: '2', nickname: '李四' },
        book: { title: '原则' },
        startTime: new Date(Date.now() - 300000).toISOString(),
        messageCount: 3,
        lastActivity: new Date().toISOString(),
        status: 'typing'
      }
    ];
    setActiveSessions(mockSessions);

    // 模拟实时消息流
    const interval = setInterval(() => {
      const randomSession = mockSessions[Math.floor(Math.random() * mockSessions.length)];
      const newMessage: RealtimeMessage = {
        id: Date.now().toString(),
        sessionId: randomSession.id,
        userId: randomSession.user.id,
        userName: randomSession.user.nickname,
        bookTitle: randomSession.book.title,
        role: Math.random() > 0.5 ? 'user' : 'assistant',
        content: Math.random() > 0.5 ? '这本书的核心思想是什么？' : '这本书主要探讨了...',
        timestamp: new Date().toISOString()
      };
      setRealtimeMessages(prev => [...prev.slice(-50), newMessage]); // 保留最近50条
    }, 5000);

    // Cleanup
    setTimeout(() => clearInterval(interval), 60000); // 1分钟后停止模拟
  };

  const handleRealtimeData = (data: any) => {
    switch (data.type) {
      case 'new_message':
        setRealtimeMessages(prev => [...prev.slice(-50), data.message]);
        break;
      case 'session_update':
        setActiveSessions(prev => {
          const index = prev.findIndex(s => s.id === data.session.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = data.session;
            return updated;
          }
          return [...prev, data.session];
        });
        break;
      case 'session_end':
        setActiveSessions(prev => prev.filter(s => s.id !== data.sessionId));
        break;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleViewSession = (sessionId: string) => {
    window.open(`/admin/dialogues/${sessionId}`, '_blank');
  };

  const handleIntervene = async (sessionId: string) => {
    try {
      // TODO: 实现介入功能
      toast({
        title: '介入成功',
        description: '您已加入对话监控'
      });
    } catch (error) {
      toast({
        title: '介入失败',
        description: '无法加入对话',
        variant: 'destructive'
      });
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      // TODO: 实现结束会话
      toast({
        title: '操作成功',
        description: '会话已结束'
      });
      setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      toast({
        title: '操作失败',
        description: '无法结束会话',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左侧 - 活跃会话列表 */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">活跃会话</CardTitle>
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  实时
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  断开
                </>
              )}
            </Badge>
          </div>
          <CardDescription>
            当前有 {activeSessions.length} 个活跃会话
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {activeSessions.map(session => (
                <div
                  key={session.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedSession === session.id ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedSession(session.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{session.user.nickname}</span>
                        {session.status === 'typing' && (
                          <Badge variant="outline" className="text-xs">
                            <Activity className="h-3 w-3 mr-1 animate-pulse" />
                            输入中
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {session.book.title}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {session.messageCount} 条消息
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(session.lastActivity), 'HH:mm:ss', { locale: zhCN })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewSession(session.id);
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      查看
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleIntervene(session.id);
                      }}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      介入
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEndSession(session.id);
                      }}
                    >
                      <Ban className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {activeSessions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>暂无活跃会话</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 右侧 - 实时消息流 */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">实时消息流</CardTitle>
          <CardDescription>
            所有对话的实时消息（最近50条）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {realtimeMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-3 p-3 rounded-lg ${
                    msg.role === 'user' ? 'bg-blue-50' : 'bg-gray-50'
                  } ${msg.isFlaged ? 'border-2 border-orange-300' : ''}`}
                >
                  <div className="flex-shrink-0">
                    {msg.role === 'user' ? (
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                        U
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-sm">
                        AI
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {msg.role === 'user' ? msg.userName : 'AI Assistant'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {msg.bookTitle}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.timestamp), 'HH:mm:ss', { locale: zhCN })}
                      </span>
                      {msg.isFlaged && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          需关注
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              {realtimeMessages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>等待实时消息...</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}