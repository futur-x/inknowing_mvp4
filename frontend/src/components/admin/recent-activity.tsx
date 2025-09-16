'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  UserPlus,
  BookOpen,
  MessageSquare,
  CreditCard,
  Upload,
  Flag,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'user_registration' | 'book_upload' | 'dialogue_start' | 'payment' | 'report' | 'admin_action';
  title: string;
  description: string;
  user: string;
  timestamp: string;
  metadata?: any;
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    // Simulate fetching activities
    const mockActivities: Activity[] = [
      {
        id: '1',
        type: 'user_registration',
        title: 'New user registered',
        description: 'john_doe joined the platform',
        user: 'john_doe',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      },
      {
        id: '2',
        type: 'book_upload',
        title: 'New book uploaded',
        description: 'The Great Adventure was uploaded',
        user: 'alice_writer',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        metadata: { bookId: 'book123', status: 'pending' }
      },
      {
        id: '3',
        type: 'payment',
        title: 'Premium subscription',
        description: 'User upgraded to Premium plan',
        user: 'bob_reader',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        metadata: { plan: 'premium', amount: 299 }
      },
      {
        id: '4',
        type: 'dialogue_start',
        title: 'New dialogue started',
        description: 'Dialogue with "Harry Potter"',
        user: 'emma_user',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
      {
        id: '5',
        type: 'report',
        title: 'Content reported',
        description: 'Inappropriate content flagged',
        user: 'moderator_01',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        metadata: { severity: 'high' }
      },
      {
        id: '6',
        type: 'admin_action',
        title: 'Book approved',
        description: 'Admin approved "Science 101"',
        user: 'admin_jane',
        timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      }
    ];

    setActivities(mockActivities);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <UserPlus className="h-4 w-4" />;
      case 'book_upload':
        return <Upload className="h-4 w-4" />;
      case 'dialogue_start':
        return <MessageSquare className="h-4 w-4" />;
      case 'payment':
        return <CreditCard className="h-4 w-4" />;
      case 'report':
        return <Flag className="h-4 w-4" />;
      case 'admin_action':
        return <ShieldAlert className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user_registration':
        return 'bg-blue-100 text-blue-600';
      case 'book_upload':
        return 'bg-green-100 text-green-600';
      case 'dialogue_start':
        return 'bg-purple-100 text-purple-600';
      case 'payment':
        return 'bg-orange-100 text-orange-600';
      case 'report':
        return 'bg-red-100 text-red-600';
      case 'admin_action':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter(a => a.type === filter);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Monitor all platform activities in real-time
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'report' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('report')}
            >
              Reports
            </Button>
            <Button
              variant={filter === 'payment' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('payment')}
            >
              Payments
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className={cn(
                  'mt-1 rounded-lg p-2',
                  getActivityColor(activity.type)
                )}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{activity.title}</p>
                    {activity.metadata?.severity && (
                      <Badge variant="destructive" className="text-xs">
                        {activity.metadata.severity}
                      </Badge>
                    )}
                    {activity.metadata?.status === 'pending' && (
                      <Badge variant="secondary" className="text-xs">
                        Pending Review
                      </Badge>
                    )}
                    {activity.metadata?.plan && (
                      <Badge className="text-xs">
                        {activity.metadata.plan}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>by {activity.user}</span>
                    <span>
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}