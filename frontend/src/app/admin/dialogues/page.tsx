'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, MessageSquare, Users, Clock, AlertCircle, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import DialogueListTable from '@/components/admin/dialogues/DialogueListTable';
import DialogueStats from '@/components/admin/dialogues/DialogueStats';
import DialogueRealtime from '@/components/admin/dialogues/DialogueRealtime';

export default function DialoguesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 统计数据
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    todaySessions: 0,
    avgResponseTime: 0,
    totalMessages: 0,
    userSatisfaction: 0
  });

  // 处理刷新
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // TODO: 重新加载数据
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // 导出对话记录
  const handleExport = async () => {
    try {
      // TODO: 调用导出API
      console.log('Exporting dialogues...');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">对话管理</h1>
          <p className="text-muted-foreground mt-1">监控和管理所有用户对话</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            导出
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <DialogueStats stats={stats} />

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="搜索用户、书籍或对话内容..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">进行中</SelectItem>
                <SelectItem value="ended">已结束</SelectItem>
                <SelectItem value="expired">已过期</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="时间筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部时间</SelectItem>
                <SelectItem value="today">今天</SelectItem>
                <SelectItem value="week">本周</SelectItem>
                <SelectItem value="month">本月</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 主要内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-[500px]">
          <TabsTrigger value="all">
            <MessageSquare className="h-4 w-4 mr-2" />
            所有对话
          </TabsTrigger>
          <TabsTrigger value="realtime">
            <Clock className="h-4 w-4 mr-2" />
            实时监控
          </TabsTrigger>
          <TabsTrigger value="flagged">
            <AlertCircle className="h-4 w-4 mr-2" />
            需要关注
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <DialogueListTable
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            dateFilter={dateFilter}
          />
        </TabsContent>

        <TabsContent value="realtime" className="space-y-4">
          <DialogueRealtime />
        </TabsContent>

        <TabsContent value="flagged" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>需要关注的对话</CardTitle>
              <CardDescription>
                包含敏感内容、用户投诉或异常行为的对话
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DialogueListTable
                searchTerm={searchTerm}
                statusFilter={statusFilter}
                dateFilter={dateFilter}
                flaggedOnly={true}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}