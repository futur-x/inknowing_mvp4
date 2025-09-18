/**
 * Search Bar Component
 * Provides search functionality with auto-complete and suggestions
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, BookOpen, HelpCircle, TrendingUp, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBookSearch } from '@/hooks/use-books';
import { useRouter } from 'next/navigation';
import { Book } from '@/types/book';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';

interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  onSearch?: (query: string) => void;
  variant?: 'default' | 'hero' | 'compact';
  showSuggestions?: boolean;
  showRecentSearches?: boolean;
  className?: string;
}

/**
 * Get recent searches from localStorage
 */
function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  const searches = localStorage.getItem('recent-searches');
  return searches ? JSON.parse(searches) : [];
}

/**
 * Save search to recent searches
 */
function saveRecentSearch(query: string) {
  if (typeof window === 'undefined' || !query.trim()) return;
  const searches = getRecentSearches();
  const updated = [query, ...searches.filter(s => s !== query)].slice(0, 5);
  localStorage.setItem('recent-searches', JSON.stringify(updated));
}

export function SearchBar({
  placeholder = '搜索书籍或提出问题...',
  defaultValue = '',
  onSearch,
  variant = 'default',
  showSuggestions = true,
  showRecentSearches = true,
  className
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch search results with debouncing
  const { results, suggestions, isLoading } = useBookSearch(query);

  // Load recent searches on mount
  useEffect(() => {
    if (showRecentSearches) {
      setRecentSearches(getRecentSearches());
    }
  }, [showRecentSearches]);

  const handleSearch = (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    saveRecentSearch(searchQuery);
    setIsOpen(false);

    if (onSearch) {
      onSearch(searchQuery);
    } else {
      // Default behavior: navigate to books page with search
      router.push(`/books?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const handleBookClick = (book: Book) => {
    setIsOpen(false);
    router.push(`/books/${book.id}`);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    handleSearch(search);
  };

  // Variant styles
  const containerStyles = {
    default: 'w-full max-w-2xl',
    hero: 'w-full max-w-3xl',
    compact: 'w-full max-w-sm'
  };

  const inputStyles = {
    default: 'h-12 pl-12 pr-12 text-base',
    hero: 'h-14 pl-14 pr-14 text-lg',
    compact: 'h-10 pl-10 pr-10 text-sm'
  };

  const iconSizes = {
    default: 'h-5 w-5',
    hero: 'h-6 w-6',
    compact: 'h-4 w-4'
  };

  return (
    <div className={cn(containerStyles[variant], className)}>
      <div className="relative">
        <Search className={cn(
          'absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10',
          iconSizes[variant]
        )} />

        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={(e) => {
            // Only close if clicking outside the popover
            setTimeout(() => {
              if (!e.currentTarget.contains(document.activeElement)) {
                setIsOpen(false);
              }
            }, 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            inputStyles[variant],
            'transition-all',
            className
          )}
        />

        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-12 top-1/2 -translate-y-1/2 h-8 w-8 p-0 z-10"
          >
            <X className={iconSizes[variant]} />
          </Button>
        )}

        <Button
          onClick={() => handleSearch()}
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 z-10"
        >
          <Search className={iconSizes[variant]} />
        </Button>

        {(isOpen && showSuggestions) && (
          <div className="absolute top-full left-0 right-0 z-50 mt-2">
            <Command className="rounded-lg border shadow-md bg-popover">
              <CommandList className="max-h-[300px] overflow-y-auto">
              {/* Recent Searches */}
              {showRecentSearches && recentSearches.length > 0 && !query && (
                <CommandGroup heading="最近搜索">
                  {recentSearches.map((search) => (
                    <CommandItem
                      key={search}
                      onSelect={() => handleRecentSearchClick(search)}
                    >
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{search}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Search Suggestions */}
              {suggestions.length > 0 && (
                <CommandGroup heading="搜索建议">
                  {suggestions.map((suggestion) => (
                    <CommandItem
                      key={suggestion}
                      onSelect={() => handleSuggestionClick(suggestion)}
                    >
                      <TrendingUp className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{suggestion}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Book Results */}
              {results.length > 0 && (
                <CommandGroup heading="相关书籍">
                  {results.slice(0, 5).map((result) => (
                    <CommandItem
                      key={result.book.id}
                      onSelect={() => handleBookClick(result.book)}
                    >
                      <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{result.book.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {result.book.author}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Question Search Option */}
              {query && (
                <CommandGroup heading="提问">
                  <CommandItem
                    onSelect={() => handleSearch()}
                  >
                    <HelpCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>搜索 "{query}"</span>
                  </CommandItem>
                </CommandGroup>
              )}

              {/* Empty State */}
              {query && !isLoading && results.length === 0 && suggestions.length === 0 && (
                <CommandEmpty>
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">
                      未找到相关结果
                    </p>
                    <Button
                      variant="link"
                      onClick={() => handleSearch()}
                      className="mt-2"
                    >
                      搜索全部内容
                    </Button>
                  </div>
                </CommandEmpty>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="ml-2 text-sm text-muted-foreground">搜索中...</span>
                </div>
              )}
              </CommandList>
            </Command>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hero Search Bar - Used on homepage
 */
export function HeroSearchBar({ className, ...props }: SearchBarProps) {
  return (
    <SearchBar
      variant="hero"
      className={cn('mx-auto', className)}
      showSuggestions
      showRecentSearches
      {...props}
    />
  );
}

/**
 * Compact Search Bar - Used in headers
 */
export function CompactSearchBar({ className, ...props }: SearchBarProps) {
  return (
    <SearchBar
      variant="compact"
      className={className}
      showSuggestions={false}
      showRecentSearches={false}
      {...props}
    />
  );
}