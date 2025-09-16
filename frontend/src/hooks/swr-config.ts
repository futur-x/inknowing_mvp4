// SWR Configuration - InKnowing MVP 4.0
// Business Logic Conservation: Centralized data fetching and caching configuration

import useSWR from 'swr'
import { api } from '@/lib/api'

// Base SWR configuration
export const swrConfig = {
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  loadingTimeout: 30000, // 30 seconds
  focusThrottleInterval: 5000, // 5 seconds
  dedupingInterval: 2000, // 2 seconds
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  shouldRetryOnError: (error: Error) => {
    // Don't retry on auth errors - let the API client handle token refresh
    if (error.message.includes('Authentication failed') ||
        error.message.includes('AUTH_RETRY_NEEDED')) {
      return false
    }

    // Don't retry on quota exceeded
    if (error.message === 'QUOTA_EXCEEDED') {
      return false
    }

    // Don't retry on client errors (4xx)
    if (error.message.includes('400') ||
        error.message.includes('404') ||
        error.message.includes('Invalid request')) {
      return false
    }

    return true
  },
}

// Generic fetcher that uses our API client
export const fetcher = (url: string) => {
  // Parse the URL to extract the endpoint path
  const endpoint = url.replace(process.env.NEXT_PUBLIC_API_BASE_URL || '', '')

  // Use the appropriate API client method based on endpoint
  if (endpoint.startsWith('/users/')) {
    if (endpoint === '/users/profile') return api.users.getProfile()
    if (endpoint === '/users/membership') return api.users.getMembership()
    if (endpoint === '/users/quota') return api.users.getQuota()
  }

  if (endpoint.startsWith('/books/')) {
    const bookId = endpoint.split('/')[2]
    if (endpoint.includes('/characters')) {
      return api.books.getCharacters(bookId)
    }
    return api.books.getById(bookId)
  }

  if (endpoint.startsWith('/dialogues/')) {
    if (endpoint === '/dialogues/history') return api.dialogues.getHistory()
    const parts = endpoint.split('/')
    const sessionId = parts[2]
    if (parts[3] === 'messages') {
      return api.dialogues.getMessages(sessionId)
    }
    if (parts[3] === 'context') {
      return api.dialogues.getContext(sessionId)
    }
  }

  if (endpoint.startsWith('/uploads/')) {
    if (endpoint === '/uploads/my') return api.uploads.getMy()
    const uploadId = endpoint.split('/')[2]
    return api.uploads.getStatus(uploadId)
  }

  throw new Error(`No fetcher found for endpoint: ${endpoint}`)
}

// Create a custom useSWR hook with our configuration
export function useSwrWithConfig<T>(key: string | null, customConfig = {}) {
  return useSWR<T>(
    key,
    fetcher,
    {
      ...swrConfig,
      ...customConfig,
    }
  )
}