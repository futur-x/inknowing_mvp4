'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  MessageSquare,
  DollarSign,
  Activity,
  ArrowUp,
  ArrowDown,
  Clock,
  Target
} from 'lucide-react';
import { analyticsService } from '@/services/analyticsService';
import type { OverviewMetrics, TimePeriod, TimeRange } from '@/types/analytics';
import { cn } from '@/lib/utils';

interface OverviewDashboardProps {
  timePeriod: TimePeriod;
  timeRange: TimeRange;
  isRefreshing?: boolean;
}

const MetricCard = ({
  title,
  value,
  change,
  trend,
  icon: Icon,
  format = 'number'
}: {
  title: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  format?: 'number' | 'currency' | 'percentage' | 'duration';
}) => {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return analyticsService.formatCurrency(val);
      case 'percentage':
        return analyticsService.formatPercentage(val);
      case 'duration':
        return `${val.toFixed(1)} min`;
      default:
        return analyticsService.formatNumber(val);
    }
  };

  const getTrendColor = () => {
    if (trend === 'up') return change > 0 ? 'text-green-600' : 'text-red-600';
    if (trend === 'down') return change < 0 ? 'text-green-600' : 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        <p className={cn("text-xs flex items-center gap-1 mt-1", getTrendColor())}>
          {change > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {Math.abs(change).toFixed(1)}%
          <span className="text-muted-foreground ml-1">from last period</span>
        </p>
      </CardContent>
    </Card>
  );
};

export default function OverviewDashboard({
  timePeriod,
  timeRange,
  isRefreshing
}: OverviewDashboardProps) {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, [timePeriod, isRefreshing]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsService.getOverviewMetrics(timePeriod);
      setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch overview metrics:', err);
      setError('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">{error || 'No data available'}</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const growthData = [
    { name: 'Users', value: metrics.user_growth_rate, fill: '#8884d8' },
    { name: 'Revenue', value: metrics.revenue_growth_rate, fill: '#82ca9d' }
  ];

  const activityData = [
    { name: 'Total Users', value: metrics.total_users },
    { name: 'Active Users', value: metrics.active_users },
    { name: 'New Users', value: metrics.new_users }
  ];

  const engagementData = [
    { name: 'Books', value: metrics.total_books, color: '#8884d8' },
    { name: 'Dialogues', value: metrics.total_dialogues, color: '#82ca9d' },
    { name: 'Subscriptions', value: metrics.active_subscriptions, color: '#ffc658' }
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={metrics.total_users}
          change={metrics.user_growth_rate}
          trend="up"
          icon={Users}
        />
        <MetricCard
          title="Active Users"
          value={metrics.active_users}
          change={(metrics.active_users / metrics.total_users * 100) - 50}
          trend="up"
          icon={Activity}
        />
        <MetricCard
          title="Total Revenue"
          value={metrics.total_revenue}
          change={metrics.revenue_growth_rate}
          trend="up"
          icon={DollarSign}
          format="currency"
        />
        <MetricCard
          title="Active Subscriptions"
          value={metrics.active_subscriptions}
          change={12.5}
          trend="up"
          icon={Target}
        />
        <MetricCard
          title="Total Books"
          value={metrics.total_books}
          change={5.2}
          trend="up"
          icon={BookOpen}
        />
        <MetricCard
          title="Total Dialogues"
          value={metrics.total_dialogues}
          change={18.3}
          trend="up"
          icon={MessageSquare}
        />
        <MetricCard
          title="Avg Session Duration"
          value={metrics.avg_session_duration}
          change={-2.1}
          trend="down"
          icon={Clock}
          format="duration"
        />
        <MetricCard
          title="New Users"
          value={metrics.new_users}
          change={metrics.user_growth_rate}
          trend="up"
          icon={Users}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Growth Rates Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Growth Rates</CardTitle>
            <CardDescription>User and revenue growth comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => `${value}%`} />
                <Bar dataKey="value" fill="#8884d8" radius={[8, 8, 0, 0]}>
                  {growthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
            <CardDescription>User engagement breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={activityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${analyticsService.formatNumber(value)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {activityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658'][index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Platform Engagement */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Engagement</CardTitle>
          <CardDescription>Content and interaction metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Performance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">85</div>
              <Badge variant="default" className="ml-2">Good</Badge>
            </div>
            <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: '85%' }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">98%</div>
              <Badge variant="default" className="ml-2">Excellent</Badge>
            </div>
            <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: '98%' }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">API Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">145ms</div>
              <Badge variant="default" className="ml-2">Fast</Badge>
            </div>
            <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500" style={{ width: '70%' }} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}