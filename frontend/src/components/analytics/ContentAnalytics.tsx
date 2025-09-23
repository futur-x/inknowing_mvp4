'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
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
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap
} from 'recharts';
import {
  BookOpen,
  Star,
  MessageSquare,
  TrendingUp,
  Award,
  Hash,
  BarChart3
} from 'lucide-react';
import { analyticsService } from '@/services/analyticsService';
import type { ContentAnalytics as ContentAnalyticsType, TimeRange } from '@/types/analytics';

interface ContentAnalyticsProps {
  timeRange: TimeRange;
  isRefreshing?: boolean;
}

export default function ContentAnalytics({ timeRange, isRefreshing }: ContentAnalyticsProps) {
  const [data, setData] = useState<ContentAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [timeRange, isRefreshing]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await analyticsService.getContentAnalytics(timeRange);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch content analytics:', err);
      setError('Failed to load content analytics');
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

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

  // Prepare radar chart data for engagement metrics
  const engagementRadarData = [
    {
      metric: 'Total Dialogues',
      value: Math.min(100, (data.engagement_metrics.total_dialogues / 10000) * 100),
      fullMark: 100
    },
    {
      metric: 'Avg Messages',
      value: Math.min(100, (data.engagement_metrics.avg_messages_per_session / 20) * 100),
      fullMark: 100
    },
    {
      metric: 'Completion Rate',
      value: data.engagement_metrics.completion_rate,
      fullMark: 100
    },
    {
      metric: 'Repeat Usage',
      value: data.engagement_metrics.repeat_usage_rate,
      fullMark: 100
    }
  ];

  return (
    <div className="space-y-6">
      {/* Popular Books */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Books</CardTitle>
          <CardDescription>Most engaged books by dialogue count</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.popular_books.slice(0, 10)} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="title" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="dialogue_count" fill="#8884d8">
                {data.popular_books.slice(0, 10).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Content Quality and Topics */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Quality Scores */}
        <Card>
          <CardHeader>
            <CardTitle>Content Quality Scores</CardTitle>
            <CardDescription>Books ranked by user ratings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.content_quality_scores.slice(0, 5).map((book, index) => (
                <div key={book.book_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {book.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold">{book.score.toFixed(1)}</span>
                    </div>
                  </div>
                  <Progress value={book.score * 20} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {book.sessions} sessions
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dialogue Topics */}
        <Card>
          <CardHeader>
            <CardTitle>Dialogue Topics</CardTitle>
            <CardDescription>Distribution of conversation themes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.dialogue_topics}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ topic, count }) => `${topic}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.dialogue_topics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Metrics */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Engagement Radar */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Overview</CardTitle>
            <CardDescription>Multi-dimensional engagement analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={engagementRadarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="Engagement"
                  dataKey="value"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recommendation Effectiveness */}
        <Card>
          <CardHeader>
            <CardTitle>Recommendation System</CardTitle>
            <CardDescription>Performance of content recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {data.recommendation_effectiveness.click_through_rate.toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">CTR</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {data.recommendation_effectiveness.conversion_rate.toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Conversion</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {data.recommendation_effectiveness.accuracy_score.toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Accuracy</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Click-through Rate</span>
                  <div className="flex items-center gap-2 flex-1 ml-4">
                    <Progress value={data.recommendation_effectiveness.click_through_rate} className="flex-1" />
                    <Badge variant="outline">{data.recommendation_effectiveness.click_through_rate.toFixed(0)}%</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Conversion Rate</span>
                  <div className="flex items-center gap-2 flex-1 ml-4">
                    <Progress value={data.recommendation_effectiveness.conversion_rate} className="flex-1" />
                    <Badge variant="outline">{data.recommendation_effectiveness.conversion_rate.toFixed(0)}%</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Accuracy Score</span>
                  <div className="flex items-center gap-2 flex-1 ml-4">
                    <Progress value={data.recommendation_effectiveness.accuracy_score} className="flex-1" />
                    <Badge variant="outline">{data.recommendation_effectiveness.accuracy_score.toFixed(0)}%</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Dialogues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsService.formatNumber(data.engagement_metrics.total_dialogues)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              Active conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.engagement_metrics.avg_messages_per_session.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <MessageSquare className="inline h-3 w-3 mr-1" />
              Per session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.engagement_metrics.completion_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <Award className="inline h-3 w-3 mr-1" />
              Sessions completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Repeat Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.engagement_metrics.repeat_usage_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <BarChart3 className="inline h-3 w-3 mr-1" />
              Return users
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}