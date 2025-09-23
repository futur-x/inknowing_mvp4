import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, Mail, Shield, Calendar, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface UserInfoProps {
  user: {
    id: string;
    nickname: string;
    email: string;
    avatar_url?: string;
    created_at?: string;
    total_dialogues?: number;
    subscription_level?: string;
  };
}

export default function UserInfo({ user }: UserInfoProps) {
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">用户信息</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 用户头像和基本信息 */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar_url} alt={user.nickname} />
            <AvatarFallback>{getInitials(user.nickname)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-medium">{user.nickname}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>

        {/* 用户详细信息 */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3" />
              用户ID
            </span>
            <span className="font-mono text-xs">{user.id.slice(0, 8)}...</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Mail className="h-3 w-3" />
              邮箱
            </span>
            <span className="text-xs truncate max-w-[120px]" title={user.email}>
              {user.email}
            </span>
          </div>

          {user.subscription_level && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Shield className="h-3 w-3" />
                订阅等级
              </span>
              <span>{user.subscription_level}</span>
            </div>
          )}

          {user.created_at && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                注册时间
              </span>
              <span>
                {format(new Date(user.created_at), 'yyyy-MM-dd', { locale: zhCN })}
              </span>
            </div>
          )}

          {user.total_dialogues !== undefined && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                总对话数
              </span>
              <span>{user.total_dialogues}</span>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="pt-2 space-y-2">
          <Button variant="outline" size="sm" className="w-full">
            查看用户详情
          </Button>
          <Button variant="outline" size="sm" className="w-full">
            查看历史对话
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}