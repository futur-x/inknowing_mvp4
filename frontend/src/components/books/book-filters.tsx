/**
 * Book Filters Component
 * Provides filtering and sorting options for book listings
 */

'use client';

import React from 'react';
import { BookCategory, BookDifficulty, BookSortOption, BookFilters as BookFiltersType } from '@/types/book';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Filter, X, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookFiltersProps {
  filters: BookFiltersType;
  sort: BookSortOption;
  viewMode: 'grid' | 'list';
  onFiltersChange: (filters: BookFiltersType) => void;
  onSortChange: (sort: BookSortOption) => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onReset?: () => void;
  className?: string;
}

/**
 * Category labels for display
 */
const categoryLabels: Record<BookCategory, string> = {
  [BookCategory.BUSINESS]: '商业',
  [BookCategory.PSYCHOLOGY]: '心理学',
  [BookCategory.FICTION]: '小说',
  [BookCategory.SCIENCE]: '科学',
  [BookCategory.HISTORY]: '历史',
  [BookCategory.PHILOSOPHY]: '哲学'
};

/**
 * Difficulty labels for display
 */
const difficultyLabels: Record<BookDifficulty, string> = {
  [BookDifficulty.BEGINNER]: '初级',
  [BookDifficulty.INTERMEDIATE]: '中级',
  [BookDifficulty.ADVANCED]: '高级'
};

/**
 * Sort option labels for display
 */
const sortLabels: Record<BookSortOption, string> = {
  [BookSortOption.POPULAR]: '最受欢迎',
  [BookSortOption.RECENT]: '最近添加',
  [BookSortOption.RATING]: '评分最高',
  [BookSortOption.TITLE]: '标题字母'
};

export function BookFilters({
  filters,
  sort,
  viewMode,
  onFiltersChange,
  onSortChange,
  onViewModeChange,
  onReset,
  className
}: BookFiltersProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleCategoryChange = (category: string) => {
    onFiltersChange({
      ...filters,
      category: category === 'all' ? undefined : category as BookCategory
    });
  };

  const handleDifficultyChange = (difficulty: string) => {
    onFiltersChange({
      ...filters,
      difficulty: difficulty === 'all' ? undefined : difficulty as BookDifficulty
    });
  };

  const handleLanguageChange = (language: string) => {
    onFiltersChange({
      ...filters,
      language: language === 'all' ? undefined : language
    });
  };

  const handleMinRatingChange = (value: number[]) => {
    onFiltersChange({
      ...filters,
      minRating: value[0] > 0 ? value[0] : undefined
    });
  };

  const handleHasCharactersChange = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      hasCharacters: checked || undefined
    });
  };

  const handleVectorizedChange = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      isVectorized: checked || undefined
    });
  };

  const handleReset = () => {
    onFiltersChange({});
    onSortChange(BookSortOption.POPULAR);
    onReset?.();
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined).length;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="space-y-2">
        <Label htmlFor="category">类别</Label>
        <Select
          value={filters.category || 'all'}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger id="category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类别</SelectItem>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Difficulty Filter */}
      <div className="space-y-2">
        <Label htmlFor="difficulty">难度</Label>
        <Select
          value={filters.difficulty || 'all'}
          onValueChange={handleDifficultyChange}
        >
          <SelectTrigger id="difficulty">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部难度</SelectItem>
            {Object.entries(difficultyLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Language Filter */}
      <div className="space-y-2">
        <Label htmlFor="language">语言</Label>
        <Select
          value={filters.language || 'all'}
          onValueChange={handleLanguageChange}
        >
          <SelectTrigger id="language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部语言</SelectItem>
            <SelectItem value="中文">中文</SelectItem>
            <SelectItem value="English">English</SelectItem>
            <SelectItem value="日本語">日本語</SelectItem>
            <SelectItem value="한국어">한국어</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Minimum Rating Filter */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="rating">最低评分</Label>
          <span className="text-sm text-muted-foreground">
            {filters.minRating || 0} 星以上
          </span>
        </div>
        <Slider
          id="rating"
          min={0}
          max={5}
          step={0.5}
          value={[filters.minRating || 0]}
          onValueChange={handleMinRatingChange}
          className="w-full"
        />
      </div>

      {/* Has Characters Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="has-characters" className="flex-1">
          包含角色对话
        </Label>
        <Switch
          id="has-characters"
          checked={filters.hasCharacters || false}
          onCheckedChange={handleHasCharactersChange}
        />
      </div>

      {/* Vectorized Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="vectorized" className="flex-1">
          AI增强书籍
        </Label>
        <Switch
          id="vectorized"
          checked={filters.isVectorized || false}
          onCheckedChange={handleVectorizedChange}
        />
      </div>

      {/* Reset Button */}
      {activeFilterCount > 0 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleReset}
        >
          <X className="h-4 w-4 mr-2" />
          重置筛选 ({activeFilterCount})
        </Button>
      )}
    </div>
  );

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {/* Desktop Filters - Left Side */}
      <div className="flex items-center gap-2">
        {/* Mobile Filter Sheet */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="lg:hidden">
              <Filter className="h-4 w-4 mr-2" />
              筛选
              {activeFilterCount > 0 && (
                <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-xs">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle>筛选书籍</SheetTitle>
              <SheetDescription>
                根据您的喜好筛选书籍
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Quick Filters */}
        <div className="hidden lg:flex items-center gap-2">
          <Select
            value={filters.category || 'all'}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="类别" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类别</SelectItem>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.difficulty || 'all'}
            onValueChange={handleDifficultyChange}
          >
            <SelectTrigger className="w-28">
              <SelectValue placeholder="难度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部难度</SelectItem>
              {Object.entries(difficultyLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              清除筛选 ({activeFilterCount})
            </Button>
          )}
        </div>
      </div>

      {/* Right Side - Sort and View */}
      <div className="flex items-center gap-2">
        {/* Sort Dropdown */}
        <Select
          value={sort}
          onValueChange={(value) => onSortChange(value as BookSortOption)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(sortLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View Mode Toggle */}
        <div className="hidden sm:flex border rounded-lg">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-r-none"
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-l-none"
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}