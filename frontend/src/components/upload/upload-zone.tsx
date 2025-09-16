'use client';

import React, { useCallback, useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  validateFileType,
  validateFileSize,
  formatFileSize,
  getAcceptString,
  extractMetadataFromFilename,
  getFileIcon,
} from '@/lib/upload-utils';
import { FileType, FileTypeConfig } from '@/types/upload';

interface UploadZoneProps {
  onFileSelect: (file: File, metadata?: { title?: string; author?: string }) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  maxFileSize?: number;
  acceptedTypes?: FileType[];
  disabled?: boolean;
  error?: string | null;
}

export function UploadZone({
  onFileSelect,
  isUploading = false,
  uploadProgress = 0,
  maxFileSize = 100 * 1024 * 1024, // 100MB default
  acceptedTypes = ['pdf', 'epub', 'txt', 'docx'],
  disabled = false,
  error,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, isUploading]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    setValidationError(null);

    // Validate file type
    const fileType = validateFileType(file);
    if (!fileType || !acceptedTypes.includes(fileType)) {
      setValidationError(`Invalid file type. Accepted types: ${acceptedTypes.join(', ').toUpperCase()}`);
      return;
    }

    // Validate file size
    if (!validateFileSize(file, fileType)) {
      const maxSize = FileTypeConfig[fileType].maxSize;
      setValidationError(`File size exceeds the limit of ${formatFileSize(maxSize)}`);
      return;
    }

    // Additional size check with prop
    if (file.size > maxFileSize) {
      setValidationError(`File size exceeds the maximum limit of ${formatFileSize(maxFileSize)}`);
      return;
    }

    // Extract metadata from filename
    const metadata = extractMetadataFromFilename(file.name);

    setSelectedFile(file);
    onFileSelect(file, metadata);
  }, [acceptedTypes, maxFileSize, onFileSelect]);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled, isUploading]);

  const acceptString = acceptedTypes
    .map(type => FileTypeConfig[type].accept)
    .join(',');

  return (
    <div className="w-full">
      <Card
        className={`
          relative border-2 border-dashed transition-all duration-200
          ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <CardContent className="p-8">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptString}
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            className="hidden"
          />

          {!selectedFile && !isUploading && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-gray-100 rounded-full">
                <Upload className="h-8 w-8 text-gray-600" />
              </div>

              <div className="text-center">
                <p className="text-lg font-semibold text-gray-700">
                  Drop your book file here or click to browse
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Supports PDF, EPUB, TXT, DOCX (Max {formatFileSize(maxFileSize)})
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {acceptedTypes.map(type => (
                  <div
                    key={type}
                    className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600"
                  >
                    <span className="mr-1">{getFileIcon(type as FileType)}</span>
                    {FileTypeConfig[type as FileType].label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedFile && !isUploading && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isUploading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium text-gray-900">Uploading...</p>
                    <p className="text-sm text-gray-500">{selectedFile?.name}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-primary">
                  {uploadProgress}%
                </span>
              </div>

              <Progress value={uploadProgress} className="h-2" />

              <p className="text-xs text-gray-500 text-center">
                Please don't close this window while uploading
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {(validationError || error) && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError || error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}