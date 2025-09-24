// API Client - InKnowing MVP 4.0
// Business Logic Conservation: Centralized API communication with Bearer Token authentication

import AuthStorage from './auth-storage'
import type { ApiResponse, ApiError, AuthResponse } from '@/types/api'

export class ApiClient {
  private baseURL: string
  private timeout: number
  private retries: number
  private refreshPromise: Promise<void> | null = null

  constructor() {
    // Use direct backend URL for API calls - ensure trailing slash for proper URL construction
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8888/v1'
    this.baseURL = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    this.timeout = 30000 // 30 seconds
    this.retries = 3
  }

  // Get authentication token - needed for WebSocket and API calls
  public getAuthToken(): string | null {
    // Get access token from localStorage
    return AuthStorage.getAccessToken()
  }

  // Get refresh token from localStorage
  private getRefreshToken(): string | null {
    return AuthStorage.getRefreshToken()
  }

  // Update tokens in localStorage
  private updateTokens(authData: AuthResponse): void {
    // Store new tokens in localStorage
    AuthStorage.setTokens({
      access_token: authData.access_token,
      refresh_token: authData.refresh_token,
      ws_token: authData.ws_token,
    })

    // Also notify components about the update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:tokens-updated', { detail: authData }))
    }
  }

  // Clear authentication data
  public clearAuth(): void {
    // Clear tokens from localStorage
    AuthStorage.clearTokens()

    // Notify components about auth clear
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:cleared'))
    }
  }

  // Create authenticated headers with Bearer Token
  private createHeaders(includeAuth = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // Add Bearer Token if available and requested
    if (includeAuth) {
      const token = this.getAuthToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    return headers
  }

  // Handle API responses with enhanced error processing
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let error: ApiError
      try {
        const errorText = await response.text()
        error = errorText ? JSON.parse(errorText) : {
          error: response.status.toString(),
          message: response.statusText || 'Network error',
          timestamp: new Date().toISOString()
        }
      } catch {
        error = {
          error: response.status.toString(),
          message: response.statusText || 'Network error',
          timestamp: new Date().toISOString()
        }
      }

      // Handle authentication errors - Business Logic: Token Expiry → Refresh
      if (response.status === 401) {
        // Don't try to refresh on auth endpoints
        const url = new URL(response.url)
        if (url.pathname.includes('/auth/')) {
          throw new Error(error.message || 'Authentication failed')
        }

        // Try to refresh token once per request
        if (!this.refreshPromise) {
          this.refreshPromise = this.refreshToken()
        }
        await this.refreshPromise
        this.refreshPromise = null

        // Re-throw the error to trigger retry with new token
        throw new Error('AUTH_RETRY_NEEDED')
      }

      // Handle quota exceeded - Business Logic: Quota Limit → Upgrade Required
      if (response.status === 403) {
        if (error.message?.toLowerCase().includes('quota')) {
          throw new Error('QUOTA_EXCEEDED')
        }
        throw new Error(error.message || 'Access forbidden')
      }

      // Handle specific error codes
      switch (response.status) {
        case 400:
          throw new Error(error.message || 'Invalid request')
        case 404:
          throw new Error('Resource not found')
        case 409:
          throw new Error(error.message || 'Conflict - resource already exists')
        case 413:
          throw new Error('File too large')
        case 429:
          throw new Error('Too many requests - please try again later')
        case 500:
          throw new Error('Server error - please try again')
        default:
          throw new Error(error.message || 'API request failed')
      }
    }

    // Handle different response types
    if (response.status === 204) {
      return null as T
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    }

    return await response.text() as T
  }

  // Enhanced retry logic with intelligent backoff
  private async withRetry<T>(
    requestFn: () => Promise<Response>,
    retries = this.retries,
    isRetryAfterAuth = false
  ): Promise<T> {
    let lastError: Error

    for (let i = 0; i <= retries; i++) {
      try {
        const response = await requestFn()
        return await this.handleResponse<T>(response)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')

        // Handle auth retry
        if (lastError.message === 'AUTH_RETRY_NEEDED' && !isRetryAfterAuth) {
          // Retry once with new token
          return this.withRetry<T>(requestFn, 0, true)
        }

        // Don't retry on specific errors
        const nonRetryableErrors = [
          'Authentication failed',
          'Invalid request',
          'QUOTA_EXCEEDED',
          'Resource not found',
          'Conflict',
          'File too large'
        ]

        if (nonRetryableErrors.some(msg => lastError.message.includes(msg))) {
          throw lastError
        }

        // Don't retry on last attempt
        if (i >= retries) {
          break
        }

        // Exponential backoff with jitter for server errors and network issues
        const delay = Math.min(1000 * Math.pow(2, i), 30000) // Max 30s
        const jitter = Math.random() * 1000 // Add up to 1s jitter
        await new Promise(resolve => setTimeout(resolve, delay + jitter))

        console.warn(`Retrying request (attempt ${i + 2}/${retries + 1}):`, lastError.message)
      }
    }

    throw lastError!
  }

  // Refresh authentication token - Business Logic: Token Expiry → Auto-Renewal
  private async refreshToken(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken()
      if (!refreshToken) {
        this.clearAuth()
        throw new Error('No refresh token available')
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout for refresh

      try {
        // baseURL now always has trailing slash, so just append the endpoint
        const response = await fetch(`${this.baseURL}auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // No credentials needed, using Bearer Token in body
          body: JSON.stringify({ refresh_token: refreshToken }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Token refresh failed')
        }

        const newAuthData: AuthResponse = await response.json()
        this.updateTokens(newAuthData)

        console.log('Token refreshed successfully')
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      this.clearAuth()

      // Notify about auth failure - components can listen to this
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:refresh-failed'))
      }

      throw new Error('Session expired. Please log in again.')
    }
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    includeAuth = true
  ): Promise<T> {
    // Remove leading slash from endpoint to avoid double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${cleanEndpoint}`

    return this.withRetry<T>(async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      try {
        return await fetch(url, {
          ...options,
          headers: {
            ...this.createHeaders(includeAuth),
            ...options.headers,
          },
          // No credentials needed with Bearer Token
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeoutId)
      }
    })
  }

  // HTTP Methods
  async get<T>(endpoint: string, includeAuth = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, includeAuth)
  }

  async post<T>(endpoint: string, data?: any, includeAuth = true): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      includeAuth
    )
  }

  async put<T>(endpoint: string, data?: any, includeAuth = true): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      includeAuth
    )
  }

  async patch<T>(endpoint: string, data?: any, includeAuth = true): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
      },
      includeAuth
    )
  }

  async delete<T>(endpoint: string, includeAuth = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, includeAuth)
  }

  // File upload with form data
  async upload<T>(
    endpoint: string,
    formData: FormData,
    includeAuth = true
  ): Promise<T> {
    // Remove leading slash from endpoint to avoid double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${cleanEndpoint}`

    return this.withRetry<T>(async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // Longer timeout for uploads

      try {
        const headers: HeadersInit = {}
        // No need to manually add Authorization header
        // Cookies will be sent automatically

        return await fetch(url, {
          method: 'POST',
          headers,
          body: formData,
          credentials: 'include', // Include cookies with upload
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeoutId)
      }
    })
  }
}

