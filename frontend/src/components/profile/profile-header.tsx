'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Camera,
  MapPin,
  Calendar,
  Award,
  BookOpen,
  MessageSquare,
  Upload,
  Star
} from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface ProfileHeaderProps {
  user: {
    id: string
    username?: string
    email?: string
    phone?: string
    avatar?: string
    bio?: string
    location?: string
    membership: 'free' | 'basic' | 'premium' | 'super'
    createdAt?: string
    stats?: {
      booksRead: number
      dialogues: number
      uploads: number
      favorites: number
    }
  }
  editable?: boolean
  onEditClick?: () => void
  onAvatarChange?: (file: File) => void
}

export function ProfileHeader({
  user,
  editable = false,
  onEditClick,
  onAvatarChange
}: ProfileHeaderProps) {
  const [avatarHover, setAvatarHover] = useState(false)

  const getMembershipBadge = () => {
    const config = {
      super: {
        label: '超级会员',
        className: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white',
        icon: <Star className="w-3 h-3" />
      },
      premium: {
        label: '高级会员',
        className: 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white',
        icon: <Award className="w-3 h-3" />
      },
      basic: {
        label: '基础会员',
        className: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white',
        icon: null
      },
      free: {
        label: '免费用户',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        icon: null
      }
    }
    return config[user.membership] || config.free
  }

  const membershipBadge = getMembershipBadge()

  const handleAvatarClick = () => {
    if (!editable || !onAvatarChange) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        onAvatarChange(file)
      }
    }
    input.click()
  }

  return (
    <div className="relative">
      {/* Background Gradient */}
      <div className="absolute inset-0 h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-t-lg opacity-90" />

      {/* Content */}
      <div className="relative px-6 pb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 pt-8">
          {/* Avatar */}
          <div
            className="relative -mt-4 sm:-mt-0"
            onMouseEnter={() => setAvatarHover(true)}
            onMouseLeave={() => setAvatarHover(false)}
          >
            <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
              <AvatarImage src={user.avatar} alt={user.username} />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {user.username?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {editable && avatarHover && (
              <div
                className="absolute inset-0 w-24 h-24 rounded-full bg-black/50 flex items-center justify-center cursor-pointer transition-opacity"
                onClick={handleAvatarClick}
              >
                <Camera className="w-6 h-6 text-white" />
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 text-white sm:mb-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{user.username || '用户'}</h1>
              <Badge className={membershipBadge.className}>
                {membershipBadge.icon}
                {membershipBadge.label}
              </Badge>
            </div>
            <p className="text-white/80 text-sm mt-1">
              {user.email || user.phone}
            </p>
          </div>

          {/* Edit Button */}
          {editable && onEditClick && (
            <Button
              variant="secondary"
              onClick={onEditClick}
              className="mb-2"
            >
              编辑资料
            </Button>
          )}
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="mt-4 text-muted-foreground">
            {user.bio}
          </p>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
          {user.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{user.location}</span>
            </div>
          )}
          {user.createdAt && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(user.createdAt), 'yyyy年MM月', { locale: zhCN })}加入
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        {user.stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm">阅读</span>
              </div>
              <p className="text-2xl font-bold">{user.stats.booksRead}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">对话</span>
              </div>
              <p className="text-2xl font-bold">{user.stats.dialogues}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Upload className="w-4 h-4" />
                <span className="text-sm">上传</span>
              </div>
              <p className="text-2xl font-bold">{user.stats.uploads}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Star className="w-4 h-4" />
                <span className="text-sm">收藏</span>
              </div>
              <p className="text-2xl font-bold">{user.stats.favorites}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}