import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, Clock, TrendingUp, Activity, Star } from 'lucide-react';

interface DialogueStatsProps {
  stats: {
    totalSessions: number;
    activeSessions: number;
    todaySessions: number;
    avgResponseTime: number;
    totalMessages: number;
    userSatisfaction: number;
  };
}

export default function DialogueStats({ stats }: DialogueStatsProps) {
  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const statCards = [
    {
      title: '总会话数',
      value: stats.totalSessions.toLocaleString(),
      icon: MessageSquare,
      change: '+12.3%',
      changeType: 'positive' as const
    },
    {
      title: '活跃会话',
      value: stats.activeSessions.toLocaleString(),
      icon: Activity,
      subtitle: '当前进行中'
    },
    {
      title: '今日会话',
      value: stats.todaySessions.toLocaleString(),
      icon: Users,
      change: '+5.2%',
      changeType: 'positive' as const
    },
    {
      title: '平均响应时间',
      value: formatResponseTime(stats.avgResponseTime),
      icon: Clock,
      change: '-15%',
      changeType: 'positive' as const
    },
    {
      title: '总消息数',
      value: stats.totalMessages.toLocaleString(),
      icon: MessageSquare,
      subtitle: '所有对话消息'
    },
    {
      title: '用户满意度',
      value: `${(stats.userSatisfaction * 100).toFixed(1)}%`,
      icon: Star,
      subtitle: '基于用户反馈'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.change && (
              <p className={`text-xs ${
                stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change} 较昨日
              </p>
            )}
            {stat.subtitle && (
              <p className="text-xs text-muted-foreground">
                {stat.subtitle}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}