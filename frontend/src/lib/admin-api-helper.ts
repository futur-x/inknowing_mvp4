/**
 * Admin API Helper
 * Provides utility functions for admin API requests
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8888/api';

interface RequestOptions extends RequestInit {
  token?: string;
}

/**
 * Make authenticated API request
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  // Get token from localStorage or props
  const authToken = token || localStorage.getItem('admin_token') || '';

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authToken ? `Bearer ${authToken}` : '',
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `Request failed with status ${response.status}`,
    }));
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}

/**
 * Admin Dashboard API endpoints
 */
export const adminDashboardAPI = {
  // Get dashboard stats
  getStats: () => apiRequest('/v1/admin/stats'),

  // Get trends data
  getTrends: (period = 7) =>
    apiRequest(`/v1/admin/trends?period=${period}`),

  // Get recent activities
  getRecentActivities: (limit = 10) =>
    apiRequest(`/v1/admin/recent-activities?limit=${limit}`),

  // Get enhanced dashboard data
  getDashboard: () => apiRequest('/v1/admin/dashboard'),

  // Get dialogue statistics
  getDialogueStats: (period = 'month', groupBy = 'book') =>
    apiRequest(`/v1/admin/statistics/dialogues?period=${period}&group_by=${groupBy}`),

  // Get cost statistics
  getCostStats: (period = 'month', groupBy = 'model') =>
    apiRequest(`/v1/admin/statistics/costs?period=${period}&group_by=${groupBy}`),

  // Get system alerts
  getAlerts: (severity?: string, status = 'active', limit = 50) => {
    const params = new URLSearchParams({
      status,
      limit: limit.toString()
    });
    if (severity) params.append('severity', severity);
    return apiRequest(`/v1/admin/monitoring/alerts?${params}`);
  },

  // Get system health
  getSystemHealth: () => apiRequest('/v1/admin/monitoring/health'),
};

/**
 * Format number with locale
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

/**
 * Format date
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate percentage change
 */
export function calculateChange(current: number, previous: number): {
  value: number;
  isPositive: boolean;
} {
  if (previous === 0) return { value: 0, isPositive: true };

  const change = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(Math.round(change)),
    isPositive: change >= 0,
  };
}