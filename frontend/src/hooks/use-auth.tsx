'use client'

// Use Auth Hook - InKnowing MVP 4.0
// Business Logic Conservation: Authentication state management hook

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'

export function useAuth(requireAuth: boolean = false) {
  const router = useRouter()
  const {
    isAuthenticated,
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    refreshAuth,
    sendVerificationCode,
    clearError,
    error
  } = useAuthStore()

  // Check authentication status on mount
  useEffect(() => {
    // Check if we have a stored token and try to validate it
    if (token && !user) {
      refreshAuth().catch(() => {
        // Token is invalid, clear auth state
        logout()
      })
    }
  }, [token, user, refreshAuth, logout])

  // Redirect if authentication is required and user is not authenticated
  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, requireAuth, router])

  // Update profile function (placeholder - will be replaced by profile store)
  const updateProfile = useCallback(async (updates: any) => {
    if (!token) throw new Error('Not authenticated')

    const response = await fetch('http://localhost:8888/api/users/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      throw new Error('Failed to update profile')
    }

    const updatedUser = await response.json()
    // Update user in auth store if needed
    return updatedUser
  }, [token])

  return {
    isAuthenticated,
    user,
    token,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshAuth,
    sendVerificationCode,
    clearError,
    updateProfile
  }
}

export default useAuth