"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface Announcement {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  content: string;
  created_at: string;
}

interface AnnouncementBoardProps {
  announcements: Announcement[];
  className?: string;
}

const AnnouncementBoard: React.FC<AnnouncementBoardProps> = ({ announcements, className = "" }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = (type: string): "default" | "destructive" => {
    switch (type) {
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>系统公告</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无公告</p>
        ) : (
          announcements.map((announcement) => (
            <Alert key={announcement.id} variant={getVariant(announcement.type)}>
              {getIcon(announcement.type)}
              <AlertTitle>{announcement.title}</AlertTitle>
              <AlertDescription>
                <div>{announcement.content}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  {new Date(announcement.created_at).toLocaleString('zh-CN')}
                </div>
              </AlertDescription>
            </Alert>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default AnnouncementBoard;