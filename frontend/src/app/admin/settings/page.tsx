'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { adminApi, type AdminConfig } from '@/lib/admin-api';
import {
  Settings,
  Shield,
  DollarSign,
  Zap,
  Mail,
  Database,
  FileText,
  AlertCircle,
  Save,
  RefreshCw,
  Lock,
  Key,
  Globe,
  Server,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    // Check for tab parameter
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }

    fetchConfig();
    if (tab === 'audit') {
      fetchAuditLogs();
    }
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getConfig();
      setConfig(data);
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const data = await adminApi.getAuditLog({
        page: 1,
        limit: 50
      });
      setAuditLogs(data.logs);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);
      await adminApi.updateConfig(config);
      // Show success message
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleFeatureToggle = async (feature: string, enabled: boolean) => {
    if (!config) return;

    try {
      await adminApi.toggleFeature(feature, enabled);
      setConfig({
        ...config,
        features: {
          ...config.features,
          [feature]: enabled
        }
      });
    } catch (err) {
      console.error('Failed to toggle feature:', err);
    }
  };

  const handleQuotaChange = (tier: string, field: string, value: string) => {
    if (!config) return;

    const numValue = parseInt(value) || 0;
    setConfig({
      ...config,
      quotas: {
        ...config.quotas,
        [tier]: {
          ...config.quotas[tier as keyof typeof config.quotas],
          [field]: numValue
        }
      }
    });
  };

  const handlePricingChange = (tier: string, value: string) => {
    if (!config) return;

    const numValue = parseFloat(value) || 0;
    setConfig({
      ...config,
      pricing: {
        ...config.pricing,
        [tier]: numValue
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure platform settings and features
          </p>
        </div>
        <Button onClick={handleSaveConfig} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="quotas">Quotas</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>
                General configuration for the InKnowing platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Platform Name</Label>
                    <Input defaultValue="InKnowing" />
                  </div>
                  <div className="space-y-2">
                    <Label>Support Email</Label>
                    <Input defaultValue="support@inknowing.com" type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label>Default Language</Label>
                    <Select defaultValue="zh">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zh">Chinese</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Time Zone</Label>
                    <Select defaultValue="Asia/Shanghai">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Shanghai">Shanghai</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">AI Model Configuration</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Default AI Model</Label>
                    <Select
                      value={config.aiModels.default}
                      onValueChange={(value) => setConfig({
                        ...config,
                        aiModels: { ...config.aiModels, default: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {config.aiModels.available.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Tokens per Request</Label>
                    <Input type="number" defaultValue="4000" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Maintenance Mode</h3>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Enabling maintenance mode will prevent users from accessing the platform
                  </AlertDescription>
                </Alert>
                <div className="flex items-center space-x-2">
                  <Switch id="maintenance" />
                  <Label htmlFor="maintenance">Enable Maintenance Mode</Label>
                </div>
                <Textarea
                  placeholder="Maintenance message to display to users..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>
                Enable or disable platform features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(config.features).map(([feature, enabled]) => (
                  <div key={feature} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">
                        {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {feature === 'user_upload' && 'Allow users to upload books'}
                        {feature === 'character_chat' && 'Enable character-specific dialogues'}
                        {feature === 'social_login' && 'Allow login via social accounts'}
                        {feature === 'payment_system' && 'Enable payment and subscription features'}
                        {feature === 'email_notifications' && 'Send email notifications to users'}
                      </p>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => handleFeatureToggle(feature, checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Quotas</CardTitle>
              <CardDescription>
                Configure dialogue quotas for each membership tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Free Tier */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Free</Badge>
                    <span className="text-sm text-muted-foreground">Default tier for all users</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Dialogues per Day</Label>
                      <Input
                        type="number"
                        value={config.quotas.free.dialoguesPerDay}
                        onChange={(e) => handleQuotaChange('free', 'dialoguesPerDay', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Paid Tiers */}
                {['basic', 'premium', 'super'].map((tier) => (
                  <div key={tier} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge>{tier.charAt(0).toUpperCase() + tier.slice(1)}</Badge>
                      <span className="text-sm text-muted-foreground">
                        Paid subscription tier
                      </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Dialogues per Month</Label>
                        <Input
                          type="number"
                          value={config.quotas[tier as 'basic' | 'premium' | 'super'].dialoguesPerMonth}
                          onChange={(e) => handleQuotaChange(tier, 'dialoguesPerMonth', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Pricing</CardTitle>
              <CardDescription>
                Set pricing for membership tiers (in CNY)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(config.pricing).map(([tier, price]) => (
                  <div key={tier} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge>{tier.charAt(0).toUpperCase() + tier.slice(1)}</Badge>
                      <span className="text-sm text-muted-foreground">
                        Monthly subscription
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Label>Price (¥)</Label>
                      <Input
                        type="number"
                        value={price}
                        onChange={(e) => handlePricingChange(tier, e.target.value)}
                        step="0.01"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Quota: {config.quotas[tier as keyof typeof config.quotas]?.dialoguesPerMonth} dialogues/month
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security and access control
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Admin Access</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="2fa" defaultChecked />
                    <Label htmlFor="2fa">Require 2FA for admin accounts</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="ip-whitelist" />
                    <Label htmlFor="ip-whitelist">Enable IP whitelist for admin access</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Session Timeout (minutes)</Label>
                    <Input type="number" defaultValue="30" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Rate Limiting</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>API Requests per Minute</Label>
                    <Input type="number" defaultValue="60" />
                  </div>
                  <div className="space-y-2">
                    <Label>Login Attempts per Hour</Label>
                    <Input type="number" defaultValue="5" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Content Security</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="content-moderation" defaultChecked />
                    <Label htmlFor="content-moderation">Enable automatic content moderation</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="virus-scan" defaultChecked />
                    <Label htmlFor="virus-scan">Scan uploaded files for viruses</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>
                Track all administrative actions on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <p className="text-sm">
                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{log.adminName}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{log.targetType}: {log.targetId}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">{log.ip}</p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}