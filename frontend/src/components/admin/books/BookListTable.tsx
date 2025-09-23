'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  MoreHorizontal,
  Edit,
  Trash,
  Eye,
  CheckCircle,
  XCircle,
  Brain,
  Database,
  Star,
  MessageSquare,
  Users,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface BookListTableProps {
  books: any[];
  loading: boolean;
  selectedBooks: string[];
  onSelectionChange: (selected: string[]) => void;
  onEdit: (book: any) => void;
  onDelete: (bookId: string) => void;
  onApprove: (bookId: string, vectorize: boolean) => void;
  onReject: (bookId: string, reason: string) => void;
  onVectorize: (bookId: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function BookListTable({
  books,
  loading,
  selectedBooks,
  onSelectionChange,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onVectorize,
  currentPage,
  totalPages,
  onPageChange,
}: BookListTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (bookId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(bookId)) {
      newExpanded.delete(bookId);
    } else {
      newExpanded.add(bookId);
    }
    setExpandedRows(newExpanded);
  };

  const toggleSelectAll = () => {
    if (selectedBooks.length === books.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(books.map(b => b.id));
    }
  };

  const toggleSelectBook = (bookId: string) => {
    if (selectedBooks.includes(bookId)) {
      onSelectionChange(selectedBooks.filter(id => id !== bookId));
    } else {
      onSelectionChange([...selectedBooks, bookId]);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      published: { variant: 'default' as const, icon: CheckCircle },
      draft: { variant: 'secondary' as const, icon: Edit },
      review: { variant: 'warning' as const, icon: AlertCircle },
      processing: { variant: 'secondary' as const, icon: Database },
      offline: { variant: 'destructive' as const, icon: XCircle },
    };

    const config = variants[status] || variants.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string, aiKnown: boolean) => {
    if (aiKnown) {
      return (
        <Badge variant="outline" className="gap-1">
          <Brain className="h-3 w-3" />
          AI Known
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Database className="h-3 w-3" />
        Vectorized
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedBooks.length === books.length && books.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Book</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Stats</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {books.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No books found
                </TableCell>
              </TableRow>
            ) : (
              books.map((book) => (
                <>
                  <TableRow key={book.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedBooks.includes(book.id)}
                        onCheckedChange={() => toggleSelectBook(book.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={book.cover_url} alt={book.title} />
                          <AvatarFallback>
                            <BookOpen className="h-5 w-5 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{book.title}</div>
                          <div className="text-sm text-muted-foreground">
                            by {book.author}
                          </div>
                          {book.category && (
                            <div className="text-xs text-muted-foreground">
                              {book.category}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(book.type, book.ai_known)}
                      {book.vector_status === 'processing' && (
                        <Badge variant="secondary" className="gap-1 ml-1">
                          <Database className="h-3 w-3 animate-pulse" />
                          Vectorizing
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(book.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span>{book.dialogue_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-muted-foreground" />
                          <span>{book.rating?.toFixed(1) || '0.0'}</span>
                        </div>
                        {book.character_count > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{book.character_count}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {book.created_at
                        ? formatDistanceToNow(new Date(book.created_at), { addSuffix: true })
                        : 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => toggleRowExpansion(book.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(book)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {book.status === 'review' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => onApprove(book.id, !book.ai_known)}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onReject(book.id, 'Content not suitable')}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {!book.ai_known && book.vector_status !== 'completed' && (
                            <DropdownMenuItem onClick={() => onVectorize(book.id)}>
                              <Database className="mr-2 h-4 w-4" />
                              Start Vectorization
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => onDelete(book.id)}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(book.id) && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/50">
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="font-medium mb-1">Description</div>
                              <p className="text-muted-foreground">
                                {book.description || 'No description available'}
                              </p>
                            </div>
                            <div>
                              <div className="font-medium mb-1">Details</div>
                              <div className="space-y-1 text-muted-foreground">
                                {book.isbn && <div>ISBN: {book.isbn}</div>}
                                {book.language && <div>Language: {book.language}</div>}
                                {book.publisher && <div>Publisher: {book.publisher}</div>}
                                {book.publish_year && <div>Year: {book.publish_year}</div>}
                                {book.page_count && <div>Pages: {book.page_count}</div>}
                                {book.word_count && <div>Words: {book.word_count.toLocaleString()}</div>}
                              </div>
                            </div>
                          </div>
                          {book.seo_keywords && book.seo_keywords.length > 0 && (
                            <div>
                              <div className="font-medium mb-1 text-sm">Keywords</div>
                              <div className="flex flex-wrap gap-1">
                                {book.seo_keywords.map((keyword: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {keyword}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {book.vector_status && !book.ai_known && (
                            <div>
                              <div className="font-medium mb-1 text-sm">Vectorization</div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Status: {book.vector_status}</span>
                                {book.vector_count && (
                                  <span>• Vectors: {book.vector_count}</span>
                                )}
                                {book.total_api_cost > 0 && (
                                  <span>• Cost: ${book.total_api_cost.toFixed(4)}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                className={cn(
                  currentPage === 1 && 'pointer-events-none opacity-50'
                )}
              />
            </PaginationItem>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const page = i + 1;
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => onPageChange(page)}
                    isActive={currentPage === page}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            {totalPages > 5 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                className={cn(
                  currentPage === totalPages && 'pointer-events-none opacity-50'
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}