'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/auth-context';
import { Upload, BookOpen, AlertCircle, Crown, Info, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import { UploadZone } from '@/components/upload/upload-zone';
import { BookForm } from '@/components/upload/book-form';
import { UploadQueue } from '@/components/upload/upload-queue';
import { ProcessingStatus } from '@/components/upload/processing-status';
import { useUpload } from '@/hooks/use-upload';

import {
  BookMetadata,
  UploadQuota,
  UploadCheckRequest,
  Upload as UploadType,
} from '@/types/upload';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8888/v1';

function UploadPageContent() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState<'check' | 'metadata' | 'upload' | 'processing'>('check');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bookMetadata, setBookMetadata] = useState<BookMetadata | null>(null);
  const [uploadQuota, setUploadQuota] = useState<UploadQuota | null>(null);
  const [checkResult, setCheckResult] = useState<any>(null);
  const [processingUpload, setProcessingUpload] = useState<UploadType | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const {
    queue,
    activeUploads,
    processing,
    addToQueue,
    removeFromQueue,
    startUpload,
    pauseUpload,
    resumeUpload,
    clearCompleted,
    checkBookExists,
    getProcessingInfo,
  } = useUpload({
    onSuccess: (upload) => {
      setProcessingUpload(upload);
      setCurrentStep('processing');
      toast.success('Book uploaded successfully!');
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchUploadQuota();
    }
  }, [isAuthenticated]);

  // Check user permissions
  const canUpload = user?.membershipTier && user.membershipTier !== 'free';
  const isUnlimited = user?.membershipTier === 'super';

  const fetchUploadQuota = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/upload-quota`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUploadQuota(data);
      }
    } catch (error) {
      console.error('Error fetching upload quota:', error);
    }
  };

  const handleFileSelect = async (file: File, metadata?: any) => {
    setSelectedFile(file);

    // Pre-fill metadata if extracted from filename
    if (metadata) {
      setBookMetadata((prev) => ({
        ...prev,
        title: metadata.title || '',
        author: metadata.author || '',
        categories: [],
        language: 'en',
      } as BookMetadata));
    }

    // Auto-check if book exists
    if (metadata?.title && metadata?.author) {
      setIsChecking(true);
      try {
        const checkRequest: UploadCheckRequest = {
          title: metadata.title,
          author: metadata.author,
        };

        const result = await checkBookExists(checkRequest);
        setCheckResult(result);

        if (result.exists) {
          toast.warning('This book already exists in our library');
        } else if (result.aiKnown) {
          toast.info('AI has knowledge of this book. Processing will be faster.');
        }
      } catch (error) {
        console.error('Error checking book:', error);
      } finally {
        setIsChecking(false);
      }
    }

    setCurrentStep('metadata');
  };

  const handleMetadataSubmit = (metadata: BookMetadata) => {
    setBookMetadata(metadata);

    if (selectedFile) {
      const success = addToQueue(selectedFile, metadata);
      if (success) {
        setCurrentStep('upload');
        toast.success('Book added to upload queue');
      }
    }
  };

  const handleStartUpload = () => {
    if (!canUpload) {
      toast.error('Please upgrade your membership to upload books');
      router.push('/membership');
      return;
    }

    if (uploadQuota && !uploadQuota.unlimited && uploadQuota.used >= uploadQuota.limit) {
      toast.error('Upload quota exceeded. Please upgrade your plan.');
      router.push('/membership');
      return;
    }

    startUpload();
  };

  // Check authentication
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please sign in to upload books</p>
            <Button onClick={() => router.push('/auth/signin')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check membership permissions
  if (!canUpload) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Premium Feature</h2>
            <p className="text-gray-600 mb-4">
              Book upload is available for Premium and Super members
            </p>
            <Button onClick={() => router.push('/membership')}>
              Upgrade Membership
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Upload Book</h1>
            <p className="text-gray-600 mt-1">
              Share your knowledge with the community
            </p>
          </div>

          <Button variant="outline" onClick={() => router.push('/upload/manage')}>
            <BookOpen className="h-4 w-4 mr-2" />
            My Books
          </Button>
        </div>

        {/* Upload Quota */}
        {uploadQuota && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <p className="text-sm text-gray-600">Upload Quota</p>
                    <p className="font-medium">
                      {uploadQuota.unlimited ? (
                        <span className="text-green-600">Unlimited</span>
                      ) : (
                        <>
                          {uploadQuota.used} / {uploadQuota.limit} books this month
                        </>
                      )}
                    </p>
                  </div>
                  {!uploadQuota.unlimited && (
                    <Progress
                      value={(uploadQuota.used / uploadQuota.limit) * 100}
                      className="w-32"
                    />
                  )}
                </div>

                <Badge variant={isUnlimited ? 'default' : 'secondary'}>
                  {user?.membershipTier?.toUpperCase()} Member
                </Badge>
              </div>

              {uploadQuota.resetDate && !uploadQuota.unlimited && (
                <p className="text-xs text-gray-500 mt-2">
                  Resets on {new Date(uploadQuota.resetDate).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Upload Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Upload Steps */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={currentStep} onValueChange={(value: any) => setCurrentStep(value)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="check" disabled={currentStep === 'processing'}>
                Check
              </TabsTrigger>
              <TabsTrigger value="metadata" disabled={!selectedFile || currentStep === 'processing'}>
                Metadata
              </TabsTrigger>
              <TabsTrigger value="upload" disabled={!bookMetadata || currentStep === 'processing'}>
                Upload
              </TabsTrigger>
              <TabsTrigger value="processing" disabled={!processingUpload}>
                Processing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="check" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Step 1: Select Your Book File</CardTitle>
                  <CardDescription>
                    Choose a book file to upload. We'll check if it already exists.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UploadZone
                    onFileSelect={handleFileSelect}
                    disabled={isChecking}
                    error={checkResult?.exists ? 'This book already exists' : undefined}
                  />

                  {checkResult && (
                    <Alert className="mt-4" variant={checkResult.exists ? 'destructive' : 'default'}>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        {checkResult.message || (checkResult.exists
                          ? 'This book is already in our library'
                          : 'This is a new book. You can proceed with upload.')}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metadata" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Step 2: Book Information</CardTitle>
                  <CardDescription>
                    Provide details about your book to help others discover it
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BookForm
                    initialData={bookMetadata || undefined}
                    onSubmit={handleMetadataSubmit}
                    onCancel={() => setCurrentStep('check')}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upload" className="mt-6">
              <UploadQueue
                queue={queue}
                onRemove={removeFromQueue}
                onPause={pauseUpload}
                onResume={resumeUpload}
                onStartUpload={handleStartUpload}
                onClearCompleted={clearCompleted}
                activeUploads={activeUploads}
              />
            </TabsContent>

            <TabsContent value="processing" className="mt-6">
              {processingUpload ? (
                <ProcessingStatus upload={processingUpload} />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-gray-600">Waiting for upload to complete...</p>
                  </CardContent>
                </Card>
              )}

              {processingUpload?.status === 'completed' && (
                <Card className="mt-4">
                  <CardContent className="py-8 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Upload Complete!</h3>
                    <p className="text-gray-600 mb-4">
                      Your book is now available for dialogues
                    </p>
                    <div className="flex justify-center space-x-4">
                      <Button
                        variant="outline"
                        onClick={() => router.push('/upload/manage')}
                      >
                        Manage Books
                      </Button>
                      <Button
                        onClick={() => router.push(`/books/${processingUpload.bookId}`)}
                      >
                        View Book
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Help & Tips */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Supported Formats</p>
                  <p className="text-gray-600">PDF, EPUB, TXT, DOCX</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Maximum File Size</p>
                  <p className="text-gray-600">100MB per file</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Content Guidelines</p>
                  <p className="text-gray-600">
                    Ensure you have rights to upload the content
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Processing Time</p>
                  <p className="text-gray-600">
                    Usually 2-5 minutes depending on file size
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tips for Success</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <p>• Provide accurate metadata for better discoverability</p>
              <p>• Choose relevant categories to help users find your book</p>
              <p>• Add character information for enhanced dialogue experiences</p>
              <p>• Upload a cover image to make your book more appealing</p>
              <p>• Keep your book description concise but informative</p>
            </CardContent>
          </Card>

          {/* Processing queue info */}
          {processing.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">
                  {processing.size} book{processing.size !== 1 ? 's' : ''} being processed
                </p>
                {Array.from(processing.values()).map((upload) => (
                  <div key={upload.id} className="text-xs text-gray-500">
                    • {upload.title}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <AuthGuard redirectTo="/auth/login?redirect=/upload">
      <UploadPageContent />
    </AuthGuard>
  );
}