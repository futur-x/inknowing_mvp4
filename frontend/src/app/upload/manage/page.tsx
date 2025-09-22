'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/auth-context';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookManager } from '@/components/upload/book-manager';

function ManageBooksPageContent() {
  const router = useRouter();
  const { user } = useAuth();

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

export default function ManageBooksPage() {
  return (
    <AuthGuard redirectTo="/auth/login?redirect=/upload/manage">
      <ManageBooksPageContent />
    </AuthGuard>
  );
}