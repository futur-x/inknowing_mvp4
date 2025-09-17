/**
 * Book Grid Component
 * Displays books in a responsive grid layout
 * Supports skeleton loading and empty states
 */

'use client';

import React from 'react';
import { Book } from '@/types/book';
import { BookCard } from './book-card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Search } from 'lucide-react';

interface BookGridProps {
  books: Book[];
  isLoading?: boolean;
  variant?: 'grid' | 'list';
  columns?: 2 | 3 | 4 | 5 | 6;
  showActions?: boolean;
  onQuickView?: (book: Book) => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  className?: string;
  skeletonCount?: number;
}

/**
 * Column class mapping for responsive grid
 */
const columnClasses: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6',
};

/**
 * Book Skeleton Component for loading state
 */
function BookSkeleton({ variant }: { variant: 'grid' | 'list' }) {
  if (variant === 'list') {
    return (
      <div className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg">
        <Skeleton className="w-full md:w-32 h-48 md:h-44 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <div className="flex md:flex-col gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Skeleton className="aspect-[3/4]" />
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      </div>
    </div>
  );
}

/**
 * Empty State Component
 */
function EmptyState({
  message,
  icon
}: {
  message: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-muted p-4 mb-4">
        {icon}
      </div>
      <p className="text-lg font-medium text-muted-foreground text-center">
        {message}
      </p>
    </div>
  );
}

export function BookGrid({
  books,
  isLoading = false,
  variant = 'grid',
  columns = 4,
  showActions = true,
  onQuickView,
  emptyMessage = '暂无书籍',
  emptyIcon = <BookOpen className="h-8 w-8 text-muted-foreground" />,
  className,
  skeletonCount = 8
}: BookGridProps) {
  // Ensure books is always an array
  const booksList = Array.isArray(books) ? books : [];

  // Show skeleton loading state
  if (isLoading && booksList.length === 0) {
    if (variant === 'list') {
      return (
        <div className="space-y-4">
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <BookSkeleton key={index} variant="list" />
          ))}
        </div>
      );
    }

    return (
      <div className={cn(
        'grid gap-4',
        columnClasses[columns],
        className
      )}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <BookSkeleton key={index} variant="grid" />
        ))}
      </div>
    );
  }

  // Show empty state
  if (!isLoading && booksList.length === 0) {
    return <EmptyState message={emptyMessage} icon={emptyIcon} />;
  }

  // List view
  if (variant === 'list') {
    return (
      <div className={cn('space-y-4', className)}>
        {booksList.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            variant="list"
            showActions={showActions}
            onQuickView={onQuickView}
          />
        ))}
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className={cn(
      'grid gap-4',
      columnClasses[columns],
      className
    )}>
      {booksList.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          variant="grid"
          showActions={showActions}
          onQuickView={onQuickView}
        />
      ))}
    </div>
  );
}

/**
 * Book Grid with Load More
 * Used with infinite scrolling
 */
export function BookGridInfinite({
  books,
  isLoading,
  hasMore,
  onLoadMore,
  ...props
}: BookGridProps & {
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  const observerRef = React.useRef<IntersectionObserver>();
  const loadMoreRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMore) {
          onLoadMore();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isLoading, hasMore, onLoadMore]
  );

  return (
    <>
      <BookGrid books={books} isLoading={false} {...props} />

      {/* Load more trigger */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="flex justify-center py-8"
        >
          {isLoading && (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">加载更多...</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}