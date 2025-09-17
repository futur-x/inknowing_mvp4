/**
 * Book-related type definitions
 * Based on API specification from .futurxlab/api-specification.yaml
 * Maintains business logic conservation between API and frontend
 */

/**
 * Book category enum matching API specification
 */
export enum BookCategory {
  BUSINESS = 'business',
  PSYCHOLOGY = 'psychology',
  FICTION = 'fiction',
  SCIENCE = 'science',
  HISTORY = 'history',
  PHILOSOPHY = 'philosophy'
}

/**
 * Book status enum
 */
export enum BookStatus {
  PUBLISHED = 'published',
  DRAFT = 'draft',
  REVIEW = 'review',
  PROCESSING = 'processing'
}

/**
 * Book difficulty levels
 */
export enum BookDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

/**
 * Upload source types
 */
export enum UploadSource {
  USER = 'user',
  ADMIN = 'admin',
  SYSTEM = 'system'
}

/**
 * Sort options for book listings
 */
export enum BookSortOption {
  POPULAR = 'popular',
  RECENT = 'recent',
  RATING = 'rating',
  TITLE = 'title'
}

/**
 * Book character type for dialogue
 */
export interface BookCharacter {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  personality?: string;
  dialogueStyle?: string;
  isMainCharacter: boolean;
  isAvailable: boolean;
}

/**
 * Core book type matching API schema
 */
export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  description: string;
  category: BookCategory;
  difficulty: BookDifficulty;
  language: string;
  publishDate?: string;
  pageCount?: number;
  publisher?: string;
  rating: number;
  ratingCount: number;
  dialogueCount: number;
  uploadSource: UploadSource;
  uploadedBy?: string;
  status: BookStatus;
  vectorized: boolean;
  vectorizationProgress?: number;
  characters?: BookCharacter[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Book list response with pagination
 */
export interface BookListResponse {
  books: Book[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

/**
 * Book search result
 */
export interface BookSearchResult {
  book: Book;
  relevanceScore: number;
  matchedQuery?: string;
  snippet?: string;
}

/**
 * Search response
 */
export interface SearchResponse {
  results: BookSearchResult[];
  total: number;
  query: string;
  suggestions?: string[];
}

/**
 * Book filter parameters
 */
export interface BookFilters {
  category?: BookCategory;
  difficulty?: BookDifficulty;
  language?: string;
  minRating?: number;
  hasCharacters?: boolean;
  isVectorized?: boolean;
}

/**
 * Book query parameters for API requests
 */
export interface BookQueryParams {
  page?: number;
  pageSize?: number;
  sort?: BookSortOption;
  filters?: BookFilters;
  search?: string;
}

/**
 * Popular books period options
 */
export enum PopularPeriod {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  ALL = 'all'
}

/**
 * Book statistics for display
 */
export interface BookStats {
  totalBooks: number;
  totalDialogues: number;
  activeUsers: number;
  averageRating: number;
}

/**
 * Book recommendation based on user behavior
 */
export interface BookRecommendation {
  book: Book;
  reason: string;
  score: number;
}

/**
 * User book interaction tracking
 */
export interface UserBookInteraction {
  bookId: string;
  lastViewed: string;
  viewCount: number;
  hasDialogue: boolean;
  isFavorite: boolean;
}