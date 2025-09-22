/**
 * Books Listing Page
 * Main book discovery interface with filtering, sorting, and search
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBooksInfinite } from '@/hooks/use-books';
import { BookGridInfinite } from '@/components/books/book-grid';
import { BookFilters } from '@/components/books/book-filters';
import { SearchBar } from '@/components/search/search-bar';
import { BookCategory, BookDifficulty, BookSortOption, BookFilters as BookFiltersType } from '@/types/book';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { BookOpen } from 'lucide-react';

export default function BooksPage() {
  const searchParams = useSearchParams();

  // Parse initial state from URL params
  const initialCategory = searchParams.get('category') as BookCategory | null;
  const initialSort = (searchParams.get('sort') as BookSortOption) || BookSortOption.POPULAR;
  const initialSearch = searchParams.get('search') || '';

  // State management
  const [filters, setFilters] = useState<BookFiltersType>({
    category: initialCategory || undefined,
  });
  const [sort, setSort] = useState<BookSortOption>(initialSort);
  const [search, setSearch] = useState(initialSearch);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch books with infinite scrolling
  const {
    books,
    isLoading,
    isLoadingMore,
    hasMore,
    setSize,
    size
  } = useBooksInfinite({
    filters,
    sort,
    search,
    pageSize: 20
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.category) params.set('category', filters.category);
    if (sort !== BookSortOption.POPULAR) params.set('sort', sort);
    if (search) params.set('search', search);

    const newUrl = params.toString() ? `?${params.toString()}` : '/books';
    window.history.replaceState({}, '', newUrl);
  }, [filters, sort, search]);

  // Use useCallback to ensure stable function reference
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      setSize(size + 1);
    }
  }, [size, setSize, isLoadingMore, hasMore]);

  const handleSearch = useCallback((query: string) => {
    setSearch(query);
    setFilters({});
    setSort(BookSortOption.POPULAR);
  }, []);

  const handleReset = useCallback(() => {
    setSearch('');
    setFilters({});
    setSort(BookSortOption.POPULAR);
  }, []);

  // Calculate active filters description
  const getActiveFiltersDescription = () => {
    const parts = [];

    if (search) {
      parts.push(`搜索: "${search}"`);
    }

    if (filters.category) {
      const categoryLabels: Record<BookCategory, string> = {
        [BookCategory.BUSINESS]: '商业',
        [BookCategory.PSYCHOLOGY]: '心理学',
        [BookCategory.FICTION]: '小说',
        [BookCategory.SCIENCE]: '科学',
        [BookCategory.HISTORY]: '历史',
        [BookCategory.PHILOSOPHY]: '哲学'
      };
      parts.push(`类别: ${categoryLabels[filters.category]}`);
    }

    if (filters.difficulty) {
      const difficultyLabels: Record<BookDifficulty, string> = {
        [BookDifficulty.BEGINNER]: '初级',
        [BookDifficulty.INTERMEDIATE]: '中级',
        [BookDifficulty.ADVANCED]: '高级'
      };
      parts.push(`难度: ${difficultyLabels[filters.difficulty]}`);
    }

    if (filters.minRating) {
      parts.push(`评分: ${filters.minRating}星以上`);
    }

    return parts.length > 0 ? parts.join(' • ') : null;
  };

  const activeFiltersDescription = getActiveFiltersDescription();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">首页</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>书籍</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Page Title and Search */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="h-8 w-8 text-primary" />
                探索书籍
              </h1>
              {activeFiltersDescription && (
                <p className="text-sm text-muted-foreground mt-1">
                  {activeFiltersDescription}
                </p>
              )}
            </div>

            {/* Search Bar */}
            <div className="w-full lg:w-96">
              <SearchBar
                placeholder="搜索书籍..."
                defaultValue={search}
                onSearch={handleSearch}
                variant="compact"
                showSuggestions={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Filters and Sort */}
        <div className="mb-6">
          <BookFilters
            filters={filters}
            sort={sort}
            viewMode={viewMode}
            onFiltersChange={setFilters}
            onSortChange={setSort}
            onViewModeChange={setViewMode}
            onReset={handleReset}
          />
        </div>

        {/* Books Grid with Infinite Scroll */}
        <BookGridInfinite
          books={books}
          isLoading={isLoadingMore || isLoading}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          variant={viewMode}
          columns={viewMode === 'grid' ? 4 : 1}
          emptyMessage={
            search
              ? `未找到与 "${search}" 相关的书籍`
              : '暂无书籍，请调整筛选条件'
          }
        />
      </div>
    </div>
  );
}