// API Client - Unified API client with Bearer Token authentication
// Purpose: Centralized API client that automatically handles Bearer Token authentication

import AuthStorage from './auth-storage';

interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  withCredentials?: boolean;
}

interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
  timeout?: number;
}

class ApiClient {
  private baseURL: string;
  private timeout: number;
  private withCredentials: boolean;

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL;
    this.timeout = config.timeout || 30000; // 30 seconds default
    this.withCredentials = config.withCredentials || false;
  }

  /**
   * Build full URL with query parameters
   */
  private buildURL(endpoint: string, params?: Record<string, string>): string {
    // Ensure baseURL ends with a slash for proper path concatenation
    const base = this.baseURL.endsWith('/') ? this.baseURL : this.baseURL + '/';

    // Remove leading slash from endpoint to avoid double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

    // Concatenate base and endpoint to preserve the full path
    const fullURL = base + cleanEndpoint;
    const url = new URL(fullURL);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    return url.toString();
  }

  /**
   * Add authentication headers
   */
  private addAuthHeaders(headers: HeadersInit = {}): HeadersInit {
    const token = AuthStorage.getAccessToken();

    const newHeaders = new Headers(headers);

    // Add Bearer token if available
    if (token) {
      newHeaders.set('Authorization', `Bearer ${token}`);
    }

    // Add default headers
    if (!newHeaders.has('Content-Type')) {
      newHeaders.set('Content-Type', 'application/json');
    }

    return newHeaders;
  }

  /**
   * Handle 401 errors and attempt token refresh
   */
  private async handleUnauthorized(): Promise<boolean> {
    const refreshToken = AuthStorage.getRefreshToken();

    if (!refreshToken) {
      // No refresh token, clear auth and redirect to login
      AuthStorage.clearTokens();
      window.location.href = '/auth/login';
      return false;
    }

    try {
      // Attempt to refresh the token
      const response = await fetch(this.buildURL('auth/refresh'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
        credentials: this.withCredentials ? 'include' : 'same-origin',
      });

      if (response.ok) {
        const data = await response.json();

        // Store new tokens
        AuthStorage.setTokens({
          access_token: data.access_token,
          refresh_token: data.refresh_token || refreshToken,
          ws_token: data.ws_token,
        });

        return true; // Successfully refreshed
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    // Refresh failed, clear auth and redirect to login
    AuthStorage.clearTokens();
    window.location.href = '/auth/login';
    return false;
  }

  /**
   * Main request method
   */
  async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { params, timeout = this.timeout, ...fetchConfig } = config;

    // Build URL
    const url = this.buildURL(endpoint, params);

    // Add auth headers
    fetchConfig.headers = this.addAuthHeaders(fetchConfig.headers);

    // Set credentials mode
    fetchConfig.credentials = this.withCredentials ? 'include' : 'same-origin';

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchConfig.signal = controller.signal;

    try {
      let response = await fetch(url, fetchConfig);
      clearTimeout(timeoutId);

      // Handle 401 Unauthorized
      if (response.status === 401) {
        const refreshed = await this.handleUnauthorized();

        if (refreshed) {
          // Retry the request with new token
          fetchConfig.headers = this.addAuthHeaders(fetchConfig.headers);
          response = await fetch(url, fetchConfig);
        } else {
          throw new Error('Authentication failed');
        }
      }

      // Handle other error responses
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Request failed with status ${response.status}`);
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return await response.text() as any;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      throw new Error('Request failed');
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      params,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      params,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, data?: any, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      params,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', params });
  }

  /**
   * Upload file with multipart/form-data
   */
  async upload<T = any>(
    endpoint: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const token = AuthStorage.getAccessToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData, let browser set it with boundary

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.open('POST', this.buildURL(endpoint));

      // Set headers
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      // Progress handler
      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        };
      }

      // Success handler
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            resolve(xhr.responseText as any);
          }
        } else if (xhr.status === 401) {
          // Handle unauthorized
          this.handleUnauthorized().then((refreshed) => {
            if (refreshed) {
              // Retry upload with new token
              this.upload<T>(endpoint, formData, onProgress)
                .then(resolve)
                .catch(reject);
            } else {
              reject(new Error('Authentication failed'));
            }
          });
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      // Error handler
      xhr.onerror = () => {
        reject(new Error('Upload failed'));
      };

      // Timeout handler
      xhr.timeout = this.timeout;
      xhr.ontimeout = () => {
        reject(new Error('Upload timeout'));
      };

      // Send request
      xhr.send(formData);
    });
  }
}

// Create default API client instance
const apiClient = new ApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8888/v1',
  withCredentials: false, // Changed to false for Bearer Token auth
});

export default apiClient;
export { apiClient, ApiClient };