/**
 * Search Results Component
 * Displays search results with relevance scoring and highlighting
 * Business Logic: Presents books that answer user questions
 */

'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Book, Star, MessageSquare, Users, ChevronRight, Sparkles, TrendingUp, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useGeneralSearch } from '@/hooks/use-books';
import { SearchType, SearchFilters as FilterType, SortBy } from '@/app/search/page';
import { cn } from '@/lib/utils';
import { Book as BookType, BookSearchResult } from '@/types/book';

interface SearchResultsProps {
  query: string;
  searchType: SearchType;
  filters: FilterType;
  sortBy: SortBy;
  isSearching?: boolean;
}

/**
 * Highlight matching text in results
 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 dark:bg-yellow-900 font-semibold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

/**
 * Single search result card
 */
function SearchResultCard({
  result,
  query,
  onClick
}: {
  result: BookSearchResult;
  query: string;
  onClick: () => void;
}) {
  const { book, relevance_score, matched_chapters } = result;

  return (
    <Card
      className="hover:shadow-lg transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
              {highlightText(book.title, query)}
            </CardTitle>
            <CardDescription className="mt-1">
              作者：{highlightText(book.author || '未知', query)}
            </CardDescription>
          </div>

          {/* Relevance Score */}
          {relevance_score !== undefined && (
            <div className="flex items-center gap-1 ml-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                {Math.round(relevance_score)}%
              </span>
            </div>
          )}
        </div>

        {/* Book metadata badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {book.category && (
            <Badge variant="secondary">{book.category}</Badge>
          )}
          {book.language && (
            <Badge variant="outline">{book.language}</Badge>
          )}
          {book.difficulty && (
            <Badge variant="outline">{book.difficulty}</Badge>
          )}
          {book.hasCharacters && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              角色对话
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Book description with highlighting */}
        {book.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {highlightText(book.description, query)}
          </p>
        )}

        {/* Matched chapters preview */}
        {matched_chapters && matched_chapters.length > 0 && (
          <div className="space-y-2 mb-3">
            <p className="text-xs font-semibold text-muted-foreground">相关章节：</p>
            {matched_chapters.slice(0, 2).map((chapter, index) => (
              <div key={index} className="text-xs bg-secondary/50 p-2 rounded">
                <p className="font-medium">第 {chapter.chapter_number} 章：{chapter.chapter_title}</p>
                {chapter.preview && (
                  <p className="text-muted-foreground mt-1 line-clamp-2">
                    {highlightText(chapter.preview, query)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Book stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            {book.rating !== undefined && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{book.rating.toFixed(1)}</span>
              </div>
            )}
            {book.dialogueCount !== undefined && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span>{book.dialogueCount.toLocaleString()} 对话</span>
              </div>
            )}
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for search results
 */
function SearchResultsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
            <div className="flex gap-2 mt-3">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full" />
            <div className="flex justify-between mt-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Main Search Results Component
 */
export function SearchResults({
  query,
  searchType,
  filters,
  sortBy,
  isSearching = false
}: SearchResultsProps) {
  const router = useRouter();

  // Convert SearchType to API type parameter
  const apiSearchType = useMemo(() => {
    switch (searchType) {
      case SearchType.QUESTION:
        return 'question';
      case SearchType.TITLE:
        return 'title';
      case SearchType.AUTHOR:
        return 'author';
      case SearchType.ALL:
      default:
        return 'all';
    }
  }, [searchType]);

  // Fetch search results
  const { results, total, suggestions, isLoading, error } = useGeneralSearch(
    query,
    apiSearchType as any,
    300
  );

  // Apply client-side filtering and sorting
  const filteredAndSortedResults = useMemo(() => {
    let filtered = [...results];

    // Apply filters
    if (filters.category) {
      filtered = filtered.filter(r => r.book.category === filters.category);
    }
    if (filters.language) {
      filtered = filtered.filter(r => r.book.language === filters.language);
    }
    if (filters.difficulty) {
      filtered = filtered.filter(r => r.book.difficulty === filters.difficulty);
    }
    if (filters.minRating !== undefined) {
      filtered = filtered.filter(r => (r.book.rating || 0) >= filters.minRating!);
    }
    if (filters.hasCharacters !== undefined) {
      filtered = filtered.filter(r => r.book.hasCharacters === filters.hasCharacters);
    }
    if (filters.isVectorized !== undefined) {
      filtered = filtered.filter(r => r.book.isVectorized === filters.isVectorized);
    }

    // Apply sorting
    switch (sortBy) {
      case SortBy.RELEVANCE:
        filtered.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
        break;
      case SortBy.POPULAR:
        filtered.sort((a, b) => (b.book.dialogueCount || 0) - (a.book.dialogueCount || 0));
        break;
      case SortBy.RECENT:
        filtered.sort((a, b) =>
          new Date(b.book.createdAt || 0).getTime() - new Date(a.book.createdAt || 0).getTime()
        );
        break;
      case SortBy.RATING:
        filtered.sort((a, b) => (b.book.rating || 0) - (a.book.rating || 0));
        break;
    }

    return filtered;
  }, [results, filters, sortBy]);

  // Handle book click
  const handleBookClick = (book: BookType) => {
    router.push(`/books/${book.id}`);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    window.location.href = `/search?q=${encodeURIComponent(suggestion)}&type=${searchType}`;
  };

  // Show loading state
  if (isLoading || isSearching) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-muted-foreground">正在搜索...</span>
          </div>
        </div>
        <SearchResultsSkeleton />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>搜索出错</AlertTitle>
        <AlertDescription>
          无法获取搜索结果，请稍后重试。
        </AlertDescription>
      </Alert>
    );
  }

  // Show results
  return (
    <div>
      {/* Results header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">
            搜索结果
            {total > 0 && (
              <span className="text-muted-foreground font-normal ml-2">
                （找到 {total} 个结果）
              </span>
            )}
          </h2>
          {searchType === SearchType.QUESTION && (
            <p className="text-sm text-muted-foreground mt-1">
              以下书籍可能包含您问题的答案
            </p>
          )}
        </div>
      </div>

      {/* Related suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">您可能还想搜索：</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Search results */}
      {filteredAndSortedResults.length > 0 ? (
        <div className="space-y-4">
          {filteredAndSortedResults.map((result) => (
            <SearchResultCard
              key={result.book.id}
              result={result}
              query={query}
              onClick={() => handleBookClick(result.book)}
            />
          ))}
        </div>
      ) : (
        // Empty state
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">未找到相关结果</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {searchType === SearchType.QUESTION
                ? '尝试换个问题或使用更具体的关键词'
                : '尝试调整搜索词或筛选条件'}
            </p>

            {/* Suggestions for better search */}
            <div className="mt-6 space-y-2 text-sm text-muted-foreground">
              <p className="font-medium">搜索建议：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>使用更具体或更通用的关键词</li>
                <li>检查拼写是否正确</li>
                <li>尝试不同的搜索类型</li>
                <li>减少筛选条件</li>
              </ul>
            </div>

            <Button
              variant="outline"
              className="mt-6"
              onClick={() => window.location.href = '/books'}
            >
              浏览所有书籍
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Load more button (if needed for pagination) */}
      {filteredAndSortedResults.length > 0 && filteredAndSortedResults.length < total && (
        <div className="flex justify-center mt-6">
          <Button variant="outline">
            加载更多结果
          </Button>
        </div>
      )}
    </div>
  );
}