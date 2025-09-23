"use client"

import { toast as sonnerToast } from "sonner"

export const toast = (options: {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  action?: {
    label: string
    onClick: () => void
  }
}) => {
  const { title, description, variant = 'default', action } = options

  const message = title || description || ''

  switch (variant) {
    case 'destructive':
      sonnerToast.error(message, {
        description: title ? description : undefined,
        action: action ? {
          label: action.label,
          onClick: action.onClick,
        } : undefined,
      })
      break
    case 'success':
      sonnerToast.success(message, {
        description: title ? description : undefined,
        action: action ? {
          label: action.label,
          onClick: action.onClick,
        } : undefined,
      })
      break
    default:
      sonnerToast(message, {
        description: title ? description : undefined,
        action: action ? {
          label: action.label,
          onClick: action.onClick,
        } : undefined,
      })
  }
}

export const useToast = () => {
  return {
    toast,
  }
}

export { Toaster } from './sonner'