'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string  // Allow custom redirect path
}

export function AuthGuard({ children, fallback, redirectTo = '/auth/login' }: AuthGuardProps) {
  const router = useRouter()
  const { isAuthenticated, isHydrated, user, checkAuth } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)

  useEffect(() => {
    // Ensure we're in the browser environment
    if (typeof window === 'undefined') {
      console.log('AuthGuard: Running on server, skipping auth check')
      return
    }

    // Prevent multiple checks
    if (hasCheckedAuth) {
      return
    }

    // Mark that we've started checking
    setHasCheckedAuth(true)

    // Check authentication via API (cookies will be sent automatically)
    const checkAuthStatus = async () => {
      try {
        await checkAuth()
        setIsChecking(false)
      } catch (error) {
        console.log('AuthGuard: Auth check failed, redirecting to', redirectTo)
        // No auth found, redirect to login
        const currentPath = window.location.pathname
        const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`
        router.push(redirectUrl)
      }
    }

    // Check if user is already authenticated in store
    if (isAuthenticated && user) {
      console.log('AuthGuard: User is authenticated')
      setIsChecking(false)
    } else {
      console.log('AuthGuard: Checking auth status...')
      checkAuthStatus()
    }
  }, [isAuthenticated, user, router, checkAuth, hasCheckedAuth, redirectTo])

  // Show loading state while checking auth
  if (isChecking) {
    return fallback || (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-muted-foreground">验证身份中...</p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}