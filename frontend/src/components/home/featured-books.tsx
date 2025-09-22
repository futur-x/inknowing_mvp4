/**
 * Featured Books Component
 * Displays featured and popular books on the homepage
 */

'use client';

import React from 'react';
import { usePopularBooks, useBooks, useBookRecommendations } from '@/hooks/use-books';
import { BookGrid } from '@/components/books/book-grid';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, BookOpen, TrendingUp, Clock, Star, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { PopularPeriod, BookSortOption } from '@/types/book';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

interface FeaturedBooksProps {
  className?: string;
}

/**
 * Section header component
 */
function SectionHeader({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Icon className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function FeaturedBooks({ className }: FeaturedBooksProps) {
  const { user } = useAuth();

  // Fetch different book categories
  const popularWeekly = usePopularBooks(PopularPeriod.WEEK, 8);
  const popularMonthly = usePopularBooks(PopularPeriod.MONTH, 8);
  const recentBooks = useBooks({
    sort: BookSortOption.RECENT,
    pageSize: 8
  });
  const topRated = useBooks({
    sort: BookSortOption.RATING,
    pageSize: 8,
    filters: { minRating: 4.5 }
  });
  const recommendations = useBookRecommendations(8);

  return (
    <section className={cn('py-16 px-4', className)}>
      <div className="container mx-auto space-y-16">
        {/* Featured Tabs Section */}
        <div>
          <SectionHeader
            icon={TrendingUp}
            title="热门推荐"
            description="发现最受欢迎的书籍"
            action={
              <Link href="/books?sort=popular">
                <Button variant="ghost" size="sm">
                  查看全部
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            }
          />

          <Tabs defaultValue="week" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="week">本周热门</TabsTrigger>
              <TabsTrigger value="month">本月热门</TabsTrigger>
              <TabsTrigger value="rating">高分好书</TabsTrigger>
            </TabsList>

            <TabsContent value="week" className="mt-6">
              <BookGrid
                books={popularWeekly.books}
                isLoading={popularWeekly.isLoading}
                columns={4}
                emptyMessage="暂无本周热门书籍"
              />
            </TabsContent>

            <TabsContent value="month" className="mt-6">
              <BookGrid
                books={popularMonthly.books}
                isLoading={popularMonthly.isLoading}
                columns={4}
                emptyMessage="暂无本月热门书籍"
              />
            </TabsContent>

            <TabsContent value="rating" className="mt-6">
              <BookGrid
                books={topRated.books}
                isLoading={topRated.isLoading}
                columns={4}
                emptyMessage="暂无高分书籍"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Personalized Recommendations (for authenticated users) */}
        {user && recommendations.recommendations.length > 0 && (
          <div>
            <SectionHeader
              icon={Sparkles}
              title="为您推荐"
              description="基于您的阅读历史智能推荐"
              action={
                <Link href="/recommendations">
                  <Button variant="ghost" size="sm">
                    更多推荐
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              }
            />
            <BookGrid
              books={recommendations.recommendations}
              isLoading={recommendations.isLoading}
              columns={4}
              emptyMessage="暂无推荐书籍"
            />
          </div>
        )}

        {/* Recent Books Section */}
        <div>
          <SectionHeader
            icon={Clock}
            title="最新上架"
            description="探索最近添加的书籍"
            action={
              <Link href="/books?sort=recent">
                <Button variant="ghost" size="sm">
                  查看全部
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            }
          />
          <BookGrid
            books={recentBooks.books}
            isLoading={recentBooks.isLoading}
            columns={4}
            emptyMessage="暂无最新书籍"
          />
        </div>

        {/* Categories Preview */}
        <div>
          <SectionHeader
            icon={BookOpen}
            title="探索分类"
            description="按类别浏览书籍"
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { category: 'business', label: '商业', icon: '💼' },
              { category: 'psychology', label: '心理学', icon: '🧠' },
              { category: 'fiction', label: '小说', icon: '📖' },
              { category: 'science', label: '科学', icon: '🔬' },
              { category: 'history', label: '历史', icon: '📜' },
              { category: 'philosophy', label: '哲学', icon: '💭' },
            ].map((cat) => (
              <Link
                key={cat.category}
                href={`/books?category=${cat.category}`}
                className="group"
              >
                <div className="flex flex-col items-center p-6 bg-card hover:bg-accent rounded-lg border transition-all hover:shadow-md">
                  <span className="text-3xl mb-2">{cat.icon}</span>
                  <span className="font-medium">{cat.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        {!user && (
          <div className="text-center py-12 px-6 bg-gradient-to-r from-primary/10 to-purple-600/10 rounded-2xl">
            <h3 className="text-2xl font-bold mb-4">
              开启您的智能阅读之旅
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              注册账号即可享受免费对话额度，与书籍进行深度交流，
              获得个性化的阅读推荐。
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/auth/register">
                <Button size="lg" variant="default">
                  免费注册
                  <Sparkles className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/books">
                <Button size="lg" variant="outline">
                  继续浏览
                  <BookOpen className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}