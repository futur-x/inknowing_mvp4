"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle,
  Clock,
  Info,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  XCircle,
  TrendingUp,
  Activity,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';

interface Alert {
  id: string;
  severity: string;
  type: string;
  message: string;
  status: string;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  acknowledged_by?: string;
  resolved_by?: string;
  resolution_notes?: string;
  details?: any;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric_name: string;
  condition: string;
  threshold: number;
  duration: number;
  severity: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface AlertStatistics {
  total_alerts: number;
  active_alerts: number;
  acknowledged_alerts: number;
  resolved_alerts: number;
  alerts_by_severity: {
    [key: string]: number;
  };
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [statistics, setStatistics] = useState<AlertStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    metric_name: '',
    condition: 'greater_than',
    threshold: 0,
    duration: 60,
    severity: 'warning'
  });
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);
  const { toast } = useToast();

  // Fetch alerts
  const fetchAlerts = async (status?: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const params = new URLSearchParams();
      if (status) params.append('status', status);

      const response = await fetch(`/api/v1/admin/monitoring/alerts?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const data = await response.json();
      setAlerts(data.alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch alerts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch alert rules
  const fetchAlertRules = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/admin/monitoring/alerts/rules', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch alert rules');
      }

      const data = await response.json();
      setAlertRules(data.rules || []);
    } catch (error) {
      console.error('Error fetching alert rules:', error);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/admin/monitoring/alerts/statistics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/v1/admin/monitoring/alerts/${alertId}/acknowledge`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge alert');
      }

      toast({
        title: "Success",
        description: "Alert acknowledged",
      });

      fetchAlerts();
      fetchStatistics();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive",
      });
    }
  };

  // Resolve alert
  const resolveAlert = async (alertId: string, notes: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/v1/admin/monitoring/alerts/${alertId}/resolve?resolution_notes=${encodeURIComponent(notes)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to resolve alert');
      }

      toast({
        title: "Success",
        description: "Alert resolved",
      });

      setResolutionNotes('');
      setSelectedAlert(null);
      fetchAlerts();
      fetchStatistics();
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: "Error",
        description: "Failed to resolve alert",
        variant: "destructive",
      });
    }
  };

  // Create alert rule
  const createAlertRule = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/admin/monitoring/alerts/rules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newRule)
      });

      if (!response.ok) {
        throw new Error('Failed to create alert rule');
      }

      toast({
        title: "Success",
        description: "Alert rule created successfully",
      });

      setIsCreateRuleOpen(false);
      setNewRule({
        name: '',
        description: '',
        metric_name: '',
        condition: 'greater_than',
        threshold: 0,
        duration: 60,
        severity: 'warning'
      });
      fetchAlertRules();
    } catch (error) {
      console.error('Error creating alert rule:', error);
      toast({
        title: "Error",
        description: "Failed to create alert rule",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchAlertRules();
    fetchStatistics();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAlerts();
      fetchStatistics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-700" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'critical':
        return 'bg-red-200 text-red-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'acknowledged':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Alert Management</h1>
          <p className="text-muted-foreground">Monitor and manage system alerts and rules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            fetchAlerts();
            fetchStatistics();
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isCreateRuleOpen} onOpenChange={setIsCreateRuleOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Alert Rule</DialogTitle>
                <DialogDescription>
                  Define conditions that trigger alerts
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rule-name">Rule Name</Label>
                  <Input
                    id="rule-name"
                    value={newRule.name}
                    onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                    placeholder="e.g., High CPU Usage"
                  />
                </div>
                <div>
                  <Label htmlFor="rule-description">Description</Label>
                  <Textarea
                    id="rule-description"
                    value={newRule.description}
                    onChange={(e) => setNewRule({...newRule, description: e.target.value})}
                    placeholder="Describe what this rule monitors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="metric-name">Metric Name</Label>
                    <Input
                      id="metric-name"
                      value={newRule.metric_name}
                      onChange={(e) => setNewRule({...newRule, metric_name: e.target.value})}
                      placeholder="e.g., system.cpu.usage"
                    />
                  </div>
                  <div>
                    <Label htmlFor="condition">Condition</Label>
                    <Select
                      value={newRule.condition}
                      onValueChange={(value) => setNewRule({...newRule, condition: value})}
                    >
                      <SelectTrigger id="condition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="greater_than">Greater Than</SelectItem>
                        <SelectItem value="less_than">Less Than</SelectItem>
                        <SelectItem value="equals">Equals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="threshold">Threshold</Label>
                    <Input
                      id="threshold"
                      type="number"
                      value={newRule.threshold}
                      onChange={(e) => setNewRule({...newRule, threshold: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (s)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={newRule.duration}
                      onChange={(e) => setNewRule({...newRule, duration: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="severity">Severity</Label>
                    <Select
                      value={newRule.severity}
                      onValueChange={(value) => setNewRule({...newRule, severity: value})}
                    >
                      <SelectTrigger id="severity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateRuleOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createAlertRule}>Create Rule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_alerts}</div>
              <p className="text-xs text-muted-foreground">In last 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statistics.active_alerts}
              </div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {statistics.acknowledged_alerts}
              </div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statistics.resolved_alerts}
              </div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="history">Alert History</TabsTrigger>
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active & Acknowledged Alerts</CardTitle>
              <CardDescription>Alerts requiring attention or in progress</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {alerts.filter(a => a.status !== 'resolved').map((alert) => (
                    <div key={alert.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(alert.severity)}
                          <div className="space-y-1">
                            <p className="font-medium">{alert.message}</p>
                            <div className="flex items-center gap-2">
                              <Badge className={getSeverityColor(alert.severity)}>
                                {alert.severity}
                              </Badge>
                              <Badge variant="outline">{alert.type}</Badge>
                              {getStatusIcon(alert.status)}
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(alert.created_at), 'PPp')}
                              </span>
                            </div>
                            {alert.details && (
                              <div className="mt-2 p-2 bg-muted rounded text-xs">
                                <pre>{JSON.stringify(alert.details, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {alert.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              Acknowledge
                            </Button>
                          )}
                          {alert.status !== 'resolved' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" onClick={() => setSelectedAlert(alert)}>
                                  Resolve
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Resolve Alert</DialogTitle>
                                  <DialogDescription>
                                    Provide resolution notes for this alert
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Alert</Label>
                                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                                  </div>
                                  <div>
                                    <Label htmlFor="resolution-notes">Resolution Notes</Label>
                                    <Textarea
                                      id="resolution-notes"
                                      value={resolutionNotes}
                                      onChange={(e) => setResolutionNotes(e.target.value)}
                                      placeholder="Describe how this alert was resolved..."
                                      rows={4}
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => {
                                    setSelectedAlert(null);
                                    setResolutionNotes('');
                                  }}>
                                    Cancel
                                  </Button>
                                  <Button onClick={() => resolveAlert(alert.id, resolutionNotes)}>
                                    Resolve Alert
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {alerts.filter(a => a.status !== 'resolved').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p>No active alerts</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert History</CardTitle>
              <CardDescription>Previously resolved alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {alerts.filter(a => a.status === 'resolved').map((alert) => (
                    <div key={alert.id} className="border rounded-lg p-3 bg-muted/30">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="font-medium">{alert.message}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <span className="text-muted-foreground">
                              Created: {format(new Date(alert.created_at), 'PP')}
                            </span>
                            {alert.resolved_at && (
                              <span className="text-muted-foreground">
                                Resolved: {format(new Date(alert.resolved_at), 'PP')}
                              </span>
                            )}
                          </div>
                          {alert.resolution_notes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              Resolution: {alert.resolution_notes}
                            </p>
                          )}
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Rules</CardTitle>
              <CardDescription>Configure automatic alert conditions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alertRules.map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{rule.name}</h3>
                          {rule.enabled ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Disabled</Badge>
                          )}
                          <Badge className={getSeverityColor(rule.severity)}>
                            {rule.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Metric: {rule.metric_name}</span>
                          <span>Condition: {rule.condition} {rule.threshold}</span>
                          <span>Duration: {rule.duration}s</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          {rule.enabled ? (
                            <BellOff className="h-4 w-4" />
                          ) : (
                            <Bell className="h-4 w-4" />
                          )}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {alertRules.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4" />
                    <p>No alert rules configured</p>
                    <Button className="mt-4" onClick={() => setIsCreateRuleOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Rule
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}