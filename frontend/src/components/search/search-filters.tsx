/**
 * Search Filters Component
 * Advanced filtering system for search results
 * Business Logic: Helps users refine search to find the most relevant books
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Filter, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { SearchFilters as FilterType } from '@/app/search/page';

interface SearchFiltersProps {
  filters: FilterType;
  onChange: (filters: FilterType) => void;
  onClear: () => void;
  className?: string;
}

/**
 * Filter options - should be fetched from API in production
 */
const FILTER_OPTIONS = {
  categories: [
    { value: 'fiction', label: '小说', count: 245 },
    { value: 'non-fiction', label: '非虚构', count: 189 },
    { value: 'science', label: '科学', count: 156 },
    { value: 'technology', label: '技术', count: 203 },
    { value: 'business', label: '商业', count: 178 },
    { value: 'history', label: '历史', count: 134 },
    { value: 'philosophy', label: '哲学', count: 98 },
    { value: 'psychology', label: '心理学', count: 112 },
    { value: 'education', label: '教育', count: 87 },
    { value: 'art', label: '艺术', count: 76 },
  ],
  languages: [
    { value: 'zh-CN', label: '中文', count: 567 },
    { value: 'en', label: 'English', count: 432 },
    { value: 'ja', label: '日本語', count: 89 },
    { value: 'ko', label: '한국어', count: 45 },
    { value: 'fr', label: 'Français', count: 34 },
    { value: 'de', label: 'Deutsch', count: 28 },
  ],
  difficulties: [
    { value: 'beginner', label: '入门', description: '适合初学者' },
    { value: 'intermediate', label: '进阶', description: '需要一定基础' },
    { value: 'advanced', label: '高级', description: '深入专业内容' },
    { value: 'expert', label: '专家', description: '专业研究级别' },
  ],
};

/**
 * Quick filter presets
 */
const QUICK_FILTERS = [
  {
    id: 'popular',
    label: '热门推荐',
    icon: '🔥',
    filters: { minRating: 4.5 },
  },
  {
    id: 'beginner',
    label: '新手友好',
    icon: '👶',
    filters: { difficulty: 'beginner' },
  },
  {
    id: 'ai-ready',
    label: 'AI 对话',
    icon: '🤖',
    filters: { hasCharacters: true, isVectorized: true },
  },
  {
    id: 'chinese',
    label: '中文书籍',
    icon: '🇨🇳',
    filters: { language: 'zh-CN' },
  },
  {
    id: 'tech',
    label: '科技前沿',
    icon: '💻',
    filters: { category: 'technology' },
  },
];

/**
 * Filter Section Component
 */
