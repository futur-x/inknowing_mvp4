'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, Camera } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'

export default function EditProfilePage() {
  const router = useRouter()
  const { user, updateProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
    location: user?.location || '',
    interests: user?.interests || ''
  })
  const [hasChanges, setHasChanges] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!hasChanges) return

    setLoading(true)
    try {
      await updateProfile(formData)
      toast({
        title: "保存成功",
        description: "您的个人资料已更新"
      })
      setHasChanges(false)
    } catch (error) {
      toast({
        title: "保存失败",
        description: "请稍后重试",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/profile')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">编辑个人资料</h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || loading}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          保存更改
        </Button>
      </div>

      {/* Avatar Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>头像</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 rounded-full w-8 h-8"
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">
                支持 JPG, PNG 格式，文件大小不超过 5MB
              </p>
              <Button variant="outline" disabled>
                上传新头像
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="输入您的用户名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="your@email.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">个人简介</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="介绍一下您自己..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>其他信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location">所在地</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="城市或地区"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interests">兴趣标签</Label>
            <Input
              id="interests"
              value={formData.interests}
              onChange={(e) => handleInputChange('interests', e.target.value)}
              placeholder="用逗号分隔，如：科技, 文学, 历史"
            />
            <p className="text-xs text-muted-foreground">
              添加兴趣标签有助于我们推荐更适合您的内容
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 p-4 bg-background border rounded-lg shadow-lg">
          <p className="text-sm mb-2">您有未保存的更改</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFormData({
                  username: user?.username || '',
                  email: user?.email || '',
                  bio: user?.bio || '',
                  location: user?.location || '',
                  interests: user?.interests || ''
                })
                setHasChanges(false)
              }}
            >
              放弃更改
            </Button>
            <Button size="sm" onClick={handleSave}>
              保存
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}