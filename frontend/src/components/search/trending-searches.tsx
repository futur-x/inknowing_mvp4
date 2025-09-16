/**
 * Trending Searches Component
 * Displays popular and trending search queries
 * Business Logic: Shows what other users are searching for
 */

'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Flame, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface TrendingSearchesProps {
  onSearchClick?: (query: string) => void;
  className?: string;
}

/**
 * Trending search item interface
 */
interface TrendingItem {
  query: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  changePercent?: number;
  category?: string;
  isNew?: boolean;
}

/**
 * Mock trending data - should be fetched from API
 */
const MOCK_TRENDING_DATA: {
  hourly: TrendingItem[];
  daily: TrendingItem[];
  weekly: TrendingItem[];
} = {
  hourly: [
    { query: '如何学习编程？', count: 234, trend: 'up', changePercent: 45, isNew: true },
    { query: '人工智能基础', count: 189, trend: 'up', changePercent: 23 },
    { query: '时间管理技巧', count: 156, trend: 'stable' },
    { query: '量子计算原理', count: 134, trend: 'down', changePercent: -12 },
    { query: '创业指南', count: 98, trend: 'up', changePercent: 67, isNew: true },
  ],
  daily: [
    { query: '三体', count: 1234, trend: 'up', changePercent: 12, category: '科幻' },
    { query: '如何提高效率？', count: 987, trend: 'up', changePercent: 34 },
    { query: '投资理财入门', count: 876, trend: 'stable' },
    { query: '心理学基础', count: 765, trend: 'up', changePercent: 23 },
    { query: '历史的教训', count: 654, trend: 'down', changePercent: -8 },
    { query: '区块链技术', count: 543, trend: 'up', changePercent: 45 },
    { query: '健康生活方式', count: 432, trend: 'stable' },
  ],
  weekly: [
    { query: '人类简史', count: 5678, trend: 'up', changePercent: 8, category: '历史' },
    { query: 'ChatGPT 应用', count: 4567, trend: 'up', changePercent: 156, isNew: true },
    { query: '原则', count: 3456, trend: 'stable', category: '商业' },
    { query: '如何学习？', count: 2345, trend: 'up', changePercent: 23 },
    { query: '金融市场分析', count: 1234, trend: 'down', changePercent: -15 },
  ],
};

/**
 * Get trend icon and color
 */
function getTrendDisplay(trend: 'up' | 'down' | 'stable', changePercent?: number) {
  if (trend === 'up') {
    return {
      icon: <ArrowUpRight className="h-3 w-3" />,
      color: 'text-green-500',
      text: changePercent ? `+${changePercent}%` : '上升',
    };
  } else if (trend === 'down') {
    return {
      icon: <ArrowDownRight className="h-3 w-3" />,
      color: 'text-red-500',
      text: changePercent ? `${changePercent}%` : '下降',
    };
  } else {
    return {
      icon: null,
      color: 'text-muted-foreground',
      text: '持平',
    };
  }
}

/**
 * Single trending item
 */
function TrendingItem({
  item,
  rank,
  onClick,
}: {
  item: TrendingItem;
  rank: number;
  onClick: () => void;
}) {
  const trendDisplay = getTrendDisplay(item.trend, item.changePercent);

  return (
    <Button
      variant="ghost"
      className="w-full justify-start text-left h-auto py-2 px-2 hover:bg-accent"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 w-full">
        {/* Rank */}
        <div className={cn(
          'flex items-center justify-center w-6 h-6 rounded text-xs font-semibold',
          rank <= 3 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
        )}>
          {rank}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm truncate">{item.query}</span>
            {item.isNew && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                新
              </Badge>
            )}
            {item.category && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                {item.category}
              </Badge>
            )}
          </div>
        </div>

        {/* Trend */}
        <div className={cn('flex items-center gap-1 text-xs', trendDisplay.color)}>
          {trendDisplay.icon}
          <span>{trendDisplay.text}</span>
        </div>
      </div>
    </Button>
  );
}

/**
 * Main Trending Searches Component
 */
export function TrendingSearches({
  onSearchClick,
  className,
}: TrendingSearchesProps) {
  const [activeTab, setActiveTab] = useState('daily');
  const [trendingData, setTrendingData] = useState(MOCK_TRENDING_DATA);

  // Handle search click
  const handleSearchClick = (query: string) => {
    if (onSearchClick) {
      onSearchClick(query);
    } else {
      // Default behavior: navigate to search page
      window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          热门搜索
        </CardTitle>
        <CardDescription>
          发现大家都在搜索什么
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="hourly">
              <Clock className="h-3 w-3 mr-1" />
              实时
            </TabsTrigger>
            <TabsTrigger value="daily">
              <Flame className="h-3 w-3 mr-1" />
              今日
            </TabsTrigger>
            <TabsTrigger value="weekly">
              <TrendingUp className="h-3 w-3 mr-1" />
              本周
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hourly" className="mt-4 space-y-1">
            {trendingData.hourly.map((item, index) => (
              <TrendingItem
                key={item.query}
                item={item}
                rank={index + 1}
                onClick={() => handleSearchClick(item.query)}
              />
            ))}
          </TabsContent>

          <TabsContent value="daily" className="mt-4 space-y-1">
            {trendingData.daily.map((item, index) => (
              <TrendingItem
                key={item.query}
                item={item}
                rank={index + 1}
                onClick={() => handleSearchClick(item.query)}
              />
            ))}
          </TabsContent>

          <TabsContent value="weekly" className="mt-4 space-y-1">
            {trendingData.weekly.map((item, index) => (
              <TrendingItem
                key={item.query}
                item={item}
                rank={index + 1}
                onClick={() => handleSearchClick(item.query)}
              />
            ))}
          </TabsContent>
        </Tabs>

        {/* View All Button */}
        <div className="mt-4 pt-4 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = '/search'}
          >
            查看更多热门搜索
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}