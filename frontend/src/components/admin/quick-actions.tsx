'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  UserPlus,
  BookOpen,
  Megaphone,
  Settings,
  FileText,
  ShieldAlert,
  Download,
  RefreshCw
} from 'lucide-react';

export function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      title: 'Add New Admin',
      description: 'Grant admin access to a user',
      icon: UserPlus,
      onClick: () => router.push('/admin/users?action=add-admin'),
      variant: 'default' as const
    },
    {
      title: 'Review Pending Books',
      description: 'Approve or reject book uploads',
      icon: BookOpen,
      onClick: () => router.push('/admin/content?filter=pending'),
      variant: 'secondary' as const
    },
    {
      title: 'Send Announcement',
      description: 'Broadcast message to all users',
      icon: Megaphone,
      onClick: () => router.push('/admin/support?action=announcement'),
      variant: 'secondary' as const
    },
    {
      title: 'System Settings',
      description: 'Configure platform settings',
      icon: Settings,
      onClick: () => router.push('/admin/settings'),
      variant: 'secondary' as const
    },
    {
      title: 'Export Reports',
      description: 'Download analytics data',
      icon: Download,
      onClick: () => router.push('/admin/analytics?action=export'),
      variant: 'secondary' as const
    },
    {
      title: 'View Audit Log',
      description: 'Check admin activity history',
      icon: FileText,
      onClick: () => router.push('/admin/settings?tab=audit'),
      variant: 'secondary' as const
    },
    {
      title: 'Security Alerts',
      description: 'Review security incidents',
      icon: ShieldAlert,
      onClick: () => router.push('/admin/settings?tab=security'),
      variant: 'secondary' as const
    },
    {
      title: 'Clear Cache',
      description: 'Reset system cache',
      icon: RefreshCw,
      onClick: () => {
        if (confirm('Are you sure you want to clear the system cache?')) {
          // Implement cache clearing
          console.log('Clearing cache...');
        }
      },
      variant: 'destructive' as const
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>
          Common administrative tasks and shortcuts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((action) => (
            <Button
              key={action.title}
              variant={action.variant}
              className="h-auto flex-col items-start justify-start p-4 space-y-2"
              onClick={action.onClick}
            >
              <div className="flex items-center gap-2 w-full">
                <action.icon className="h-4 w-4" />
                <span className="font-medium">{action.title}</span>
              </div>
              <span className="text-xs font-normal opacity-90 text-left">
                {action.description}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}