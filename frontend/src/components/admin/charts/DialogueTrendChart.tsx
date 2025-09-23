"use client";

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DialogueTrendChartProps {
  data: Array<{
    date: string;
    count: number;
  }>;
  className?: string;
}

const DialogueTrendChart: React.FC<DialogueTrendChartProps> = ({ data, className = "" }) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>对话数趋势</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('zh-CN');
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#82ca9d"
              fill="#82ca9d"
              fillOpacity={0.6}
              name="对话数"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DialogueTrendChart;