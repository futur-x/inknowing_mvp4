import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Brain, Heart, Clock } from 'lucide-react';

interface DialogueMetricsProps {
  metrics: {
    avg_response_time: number;
    user_satisfaction?: number;
    ai_confidence: number;
    sentiment_score?: number;
  };
}

export default function DialogueMetrics({ metrics }: DialogueMetricsProps) {
  const getSentimentLabel = (score?: number) => {
    if (!score) return '未知';
    if (score > 0.5) return '积极';
    if (score > 0) return '中性偏积极';
    if (score > -0.5) return '中性偏消极';
    return '消极';
  };

  const getSentimentColor = (score?: number) => {
    if (!score) return 'bg-gray-500';
    if (score > 0.5) return 'bg-green-500';
    if (score > 0) return 'bg-blue-500';
    if (score > -0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">对话指标</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 平均响应时间 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              响应时间
            </span>
            <span className="font-medium">
              {formatResponseTime(metrics.avg_response_time)}
            </span>
          </div>
          <Progress
            value={Math.min((2000 - metrics.avg_response_time) / 20, 100)}
            className="h-2"
          />
        </div>

        {/* AI置信度 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Brain className="h-3 w-3" />
              AI置信度
            </span>
            <span className="font-medium">
              {(metrics.ai_confidence * 100).toFixed(1)}%
            </span>
          </div>
          <Progress
            value={metrics.ai_confidence * 100}
            className="h-2"
          />
        </div>

        {/* 用户满意度 */}
        {metrics.user_satisfaction !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Heart className="h-3 w-3" />
                用户满意度
              </span>
              <span className="font-medium">
                {(metrics.user_satisfaction * 100).toFixed(1)}%
              </span>
            </div>
            <Progress
              value={metrics.user_satisfaction * 100}
              className="h-2"
            />
          </div>
        )}

        {/* 情感倾向 */}
        {metrics.sentiment_score !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                情感倾向
              </span>
              <span className="font-medium">
                {getSentimentLabel(metrics.sentiment_score)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full relative">
                <div
                  className={`absolute w-3 h-3 ${getSentimentColor(metrics.sentiment_score)} rounded-full -top-0.5`}
                  style={{
                    left: `${((metrics.sentiment_score + 1) / 2) * 100}%`,
                    transform: 'translateX(-50%)'
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>消极</span>
              <span>中性</span>
              <span>积极</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}