function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent rounded-lg px-2 transition-colors">
        <span className="font-medium text-sm">{title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Main Search Filters Component
 */
export function SearchFilters({
  filters,
  onChange,
  onClear,
  className,
}: SearchFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterType>(filters);

  // Sync with parent filters
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  /**
   * Update a single filter
   */
  const updateFilter = (key: keyof FilterType, value: any) => {
    const newFilters = { ...localFilters };
    if (value === undefined || value === null || value === '') {
      delete newFilters[key];
    } else {
      (newFilters as any)[key] = value;
    }
    setLocalFilters(newFilters);
    onChange(newFilters);
  };

  /**
   * Apply quick filter preset
   */
  const applyQuickFilter = (preset: typeof QUICK_FILTERS[0]) => {
    const newFilters = { ...localFilters, ...preset.filters };
    setLocalFilters(newFilters);
    onChange(newFilters);
  };

  /**
   * Get active filter count
   */
  const getActiveFilterCount = () => {
    return Object.keys(localFilters).filter(
      (key) => localFilters[key as keyof FilterType] !== undefined
    ).length;
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            筛选条件
          </div>
          {getActiveFilterCount() > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-8 px-2"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              清除
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          精确筛选，找到最适合的书籍
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {/* Quick Filters */}
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3">快速筛选</h4>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_FILTERS.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => applyQuickFilter(preset)}
                >
                  <span className="mr-2">{preset.icon}</span>
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator className="mb-4" />

          {/* Category Filter */}
          <FilterSection title="分类" defaultOpen={true}>
            <div className="space-y-2">
              {FILTER_OPTIONS.categories.map((category) => (
                <div key={category.value} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.value}`}
                      checked={localFilters.category === category.value}
                      onCheckedChange={(checked) =>
                        updateFilter('category', checked ? category.value : undefined)
                      }
                    />
                    <Label
                      htmlFor={`category-${category.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {category.label}
                    </Label>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {category.count}
                  </span>
                </div>
              ))}
            </div>
          </FilterSection>

          <Separator className="my-4" />

          {/* Language Filter */}
          <FilterSection title="语言" defaultOpen={false}>
            <div className="space-y-2">
              {FILTER_OPTIONS.languages.map((language) => (
                <div key={language.value} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`language-${language.value}`}
                      checked={localFilters.language === language.value}
                      onCheckedChange={(checked) =>
                        updateFilter('language', checked ? language.value : undefined)
                      }
                    />
                    <Label
                      htmlFor={`language-${language.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {language.label}
                    </Label>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {language.count}
                  </span>
                </div>
              ))}
            </div>
          </FilterSection>

          <Separator className="my-4" />

          {/* Difficulty Filter */}
          <FilterSection title="难度级别" defaultOpen={false}>
            <RadioGroup
              value={localFilters.difficulty || ''}
              onValueChange={(value) =>
                updateFilter('difficulty', value || undefined)
              }
            >
              <div className="space-y-3">
                {FILTER_OPTIONS.difficulties.map((difficulty) => (
                  <div key={difficulty.value} className="flex items-start space-x-2">
                    <RadioGroupItem
                      value={difficulty.value}
                      id={`difficulty-${difficulty.value}`}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`difficulty-${difficulty.value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {difficulty.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {difficulty.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </FilterSection>

          <Separator className="my-4" />

          {/* Rating Filter */}
          <FilterSection title="最低评分" defaultOpen={false}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {localFilters.minRating ? `${localFilters.minRating} 星以上` : '不限'}
                </span>
                {localFilters.minRating && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateFilter('minRating', undefined)}
                    className="h-6 px-2"
                  >
                    清除
                  </Button>
                )}
              </div>
              <Slider
                value={[localFilters.minRating || 0]}
                onValueChange={([value]) =>
                  updateFilter('minRating', value > 0 ? value : undefined)
                }
                min={0}
                max={5}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>2.5</span>
                <span>5</span>
              </div>
            </div>
          </FilterSection>

          <Separator className="my-4" />

          {/* Special Features */}
          <FilterSection title="特殊功能" defaultOpen={false}>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasCharacters"
                  checked={localFilters.hasCharacters || false}
                  onCheckedChange={(checked) =>
                    updateFilter('hasCharacters', checked || undefined)
                  }
                />
                <Label htmlFor="hasCharacters" className="text-sm font-normal cursor-pointer">
                  支持角色对话
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isVectorized"
                  checked={localFilters.isVectorized || false}
                  onCheckedChange={(checked) =>
                    updateFilter('isVectorized', checked || undefined)
                  }
                />
                <Label htmlFor="isVectorized" className="text-sm font-normal cursor-pointer">
                  已向量化（AI 增强）
                </Label>
              </div>
            </div>
          </FilterSection>
        </ScrollArea>

        {/* Active Filters Display */}
        {getActiveFilterCount() > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap gap-2">
              {Object.entries(localFilters).map(([key, value]) => {
                if (value === undefined) return null;

                let displayValue = value;
                if (key === 'category') {
                  displayValue = FILTER_OPTIONS.categories.find(c => c.value === value)?.label || value;
                } else if (key === 'language') {
                  displayValue = FILTER_OPTIONS.languages.find(l => l.value === value)?.label || value;
                } else if (key === 'difficulty') {
                  displayValue = FILTER_OPTIONS.difficulties.find(d => d.value === value)?.label || value;
                } else if (key === 'minRating') {
                  displayValue = `≥ ${value}★`;
                } else if (key === 'hasCharacters') {
                  displayValue = '角色对话';
                } else if (key === 'isVectorized') {
                  displayValue = 'AI 增强';
                }

                return (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {displayValue}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => updateFilter(key as keyof FilterType, undefined)}
                    />
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}