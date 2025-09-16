'use client';

import React from 'react';
import {
  CheckCircle2,
  Circle,
  XCircle,
  Loader2,
  Clock,
  Zap,
  Brain,
  FileSearch,
  BookOpen,
  Users,
  Database,
  Cpu,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, ProcessingStep, ProcessingStepInfo } from '@/types/upload';
import { calculateOverallProgress, getProcessingStepLabel, formatRemainingTime } from '@/lib/upload-utils';

interface ProcessingStatusProps {
  upload: Upload;
  className?: string;
}

const StepIcons: Record<ProcessingStep, React.ReactNode> = {
  ai_detection: <Brain className="h-5 w-5" />,
  text_preprocessing: <FileSearch className="h-5 w-5" />,
  chapter_extraction: <BookOpen className="h-5 w-5" />,
  character_extraction: <Users className="h-5 w-5" />,
  vectorization: <Database className="h-5 w-5" />,
  indexing: <Zap className="h-5 w-5" />,
  model_generation: <Cpu className="h-5 w-5" />,
};

export function ProcessingStatus({ upload, className }: ProcessingStatusProps) {
  const overallProgress = calculateOverallProgress(upload.processingSteps);
  const currentStep = upload.processingSteps.find((step) => step.status === 'processing');
  const failedStep = upload.processingSteps.find((step) => step.status === 'failed');

  const getStepIcon = (step: ProcessingStepInfo) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'processing':
        return 'text-blue-600 bg-blue-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const estimatedTime = upload.processingSteps.reduce((total, step) => {
    if (step.status === 'pending') return total + 10; // Estimate 10 seconds per pending step
    return total;
  }, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Processing Your Book</CardTitle>
            <CardDescription className="mt-1">
              {upload.title} by {upload.author}
            </CardDescription>
          </div>
          <Badge variant={upload.status === 'failed' ? 'destructive' : 'default'}>
            {upload.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-gray-600">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          {currentStep && estimatedTime > 0 && (
            <p className="text-xs text-gray-500">
              Estimated time remaining: {formatRemainingTime(estimatedTime)}
            </p>
          )}
        </div>

        {/* Processing Steps */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Processing Steps</p>
          <div className="space-y-2">
            {upload.processingSteps.map((step, index) => (
              <div
                key={step.step}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                  step.status === 'processing' ? 'bg-blue-50 border border-blue-200' : ''
                }`}
              >
                <div className="flex-shrink-0">{getStepIcon(step)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">
                      {getProcessingStepLabel(step.step)}
                    </span>
                    <div className="text-gray-400">{StepIcons[step.step]}</div>
                  </div>

                  {step.message && (
                    <p className="text-xs text-gray-600 mt-1">{step.message}</p>
                  )}

                  {step.status === 'processing' && (
                    <div className="mt-2">
                      <Progress value={step.progress} className="h-1" />
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {step.status === 'completed' && step.completedAt && (
                    <span className="text-xs text-gray-500">
                      {new Date(step.completedAt).toLocaleTimeString()}
                    </span>
                  )}
                  {step.status === 'processing' && (
                    <span className="text-xs text-blue-600 font-medium">
                      {step.progress}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Detection Result */}
        {upload.aiKnown !== undefined && (
          <Alert className={upload.aiKnown ? 'border-yellow-200 bg-yellow-50' : ''}>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              {upload.aiKnown
                ? 'AI has knowledge of this book. Processing will be faster.'
                : 'This is a new book for the AI. Full processing required.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {upload.errorMessage && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{upload.errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Success Info */}
        {upload.status === 'completed' && (
          <div className="space-y-3 pt-2 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Vector Count</p>
                <p className="font-medium">{upload.vectorCount || 0}</p>
              </div>
              <div>
                <p className="text-gray-600">Points Earned</p>
                <p className="font-medium text-green-600">+{upload.pointsEarned || 0}</p>
              </div>
              <div>
                <p className="text-gray-600">Characters Found</p>
                <p className="font-medium">{upload.extractedCharacters?.length || 0}</p>
              </div>
              <div>
                <p className="text-gray-600">Book ID</p>
                <p className="font-mono text-xs">{upload.bookId || 'Pending'}</p>
              </div>
            </div>

            {upload.completedAt && (
              <p className="text-xs text-gray-500 text-center">
                Completed at {new Date(upload.completedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Processing Stats */}
        {currentStep && (
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>
              Processing started {new Date(upload.createdAt).toLocaleTimeString()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}