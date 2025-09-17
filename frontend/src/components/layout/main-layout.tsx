// Main Layout Component - InKnowing MVP 4.0
// Business Logic Conservation: Consistent layout wrapper with auth context

'use client'

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Toaster } from '@/components/ui/sonner'
import Header from './header'
import Footer from './footer'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname()
  const { isAuthenticated, refreshAuth, checkAuth, token } = useAuthStore()
  const { fetchMembership, fetchQuota } = useUserStore()

  // Initialize auth state on mount
  useEffect(() => {
    // Check if we have a stored token and validate it
    if (token && !isAuthenticated) {
      checkAuth().catch(console.error)
    } else if (isAuthenticated) {
      // Load user membership and quota for authenticated users
      fetchMembership().catch(console.error)
      fetchQuota().catch(console.error)
    }
  }, []) // Run only once on mount

  // Handle auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      // Load user membership and quota when authentication status changes
      fetchMembership().catch(console.error)
      fetchQuota().catch(console.error)
    }
  }, [isAuthenticated, fetchMembership, fetchQuota])

  // Auto-refresh quota periodically for authenticated users
  useEffect(() => {
    if (!isAuthenticated) return

    const refreshQuota = () => {
      fetchQuota().catch(console.error)
    }

    // Refresh quota every 5 minutes
    const interval = setInterval(refreshQuota, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [isAuthenticated, fetchQuota])

  // Determine if footer should be shown
  const hideFooter = [
    '/chat',
    '/admin'
  ].some(path => pathname.startsWith(path))

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {children}
      </main>

      {!hideFooter && <Footer />}

      {/* Global toast notifications */}
      <Toaster position="bottom-right" />
    </div>
  )
}