'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  UploadFile,
  UploadCheckRequest,
  UploadCheckResponse,
  BookMetadata,
  Upload,
  UploadStatus,
} from '@/types/upload';
import {
  validateFileType,
  validateFileSize,
  createFileId,
  isDuplicateFile,
  createUploadFormData,
  parseUploadError,
  calculateUploadMetrics,
  saveUploadState,
  clearUploadState,
} from '@/lib/upload-utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8888/api';

interface UseUploadOptions {
  onSuccess?: (upload: Upload) => void;
  onError?: (error: string) => void;
  maxConcurrent?: number;
}

export function useUpload(options: UseUploadOptions = {}) {
  const { onSuccess, onError, maxConcurrent = 3 } = options;
  const router = useRouter();

  const [queue, setQueue] = useState<UploadFile[]>([]);
  const [activeUploads, setActiveUploads] = useState<Map<string, XMLHttpRequest>>(new Map());
  const [processing, setProcessing] = useState<Map<string, Upload>>(new Map());
  const uploadStartTimes = useRef<Map<string, number>>(new Map());

  // Check if book exists
  const checkBookExists = useCallback(async (data: UploadCheckRequest): Promise<UploadCheckResponse> => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/uploads/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to check book existence');
      }

      return await response.json();
    } catch (error) {
      console.error('Book check error:', error);
      throw error;
    }
  }, []);

  // Add file to queue
  const addToQueue = useCallback((file: File, metadata?: Partial<BookMetadata>) => {
    const fileType = validateFileType(file);

    if (!fileType) {
      toast.error('Invalid file type. Only PDF, EPUB, TXT, and DOCX are supported.');
      return false;
    }

    if (!validateFileSize(file, fileType)) {
      toast.error(`File size exceeds limit for ${fileType.toUpperCase()} files.`);
      return false;
    }

    if (isDuplicateFile(file, queue)) {
      toast.error('This file is already in the upload queue.');
      return false;
    }

    const uploadFile: UploadFile = {
      id: createFileId(file),
      file,
      filename: file.name,
      fileSize: file.size,
      fileType,
      status: 'pending',
      progress: 0,
      metadata: metadata as BookMetadata,
    };

    setQueue(prev => [...prev, uploadFile]);
    return true;
  }, [queue]);

  // Remove from queue
  const removeFromQueue = useCallback((fileId: string) => {
    // Cancel active upload if exists
    const xhr = activeUploads.get(fileId);
    if (xhr) {
      xhr.abort();
      activeUploads.delete(fileId);
      setActiveUploads(new Map(activeUploads));
    }

    // Remove from queue
    setQueue(prev => prev.filter(item => item.id !== fileId));

    // Clear saved state
    clearUploadState(fileId);
  }, [activeUploads]);

  // Upload file
  const uploadFile = useCallback(async (uploadFile: UploadFile) => {
    const { id, file, metadata } = uploadFile;

    // Update status to uploading
    setQueue(prev =>
      prev.map(item =>
        item.id === id ? { ...item, status: 'uploading' } : item
      )
    );

    // Save start time
    uploadStartTimes.current.set(id, Date.now());

    // Create form data
    const formData = createUploadFormData(file, metadata || {});

    // Create XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const metrics = calculateUploadMetrics(
          event.loaded,
          event.total,
          uploadStartTimes.current.get(id) || Date.now()
        );

        setQueue(prev =>
          prev.map(item =>
            item.id === id
              ? {
                  ...item,
                  progress: metrics.progress,
                  uploadSpeed: metrics.speed,
                  remainingTime: metrics.remainingTime,
                }
              : item
          )
        );

        // Save state for resume
        saveUploadState(id, {
          loaded: event.loaded,
          total: event.total,
          metadata,
        });
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);

          // Update status to processing
          setQueue(prev =>
            prev.map(item =>
              item.id === id ? { ...item, status: 'processing', progress: 100 } : item
            )
          );

          // Start monitoring processing status
          startProcessingMonitor(response.uploadId, id);

          // Clear saved state
          clearUploadState(id);

          toast.success('File uploaded successfully!');
        } catch (error) {
          handleUploadError(id, 'Failed to parse upload response');
        }
      } else {
        const errorMessage = parseUploadError(xhr.responseText);
        handleUploadError(id, errorMessage);
      }

      // Remove from active uploads
      activeUploads.delete(id);
      setActiveUploads(new Map(activeUploads));
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      handleUploadError(id, 'Network error occurred during upload');
      activeUploads.delete(id);
      setActiveUploads(new Map(activeUploads));
    });

    // Handle abort
    xhr.addEventListener('abort', () => {
      setQueue(prev =>
        prev.map(item =>
          item.id === id ? { ...item, status: 'pending', progress: 0 } : item
        )
      );
      activeUploads.delete(id);
      setActiveUploads(new Map(activeUploads));
    });

    // Open connection and send
    const token = localStorage.getItem('token');
    xhr.open('POST', `${API_BASE_URL}/uploads`);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);

    // Track active upload
    activeUploads.set(id, xhr);
    setActiveUploads(new Map(activeUploads));
  }, [activeUploads]);

  // Handle upload error
  const handleUploadError = useCallback((fileId: string, message: string) => {
    setQueue(prev =>
      prev.map(item =>
        item.id === fileId
          ? { ...item, status: 'failed', error: message }
          : item
      )
    );
    toast.error(message);
    onError?.(message);
  }, [onError]);

  // Monitor processing status
  const startProcessingMonitor = useCallback(async (uploadId: string, fileId: string) => {
    const pollInterval = 2000; // 2 seconds
    const maxAttempts = 150; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        handleUploadError(fileId, 'Processing timeout');
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/uploads/${uploadId}/status`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (!response.ok) {
          throw new Error('Failed to get processing status');
        }

        const upload: Upload = await response.json();

        // Update processing state
        setProcessing(prev => new Map(prev).set(fileId, upload));

        if (upload.status === 'completed') {
          // Update queue status
          setQueue(prev =>
            prev.map(item =>
              item.id === fileId ? { ...item, status: 'completed' } : item
            )
          );

          // Clear processing state
          setProcessing(prev => {
            const newMap = new Map(prev);
            newMap.delete(fileId);
            return newMap;
          });

          toast.success('Book processing completed!');
          onSuccess?.(upload);
        } else if (upload.status === 'failed') {
          handleUploadError(fileId, upload.errorMessage || 'Processing failed');

          // Clear processing state
          setProcessing(prev => {
            const newMap = new Map(prev);
            newMap.delete(fileId);
            return newMap;
          });
        } else {
          // Continue polling
          attempts++;
          setTimeout(poll, pollInterval);
        }
      } catch (error) {
        console.error('Processing monitor error:', error);
        attempts++;
        setTimeout(poll, pollInterval);
      }
    };

    poll();
  }, [onSuccess, handleUploadError]);

  // Start upload process
  const startUpload = useCallback(() => {
    const pendingUploads = queue.filter(item => item.status === 'pending');
    const currentlyUploading = queue.filter(item => item.status === 'uploading').length;
    const availableSlots = maxConcurrent - currentlyUploading;

    if (availableSlots > 0 && pendingUploads.length > 0) {
      const toUpload = pendingUploads.slice(0, availableSlots);
      toUpload.forEach(uploadFile);
    }
  }, [queue, maxConcurrent, uploadFile]);

  // Pause upload
  const pauseUpload = useCallback((fileId: string) => {
    const xhr = activeUploads.get(fileId);
    if (xhr) {
      xhr.abort();
    }
  }, [activeUploads]);

  // Resume upload
  const resumeUpload = useCallback((fileId: string) => {
    const uploadFile = queue.find(item => item.id === fileId);
    if (uploadFile && uploadFile.status === 'pending') {
      startUpload();
    }
  }, [queue, startUpload]);

  // Clear completed uploads
  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(item => item.status !== 'completed'));
  }, []);

  // Get processing info for a file
  const getProcessingInfo = useCallback((fileId: string) => {
    return processing.get(fileId);
  }, [processing]);

  return {
    queue,
    activeUploads: activeUploads.size,
    processing,
    addToQueue,
    removeFromQueue,
    startUpload,
    pauseUpload,
    resumeUpload,
    clearCompleted,
    checkBookExists,
    getProcessingInfo,
  };
}