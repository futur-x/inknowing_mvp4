'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Shield,
  Bell,
  Eye,
  Smartphone,
  Mail,
  Lock,
  Trash2,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

function SettingsPageContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  // Security Settings
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Notification Settings
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    dialogueReminders: true,
    newBooks: true,
    updates: false
  })

  // Privacy Settings
  const [privacy, setPrivacy] = useState({
    profilePublic: false,
    showActivity: true,
    allowMessages: false
  })

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "密码不匹配",
        description: "请确保两次输入的新密码相同",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // TODO: Call API to change password
      toast({
        title: "密码修改成功",
        description: "请使用新密码重新登录"
      })
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      toast({
        title: "修改失败",
        description: "请检查当前密码是否正确",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      // TODO: Call API to delete account
      toast({
        title: "账户已删除",
        description: "感谢您的使用"
      })
      router.push('/')
    } catch (error) {
      toast({
        title: "删除失败",
        description: "请稍后重试",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/profile')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">账户设置</h1>
      </div>

      {/* Security Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            安全设置
          </CardTitle>
          <CardDescription>
            管理您的密码和账户安全选项
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Change Password */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Lock className="w-4 h-4" />
              修改密码
            </h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">当前密码</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({
                    ...prev,
                    currentPassword: e.target.value
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">新密码</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({
                    ...prev,
                    newPassword: e.target.value
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">确认新密码</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({
                    ...prev,
                    confirmPassword: e.target.value
                  }))}
                />
              </div>
              <Button
                onClick={handlePasswordChange}
                disabled={loading || !passwordForm.currentPassword || !passwordForm.newPassword}
              >
                更新密码
              </Button>
            </div>
          </div>

          <Separator />

          {/* Two-Factor Authentication */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">双因素认证</h3>
                <p className="text-sm text-muted-foreground">
                  增强账户安全性
                </p>
              </div>
              <Switch disabled />
            </div>
          </div>

          <Separator />

          {/* Connected Accounts */}
          <div className="space-y-4">
            <h3 className="font-medium">已绑定账号</h3>
            <div className="space-y-2">
              {user?.phone && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">手机号</p>
                      <p className="text-xs text-muted-foreground">{user.phone}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    更换
                  </Button>
                </div>
              )}
              {user?.email && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">邮箱</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    验证
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            通知设置
          </CardTitle>
          <CardDescription>
            选择您希望接收通知的方式
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">邮件通知</p>
              <p className="text-sm text-muted-foreground">接收重要更新和活动邮件</p>
            </div>
            <Switch
              checked={notifications.email}
              onCheckedChange={(checked) => setNotifications(prev => ({
                ...prev,
                email: checked
              }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">短信通知</p>
              <p className="text-sm text-muted-foreground">接收验证码和重要提醒</p>
            </div>
            <Switch
              checked={notifications.sms}
              onCheckedChange={(checked) => setNotifications(prev => ({
                ...prev,
                sms: checked
              }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">推送通知</p>
              <p className="text-sm text-muted-foreground">浏览器推送通知</p>
            </div>
            <Switch
              checked={notifications.push}
              onCheckedChange={(checked) => setNotifications(prev => ({
                ...prev,
                push: checked
              }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">对话提醒</p>
              <p className="text-sm text-muted-foreground">未完成的对话提醒</p>
            </div>
            <Switch
              checked={notifications.dialogueReminders}
              onCheckedChange={(checked) => setNotifications(prev => ({
                ...prev,
                dialogueReminders: checked
              }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">新书通知</p>
              <p className="text-sm text-muted-foreground">新书上架通知</p>
            </div>
            <Switch
              checked={notifications.newBooks}
              onCheckedChange={(checked) => setNotifications(prev => ({
                ...prev,
                newBooks: checked
              }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            隐私设置
          </CardTitle>
          <CardDescription>
            控制您的信息如何被显示和使用
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">公开个人资料</p>
              <p className="text-sm text-muted-foreground">允许其他用户查看您的资料</p>
            </div>
            <Switch
              checked={privacy.profilePublic}
              onCheckedChange={(checked) => setPrivacy(prev => ({
                ...prev,
                profilePublic: checked
              }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">显示活动状态</p>
              <p className="text-sm text-muted-foreground">显示您的阅读和对话活动</p>
            </div>
            <Switch
              checked={privacy.showActivity}
              onCheckedChange={(checked) => setPrivacy(prev => ({
                ...prev,
                showActivity: checked
              }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">接收私信</p>
              <p className="text-sm text-muted-foreground">允许其他用户向您发送消息</p>
            </div>
            <Switch
              checked={privacy.allowMessages}
              onCheckedChange={(checked) => setPrivacy(prev => ({
                ...prev,
                allowMessages: checked
              }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            危险区域
          </CardTitle>
          <CardDescription>
            这些操作不可逆，请谨慎操作
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="w-4 h-4 mr-2" />
                删除账户
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确定要删除账户吗？</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作将永久删除您的账户和所有相关数据。此操作不可逆，请谨慎考虑。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  确认删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <AuthGuard redirectTo="/auth/login?redirect=/profile/settings">
      <SettingsPageContent />
    </AuthGuard>
  )
}