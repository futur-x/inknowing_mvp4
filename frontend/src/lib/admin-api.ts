import { api } from './api';

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
    const response = await api.get('/admin/stats');
    return response.data;
  }

  async getRealtimeStats(): Promise<PlatformStats> {
    const response = await api.get('/admin/stats/realtime');
    return response.data;
  }

  // User Management
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
  }): Promise<{
    users: AdminUser[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await api.get('/admin/users', { params });
    return response.data;
  }

  async getUserDetails(userId: string): Promise<AdminUser & {
    loginHistory: Array<{ ip: string; time: string; device: string }>;
    actions: Array<{ action: string; time: string; details: string }>;
  }> {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  }

  async performUserAction(userId: string, action: AdminAction): Promise<void> {
    await api.post(`/admin/users/${userId}/actions`, action);
  }

  // Content Management
  async getBooks(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sortBy?: string;
  }): Promise<{
    books: AdminBook[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await api.get('/admin/books', { params });
    return response.data;
  }

  async getBookDetails(bookId: string): Promise<AdminBook & {
    content: string;
    characters: Array<{ id: string; name: string }>;
    reports: Array<{ userId: string; reason: string; time: string }>;
  }> {
    const response = await api.get(`/admin/books/${bookId}`);
    return response.data;
  }

  async approveBook(bookId: string): Promise<void> {
    await api.post(`/admin/books/${bookId}/approve`);
  }

  async rejectBook(bookId: string, reason: string): Promise<void> {
    await api.post(`/admin/books/${bookId}/reject`, { reason });
  }

  async deleteBook(bookId: string): Promise<void> {
    await api.delete(`/admin/books/${bookId}`);
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
    const response = await api.get('/admin/dialogues', { params });
    return response.data;
  }

  async getDialogueMessages(dialogueId: string): Promise<Array<{
    role: string;
    content: string;
    timestamp: string;
    tokens?: number;
  }>> {
    const response = await api.get(`/admin/dialogues/${dialogueId}/messages`);
    return response.data;
  }

  // Analytics
  async getAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    metrics?: string[];
  }): Promise<AdminAnalytics> {
    const response = await api.get('/admin/analytics', { params });
    return response.data;
  }

  async exportAnalytics(params: {
    startDate: string;
    endDate: string;
    format: 'csv' | 'json' | 'excel';
  }): Promise<Blob> {
    const response = await api.get('/admin/analytics/export', {
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  // System Configuration
  async getConfig(): Promise<AdminConfig> {
    const response = await api.get('/admin/config');
    return response.data;
  }

  async updateConfig(config: Partial<AdminConfig>): Promise<void> {
    await api.put('/admin/config', config);
  }

  async toggleFeature(feature: string, enabled: boolean): Promise<void> {
    await api.post('/admin/config/features', { feature, enabled });
  }

  async updateQuotas(quotas: AdminConfig['quotas']): Promise<void> {
    await api.put('/admin/config/quotas', quotas);
  }

  async updatePricing(pricing: AdminConfig['pricing']): Promise<void> {
    await api.put('/admin/config/pricing', pricing);
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
    const response = await api.get('/admin/support/tickets', { params });
    return response.data;
  }

  async getTicketDetails(ticketId: string): Promise<SupportTicket & {
    messages: Array<{
      author: string;
      message: string;
      timestamp: string;
    }>;
  }> {
    const response = await api.get(`/admin/support/tickets/${ticketId}`);
    return response.data;
  }

  async updateTicket(ticketId: string, update: Partial<SupportTicket>): Promise<void> {
    await api.put(`/admin/support/tickets/${ticketId}`, update);
  }

  async replyToTicket(ticketId: string, message: string): Promise<void> {
    await api.post(`/admin/support/tickets/${ticketId}/reply`, { message });
  }

  // Announcements
  async createAnnouncement(announcement: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success';
    targetUsers?: 'all' | 'free' | 'paid';
  }): Promise<void> {
    await api.post('/admin/announcements', announcement);
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
    const response = await api.get('/admin/audit-log', { params });
    return response.data;
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