'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Brain,
  Database,
  TrendingUp,
  MessageSquare,
  Star,
  DollarSign,
  Users
} from 'lucide-react';

interface BookStatsCardsProps {
  stats: any;
}

export function BookStatsCards({ stats }: BookStatsCardsProps) {
  const cards = [
    {
      title: 'Total Books',
      value: stats?.summary?.total_books || 0,
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Published',
      value: stats?.summary?.published_books || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Under Review',
      value: stats?.summary?.review_books || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'AI Known',
      value: stats?.summary?.ai_known_books || 0,
      icon: Brain,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Vectorized',
      value: stats?.summary?.vectorized_books || 0,
      icon: Database,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      title: 'Total API Cost',
      value: `$${(stats?.costs?.total_api_cost || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}