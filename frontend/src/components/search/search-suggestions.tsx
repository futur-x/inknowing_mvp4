/**
 * Search Suggestions Component
 * Provides intelligent search suggestions based on context and user behavior
 * Business Logic: Guides users to ask better questions for book discovery
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Lightbulb, TrendingUp, Clock, HelpCircle, BookOpen, MessageSquare, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchType } from '@/app/search/page';
import { cn } from '@/lib/utils';

interface SearchSuggestionsProps {
  searchType: SearchType;
  onSuggestionClick: (suggestion: string) => void;
  className?: string;
}

/**
 * Suggestion categories
 */
interface SuggestionCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  suggestions: {
    text: string;
    badge?: string;
    description?: string;
  }[];
}

/**
 * Get suggestions based on search type
 */
function getSuggestionsByType(searchType: SearchType): SuggestionCategory[] {
  const baseSuggestions: Record<SearchType, SuggestionCategory[]> = {
    [SearchType.QUESTION]: [
      {
        id: 'learning',
        title: '学习与成长',
        icon: <Lightbulb className="h-4 w-4" />,
        suggestions: [
          { text: '如何提高学习效率？', badge: '热门' },
          { text: '怎样培养良好的学习习惯？' },
          { text: '如何克服拖延症？', badge: '推荐' },
          { text: '怎样提高记忆力？' },
          { text: '如何进行深度学习？' },
        ],
      },
      {
        id: 'tech',
        title: '科技与创新',
        icon: <Sparkles className="h-4 w-4" />,
        suggestions: [
          { text: '人工智能将如何改变未来？', badge: '热门' },
          { text: '什么是区块链技术？' },
          { text: '量子计算的原理是什么？' },
          { text: '元宇宙的发展前景如何？', badge: '新' },
          { text: '如何理解机器学习？' },
        ],
      },
      {
        id: 'life',
        title: '生活与职业',
        icon: <HelpCircle className="h-4 w-4" />,
        suggestions: [
          { text: '如何平衡工作与生活？', badge: '热门' },
          { text: '怎样进行职业规划？' },
          { text: '如何提升领导力？' },
          { text: '怎样建立良好的人际关系？' },
          { text: '如何管理个人财务？', badge: '实用' },
        ],
      },
      {
        id: 'philosophy',
        title: '哲学与思考',
        icon: <MessageSquare className="h-4 w-4" />,
        suggestions: [
          { text: '什么是幸福？' },
          { text: '人生的意义是什么？', badge: '深度' },
          { text: '如何面对人生的困境？' },
          { text: '什么是批判性思维？' },
          { text: '如何培养哲学思维？' },
        ],
      },
    ],
    [SearchType.TITLE]: [
      {
        id: 'bestsellers',
        title: '畅销书籍',
        icon: <TrendingUp className="h-4 w-4" />,
        suggestions: [
          { text: '人类简史', badge: '畅销' },
          { text: '思考，快与慢' },
          { text: '原则', badge: '推荐' },
          { text: '穷爸爸富爸爸' },
          { text: '影响力' },
        ],
      },
      {
        id: 'classics',
        title: '经典名著',
        icon: <BookOpen className="h-4 w-4" />,
        suggestions: [
          { text: '红楼梦' },
          { text: '百年孤独', badge: '经典' },
          { text: '1984' },
          { text: '老人与海' },
          { text: '小王子' },
        ],
      },
    ],
    [SearchType.AUTHOR]: [
      {
        id: 'popular',
        title: '热门作者',
        icon: <TrendingUp className="h-4 w-4" />,
        suggestions: [
          { text: '尤瓦尔·赫拉利', badge: '热门' },
          { text: '丹尼尔·卡尼曼' },
          { text: '雷·达里奥' },
          { text: '罗伯特·清崎' },
          { text: '史蒂芬·柯维' },
        ],
      },
      {
        id: 'chinese',
        title: '中文作者',
        icon: <BookOpen className="h-4 w-4" />,
        suggestions: [
          { text: '刘慈欣', badge: '科幻' },
          { text: '余华' },
          { text: '莫言', badge: '诺贝尔奖' },
          { text: '王小波' },
          { text: '三毛' },
        ],
      },
    ],
    [SearchType.ALL]: [
      {
        id: 'mixed',
        title: '综合推荐',
        icon: <Sparkles className="h-4 w-4" />,
        suggestions: [
          { text: '如何学习编程？', description: '问题搜索' },
          { text: '人类简史', description: '书名搜索' },
          { text: '尤瓦尔·赫拉利', description: '作者搜索' },
          { text: '什么是元宇宙？', description: '问题搜索' },
          { text: '三体', description: '书名搜索' },
        ],
      },
    ],
  };

  return baseSuggestions[searchType] || baseSuggestions[SearchType.ALL];
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
 * Single suggestion card
 */
function SuggestionCard({
  suggestion,
  onClick,
}: {
  suggestion: { text: string; badge?: string; description?: string };
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      className="w-full justify-start text-left h-auto py-2 px-3 hover:bg-accent group"
      onClick={onClick}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-normal">{suggestion.text}</span>
            {suggestion.badge && (
              <Badge variant="secondary" className="text-xs">
                {suggestion.badge}
              </Badge>
            )}
          </div>
          {suggestion.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {suggestion.description}
            </p>
          )}
        </div>
        <MessageSquare className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Button>
  );
}

/**
 * Main Search Suggestions Component
 */
export function SearchSuggestions({
  searchType,
  onSuggestionClick,
  className,
}: SearchSuggestionsProps) {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const suggestionCategories = getSuggestionsByType(searchType);

  return (
    <div className={cn('w-full', className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="suggestions">
            <Lightbulb className="h-4 w-4 mr-2" />
            搜索建议
          </TabsTrigger>
          <TabsTrigger value="recent">
            <Clock className="h-4 w-4 mr-2" />
            最近搜索
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestionCategories.map((category) => (
              <Card key={category.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {category.icon}
                    {category.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {category.suggestions.map((suggestion, index) => (
                    <SuggestionCard
                      key={index}
                      suggestion={suggestion}
                      onClick={() => onSuggestionClick(suggestion.text)}
                    />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tip for better search */}
          <Card className="mt-4 border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                搜索技巧
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                {searchType === SearchType.QUESTION && (
                  <>
                    <li>• 使用完整的问题形式，如"如何..."、"为什么..."</li>
                    <li>• 包含具体的关键词和上下文信息</li>
                    <li>• AI 会理解您的意图并找到最相关的书籍</li>
                  </>
                )}
                {searchType === SearchType.TITLE && (
                  <>
                    <li>• 输入书名的关键词即可</li>
                    <li>• 支持模糊匹配和同义词搜索</li>
                    <li>• 可以输入部分书名或系列名称</li>
                  </>
                )}
                {searchType === SearchType.AUTHOR && (
                  <>
                    <li>• 输入作者的姓名或笔名</li>
                    <li>• 支持中文、英文等多语言</li>
                    <li>• 可以只输入姓或名的一部分</li>
                  </>
                )}
                {searchType === SearchType.ALL && (
                  <>
                    <li>• 系统会自动识别您的搜索意图</li>
                    <li>• 可以混合使用问题、书名或作者名</li>
                    <li>• 获得更全面的搜索结果</li>
                  </>
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="mt-4">
          {recentSearches.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">最近的搜索</CardTitle>
                <CardDescription>
                  点击快速重新搜索
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentSearches.map((search, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => onSuggestionClick(search)}
                  >
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    {search}
                  </Button>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Clock className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  暂无搜索历史
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}