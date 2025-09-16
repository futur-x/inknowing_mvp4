'use client';

import React from 'react';
import {
  FileText,
  X,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  UploadCloud,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UploadFile } from '@/types/upload';
import {
  formatFileSize,
  formatUploadSpeed,
  formatRemainingTime,
  getFileIcon,
} from '@/lib/upload-utils';

interface UploadQueueProps {
  queue: UploadFile[];
  onRemove: (fileId: string) => void;
  onPause: (fileId: string) => void;
  onResume: (fileId: string) => void;
  onStartUpload: () => void;
  onClearCompleted: () => void;
  activeUploads: number;
  maxConcurrent?: number;
}

export function UploadQueue({
  queue,
  onRemove,
  onPause,
  onResume,
  onStartUpload,
  onClearCompleted,
  activeUploads,
  maxConcurrent = 3,
}: UploadQueueProps) {
  const pendingCount = queue.filter((item) => item.status === 'pending').length;
  const completedCount = queue.filter((item) => item.status === 'completed').length;
  const failedCount = queue.filter((item) => item.status === 'failed').length;

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'uploading':
        return 'blue';
      case 'processing':
        return 'purple';
      case 'completed':
        return 'green';
      case 'failed':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const canStartUpload = pendingCount > 0 && activeUploads < maxConcurrent;

  if (queue.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <UploadCloud className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 text-center">
            No files in the upload queue
            <br />
            <span className="text-sm text-gray-500">
              Add files to start uploading
            </span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Upload Queue</CardTitle>
            <CardDescription>
              {queue.length} file{queue.length !== 1 ? 's' : ''} •
              {activeUploads} active •
              {pendingCount} pending
            </CardDescription>
          </div>

          <div className="flex gap-2">
            {canStartUpload && (
              <Button size="sm" onClick={onStartUpload}>
                <Play className="h-4 w-4 mr-1" />
                Start Upload
              </Button>
            )}
            {completedCount > 0 && (
              <Button size="sm" variant="outline" onClick={onClearCompleted}>
                Clear Completed
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* File Icon */}
                <div className="flex-shrink-0">
                  <div className="p-2 bg-gray-100 rounded">
                    {item.fileType && (
                      <span className="text-2xl">{getFileIcon(item.fileType)}</span>
                    )}
                  </div>
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-sm truncate">{item.filename}</p>
                    {getStatusIcon(item.status)}
                  </div>

                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant={getStatusColor(item.status) as any} className="text-xs">
                      {item.status}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(item.fileSize)}
                    </span>
                    {item.uploadSpeed && item.status === 'uploading' && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {formatUploadSpeed(item.uploadSpeed)}
                        </span>
                      </>
                    )}
                    {item.remainingTime && item.status === 'uploading' && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {formatRemainingTime(item.remainingTime)} left
                        </span>
                      </>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {(item.status === 'uploading' || item.status === 'processing') && (
                    <div className="mt-2">
                      <Progress value={item.progress} className="h-1" />
                    </div>
                  )}

                  {/* Error Message */}
                  {item.error && (
                    <p className="text-xs text-red-600 mt-1">{item.error}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center space-x-1">
                  {item.status === 'uploading' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onPause(item.id)}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Pause Upload</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {item.status === 'pending' && activeUploads < maxConcurrent && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onResume(item.id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Start Upload</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {(item.status === 'pending' || item.status === 'failed' || item.status === 'completed') && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onRemove(item.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove from Queue</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Queue Stats */}
        {queue.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t mt-4">
            <div className="flex space-x-4 text-xs">
              {pendingCount > 0 && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">{pendingCount} pending</span>
                </div>
              )}
              {completedCount > 0 && (
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span className="text-gray-600">{completedCount} completed</span>
                </div>
              )}
              {failedCount > 0 && (
                <div className="flex items-center space-x-1">
                  <AlertCircle className="h-3 w-3 text-red-500" />
                  <span className="text-gray-600">{failedCount} failed</span>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500">
              Max concurrent: {maxConcurrent}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}