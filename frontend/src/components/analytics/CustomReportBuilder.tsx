'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { analyticsService } from '@/services/analyticsService';
import type { TimeRange, CustomReportRequest } from '@/types/analytics';
import { Download, FileSpreadsheet, FileJson, FileText } from 'lucide-react';

interface CustomReportBuilderProps {
  timeRange: TimeRange;
}

export default function CustomReportBuilder({ timeRange }: CustomReportBuilderProps) {
  const [reportType, setReportType] = useState('user_activity');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'json'>('excel');
  const [loading, setLoading] = useState(false);

  const availableMetrics = {
    user_activity: ['total_users', 'active_users', 'new_users', 'dialogue_count'],
    revenue: ['total_revenue', 'arpu', 'arppu', 'conversion_rate'],
    content: ['total_books', 'popular_books', 'avg_rating', 'dialogue_topics'],
    performance: ['response_time', 'success_rate', 'token_usage', 'cost']
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const request: CustomReportRequest = {
        report_type: reportType,
        metrics: selectedMetrics,
        filters: {},
        time_range: timeRange
      };

      const result = await analyticsService.generateCustomReport(request);
      console.log('Report generated:', result);

      // Handle export
      if (exportFormat) {
        const exportData = await analyticsService.exportAnalytics({
          report_type: reportType,
          format: exportFormat,
          time_range: timeRange,
          include_raw_data: true
        });
        console.log('Export completed:', exportData);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setLoading(false);
    }
  };

  const getExportIcon = () => {
    switch (exportFormat) {
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'json':
        return <FileJson className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom Report Builder</CardTitle>
          <CardDescription>Create tailored reports based on your specific needs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type Selection */}
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user_activity">User Activity</SelectItem>
                <SelectItem value="revenue">Revenue Analysis</SelectItem>
                <SelectItem value="content">Content Performance</SelectItem>
                <SelectItem value="performance">System Performance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Metrics Selection */}
          <div className="space-y-2">
            <Label>Select Metrics</Label>
            <div className="grid grid-cols-2 gap-4">
              {availableMetrics[reportType as keyof typeof availableMetrics]?.map((metric) => (
                <div key={metric} className="flex items-center space-x-2">
                  <Checkbox
                    id={metric}
                    checked={selectedMetrics.includes(metric)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedMetrics([...selectedMetrics, metric]);
                      } else {
                        setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
                      }
                    }}
                  />
                  <Label htmlFor={metric} className="text-sm font-normal capitalize">
                    {metric.replace(/_/g, ' ')}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="json">JSON (.json)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end gap-4">
            <Button
              onClick={handleGenerateReport}
              disabled={loading || selectedMetrics.length === 0}
            >
              {loading ? (
                'Generating...'
              ) : (
                <>
                  {getExportIcon()}
                  <span className="ml-2">Generate & Export Report</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Preview Area */}
      <Card>
        <CardHeader>
          <CardTitle>Report Preview</CardTitle>
          <CardDescription>Generated report will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Select metrics and generate a report to see preview</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}