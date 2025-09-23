"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityHeatmapProps {
  data: Record<string, number[]>;
  className?: string;
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data, className = "" }) => {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Get max value for scaling
  const maxValue = Math.max(
    ...Object.values(data).flatMap(dayData => dayData)
  );

  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-100';
    const intensity = value / maxValue;
    if (intensity < 0.2) return 'bg-blue-200';
    if (intensity < 0.4) return 'bg-blue-300';
    if (intensity < 0.6) return 'bg-blue-400';
    if (intensity < 0.8) return 'bg-blue-500';
    return 'bg-blue-600';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>用户活跃度热力图</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="flex items-center mb-2">
              <div className="w-16"></div>
              {hours.map(hour => (
                <div key={hour} className="flex-1 text-center text-xs text-gray-500">
                  {hour}
                </div>
              ))}
            </div>
            {days.map(day => (
              <div key={day} className="flex items-center mb-1">
                <div className="w-16 text-sm text-gray-600">{day}</div>
                {hours.map(hour => {
                  const dayData = data[day.replace('周', '')] || data[day] || [];
                  const value = dayData[hour] || 0;
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={`flex-1 h-6 mx-0.5 rounded ${getColor(value)}`}
                      title={`${day} ${hour}:00 - ${value} 活动`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center mt-4 space-x-2">
            <span className="text-xs text-gray-500">低</span>
            <div className="flex space-x-1">
              <div className="w-4 h-4 bg-gray-100 rounded"></div>
              <div className="w-4 h-4 bg-blue-200 rounded"></div>
              <div className="w-4 h-4 bg-blue-300 rounded"></div>
              <div className="w-4 h-4 bg-blue-400 rounded"></div>
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
            </div>
            <span className="text-xs text-gray-500">高</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityHeatmap;