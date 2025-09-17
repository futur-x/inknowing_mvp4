/**
 * Book Card Component
 * Displays individual book information in a card format
 * Supports both grid and list views
 */

'use client';

import React from 'react';
import { Book, BookDifficulty } from '@/types/book';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Users, MessageSquare, BookOpen, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface BookCardProps {
  book: Book;
  variant?: 'grid' | 'list';
  showActions?: boolean;
  onQuickView?: (book: Book) => void;
  className?: string;
}

/**
 * Difficulty badge variant mapping
 */
const difficultyVariants: Record<BookDifficulty, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [BookDifficulty.BEGINNER]: 'default',
  [BookDifficulty.INTERMEDIATE]: 'secondary',
  [BookDifficulty.ADVANCED]: 'destructive'
};

/**
 * Difficulty label mapping for Chinese display
 */
const difficultyLabels: Record<BookDifficulty, string> = {
  [BookDifficulty.BEGINNER]: '初级',
  [BookDifficulty.INTERMEDIATE]: '中级',
  [BookDifficulty.ADVANCED]: '高级'
};

/**
 * Format large numbers for display
 */
function formatCount(count: number | undefined): string {
  if (!count || count === 0) return '0';
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}千`;
  }
  return count.toString();
}

export function BookCard({
  book,
  variant = 'grid',
  showActions = true,
  onQuickView,
  className
}: BookCardProps) {
  const router = useRouter();

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    router.push(`/books/${book.id}`);
  };

  const handleStartChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/chat/book/${book.id}`);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickView?.(book);
  };

  if (variant === 'list') {
    return (
      <Card
        className={cn(
          "hover:shadow-lg transition-all cursor-pointer border-border/50",
          className
        )}
        onClick={handleCardClick}
      >
        <div className="flex flex-col md:flex-row gap-4 p-4">
          {/* Book Cover */}
          <div className="flex-shrink-0">
            <div className="relative w-full md:w-32 h-48 md:h-44 bg-muted rounded-lg overflow-hidden">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              {book.vectorized && (
                <Badge className="absolute top-2 right-2" variant="default">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI增强
                </Badge>
              )}
            </div>
          </div>

          {/* Book Info */}
          <div className="flex-1 space-y-2">
            <div>
              <h3 className="text-lg font-semibold line-clamp-1">{book.title}</h3>
              <p className="text-sm text-muted-foreground">{book.author}</p>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2">
              {book.description}
            </p>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{book.category}</Badge>
              <Badge variant={difficultyVariants[book.difficulty]}>
                {difficultyLabels[book.difficulty]}
              </Badge>
              {book.language && (
                <Badge variant="outline">{book.language}</Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{book.rating.toFixed(1)}</span>
                <span>({formatCount(book.ratingCount)})</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>{formatCount(book.dialogueCount)} 对话</span>
              </div>
              {book.characters && book.characters.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{book.characters.length} 角色</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex md:flex-col gap-2 justify-end">
              <Button
                size="sm"
                variant="default"
                onClick={handleStartChat}
              >
                开始对话
              </Button>
              {onQuickView && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleQuickView}
                >
                  快速预览
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Grid variant (default)
  return (
    <Card
      className={cn(
        "group hover:shadow-lg transition-all cursor-pointer h-full flex flex-col border-border/50",
        className
      )}
      onClick={handleCardClick}
    >
      {/* Book Cover */}
      <div className="relative aspect-[3/4] bg-muted overflow-hidden rounded-t-lg">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-16 w-16 text-muted-foreground" />
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-2 left-2 right-2 flex justify-between">
          <Badge variant={difficultyVariants[book.difficulty]}>
            {difficultyLabels[book.difficulty]}
          </Badge>
          {book.vectorized && (
            <Badge variant="default">
              <Sparkles className="h-3 w-3 mr-1" />
              AI
            </Badge>
          )}
        </div>

        {/* Rating overlay */}
        <div className="absolute bottom-2 left-2 right-2">
          <div className="bg-background/90 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{book.rating.toFixed(1)}</span>
            </div>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              {formatCount(book.dialogueCount)} 对话
            </span>
          </div>
        </div>
      </div>

      {/* Book Info */}
      <CardHeader className="flex-1 pb-2">
        <h3 className="font-semibold line-clamp-2 leading-tight">
          {book.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-1">
          {book.author}
        </p>
      </CardHeader>

      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {book.description}
        </p>

        <div className="flex flex-wrap gap-1 mt-2">
          <Badge variant="outline" className="text-xs">
            {book.category}
          </Badge>
          {book.characters && book.characters.length > 0 && (
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {book.characters.length}
            </Badge>
          )}
        </div>
      </CardContent>

      {/* Actions */}
      {showActions && (
        <CardFooter className="pt-2">
          <div className="w-full grid grid-cols-2 gap-2">
            {onQuickView && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleQuickView}
              >
                预览
              </Button>
            )}
            <Button
              size="sm"
              variant="default"
              onClick={handleStartChat}
              className={onQuickView ? '' : 'col-span-2'}
            >
              开始对话
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}