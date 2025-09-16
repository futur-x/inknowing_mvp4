// Guest Access Component - InKnowing MVP 4.0
// Business Logic Conservation: Anonymous → Guest Mode → Limited Access

'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  User,
  Eye,
  MessageCircle,
  Book,
  Clock,
  Star,
  ArrowRight,
  Shield,
  Info,
  CheckCircle,
  Timer
} from 'lucide-react'

// Form validation
const guestSetupSchema = z.object({
  nickname: z.string()
    .min(2, '昵称至少需要2个字符')
    .max(20, '昵称不能超过20个字符')
    .regex(/^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/, '昵称只能包含字母、数字、中文、下划线和横线'),
  interests: z.array(z.string()).min(1, '请至少选择一个感兴趣的领域'),
  agreeTerms: z.boolean().refine(val => val === true, {
    message: '请同意服务条款'
  }),
})

interface GuestSetupForm {
  nickname: string
  interests: string[]
  agreeTerms: boolean
}

interface GuestAccessProps {
  isOpen?: boolean
  onClose?: () => void
  redirectTo?: string
  trigger?: React.ReactNode
}

// Available interest categories
const interestCategories = [
  { id: 'business', label: '商业管理', icon: '💼' },
  { id: 'psychology', label: '心理学', icon: '🧠' },
  { id: 'science', label: '科学技术', icon: '🔬' },
  { id: 'history', label: '历史文化', icon: '📚' },
  { id: 'philosophy', label: '哲学思想', icon: '💭' },
  { id: 'fiction', label: '文学小说', icon: '📖' },
  { id: 'selfhelp', label: '个人成长', icon: '🌱' },
  { id: 'finance', label: '投资理财', icon: '💰' },
]

// Guest mode limitations
const guestLimitations = [
  {
    feature: '书籍对话',
    limit: '每日3次',
    icon: <MessageCircle className="w-4 h-4" />,
    description: '可以与任意书籍进行3次对话'
  },
  {
    feature: '浏览时长',
    limit: '30分钟',
    icon: <Timer className="w-4 h-4" />,
    description: '单次访问最长30分钟'
  },
  {
    feature: '书籍搜索',
    limit: '无限制',
    icon: <Book className="w-4 h-4" />,
    description: '可以自由搜索和浏览书籍'
  },
  {
    feature: '收藏功能',
    limit: '最多5本',
    icon: <Star className="w-4 h-4" />,
    description: '可以临时收藏最多5本书籍'
  },
]

