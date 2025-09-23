'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { adminApi, type PlatformStats } from '@/lib/admin-api';
import { StatsCards } from '@/components/admin/stats-cards';
import { GrowthChart } from '@/components/admin/growth-chart';
import { SystemHealth } from '@/components/admin/system-health';
import { RecentActivity } from '@/components/admin/recent-activity';
import { QuickActions } from '@/components/admin/quick-actions';
import {
  AlertCircle,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  RefreshCw,
  Download,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// Default stats to prevent runtime errors
const getDefaultStats = (): PlatformStats => ({
  users: {
    total: 0,
    active: 0,
    new: 0,
    growth: 0
  },
  books: {
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0
  },
  dialogues: {
    total: 0,
    active: 0,
    today: 0,
    avgDuration: 0
  },
  revenue: {
    mrr: 0,
    totalRevenue: 0,
    paidUsers: 0,
    conversionRate: 0
  },
  system: {
    status: 'operational' as const,
    apiLatency: 0,
    wsConnections: 0,
    dbStatus: 'healthy'
  }
});

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // Fetch initial stats
  useEffect(() => {
    fetchStats();

    // Set up WebSocket for real-time updates
    const ws = adminApi.connectMonitoring((data) => {
      if (data.type === 'stats_update') {
        setStats(data.stats);
        setLastUpdated(new Date());
      }
      if (data.type === 'connection_status') {
        setWsConnected(data.connected);
      }
    });

    // Auto-refresh every 30 seconds if WebSocket is not connected
    const interval = setInterval(() => {
      if (!wsConnected) {
        fetchStats();
      }
    }, 30000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, [wsConnected]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getStats();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
      setError('Failed to load dashboard statistics');
      // Set default stats to prevent runtime errors
      setStats(getDefaultStats());
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStats();
    setIsRefreshing(false);
  };

  const handleExport = async () => {
    try {
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

      const blob = await adminApi.exportAnalytics({
        startDate: lastMonth.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
        format: 'excel'
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inknowing-analytics-${today.toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export analytics:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!stats) {
    // This should not happen anymore, but as a safety check
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-muted-foreground">Initializing dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage your InKnowing platform
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className={cn(
              "h-3 w-3",
              wsConnected ? "text-green-500" : "text-yellow-500"
            )} />
            <span>
              {wsConnected ? 'Live' : 'Polling'}
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span>
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn(
              "h-4 w-4 mr-2",
              isRefreshing && "animate-spin"
            )} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {stats?.system?.status && stats.system.status !== 'operational' && (
        <Alert variant={stats.system.status === 'degraded' ? 'default' : 'destructive'}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>System Status: {stats.system.status}</AlertTitle>
          <AlertDescription>
            Some services may be experiencing issues. Check the system health panel for details.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <StatsCards stats={stats} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* User Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>
                  New user registrations over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GrowthChart type="users" />
              </CardContent>
            </Card>

            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>
                  Monthly recurring revenue growth
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GrowthChart type="revenue" />
              </CardContent>
            </Card>

            {/* Usage Pattern */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Pattern</CardTitle>
                <CardDescription>
                  Dialogue activity by hour of day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GrowthChart type="usage" />
              </CardContent>
            </Card>

            {/* Top Books */}
            <Card>
              <CardHeader>
                <CardTitle>Top Books</CardTitle>
                <CardDescription>
                  Most engaged books this week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {/* Placeholder for top books list */}
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">Book Title {i}</p>
                          <p className="text-sm text-muted-foreground">
                            Author Name
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{1000 - i * 150} dialogues</p>
                          <div className="flex items-center gap-1 text-sm">
                            <TrendingUp className="h-3 w-3 text-green-500" />
                            <span className="text-green-500">+{20 - i * 3}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <QuickActions />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <RecentActivity />
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <SystemHealth stats={stats.system} />
        </TabsContent>
      </Tabs>
    </div>
  );
}