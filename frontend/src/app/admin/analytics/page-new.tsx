'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Download, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

import OverviewDashboard from '@/components/analytics/OverviewDashboard';
import UserAnalytics from '@/components/analytics/UserAnalytics';
import ContentAnalytics from '@/components/analytics/ContentAnalytics';
import RevenueAnalytics from '@/components/analytics/RevenueAnalytics';
import AIPerformanceAnalytics from '@/components/analytics/AIPerformanceAnalytics';
import CustomReportBuilder from '@/components/analytics/CustomReportBuilder';

import type { TimePeriod, TimeRange } from '@/types/analytics';

export default function AnalyticsPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date()
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleExport = () => {
    console.log('Exporting data...');
  };

  const timeRange: TimeRange = {
    start_date: dateRange.from.toISOString(),
    end_date: dateRange.to.toISOString(),
    granularity: timePeriod === 'day' ? 'hour' : timePeriod === 'week' ? 'day' : timePeriod === 'month' ? 'week' : 'month'
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your platform performance and gain business insights
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Time Period Selector */}
          <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range: any) => setDateRange(range)}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Action Buttons */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>

          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="ai-performance">AI Performance</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewDashboard
            timePeriod={timePeriod}
            timeRange={timeRange}
            isRefreshing={isRefreshing}
          />
        </TabsContent>

        <TabsContent value="users">
          <UserAnalytics
            timeRange={timeRange}
            isRefreshing={isRefreshing}
          />
        </TabsContent>

        <TabsContent value="content">
          <ContentAnalytics
            timeRange={timeRange}
            isRefreshing={isRefreshing}
          />
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueAnalytics
            timeRange={timeRange}
            isRefreshing={isRefreshing}
          />
        </TabsContent>

        <TabsContent value="ai-performance">
          <AIPerformanceAnalytics
            timeRange={timeRange}
            isRefreshing={isRefreshing}
          />
        </TabsContent>

        <TabsContent value="custom">
          <CustomReportBuilder timeRange={timeRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}