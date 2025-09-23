'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Funnel,
  FunnelChart,
  LabelList
} from 'recharts';
import {
  Users,
  UserPlus,
  UserCheck,
  TrendingUp,
  Activity,
  Calendar,
  Target,
  Award
} from 'lucide-react';
import { analyticsService } from '@/services/analyticsService';
import type { UserAnalytics as UserAnalyticsType, TimeRange } from '@/types/analytics';

interface UserAnalyticsProps {
  timeRange: TimeRange;
  isRefreshing?: boolean;
}

export default function UserAnalytics({ timeRange, isRefreshing }: UserAnalyticsProps) {
  const [data, setData] = useState<UserAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [timeRange, isRefreshing]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await analyticsService.getUserAnalytics(timeRange);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch user analytics:', err);
      setError('Failed to load user analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">{error || 'No data available'}</p>
        </CardContent>
      </Card>
    );
  }

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Colors for charts
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

  return (
    <div className="space-y-6">
      {/* User Growth Overview */}
      <Card>
        <CardHeader>
          <CardTitle>User Growth Trend</CardTitle>
          <CardDescription>New and active users over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={data.user_growth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="active_users"
                fill="#82ca9d"
                stroke="#82ca9d"
                fillOpacity={0.6}
                name="Active Users"
              />
              <Bar
                yAxisId="left"
                dataKey="new_users"
                fill="#8884d8"
                name="New Users"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="active_users"
                stroke="#ff7c7c"
                strokeWidth={2}
                dot={false}
                name="Trend"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Retention and Segments */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Retention Rates */}
        <Card>
          <CardHeader>
            <CardTitle>User Retention</CardTitle>
            <CardDescription>Cohort retention analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(data.retention_rates).map(([period, rate]) => (
                  <div key={period} className="text-center">
                    <div className="text-2xl font-bold">{rate.toFixed(1)}%</div>
                    <p className="text-sm text-muted-foreground capitalize">
                      {period.replace('_', ' ')} Retention
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Day 1</span>
                  <div className="flex items-center gap-2 flex-1 ml-4">
                    <Progress value={data.retention_rates.day_1} className="flex-1" />
                    <span className="text-sm font-medium w-12 text-right">
                      {data.retention_rates.day_1.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Day 7</span>
                  <div className="flex items-center gap-2 flex-1 ml-4">
                    <Progress value={data.retention_rates.day_7} className="flex-1" />
                    <span className="text-sm font-medium w-12 text-right">
                      {data.retention_rates.day_7.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Day 14</span>
                  <div className="flex items-center gap-2 flex-1 ml-4">
                    <Progress value={data.retention_rates.day_14} className="flex-1" />
                    <span className="text-sm font-medium w-12 text-right">
                      {data.retention_rates.day_14.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Day 30</span>
                  <div className="flex items-center gap-2 flex-1 ml-4">
                    <Progress value={data.retention_rates.day_30} className="flex-1" />
                    <span className="text-sm font-medium w-12 text-right">
                      {data.retention_rates.day_30.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Segments */}
        <Card>
          <CardHeader>
            <CardTitle>User Segments</CardTitle>
            <CardDescription>Users by membership type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.user_segments}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ segment, count, avg_dialogues }) =>
                    `${segment}: ${count} (${avg_dialogues.toFixed(1)} dialogues)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.user_segments.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity Distribution and User Journey */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Activity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Distribution</CardTitle>
            <CardDescription>Users grouped by activity level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.activity_distribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8">
                  {data.activity_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
                <LabelList dataKey="count" position="top" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Journey Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>User Journey Funnel</CardTitle>
            <CardDescription>Conversion through key stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.user_journey_funnel.map((stage, index) => {
                const isFirst = index === 0;
                const prevRate = isFirst ? 100 : data.user_journey_funnel[index - 1].rate;
                const dropOff = prevRate - stage.rate;

                return (
                  <div key={stage.stage} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span className="font-medium">{stage.stage}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{stage.users.toLocaleString()}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({stage.rate.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <Progress value={stage.rate} className="h-6" />
                      {!isFirst && (
                        <span className="absolute right-0 -top-5 text-xs text-red-600">
                          -{dropOff.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Insights Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
          <CardDescription>Important trends and patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Growth Momentum</p>
                <p className="text-sm text-muted-foreground">
                  User growth is accelerating with {data.user_growth[data.user_growth.length - 1]?.new_users || 0} new users in the last period
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Target className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Retention Opportunity</p>
                <p className="text-sm text-muted-foreground">
                  Day 7 retention at {data.retention_rates.day_7.toFixed(0)}% shows room for improvement
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Award className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">High Performers</p>
                <p className="text-sm text-muted-foreground">
                  {data.activity_distribution.find(d => d.level === 'High')?.count || 0} power users driving engagement
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}