// Upload Hooks - InKnowing MVP 4.0
// Business Logic Conservation: File upload and processing management

import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { api } from '@/lib/api'
import { swrConfig } from './swr-config'
import { useAuthStore } from '@/stores/auth'
import type { Upload, BookUploadFormData } from '@/types/api'

// Hook for user uploads - Business Logic: User upload history
export function useMyUploads(params: {
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'all'
  page?: number
  limit?: number
} = {}) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  const queryString = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined)
    ) as Record<string, string>
  ).toString()

  const key = isAuthenticated
    ? `/uploads/my${queryString ? `?${queryString}` : ''}`
    : null

  const { data, error, isLoading, mutate } = useSWR<{
    uploads: Upload[]
    pagination: any
  }>(
    key,
    () => api.uploads.getMy(params),
    {
      ...swrConfig,
      refreshInterval: 1000 * 5, // Refresh every 5 seconds for processing status
      revalidateOnFocus: true,
    }
  )

  return {
    uploads: data?.uploads || [],
    pagination: data?.pagination || null,
    isLoading,
    error,
    mutate,
  }
}

// Hook for infinite loading of uploads
export function useMyUploadsInfinite(params: {
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'all'
  limit?: number
} = {}) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (!isAuthenticated) return null
    if (previousPageData && !previousPageData.pagination?.has_next) return null

    const queryParams = {
      ...params,
      page: pageIndex + 1,
    }

    const queryString = new URLSearchParams(
      Object.fromEntries(
        Object.entries(queryParams).filter(([_, value]) => value !== undefined)
      ) as Record<string, string>
    ).toString()

    return `/uploads/my?${queryString}`
  }

  const { data, error, size, setSize, isLoading, mutate } = useSWRInfinite<{
    uploads: Upload[]
    pagination: any
  }>(
    getKey,
    (url) => {
      const searchParams = new URLSearchParams(url.split('?')[1])
      const fetchParams = {
        ...params,
        page: parseInt(searchParams.get('page') || '1'),
      }
      return api.uploads.getMy(fetchParams)
    },
    {
      ...swrConfig,
      refreshInterval: 1000 * 5,
    }
  )

  const uploads = data ? data.flatMap(page => page.uploads) : []
  const hasMore = data ? data[data.length - 1]?.pagination?.has_next ?? false : false

  return {
    uploads,
    isLoading,
    error,
    hasMore,
    loadMore: () => setSize(size + 1),
    mutate,
  }
}

// Hook for tracking a specific upload - Business Logic: Upload progress monitoring
export function useUpload(uploadId: string | null, pollingInterval = 2000) {
  const key = uploadId ? `/uploads/${uploadId}` : null

  const { data, error, isLoading, mutate } = useSWR<Upload>(
    key,
    () => uploadId ? api.uploads.getStatus(uploadId) : null,
    {
      ...swrConfig,
      refreshInterval: data?.status === 'pending' || data?.status === 'processing'
        ? pollingInterval
        : 0, // Only poll while upload is processing
      revalidateOnFocus: true,
    }
  )

  const upload = data || null

  return {
    upload,
    isLoading,
    error,
    mutate,
    // Status helpers
    isPending: upload?.status === 'pending',
    isProcessing: upload?.status === 'processing',
    isCompleted: upload?.status === 'completed',
    isFailed: upload?.status === 'failed',
    // Progress calculation
    progress: upload ? calculateUploadProgress(upload) : 0,
    currentStep: upload ? getCurrentProcessingStep(upload) : null,
    // Helper data
    filename: upload?.filename || '',
    title: upload?.title || '',
    author: upload?.author || '',
    fileSize: upload?.file_size || 0,
    pointsEarned: upload?.points_earned || 0,
    error: upload?.error_message || error,
    // Processing steps
    processingSteps: upload?.processing_steps || [],
  }
}

// Helper function to calculate upload progress
function calculateUploadProgress(upload: Upload): number {
  if (upload.status === 'completed') return 100
  if (upload.status === 'failed') return 0
  if (!upload.processing_steps || upload.processing_steps.length === 0) return 0

  const totalSteps = upload.processing_steps.length
  let completedSteps = 0
  let totalProgress = 0

  for (const step of upload.processing_steps) {
    if (step.status === 'completed') {
      completedSteps += 1
      totalProgress += 100
    } else if (step.status === 'processing') {
      totalProgress += step.progress
    }
  }

  return Math.round(totalProgress / totalSteps)
}

// Helper function to get current processing step
function getCurrentProcessingStep(upload: Upload): string | null {
  if (!upload.processing_steps || upload.processing_steps.length === 0) return null

  const currentStep = upload.processing_steps.find(step => step.status === 'processing')
  if (currentStep) {
    return getStepDisplayName(currentStep.step)
  }

  const lastCompletedStep = upload.processing_steps
    .filter(step => step.status === 'completed')
    .pop()

  if (lastCompletedStep) {
    const currentIndex = upload.processing_steps.indexOf(lastCompletedStep)
    const nextStep = upload.processing_steps[currentIndex + 1]
    if (nextStep) {
      return getStepDisplayName(nextStep.step)
    }
  }

  return null
}

// Helper function to get user-friendly step names
function getStepDisplayName(step: string): string {
  const stepNames: Record<string, string> = {
    'ai_detection': 'AI Knowledge Detection',
    'text_preprocessing': 'Text Processing',
    'chapter_extraction': 'Chapter Extraction',
    'character_extraction': 'Character Analysis',
    'vectorization': 'Content Vectorization',
    'indexing': 'Indexing',
    'model_generation': 'AI Model Generation',
  }
  return stepNames[step] || step
}

// Hook for upload management (check existence, upload, track)
export function useUploadFlow() {
  const { mutate: mutateMyUploads } = useMyUploads()

  const checkBookExists = async (title: string, author: string) => {
    try {
      const result = await api.uploads.check(title, author)
      return result
    } catch (error) {
      throw error
    }
  }

  const uploadBook = async (formData: FormData) => {
    try {
      const upload = await api.uploads.upload(formData)

      // Refresh uploads list
      mutateMyUploads()

      return upload
    } catch (error) {
      throw error
    }
  }

  return {
    checkBookExists,
    uploadBook,
    // Re-export uploads list for convenience
    uploads: useMyUploads(),
  }
}

// Hook for upload statistics and analytics
export function useUploadStats() {
  const { uploads } = useMyUploads({ status: 'all' })

  if (!uploads || uploads.length === 0) {
    return {
      totalUploads: 0,
      completedUploads: 0,
      failedUploads: 0,
      processingUploads: 0,
      totalPointsEarned: 0,
      successRate: 0,
      averageFileSize: 0,
    }
  }

  const completed = uploads.filter(u => u.status === 'completed')
  const failed = uploads.filter(u => u.status === 'failed')
  const processing = uploads.filter(u => u.status === 'processing' || u.status === 'pending')

  const totalPoints = uploads.reduce((sum, u) => sum + u.points_earned, 0)
  const totalSize = uploads.reduce((sum, u) => sum + u.file_size, 0)
  const avgSize = uploads.length > 0 ? totalSize / uploads.length : 0

  const successRate = uploads.length > 0
    ? (completed.length / (completed.length + failed.length)) * 100
    : 0

  return {
    totalUploads: uploads.length,
    completedUploads: completed.length,
    failedUploads: failed.length,
    processingUploads: processing.length,
    totalPointsEarned: totalPoints,
    successRate: Math.round(successRate),
    averageFileSize: Math.round(avgSize),
  }
}