/**
 * Book data fetching hooks
 * Implements SWR-based data fetching with caching and error handling
 * Aligns with API specification from .futurxlab
 */

import useSWR, { SWRConfiguration, mutate } from 'swr';
import useSWRInfinite from 'swr/infinite';
import { apiClient } from '@/lib/api-client';
import {
  Book,
  BookListResponse,
  BookQueryParams,
  PopularPeriod,
  SearchResponse,
  BookSearchResult
} from '@/types/book';
import { useMemo } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { transformBookListResponse, transformBookData, transformBooksData } from '@/lib/data-transformer';

/**
 * Default SWR configuration for book data
 */
const defaultSWRConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateIfStale: true,
  dedupingInterval: 5000,
};

/**
 * Hook to fetch paginated book list
 * Supports filtering, sorting, and pagination
 */
export function useBooks(params?: BookQueryParams, config?: SWRConfiguration) {
  const queryString = useMemo(() => {
    if (!params) return '';

    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append('page', params.page.toString());
    if (params.pageSize) searchParams.append('limit', params.pageSize.toString());
    if (params.sort) searchParams.append('sort', params.sort);

    // Handle filters
    if (params.filters) {
      const { filters } = params;
      if (filters.category) searchParams.append('category', filters.category);
      if (filters.difficulty) searchParams.append('difficulty', filters.difficulty);
      if (filters.language) searchParams.append('language', filters.language);
      if (filters.minRating !== undefined) searchParams.append('minRating', filters.minRating.toString());
      if (filters.hasCharacters !== undefined) searchParams.append('hasCharacters', filters.hasCharacters.toString());
      if (filters.isVectorized !== undefined) searchParams.append('vectorized', filters.isVectorized.toString());
    }

    if (params.search) searchParams.append('search', params.search);

    return searchParams.toString();
  }, [params]);

  const { data, error, isLoading, isValidating, mutate } = useSWR<BookListResponse>(
    `books${queryString ? `?${queryString}` : ''}`,
    async () => {
      const response = await apiClient.get(`books${queryString ? `?${queryString}` : ''}`);
      return transformBookListResponse(response.data);
    },
    { ...defaultSWRConfig, ...config }
  );

  return {
    books: data?.books || [],
    total: data?.pagination?.total || 0,
    page: data?.pagination?.page || 1,
    pageSize: data?.pagination?.limit || 20,
    hasMore: data?.pagination?.has_next || false,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Hook to fetch books with infinite scrolling
 * Ideal for continuous browsing experience
 */
export function useBooksInfinite(params?: Omit<BookQueryParams, 'page'>, config?: SWRConfiguration) {
  const getKey = (pageIndex: number, previousPageData: BookListResponse | null) => {
    // If no more data, stop fetching
    if (previousPageData && !previousPageData.pagination?.has_next) return null;

    const searchParams = new URLSearchParams();
    searchParams.append('page', (pageIndex + 1).toString());

    if (params?.pageSize) searchParams.append('limit', params.pageSize.toString());
    if (params?.sort) searchParams.append('sort', params.sort);

    // Handle filters
    if (params?.filters) {
      const { filters } = params;
      if (filters.category) searchParams.append('category', filters.category);
      if (filters.difficulty) searchParams.append('difficulty', filters.difficulty);
      if (filters.language) searchParams.append('language', filters.language);
      if (filters.minRating !== undefined) searchParams.append('minRating', filters.minRating.toString());
      if (filters.hasCharacters !== undefined) searchParams.append('hasCharacters', filters.hasCharacters.toString());
      if (filters.isVectorized !== undefined) searchParams.append('vectorized', filters.isVectorized.toString());
    }

    if (params?.search) searchParams.append('search', params.search);

    return `books?${searchParams.toString()}`;
  };

  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite<BookListResponse>(
    getKey,
    async (url) => {
      const response = await apiClient.get(url);
      return transformBookListResponse(response.data);
    },
    {
      ...defaultSWRConfig,
      ...config,
      revalidateFirstPage: false,
      revalidateAll: false
    }
  );

  const books = useMemo(() => {
    if (!data) return [];
    return data.flatMap(page => page.books || []);
  }, [data]);

  const hasMore = useMemo(() => {
    // Don't show "has more" until we have initial data
    if (!data || data.length === 0) return false;
    // Check if the last page has more data
    const lastPage = data[data.length - 1];
    return lastPage?.pagination?.has_next || false;
  }, [data]);

  // Track if initial load is complete
  const isInitialLoading = !data && isLoading;

  return {
    books,
    isLoading: isInitialLoading,
    isLoadingMore: isLoading && data && data.length > 0,
    isValidating,
    error,
    size,
    setSize,
    hasMore,
    mutate,
  };
}

/**
 * Hook to fetch popular books
 * Based on dialogue count within specified period
 */
export function usePopularBooks(
  period: PopularPeriod = PopularPeriod.WEEK,
  limit: number = 10,
  config?: SWRConfiguration
) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ books: Book[] }>(
    `books/popular?period=${period}&limit=${limit}`,
    async () => {
      const response = await apiClient.get(`books/popular?period=${period}&limit=${limit}`);
      return {
        books: transformBooksData(response.data.books || [])
      };
    },
    { ...defaultSWRConfig, ...config }
  );

  return {
    books: data?.books || [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Hook to fetch single book details
 * Includes characters and full metadata
 */
export function useBook(bookId: string | null, config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Book>(
    bookId ? `/books/${bookId}` : null,
    async () => {
      if (!bookId) return null;
      const response = await apiClient.get(`books/${bookId}`);
      return transformBookData(response.data);
    },
    { ...defaultSWRConfig, ...config }
  );

  return {
    book: data,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Hook to search books with debouncing
 * Prevents excessive API calls during typing
 */
export function useBookSearch(
  query: string,
  debounceMs: number = 300,
  config?: SWRConfiguration
) {
  const debouncedQuery = useDebounce(query, debounceMs);

  const { data, error, isLoading, isValidating, mutate } = useSWR<SearchResponse>(
    debouncedQuery ? `search?q=${encodeURIComponent(debouncedQuery)}&type=title` : null,
    async () => {
      if (!debouncedQuery) return null;
      const response = await apiClient.get<SearchResponse>(`search?q=${encodeURIComponent(debouncedQuery)}&type=title`);
      return response.data;
    },
    { ...defaultSWRConfig, ...config }
  );

  return {
    results: data?.results || [],
    total: data?.total || 0,
    suggestions: data?.suggestions || [],
    isLoading: isLoading || (query !== debouncedQuery && query !== ''),
    isValidating,
    error,
    mutate,
  };
}

/**
 * Hook for general search (question-driven discovery)
 * Supports question, title, author, and general searches
 * Implements intelligent search with relevance scoring
 */
export function useGeneralSearch(
  query: string,
  type: 'all' | 'question' | 'title' | 'author' = 'all',
  debounceMs: number = 300,
  config?: SWRConfiguration
) {
  const debouncedQuery = useDebounce(query, debounceMs);

  const { data, error, isLoading, isValidating, mutate } = useSWR<SearchResponse>(
    debouncedQuery ? `search?q=${encodeURIComponent(debouncedQuery)}&type=${type}` : null,
    async () => {
      if (!debouncedQuery) return null;

      // For question-type searches, we might want to preprocess the query
      const processedQuery = type === 'question'
        ? preprocessQuestion(debouncedQuery)
        : debouncedQuery;

      const searchParams = new URLSearchParams();
      searchParams.append('q', processedQuery);
      if (type !== 'all') searchParams.append('type', type);

      const response = await apiClient.get<SearchResponse>(`search?${searchParams.toString()}`);
      const data = response.data;

      // Process results to add client-side relevance scoring if needed
      if (data?.results) {
        data.results = enhanceSearchResults(data.results, debouncedQuery, type);
      }

      return data;
    },
    { ...defaultSWRConfig, ...config }
  );

  return {
    results: data?.results || [],
    total: data?.total || 0,
    suggestions: data?.suggestions || [],
    isLoading: isLoading || (query !== debouncedQuery && query !== ''),
    isValidating,
    error,
    mutate,
  };
}

/**
 * Preprocess question-type queries for better semantic understanding
 */
function preprocessQuestion(query: string): string {
  // Remove common question words that don't add semantic value
  const questionWords = ['什么是', '如何', '怎样', '为什么', '哪些'];
  let processed = query;

  // But keep the structure for API understanding
  // This is where AI preprocessing could happen
  return processed;
}

/**
 * Enhance search results with client-side processing
 */
function enhanceSearchResults(
  results: BookSearchResult[],
  query: string,
  searchType: string
): BookSearchResult[] {
  return results.map(result => {
    // If relevance score is not provided by backend, calculate a basic one
    if (result.relevance_score === undefined) {
      result.relevance_score = calculateRelevance(result.book, query, searchType);
    }

    // Ensure matched_chapters is populated if available
    if (!result.matched_chapters && result.book.chapters) {
      result.matched_chapters = findMatchingChapters(result.book.chapters, query);
    }

    return result;
  });
}

/**
 * Calculate basic relevance score for search results
 */
function calculateRelevance(
  book: Book,
  query: string,
  searchType: string
): number {
  let score = 0;
  const queryLower = query.toLowerCase();

  // Title match
  if (book.title?.toLowerCase().includes(queryLower)) {
    score += searchType === 'title' ? 50 : 30;
  }

  // Author match
  if (book.author?.toLowerCase().includes(queryLower)) {
    score += searchType === 'author' ? 50 : 20;
  }

  // Description match
  if (book.description?.toLowerCase().includes(queryLower)) {
    score += 20;
  }

  // Category relevance
  if (book.category) {
    score += 10;
  }

  // Popularity bonus
  if (book.dialogueCount) {
    score += Math.min(book.dialogueCount / 100, 20);
  }

  // Rating bonus
  if (book.rating) {
    score += book.rating * 2;
  }

  return Math.min(score, 100);
}

/**
 * Find chapters that match the search query
 */
function findMatchingChapters(
  chapters: any[],
  query: string
): any[] {
  if (!chapters || chapters.length === 0) return [];

  const queryLower = query.toLowerCase();
  return chapters
    .filter(chapter =>
      chapter.title?.toLowerCase().includes(queryLower) ||
      chapter.content?.toLowerCase().includes(queryLower)
    )
    .slice(0, 3) // Return top 3 matches
    .map(chapter => ({
      chapter_number: chapter.number || chapter.id,
      chapter_title: chapter.title,
      preview: chapter.content?.substring(0, 200) + '...'
    }));
}

/**
 * Hook for intelligent search with advanced features
 */
export function useIntelligentSearch(
  query: string,
  options?: {
    type?: 'all' | 'question' | 'title' | 'author';
    filters?: any;
    sortBy?: 'relevance' | 'popular' | 'recent' | 'rating';
    page?: number;
    limit?: number;
    debounceMs?: number;
  },
  config?: SWRConfiguration
) {
  const {
    type = 'all',
    filters = {},
    sortBy = 'relevance',
    page = 1,
    limit = 20,
    debounceMs = 300
  } = options || {};

  const debouncedQuery = useDebounce(query, debounceMs);

  // Build search params
  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.append('q', debouncedQuery);
    params.append('type', type);
    params.append('sort', sortBy);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    return params.toString();
  }, [debouncedQuery, type, filters, sortBy, page, limit]);

  const { data, error, isLoading, isValidating, mutate } = useSWR<SearchResponse>(
    searchParams ? `search?${searchParams}` : null,
    () => searchParams
      ? apiClient.get(`search?${searchParams}`).then(res => res.data)
      : null,
    { ...defaultSWRConfig, ...config }
  );

  return {
    results: data?.results || [],
    total: data?.total || 0,
    suggestions: data?.suggestions || [],
    isLoading: isLoading || (query !== debouncedQuery && query !== ''),
    isValidating,
    error,
    mutate,
    hasMore: data?.results ? data.results.length === limit : false,
  };
}

/**
 * Hook to get book recommendations
 * Based on user's interaction history
 */
export function useBookRecommendations(limit: number = 5, config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Book[]>(
    '/books/recommendations',
    () => apiClient.get(`books/recommendations?limit=${limit}`).then(res => res.data),
    {
      ...defaultSWRConfig,
      ...config,
      // Only fetch if user is authenticated
      suspense: false,
      shouldRetryOnError: false,
    }
  );

  return {
    recommendations: data || [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Hook to fetch recently viewed books
 * Stored in localStorage for anonymous users
 */
export function useRecentlyViewedBooks(limit: number = 5) {
  const { data, mutate } = useSWR<string[]>(
    'recently-viewed-books',
    () => {
      const stored = localStorage.getItem('recently-viewed-books');
      return stored ? JSON.parse(stored).slice(0, limit) : [];
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const bookIds = data || [];

  // Fetch book details for recently viewed IDs
  const { data: books, isLoading } = useSWR<Book[]>(
    bookIds.length > 0 ? `/books/batch?ids=${bookIds.join(',')}` : null,
    () => bookIds.length > 0
      ? apiClient.get(`books/batch?ids=${bookIds.join(',')}`).then(res => res.data)
      : [],
    {
      revalidateOnFocus: false,
    }
  );

  const addRecentlyViewed = (bookId: string) => {
    const stored = localStorage.getItem('recently-viewed-books');
    const current = stored ? JSON.parse(stored) : [];
    const updated = [bookId, ...current.filter((id: string) => id !== bookId)].slice(0, 20);
    localStorage.setItem('recently-viewed-books', JSON.stringify(updated));
    mutate(updated.slice(0, limit));
  };

  return {
    books: books || [],
    isLoading,
    addRecentlyViewed,
  };
}

/**
 * Utility function to prefetch book data
 * Improves perceived performance
 */
export async function prefetchBook(bookId: string) {
  const data = await apiClient.get(`books/${bookId}`).then(res => res.data);
  mutate(`/books/${bookId}`, data, false);
  return data;
}

/**
 * Utility function to invalidate book caches
 * Use after mutations or updates
 */
export function invalidateBookCaches() {
  mutate((key) => typeof key === 'string' && key.startsWith('/books'), undefined, { revalidate: true });
}