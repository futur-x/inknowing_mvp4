// Auth Storage - Bearer Token Management
// Purpose: Centralized token storage and management for Bearer Token authentication

interface TokenData {
  access_token: string;
  refresh_token?: string;
  ws_token?: string;
  expires_at?: number;
}

class AuthStorage {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly WS_TOKEN_KEY = 'ws_token';
  private static readonly TOKEN_DATA_KEY = 'auth_tokens';

  /**
   * Store tokens in localStorage
   */
  static setTokens(tokens: TokenData): void {
    if (typeof window === 'undefined') return;

    try {
      // Store individual tokens for easy access
      localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.access_token);

      if (tokens.refresh_token) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refresh_token);
      }

      if (tokens.ws_token) {
        localStorage.setItem(this.WS_TOKEN_KEY, tokens.ws_token);
      }

      // Also store complete token data as JSON
      localStorage.setItem(this.TOKEN_DATA_KEY, JSON.stringify({
        ...tokens,
        stored_at: Date.now()
      }));
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  /**
   * Get access token
   */
  static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;

    try {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Get refresh token
   */
  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;

    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  }

  /**
   * Get WebSocket token
   */
  static getWsToken(): string | null {
    if (typeof window === 'undefined') return null;

    try {
      return localStorage.getItem(this.WS_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get WebSocket token:', error);
      return null;
    }
  }

  /**
   * Get all token data
   */
  static getTokenData(): TokenData | null {
    if (typeof window === 'undefined') return null;

    try {
      const data = localStorage.getItem(this.TOKEN_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get token data:', error);
      return null;
    }
  }

  /**
   * Update access token only
   */
  static updateAccessToken(token: string): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, token);

      // Update token data as well
      const tokenData = this.getTokenData();
      if (tokenData) {
        tokenData.access_token = token;
        tokenData.stored_at = Date.now();
        localStorage.setItem(this.TOKEN_DATA_KEY, JSON.stringify(tokenData));
      }
    } catch (error) {
      console.error('Failed to update access token:', error);
    }
  }

  /**
   * Clear all tokens
   */
  static clearTokens(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.WS_TOKEN_KEY);
      localStorage.removeItem(this.TOKEN_DATA_KEY);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return !!token;
  }

  /**
   * Check if token is expired (if expires_at is provided)
   */
  static isTokenExpired(): boolean {
    const tokenData = this.getTokenData();
    if (!tokenData || !tokenData.expires_at) {
      return false; // No expiry info, assume valid
    }

    return Date.now() >= tokenData.expires_at;
  }

  /**
   * Get Bearer token header value
   */
  static getBearerToken(): string | null {
    const token = this.getAccessToken();
    return token ? `Bearer ${token}` : null;
  }

  /**
   * Listen for storage events (for multi-tab sync)
   */
  static addStorageListener(callback: (event: StorageEvent) => void): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('storage', (event) => {
      if (event.key === this.ACCESS_TOKEN_KEY ||
          event.key === this.REFRESH_TOKEN_KEY ||
          event.key === this.TOKEN_DATA_KEY) {
        callback(event);
      }
    });
  }

  /**
   * Remove storage listener
   */
  static removeStorageListener(callback: (event: StorageEvent) => void): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('storage', callback);
  }
}

export default AuthStorage;
export type { TokenData };