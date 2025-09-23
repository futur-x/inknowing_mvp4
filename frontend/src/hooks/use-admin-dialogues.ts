import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

// API基础配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface DialogueListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status_filter?: string;
  date_filter?: string;
  flagged_only?: boolean;
  user_id?: string;
  book_id?: string;
}

interface DialogueListResponse {
  items: any[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface DialogueStats {
  total_sessions: number;
  active_sessions: number;
  period_sessions: number;
  avg_response_time: number;
  total_messages: number;
  user_satisfaction: number;
  date_range: string;
}

// 获取管理员token
const getAdminToken = () => {
  // TODO: 从存储中获取实际的管理员token
  return localStorage.getItem('adminToken') || '';
};

// 通用请求方法
async function adminFetch(endpoint: string, options: RequestInit = {}) {
  const token = getAdminToken();

  const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Hook: 获取对话列表
export function useAdminDialogueList(params: DialogueListParams = {}) {
  const [data, setData] = useState<DialogueListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDialogues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.per_page) queryParams.append('per_page', params.per_page.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.status_filter) queryParams.append('status_filter', params.status_filter);
      if (params.date_filter) queryParams.append('date_filter', params.date_filter);
      if (params.flagged_only) queryParams.append('flagged_only', 'true');
      if (params.user_id) queryParams.append('user_id', params.user_id);
      if (params.book_id) queryParams.append('book_id', params.book_id);

      const response = await adminFetch(`/admin/dialogues?${queryParams}`);
      setData(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch dialogues';
      setError(message);
      toast({
        title: '加载失败',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [params, toast]);

  useEffect(() => {
    fetchDialogues();
  }, [fetchDialogues]);

  return { data, loading, error, refetch: fetchDialogues };
}

// Hook: 获取对话详情
export function useAdminDialogueDetail(dialogueId: string | null) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDetail = useCallback(async () => {
    if (!dialogueId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await adminFetch(`/admin/dialogues/${dialogueId}`);
      setData(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch dialogue detail';
      setError(message);
      toast({
        title: '加载失败',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [dialogueId, toast]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { data, loading, error, refetch: fetchDetail };
}

// Hook: 获取对话统计
export function useAdminDialogueStats(dateRange: string = 'week') {
  const [stats, setStats] = useState<DialogueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminFetch(`/admin/dialogues/stats/overview?date_range=${dateRange}`);
      setStats(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stats';
      setError(message);
      toast({
        title: '加载统计失败',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

// Hook: 管理员操作
export function useAdminDialogueActions() {
  const { toast } = useToast();

  // 删除消息
  const deleteMessage = async (dialogueId: string, messageId: string) => {
    try {
      await adminFetch(`/admin/dialogues/${dialogueId}/messages/${messageId}`, {
        method: 'DELETE',
      });

      toast({
        title: '删除成功',
        description: '消息已删除',
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete message';
      toast({
        title: '删除失败',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // 介入对话
  const interveneDialogue = async (dialogueId: string, message: string) => {
    try {
      await adminFetch(`/admin/dialogues/${dialogueId}/intervene`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });

      toast({
        title: '介入成功',
        description: '系统消息已发送',
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to intervene';
      toast({
        title: '介入失败',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // 结束对话
  const endDialogue = async (dialogueId: string) => {
    try {
      await adminFetch(`/admin/dialogues/${dialogueId}/end`, {
        method: 'POST',
      });

      toast({
        title: '操作成功',
        description: '对话已结束',
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to end dialogue';
      toast({
        title: '操作失败',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // 导出对话
  const exportDialogues = async (params: {
    dialogue_ids?: string[];
    date_from?: string;
    date_to?: string;
    format?: 'json' | 'csv';
  }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/dialogues/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // 获取文件名
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `dialogues_${Date.now()}.${params.format || 'json'}`;

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: '导出成功',
        description: '对话记录已导出',
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export';
      toast({
        title: '导出失败',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    deleteMessage,
    interveneDialogue,
    endDialogue,
    exportDialogues,
  };
}

// Hook: WebSocket实时监控
export function useAdminDialogueRealtime() {
  const [connected, setConnected] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [realtimeMessages, setRealtimeMessages] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      try {
        const wsUrl = API_BASE_URL.replace('http', 'ws');
        const token = getAdminToken();
        ws = new WebSocket(`${wsUrl}/api/v1/admin/dialogues/realtime?token=${token}`);

        ws.onopen = () => {
          setConnected(true);
          toast({
            title: '已连接',
            description: '实时监控已启动',
          });
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            switch (data.type) {
              case 'initial_data':
                setActiveSessions(data.active_sessions || []);
                break;
              case 'new_message':
                setRealtimeMessages(prev => [...prev.slice(-49), data.data]);
                break;
              case 'session_update':
                setActiveSessions(prev => {
                  const index = prev.findIndex(s => s.id === data.session_id);
                  if (index >= 0) {
                    const updated = [...prev];
                    updated[index] = data.data;
                    return updated;
                  }
                  return [...prev, data.data];
                });
                break;
              case 'session_end':
                setActiveSessions(prev => prev.filter(s => s.id !== data.session_id));
                break;
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          toast({
            title: '连接错误',
            description: '实时监控连接出错',
            variant: 'destructive',
          });
        };

        ws.onclose = () => {
          setConnected(false);
          toast({
            title: '连接断开',
            description: '实时监控已断开，尝试重连...',
            variant: 'destructive',
          });

          // 自动重连
          reconnectTimer = setTimeout(() => {
            connect();
          }, 5000);
        };
      } catch (err) {
        console.error('Failed to connect WebSocket:', err);
      }
    };

    connect();

    // 清理函数
    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [toast]);

  return {
    connected,
    activeSessions,
    realtimeMessages,
  };
}