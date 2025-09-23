'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  Upload,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Brain,
  Database,
  RefreshCw
} from 'lucide-react';
import { BookListTable } from '@/components/admin/books/BookListTable';
import { BookStatsCards } from '@/components/admin/books/BookStatsCards';
import { BookEditDialog } from '@/components/admin/books/BookEditDialog';
import { BookBulkActions } from '@/components/admin/books/BookBulkActions';
import { useAdminStore } from '@/stores/admin-store';
import { adminApi } from '@/lib/admin-api';
import { toast } from 'sonner';

export default function BooksManagementPage() {
  const router = useRouter();
  const { user, checkPermission } = useAdminStore();

  // State
  const [activeTab, setActiveTab] = useState('all');
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [stats, setStats] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check permissions
  useEffect(() => {
    if (!checkPermission('books:read')) {
      toast.error('You do not have permission to view this page');
      router.push('/admin/dashboard');
    }
  }, []);

  // Fetch books
  useEffect(() => {
    fetchBooks();
  }, [activeTab, searchQuery, statusFilter, typeFilter, categoryFilter, sortBy, sortOrder, currentPage, refreshKey]);

  // Fetch stats
  useEffect(() => {
    fetchStats();
  }, [refreshKey]);

  const fetchBooks = async () => {
    try {
      setLoading(true);

      // Determine status based on active tab
      let status = statusFilter;
      if (activeTab === 'published') status = 'published';
      else if (activeTab === 'draft') status = 'draft';
      else if (activeTab === 'review') status = 'review';
      else if (activeTab === 'vectorizing') {
        // Special handling for vectorization tab
        const response = await adminApi.getBooks({
          vector_status: 'processing',
          page: currentPage,
          limit: 20,
          sort_by: sortBy,
          sort_order: sortOrder
        });
        setBooks(response.books);
        setTotalPages(response.pagination.total_pages);
        return;
      }

      const response = await adminApi.getBooks({
        search: searchQuery || undefined,
        status: status === 'all' ? undefined : status,
        type: typeFilter === 'all' ? undefined : typeFilter,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: currentPage,
        limit: 20
      });

      setBooks(response.books);
      setTotalPages(response.pagination.total_pages);
    } catch (error) {
      console.error('Failed to fetch books:', error);
      toast.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminApi.getBookStats();
      setStats(response);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleAddBook = () => {
    setEditingBook(null);
    setShowAddDialog(true);
  };

  const handleEditBook = (book) => {
    setEditingBook(book);
    setShowAddDialog(true);
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
      await adminApi.deleteBook(bookId);
      toast.success('Book deleted successfully');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      toast.error('Failed to delete book');
    }
  };

  const handleApproveBook = async (bookId: string, vectorize: boolean = true) => {
    try {
      await adminApi.approveBook(bookId, vectorize);
      toast.success('Book approved successfully');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      toast.error('Failed to approve book');
    }
  };

  const handleRejectBook = async (bookId: string, reason: string) => {
    try {
      await adminApi.rejectBook(bookId, reason);
      toast.success('Book rejected');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      toast.error('Failed to reject book');
    }
  };

  const handleVectorizeBook = async (bookId: string) => {
    try {
      await adminApi.vectorizeBook(bookId);
      toast.success('Vectorization started');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      toast.error('Failed to start vectorization');
    }
  };

  const handleBulkAction = async (action: string, params?: any) => {
    if (selectedBooks.length === 0) {
      toast.error('No books selected');
      return;
    }

    try {
      await adminApi.batchBookOperation(selectedBooks, action, params);
      toast.success(`Batch ${action} completed`);
      setSelectedBooks([]);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      toast.error(`Failed to perform batch ${action}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Books Management</h1>
          <p className="text-muted-foreground">
            Manage books, characters, and content vectorization
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setRefreshKey(prev => prev + 1)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleAddBook}>
            <Plus className="h-4 w-4 mr-2" />
            Add Book
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && <BookStatsCards stats={stats} />}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Books Library</CardTitle>
            <div className="flex gap-2">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search books..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Filters */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ai_known">AI Known</SelectItem>
                  <SelectItem value="vectorized">Vectorized</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="fiction">Fiction</SelectItem>
                  <SelectItem value="non-fiction">Non-Fiction</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="history">History</SelectItem>
                  <SelectItem value="philosophy">Philosophy</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date Added</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="author">Author</SelectItem>
                  <SelectItem value="dialogue_count">Dialogues</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                <BookOpen className="h-4 w-4 mr-2" />
                All Books
              </TabsTrigger>
              <TabsTrigger value="published">
                <CheckCircle className="h-4 w-4 mr-2" />
                Published
              </TabsTrigger>
              <TabsTrigger value="draft">
                <Clock className="h-4 w-4 mr-2" />
                Draft
              </TabsTrigger>
              <TabsTrigger value="review">
                <AlertCircle className="h-4 w-4 mr-2" />
                Under Review
              </TabsTrigger>
              <TabsTrigger value="vectorizing">
                <Database className="h-4 w-4 mr-2" />
                Vectorizing
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {/* Bulk Actions */}
              {selectedBooks.length > 0 && (
                <BookBulkActions
                  selectedCount={selectedBooks.length}
                  onAction={handleBulkAction}
                  onClear={() => setSelectedBooks([])}
                />
              )}

              {/* Books Table */}
              <BookListTable
                books={books}
                loading={loading}
                selectedBooks={selectedBooks}
                onSelectionChange={setSelectedBooks}
                onEdit={handleEditBook}
                onDelete={handleDeleteBook}
                onApprove={handleApproveBook}
                onReject={handleRejectBook}
                onVectorize={handleVectorizeBook}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      {showAddDialog && (
        <BookEditDialog
          book={editingBook}
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSave={() => {
            setShowAddDialog(false);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}