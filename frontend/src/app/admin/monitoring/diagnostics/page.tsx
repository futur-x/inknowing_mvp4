"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  HardDrive,
  Info,
  RefreshCw,
  Search,
  Server,
  Zap,
  TrendingUp,
  TrendingDown,
  Cpu,
  MemoryStick,
  Network,
  Shield,
  Bug,
  FileSearch
} from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Diagnostics {
  timestamp: string;
  database: {
    responsive: boolean;
    recent_queries: number;
    total_users: number;
  };
  redis?: {
    memory_used_mb: number;
    connected_clients: number;
    total_commands: number;
  };
  slow_queries: Array<{
    query: string;
    duration: number;
    timestamp: string;
  }>;
  error_summary: {
    total_errors: number;
    critical_errors: number;
    errors_by_source: {
      [key: string]: Array<{
        message: string;
        timestamp: string;
        level: string;
      }>;
    };
    time_range: string;
  };
  resource_usage: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

interface MetricHistory {
  metric_name: string;
  data: Array<{
    timestamp: string;
    value: number;
  }>;
}

export default function DiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [metricHistory, setMetricHistory] = useState<{[key: string]: MetricHistory}>({});
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('system.cpu.usage');
  const { toast } = useToast();

  // Fetch diagnostics
  const fetchDiagnostics = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/admin/monitoring/diagnostics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch diagnostics');
      }

      const data = await response.json();
      setDiagnostics(data);
    } catch (error) {
      console.error('Error fetching diagnostics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch diagnostics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch metric history
  const fetchMetricHistory = async (metricName: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/v1/admin/monitoring/metrics/history?metric_name=${metricName}&hours=24`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch metric history');
      }

      const data = await response.json();
      setMetricHistory(prev => ({
        ...prev,
        [metricName]: data
      }));
    } catch (error) {
      console.error('Error fetching metric history:', error);
    }
  };

  useEffect(() => {
    fetchDiagnostics();

    // Fetch history for common metrics
    ['system.cpu.usage', 'system.memory.usage', 'system.disk.usage', 'database.queries.recent'].forEach(metric => {
      fetchMetricHistory(metric);
    });

    // Refresh every 60 seconds
    const interval = setInterval(() => {
      fetchDiagnostics();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const getHealthStatus = (diagnostics: Diagnostics) => {
    const issues = [];

    if (!diagnostics.database.responsive) {
      issues.push({ level: 'critical', message: 'Database not responsive' });
    }
    if (diagnostics.resource_usage.cpu > 80) {
      issues.push({ level: 'warning', message: 'High CPU usage' });
    }
    if (diagnostics.resource_usage.memory > 85) {
      issues.push({ level: 'warning', message: 'High memory usage' });
    }
    if (diagnostics.resource_usage.disk > 90) {
      issues.push({ level: 'critical', message: 'Low disk space' });
    }
    if (diagnostics.error_summary.critical_errors > 0) {
      issues.push({ level: 'error', message: `${diagnostics.error_summary.critical_errors} critical errors` });
    }

    return issues;
  };

  const prepareErrorChart = () => {
    if (!diagnostics) return [];

    return Object.entries(diagnostics.error_summary.errors_by_source).map(([source, errors]) => ({
      name: source,
      value: errors.length,
      critical: errors.filter(e => e.level === 'critical').length
    }));
  };

  const prepareResourcePieChart = () => {
    if (!diagnostics) return [];

    return [
      { name: 'CPU', value: diagnostics.resource_usage.cpu },
      { name: 'Memory', value: diagnostics.resource_usage.memory },
      { name: 'Disk', value: diagnostics.resource_usage.disk }
    ];
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const healthIssues = diagnostics ? getHealthStatus(diagnostics) : [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Diagnostics</h1>
          <p className="text-muted-foreground">Deep system analysis and troubleshooting</p>
        </div>
        <Button onClick={fetchDiagnostics}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Run Diagnostics
        </Button>
      </div>

      {/* Health Overview */}
      {healthIssues.length > 0 ? (
        <Alert className="border-yellow-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>System Issues Detected</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2">
              {healthIssues.map((issue, index) => (
                <li key={index} className={issue.level === 'critical' ? 'text-red-600' : ''}>
                  {issue.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-green-500">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>System Healthy</AlertTitle>
          <AlertDescription>
            All systems are operating normally. Last checked: {diagnostics && format(new Date(diagnostics.timestamp), 'PPpp')}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Resource Usage Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{diagnostics?.resource_usage.cpu.toFixed(1)}%</div>
                <Progress value={diagnostics?.resource_usage.cpu} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {diagnostics?.resource_usage.cpu > 80 ? 'High load detected' : 'Normal operation'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{diagnostics?.resource_usage.memory.toFixed(1)}%</div>
                <Progress value={diagnostics?.resource_usage.memory} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {diagnostics?.resource_usage.memory > 85 ? 'Consider scaling' : 'Healthy range'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{diagnostics?.resource_usage.disk.toFixed(1)}%</div>
                <Progress value={diagnostics?.resource_usage.disk} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {diagnostics?.resource_usage.disk > 90 ? 'Low space warning' : 'Sufficient space'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* System Stats */}
          <Card>
            <CardHeader>
              <CardTitle>System Statistics</CardTitle>
              <CardDescription>Key performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Database Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {diagnostics?.database.responsive ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium">
                      {diagnostics?.database.responsive ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recent Queries</p>
                  <p className="text-2xl font-bold">{diagnostics?.database.recent_queries}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{diagnostics?.database.total_users}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Errors (24h)</p>
                  <p className="text-2xl font-bold text-red-600">{diagnostics?.error_summary.total_errors}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resource Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Resource Distribution</CardTitle>
              <CardDescription>Current resource allocation</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={prepareResourcePieChart()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, value}) => `${name}: ${value.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {prepareResourcePieChart().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* Metric Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Historical performance data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                {['system.cpu.usage', 'system.memory.usage', 'system.disk.usage', 'database.queries.recent'].map(metric => (
                  <Button
                    key={metric}
                    variant={selectedMetric === metric ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedMetric(metric);
                      if (!metricHistory[metric]) {
                        fetchMetricHistory(metric);
                      }
                    }}
                  >
                    {metric.split('.').pop()?.toUpperCase()}
                  </Button>
                ))}
              </div>

              {metricHistory[selectedMetric] && (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metricHistory[selectedMetric].data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => format(new Date(value), 'PPpp')}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Slow Queries */}
          <Card>
            <CardHeader>
              <CardTitle>Slow Query Analysis</CardTitle>
              <CardDescription>Queries taking longer than expected</CardDescription>
            </CardHeader>
            <CardContent>
              {diagnostics?.slow_queries && diagnostics.slow_queries.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {diagnostics.slow_queries.map((query, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <code className="text-sm bg-muted p-1 rounded">
                              {query.query}
                            </code>
                          </div>
                          <div className="ml-4 text-right">
                            <Badge variant="destructive">{query.duration}ms</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(query.timestamp), 'pp')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4" />
                  <p>No slow queries detected</p>
                  <p className="text-sm mt-2">All queries are performing well</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          {/* Error Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{diagnostics?.error_summary.total_errors}</div>
                <p className="text-xs text-muted-foreground">{diagnostics?.error_summary.time_range}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
                <XCircle className="h-4 w-4 text-red-700" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {diagnostics?.error_summary.critical_errors}
                </div>
                <p className="text-xs text-muted-foreground">Require immediate attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Sources</CardTitle>
                <Bug className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.keys(diagnostics?.error_summary.errors_by_source || {}).length}
                </div>
                <p className="text-xs text-muted-foreground">Unique error sources</p>
              </CardContent>
            </Card>
          </div>

          {/* Error Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Error Distribution by Source</CardTitle>
              <CardDescription>Breakdown of errors across system components</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={prepareErrorChart()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" name="Total Errors" />
                  <Bar dataKey="critical" fill="#ff4444" name="Critical" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Error Details */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors by Source</CardTitle>
              <CardDescription>Detailed error breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {diagnostics?.error_summary.errors_by_source &&
                  Object.entries(diagnostics.error_summary.errors_by_source).map(([source, errors]) => (
                    <div key={source} className="mb-4">
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <FileSearch className="h-4 w-4" />
                        {source}
                        <Badge variant="destructive">{errors.length}</Badge>
                      </h3>
                      <div className="space-y-2 pl-6">
                        {errors.slice(0, 3).map((error, index) => (
                          <div key={index} className="text-sm border-l-2 border-red-500 pl-3">
                            <div className="flex items-center gap-2">
                              <Badge className={
                                error.level === 'critical' ? 'bg-red-600' : 'bg-orange-500'
                              }>
                                {error.level}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(error.timestamp), 'pp')}
                              </span>
                            </div>
                            <p className="mt-1">{error.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Database Health */}
            <Card>
              <CardHeader>
                <CardTitle>Database Health</CardTitle>
                <CardDescription>PostgreSQL status and metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Connection Status</span>
                    <div className="flex items-center gap-2">
                      {diagnostics?.database.responsive ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-600">Connected</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-red-600">Disconnected</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Recent Queries</span>
                    <Badge>{diagnostics?.database.recent_queries}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Users</span>
                    <Badge>{diagnostics?.database.total_users}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Redis Health */}
            {diagnostics?.redis && (
              <Card>
                <CardHeader>
                  <CardTitle>Redis Cache</CardTitle>
                  <CardDescription>Cache server status and metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Memory Used</span>
                      <Badge>{diagnostics.redis.memory_used_mb.toFixed(2)} MB</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Connected Clients</span>
                      <Badge>{diagnostics.redis.connected_clients}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Commands</span>
                      <Badge>{diagnostics.redis.total_commands.toLocaleString()}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="dependencies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Dependencies</CardTitle>
              <CardDescription>Status of external services and integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5" />
                    <div>
                      <p className="font-medium">PostgreSQL Database</p>
                      <p className="text-sm text-muted-foreground">Primary data store</p>
                    </div>
                  </div>
                  <Badge className={diagnostics?.database.responsive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {diagnostics?.database.responsive ? 'Healthy' : 'Down'}
                  </Badge>
                </div>

                {diagnostics?.redis && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Server className="h-5 w-5" />
                      <div>
                        <p className="font-medium">Redis Cache</p>
                        <p className="text-sm text-muted-foreground">Session & cache storage</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Authentication Service</p>
                      <p className="text-sm text-muted-foreground">JWT token validation</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Operational</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Network className="h-5 w-5" />
                    <div>
                      <p className="font-medium">API Gateway</p>
                      <p className="text-sm text-muted-foreground">Request routing & rate limiting</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}