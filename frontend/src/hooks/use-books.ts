// Book Hooks - InKnowing MVP 4.0
// Business Logic Conservation: Book catalog and discovery data fetching

import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { api } from '@/lib/api'
import { swrConfig } from './swr-config'
import type {
  Book,
  BookDetail,
  BookList,
  Character,
  SearchResults
} from '@/types/api'

// Hook for fetching book lists - Business Logic: Book Catalog Discovery
export function useBooks(params: {
  category?: string
  sort?: 'popular' | 'newest' | 'most_discussed'
  page?: number
  limit?: number
} = {}) {
  const key = `/books?${new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined)
    ) as Record<string, string>
  ).toString()}`

  const { data, error, isLoading, mutate } = useSWR<BookList>(
    key,
    () => api.books.list(params),
    {
      ...swrConfig,
      revalidateOnFocus: false, // Don't auto-refresh book lists
    }
  )

  return {
    books: data?.books || [],
    pagination: data?.pagination || null,
    isLoading,
    error,
    mutate,
  }
}

// Hook for infinite loading of books (useful for scroll pagination)
export function useBooksInfinite(params: {
  category?: string
  sort?: 'popular' | 'newest' | 'most_discussed'
  limit?: number
} = {}) {
  const getKey = (pageIndex: number, previousPageData: BookList | null) => {
    if (previousPageData && !previousPageData.pagination.has_next) return null
    return `/books?${new URLSearchParams({
      ...params,
      page: (pageIndex + 1).toString(),
    } as Record<string, string>).toString()}`
  }

  const { data, error, size, setSize, isLoading, mutate } = useSWRInfinite<BookList>(
    getKey,
    (url) => {
      const searchParams = new URLSearchParams(url.split('?')[1])
      const fetchParams = {
        ...params,
        page: parseInt(searchParams.get('page') || '1'),
      }
      return api.books.list(fetchParams)
    },
    swrConfig
  )

  const books = data ? data.flatMap(page => page.books) : []
  const hasMore = data ? data[data.length - 1]?.pagination.has_next ?? false : false

  return {
    books,
    isLoading,
    error,
    hasMore,
    loadMore: () => setSize(size + 1),
    mutate,
  }
}

// Hook for popular books - Business Logic: Trending Content Discovery
export function usePopularBooks(
  period: 'today' | 'week' | 'month' | 'all' = 'week',
  limit = 10
) {
  const key = `/books/popular?period=${period}&limit=${limit}`

  const { data, error, isLoading, mutate } = useSWR<BookList>(
    key,
    () => api.books.getPopular(period, limit),
    {
      ...swrConfig,
      refreshInterval: 1000 * 60 * 5, // Refresh every 5 minutes for popular books
    }
  )

  return {
    books: data?.books || [],
    isLoading,
    error,
    mutate,
  }
}

// Hook for a single book - Business Logic: Book Detail Retrieval
export function useBook(bookId: string | null) {
  const key = bookId ? `/books/${bookId}` : null

  const { data, error, isLoading, mutate } = useSWR<BookDetail>(
    key,
    () => bookId ? api.books.getById(bookId) : null,
    swrConfig
  )

  return {
    book: data,
    isLoading,
    error,
    mutate,
  }
}

// Hook for book characters - Business Logic: Character Discovery
export function useBookCharacters(bookId: string | null) {
  const key = bookId ? `/books/${bookId}/characters` : null

  const { data, error, isLoading, mutate } = useSWR<{ characters: Character[] }>(
    key,
    () => bookId ? api.books.getCharacters(bookId) : null,
    swrConfig
  )

  return {
    characters: data?.characters || [],
    isLoading,
    error,
    mutate,
  }
}

// Hook for book search - Business Logic: Question → Book Discovery
export function useBookSearch(
  query: string,
  type: 'question' | 'title' | 'author' = 'question',
  page = 1,
  limit = 10
) {
  const key = query.trim()
    ? `/search?q=${encodeURIComponent(query)}&type=${type}&page=${page}&limit=${limit}`
    : null

  const { data, error, isLoading, mutate } = useSWR<SearchResults>(
    key,
    () => query.trim() ? api.search.searchBooks(query, type, page, limit) : null,
    {
      ...swrConfig,
      dedupingInterval: 1000, // Faster deduping for search
      revalidateOnFocus: false, // Don't auto-refresh search results
    }
  )

  return {
    results: data?.results || [],
    total: data?.total || 0,
    pagination: data ? {
      page: data.page,
      limit: data.limit,
      total: data.total,
    } : null,
    isLoading,
    error,
    mutate,
  }
}

// Hook for search by title - Business Logic: Direct book title search
export function useBookSearchByTitle(title: string, exact = false) {
  const key = title.trim()
    ? `/search/books?title=${encodeURIComponent(title)}&exact=${exact}`
    : null

  const { data, error, isLoading, mutate } = useSWR<BookList>(
    key,
    () => title.trim() ? api.search.searchByTitle(title, exact) : null,
    {
      ...swrConfig,
      revalidateOnFocus: false,
    }
  )

  return {
    books: data?.books || [],
    isLoading,
    error,
    mutate,
  }
}