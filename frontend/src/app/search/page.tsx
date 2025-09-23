/**
 * Search Page - Intelligent Search Experience
 * Provides question-driven book discovery with AI-powered search
 * Business Logic: Question → Book Discovery → Dialogue
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Filter, TrendingUp, Sparkles, BookOpen, MessageSquare } from 'lucide-react';
import { SearchBar } from '@/components/search/search-bar';
import { SearchFilters } from '@/components/search/search-filters';
import { SearchResults } from '@/components/search/search-results';
import { SearchSuggestions } from '@/components/search/search-suggestions';
import { TrendingSearches } from '@/components/search/trending-searches';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

/**
 * Search type options
 */
enum SearchType {
  QUESTION = 'question',
  TITLE = 'title',
  AUTHOR = 'author',
  ALL = 'all'
}

/**
 * Search filters interface
 */
export interface SearchFilters {
  category?: string;
  language?: string;
  difficulty?: string;
  minRating?: number;
  hasCharacters?: boolean;
  isVectorized?: boolean;
}

/**
 * Sort options
 */
export enum SortBy {
  RELEVANCE = 'relevance',
  POPULAR = 'popular',
  RECENT = 'recent',
  RATING = 'rating'
}

function SearchPageContent() {
  const searchParams = useSearchParams();

  // State management
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState<SearchType>(
    (searchParams.get('type') as SearchType) || SearchType.QUESTION
  );
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortBy, setSortBy] = useState<SortBy>(SortBy.RELEVANCE);
  const [showFilters, setShowFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Update query from URL params
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    const urlType = searchParams.get('type');

    if (urlQuery) {
      setQuery(urlQuery);
    }

    if (urlType) {
      setSearchType(urlType as SearchType);
    }
  }, [searchParams]);

  /**
   * Handle search execution
   */
  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
    setIsSearching(true);

    // Update URL
    const params = new URLSearchParams();
    params.set('q', newQuery);
    params.set('type', searchType);

    window.history.pushState(null, '', `/search?${params.toString()}`);

    // Search will be triggered by the SearchResults component
    setTimeout(() => setIsSearching(false), 500);
  };

  /**
   * Handle filter changes
   */
  const handleFilterChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setFilters({});
  };

  /**
   * Get active filter count
   */
  const getActiveFilterCount = () => {
    return Object.keys(filters).filter(key =>
      filters[key as keyof SearchFilters] !== undefined
    ).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
      {/* Header Section */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4">
            {/* Title and Description */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                  智能搜索
                </h1>
                <p className="text-muted-foreground mt-1">
                  提出问题，发现答案，开启对话
                </p>
              </div>

              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                筛选
                {getActiveFilterCount() > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {getActiveFilterCount()}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Search Bar */}
            <div className="w-full">
              <SearchBar
                placeholder={
                  searchType === SearchType.QUESTION
                    ? "提出您的问题，我们帮您找到答案..."
                    : searchType === SearchType.TITLE
                    ? "搜索书名..."
                    : searchType === SearchType.AUTHOR
                    ? "搜索作者..."
                    : "搜索书籍、问题或作者..."
                }
                defaultValue={query}
                onSearch={handleSearch}
                variant="hero"
                showSuggestions={true}
                showRecentSearches={true}
              />
            </div>

            {/* Search Type Tabs */}
            <Tabs value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
              <TabsList className="grid w-full max-w-md grid-cols-4">
                <TabsTrigger value={SearchType.QUESTION} className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  问题
                </TabsTrigger>
                <TabsTrigger value={SearchType.TITLE} className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  书名
                </TabsTrigger>
                <TabsTrigger value={SearchType.AUTHOR}>
                  作者
                </TabsTrigger>
                <TabsTrigger value={SearchType.ALL}>
                  全部
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">排序：</span>
              <div className="flex gap-2">
                {Object.values(SortBy).map((sort) => (
                  <Button
                    key={sort}
                    variant={sortBy === sort ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSortBy(sort)}
                  >
                    {sort === SortBy.RELEVANCE && '相关性'}
                    {sort === SortBy.POPULAR && '热门'}
                    {sort === SortBy.RECENT && '最新'}
                    {sort === SortBy.RATING && '评分'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Filters */}
          <div className={cn(
            "lg:col-span-1",
            !showFilters && "hidden lg:block"
          )}>
            <div className="sticky top-4">
              <SearchFilters
                filters={filters}
                onChange={handleFilterChange}
                onClear={clearFilters}
              />

              {/* Trending Searches */}
              <div className="mt-6">
                <TrendingSearches />
              </div>
            </div>
          </div>

          {/* Main Content - Results */}
          <div className={cn(
            "lg:col-span-3",
            showFilters ? "lg:col-span-3" : "lg:col-span-4"
          )}>
            {/* Search Suggestions (when no query) */}
            {!query && (
              <div className="mb-6">
                <SearchSuggestions
                  searchType={searchType}
                  onSuggestionClick={handleSearch}
                />
              </div>
            )}

            {/* Search Results */}
            {query && (
              <SearchResults
                query={query}
                searchType={searchType}
                filters={filters}
                sortBy={sortBy}
                isSearching={isSearching}
              />
            )}

            {/* Empty State */}
            {!query && (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">开始您的探索之旅</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  输入您的问题或关键词，让 AI 帮您找到最相关的书籍和答案
                </p>

                {/* Quick Search Examples */}
                <div className="mt-8">
                  <p className="text-sm text-muted-foreground mb-3">试试这些问题：</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearch('如何提高学习效率？')}
                    >
                      如何提高学习效率？
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearch('人工智能的未来是什么？')}
                    >
                      人工智能的未来是什么？
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearch('如何管理时间？')}
                    >
                      如何管理时间？
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearch('什么是区块链技术？')}
                    >
                      什么是区块链技术？
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Search Page Component
 */
export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}