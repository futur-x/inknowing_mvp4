/**
 * Search Utility Functions
 * Provides helper functions for intelligent search functionality
 * Business Logic: Enhances search experience with smart features
 */

/**
 * Search history management
 */
const SEARCH_HISTORY_KEY = 'search-history';
const MAX_SEARCH_HISTORY = 20;

export interface SearchHistoryItem {
  query: string;
  type: 'question' | 'title' | 'author' | 'all';
  timestamp: number;
  resultCount?: number;
}

/**
 * Get search history from localStorage
 */
export function getSearchHistory(): SearchHistoryItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Failed to parse search history:', error);
    return [];
  }
}

/**
 * Add item to search history
 */
export function addToSearchHistory(item: Omit<SearchHistoryItem, 'timestamp'>) {
  if (typeof window === 'undefined' || !item.query.trim()) return;

  try {
    const history = getSearchHistory();

    // Remove duplicate queries
    const filtered = history.filter(h => h.query !== item.query);

    // Add new item at the beginning
    const newHistory = [
      { ...item, timestamp: Date.now() },
      ...filtered
    ].slice(0, MAX_SEARCH_HISTORY);

    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error('Failed to save search history:', error);
  }
}

/**
 * Clear search history
 */
export function clearSearchHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

/**
 * Get recent searches (simplified list)
 */
export function getRecentSearches(limit: number = 5): string[] {
  const history = getSearchHistory();
  return [...new Set(history.map(h => h.query))].slice(0, limit);
}

/**
 * Search suggestions management
 */
const SEARCH_SUGGESTIONS_CACHE_KEY = 'search-suggestions-cache';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

interface SuggestionsCache {
  [key: string]: {
    suggestions: string[];
    timestamp: number;
  };
}

/**
 * Get cached suggestions
 */
export function getCachedSuggestions(query: string): string[] | null {
  if (typeof window === 'undefined') return null;

  try {
    const cache = localStorage.getItem(SEARCH_SUGGESTIONS_CACHE_KEY);
    if (!cache) return null;

    const parsed: SuggestionsCache = JSON.parse(cache);
    const cached = parsed[query.toLowerCase()];

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.suggestions;
    }

    return null;
  } catch (error) {
    console.error('Failed to get cached suggestions:', error);
    return null;
  }
}

/**
 * Cache search suggestions
 */
export function cacheSuggestions(query: string, suggestions: string[]) {
  if (typeof window === 'undefined') return;

  try {
    const cache = localStorage.getItem(SEARCH_SUGGESTIONS_CACHE_KEY);
    const parsed: SuggestionsCache = cache ? JSON.parse(cache) : {};

    parsed[query.toLowerCase()] = {
      suggestions,
      timestamp: Date.now()
    };

    // Clean up old entries
    Object.keys(parsed).forEach(key => {
      if (Date.now() - parsed[key].timestamp > CACHE_DURATION) {
        delete parsed[key];
      }
    });

    localStorage.setItem(SEARCH_SUGGESTIONS_CACHE_KEY, JSON.stringify(parsed));
  } catch (error) {
    console.error('Failed to cache suggestions:', error);
  }
}

/**
 * Query processing utilities
 */

/**
 * Detect search type from query
 */
export function detectSearchType(query: string): 'question' | 'title' | 'author' | 'all' {
  const questionPatterns = [
    /^(什么|如何|怎样|为什么|哪些|谁|何时|何地|是否)/,
    /\?$/,
    /^(what|how|why|when|where|who|which)/i,
  ];

  const authorPatterns = [
    /^(作者|author)[:：]/i,
    /\s+(的书|著作|作品)$/,
  ];

  // Check for question patterns
  if (questionPatterns.some(pattern => pattern.test(query))) {
    return 'question';
  }

  // Check for author patterns
  if (authorPatterns.some(pattern => pattern.test(query))) {
    return 'author';
  }

  // If it's a short query (1-3 words), likely a title or author name
  const wordCount = query.split(/\s+/).length;
  if (wordCount <= 3) {
    // Check if it looks like a person's name
    const namePattern = /^[\u4e00-\u9fa5]{2,4}$|^[A-Za-z]+\s+[A-Za-z]+$/;
    if (namePattern.test(query)) {
      return 'author';
    }
    return 'title';
  }

  return 'all';
}

/**
 * Extract keywords from query
 */
export function extractKeywords(query: string): string[] {
  // Remove common stop words
  const stopWords = new Set([
    '的', '是', '在', '有', '和', '了', '与', '及', '等', '对', '于',
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'
  ]);

  // Split by spaces and punctuation
  const words = query
    .toLowerCase()
    .split(/[\s，。！？、,.\?!]+/)
    .filter(word => word.length > 1 && !stopWords.has(word));

  return [...new Set(words)];
}

/**
 * Generate related searches
 */
