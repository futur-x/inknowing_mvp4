// Upload related type definitions
// Aligned with futurxlab API specifications

export type FileType = 'pdf' | 'epub' | 'txt' | 'docx';

export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';

export type ProcessingStep =
  | 'ai_detection'
  | 'text_preprocessing'
  | 'chapter_extraction'
  | 'character_extraction'
  | 'vectorization'
  | 'indexing'
  | 'model_generation';

export interface ProcessingStepInfo {
  step: ProcessingStep;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface BookMetadata {
  title: string;
  author: string;
  isbn?: string;
  publicationYear?: number;
  description?: string;
  categories: string[];
  language: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  coverImage?: string | File;
  characters?: BookCharacter[];
}

export interface BookCharacter {
  id?: string;
  name: string;
  description: string;
  role: string;
  traits?: string[];
  avatar?: string;
}

export interface UploadFile {
  id: string;
  file: File;
  filename: string;
  fileSize: number;
  fileType: FileType;
  status: UploadStatus;
  progress: number; // Upload progress 0-100
  uploadSpeed?: number; // Bytes per second
  remainingTime?: number; // Seconds
  error?: string;
  metadata?: BookMetadata;
}

export interface Upload {
  id: string;
  userId: string;
  bookId?: string; // Available after processing
  filename: string;
  fileSize: number;
  fileType: FileType;
  title: string;
  author: string;
  category?: string;
  status: UploadStatus;
  processingSteps: ProcessingStepInfo[];
  aiKnown?: boolean;
  vectorCount?: number;
  extractedCharacters?: string[];
  pointsEarned?: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  metadata?: BookMetadata;
}

export interface UploadCheckRequest {
  title: string;
  author: string;
  isbn?: string;
}

export interface UploadCheckResponse {
  exists: boolean;
  bookId?: string;
  aiKnown?: boolean;
  suggestion?: 'use_existing' | 'use_ai' | 'upload_required';
  message?: string;
}

export interface UploadRequest {
  file: File;
  metadata: BookMetadata;
}

export interface UploadResponse {
  uploadId: string;
  status: UploadStatus;
  message: string;
  estimatedTime?: number; // Seconds
}

export interface UploadQuota {
  used: number;
  limit: number;
  unlimited: boolean;
  resetDate?: string;
}

export interface BookManagementItem {
  id: string;
  bookId?: string;
  title: string;
  author: string;
  coverImage?: string;
  status: 'draft' | 'processing' | 'published' | 'archived';
  uploadStatus?: UploadStatus;
  uploadedAt: string;
  publishedAt?: string;
  views: number;
  dialogues: number;
  rating?: number;
  visibility: 'public' | 'private';
  processingProgress?: number;
  errorMessage?: string;
}

export interface UploadQueueItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface UploadSettings {
  maxFileSize: number; // Bytes
  allowedFileTypes: FileType[];
  maxConcurrentUploads: number;
  chunkSize: number; // For chunked uploads
  autoRetry: boolean;
  retryCount: number;
}

// Processing step display information
export const ProcessingStepLabels: Record<ProcessingStep, string> = {
  ai_detection: 'AI Knowledge Check',
  text_preprocessing: 'Text Processing',
  chapter_extraction: 'Chapter Extraction',
  character_extraction: 'Character Analysis',
  vectorization: 'Creating Embeddings',
  indexing: 'Building Search Index',
  model_generation: 'Preparing AI Model',
};

// File type configurations
export const FileTypeConfig: Record<FileType, {
  accept: string;
  maxSize: number;
  icon: string;
  label: string;
}> = {
  pdf: {
    accept: '.pdf',
    maxSize: 100 * 1024 * 1024, // 100MB
    icon: '📄',
    label: 'PDF Document',
  },
  epub: {
    accept: '.epub',
    maxSize: 50 * 1024 * 1024, // 50MB
    icon: '📚',
    label: 'EPUB Book',
  },
  txt: {
    accept: '.txt',
    maxSize: 20 * 1024 * 1024, // 20MB
    icon: '📝',
    label: 'Text File',
  },
  docx: {
    accept: '.docx',
    maxSize: 50 * 1024 * 1024, // 50MB
    icon: '📃',
    label: 'Word Document',
  },
};

// Language options
export const LanguageOptions = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'other', label: 'Other' },
];

// Category options
export const CategoryOptions = [
  { value: 'fiction', label: 'Fiction' },
  { value: 'non-fiction', label: 'Non-Fiction' },
  { value: 'science', label: 'Science' },
  { value: 'technology', label: 'Technology' },
  { value: 'history', label: 'History' },
  { value: 'philosophy', label: 'Philosophy' },
  { value: 'business', label: 'Business' },
  { value: 'self-help', label: 'Self-Help' },
  { value: 'education', label: 'Education' },
  { value: 'arts', label: 'Arts' },
  { value: 'other', label: 'Other' },
];