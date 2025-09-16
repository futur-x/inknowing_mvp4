'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Eye,
  Edit,
  Trash2,
  Globe,
  Lock,
  BarChart,
  Calendar,
  Star,
  MoreVertical,
  Grid,
  List,
  Search,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { BookManagementItem } from '@/types/upload';
import { formatFileSize } from '@/lib/upload-utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8888/api';

interface BookManagerProps {
  userId?: string;
}

export function BookManager({ userId }: BookManagerProps) {
  const router = useRouter();
  const [books, setBooks] = useState<BookManagementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('uploadedAt');
  const [deleteBookId, setDeleteBookId] = useState<string | null>(null);

  useEffect(() => {
    fetchBooks();
  }, [userId]);

  const fetchBooks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/books`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }

      const data = await response.json();
      setBooks(data.books || []);
    } catch (error) {
      console.error('Error fetching books:', error);
      toast.error('Failed to load your books');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (bookId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete book');
      }

      setBooks((prev) => prev.filter((book) => book.id !== bookId));
      toast.success('Book deleted successfully');
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Failed to delete book');
    } finally {
      setDeleteBookId(null);
    }
  };

  const handleVisibilityToggle = async (bookId: string, currentVisibility: string) => {
    try {
      const token = localStorage.getItem('token');
      const newVisibility = currentVisibility === 'public' ? 'private' : 'public';

      const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ visibility: newVisibility }),
      });

      if (!response.ok) {
        throw new Error('Failed to update visibility');
      }

      setBooks((prev) =>
        prev.map((book) =>
          book.id === bookId ? { ...book, visibility: newVisibility } : book
        )
      );

      toast.success(`Book is now ${newVisibility}`);
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update visibility');
    }
  };

  const filteredBooks = books
    .filter((book) => {
      if (statusFilter !== 'all' && book.status !== statusFilter) return false;
      if (searchQuery && !book.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !book.author.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'author':
          return a.author.localeCompare(b.author);
        case 'views':
          return b.views - a.views;
        case 'uploadedAt':
        default:
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'green';
      case 'processing':
        return 'blue';
      case 'draft':
        return 'gray';
      case 'archived':
        return 'yellow';
      default:
        return 'default';
    }
  };

  const stats = {
    total: books.length,
    published: books.filter((b) => b.status === 'published').length,
    processing: books.filter((b) => b.status === 'processing').length,
    totalViews: books.reduce((sum, b) => sum + b.views, 0),
    totalDialogues: books.reduce((sum, b) => sum + b.dialogues, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your books...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-gray-500" />
              <p className="text-sm text-gray-600">Total Books</p>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-green-500" />
              <p className="text-sm text-gray-600">Published</p>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.published}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-sm text-gray-600">Processing</p>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.processing}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-purple-500" />
              <p className="text-sm text-gray-600">Total Views</p>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalViews}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart className="h-4 w-4 text-orange-500" />
              <p className="text-sm text-gray-600">Dialogues</p>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalDialogues}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search books..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uploadedAt">Latest</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="author">Author</SelectItem>
                <SelectItem value="views">Most Viewed</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Books Display */}
      {filteredBooks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No books found</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload your first book to get started'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBooks.map((book) => (
            <Card key={book.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base line-clamp-1">
                      {book.title}
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      by {book.author}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/books/${book.bookId}`)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/upload/edit/${book.id}`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleVisibilityToggle(book.id, book.visibility)}
                      >
                        {book.visibility === 'public' ? (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Make Private
                          </>
                        ) : (
                          <>
                            <Globe className="h-4 w-4 mr-2" />
                            Make Public
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteBookId(book.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {book.coverImage && (
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="w-full h-32 object-cover rounded"
                  />
                )}

                <div className="flex items-center justify-between">
                  <Badge variant={getStatusColor(book.status) as any}>
                    {book.status}
                  </Badge>
                  <div className="flex items-center space-x-1">
                    {book.visibility === 'public' ? (
                      <Globe className="h-3 w-3 text-gray-500" />
                    ) : (
                      <Lock className="h-3 w-3 text-gray-500" />
                    )}
                    <span className="text-xs text-gray-500">{book.visibility}</span>
                  </div>
                </div>

                {book.status === 'processing' && book.processingProgress !== undefined && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Processing</span>
                      <span>{book.processingProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${book.processingProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Eye className="h-3 w-3" />
                    <span>{book.views} views</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <BarChart className="h-3 w-3" />
                    <span>{book.dialogues} dialogues</span>
                  </div>
                </div>

                {book.rating && (
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    <span className="text-xs">{book.rating.toFixed(1)}</span>
                  </div>
                )}

                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>Uploaded {new Date(book.uploadedAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredBooks.map((book) => (
            <Card key={book.id} className="hover:shadow transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {book.coverImage && (
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="w-16 h-20 object-cover rounded"
                      />
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{book.title}</p>
                        <Badge variant={getStatusColor(book.status) as any} className="text-xs">
                          {book.status}
                        </Badge>
                        {book.visibility === 'private' && (
                          <Lock className="h-3 w-3 text-gray-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">by {book.author}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{book.views} views</span>
                        <span>{book.dialogues} dialogues</span>
                        {book.rating && <span>★ {book.rating.toFixed(1)}</span>}
                        <span>Uploaded {new Date(book.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/books/${book.bookId}`)}
                    >
                      View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/upload/edit/${book.id}`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleVisibilityToggle(book.id, book.visibility)}
                        >
                          {book.visibility === 'public' ? (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              Make Private
                            </>
                          ) : (
                            <>
                              <Globe className="h-4 w-4 mr-2" />
                              Make Public
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteBookId(book.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteBookId} onOpenChange={() => setDeleteBookId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the book and all
              associated data including dialogues and analytics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteBookId && handleDelete(deleteBookId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}