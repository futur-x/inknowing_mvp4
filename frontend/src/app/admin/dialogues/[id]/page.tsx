'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Send, AlertTriangle, Ban, Eye, EyeOff,
  Download, Flag, User, Bot, Clock, Hash, BookOpen,
  MessageSquare, AlertCircle, CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import MessageTimeline from '@/components/admin/dialogues/MessageTimeline';
import DialogueMetrics from '@/components/admin/dialogues/DialogueMetrics';
import UserInfo from '@/components/admin/dialogues/UserInfo';
import { useToast } from '@/hooks/use-toast';

interface DialogueDetail {
  id: string;
  user: {
    id: string;
    nickname: string;
    email: string;
    avatar_url?: string;
  };
  book: {
    id: string;
    title: string;
    author: string;
    cover_url?: string;
  };
  status: 'active' | 'ended' | 'expired';
  created_at: string;
  ended_at?: string;
  message_count: number;
  total_tokens: number;
  total_cost: number;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
    tokens_used?: number;
    response_time_ms?: number;
    is_flagged?: boolean;
    is_hidden?: boolean;
    references?: Array<{
      type: string;
      text: string;
      location?: string;
    }>;
  }>;
  metrics: {
    avg_response_time: number;
    user_satisfaction?: number;
    ai_confidence: number;
    sentiment_score?: number;
  };
}

export default function DialogueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const messageEndRef = useRef<HTMLDivElement>(null);

  const [dialogue, setDialogue] = useState<DialogueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [interventionMode, setInterventionMode] = useState(false);
  const [interventionMessage, setInterventionMessage] = useState('');
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDialogueDetail();
  }, [params.id]);

  const loadDialogueDetail = async () => {
    try {
      setLoading(true);
      // TODO: 调用API获取对话详情
      // const response = await fetch(`/api/v1/admin/dialogues/${params.id}`);
      // const data = await response.json();
      // setDialogue(data);

      // 模拟数据
      setDialogue({
        id: params.id as string,
        user: {
          id: '1',
          nickname: '张三',
          email: 'zhangsan@example.com',
          avatar_url: ''
        },
        book: {
          id: '1',
          title: '认知觉醒',
          author: '周岭',
          cover_url: ''
        },
        status: 'active',
        created_at: new Date().toISOString(),
        message_count: 10,
        total_tokens: 5000,
        total_cost: 0.15,
        messages: [
          {
            id: '1',
            role: 'user',
            content: '这本书主要讲的是什么？',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            tokens_used: 20
          },
          {
            id: '2',
            role: 'assistant',
            content: '《认知觉醒》是一本关于个人成长和认知升级的书籍...',
            created_at: new Date(Date.now() - 3500000).toISOString(),
            tokens_used: 150,
            response_time_ms: 1200,
            references: [
              {
                type: 'chapter',
                text: '第一章：大脑——一切问题的起源',
                location: 'P12'
              }
            ]
          }
        ],
        metrics: {
          avg_response_time: 1200,
          user_satisfaction: 4.5,
          ai_confidence: 0.92,
          sentiment_score: 0.75
        }
      });
    } catch (error) {
      console.error('Failed to load dialogue:', error);
      toast({
        title: '加载失败',
        description: '无法加载对话详情',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIntervene = async () => {
    if (!interventionMessage.trim()) return;

    try {
      // TODO: 调用介入API
      toast({
        title: '介入成功',
        description: '系统消息已发送'
      });
      setInterventionMessage('');
      setInterventionMode(false);
    } catch (error) {
      toast({
        title: '介入失败',
        description: '无法发送系统消息',
        variant: 'destructive'
      });
    }
  };

  const handleEndDialogue = async () => {
    try {
      // TODO: 调用结束对话API
      toast({
        title: '操作成功',
        description: '对话已结束'
      });
      loadDialogueDetail();
    } catch (error) {
      toast({
        title: '操作失败',
        description: '无法结束对话',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      // TODO: 调用删除消息API
      toast({
        title: '删除成功',
        description: '消息已删除'
      });
      loadDialogueDetail();
    } catch (error) {
      toast({
        title: '删除失败',
        description: '无法删除消息',
        variant: 'destructive'
      });
    }
  };

  const handleExportDialogue = async () => {
    try {
      // TODO: 调用导出API
      toast({
        title: '导出成功',
        description: '对话记录已导出'
      });
    } catch (error) {
      toast({
        title: '导出失败',
        description: '无法导出对话记录',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!dialogue) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>对话不存在或已被删除</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/admin/dialogues')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回对话列表
        </Button>
      </div>
    );
  }

  const statusColors = {
    active: 'bg-green-500',
    ended: 'bg-gray-500',
    expired: 'bg-orange-500'
  };

  const statusLabels = {
    active: '进行中',
    ended: '已结束',
    expired: '已过期'
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/dialogues')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold">对话详情</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={dialogue.status === 'active' ? 'default' : 'secondary'}>
                {statusLabels[dialogue.status]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ID: {dialogue.id}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportDialogue}>
            <Download className="h-4 w-4 mr-2" />
            导出
          </Button>
          {dialogue.status === 'active' && (
            <>
              <Button
                variant={interventionMode ? 'default' : 'outline'}
                onClick={() => setInterventionMode(!interventionMode)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                管理员介入
              </Button>
              <Button
                variant="destructive"
                onClick={handleEndDialogue}
              >
                <Ban className="h-4 w-4 mr-2" />
                结束对话
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧 - 对话信息 */}
        <div className="space-y-6">
          {/* 用户信息 */}
          <UserInfo user={dialogue.user} />

          {/* 书籍信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">书籍信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{dialogue.book.title}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                作者：{dialogue.book.author}
              </div>
            </CardContent>
          </Card>

          {/* 对话指标 */}
          <DialogueMetrics metrics={dialogue.metrics} />

          {/* 会话信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">会话信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">消息数量</span>
                <span>{dialogue.message_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token使用</span>
                <span>{dialogue.total_tokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">总成本</span>
                <span>${dialogue.total_cost.toFixed(4)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">开始时间</span>
                <span>{format(new Date(dialogue.created_at), 'HH:mm:ss', { locale: zhCN })}</span>
              </div>
              {dialogue.ended_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">结束时间</span>
                  <span>{format(new Date(dialogue.ended_at), 'HH:mm:ss', { locale: zhCN })}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧 - 消息时间线 */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>对话记录</CardTitle>
              <CardDescription>
                共 {dialogue.messages.length} 条消息
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MessageTimeline
                messages={dialogue.messages}
                onDeleteMessage={handleDeleteMessage}
                selectedMessages={selectedMessages}
                onSelectMessage={(id) => {
                  const newSelected = new Set(selectedMessages);
                  if (newSelected.has(id)) {
                    newSelected.delete(id);
                  } else {
                    newSelected.add(id);
                  }
                  setSelectedMessages(newSelected);
                }}
              />

              {/* 管理员介入输入框 */}
              {interventionMode && dialogue.status === 'active' && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">管理员介入</span>
                  </div>
                  <Textarea
                    placeholder="输入系统消息..."
                    value={interventionMessage}
                    onChange={(e) => setInterventionMessage(e.target.value)}
                    className="mb-2"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInterventionMode(false);
                        setInterventionMessage('');
                      }}
                    >
                      取消
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleIntervene}
                      disabled={!interventionMessage.trim()}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      发送
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}