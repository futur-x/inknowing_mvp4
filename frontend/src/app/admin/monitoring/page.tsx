"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  AlertCircle,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SystemHealth {
  status: string;
  timestamp: string;
  services: {
    [key: string]: {
      service: string;
      status: string;
      response_time: number;
      error?: string;
    };
  };
  metrics: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    database_responsive: number;
    error_rate: number;
  };
}

interface Metrics {
  timestamp: string;
  metrics: {
    [key: string]: {
      value: number;
      type: string;
      timestamp: string;
      tags?: any;
    };
  };
  qps: number;
  active_connections: number;
}

export default function MonitoringDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  // Fetch system health
  const fetchSystemHealth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/admin/monitoring/health', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch system health');
      }

      const data = await response.json();
      setSystemHealth(data);
    } catch (error) {
      console.error('Error fetching system health:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system health data",
        variant: "destructive",
      });
    }
  };

  // Fetch real-time metrics
  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/admin/monitoring/metrics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(data);

      // Update history for charts
      setMetricsHistory(prev => {
        const newHistory = [...prev, {
          time: new Date(data.timestamp).toLocaleTimeString(),
          cpu: data.metrics['system.cpu.usage']?.value || 0,
          memory: data.metrics['system.memory.usage']?.value || 0,
          qps: data.qps
        }];
        return newHistory.slice(-20); // Keep last 20 data points
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchSystemHealth();
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchSystemHealth();
        fetchMetrics();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
      case 'down':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">Real-time system health and performance monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-Refreshing' : 'Auto-Refresh Off'}
          </Button>
          <Button variant="outline" onClick={() => {
            fetchSystemHealth();
            fetchMetrics();
          }}>
            Refresh Now
          </Button>
        </div>
      </div>

      {/* System Status Alert */}
      {systemHealth && (
        <Alert className={systemHealth.status === 'healthy' ? '' : 'border-yellow-500'}>
          <div className="flex items-center gap-2">
            {getStatusIcon(systemHealth.status)}
            <AlertTitle>System Status: {systemHealth.status.toUpperCase()}</AlertTitle>
          </div>
          <AlertDescription>
            Last checked: {new Date(systemHealth.timestamp).toLocaleString()}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth?.metrics.cpu_usage.toFixed(1)}%
            </div>
            <Progress value={systemHealth?.metrics.cpu_usage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth?.metrics.memory_usage.toFixed(1)}%
            </div>
            <Progress value={systemHealth?.metrics.memory_usage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth?.metrics.disk_usage.toFixed(1)}%
            </div>
            <Progress value={systemHealth?.metrics.disk_usage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QPS</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.qps.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Queries per second
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Service Health Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Health</CardTitle>
          <CardDescription>Status of critical system services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {systemHealth?.services && Object.entries(systemHealth.services).map(([key, service]) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <p className="font-medium capitalize">{service.service}</p>
                    <p className="text-sm text-muted-foreground">
                      Response time: {service.response_time.toFixed(2)}ms
                    </p>
                  </div>
                </div>
                <Badge className={getStatusColor(service.status)}>
                  {service.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Charts */}
      <Tabs defaultValue="realtime" className="space-y-4">
        <TabsList>
          <TabsTrigger value="realtime">Real-time Metrics</TabsTrigger>
          <TabsTrigger value="system">System Resources</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Performance</CardTitle>
              <CardDescription>Live system metrics over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metricsHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cpu"
                    stroke="#8884d8"
                    name="CPU %"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="memory"
                    stroke="#82ca9d"
                    name="Memory %"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Query Performance</CardTitle>
              <CardDescription>Queries per second over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={metricsHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="qps"
                    stroke="#ffc658"
                    fill="#ffc658"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {metrics?.metrics && Object.entries(metrics.metrics)
              .filter(([key]) => key.startsWith('system.'))
              .map(([key, metric]) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="text-lg">{key.replace('system.', '').replace(/\./g, ' ').toUpperCase()}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {metric.value.toFixed(2)}
                      {key.includes('usage') && '%'}
                      {key.includes('memory') && !key.includes('usage') && ' GB'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Type: {metric.type}
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Network Statistics</CardTitle>
              <CardDescription>Network I/O and connection metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Active Connections</p>
                  <p className="text-2xl font-bold">{metrics?.active_connections || 0}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Error Rate</p>
                  <p className="text-2xl font-bold">{systemHealth?.metrics.error_rate.toFixed(2)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}