'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import AuthStorage from '@/lib/auth-storage';
import type { User, LoginFormData, RegisterFormData } from '@/types/api';

interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;

  // Token management
  hasToken: () => boolean;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider - Bearer Token Authentication Context Provider
 *
 * This provider:
 * 1. Manages global authentication state
 * 2. Provides authentication methods to all components
 * 3. Handles token storage and validation
 * 4. Supports multi-tab synchronization via localStorage events
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const authStore = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      // Check for existing token
      const hasToken = AuthStorage.isAuthenticated();

      if (hasToken) {
        try {
          // Validate token with backend
          await authStore.checkAuth();
        } catch (error) {
          console.error('[AuthContext] Initial auth check failed:', error);
          // Token is invalid, clear it
          AuthStorage.clearTokens();
        }
      }

      setIsInitialized(true);
    };

    initAuth();
  }, [authStore]);

  // Listen for storage events (multi-tab sync)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'access_token') {
        if (event.newValue === null) {
          // Token was cleared in another tab
          authStore.clearAuth();
          router.push('/auth/login');
        } else if (event.newValue) {
          // Token was updated in another tab
          authStore.checkAuth();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [authStore, router]);

  // Context value
  const value: AuthContextType = {
    // State from auth store
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading || !isInitialized,
    error: authStore.error,

    // Actions from auth store
    login: authStore.login,
    register: authStore.register,
    logout: async () => {
      await authStore.logout();
      router.push('/');
    },
    checkAuth: authStore.checkAuth,
    clearError: authStore.clearError,

    // Token management
    hasToken: () => AuthStorage.isAuthenticated(),
    getToken: () => AuthStorage.getAccessToken(),
  };

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">初始化中...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook - Access authentication context
 *
 * Usage:
 * const { user, login, logout, isAuthenticated } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * withAuth HOC - Protect components with authentication
 *
 * Usage:
 * export default withAuth(YourComponent);
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    redirectTo?: string;
    loadingComponent?: React.ReactNode;
  }
) {
  return function AuthenticatedComponent(props: P) {
    const router = useRouter();
    const { isAuthenticated, isLoading, hasToken } = useAuth();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
      if (!isLoading) {
        if (!hasToken() || !isAuthenticated) {
          const redirectTo = options?.redirectTo || '/auth/login';
          const currentPath = window.location.pathname;
          router.push(`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`);
        } else {
          setChecking(false);
        }
      }
    }, [isAuthenticated, isLoading, hasToken, router]);

    if (isLoading || checking) {
      return (
        options?.loadingComponent || (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">验证身份中...</p>
            </div>
          </div>
        )
      );
    }

    if (!isAuthenticated) {
      return null; // Still redirecting
    }

    return <Component {...props} />;
  };
}