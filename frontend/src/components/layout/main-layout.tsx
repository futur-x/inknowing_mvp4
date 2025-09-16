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
  const { isAuthenticated, refreshAuth } = useAuthStore()
  const { fetchMembership, fetchQuota } = useUserStore()

  // Initialize user data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Refresh token on app load
      refreshAuth().catch(console.error)

      // Load user membership and quota
      fetchMembership().catch(console.error)
      fetchQuota().catch(console.error)
    }
  }, [isAuthenticated, refreshAuth, fetchMembership, fetchQuota])

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