'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type PlatformStats } from '@/lib/admin-api';
import {
  Users,
  BookOpen,
  MessageSquare,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Activity,
  UserPlus,
  CreditCard,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
  stats: PlatformStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  // Safety check to prevent runtime errors
  if (!stats || !stats.users || !stats.books || !stats.dialogues || !stats.revenue) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-8 w-32 bg-gray-200 rounded" />
                <div className="h-4 w-20 bg-gray-100 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Users',
      value: stats.users.total.toLocaleString(),
      change: stats.users.growth,
      changeLabel: 'from last month',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      subMetrics: [
        { label: 'Active', value: stats.users.active.toLocaleString() },
        { label: 'New today', value: stats.users.new.toLocaleString() }
      ]
    },
    {
      title: 'Total Books',
      value: stats.books.total.toLocaleString(),
      change: stats.books.total > 0 ? ((stats.books.approved / stats.books.total) * 100).toFixed(1) : '0',
      changeLabel: 'approval rate',
      icon: BookOpen,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      subMetrics: [
        { label: 'Approved', value: stats.books.approved.toLocaleString() },
        { label: 'Pending', value: stats.books.pending.toLocaleString() }
      ]
    },
    {
      title: 'Dialogues',
      value: stats.dialogues.total.toLocaleString(),
      change: stats.dialogues.today,
      changeLabel: 'today',
      icon: MessageSquare,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      subMetrics: [
        { label: 'Active now', value: stats.dialogues.active.toLocaleString() },
        { label: 'Avg duration', value: `${Math.round(stats.dialogues.avgDuration)}m` }
      ]
    },
    {
      title: 'Monthly Revenue',
      value: `¥${stats.revenue.mrr.toLocaleString()}`,
      change: stats.revenue.conversionRate * 100,
      changeLabel: 'conversion rate',
      icon: DollarSign,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      subMetrics: [
        { label: 'Paid users', value: stats.revenue.paidUsers.toLocaleString() },
        { label: 'Total revenue', value: `¥${stats.revenue.totalRevenue.toLocaleString()}` }
      ]
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={cn('rounded-lg p-2', card.bgColor)}>
                <card.icon className={cn('h-4 w-4', card.color)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{card.value}</span>
                {typeof card.change === 'number' && (
                  <span className={cn(
                    'flex items-center gap-1 text-xs font-medium',
                    card.change > 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {card.change > 0 ? (
                      <>
                        <ArrowUp className="h-3 w-3" />
                        +{typeof card.change === 'number' && card.change % 1 !== 0
                          ? card.change.toFixed(1)
                          : card.change}
                        {card.changeLabel.includes('rate') ? '%' : ''}
                      </>
                    ) : (
                      <>
                        <ArrowDown className="h-3 w-3" />
                        {typeof card.change === 'number' && card.change % 1 !== 0
                          ? card.change.toFixed(1)
                          : card.change}
                        {card.changeLabel.includes('rate') ? '%' : ''}
                      </>
                    )}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{card.changeLabel}</p>

              {card.subMetrics && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  {card.subMetrics.map((metric) => (
                    <div key={metric.label}>
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <p className="text-sm font-medium">{metric.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>

          {/* Status indicator for system health */}
          {card.title === 'Total Users' && (
            <div className="absolute top-2 right-2">
              <div className={cn(
                'h-2 w-2 rounded-full',
                stats.system.status === 'operational' ? 'bg-green-500' :
                stats.system.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
              )} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}