import { apiClient } from './api';

// Admin Statistics
export interface PlatformStats {
  users: {
    total: number;
    active: number;
    new: number;
    growth: number;
  };
  books: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  dialogues: {
    total: number;
    active: number;
    today: number;
    avgDuration: number;
  };
  revenue: {
    mrr: number;
    totalRevenue: number;
    paidUsers: number;
    conversionRate: number;
  };
  system: {
    status: 'operational' | 'degraded' | 'down';
    apiLatency: number;
    wsConnections: number;
    dbStatus: string;
  };
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  status: 'active' | 'suspended' | 'banned';
  membership: string;
  createdAt: string;
  lastActive: string;
  dialogueCount: number;
  uploadCount: number;
}

export interface AdminBook {
  id: string;
  title: string;
  author: string;
  uploaderId: string;
  uploaderName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  dialogueCount: number;
  rating: number;
  flagCount: number;
}

export interface AdminDialogue {
  id: string;
  userId: string;
  userName: string;
  bookId: string;
  bookTitle: string;
  type: 'book' | 'character';
  startTime: string;
  endTime?: string;
  messageCount: number;
  tokensUsed: number;
}

export interface AdminAnalytics {
  userGrowth: Array<{ date: string; users: number }>;
  revenueGrowth: Array<{ date: string; revenue: number }>;
  usagePattern: Array<{ hour: number; dialogues: number }>;
  topBooks: Array<{ bookId: string; title: string; dialogues: number }>;
  userRetention: Array<{ cohort: string; retention: number }>;
  aiCosts: Array<{ date: string; cost: number; tokens: number }>;
}

export interface AdminConfig {
  features: Record<string, boolean>;
  quotas: {
    free: { dialoguesPerDay: number };
    basic: { dialoguesPerMonth: number };
    premium: { dialoguesPerMonth: number };
    super: { dialoguesPerMonth: number };
  };
  pricing: {
    basic: number;
    premium: number;
    super: number;
  };
  aiModels: {
    default: string;
    available: string[];
  };
}

export interface AdminAction {
  type: 'suspend_user' | 'ban_user' | 'reset_password' | 'approve_book' |
        'reject_book' | 'delete_content' | 'grant_membership' | 'revoke_membership';
  targetId: string;
  reason?: string;
  duration?: number;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
}

class AdminAPI {
  // Statistics
  async getStats(): Promise<PlatformStats> {
    const response = await apiClient.get('/admin/stats');
    return response;
  }

  async getRealtimeStats(): Promise<PlatformStats> {
    const response = await apiClient.get('/admin/stats/realtime');
    return response;
  }

