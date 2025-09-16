// User Store - InKnowing MVP 4.0
// Business Logic Conservation: Manages user profile and membership state

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'
import type {
  User,
  Membership,
  Quota,
  MembershipUpgrade,
  UserUpdate,
  PaymentOrder
} from '@/types/api'

interface UserState {
  // State
  profile: User | null
  membership: Membership | null
  quota: Quota | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchProfile: () => Promise<void>
  updateProfile: (data: UserUpdate) => Promise<void>
  fetchMembership: () => Promise<void>
  fetchQuota: () => Promise<void>
  upgradeMembership: (data: MembershipUpgrade) => Promise<PaymentOrder>
  fetchAllUserData: () => Promise<void>
  clearError: () => void
  setLoading: (loading: boolean) => void

  // Internal actions
  setProfile: (profile: User) => void
  setMembership: (membership: Membership) => void
  setQuota: (quota: Quota) => void
  updateQuotaUsage: (used: number) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      profile: null,
      membership: null,
      quota: null,
      isLoading: false,
      error: null,

      // Fetch user profile - Business Logic: Get authenticated user data
      fetchProfile: async () => {
        try {
          set({ isLoading: true, error: null })

          const profile: User = await api.users.getProfile()
          set({ profile, isLoading: false })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch profile'
          set({
            error: errorMessage,
            isLoading: false
          })
          throw error
        }
      },

      // Update user profile - Business Logic: Profile modification
      updateProfile: async (data: UserUpdate) => {
        try {
          set({ isLoading: true, error: null })

          const updatedProfile: User = await api.users.updateProfile(data)
          set({ profile: updatedProfile, isLoading: false })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update profile'
          set({
            error: errorMessage,
            isLoading: false
          })
          throw error
        }
      },

      // Fetch membership status - Business Logic: Check user tier and benefits
      fetchMembership: async () => {
        try {
          set({ isLoading: true, error: null })

          const membership: Membership = await api.users.getMembership()
          set({ membership, isLoading: false })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch membership'
          set({
            error: errorMessage,
            isLoading: false
          })
          throw error
        }
      },

      // Fetch quota information - Business Logic: Check dialogue limits
      fetchQuota: async () => {
        try {
          set({ isLoading: true, error: null })

          const quota: Quota = await api.users.getQuota()
          set({ quota, isLoading: false })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch quota'
          set({
            error: errorMessage,
            isLoading: false
          })
          throw error
        }
      },

      // Upgrade membership - Business Logic: Free User → Paid Member
      upgradeMembership: async (data: MembershipUpgrade): Promise<PaymentOrder> => {
        try {
          set({ isLoading: true, error: null })

          const paymentOrder: PaymentOrder = await api.users.upgradeMembership(data)
          set({ isLoading: false })
          return paymentOrder
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to upgrade membership'
          set({
            error: errorMessage,
            isLoading: false
          })
          throw error
        }
      },

      // Fetch all user data - Business Logic: Complete user state sync
      fetchAllUserData: async () => {
        try {
          set({ isLoading: true, error: null })

          // Fetch all user-related data in parallel for better performance
          const [profile, membership, quota] = await Promise.all([
            api.users.getProfile().catch(err => {
              console.warn('Failed to fetch profile:', err)
              return null
            }),
            api.users.getMembership().catch(err => {
              console.warn('Failed to fetch membership:', err)
              return null
            }),
            api.users.getQuota().catch(err => {
              console.warn('Failed to fetch quota:', err)
              return null
            })
          ])

          set({
            profile,
            membership,
            quota,
            isLoading: false
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user data'
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

      // Internal actions
      setProfile: (profile: User) => set({ profile }),
      setMembership: (membership: Membership) => set({ membership }),
      setQuota: (quota: Quota) => set({ quota }),

      // Update quota usage - Business Logic: Track dialogue consumption
      updateQuotaUsage: (used: number) => {
        const currentQuota = get().quota
        if (currentQuota) {
          const updatedQuota: Quota = {
            ...currentQuota,
            used,
            remaining: currentQuota.total - used,
          }
          set({ quota: updatedQuota })
        }
      },
    }),
    {
      name: 'inknowing-user',
      partialize: (state) => ({
        profile: state.profile,
        membership: state.membership,
        quota: state.quota,
      }),
    }
  )
)

// Selectors for common use cases
export const useUserProfile = () => useUserStore(state => state.profile)
export const useMembership = () => useUserStore(state => state.membership)
export const useQuota = () => useUserStore(state => state.quota)
export const useUserLoading = () => useUserStore(state => state.isLoading)
export const useUserError = () => useUserStore(state => state.error)

// Membership type helpers
export const useIsPaidMember = () => {
  const membership = useMembership()
  return membership?.type !== 'free'
}

export const useCanUploadBooks = () => {
  const membership = useMembership()
  return membership?.type !== 'free' && membership?.type !== undefined
}

export const useQuotaStatus = () => {
  const quota = useQuota()
  if (!quota) return null

  return {
    ...quota,
    isExhausted: quota.remaining <= 0,
    utilizationRate: (quota.used / quota.total) * 100,
    isNearLimit: quota.remaining < quota.total * 0.1, // Less than 10% remaining
  }
}