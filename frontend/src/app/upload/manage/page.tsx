'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Plus, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookManager } from '@/components/upload/book-manager';

export default function ManageBooksPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // Check authentication
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please sign in to manage your books</p>
            <Button onClick={() => router.push('/auth/signin')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Books</h1>
          <p className="text-gray-600 mt-1">
            Manage your uploaded books and track their performance
          </p>
        </div>

        <Button onClick={() => router.push('/upload')}>
          <Plus className="h-4 w-4 mr-2" />
          Upload New Book
        </Button>
      </div>

      {/* Book Manager Component */}
      <BookManager userId={user?.id} />
    </div>
  );
}