/**
 * Chat Index Page
 * Allows users to select a book to chat with or continue existing conversations
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, MessageSquare, Search, Plus, Clock, Users, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { api } from '@/lib/api';
import { Book } from '@/types/book';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function ChatIndexPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { activeSessions, createBookDialogue, createCharacterDialogue } = useChatStore();

  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState<string | null>(null);

  // Load books on mount and handle bookId/characterId parameters
  useEffect(() => {
    loadBooks();

    // If bookId is provided in URL params, auto-start chat with that book
    const bookId = searchParams.get('bookId');
    const characterId = searchParams.get('characterId');

    if (bookId && isAuthenticated) {
      if (characterId) {
        handleStartCharacterChat(bookId, characterId);
      } else {
        handleStartBookChat(bookId);
      }
    }
  }, [searchParams, isAuthenticated]);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/chat');
    }
  }, [isAuthenticated, router]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const response = await api.books.list({ limit: 12 });
      setBooks(response.books || []);
    } catch (error) {
      console.error('Failed to load books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartBookChat = async (bookId: string) => {
    try {
      setCreatingSession(bookId);

      // Create a new chat session for the book
      const sessionId = await createBookDialogue(bookId);

      // Navigate to the chat page with the new session
      router.push(`/chat/book/${sessionId}`);
    } catch (error) {
      console.error('Failed to create chat session:', error);
      alert('创建对话失败，请稍后重试');
    } finally {
      setCreatingSession(null);
    }
  };

  const handleStartCharacterChat = async (bookId: string, characterId: string) => {
    try {
      setCreatingSession(`${bookId}-${characterId}`);

      // Create a new character chat session
      const sessionId = await createCharacterDialogue(bookId, characterId);

      // Navigate to the chat page with the new session
      router.push(`/chat/character/${sessionId}`);
    } catch (error) {
      console.error('Failed to create character chat session:', error);
      alert('创建角色对话失败，请稍后重试');
    } finally {
      setCreatingSession(null);
    }
  };

  const handleContinueSession = (sessionId: string, type: 'book' | 'character') => {
    router.push(`/chat/${type}/${sessionId}`);
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get recent sessions
  const recentSessions = Array.from(activeSessions.values())
    .sort((a, b) => new Date(b.session.updated_at).getTime() - new Date(a.session.updated_at).getTime())
    .slice(0, 5);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">开始对话</h1>
        <p className="text-muted-foreground">
          选择一本书开始对话，或继续您之前的对话
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="new" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="new">
            <Plus className="mr-2 h-4 w-4" />
            新对话
          </TabsTrigger>
          <TabsTrigger value="recent">
            <Clock className="mr-2 h-4 w-4" />
            最近对话
          </TabsTrigger>
        </TabsList>

        {/* New Chat Tab */}
        <TabsContent value="new" className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索书籍..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Books Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-muted rounded mb-4" />
                    <div className="h-8 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBooks.map((book) => (
                <Card key={book.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg line-clamp-1">{book.title}</CardTitle>
                    <CardDescription>{book.author}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {book.description}
                    </p>
                    <div className="flex items-center gap-2 mb-4">
                      {book.vectorized && (
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <Sparkles className="h-3 w-3" />
                          <span>AI增强</span>
                        </div>
                      )}
                      {book.characters && book.characters.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{book.characters.length} 角色</span>
                        </div>
                      )}
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleStartBookChat(book.id)}
                      disabled={creatingSession === book.id}
                    >
                      {creatingSession === book.id ? (
                        <>创建对话中...</>
                      ) : (
                        <>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          开始对话
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredBooks.length === 0 && !loading && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">没有找到匹配的书籍</p>
            </div>
          )}
        </TabsContent>

        {/* Recent Sessions Tab */}
        <TabsContent value="recent" className="space-y-4">
          {recentSessions.length > 0 ? (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <Card
                  key={session.session.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleContinueSession(
                    session.session.id,
                    session.session.dialogue_type === 'book_chat' ? 'book' : 'character'
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">
                          {session.session.dialogue_type === 'book_chat' ? (
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              <span>书籍对话</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>角色对话</span>
                            </div>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {session.session.updated_at
                            ? formatDistanceToNow(new Date(session.session.updated_at), {
                                addSuffix: true,
                                locale: zhCN
                              })
                            : '刚刚'}
                        </CardDescription>
                      </div>
                      <Button variant="ghost" size="sm">
                        继续
                      </Button>
                    </div>
                  </CardHeader>
                  {session.messages.length > 0 && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {session.messages[session.messages.length - 1].content}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无对话记录</p>
              <p className="text-sm text-muted-foreground mt-2">
                选择一本书开始您的第一次对话
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}