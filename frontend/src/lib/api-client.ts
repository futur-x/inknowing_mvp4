/**
 * API Client Configuration
 * Handles all API requests with proper error handling and interceptors
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8888/v1';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: any
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

/**
 * Get authentication token
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth-token');
}

/**
 * Set authentication token
 */
export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth-token', token);
}

/**
 * Clear authentication token
 */
export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth-token');
}

/**
 * Base fetch wrapper with error handling
 */
async function fetchWrapper(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(response.status, response.statusText, errorData);
  }

  return response;
}

/**
 * API client with HTTP methods
 */
export const apiClient = {
  /**
   * GET request
   */
  async get<T = any>(url: string, options?: RequestInit): Promise<{ data: T }> {
    const response = await fetchWrapper(url, {
      ...options,
      method: 'GET',
    });
    const data = await response.json();
    return { data };
  },

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    body?: any,
    options?: RequestInit
  ): Promise<{ data: T }> {
    const response = await fetchWrapper(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    return { data };
  },

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    body?: any,
    options?: RequestInit
  ): Promise<{ data: T }> {
    const response = await fetchWrapper(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    return { data };
  },

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    body?: any,
    options?: RequestInit
  ): Promise<{ data: T }> {
    const response = await fetchWrapper(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    return { data };
  },

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, options?: RequestInit): Promise<{ data: T }> {
    const response = await fetchWrapper(url, {
      ...options,
      method: 'DELETE',
    });
    const data = await response.json();
    return { data };
  },

  /**
   * Upload file
   */
  async upload<T = any>(
    url: string,
    formData: FormData,
    options?: RequestInit
  ): Promise<{ data: T }> {
    const token = getAuthToken();
    const headers: HeadersInit = {
      ...options?.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, response.statusText, errorData);
    }

    const data = await response.json();
    return { data };
  },
};

/**
 * Mock API client for development
 */
export const mockApiClient = {
  async get(url: string): Promise<{ data: any }> {
    // Return mock data based on URL
    if (url.includes('/search')) {
      return {
        data: {
          results: [],
          total: 0,
          suggestions: ['如何学习编程', '人工智能基础', '时间管理'],
        },
      };
    }

    if (url.includes('/books')) {
      return {
        data: {
          books: [],
          total: 0,
          page: 1,
          pageSize: 20,
          hasMore: false,
        },
      };
    }

    return { data: null };
  },

  async post(url: string, body?: any): Promise<{ data: any }> {
    return { data: { success: true } };
  },

  async put(url: string, body?: any): Promise<{ data: any }> {
    return { data: { success: true } };
  },

  async patch(url: string, body?: any): Promise<{ data: any }> {
    return { data: { success: true } };
  },

  async delete(url: string): Promise<{ data: any }> {
    return { data: { success: true } };
  },

  async upload(url: string, formData: FormData): Promise<{ data: any }> {
    return { data: { success: true, uploadId: 'mock-upload-id' } };
  },
};

// Use mock client if API is not available
export default process.env.NODE_ENV === 'development' ? mockApiClient : apiClient;