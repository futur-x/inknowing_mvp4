'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import AuthStorage from '@/lib/auth-storage'
import ProfilePageClient from './ProfilePageClient'

/**
 * ProfilePageWrapper - Bearer Token Authentication
 *
 * This component:
 * 1. Checks for Bearer token in localStorage
 * 2. Validates token with backend API
 * 3. Redirects to login if no valid token
 * 4. Shows the profile page if authenticated
 */
export default function ProfilePageWrapper() {
  const router = useRouter()
  const { isAuthenticated, checkAuth } = useAuthStore()
  const [authChecking, setAuthChecking] = useState(true)

  useEffect(() => {
    const verifyAuth = async () => {
      // Check for Bearer token in localStorage
      const hasToken = AuthStorage.isAuthenticated()

      if (!hasToken) {
        console.log('[ProfileWrapper] No token found, redirecting to login...')
        router.push('/auth/login?redirect=/profile')
        return
      }

      try {
        // Validate token with backend
        await checkAuth()

        // Get updated auth state
        const { isAuthenticated: isAuth, user } = useAuthStore.getState()

        if (!isAuth || !user) {
          console.log('[ProfileWrapper] Token invalid, redirecting to login...')
          router.push('/auth/login?redirect=/profile')
        } else {
          console.log('[ProfileWrapper] User authenticated:', user.username)
          setAuthChecking(false)
        }
      } catch (error) {
        console.error('[ProfileWrapper] Auth check failed:', error)
        router.push('/auth/login?redirect=/profile')
      }
    }

    verifyAuth()
  }, [checkAuth, router])

  // Show loading while checking authentication
  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">验证身份中...</p>
        </div>
      </div>
    )
  }

  // Authentication successful, show profile
  return <ProfilePageClient />
}