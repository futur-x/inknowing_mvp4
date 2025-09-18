'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  User,
  Settings,
  History,
  Activity,
  CreditCard,
  Shield,
  Bell,
  LogOut
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/hooks/use-toast'
import { AuthGuard } from '@/components/auth/AuthGuard'

/**
 * ProfileContent component contains the actual profile page UI
 * Separated for better code organization and reusability
 */
function ProfileContent() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [activeTab, setActiveTab] = useState('overview')

  // User should be available if we're in AuthGuard
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-muted-foreground">加载用户信息...</p>
          </div>
        </div>
      </div>
    )
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast({
        title: "已退出登录",
        description: "期待您的下次访问！"
      })
      router.push('/')
    } catch (error) {
      toast({
        title: "退出失败",
        description: "请稍后重试",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Profile Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {user.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user.username || '用户'}</h1>
              <p className="text-muted-foreground">{user.email || user.phone}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`
                  inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                  ${user.membership === 'super' ? 'bg-purple-100 text-purple-800' :
                    user.membership === 'premium' ? 'bg-blue-100 text-blue-800' :
                    user.membership === 'basic' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'}
                `}>
                  {user.membership === 'super' ? '超级会员' :
                   user.membership === 'premium' ? '高级会员' :
                   user.membership === 'basic' ? '基础会员' : '免费用户'}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">概览</span>
          </TabsTrigger>
          <TabsTrigger value="edit" className="flex items-center gap-1">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">编辑</span>
          </TabsTrigger>
          <TabsTrigger value="membership" className="flex items-center gap-1">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">会员</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-1">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">活动</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">历史</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">设置</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">个人信息</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">用户名</p>
                  <p className="font-medium">{user.username || '未设置'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">邮箱</p>
                  <p className="font-medium">{user.email || '未绑定'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">手机</p>
                  <p className="font-medium">{user.phone || '未绑定'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">注册时间</p>
                  <p className="font-medium">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知'}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">今日配额</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">对话次数</span>
                    <span className="text-sm font-medium">
                      {user.quotaUsed || 0} / {user.quotaLimit || 20}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{
                        width: `${Math.min(((user.quotaUsed || 0) / (user.quotaLimit || 20)) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  配额每日重置，升级会员可获得更多对话次数
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Edit Profile Tab */}
        <TabsContent value="edit" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">编辑个人资料</h3>
            <p className="text-muted-foreground">此功能正在开发中...</p>
          </Card>
        </TabsContent>

        {/* Membership Tab */}
        <TabsContent value="membership" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">会员信息</h3>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">当前会员等级</h4>
                  <span className={`
                    px-3 py-1 rounded-full text-sm font-medium
                    ${user.membership === 'super' ? 'bg-purple-100 text-purple-800' :
                      user.membership === 'premium' ? 'bg-blue-100 text-blue-800' :
                      user.membership === 'basic' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'}
                  `}>
                    {user.membership === 'super' ? '超级会员' :
                     user.membership === 'premium' ? '高级会员' :
                     user.membership === 'basic' ? '基础会员' : '免费用户'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {user.membership === 'free' ?
                    '升级会员享受更多对话次数和独家功能' :
                    '感谢您的支持！享受您的会员权益'}
                </p>
                {user.membership === 'free' && (
                  <Button
                    className="w-full"
                    onClick={() => router.push('/upgrade')}
                  >
                    升级会员
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">活动统计</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">阅读书籍</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">对话次数</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">收藏书籍</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">上传书籍</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">历史记录</h3>
            <p className="text-muted-foreground">暂无历史记录</p>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">账户安全</h3>
              <div className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="w-4 h-4 mr-2" />
                  修改密码
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Bell className="w-4 h-4 mr-2" />
                  通知设置
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * ProfilePageClient - Client-side only profile page component
 * This component wraps the ProfileContent with AuthGuard to ensure proper authentication
 * It's designed to be used with Next.js dynamic import with ssr: false
 */
export default function ProfilePageClient() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  )
}