export function generateRelatedSearches(query: string, results: any[]): string[] {
  const keywords = extractKeywords(query);
  const related: string[] = [];

  // Based on categories in results
  const categories = [...new Set(results.map(r => r.book?.category).filter(Boolean))];
  categories.forEach(cat => {
    related.push(`${cat}相关书籍`);
  });

  // Based on authors in results
  const authors = [...new Set(results.map(r => r.book?.author).filter(Boolean))];
  authors.slice(0, 2).forEach(author => {
    related.push(`${author}的其他作品`);
  });

  // Variations of the original query
  if (detectSearchType(query) === 'question') {
    keywords.forEach(keyword => {
      related.push(`关于${keyword}的书籍`);
    });
  }

  return [...new Set(related)].slice(0, 5);
}

/**
 * Highlight text with search query
 */
export function highlightSearchText(
  text: string,
  query: string,
  className: string = 'bg-yellow-200 dark:bg-yellow-900'
): string {
  if (!query || !text) return text;

  const keywords = extractKeywords(query);
  let highlighted = text;

  keywords.forEach(keyword => {
    const regex = new RegExp(`(${keyword})`, 'gi');
    highlighted = highlighted.replace(
      regex,
      `<mark class="${className}">$1</mark>`
    );
  });

  return highlighted;
}

/**
 * Search analytics
 */
interface SearchAnalytics {
  totalSearches: number;
  popularQueries: { query: string; count: number }[];
  searchTypes: { [key: string]: number };
  averageResultCount: number;
}

/**
 * Track search event
 */
export function trackSearchEvent(
  query: string,
  type: string,
  resultCount: number
) {
  if (typeof window === 'undefined') return;

  try {
    const analyticsKey = 'search-analytics';
    const analytics = localStorage.getItem(analyticsKey);
    const data = analytics ? JSON.parse(analytics) : { events: [] };

    data.events.push({
      query,
      type,
      resultCount,
      timestamp: Date.now()
    });

    // Keep only last 100 events
    data.events = data.events.slice(-100);

    localStorage.setItem(analyticsKey, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to track search event:', error);
  }
}

/**
 * Get search analytics
 */
export function getSearchAnalytics(): SearchAnalytics {
  if (typeof window === 'undefined') {
    return {
      totalSearches: 0,
      popularQueries: [],
      searchTypes: {},
      averageResultCount: 0
    };
  }

  try {
    const analyticsKey = 'search-analytics';
    const analytics = localStorage.getItem(analyticsKey);

    if (!analytics) {
      return {
        totalSearches: 0,
        popularQueries: [],
        searchTypes: {},
        averageResultCount: 0
      };
    }

    const data = JSON.parse(analytics);
    const events = data.events || [];

    // Calculate popular queries
    const queryCount: { [key: string]: number } = {};
    const typeCount: { [key: string]: number } = {};
    let totalResults = 0;

    events.forEach((event: any) => {
      queryCount[event.query] = (queryCount[event.query] || 0) + 1;
      typeCount[event.type] = (typeCount[event.type] || 0) + 1;
      totalResults += event.resultCount || 0;
    });

    const popularQueries = Object.entries(queryCount)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalSearches: events.length,
      popularQueries,
      searchTypes: typeCount,
      averageResultCount: events.length > 0 ? totalResults / events.length : 0
    };
  } catch (error) {
    console.error('Failed to get search analytics:', error);
    return {
      totalSearches: 0,
      popularQueries: [],
      searchTypes: {},
      averageResultCount: 0
    };
  }
}

/**
 * Smart query suggestions
 */
export function getSmartSuggestions(
  query: string,
  searchType: string
): string[] {
  const suggestions: string[] = [];
  const keywords = extractKeywords(query);

  if (searchType === 'question') {
    // Suggest related questions
    const questionStarters = ['如何', '为什么', '什么是', '怎样'];
    questionStarters.forEach(starter => {
      keywords.forEach(keyword => {
        suggestions.push(`${starter}${keyword}？`);
      });
    });
  } else if (searchType === 'author') {
    // Suggest author-related searches
    suggestions.push(`${query}的代表作`);
    suggestions.push(`${query}的最新作品`);
    suggestions.push(`类似${query}的作者`);
  } else if (searchType === 'title') {
    // Suggest title-related searches
    suggestions.push(`${query}系列`);
    suggestions.push(`${query}相关书籍`);
    suggestions.push(`${query}的作者`);
  }

  return [...new Set(suggestions)].slice(0, 5);
}

/**
 * Spell check and correction suggestions
 */
export function getSpellingSuggestions(query: string): string[] {
  // This would integrate with a spell checking service
  // For now, return empty array
  return [];
}

/**
 * Format search query for API
 */
export function formatSearchQuery(query: string): string {
  // Trim whitespace
  let formatted = query.trim();

  // Remove multiple spaces
  formatted = formatted.replace(/\s+/g, ' ');

  // Remove special characters that might break the search
  formatted = formatted.replace(/[<>]/g, '');

  return formatted;
}