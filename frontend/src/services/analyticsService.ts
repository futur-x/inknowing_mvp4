/**
 * Analytics Service
 * Handles all analytics-related API calls
 */

import { apiClient } from '@/lib/api-client';
import type {
  OverviewMetrics,
  UserAnalytics,
  ContentAnalytics,
  RevenueAnalytics,
  AIPerformanceAnalytics,
  CustomReportRequest,
  ExportRequest,
  TimeRange,
  TimePeriod,
} from '@/types/analytics';

class AnalyticsService {
  private baseURL = '/admin/analytics';

  /**
   * Get business overview metrics
   */
  async getOverviewMetrics(timePeriod: TimePeriod = 'day'): Promise<OverviewMetrics> {
    const response = await apiClient.get(`${this.baseURL}/overview`, {
      params: { time_period: timePeriod }
    });
    return response.data;
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(timeRange: TimeRange): Promise<UserAnalytics> {
    const response = await apiClient.get(`${this.baseURL}/users`, {
      params: timeRange
    });
    return response.data;
  }

  /**
   * Get content analytics
   */
  async getContentAnalytics(timeRange: TimeRange): Promise<ContentAnalytics> {
    const response = await apiClient.get(`${this.baseURL}/content`, {
      params: timeRange
    });
    return response.data;
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(timeRange: TimeRange): Promise<RevenueAnalytics> {
    const response = await apiClient.get(`${this.baseURL}/revenue`, {
      params: timeRange
    });
    return response.data;
  }

  /**
   * Get AI performance analytics
   */
  async getAIPerformanceAnalytics(timeRange: TimeRange): Promise<AIPerformanceAnalytics> {
    const response = await apiClient.get(`${this.baseURL}/ai-performance`, {
      params: timeRange
    });
    return response.data;
  }

  /**
   * Generate custom report
   */
  async generateCustomReport(request: CustomReportRequest): Promise<any> {
    const response = await apiClient.post(`${this.baseURL}/custom-report`, request);
    return response.data;
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(request: ExportRequest): Promise<any> {
    const response = await apiClient.post(`${this.baseURL}/export`, request);
    return response.data;
  }

  /**
   * Helper method to get default time range
   */
  getDefaultTimeRange(period: 'week' | 'month' | 'year' = 'month'): TimeRange {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return {
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      granularity: period === 'week' ? 'day' : period === 'month' ? 'week' : 'month'
    };
  }

  /**
   * Format number for display
   */
  formatNumber(num: number, decimals: number = 0): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(decimals) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(decimals) + 'K';
    }
    return num.toFixed(decimals);
  }

  /**
   * Format percentage
   */
  formatPercentage(num: number, decimals: number = 1): string {
    return num.toFixed(decimals) + '%';
  }

  /**
   * Format currency
   */
  formatCurrency(num: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  }
}

export const analyticsService = new AnalyticsService();