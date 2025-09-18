'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import ProfilePageClient from './ProfilePageClient'

/**
 * ProfilePageWrapper - A wrapper component that handles authentication
 * without using AuthGuard to avoid redirect issues
 *
 * This component:
 * 1. Waits for client-side hydration
 * 2. Checks authentication state from localStorage and store
 * 3. Only redirects if truly not authenticated
 * 4. Shows the profile page if authenticated
 */
export default function ProfilePageWrapper() {
  const router = useRouter()
  const { isAuthenticated, isHydrated, user, setAuth } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)
  const [shouldShowProfile, setShouldShowProfile] = useState(false)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return
    }

    // Check authentication
    const checkAuthStatus = async () => {
      console.log('[ProfileWrapper] Checking authentication...')

      try {
        // Check authentication via API (cookies will be sent automatically)
        const { checkAuth } = useAuthStore.getState()
        await checkAuth()

        // After checkAuth, the store should be updated
        const { isAuthenticated: isAuth, user: currentUser } = useAuthStore.getState()

        if (isAuth && currentUser) {
          console.log('[ProfileWrapper] User authenticated')
          setShouldShowProfile(true)
        } else {
          console.log('[ProfileWrapper] No valid auth found, redirecting...')
          router.push('/auth/login?redirect=/profile')
        }
      } catch (error) {
        console.error('[ProfileWrapper] Auth check failed:', error)
        router.push('/auth/login?redirect=/profile')
      } finally {
        setIsChecking(false)
      }
    }

    checkAuthStatus()
  }, [router])

  // Show loading while checking
  if (isChecking) {
    return (
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

  // Show profile if authenticated
  if (shouldShowProfile) {
    return <ProfilePageClient />
  }

  // Still checking or redirecting
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">正在跳转...</p>
        </div>
      </div>
    </div>
  )
}