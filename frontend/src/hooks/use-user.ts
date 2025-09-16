// User Hooks - InKnowing MVP 4.0
// Business Logic Conservation: User profile and membership data management

import useSWR from 'swr'
import { api } from '@/lib/api'
import { swrConfig } from './swr-config'
import { useAuthStore } from '@/stores/auth'
import type { User, Membership, Quota, PaymentOrder } from '@/types/api'

// Hook for user profile - Business Logic: Authenticated user data
export function useUserProfile() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const key = isAuthenticated ? '/users/profile' : null

  const { data, error, isLoading, mutate } = useSWR<User>(
    key,
    () => api.users.getProfile(),
    {
      ...swrConfig,
      refreshInterval: 1000 * 60 * 10, // Refresh every 10 minutes
      revalidateOnFocus: true,
    }
  )

  return {
    profile: data,
    isLoading,
    error,
    mutate,
    // Helper to update profile
    updateProfile: async (updateData: { nickname?: string; avatar?: string }) => {
      try {
        const updatedProfile = await api.users.updateProfile(updateData)
        mutate(updatedProfile, false) // Update cache immediately
        return updatedProfile
      } catch (error) {
        mutate() // Revalidate on error
        throw error
      }
    },
  }
}

// Hook for membership status - Business Logic: User tier and benefits
export function useMembership() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const key = isAuthenticated ? '/users/membership' : null

  const { data, error, isLoading, mutate } = useSWR<Membership>(
    key,
    () => api.users.getMembership(),
    {
      ...swrConfig,
      refreshInterval: 1000 * 60 * 5, // Refresh every 5 minutes for membership changes
    }
  )

  return {
    membership: data,
    isLoading,
    error,
    mutate,
    // Helper functions
    isPaid: data?.type !== 'free',
    canUploadBooks: data?.type !== 'free',
    tier: data?.type || 'free',
    benefits: data?.benefits || [],
    expiresAt: data?.expires_at,
    isExpired: data?.expires_at ? new Date(data.expires_at) < new Date() : false,
  }
}

// Hook for quota information - Business Logic: Dialogue limits tracking
export function useQuota() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const key = isAuthenticated ? '/users/quota' : null

  const { data, error, isLoading, mutate } = useSWR<Quota>(
    key,
    () => api.users.getQuota(),
    {
      ...swrConfig,
      refreshInterval: 1000 * 60 * 2, // Refresh every 2 minutes for quota tracking
      revalidateOnFocus: true,
    }
  )

  const quota = data || { total: 0, used: 0, remaining: 0, reset_at: new Date().toISOString() }

  return {
    quota: data,
    isLoading,
    error,
    mutate,
    // Helper calculations
    total: quota.total,
    used: quota.used,
    remaining: quota.remaining,
    resetAt: quota.reset_at,
    utilizationRate: quota.total > 0 ? (quota.used / quota.total) * 100 : 0,
    isExhausted: quota.remaining <= 0,
    isNearLimit: quota.remaining < quota.total * 0.1 && quota.total > 0, // Less than 10% remaining
    // Helper to update quota usage after dialogue
    incrementUsage: (increment = 1) => {
      if (data) {
        const updatedQuota = {
          ...data,
          used: data.used + increment,
          remaining: Math.max(0, data.remaining - increment),
        }
        mutate(updatedQuota, false) // Update cache immediately
      }
    },
  }
}

// Hook for combined user data - Business Logic: Complete user state
export function useUserData() {
  const { profile, isLoading: profileLoading, error: profileError } = useUserProfile()
  const { membership, isLoading: membershipLoading, error: membershipError } = useMembership()
  const { quota, isLoading: quotaLoading, error: quotaError } = useQuota()

  return {
    profile,
    membership,
    quota,
    isLoading: profileLoading || membershipLoading || quotaLoading,
    errors: {
      profile: profileError,
      membership: membershipError,
      quota: quotaError,
    },
    hasError: !!(profileError || membershipError || quotaError),
  }
}

// Hook for payment orders - Business Logic: Payment tracking
export function usePaymentOrder(orderId: string | null, pollingInterval = 3000) {
  const key = orderId ? `/payment/orders/${orderId}` : null

  const { data, error, isLoading, mutate } = useSWR<PaymentOrder>(
    key,
    () => orderId ? api.payment.getOrderStatus(orderId) : null,
    {
      ...swrConfig,
      refreshInterval: data?.status === 'pending' || data?.status === 'processing'
        ? pollingInterval
        : 0, // Poll only while payment is pending/processing
      revalidateOnFocus: true,
    }
  )

  return {
    order: data,
    isLoading,
    error,
    mutate,
    // Helper status checks
    isPending: data?.status === 'pending',
    isProcessing: data?.status === 'processing',
    isCompleted: data?.status === 'completed',
    isFailed: data?.status === 'failed',
    isExpired: data?.expires_at ? new Date(data.expires_at) < new Date() : false,
  }
}

// Custom hook for handling membership upgrade flow
export function useMembershipUpgrade() {
  const { mutate: mutateMembership } = useMembership()
  const { mutate: mutateQuota } = useQuota()

  const upgradeMembership = async (upgradeData: {
    plan: 'basic' | 'premium' | 'super'
    duration: 1 | 3 | 6 | 12
    payment_method: 'wechat' | 'alipay'
  }) => {
    try {
      const paymentOrder = await api.users.upgradeMembership(upgradeData)

      // Don't mutate membership/quota here - let the payment completion handle it
      return paymentOrder
    } catch (error) {
      throw error
    }
  }

  const handlePaymentSuccess = async () => {
    // Refresh membership and quota after successful payment
    await Promise.all([
      mutateMembership(),
      mutateQuota(),
    ])
  }

  return {
    upgradeMembership,
    handlePaymentSuccess,
  }
}