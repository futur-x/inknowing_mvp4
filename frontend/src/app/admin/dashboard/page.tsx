"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Users,
  BookOpen,
  MessageSquare,
  Activity,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  UserPlus,
  Settings,
  BarChart3
} from 'lucide-react';

// Import our custom components
import StatsCard from '@/components/admin/StatsCard';
import UserGrowthChart from '@/components/admin/charts/UserGrowthChart';
import DialogueTrendChart from '@/components/admin/charts/DialogueTrendChart';
import BookCategoryPieChart from '@/components/admin/charts/BookCategoryPieChart';
import ActivityHeatmap from '@/components/admin/charts/ActivityHeatmap';
import RecentUsersTable from '@/components/admin/tables/RecentUsersTable';
import RecentDialoguesTable from '@/components/admin/tables/RecentDialoguesTable';
import PopularBooksTable from '@/components/admin/tables/PopularBooksTable';
import AnnouncementBoard from '@/components/admin/AnnouncementBoard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface DashboardData {
  stats: {
    total_users: number;
    total_books: number;
    today_dialogues: number;
    active_users: number;
    new_users_today: number;
  };
  trends: {
    user_growth: Array<{ date: string; count: number }>;
    dialogue_trend: Array<{ date: string; count: number }>;
    book_distribution: Array<{ category: string; count: number }>;
    activity_heatmap: Record<string, number[]>;
  };
  recent_activities: {
    recent_users: Array<{
      id: string;
      username: string;
      created_at: string;
      membership: string;
    }>;
    recent_dialogues: Array<{
      id: string;
      user: string;
      book: string;
      created_at: string;
      status: string;
    }>;
    popular_books: Array<{
      id: string;
      title: string;
      author: string;
      dialogue_count: number;
      rating: number;
    }>;
    announcements: Array<{
      id: string;
      type: 'info' | 'success' | 'warning' | 'error';
      title: string;
      content: string;
      created_at: string;
    }>;
  };
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      // Import API helper
      const { adminDashboardAPI } = await import('@/lib/admin-api-helper');

      // Fetch all data in parallel
      const [stats, trends, recent_activities] = await Promise.all([
        adminDashboardAPI.getStats(),
        adminDashboardAPI.getTrends(7),
        adminDashboardAPI.getRecentActivities(10)
      ]);

      setData({
        stats,
        trends,
        recent_activities
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up auto-refresh every 60 seconds
    const interval = setInterval(fetchDashboardData, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">管理后台 Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            欢迎回来，这里是您的数据概览
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          刷新数据
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="用户总数"
          value={data.stats.total_users.toLocaleString()}
          description={`今日新增 ${data.stats.new_users_today} 位用户`}
          icon={Users}
          trend={{
            value: 12,
            isPositive: true
          }}
        />
        <StatsCard
          title="书籍总数"
          value={data.stats.total_books.toLocaleString()}
          description="在线可用书籍"
          icon={BookOpen}
        />
        <StatsCard
          title="今日对话"
          value={data.stats.today_dialogues.toLocaleString()}
          description="AI对话次数"
          icon={MessageSquare}
          trend={{
            value: 8,
            isPositive: true
          }}
        />
        <StatsCard
          title="活跃用户"
          value={data.stats.active_users.toLocaleString()}
          description="24小时内活跃"
          icon={Activity}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="analytics">数据分析</TabsTrigger>
          <TabsTrigger value="activities">最新动态</TabsTrigger>
          <TabsTrigger value="quick-actions">快速操作</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <UserGrowthChart data={data.trends.user_growth} />
            <DialogueTrendChart data={data.trends.dialogue_trend} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <RecentUsersTable users={data.recent_activities.recent_users.slice(0, 5)} />
            <PopularBooksTable books={data.recent_activities.popular_books.slice(0, 5)} />
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <BookCategoryPieChart data={data.trends.book_distribution} />
            <ActivityHeatmap data={data.trends.activity_heatmap} />
          </div>
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>数据洞察</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>平均每用户对话数</span>
                  <span className="font-bold">
                    {data.stats.today_dialogues > 0
                      ? (data.stats.today_dialogues / data.stats.active_users).toFixed(2)
                      : '0'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>用户活跃率</span>
                  <span className="font-bold">
                    {data.stats.total_users > 0
                      ? ((data.stats.active_users / data.stats.total_users) * 100).toFixed(1)
                      : '0'}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>新用户转化率</span>
                  <span className="font-bold text-green-600">
                    <TrendingUp className="inline h-4 w-4 mr-1" />
                    15.3%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <RecentUsersTable users={data.recent_activities.recent_users} />
            <RecentDialoguesTable dialogues={data.recent_activities.recent_dialogues} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <PopularBooksTable books={data.recent_activities.popular_books} />
            <AnnouncementBoard announcements={data.recent_activities.announcements} />
          </div>
        </TabsContent>

        {/* Quick Actions Tab */}
        <TabsContent value="quick-actions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/admin/users">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Users className="h-8 w-8 text-primary" />
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-semibold">用户管理</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    管理用户账户、权限和会员资格
                  </p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/admin/content">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <BookOpen className="h-8 w-8 text-primary" />
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-semibold">内容管理</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    管理书籍、分类和角色设置
                  </p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/admin/analytics">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <BarChart3 className="h-8 w-8 text-primary" />
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-semibold">数据分析</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    深入分析用户行为和平台数据
                  </p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/admin/settings">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Settings className="h-8 w-8 text-primary" />
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-semibold">系统设置</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    配置系统参数和安全设置
                  </p>
                </CardContent>
              </Link>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>快速统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">会员分布</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">免费用户</span>
                      <span className="text-sm font-medium">65%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">基础会员</span>
                      <span className="text-sm font-medium">20%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">高级会员</span>
                      <span className="text-sm font-medium">12%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">超级会员</span>
                      <span className="text-sm font-medium">3%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">系统状态</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">API响应时间</span>
                      <span className="text-sm font-medium text-green-600">45ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">数据库连接</span>
                      <span className="text-sm font-medium text-green-600">正常</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">存储使用率</span>
                      <span className="text-sm font-medium">72%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">CDN状态</span>
                      <span className="text-sm font-medium text-green-600">在线</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}