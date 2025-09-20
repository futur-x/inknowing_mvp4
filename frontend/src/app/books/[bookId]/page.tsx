/**
 * Book Details Page
 * Displays comprehensive information about a specific book
 */

'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBook, useRecentlyViewedBooks, useBooks } from '@/hooks/use-books';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { BookGrid } from '@/components/books/book-grid';
import {
  Star,
  Users,
  MessageSquare,
  BookOpen,
  Calendar,
  Globe,
  Tag,
  Sparkles,
  ChevronLeft,
  Share2,
  Heart,
  AlertCircle
} from 'lucide-react';
import { BookDifficulty, BookCategory, BookSortOption } from '@/types/book';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Difficulty label mapping
 */
const difficultyLabels: Record<BookDifficulty, string> = {
  [BookDifficulty.BEGINNER]: '初级',
  [BookDifficulty.INTERMEDIATE]: '中级',
  [BookDifficulty.ADVANCED]: '高级'
};

/**
 * Category label mapping
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
 * Book Info Skeleton
 */
function BookDetailsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <Skeleton className="w-full lg:w-80 h-96 rounded-lg" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-20 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const { user } = useAuth();

  // Fetch book details
  const { book, isLoading, error } = useBook(bookId);

  // Track recently viewed
  const { addRecentlyViewed } = useRecentlyViewedBooks();

  // Fetch related books
  const relatedBooks = useBooks({
    filters: { category: book?.category },
    sort: BookSortOption.POPULAR,
    pageSize: 4
  });

  // Add to recently viewed when book loads
  useEffect(() => {
    if (book) {
      addRecentlyViewed(book.id);
    }
  }, [book, addRecentlyViewed]);

  const handleStartChat = () => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/auth/login?returnUrl=/chat?bookId=${bookId}`);
    } else {
      router.push(`/chat?bookId=${bookId}`);
    }
  };

  const handleCharacterChat = (characterId: string) => {
    if (!user) {
      router.push(`/auth/login?returnUrl=/chat?bookId=${bookId}&characterId=${characterId}`);
    } else {
      router.push(`/chat?bookId=${bookId}&characterId=${characterId}`);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: book?.title,
        text: book?.description,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // You might want to show a toast notification here
    }
  };

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            加载书籍信息时出错，请稍后再试。
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mt-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">首页</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/books">书籍</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{book?.title || '加载中...'}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <BookDetailsSkeleton />
        ) : book ? (
          <div className="space-y-8">
            {/* Book Header */}
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Book Cover */}
              <div className="flex-shrink-0">
                <div className="relative w-full lg:w-80 aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-24 w-24 text-muted-foreground" />
                    </div>
                  )}
                  {book.vectorized && (
                    <Badge className="absolute top-4 right-4" variant="default">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI增强
                    </Badge>
                  )}
                </div>
              </div>

              {/* Book Info */}
              <div className="flex-1 space-y-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{book.title}</h1>
                  <p className="text-xl text-muted-foreground mb-4">{book.author}</p>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline">
                      {categoryLabels[book.category]}
                    </Badge>
                    <Badge variant="secondary">
                      {difficultyLabels[book.difficulty]}
                    </Badge>
                    {book.language && (
                      <Badge variant="outline">
                        <Globe className="h-3 w-3 mr-1" />
                        {book.language}
                      </Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{book.rating.toFixed(1)}</span>
                      <span>({book.ratingCount} 评价)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{book.dialogueCount} 对话</span>
                    </div>
                    {book.characters && book.characters.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{book.characters.length} 可对话角色</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-muted-foreground leading-relaxed">
                  {book.description}
                </p>

                {/* Actions */}
                <div className="flex flex-wrap gap-4">
                  <Button
                    size="lg"
                    onClick={handleStartChat}
                    className="min-w-[160px]"
                  >
                    <MessageSquare className="mr-2 h-5 w-5" />
                    开始对话
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleShare}
                  >
                    <Share2 className="mr-2 h-5 w-5" />
                    分享
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                  >
                    <Heart className="mr-2 h-5 w-5" />
                    收藏
                  </Button>
                </div>

                {/* Book Metadata */}
                <Card>
                  <CardContent className="pt-6">
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      {book.isbn && (
                        <>
                          <dt className="text-muted-foreground">ISBN</dt>
                          <dd className="font-medium">{book.isbn}</dd>
                        </>
                      )}
                      {book.publisher && (
                        <>
                          <dt className="text-muted-foreground">出版社</dt>
                          <dd className="font-medium">{book.publisher}</dd>
                        </>
                      )}
                      {book.publishDate && (
                        <>
                          <dt className="text-muted-foreground">出版日期</dt>
                          <dd className="font-medium">
                            <Calendar className="inline h-3 w-3 mr-1" />
                            {new Date(book.publishDate).toLocaleDateString('zh-CN')}
                          </dd>
                        </>
                      )}
                      {book.pageCount && (
                        <>
                          <dt className="text-muted-foreground">页数</dt>
                          <dd className="font-medium">{book.pageCount} 页</dd>
                        </>
                      )}
                    </dl>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Tabs Section */}
            <Tabs defaultValue="characters" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="characters">对话角色</TabsTrigger>
                <TabsTrigger value="tags">标签</TabsTrigger>
                <TabsTrigger value="related">相关书籍</TabsTrigger>
              </TabsList>

              {/* Characters Tab */}
              <TabsContent value="characters" className="mt-6">
                {book.characters && book.characters.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {book.characters.map((character) => (
                      <Card
                        key={character.id}
                        className={cn(
                          "hover:shadow-lg transition-all",
                          character.isAvailable
                            ? "cursor-pointer"
                            : "opacity-60"
                        )}
                        onClick={() =>
                          character.isAvailable &&
                          handleCharacterChat(character.id)
                        }
                      >
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span>{character.name}</span>
                            {character.isMainCharacter && (
                              <Badge variant="default" className="text-xs">
                                主角
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">
                            {character.description}
                          </p>
                          {character.isAvailable ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              与角色对话
                            </Button>
                          ) : (
                            <div className="text-xs text-center text-muted-foreground">
                              即将开放
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    此书暂无可对话角色
                  </div>
                )}
              </TabsContent>

              {/* Tags Tab */}
              <TabsContent value="tags" className="mt-6">
                {book.tags && book.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {book.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/books?search=${encodeURIComponent(tag)}`}
                      >
                        <Badge variant="secondary" className="cursor-pointer">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无标签
                  </div>
                )}
              </TabsContent>

              {/* Related Books Tab */}
              <TabsContent value="related" className="mt-6">
                <BookGrid
                  books={relatedBooks.books.filter(b => b.id !== bookId)}
                  isLoading={relatedBooks.isLoading}
                  columns={4}
                  emptyMessage="暂无相关书籍"
                />
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </div>
    </div>
  );
}