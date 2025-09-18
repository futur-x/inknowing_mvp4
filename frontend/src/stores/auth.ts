// Auth Store - InKnowing MVP 4.0
// Business Logic Conservation: Manages authentication state transitions
// Now uses cookie-based authentication instead of localStorage

import { create } from 'zustand'
import { api } from '@/lib/api'
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

      // Initialize auth event listeners
      ...((() => {
        if (typeof window !== 'undefined') {
          // Listen for auth refresh failures from API client
          window.addEventListener('auth:refresh-failed', () => {
            get().clearAuth()
          })

          // Listen for auth tokens update from API client
          window.addEventListener('auth:tokens-updated', ((event: CustomEvent) => {
            const authData = event.detail as AuthResponse
            if (authData.user) {
              set({ user: authData.user })
            }
          }) as EventListener)

          // Listen for auth cleared event
          window.addEventListener('auth:cleared', () => {
            get().clearAuth()
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
        // Refresh token is now handled via cookies
        try {
          set({ isLoading: true, error: null })

          // The refresh endpoint will use the refresh_token cookie
          const authData: AuthResponse = await api.auth.refresh({})
          get().setAuth(authData)
        } catch (error) {
          console.error('Token refresh failed:', error)
          get().clearAuth()
          throw error
        }
      },

      // Check authentication status
      checkAuth: async () => {
        // Check if we have a user profile
        try {
          set({ isLoading: true })
          // Try to get user profile - cookies will be sent automatically
          const user = await api.users.getProfile()
          set({
            user,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          console.error('Auth check failed:', error)
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
        // Tokens are now stored in httponly cookies
        // We only store user info in state
        set({
          user: authData.user,
          token: null, // Token is in cookie, not in state
          refreshToken: null, // Refresh token is in cookie, not in state
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      },

      clearAuth: () => {
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