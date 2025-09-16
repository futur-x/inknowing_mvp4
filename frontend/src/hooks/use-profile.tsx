'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './use-auth'
import { toast } from './use-toast'

interface UserProfile {
  id: string
  username?: string
  email?: string
  phone?: string
  avatar?: string
  bio?: string
  location?: string
  interests?: string
  language?: string
  timezone?: string
  membership: 'free' | 'basic' | 'premium' | 'super'
  quotaUsed: number
  quotaLimit: number
  createdAt: string
  updatedAt?: string
  stats?: {
    booksRead: number
    dialogues: number
    uploads: number
    favorites: number
  }
  settings?: {
    notifications: {
      email: boolean
      sms: boolean
      push: boolean
      dialogueReminders: boolean
      newBooks: boolean
    }
    privacy: {
      profilePublic: boolean
      showActivity: boolean
      allowMessages: boolean
    }
  }
}

interface ActivityData {
  dialogues: Array<{
    id: string
    bookId: string
    bookTitle: string
    type: 'book' | 'character'
    characterName?: string
    lastMessage: string
    messageCount: number
    createdAt: string
    updatedAt: string
  }>
  reading: Array<{
    bookId: string
    bookTitle: string
    bookAuthor: string
    readingTime: number
    lastRead: string
    progress: number
  }>
  stats: {
    totalDialogues: number
    totalBooks: number
    totalReadingTime: number
    activeDays: number
  }
}

export function useProfile() {
  const { user, token } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [activity, setActivity] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!token) return

    setLoading(true)
    setError(null)
    try {
      const response = await fetch('http://localhost:8888/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }

      const data = await response.json()
      setProfile(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile'
      setError(message)
      console.error('Profile fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!token) {
      toast({
        title: "未登录",
        description: "请先登录",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://localhost:8888/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const updatedProfile = await response.json()
      setProfile(updatedProfile)

      toast({
        title: "更新成功",
        description: "您的个人资料已更新"
      })

      return updatedProfile
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      toast({
        title: "更新失败",
        description: message,
        variant: "destructive"
      })
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  // Upload avatar
  const uploadAvatar = useCallback(async (file: File) => {
    if (!token) {
      toast({
        title: "未登录",
        description: "请先登录",
        variant: "destructive"
      })
      return
    }

    const formData = new FormData()
    formData.append('avatar', file)

    setLoading(true)
    try {
      const response = await fetch('http://localhost:8888/api/users/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload avatar')
      }

      const data = await response.json()
      setProfile(prev => prev ? { ...prev, avatar: data.avatarUrl } : null)

      toast({
        title: "上传成功",
        description: "头像已更新"
      })

      return data.avatarUrl
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload avatar'
      toast({
        title: "上传失败",
        description: message,
        variant: "destructive"
      })
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  // Fetch activity data
  const fetchActivity = useCallback(async () => {
    if (!token) return

    try {
      const [dialoguesRes, historyRes, statsRes] = await Promise.all([
        fetch('http://localhost:8888/api/dialogues/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8888/api/users/reading-history', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8888/api/users/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (!dialoguesRes.ok || !historyRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch activity data')
      }

      const [dialogues, reading, stats] = await Promise.all([
        dialoguesRes.json(),
        historyRes.json(),
        statsRes.json()
      ])

      setActivity({
        dialogues: dialogues.data || [],
        reading: reading.data || [],
        stats: {
          totalDialogues: stats.totalDialogues || 0,
          totalBooks: stats.totalBooks || 0,
          totalReadingTime: stats.totalReadingTime || 0,
          activeDays: stats.activeDays || 0
        }
      })
    } catch (err) {
      console.error('Activity fetch error:', err)
    }
  }, [token])

  // Update settings
  const updateSettings = useCallback(async (settings: Partial<UserProfile['settings']>) => {
    if (!token) {
      toast({
        title: "未登录",
        description: "请先登录",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('http://localhost:8888/api/users/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        throw new Error('Failed to update settings')
      }

      const updatedSettings = await response.json()
      setProfile(prev => prev ? { ...prev, settings: updatedSettings } : null)

      toast({
        title: "设置已保存",
        description: "您的设置已更新"
      })

      return updatedSettings
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update settings'
      toast({
        title: "保存失败",
        description: message,
        variant: "destructive"
      })
      throw err
    }
  }, [token])

  // Change password
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!token) {
      toast({
        title: "未登录",
        description: "请先登录",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('http://localhost:8888/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to change password')
      }

      toast({
        title: "密码已修改",
        description: "请使用新密码重新登录"
      })

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change password'
      toast({
        title: "修改失败",
        description: message,
        variant: "destructive"
      })
      throw err
    }
  }, [token])

  // Delete account
  const deleteAccount = useCallback(async () => {
    if (!token) {
      toast({
        title: "未登录",
        description: "请先登录",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('http://localhost:8888/api/users/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete account')
      }

      toast({
        title: "账户已删除",
        description: "感谢您的使用"
      })

      // Clear local storage and redirect
      localStorage.removeItem('token')
      window.location.href = '/'

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete account'
      toast({
        title: "删除失败",
        description: message,
        variant: "destructive"
      })
      throw err
    }
  }, [token])

  // Initial fetch
  useEffect(() => {
    if (token && !profile) {
      fetchProfile()
    }
  }, [token, profile, fetchProfile])

  // Merge auth user data with profile
  const mergedProfile = profile || (user ? {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    membership: user.membership || 'free',
    quotaUsed: user.quotaUsed || 0,
    quotaLimit: user.quotaLimit || 20,
    createdAt: user.createdAt || new Date().toISOString()
  } as UserProfile : null)

  return {
    profile: mergedProfile,
    activity,
    loading,
    error,
    fetchProfile,
    updateProfile,
    uploadAvatar,
    fetchActivity,
    updateSettings,
    changePassword,
    deleteAccount,
    refetch: () => {
      fetchProfile()
      fetchActivity()
    }
  }
}