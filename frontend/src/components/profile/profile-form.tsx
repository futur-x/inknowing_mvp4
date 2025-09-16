'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Save, X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const profileSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符').max(50, '用户名最多50个字符'),
  email: z.string().email('请输入有效的邮箱地址').optional().or(z.literal('')),
  bio: z.string().max(200, '个人简介最多200个字符').optional(),
  location: z.string().max(50, '位置最多50个字符').optional(),
  interests: z.string().max(100, '兴趣标签最多100个字符').optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

interface ProfileFormProps {
  initialData?: Partial<ProfileFormValues>
  onSubmit: (data: ProfileFormValues) => Promise<void>
  onCancel?: () => void
}

export function ProfileForm({ initialData, onSubmit, onCancel }: ProfileFormProps) {
  const [loading, setLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: initialData?.username || '',
      email: initialData?.email || '',
      bio: initialData?.bio || '',
      location: initialData?.location || '',
      interests: initialData?.interests || '',
      language: initialData?.language || 'zh-CN',
      timezone: initialData?.timezone || 'Asia/Shanghai',
    },
  })

  // Track form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasChanges(true)
    })
    return () => subscription.unsubscribe()
  }, [form])

  const handleSubmit = async (data: ProfileFormValues) => {
    setLoading(true)
    try {
      await onSubmit(data)
      toast({
        title: "保存成功",
        description: "您的个人资料已更新",
      })
      setHasChanges(false)
    } catch (error) {
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    form.reset()
    setHasChanges(false)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">基本信息</h3>

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>用户名</FormLabel>
                <FormControl>
                  <Input placeholder="输入您的用户名" {...field} />
                </FormControl>
                <FormDescription>
                  这是您在平台上的显示名称
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>邮箱</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="your@email.com" {...field} />
                </FormControl>
                <FormDescription>
                  用于接收通知和找回密码
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>个人简介</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="介绍一下您自己..."
                    className="resize-none"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  简短地介绍一下您自己（最多200字）
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Additional Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">其他信息</h3>

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>所在地</FormLabel>
                <FormControl>
                  <Input placeholder="城市或地区" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interests"
            render={({ field }) => (
              <FormItem>
                <FormLabel>兴趣标签</FormLabel>
                <FormControl>
                  <Input placeholder="用逗号分隔，如：科技, 文学, 历史" {...field} />
                </FormControl>
                <FormDescription>
                  添加兴趣标签有助于我们推荐更适合您的内容
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>语言偏好</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择语言" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="zh-CN">简体中文</SelectItem>
                      <SelectItem value="zh-TW">繁体中文</SelectItem>
                      <SelectItem value="en-US">English</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>时区</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择时区" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Asia/Shanghai">北京时间 (UTC+8)</SelectItem>
                      <SelectItem value="Asia/Hong_Kong">香港时间 (UTC+8)</SelectItem>
                      <SelectItem value="Asia/Taipei">台北时间 (UTC+8)</SelectItem>
                      <SelectItem value="America/New_York">纽约时间 (UTC-5)</SelectItem>
                      <SelectItem value="Europe/London">伦敦时间 (UTC+0)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <p className="text-sm text-muted-foreground">
                您有未保存的更改
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                <X className="w-4 h-4 mr-2" />
                取消
              </Button>
            )}
            {hasChanges && (
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={loading}
              >
                重置
              </Button>
            )}
            <Button type="submit" disabled={loading || !hasChanges}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              保存更改
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}