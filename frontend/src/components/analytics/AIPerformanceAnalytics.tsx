'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { analyticsService } from '@/services/analyticsService';
import type { AIPerformanceAnalytics as AIPerformanceAnalyticsType, TimeRange } from '@/types/analytics';

interface AIPerformanceAnalyticsProps {
  timeRange: TimeRange;
  isRefreshing?: boolean;
}

export default function AIPerformanceAnalytics({ timeRange, isRefreshing }: AIPerformanceAnalyticsProps) {
  const [data, setData] = useState<AIPerformanceAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [timeRange, isRefreshing]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await analyticsService.getAIPerformanceAnalytics(timeRange);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch AI performance:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Response Time Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.response_time_distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.accuracy_metrics.success_rate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsService.formatCurrency(data.cost_analysis.total_cost)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}