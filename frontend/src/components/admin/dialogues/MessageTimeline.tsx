import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  User, Bot, Clock, Hash, BookOpen, AlertTriangle,
  MoreVertical, Eye, EyeOff, Flag, Trash2, Copy
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Message {
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
}

interface MessageTimelineProps {
  messages: Message[];
  onDeleteMessage: (id: string) => void;
  selectedMessages: Set<string>;
  onSelectMessage: (id: string) => void;
}

export default function MessageTimeline({
  messages,
  onDeleteMessage,
  selectedMessages,
  onSelectMessage
}: MessageTimelineProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: '复制成功',
      description: '消息内容已复制到剪贴板'
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'assistant':
        return <Bot className="h-4 w-4" />;
      case 'system':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'user':
        return '用户';
      case 'assistant':
        return 'AI助手';
      case 'system':
        return '系统';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'user':
        return 'bg-blue-50 border-blue-200';
      case 'assistant':
        return 'bg-gray-50 border-gray-200';
      case 'system':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-white';
    }
  };

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-4">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`relative p-4 rounded-lg border ${getRoleColor(message.role)} ${
              message.is_hidden ? 'opacity-50' : ''
            } ${selectedMessages.has(message.id) ? 'ring-2 ring-primary' : ''}`}
          >
            {/* 选择框 */}
            <div className="absolute top-4 left-4">
              <Checkbox
                checked={selectedMessages.has(message.id)}
                onCheckedChange={() => onSelectMessage(message.id)}
              />
            </div>

            {/* 消息头部 */}
            <div className="flex items-start justify-between ml-8">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {getRoleIcon(message.role)}
                  <span className="font-medium">{getRoleLabel(message.role)}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(message.created_at), 'HH:mm:ss', { locale: zhCN })}
                </span>
                {message.is_flagged && (
                  <Badge variant="destructive" className="text-xs">
                    <Flag className="h-3 w-3 mr-1" />
                    已标记
                  </Badge>
                )}
                {message.is_hidden && (
                  <Badge variant="secondary" className="text-xs">
                    <EyeOff className="h-3 w-3 mr-1" />
                    已隐藏
                  </Badge>
                )}
              </div>

              {/* 操作菜单 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => copyToClipboard(message.content)}>
                    <Copy className="h-4 w-4 mr-2" />
                    复制内容
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Flag className="h-4 w-4 mr-2" />
                    {message.is_flagged ? '取消标记' : '标记'}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    {message.is_hidden ? (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        显示消息
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        隐藏消息
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => onDeleteMessage(message.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除消息
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 消息内容 */}
            <div className="mt-2 ml-8">
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {/* 引用内容 */}
              {message.references && message.references.length > 0 && (
                <div className="mt-3 p-3 bg-background/50 rounded-md">
                  <div className="flex items-center gap-1 mb-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">引用内容</span>
                  </div>
                  {message.references.map((ref, refIndex) => (
                    <div key={refIndex} className="text-xs text-muted-foreground mb-1">
                      <span className="font-medium">{ref.type}:</span> {ref.text}
                      {ref.location && <span className="ml-1">({ref.location})</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* 元数据 */}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                {message.tokens_used && (
                  <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {message.tokens_used} tokens
                  </span>
                )}
                {message.response_time_ms && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {message.response_time_ms}ms
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>暂无消息记录</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}