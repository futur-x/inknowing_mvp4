'use client'

import { useState, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Camera,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Check,
  Loader2
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface AvatarUploadProps {
  currentAvatar?: string
  username?: string
  onUpload: (file: File) => Promise<string>
  onOpen?: () => void
}

export function AvatarUpload({
  currentAvatar,
  username,
  onUpload,
  onOpen
}: AvatarUploadProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({
        title: "文件格式错误",
        description: "请上传 JPG, PNG 或 WebP 格式的图片",
        variant: "destructive"
      })
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "文件过大",
        description: "请上传小于 5MB 的图片",
        variant: "destructive"
      })
      return
    }

    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
      setIsOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      // Process image with transformations
      const processedFile = await processImage(selectedFile, zoom, rotation)
      const avatarUrl = await onUpload(processedFile)

      toast({
        title: "上传成功",
        description: "您的头像已更新"
      })

      setIsOpen(false)
      resetState()
    } catch (error) {
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const processImage = async (
    file: File,
    zoom: number,
    rotation: number
  ): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Set canvas size (square aspect ratio)
        const size = 400
        canvas.width = size
        canvas.height = size

        // Clear canvas
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, size, size)

        // Apply transformations
        ctx.save()
        ctx.translate(size / 2, size / 2)
        ctx.rotate((rotation * Math.PI) / 180)
        ctx.scale(zoom, zoom)

        // Calculate crop dimensions
        const sourceSize = Math.min(img.width, img.height)
        const sx = (img.width - sourceSize) / 2
        const sy = (img.height - sourceSize) / 2

        // Draw image
        ctx.drawImage(
          img,
          sx,
          sy,
          sourceSize,
          sourceSize,
          -size / 2,
          -size / 2,
          size,
          size
        )
        ctx.restore()

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const processedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              resolve(processedFile)
            } else {
              reject(new Error('Failed to process image'))
            }
          },
          'image/jpeg',
          0.9
        )
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  const resetState = () => {
    setSelectedFile(null)
    setPreview(null)
    setZoom(1)
    setRotation(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    resetState()
  }

  return (
    <>
      {/* Trigger */}
      <div className="relative inline-block">
        <Avatar className="w-24 h-24 cursor-pointer group">
          <AvatarImage src={currentAvatar} alt={username} />
          <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {username?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-0 right-0 rounded-full w-8 h-8"
          onClick={() => {
            onOpen?.()
            fileInputRef.current?.click()
          }}
        >
          <Camera className="w-4 h-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>上传头像</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview */}
            {preview && (
              <div className="relative mx-auto w-64 h-64 rounded-lg overflow-hidden bg-muted">
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s'
                  }}
                >
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="space-y-4">
              {/* Zoom */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <ZoomIn className="w-4 h-4" />
                    缩放
                  </span>
                  <span className="text-muted-foreground">{Math.round(zoom * 100)}%</span>
                </div>
                <Slider
                  value={[zoom]}
                  onValueChange={([value]) => setZoom(value)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Rotation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((prev) => (prev - 90) % 360)}
                >
                  <RotateCw className="w-4 h-4 mr-2 scale-x-[-1]" />
                  左旋转
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  右旋转
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setZoom(1)
                    setRotation(0)
                  }}
                >
                  重置
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={uploading}
              >
                <X className="w-4 h-4 mr-2" />
                取消
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    上传中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    确认上传
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}