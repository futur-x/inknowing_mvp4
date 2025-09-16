'use client';

import { useEffect, useState } from 'react';
import { adminApi, type AdminAnalytics } from '@/lib/admin-api';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface GrowthChartProps {
  type: 'users' | 'revenue' | 'usage';
  className?: string;
}

export function GrowthChart({ type, className }: GrowthChartProps) {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [type]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const data = await adminApi.getAnalytics({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        metrics: [type]
      });

      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("h-[300px] w-full", className)}>
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={cn("h-[300px] w-full flex items-center justify-center", className)}>
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  // Simple bar chart visualization (without external library for now)
  const getData = () => {
    switch (type) {
      case 'users':
        return analytics.userGrowth || [];
      case 'revenue':
        return analytics.revenueGrowth || [];
      case 'usage':
        return analytics.usagePattern || [];
      default:
        return [];
    }
  };

  const data = getData();
  const maxValue = Math.max(...data.map(d =>
    type === 'usage' ? d.dialogues : (type === 'users' ? d.users : d.revenue)
  ));

  return (
    <div className={cn("h-[300px] w-full", className)}>
      {type === 'usage' ? (
        // Hour-based bar chart for usage pattern
        <div className="h-full flex items-end gap-1">
          {Array.from({ length: 24 }).map((_, hour) => {
            const hourData = data.find((d: any) => d.hour === hour);
            const value = hourData?.dialogues || 0;
            const height = maxValue > 0 ? (value / maxValue) * 100 : 0;

            return (
              <div
                key={hour}
                className="flex-1 flex flex-col items-center justify-end"
              >
                <div
                  className="w-full bg-primary/80 hover:bg-primary transition-colors rounded-t"
                  style={{ height: `${height}%` }}
                  title={`${hour}:00 - ${value} dialogues`}
                />
                {hour % 3 === 0 && (
                  <span className="text-xs text-muted-foreground mt-1">
                    {hour}h
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Date-based line chart for growth (simplified)
        <div className="h-full flex flex-col">
          <div className="flex-1 flex items-end gap-1">
            {data.slice(-30).map((item: any, index) => {
              const value = type === 'users' ? item.users : item.revenue;
              const height = maxValue > 0 ? (value / maxValue) * 100 : 0;

              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center justify-end"
                >
                  <div
                    className={cn(
                      "w-full rounded-t transition-colors",
                      type === 'users' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'
                    )}
                    style={{ height: `${height}%` }}
                    title={`${item.date}: ${value.toLocaleString()}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{data[0]?.date}</span>
            <span>{data[data.length - 1]?.date}</span>
          </div>
        </div>
      )}
    </div>
  );
}