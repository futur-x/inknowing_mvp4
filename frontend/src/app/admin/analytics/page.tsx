'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminApi, type AdminAnalytics } from '@/lib/admin-api';
import { GrowthChart } from '@/components/admin/growth-chart';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  MessageSquare,
  DollarSign,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [exportFormat, setExportFormat] = useState('excel');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();

      switch (dateRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const data = await adminApi.getAnalytics({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        metrics: ['userGrowth', 'revenueGrowth', 'usagePattern', 'topBooks', 'userRetention', 'aiCosts']
      });

      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();

      if (dateRange === '30d') {
        startDate.setDate(startDate.getDate() - 30);
      } else if (dateRange === '90d') {
        startDate.setDate(startDate.getDate() - 90);
      } else if (dateRange === '1y') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else {
        startDate.setDate(startDate.getDate() - 7);
      }

      const blob = await adminApi.exportAnalytics({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        format: exportFormat as 'csv' | 'json' | 'excel'
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${dateRange}-${endDate.toISOString().split('T')[0]}.${exportFormat === 'excel' ? 'xlsx' : exportFormat}`;
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
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Calculate some key metrics
  const calculateGrowthRate = (data: Array<{ date: string; value: number }>) => {
    if (!data || data.length < 2) return 0;
    const latest = data[data.length - 1].value;
    const previous = data[data.length - 8].value; // Compare with week ago
    return previous === 0 ? 100 : ((latest - previous) / previous) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive platform metrics and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                +{analytics?.userGrowth?.[analytics.userGrowth.length - 1]?.users || 0}
              </span>
              <Badge variant="default" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                12%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">New users this period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                ¥{analytics?.revenueGrowth?.[analytics.revenueGrowth.length - 1]?.revenue.toLocaleString() || 0}
              </span>
              <Badge variant="default" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                8%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Revenue this period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {analytics?.userRetention?.[0]?.retention || 0}%
              </span>
              <Badge variant="secondary" className="gap-1">
                <ArrowDown className="h-3 w-3" />
                2%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">30-day retention rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">AI Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                ¥{analytics?.aiCosts?.reduce((sum, c) => sum + c.cost, 0).toLocaleString() || 0}
              </span>
              <Badge variant="destructive" className="gap-1">
                <ArrowUp className="h-3 w-3" />
                15%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total AI costs</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>New user registrations over time</CardDescription>
              </CardHeader>
              <CardContent>
                <GrowthChart type="users" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Retention</CardTitle>
                <CardDescription>Cohort retention analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.userRetention?.slice(0, 5).map((cohort, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{cohort.cohort}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2"
                            style={{ width: `${cohort.retention}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {cohort.retention}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly recurring revenue growth</CardDescription>
              </CardHeader>
              <CardContent>
                <GrowthChart type="revenue" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Revenue by subscription tier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { tier: 'Basic', revenue: 15000, users: 50, color: 'bg-blue-500' },
                    { tier: 'Premium', revenue: 30000, users: 100, color: 'bg-green-500' },
                    { tier: 'Super', revenue: 25000, users: 50, color: 'bg-purple-500' }
                  ].map((tier) => (
                    <div key={tier.tier} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{tier.tier}</span>
                        <span className="text-sm text-muted-foreground">
                          ¥{tier.revenue.toLocaleString()} ({tier.users} users)
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className={cn("rounded-full h-2", tier.color)}
                          style={{ width: `${(tier.revenue / 70000) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Usage Pattern</CardTitle>
                <CardDescription>Dialogue activity by hour of day</CardDescription>
              </CardHeader>
              <CardContent>
                <GrowthChart type="usage" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Usage</CardTitle>
                <CardDescription>Most used platform features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { feature: 'Book Dialogues', usage: 850, percentage: 65 },
                    { feature: 'Character Chat', usage: 450, percentage: 35 },
                    { feature: 'Book Upload', usage: 120, percentage: 9 },
                    { feature: 'Search', usage: 2300, percentage: 100 },
                    { feature: 'Profile Edit', usage: 340, percentage: 26 }
                  ].map((feature) => (
                    <div key={feature.feature} className="flex items-center justify-between">
                      <span className="text-sm">{feature.feature}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {feature.usage}
                        </span>
                        <Badge variant="outline">{feature.percentage}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Books</CardTitle>
                <CardDescription>Most popular books by dialogues</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.topBooks?.slice(0, 5).map((book, index) => (
                    <div key={book.bookId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span className="text-sm font-medium">{book.title}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {book.dialogues} dialogues
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Stats</CardTitle>
                <CardDescription>Platform content metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Books</p>
                    <p className="text-2xl font-bold">1,234</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                    <p className="text-2xl font-bold">4.2</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Characters</p>
                    <p className="text-2xl font-bold">5,678</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Categories</p>
                    <p className="text-2xl font-bold">24</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Model Costs</CardTitle>
              <CardDescription>Token usage and associated costs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Tokens</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {analytics?.aiCosts?.reduce((sum, c) => sum + c.tokens, 0).toLocaleString() || 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Avg Cost/User</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">¥12.5</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Cost Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="destructive" className="gap-1">
                        <ArrowUp className="h-3 w-3" />
                        15% increase
                      </Badge>
                    </CardContent>
                  </Card>
                </div>

                <div className="h-[300px] flex items-end gap-1">
                  {analytics?.aiCosts?.map((cost, index) => {
                    const maxCost = Math.max(...(analytics?.aiCosts?.map(c => c.cost) || [1]));
                    const height = (cost.cost / maxCost) * 100;

                    return (
                      <div
                        key={index}
                        className="flex-1 flex flex-col items-center justify-end"
                      >
                        <div
                          className="w-full bg-orange-500 hover:bg-orange-600 transition-colors rounded-t"
                          style={{ height: `${height}%` }}
                          title={`${cost.date}: ¥${cost.cost}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}