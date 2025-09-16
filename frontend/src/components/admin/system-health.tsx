'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Database,
  Wifi,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  Globe,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemHealthProps {
  stats: {
    status: 'operational' | 'degraded' | 'down';
    apiLatency: number;
    wsConnections: number;
    dbStatus: string;
  };
}

export function SystemHealth({ stats }: SystemHealthProps) {
  const services = [
    {
      name: 'API Server',
      status: stats.status,
      metric: `${stats.apiLatency}ms`,
      description: 'Average response time',
      icon: Server,
      health: stats.apiLatency < 100 ? 'good' : stats.apiLatency < 300 ? 'warning' : 'error'
    },
    {
      name: 'WebSocket Server',
      status: stats.wsConnections > 0 ? 'operational' : 'down',
      metric: `${stats.wsConnections} connections`,
      description: 'Active WebSocket connections',
      icon: Wifi,
      health: stats.wsConnections > 0 ? 'good' : 'error'
    },
    {
      name: 'Database',
      status: stats.dbStatus === 'connected' ? 'operational' : 'down',
      metric: stats.dbStatus,
      description: 'MongoDB connection status',
      icon: Database,
      health: stats.dbStatus === 'connected' ? 'good' : 'error'
    },
    {
      name: 'Storage',
      status: 'operational',
      metric: '45% used',
      description: '4.5GB of 10GB',
      icon: HardDrive,
      health: 'good'
    },
    {
      name: 'CPU Usage',
      status: 'operational',
      metric: '32%',
      description: 'Average across all cores',
      icon: Cpu,
      health: 'good'
    },
    {
      name: 'Memory',
      status: 'operational',
      metric: '2.1GB / 4GB',
      description: '52% memory usage',
      icon: MemoryStick,
      health: 'warning'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'good':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Health</CardTitle>
              <CardDescription>
                Real-time monitoring of all system components
              </CardDescription>
            </div>
            <Badge
              variant={
                stats.status === 'operational' ? 'default' :
                stats.status === 'degraded' ? 'secondary' : 'destructive'
              }
              className="text-sm"
            >
              {stats.status === 'operational' ? 'All Systems Operational' :
               stats.status === 'degraded' ? 'Partial Outage' : 'Major Outage'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Service Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.name}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn('rounded-lg p-2', getHealthColor(service.health))}>
                    <service.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">
                      {service.name}
                    </CardTitle>
                  </div>
                </div>
                {getStatusIcon(service.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">{service.metric}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {service.description}
                </p>
                {service.name === 'Storage' && (
                  <Progress value={45} className="h-2" />
                )}
                {service.name === 'CPU Usage' && (
                  <Progress value={32} className="h-2" />
                )}
                {service.name === 'Memory' && (
                  <Progress value={52} className="h-2" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Incidents */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
          <CardDescription>
            System incidents and resolutions from the last 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                time: '2 hours ago',
                type: 'resolved',
                message: 'Database connection timeout resolved',
                duration: '5 minutes'
              },
              {
                time: '8 hours ago',
                type: 'resolved',
                message: 'API rate limiting adjusted',
                duration: '2 minutes'
              },
              {
                time: '12 hours ago',
                type: 'maintenance',
                message: 'Scheduled maintenance completed',
                duration: '15 minutes'
              }
            ].map((incident, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className={cn(
                  'mt-1 rounded-full p-1',
                  incident.type === 'resolved' ? 'bg-green-100' :
                  incident.type === 'ongoing' ? 'bg-red-100' : 'bg-blue-100'
                )}>
                  {incident.type === 'resolved' ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : incident.type === 'ongoing' ? (
                    <AlertCircle className="h-3 w-3 text-red-600" />
                  ) : (
                    <Activity className="h-3 w-3 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{incident.message}</p>
                    <Badge variant="outline" className="text-xs">
                      {incident.duration}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{incident.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}