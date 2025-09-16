// Hooks Index - InKnowing MVP 4.0
// Business Logic Conservation: Centralized data fetching hooks export

// SWR Configuration
export { swrConfig, fetcher, useSwrWithConfig } from './swr-config'

// Book-related hooks
export {
  useBooks,
  useBooksInfinite,
  usePopularBooks,
  useBook,
  useBookCharacters,
  useBookSearch,
  useBookSearchByTitle,
} from './use-books'

// User-related hooks
export {
  useUserProfile,
  useMembership,
  useQuota,
  useUserData,
  usePaymentOrder,
  useMembershipUpgrade,
} from './use-user'

// Dialogue-related hooks
export {
  useDialogueHistory,
  useDialogueHistoryInfinite,
  useDialogueMessages,
  useDialogueMessagesInfinite,
  useDialogueContext,
  useActiveDialogues,
  useDialogueAnalytics,
} from './use-dialogues'

// Upload-related hooks
export {
  useMyUploads,
  useMyUploadsInfinite,
  useUpload,
  useUploadFlow,
  useUploadStats,
} from './use-uploads'

// Re-export store hooks for convenience
export {
  useAuthStore,
  useUser,
  useIsAuthenticated,
  useAuthToken,
  useAuthLoading,
  useAuthError,
  useRequireAuth,
} from '@/stores/auth'

export {
  useUserStore,
  useUserProfile as useUserStoreProfile,
  useMembership as useUserStoreMembership,
  useQuota as useUserStoreQuota,
  useUserLoading,
  useUserError,
  useIsPaidMember,
  useCanUploadBooks,
  useQuotaStatus,
} from '@/stores/user'

export {
  useChatStore,
  useCurrentSession,
  useSessionMessages,
  useChatLoading,
  useChatError,
  useActiveSessions,
  useSessionCount,
} from '@/stores/chat'