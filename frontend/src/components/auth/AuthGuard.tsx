'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import AuthStorage from '@/lib/auth-storage'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string  // Allow custom redirect path
}

/**
 * AuthGuard Component - Bearer Token Authentication Guard
 *
 * This component protects routes by checking Bearer token authentication
 * Uses localStorage for token storage and validates with backend API
 */
export function AuthGuard({ children, fallback, redirectTo = '/auth/login' }: AuthGuardProps) {
  const router = useRouter()
  const { checkAuth } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Ensure we're in the browser environment
    if (typeof window === 'undefined') {
      return
    }

    const verifyAuth = async () => {
      // Check for Bearer token in localStorage
      const hasToken = AuthStorage.isAuthenticated()

      if (!hasToken) {
        console.log('[AuthGuard] No token found, redirecting to login...')
        const currentPath = window.location.pathname
        const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`
        router.push(redirectUrl)
        return
      }

      try {
        // Validate token with backend
        await checkAuth()

        // Get updated auth state
        const { isAuthenticated: isAuth, user } = useAuthStore.getState()

        if (!isAuth || !user) {
          console.log('[AuthGuard] Token invalid, redirecting to login...')
          const currentPath = window.location.pathname
          const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`
          router.push(redirectUrl)
        } else {
          console.log('[AuthGuard] User authenticated:', user.username)
          setIsAuthenticated(true)
          setIsChecking(false)
        }
      } catch (error) {
        console.error('[AuthGuard] Auth check failed:', error)
        const currentPath = window.location.pathname
        const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`
        router.push(redirectUrl)
      }
    }

    verifyAuth()
  }, [checkAuth, router, redirectTo])

  // Show loading state while checking auth
  if (isChecking) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">验证身份中...</p>
        </div>
      </div>
    )
  }

  // Only render children if authenticated
  if (isAuthenticated) {
    return <>{children}</>
  }

  // Still redirecting
  return null
}