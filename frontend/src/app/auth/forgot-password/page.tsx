// Forgot Password Page - InKnowing MVP 4.0
// Business Logic Conservation: Password Reset Flow

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Mail, Phone, CheckCircle, Shield, Eye, EyeOff } from 'lucide-react'

// Form validation schemas
const phoneSchema = z.object({
  phone: z.string()
    .regex(/^1[3-9]\d{9}$/, '请输入有效的中国手机号码')
    .min(11, '手机号必须为11位')
    .max(11, '手机号必须为11位'),
})

const verifyCodeSchema = z.object({
  code: z.string()
    .regex(/^\d{6}$/, '验证码必须为6位数字')
    .min(6, '验证码为6位数字')
    .max(6, '验证码为6位数字'),
})

const resetPasswordSchema = z.object({
  password: z.string()
    .min(6, '密码至少需要6个字符')
    .max(50, '密码不能超过50个字符')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, '密码必须包含字母和数字'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
})

type ResetStep = 'phone' | 'verify' | 'reset' | 'success'

interface PhoneForm {
  phone: string
}

interface VerifyForm {
  code: string
}

interface ResetForm {
  password: string
  confirmPassword: string
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { sendVerificationCode, isLoading, error, clearError } = useAuthStore()

  // State
  const [step, setStep] = useState<ResetStep>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [codeSent, setCodeSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Forms
  const phoneForm = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  })

  const verifyForm = useForm<VerifyForm>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { code: '' },
  })

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  // Clear errors when step changes
  useEffect(() => {
    clearError()
  }, [step, clearError])

  // Countdown timer for SMS
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  // Handle phone submission
  const handlePhoneSubmit = async (data: PhoneForm) => {
    try {
      await sendVerificationCode(data.phone)
      setPhoneNumber(data.phone)
      setCodeSent(true)
      setCountdown(60)
      setStep('verify')
      toast.success('验证码已发送到您的手机')
    } catch (error) {
      console.error('Failed to send SMS:', error)
      // Error is handled by the store
    }
  }

  // Handle verification code submission
  const handleVerifySubmit = async (data: VerifyForm) => {
    try {
      // In a real implementation, this would verify the code with the backend
      // For now, we'll simulate success
      setStep('reset')
      toast.success('验证码验证成功')
    } catch (error) {
      console.error('Verification failed:', error)
      toast.error('验证码验证失败')
    }
  }

  // Handle password reset submission
  const handleResetSubmit = async (data: ResetForm) => {
    try {
      // In a real implementation, this would call the password reset API
      // For now, we'll simulate success
      setStep('success')
      toast.success('密码重置成功')
    } catch (error) {
      console.error('Password reset failed:', error)
      toast.error('密码重置失败，请重试')
    }
  }

  // Resend verification code
  const handleResendCode = async () => {
    try {
      await sendVerificationCode(phoneNumber)
      setCountdown(60)
      toast.success('验证码已重新发送')
    } catch (error) {
      console.error('Failed to resend SMS:', error)
      toast.error('发送验证码失败，请重试')
    }
  }

  // Password strength indicator
  const getPasswordStrength = (password: string): { strength: number; text: string; color: string } => {
    if (!password) return { strength: 0, text: '', color: '' }

    let strength = 0
    const checks = [
      password.length >= 6,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[^a-zA-Z\d]/.test(password),
      password.length >= 10,
    ]

    strength = checks.filter(Boolean).length

    if (strength <= 2) return { strength, text: '弱', color: 'text-red-500' }
    if (strength <= 4) return { strength, text: '中', color: 'text-yellow-500' }
    return { strength, text: '强', color: 'text-green-500' }
  }

  const passwordStrength = getPasswordStrength(resetForm.watch('password') || '')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          {step === 'phone' && <Phone className="w-8 h-8 text-blue-600" />}
          {step === 'verify' && <Mail className="w-8 h-8 text-blue-600" />}
          {step === 'reset' && <Shield className="w-8 h-8 text-blue-600" />}
          {step === 'success' && <CheckCircle className="w-8 h-8 text-green-600" />}
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          {step === 'phone' && '找回密码'}
          {step === 'verify' && '验证身份'}
          {step === 'reset' && '重置密码'}
          {step === 'success' && '重置成功'}
        </h1>
        <p className="text-gray-600">
          {step === 'phone' && '请输入您的注册手机号码'}
          {step === 'verify' && '请输入发送到您手机的验证码'}
          {step === 'reset' && '请设置新的登录密码'}
          {step === 'success' && '您的密码已成功重置'}
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step === 'phone' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
        }`}>
          1
        </div>
        <div className={`w-12 h-0.5 ${
          ['verify', 'reset', 'success'].includes(step) ? 'bg-green-600' : 'bg-gray-300'
        }`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step === 'verify' ? 'bg-blue-600 text-white' :
          ['reset', 'success'].includes(step) ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-500'
        }`}>
          2
        </div>
        <div className={`w-12 h-0.5 ${
          ['reset', 'success'].includes(step) ? 'bg-green-600' : 'bg-gray-300'
        }`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step === 'reset' ? 'bg-blue-600 text-white' :
          step === 'success' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-500'
        }`}>
          3
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {/* Step 1: Phone Input */}
          {step === 'phone' && (
            <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  手机号码
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="请输入注册时使用的手机号码"
                  {...phoneForm.register('phone')}
                  error={phoneForm.formState.errors.phone?.message}
                  maxLength={11}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    发送中...
                  </>
                ) : (
                  '发送验证码'
                )}
              </Button>
            </form>
          )}

          {/* Step 2: Verification Code */}
          {step === 'verify' && (
            <form onSubmit={verifyForm.handleSubmit(handleVerifySubmit)} className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  验证码已发送至
                </p>
                <p className="font-medium text-gray-900">
                  {phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="code" className="text-sm font-medium text-gray-700">
                  验证码
                </label>
                <Input
                  id="code"
                  type="text"
                  placeholder="请输入6位验证码"
                  {...verifyForm.register('code')}
                  error={verifyForm.formState.errors.code?.message}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={countdown > 0 || isLoading}
                >
                  {countdown > 0 ? (
                    `重新发送 (${countdown}s)`
                  ) : (
                    '重新发送验证码'
                  )}
                </Button>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    验证中...
                  </>
                ) : (
                  '验证'
                )}
              </Button>
            </form>
          )}

          {/* Step 3: Password Reset */}
          {step === 'reset' && (
            <form onSubmit={resetForm.handleSubmit(handleResetSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="new-password" className="text-sm font-medium text-gray-700">
                  新密码
                </label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="请设置新密码"
                    {...resetForm.register('password')}
                    error={resetForm.formState.errors.password?.message}
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
                {passwordStrength.text && (
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          passwordStrength.strength <= 2
                            ? 'bg-red-500'
                            : passwordStrength.strength <= 4
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${(passwordStrength.strength / 6) * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${passwordStrength.color}`}>
                      {passwordStrength.text}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">
                  确认新密码
                </label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="请再次输入新密码"
                    {...resetForm.register('confirmPassword')}
                    error={resetForm.formState.errors.confirmPassword?.message}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-700 leading-relaxed">
                    <p className="font-medium">密码安全要求：</p>
                    <ul className="mt-1 space-y-0.5 list-disc list-inside">
                      <li>至少6个字符</li>
                      <li>包含字母和数字</li>
                      <li>建议使用大小写字母和特殊字符</li>
                    </ul>
                  </div>
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
                    重置中...
                  </>
                ) : (
                  '重置密码'
                )}
              </Button>
            </form>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">密码重置成功！</h3>
                  <p className="text-gray-600">
                    您的密码已成功重置，现在可以使用新密码登录了
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => router.push('/auth/login')}
                >
                  立即登录
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/')}
                >
                  返回首页
                </Button>
              </div>
            </div>
          )}

          {/* Back Navigation */}
          {step !== 'success' && (
            <div className="flex justify-between pt-4 border-t">
              {step === 'phone' ? (
                <Link
                  href="/auth/login"
                  className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  返回登录
                </Link>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (step === 'verify') setStep('phone')
                    if (step === 'reset') setStep('verify')
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  上一步
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-amber-900">安全提醒</h3>
              <p className="text-xs text-amber-700 leading-relaxed">
                如果您没有请求重置密码，请忽略此操作。为了您的账户安全，请不要将验证码告知他人。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}