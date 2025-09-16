// Upload utility functions
import { FileType, FileTypeConfig, UploadFile, ProcessingStep, ProcessingStepLabels } from '@/types/upload';

/**
 * Validate file type
 */
export function validateFileType(file: File): FileType | null {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'epub':
      return 'epub';
    case 'txt':
      return 'txt';
    case 'docx':
      return 'docx';
    default:
      return null;
  }
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, fileType: FileType): boolean {
  const config = FileTypeConfig[fileType];
  return file.size <= config.maxSize;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format upload speed
 */
export function formatUploadSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) {
    return `${Math.round(bytesPerSecond)} B/s`;
  } else if (bytesPerSecond < 1024 * 1024) {
    return `${Math.round(bytesPerSecond / 1024)} KB/s`;
  } else {
    return `${Math.round(bytesPerSecond / (1024 * 1024) * 10) / 10} MB/s`;
  }
}

/**
 * Format remaining time
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  } else {
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  }
}

/**
 * Calculate upload progress
 */
export function calculateUploadProgress(loaded: number, total: number): number {
  return Math.round((loaded / total) * 100);
}

/**
 * Calculate upload speed and remaining time
 */
export function calculateUploadMetrics(
  loaded: number,
  total: number,
  startTime: number
): {
  progress: number;
  speed: number;
  remainingTime: number;
} {
  const now = Date.now();
  const elapsedTime = (now - startTime) / 1000; // seconds
  const speed = loaded / elapsedTime; // bytes per second
  const remaining = total - loaded;
  const remainingTime = remaining / speed; // seconds
  const progress = calculateUploadProgress(loaded, total);

  return {
    progress,
    speed,
    remainingTime,
  };
}

/**
 * Create file ID for tracking
 */
export function createFileId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * Check if file is duplicate in queue
 */
export function isDuplicateFile(file: File, queue: UploadFile[]): boolean {
  const fileId = createFileId(file);
  return queue.some(item => item.id === fileId);
}

/**
 * Get accept string for file input
 */
export function getAcceptString(): string {
  return Object.values(FileTypeConfig)
    .map(config => config.accept)
    .join(',');
}

/**
 * Extract metadata from filename
 */
export function extractMetadataFromFilename(filename: string): {
  title?: string;
  author?: string;
} {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  // Try to extract author and title (format: "Author - Title" or "Title by Author")
  const dashPattern = /^(.+?)\s*-\s*(.+)$/;
  const byPattern = /^(.+?)\s+by\s+(.+)$/i;

  let match = nameWithoutExt.match(dashPattern);
  if (match) {
    return {
      author: match[1].trim(),
      title: match[2].trim(),
    };
  }

  match = nameWithoutExt.match(byPattern);
  if (match) {
    return {
      title: match[1].trim(),
      author: match[2].trim(),
    };
  }

  // Default: use filename as title
  return {
    title: nameWithoutExt,
  };
}

/**
 * Get file icon based on type
 */
export function getFileIcon(fileType: FileType): string {
  return FileTypeConfig[fileType].icon;
}

/**
 * Get processing step label
 */
export function getProcessingStepLabel(step: ProcessingStep): string {
  return ProcessingStepLabels[step];
}

/**
 * Calculate overall processing progress
 */
export function calculateOverallProgress(steps: Array<{
  status: string;
  progress: number;
}>): number {
  if (steps.length === 0) return 0;

  const totalProgress = steps.reduce((sum, step) => {
    if (step.status === 'completed') return sum + 100;
    if (step.status === 'processing') return sum + step.progress;
    return sum;
  }, 0);

  return Math.round(totalProgress / steps.length);
}

/**
 * Check if upload is resumable
 */
export function isResumableUpload(uploadId: string): boolean {
  // Check localStorage for saved upload state
  const savedState = localStorage.getItem(`upload-${uploadId}`);
  return !!savedState;
}

/**
 * Save upload state for resume
 */
export function saveUploadState(uploadId: string, state: any): void {
  localStorage.setItem(`upload-${uploadId}`, JSON.stringify(state));
}

/**
 * Get saved upload state
 */
export function getUploadState(uploadId: string): any | null {
  const savedState = localStorage.getItem(`upload-${uploadId}`);
  return savedState ? JSON.parse(savedState) : null;
}

/**
 * Clear upload state
 */
export function clearUploadState(uploadId: string): void {
  localStorage.removeItem(`upload-${uploadId}`);
}

/**
 * Validate ISBN format
 */
export function validateISBN(isbn: string): boolean {
  // Remove hyphens and spaces
  const cleanISBN = isbn.replace(/[-\s]/g, '');

  // Check ISBN-10
  if (cleanISBN.length === 10) {
    return /^\d{9}[\dX]$/.test(cleanISBN);
  }

  // Check ISBN-13
  if (cleanISBN.length === 13) {
    return /^\d{13}$/.test(cleanISBN);
  }

  return false;
}

/**
 * Format ISBN for display
 */
export function formatISBN(isbn: string): string {
  const cleanISBN = isbn.replace(/[-\s]/g, '');

  if (cleanISBN.length === 10) {
    return `${cleanISBN.slice(0, 1)}-${cleanISBN.slice(1, 5)}-${cleanISBN.slice(5, 9)}-${cleanISBN.slice(9)}`;
  }

  if (cleanISBN.length === 13) {
    return `${cleanISBN.slice(0, 3)}-${cleanISBN.slice(3, 4)}-${cleanISBN.slice(4, 8)}-${cleanISBN.slice(8, 12)}-${cleanISBN.slice(12)}`;
  }

  return isbn;
}

/**
 * Estimate processing time based on file size
 */
export function estimateProcessingTime(fileSize: number): number {
  // Rough estimate: 1MB = 10 seconds
  const baseTime = (fileSize / (1024 * 1024)) * 10;

  // Add fixed overhead for various processing steps
  const overhead = 30; // seconds

  return Math.round(baseTime + overhead);
}

/**
 * Create FormData for upload
 */
export function createUploadFormData(file: File, metadata: any): FormData {
  const formData = new FormData();
  formData.append('file', file);

  // Add metadata fields
  Object.keys(metadata).forEach(key => {
    const value = metadata[key];
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    }
  });

  return formData;
}

/**
 * Parse error response
 */
export function parseUploadError(error: any): string {
  if (typeof error === 'string') return error;

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.message) {
    return error.message;
  }

  return 'An unknown error occurred during upload';
}