  // User Management
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    membership?: string;
    registeredFrom?: string;
    registeredTo?: string;
  }): Promise<{
    users: AdminUser[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await apiClient.get('/admin/users', { params });
    return response;
  }

  async getUserDetails(userId: string): Promise<AdminUser & {
    loginHistory: Array<{ ip: string; time: string; device: string }>;
    actions: Array<{ action: string; time: string; details: string }>;
  }> {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response;
  }

  async performUserAction(userId: string, action: AdminAction): Promise<void> {
    await apiClient.post(`/admin/users/${userId}/actions`, action);
  }

  async updateUser(userId: string, updates: {
    status?: string;
    membership?: string;
    quotaOverride?: number;
  }): Promise<AdminUser> {
    const response = await apiClient.patch(`/admin/users/${userId}`, updates);
    return response;
  }

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/admin/users/${userId}`);
  }

  async changeUserStatus(userId: string, status: string, reason?: string, duration?: number): Promise<AdminUser> {
    const response = await apiClient.post(`/admin/users/${userId}/status`, { status, reason, duration });
    return response;
  }

  async resetUserPassword(userId: string): Promise<{ message: string; temporaryPassword?: string }> {
    const response = await apiClient.post(`/admin/users/${userId}/reset-password`);
    return response;
  }

  async getUserActivities(userId: string, activityType?: string, limit?: number): Promise<{
    activities: Array<{
      type: string;
      timestamp: string;
      details: any;
    }>;
    total: number;
  }> {
    const response = await apiClient.get(`/admin/users/${userId}/activities`, {
      params: { activity_type: activityType, limit }
    });
    return response;
  }

  async batchUserOperation(userIds: string[], operation: string, params?: any): Promise<{
    successful: string[];
    failed: Array<{ user_id: string; error: string }>;
    total: number;
    success_count: number;
    failure_count: number;
  }> {
    const response = await apiClient.post('/admin/users/batch', {
      user_ids: userIds,
      operation,
      params
    });
    return response;
  }

  async exportUsers(format: 'csv' | 'excel', filters?: any): Promise<{ file_url: string }> {
    const response = await apiClient.get('/admin/users/export', {
      params: { format, filters: JSON.stringify(filters) }
    });
    return response;
  }

  async getUserPoints(userId: string): Promise<{
    user_id: string;
    balance: number;
    total_earned: number;
    total_spent: number;
    last_transaction?: any;
  }> {
    const response = await apiClient.get(`/admin/users/${userId}/points`);
    return response;
  }

  async adjustUserPoints(userId: string, amount: number, operation: 'add' | 'set' | 'subtract', reason: string): Promise<{
    user_id: string;
    old_balance: number;
    new_balance: number;
    adjustment: number;
    reason: string;
  }> {
    const response = await apiClient.post(`/admin/users/${userId}/points`, { amount, operation, reason });
    return response;
  }

  // Content Management
  async getBooks(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    type?: string;
    category?: string;
    language?: string;
    ai_known?: boolean;
    vector_status?: string;
    sort_by?: string;
    sort_order?: string;
  }): Promise<{
    books: AdminBook[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  }> {
    const response = await apiClient.get('/admin/books', { params });
    return response;
  }

  async getBookDetails(bookId: string): Promise<AdminBook & {
    content: string;
    characters: Array<{ id: string; name: string }>;
    reports: Array<{ userId: string; reason: string; time: string }>;
  }> {
    const response = await apiClient.get(`/admin/books/${bookId}`);
    return response;
  }

  async approveBook(bookId: string, vectorize: boolean = true): Promise<any> {
    const response = await apiClient.post(`/admin/books/${bookId}/approve`, null, {
      params: { vectorize }
    });
    return response;
  }

  async rejectBook(bookId: string, reason: string): Promise<any> {
    const response = await apiClient.post(`/admin/books/${bookId}/reject`, null, {
      params: { reason }
    });
    return response;
  }

  async deleteBook(bookId: string): Promise<void> {
    await apiClient.delete(`/admin/books/${bookId}`);
  }

  async createBook(bookData: any): Promise<any> {
    const response = await apiClient.post('/admin/books', bookData);
    return response;
  }

  async updateBook(bookId: string, bookData: any): Promise<any> {
    const response = await apiClient.put(`/admin/books/${bookId}`, bookData);
    return response;
  }

  async vectorizeBook(bookId: string): Promise<any> {
    const response = await apiClient.post(`/admin/books/${bookId}/vectorize`);
    return response;
  }

  async batchBookOperation(bookIds: string[], action: string, params?: any): Promise<any> {
    const response = await apiClient.post('/admin/books/batch', {
      book_ids: bookIds,
      action,
      params
    });
    return response;
  }

  async getBookStats(): Promise<any> {
    const response = await apiClient.get('/admin/books/stats');
    return response;
  }

  // Dialogue Monitoring
  async getDialogues(params?: {
    page?: number;
    limit?: number;
    userId?: string;
    bookId?: string;
    active?: boolean;
  }): Promise<{
    dialogues: AdminDialogue[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await apiClient.get('/admin/dialogues', { params });
    return response;
  }

  async getDialogueMessages(dialogueId: string): Promise<Array<{
    role: string;
    content: string;
    timestamp: string;
    tokens?: number;
  }>> {
    const response = await apiClient.get(`/admin/dialogues/${dialogueId}/messages`);
    return response;
  }

  // Analytics
  async getAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    metrics?: string[];
  }): Promise<AdminAnalytics> {
    const response = await apiClient.get('/admin/analytics', { params });
    return response;
  }

  async exportAnalytics(params: {
    startDate: string;
    endDate: string;
    format: 'csv' | 'json' | 'excel';
  }): Promise<Blob> {
    const response = await apiClient.get('/admin/analytics/export', {
      params,
      responseType: 'blob'
    });
    return response;
  }

  // System Configuration
  async getConfig(): Promise<AdminConfig> {
    const response = await apiClient.get('/admin/config');
    return response;
  }

  async updateConfig(config: Partial<AdminConfig>): Promise<void> {
    await apiClient.put('/admin/config', config);
  }

  async toggleFeature(feature: string, enabled: boolean): Promise<void> {
    await apiClient.post('/admin/config/features', { feature, enabled });
  }

  async updateQuotas(quotas: AdminConfig['quotas']): Promise<void> {
    await apiClient.put('/admin/config/quotas', quotas);
  }

  async updatePricing(pricing: AdminConfig['pricing']): Promise<void> {
    await apiClient.put('/admin/config/pricing', pricing);
  }

  // Support
  async getTickets(params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    assignedTo?: string;
  }): Promise<{
    tickets: SupportTicket[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await apiClient.get('/admin/support/tickets', { params });
    return response;
  }

  async getTicketDetails(ticketId: string): Promise<SupportTicket & {
    messages: Array<{
      author: string;
      message: string;
      timestamp: string;
    }>;
  }> {
    const response = await apiClient.get(`/admin/support/tickets/${ticketId}`);
    return response;
  }

  async updateTicket(ticketId: string, update: Partial<SupportTicket>): Promise<void> {
    await apiClient.put(`/admin/support/tickets/${ticketId}`, update);
  }

  async replyToTicket(ticketId: string, message: string): Promise<void> {
    await apiClient.post(`/admin/support/tickets/${ticketId}/reply`, { message });
  }

  // Announcements
  async createAnnouncement(announcement: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success';
    targetUsers?: 'all' | 'free' | 'paid';
  }): Promise<void> {
    await apiClient.post('/admin/announcements', announcement);
  }

  // Audit Log
  async getAuditLog(params?: {
    page?: number;
    limit?: number;
    adminId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    logs: Array<{
      id: string;
      adminId: string;
      adminName: string;
      action: string;
      targetType: string;
      targetId: string;
      details: string;
      timestamp: string;
      ip: string;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await apiClient.get('/admin/audit-log', { params });
    return response;
  }

  // WebSocket for real-time monitoring
  connectMonitoring(onUpdate: (data: any) => void): WebSocket {
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8888'}/admin/monitor`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onUpdate(data);
    };

    ws.onerror = (error) => {
      console.error('Admin WebSocket error:', error);
    };

    return ws;
  }
}

export const adminApi = new AdminAPI();