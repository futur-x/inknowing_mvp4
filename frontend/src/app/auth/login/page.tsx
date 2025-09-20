// Login Page - InKnowing MVP 4.0
// Business Logic Conservation: Anonymous → Authenticated State Transition

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Phone, MessageSquare, ArrowLeft, CheckCircle } from 'lucide-react'
import { GuestAccess } from '@/components/auth/guest-access'
import type { LoginFormData } from '@/types/api'

// Form validation schemas
const phoneLoginSchema = z.object({
  phone: z.string()
    .regex(/^1[3-9]\d{9}$/, '请输入有效的中国手机号码')
    .min(11, '手机号必须为11位')
    .max(11, '手机号必须为11位'),
  password: z.string()
    .min(6, '密码至少需要6个字符')
    .max(50, '密码不能超过50个字符'),
})

const smsLoginSchema = z.object({
  phone: z.string()
    .regex(/^1[3-9]\d{9}$/, '请输入有效的中国手机号码')
    .min(11, '手机号必须为11位')
    .max(11, '手机号必须为11位'),
  code: z.string()
    .regex(/^\d{6}$/, '验证码必须为6位数字')
    .min(6, '验证码为6位数字')
    .max(6, '验证码为6位数字'),
})

type LoginMethod = 'password' | 'sms' | 'wechat'

interface PhoneLoginForm {
  phone: string
  password: string
}

interface SmsLoginForm {
  phone: string
  code: string
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'

  // Store hooks
  const { login, isLoading, error, clearError } = useAuthStore()
  const { fetchAllUserData } = useUserStore()

  // State
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password')
  const [showPassword, setShowPassword] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [codeSent, setCodeSent] = useState(false)

  // Forms
  const phoneForm = useForm<PhoneLoginForm>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: {
      phone: '',
      password: '',
    },
  })

  const smsForm = useForm<SmsLoginForm>({
    resolver: zodResolver(smsLoginSchema),
    defaultValues: {
      phone: '',
      code: '',
    },
  })

  // Clear errors when switching methods
  useEffect(() => {
    clearError()
  }, [loginMethod, clearError])

  // Countdown timer for SMS
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  // Handle password login
  const handlePasswordLogin = async (data: PhoneLoginForm) => {
    try {
      const loginData: LoginFormData = {
        type: 'phone',
        phone: data.phone,
        password: data.password,
      }

      await login(loginData)

      // Fetch user data after successful login
      await fetchAllUserData()

      toast.success('登录成功！')
      router.push(redirectTo)
    } catch (error) {
      console.error('Login failed:', error)
      // Error is handled by the store
    }
  }

  // Handle SMS login
  const handleSmsLogin = async (data: SmsLoginForm) => {
    try {
      const loginData: LoginFormData = {
        type: 'phone',
        phone: data.phone,
        code: data.code,
      }

      await login(loginData)

      // Fetch user data after successful login
      await fetchAllUserData()

      toast.success('登录成功！')
      router.push(redirectTo)
    } catch (error) {
      console.error('SMS login failed:', error)
      // Error is handled by the store
    }
  }

  // Send SMS verification code
  const handleSendSmsCode = async () => {
    const phone = smsForm.getValues('phone')
    const validation = z.string().regex(/^1[3-9]\d{9}$/).safeParse(phone)

    if (!validation.success) {
      smsForm.setError('phone', { message: '请输入有效的手机号码' })
      return
    }

    try {
      const { sendVerificationCode } = useAuthStore.getState()
      await sendVerificationCode(phone)

      setCodeSent(true)
      setCountdown(60)
      toast.success('验证码已发送到您的手机')
    } catch (error) {
      console.error('Failed to send SMS:', error)
      toast.error('发送验证码失败，请重试')
    }
  }

  // Handle WeChat login (placeholder)
  const handleWechatLogin = () => {
    toast.info('微信登录功能即将上线')
  }

  // Handle guest mode - import GuestAccess component and use it
  const [showGuestModal, setShowGuestModal] = useState(false)

  const handleGuestMode = () => {
    setShowGuestModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">欢迎回来</h1>
        <p className="text-gray-600">登录您的 InKnowing 账户，继续探索知识</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader className="space-y-4">
          {/* Login Method Selector */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <Button
              type="button"
              variant={loginMethod === 'password' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1"
              onClick={() => setLoginMethod('password')}
            >
              <Phone className="w-4 h-4 mr-2" />
              密码登录
            </Button>
            <Button
              type="button"
              variant={loginMethod === 'sms' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1"
              onClick={() => setLoginMethod('sms')}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              验证码登录
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Password Login Form */}
          {loginMethod === 'password' && (
            <form onSubmit={phoneForm.handleSubmit(handlePasswordLogin)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  手机号码
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="请输入手机号码"
                  {...phoneForm.register('phone')}
                  error={phoneForm.formState.errors.phone?.message}
                  maxLength={11}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  密码
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="请输入密码"
                    {...phoneForm.register('password')}
                    error={phoneForm.formState.errors.password?.message}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    id="remember"
                    name="remember"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember" className="text-sm text-gray-600">
                    记住我
                  </label>
                </div>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-blue-600 hover:underline"
                >
                  忘记密码？
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </Button>
            </form>
          )}

          {/* SMS Login Form */}
          {loginMethod === 'sms' && (
            <form onSubmit={smsForm.handleSubmit(handleSmsLogin)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="sms-phone" className="text-sm font-medium text-gray-700">
                  手机号码
                </label>
                <Input
                  id="sms-phone"
                  name="phone"
                  type="tel"
                  placeholder="请输入手机号码"
                  {...smsForm.register('phone')}
                  error={smsForm.formState.errors.phone?.message}
                  maxLength={11}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="code" className="text-sm font-medium text-gray-700">
                  验证码
                </label>
                <div className="flex space-x-2">
                  <Input
                    id="code"
                    name="code"
                    type="text"
                    placeholder="请输入6位验证码"
                    {...smsForm.register('code')}
                    error={smsForm.formState.errors.code?.message}
                    maxLength={6}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendSmsCode}
                    disabled={countdown > 0 || isLoading}
                    className="min-w-[120px]"
                  >
                    {codeSent && countdown > 0 ? (
                      <span className="text-sm">重发 ({countdown}s)</span>
                    ) : codeSent ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                        重发验证码
                      </>
                    ) : (
                      '获取验证码'
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </Button>
            </form>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">或</span>
            </div>
          </div>

          {/* Alternative Login Methods */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleWechatLogin}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.5 2C4.36 2 1 4.69 1 8.5c0 2.43 1.29 4.58 3.32 5.95-.23-1.17-.43-2.97.09-4.25C4.78 9.17 6.28 7.75 8.5 7.75s3.72 1.42 4.09 2.45c.52 1.28.32 3.08.09 4.25C14.71 13.08 16 10.93 16 8.5 16 4.69 12.64 2 8.5 2z"/>
              </svg>
              微信登录
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full text-gray-600"
              onClick={handleGuestMode}
            >
              游客模式体验
            </Button>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              还没有账户？{' '}
              <Link href="/auth/register" className="text-blue-600 hover:underline font-medium">
                立即注册
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Back to Home */}
      <div className="text-center">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回首页
        </Link>
      </div>

      {/* Guest Access Modal */}
      <GuestAccess
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        redirectTo={redirectTo}
      />
    </div>
  )
}