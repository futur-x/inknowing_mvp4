'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { adminApi, type AdminBook, type AdminDialogue } from '@/lib/admin-api';
import {
  Search,
  Filter,
  BookOpen,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Trash2,
  Flag,
  Star,
  Clock,
  User,
  Download,
  TrendingUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ContentManagementPage() {
  const searchParams = useSearchParams();
  const [books, setBooks] = useState<AdminBook[]>([]);
  const [dialogues, setDialogues] = useState<AdminDialogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('books');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [selectedBook, setSelectedBook] = useState<AdminBook | null>(null);
  const [showBookDetails, setShowBookDetails] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Check for filter parameter
    if (searchParams.get('filter') === 'pending') {
      setStatusFilter('pending');
      setActiveTab('books');
    }

    if (activeTab === 'books') {
      fetchBooks();
    } else {
      fetchDialogues();
    }
  }, [activeTab, searchQuery, statusFilter, sortBy]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getBooks({
        page: 1,
        limit: 50,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
        sortBy
      });
      setBooks(data.books);
      setPendingCount(data.books.filter(b => b.status === 'pending').length);
    } catch (err) {
      console.error('Failed to fetch books:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDialogues = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getDialogues({
        page: 1,
        limit: 50,
        active: statusFilter === 'active' ? true : undefined
      });
      setDialogues(data.dialogues);
    } catch (err) {
      console.error('Failed to fetch dialogues:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBook = async (bookId: string) => {
    try {
      await adminApi.approveBook(bookId);
      fetchBooks(); // Refresh list
      setShowBookDetails(false);
    } catch (err) {
      console.error('Failed to approve book:', err);
    }
  };

  const handleRejectBook = async () => {
    if (!selectedBook || !rejectReason.trim()) return;

    try {
      await adminApi.rejectBook(selectedBook.id, rejectReason);
      fetchBooks(); // Refresh list
      setShowRejectDialog(false);
      setShowBookDetails(false);
      setRejectReason('');
    } catch (err) {
      console.error('Failed to reject book:', err);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
      return;
    }

    try {
      await adminApi.deleteBook(bookId);
      fetchBooks(); // Refresh list
      setShowBookDetails(false);
    } catch (err) {
      console.error('Failed to delete book:', err);
    }
  };

  const viewBookDetails = async (book: AdminBook) => {
    setSelectedBook(book);
    setShowBookDetails(true);
    // Fetch additional details if needed
  };

  const viewDialogueMessages = async (dialogue: AdminDialogue) => {
    try {
      const messages = await adminApi.getDialogueMessages(dialogue.id);
      console.log('Dialogue messages:', messages);
      // Show messages in a modal or panel
    } catch (err) {
      console.error('Failed to fetch dialogue messages:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
          <p className="text-muted-foreground">
            Moderate books, dialogues, and user-generated content
          </p>
        </div>
        {pendingCount > 0 && (
          <Alert className="max-w-sm">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{pendingCount} books</strong> pending review
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{books.length}</div>
            <p className="text-xs text-muted-foreground">
              {books.filter(b => b.status === 'approved').length} approved
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingCount}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Dialogues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dialogues.filter(d => !d.endTime).length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Flagged Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {books.filter(b => b.flagCount > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <TabsList>
                <TabsTrigger value="books" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Books
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-1">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="dialogues" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Dialogues
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-[250px]"
                  />
                </div>
                {activeTab === 'books' && (
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="All status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {activeTab === 'dialogues' && (
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="All dialogues" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </Tabs>
        </CardHeader>

        <CardContent>
          <TabsContent value="books" className="mt-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Uploader</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Metrics</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {books.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{book.title}</p>
                          <p className="text-sm text-muted-foreground">by {book.author}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{book.uploaderName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            book.status === 'approved' ? 'default' :
                            book.status === 'pending' ? 'secondary' : 'destructive'
                          }
                        >
                          {book.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {book.dialogueCount}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {book.rating.toFixed(1)}
                          </div>
                          {book.flagCount > 0 && (
                            <div className="flex items-center gap-1 text-red-600">
                              <Flag className="h-3 w-3" />
                              {book.flagCount}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {formatDistanceToNow(new Date(book.createdAt), { addSuffix: true })}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewBookDetails(book)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {book.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600"
                                onClick={() => handleApproveBook(book.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedBook(book);
                                  setShowRejectDialog(true);
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDeleteBook(book.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="dialogues" className="mt-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Book/Character</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dialogues.map((dialogue) => (
                    <TableRow key={dialogue.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{dialogue.userName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{dialogue.bookTitle}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {dialogue.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {dialogue.endTime ? (
                          <p className="text-sm">
                            {Math.round((new Date(dialogue.endTime).getTime() -
                                       new Date(dialogue.startTime).getTime()) / 60000)} min
                          </p>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-sm">Active</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{dialogue.messageCount}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{dialogue.tokensUsed.toLocaleString()}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDialogueMessages(dialogue)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </CardContent>
      </Card>

      {/* Book Details Dialog */}
      <Dialog open={showBookDetails} onOpenChange={setShowBookDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book Details</DialogTitle>
            <DialogDescription>
              Review book content and metadata
            </DialogDescription>
          </DialogHeader>
          {selectedBook && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Title</p>
                  <p className="text-sm text-muted-foreground">{selectedBook.title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Author</p>
                  <p className="text-sm text-muted-foreground">{selectedBook.author}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Uploader</p>
                  <p className="text-sm text-muted-foreground">{selectedBook.uploaderName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge
                    variant={
                      selectedBook.status === 'approved' ? 'default' :
                      selectedBook.status === 'pending' ? 'secondary' : 'destructive'
                    }
                  >
                    {selectedBook.status}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Content Preview</p>
                <ScrollArea className="h-[200px] border rounded-md p-4">
                  <p className="text-sm text-muted-foreground">
                    [Book content would be displayed here...]
                  </p>
                </ScrollArea>
              </div>

              {selectedBook.flagCount > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This book has been flagged {selectedBook.flagCount} times
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                {selectedBook.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRejectDialog(true);
                      }}
                    >
                      Reject
                    </Button>
                    <Button onClick={() => handleApproveBook(selectedBook.id)}>
                      Approve
                    </Button>
                  </>
                )}
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteBook(selectedBook.id)}
                >
                  Delete Book
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Book Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Book</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this book
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectBook}
              disabled={!rejectReason.trim()}
            >
              Reject Book
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}