// Auth Store - InKnowing MVP 4.0
// Business Logic Conservation: Manages authentication state transitions
// Now uses Bearer Token authentication with localStorage

import { create } from 'zustand'
import { api } from '@/lib/api'
import AuthStorage from '@/lib/auth-storage'
import type { User, AuthResponse, LoginFormData, RegisterFormData } from '@/types/api'

interface AuthState {
  // State
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isHydrated: boolean
  error: string | null

  // Actions
  login: (credentials: LoginFormData) => Promise<void>
  register: (data: RegisterFormData) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
  checkAuth: () => Promise<void>
  sendVerificationCode: (phone: string) => Promise<void>
  clearError: () => void
  setLoading: (loading: boolean) => void
  setHydrated: () => void

  // Internal actions
  setAuth: (authData: AuthResponse) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>(
  (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false,
      error: null,

      // Initialize auth from localStorage on startup
      ...((() => {
        if (typeof window !== 'undefined') {
          // Check if we have a stored token
          const token = AuthStorage.getAccessToken()
          if (token) {
            // We have a token, mark as potentially authenticated
            // Will validate on checkAuth() call
            set({ token, isAuthenticated: !!token })
          }

          // Listen for storage changes (multi-tab sync)
          AuthStorage.addStorageListener((event) => {
            if (event.newValue === null) {
              // Token was cleared in another tab
              get().clearAuth()
            } else if (event.newValue) {
              // Token was updated in another tab
              const token = AuthStorage.getAccessToken()
              set({ token, isAuthenticated: !!token })
              // Trigger auth check to get user data
              get().checkAuth()
            }
          })
        }
        return {}
      })()),

      // Login action - Business Logic: Anonymous → Authenticated
      login: async (credentials: LoginFormData) => {
        try {
          set({ isLoading: true, error: null })

          const authData: AuthResponse = await api.auth.login(credentials)
          get().setAuth(authData)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed'
          set({
            error: errorMessage,
            isLoading: false
          })
          throw error
        }
      },

      // Register action - Business Logic: Anonymous → Registered → Authenticated
      register: async (data: RegisterFormData) => {
        try {
          set({ isLoading: true, error: null })

          const authData: AuthResponse = await api.auth.register(data)
          get().setAuth(authData)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration failed'
          set({
            error: errorMessage,
            isLoading: false
          })
          throw error
        }
      },

      // Logout action - Business Logic: Authenticated → Anonymous
      logout: async () => {
        try {
          // Call logout endpoint if authenticated
          const { token } = get()
          if (token) {
            await api.auth.logout().catch(console.error) // Don't block logout on API failure
          }
        } finally {
          get().clearAuth()
        }
      },

      // Refresh token action - Business Logic: Token renewal
      refreshAuth: async () => {
        const refreshToken = AuthStorage.getRefreshToken()

        if (!refreshToken) {
          get().clearAuth()
          throw new Error('No refresh token available')
        }

        try {
          set({ isLoading: true, error: null })

          // Use refresh token to get new access token
          const authData: AuthResponse = await api.auth.refresh({ refresh_token: refreshToken })
          get().setAuth(authData)
        } catch (error) {
          console.error('Token refresh failed:', error)
          get().clearAuth()
          throw error
        }
      },

      // Check authentication status
      checkAuth: async () => {
        // Check if we have a valid token and get user profile
        const token = AuthStorage.getAccessToken()

        if (!token) {
          get().clearAuth()
          return
        }

        try {
          set({ isLoading: true })
          // Try to get user profile with Bearer token
          const user = await api.users.getProfile()
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          console.error('Auth check failed:', error)
          // Token might be invalid
          get().clearAuth()
          set({ isLoading: false })
        }
      },

      // Send verification code - Business Logic: Phone Number Verification
      sendVerificationCode: async (phone: string) => {
        try {
          set({ isLoading: true, error: null })

          await api.auth.sendVerificationCode({ phone })
          set({ isLoading: false })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send verification code'
          set({
            error: errorMessage,
            isLoading: false
          })
          throw error
        }
      },

      // Utility actions
      clearError: () => set({ error: null }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setHydrated: () => set({ isHydrated: true }),

      // Internal actions
      setAuth: (authData: AuthResponse) => {
        // Store tokens in localStorage using AuthStorage
        AuthStorage.setTokens({
          access_token: authData.access_token,
          refresh_token: authData.refresh_token,
          ws_token: authData.ws_token,
        })

        set({
          user: authData.user,
          token: authData.access_token,
          refreshToken: authData.refresh_token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      },

      clearAuth: () => {
        // Clear tokens from localStorage
        AuthStorage.clearTokens()

        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        })
      },
    })
)

// Selectors for common use cases
export const useUser = () => useAuthStore(state => state.user)
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated)
export const useAuthToken = () => useAuthStore(state => state.token)
export const useAuthLoading = () => useAuthStore(state => state.isLoading)
export const useAuthError = () => useAuthStore(state => state.error)

// Auth guard hook
export const useRequireAuth = () => {
  const isAuthenticated = useIsAuthenticated()
  const user = useUser()

  return {
    isAuthenticated,
    user,
    requireAuth: () => {
      if (!isAuthenticated) {
        throw new Error('Authentication required')
      }
      return { user: user! }
    }
  }
}