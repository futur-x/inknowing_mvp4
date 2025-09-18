import { toast as sonnerToast } from 'sonner'

export interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success' | 'warning'
  duration?: number
}

export function toast({ title, description, variant = 'default', duration }: ToastProps) {
  const message = title || description || ''
  const descriptionText = title && description ? description : undefined

  switch (variant) {
    case 'destructive':
      return sonnerToast.error(message, {
        description: descriptionText,
        duration,
      })
    case 'success':
      return sonnerToast.success(message, {
        description: descriptionText,
        duration,
      })
    case 'warning':
      return sonnerToast.warning(message, {
        description: descriptionText,
        duration,
      })
    default:
      return sonnerToast(message, {
        description: descriptionText,
        duration,
      })
  }
}

export { toast as useToast }