export function GuestAccess({ isOpen, onClose, redirectTo = '/', trigger }: GuestAccessProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(isOpen || false)
  const [step, setStep] = useState<'intro' | 'setup' | 'success'>('intro')

  // Sync internal modal state with external isOpen prop
  React.useEffect(() => {
    if (typeof isOpen === 'boolean') {
      setModalOpen(isOpen)
    }
  }, [isOpen])

  // Form
  const form = useForm<GuestSetupForm>({
    resolver: zodResolver(guestSetupSchema),
    defaultValues: {
      nickname: '',
      interests: [],
      agreeTerms: false,
    },
  })

  const selectedInterests = form.watch('interests') || []

  const handleOpenModal = () => {
    setModalOpen(true)
    setStep('intro')
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setStep('intro')
    form.reset()
    onClose?.()
  }

  const handleDialogChange = (open: boolean) => {
    setModalOpen(open)
    if (!open) {
      handleCloseModal()
    }
  }

  const handleStartGuest = () => {
    setStep('setup')
  }

  const handleInterestToggle = (interestId: string) => {
    const current = selectedInterests
    const updated = current.includes(interestId)
      ? current.filter(id => id !== interestId)
      : [...current, interestId]

    form.setValue('interests', updated)
  }

  const handleGuestSetup = async (data: GuestSetupForm) => {
    try {
      // Create guest session
      const guestSession = {
        id: `guest_${Date.now()}`,
        nickname: data.nickname,
        interests: data.interests,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
        limitations: {
          dialogues: { used: 0, limit: 3 },
          favorites: { used: 0, limit: 5 },
          sessionDuration: 30 * 60, // seconds
        }
      }

      // Store guest session
      localStorage.setItem('inknowing-guest-session', JSON.stringify(guestSession))

      setStep('success')
      toast.success('游客模式已开启！')

      // Redirect after delay
      setTimeout(() => {
        handleCloseModal()
        router.push(`${redirectTo}?mode=guest`)
      }, 2000)

    } catch (error) {
      console.error('Failed to setup guest session:', error)
      toast.error('设置游客模式失败，请重试')
    }
  }

  const handleRegisterPrompt = () => {
    handleCloseModal()
    router.push('/auth/register')
  }

  return (
    <>
      {trigger && (
        <div onClick={handleOpenModal}>
          {trigger}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Step 1: Introduction */}
          {step === 'intro' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <User className="w-6 h-6 text-blue-600" />
                  <span>游客模式体验</span>
                </DialogTitle>
                <DialogDescription>
                  无需注册，立即体验 InKnowing 的核心功能
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Benefits */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Eye className="w-5 h-5 text-blue-600" />
                      <span>游客模式特权</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {guestLimitations.map((item, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="text-blue-600 mt-0.5">
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{item.feature}</span>
                            <span className="text-sm text-blue-600 font-medium">{item.limit}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-0.5">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Limitations Notice */}
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium text-amber-900">温馨提示</h3>
                        <div className="text-xs text-amber-700 leading-relaxed space-y-1">
                          <p>• 游客模式数据不会保存，关闭浏览器后将丢失</p>
                          <p>• 无法使用角色扮演对话、书籍上传等高级功能</p>
                          <p>• 注册用户享有更多权益和个性化体验</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleStartGuest}
                    className="w-full"
                    size="lg"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    立即体验游客模式
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">或</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleRegisterPrompt}
                    className="w-full"
                    size="lg"
                  >
                    注册获得完整体验
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Guest Setup */}
          {step === 'setup' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <User className="w-6 h-6 text-blue-600" />
                  <span>设置您的游客档案</span>
                </DialogTitle>
                <DialogDescription>
                  简单设置，获得个性化的体验推荐
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={form.handleSubmit(handleGuestSetup)} className="space-y-6">
                {/* Nickname */}
                <div className="space-y-2">
                  <label htmlFor="nickname" className="text-sm font-medium text-gray-700">
                    临时昵称 *
                  </label>
                  <Input
                    id="nickname"
                    placeholder="为您设置一个临时昵称"
                    {...form.register('nickname')}
                    error={form.formState.errors.nickname?.message}
                  />
                  <p className="text-xs text-gray-500">
                    这个昵称仅在当前访问中使用，不会被保存
                  </p>
                </div>

                {/* Interests */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">
                    感兴趣的领域 * (选择后将获得相关推荐)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {interestCategories.map(category => (
                      <div
                        key={category.id}
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedInterests.includes(category.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        onClick={() => handleInterestToggle(category.id)}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{category.icon}</span>
                          <span className="text-sm font-medium">{category.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {form.formState.errors.interests && (
                    <p className="text-sm text-red-600">{form.formState.errors.interests.message}</p>
                  )}
                </div>

                {/* Terms agreement */}
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="agreeTerms"
                      checked={form.watch('agreeTerms')}
                      onCheckedChange={(checked) => form.setValue('agreeTerms', !!checked)}
                    />
                    <label htmlFor="agreeTerms" className="text-sm text-gray-600 leading-relaxed">
                      我已了解游客模式的限制，并同意{' '}
                      <a href="/terms" className="text-blue-600 hover:underline" target="_blank">
                        服务条款
                      </a>
                      {' '}和{' '}
                      <a href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                        隐私政策
                      </a>
                    </label>
                  </div>
                  {form.formState.errors.agreeTerms && (
                    <p className="text-sm text-red-600">{form.formState.errors.agreeTerms.message}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('intro')}
                    className="flex-1"
                  >
                    返回
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={form.formState.isSubmitting}
                  >
                    开始体验
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-6 h-6" />
                  <span>游客模式已开启</span>
                </DialogTitle>
                <DialogDescription>
                  欢迎体验 InKnowing，开始您的知识探索之旅！
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Success animation/graphic */}
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    准备就绪！
                  </h3>
                  <p className="text-gray-600">
                    正在为您准备个性化的书籍推荐...
                  </p>
                </div>

                {/* Session info */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-900">当前会话</h4>
                        <p className="text-xs text-blue-700">有效期：30分钟 | 对话次数：3次</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Auto redirect message */}
                <div className="text-center text-sm text-gray-500">
                  <p>2秒后自动跳转到首页...</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// Guest mode hook for checking guest session
export function useGuestMode() {
  const [isGuest, setIsGuest] = useState(false)
  const [guestSession, setGuestSession] = useState<any>(null)

  React.useEffect(() => {
    const checkGuestSession = () => {
      try {
        const stored = localStorage.getItem('inknowing-guest-session')
        if (stored) {
          const session = JSON.parse(stored)
          const now = new Date()
          const expires = new Date(session.expiresAt)

          if (now < expires) {
            setIsGuest(true)
            setGuestSession(session)
          } else {
            // Session expired
            localStorage.removeItem('inknowing-guest-session')
            setIsGuest(false)
            setGuestSession(null)
          }
        }
      } catch (error) {
        console.error('Failed to check guest session:', error)
        setIsGuest(false)
        setGuestSession(null)
      }
    }

    checkGuestSession()

    // Check periodically
    const interval = setInterval(checkGuestSession, 60000) // Every minute
    return () => clearInterval(interval)
  }, [])

  const clearGuestSession = () => {
    localStorage.removeItem('inknowing-guest-session')
    setIsGuest(false)
    setGuestSession(null)
  }

  return {
    isGuest,
    guestSession,
    clearGuestSession
  }
}