// Create singleton instance
export const apiClient = new ApiClient()

// Convenience functions for common API calls - Business Logic Conservation: Complete API Coverage
export const api = {
  // Authentication - Business Logic: Anonymous → Authenticated State Transitions
  auth: {
    login: (data: any) => apiClient.post('auth/login', data, false),
    register: (data: any) => apiClient.post('auth/register', data, false),
    logout: () => apiClient.post('auth/logout'),
    refresh: (data: any) => apiClient.post('auth/refresh', data, false),
    sendVerificationCode: (data: { phone: string }) => apiClient.post('auth/verify-code', data, false),
  },

  // Users - Business Logic: Profile and Membership Management
  users: {
    getProfile: () => apiClient.get('users/profile'),
    updateProfile: (data: any) => apiClient.patch('users/profile', data),
    getMembership: () => apiClient.get('users/membership'),
    upgradeMembership: (data: any) => apiClient.post('users/membership/upgrade', data),
    getQuota: () => apiClient.get('users/quota'),
  },

  // Search - Business Logic: Question → Book Discovery
  search: {
    searchBooks: (query: string, type = 'question', page = 1, limit = 10) =>
      apiClient.get(`search?q=${encodeURIComponent(query)}&type=${type}&page=${page}&limit=${limit}`, false),
    searchByTitle: (title: string, exact = false) =>
      apiClient.get(`search/books?title=${encodeURIComponent(title)}&exact=${exact}`, false),
  },

  // Books - Business Logic: Book Catalog and Discovery
  books: {
    list: (params: {
      category?: string
      sort?: 'popular' | 'newest' | 'most_discussed'
      page?: number
      limit?: number
    } = {}) => {
      const queryParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.set(key, value.toString())
        }
      })
      const queryString = queryParams.toString()
      return apiClient.get(`books${queryString ? `?${queryString}` : ''}`, false)
    },
    getPopular: (period: 'today' | 'week' | 'month' | 'all' = 'week', limit = 10) =>
      apiClient.get(`books/popular?period=${period}&limit=${limit}`, false),
    getById: (id: string) => apiClient.get(`books/${id}`, false),
    getCharacters: (id: string) => apiClient.get(`books/${id}/characters`, false),
  },

  // Dialogues - Business Logic: User Action → AI Response Sequences
  dialogues: {
    startBook: (bookId: string, initialQuestion?: string) =>
      apiClient.post('dialogues/book/start', { book_id: bookId, initial_question: initialQuestion }),
    startCharacter: (bookId: string, characterId: string, initialMessage?: string) =>
      apiClient.post('dialogues/character/start', {
        book_id: bookId,
        character_id: characterId,
        initial_message: initialMessage
      }),
    getSession: (sessionId: string) =>
      apiClient.get(`dialogues/${sessionId}`),
    sendMessage: (sessionId: string, message: string) =>
      apiClient.post(`dialogues/${sessionId}/messages`, { message }),
    getMessages: (sessionId: string, page = 1, limit = 20) =>
      apiClient.get(`dialogues/${sessionId}/messages?page=${page}&limit=${limit}`),
    getContext: (sessionId: string) => apiClient.get(`dialogues/${sessionId}/context`),
    getHistory: (params: {
      book_id?: string
      type?: 'book' | 'character'
      page?: number
      limit?: number
    } = {}) => {
      const queryParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.set(key, value.toString())
        }
      })
      const queryString = queryParams.toString()
      return apiClient.get(`dialogues/history${queryString ? `?${queryString}` : ''}`)
    },
  },

  // Uploads - Business Logic: User Upload → AI Processing → Vectorization
  uploads: {
    check: (title: string, author: string) =>
      apiClient.post('uploads/check', { title, author }),
    upload: (formData: FormData) => apiClient.upload('uploads', formData),
    getStatus: (id: string) => apiClient.get(`uploads/${id}`),
    getMy: (params: {
      status?: 'pending' | 'processing' | 'completed' | 'failed' | 'all'
      page?: number
      limit?: number
    } = {}) => {
      const queryParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.set(key, value.toString())
        }
      })
      const queryString = queryParams.toString()
      return apiClient.get(`uploads/my${queryString ? `?${queryString}` : ''}`)
    },
  },

  // Payment - Business Logic: Payment Processing Flow
  payment: {
    getOrderStatus: (orderId: string) => apiClient.get(`payment/orders/${orderId}`),
  },

  // Admin - Business Logic: Admin Management Functions
  admin: {
    auth: {
      login: (credentials: { username: string; password: string }) =>
        apiClient.post('admin/login', credentials, false),
      logout: () => apiClient.post('admin/auth/logout'),
      refresh: (data: any) => apiClient.post('admin/auth/refresh', data),
    },
    dashboard: {
      getStats: () => apiClient.get('admin/dashboard/stats'),
    },
    users: {
      list: (params?: any) => {
        const queryParams = new URLSearchParams()
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
              queryParams.set(key, value.toString())
            }
          })
        }
        const queryString = queryParams.toString()
        return apiClient.get(`admin/users${queryString ? `?${queryString}` : ''}`)
      },
      getById: (id: string) => apiClient.get(`admin/users/${id}`),
      update: (id: string, data: any) => apiClient.patch(`admin/users/${id}`, data),
    },
  },

  // WebSocket Connection Helper
  createWebSocketUrl: (sessionId: string, token?: string) => {
    const wsBaseUrl = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_WS_BASE_URL || `ws://${window.location.hostname}:8888`)
      : (process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:8888')

    // Build WebSocket URL with dialogue session
    const wsUrl = `${wsBaseUrl}/ws/dialogue/${sessionId}`

    // Add token as query parameter if provided
    if (token) {
      return `${wsUrl}?token=${token}`
    }

    // Authentication is handled via cookies
    return wsUrl
  },

  // Helper for getting current auth token
  getAuthToken: () => apiClient.getAuthToken(),

  // Helper for clearing authentication
  clearAuth: () => apiClient.clearAuth(),
}

export default api