// WeChat OAuth Login Component - InKnowing MVP 4.0
// Business Logic Conservation: WeChat OAuth → Authenticated State Transition

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from 'sonner'
import { CheckCircle, RefreshCw, AlertCircle, QrCode } from 'lucide-react'
import type { LoginFormData, RegisterFormData } from '@/types/api'

// WeChat Login States
type WeChatLoginState = 'loading' | 'qr_ready' | 'scanned' | 'confirmed' | 'expired' | 'error'

interface WeChatLoginProps {
  mode?: 'login' | 'register'
  onSuccess?: () => void
  onError?: (error: string) => void
  redirectTo?: string
}

// Mock WeChat SDK interface (would be from actual WeChat SDK)
interface WeChatLoginConfig {
  appid: string
  scope: string
  redirect_uri: string
  state: string
  style: string
  href?: string
}

export function WeChatLogin({
  mode = 'login',
  onSuccess,
  onError,
  redirectTo = '/'
}: WeChatLoginProps) {
  const router = useRouter()
  const { login, register, isLoading } = useAuthStore()
  const { fetchAllUserData } = useUserStore()

  // State
  const [loginState, setLoginState] = useState<WeChatLoginState>('loading')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [authCode, setAuthCode] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  // Refs
  const qrContainerRef = useRef<HTMLDivElement>(null)

  // WeChat App Configuration (would come from environment)
  const wechatConfig: WeChatLoginConfig = {
    appid: process.env.NEXT_PUBLIC_WECHAT_APP_ID || 'wx_demo_app_id',
    scope: 'snsapi_login',
    redirect_uri: encodeURIComponent(`${window?.location.origin}/auth/wechat/callback`),
    state: Math.random().toString(36).substring(2, 15),
    style: 'black',
    href: 'data:text/css;base64,LmltcG93ZXJCb3ggLnFyY29kZSB7d2lkdGg6IDIwMHB4O30KLmltcG93ZXJCb3ggLnRpdGxlIHtkaXNwbGF5OiBub25lO30KLmltcG93ZXJCb3ggLmluZm8ge3dpZHRoOiAyMDBweDt9Ci5zdGF0dXNfaWNvbiB7ZGlzcGxheTogbm9uZX0KLmltcG93ZXJCb3ggLnN0YXR1cyB7dGV4dC1hbGlnbjogY2VudGVyO30='
  }

  // Initialize WeChat login
  useEffect(() => {
    initializeWeChatLogin()
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [])

  // Initialize WeChat Login QR Code
  const initializeWeChatLogin = async () => {
    try {
      setLoginState('loading')

      // In a real implementation, this would:
      // 1. Load WeChat JS SDK
      // 2. Initialize WeChat login widget
      // 3. Generate QR code
      // 4. Start polling for scan status

      // Simulate WeChat SDK loading
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock QR code generation
      const mockQrCode = generateMockQRCode()
      setQrCode(mockQrCode)
      setLoginState('qr_ready')

      // Start polling for scan status
      startPolling()

    } catch (error) {
      console.error('Failed to initialize WeChat login:', error)
      setLoginState('error')
      onError?.('初始化微信登录失败')
    }
  }

  // Generate mock QR code URL
  const generateMockQRCode = (): string => {
    const baseUrl = 'https://open.weixin.qq.com/connect/qrconnect'
    const params = new URLSearchParams({
      appid: wechatConfig.appid,
      redirect_uri: wechatConfig.redirect_uri,
      response_type: 'code',
      scope: wechatConfig.scope,
      state: wechatConfig.state,
    })
    return `${baseUrl}?${params.toString()}`
  }

  // Start polling for WeChat scan status
  const startPolling = () => {
    const interval = setInterval(async () => {
      try {
        // In a real implementation, this would poll the backend for scan status
        // For now, we'll simulate the scan flow
        await simulateScanFlow()
      } catch (error) {
        console.error('Polling error:', error)
        clearInterval(interval)
        setLoginState('error')
      }
    }, 2000) // Poll every 2 seconds

    setPollingInterval(interval)

    // Set timeout for QR code expiration
    setTimeout(() => {
      if (loginState !== 'confirmed') {
        clearInterval(interval)
        setLoginState('expired')
      }
    }, 180000) // 3 minutes timeout
  }

  // Simulate WeChat scan flow for demo purposes
  const simulateScanFlow = async () => {
    // This is just for demo - in real implementation, the backend would handle this
    const now = Date.now()
    const elapsed = (now - (window as any).__wechatLoginStart || now) / 1000

    if (elapsed > 10 && loginState === 'qr_ready') {
      setLoginState('scanned')
      toast.info('已扫描二维码，请在手机上确认登录')
    } else if (elapsed > 15 && loginState === 'scanned') {
      // Simulate successful authorization
      const mockAuthCode = 'mock_wechat_auth_code_' + Math.random().toString(36).substring(2)
      setAuthCode(mockAuthCode)
      setLoginState('confirmed')

      if (pollingInterval) {
        clearInterval(pollingInterval)
        setPollingInterval(null)
      }

      // Process the login/register
      await handleWeChatAuth(mockAuthCode)
    }
  }

  // Handle WeChat authentication
  const handleWeChatAuth = async (code: string) => {
    try {
      if (mode === 'login') {
        const loginData: LoginFormData = {
          type: 'wechat',
          wechatCode: code,
        }

        await login(loginData)
      } else {
        const registerData: RegisterFormData = {
          type: 'wechat',
          wechatCode: code,
        }

        await register(registerData)
      }

      // Fetch user data after successful auth
      await fetchAllUserData()

      toast.success(mode === 'login' ? '登录成功！' : '注册成功！')
      onSuccess?.()
      router.push(redirectTo)

    } catch (error) {
      console.error('WeChat auth failed:', error)
      const errorMessage = error instanceof Error ? error.message : '微信认证失败'
      onError?.(errorMessage)
      toast.error(errorMessage)
      setLoginState('error')
    }
  }

  // Refresh QR code
  const handleRefresh = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }

    setAuthCode(null)
    setQrCode(null)
    ;(window as any).__wechatLoginStart = Date.now()
    initializeWeChatLogin()
  }

  // Get status display
  const getStatusDisplay = () => {
    switch (loginState) {
      case 'loading':
        return {
          icon: <LoadingSpinner className="w-8 h-8" />,
          title: '加载中...',
          description: '正在初始化微信登录',
          color: 'text-blue-600'
        }
      case 'qr_ready':
        return {
          icon: <QrCode className="w-8 h-8" />,
          title: '请扫描二维码',
          description: '使用微信扫描上方二维码登录',
          color: 'text-blue-600'
        }
      case 'scanned':
        return {
          icon: <CheckCircle className="w-8 h-8" />,
          title: '扫描成功',
          description: '请在手机上确认登录',
          color: 'text-green-600'
        }
      case 'confirmed':
        return {
          icon: <LoadingSpinner className="w-8 h-8" />,
          title: '登录中...',
          description: '正在处理登录信息',
          color: 'text-blue-600'
        }
      case 'expired':
        return {
          icon: <AlertCircle className="w-8 h-8" />,
          title: '二维码已过期',
          description: '请点击刷新重新获取',
          color: 'text-orange-600'
        }
      case 'error':
        return {
          icon: <AlertCircle className="w-8 h-8" />,
          title: '登录失败',
          description: '请重试或选择其他登录方式',
          color: 'text-red-600'
        }
      default:
        return {
          icon: <QrCode className="w-8 h-8" />,
          title: '微信登录',
          description: '使用微信扫码登录',
          color: 'text-gray-600'
        }
    }
  }

  const status = getStatusDisplay()

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader className="text-center pb-4">
        <CardTitle className="flex items-center justify-center space-x-2">
          <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.5 2C4.36 2 1 4.69 1 8.5c0 2.43 1.29 4.58 3.32 5.95-.23-1.17-.43-2.97.09-4.25C4.78 9.17 6.28 7.75 8.5 7.75s3.72 1.42 4.09 2.45c.52 1.28.32 3.08.09 4.25C14.71 13.08 16 10.93 16 8.5 16 4.69 12.64 2 8.5 2z"/>
          </svg>
          <span>微信{mode === 'login' ? '登录' : '注册'}</span>
        </CardTitle>
        <CardDescription>
          使用微信扫码快速{mode === 'login' ? '登录' : '注册'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* QR Code Display */}
        <div className="flex justify-center">
          <div className="w-48 h-48 border-2 border-gray-200 rounded-lg flex items-center justify-center bg-white relative">
            {qrCode && loginState !== 'loading' ? (
              <div className="relative w-full h-full">
                {/* In a real implementation, this would be the actual WeChat QR code */}
                <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <QrCode className="w-16 h-16 mx-auto text-green-600" />
                    <p className="text-xs text-green-700">微信登录二维码</p>
                  </div>
                </div>

                {/* Scan overlay */}
                {loginState === 'scanned' && (
                  <div className="absolute inset-0 bg-green-600/90 rounded-lg flex items-center justify-center">
                    <div className="text-center text-white">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm font-medium">扫描成功</p>
                    </div>
                  </div>
                )}

                {/* Expired overlay */}
                {loginState === 'expired' && (
                  <div className="absolute inset-0 bg-gray-600/90 rounded-lg flex items-center justify-center">
                    <div className="text-center text-white">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm font-medium">已过期</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-2">
                <LoadingSpinner className="w-12 h-12 mx-auto text-gray-400" />
                <p className="text-sm text-gray-500">生成中...</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Display */}
        <div className="text-center space-y-2">
          <div className={`flex items-center justify-center ${status.color}`}>
            {status.icon}
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-gray-900">{status.title}</h3>
            <p className="text-sm text-gray-600">{status.description}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {(loginState === 'expired' || loginState === 'error') && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新二维码
            </Button>
          )}

          {/* Alternative login reminder */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              没有微信？可以使用
              <button
                type="button"
                className="text-blue-600 hover:underline ml-1"
                onClick={() => router.push(`/auth/${mode}?method=phone`)}
              >
                手机号{mode === 'login' ? '登录' : '注册'}
              </button>
            </p>
          </div>
        </div>

        {/* Help */}
        <div className="border-t pt-4">
          <details className="text-sm">
            <summary className="text-gray-600 cursor-pointer hover:text-gray-800">
              使用帮助
            </summary>
            <div className="mt-2 space-y-1 text-xs text-gray-500 leading-relaxed">
              <p>1. 打开手机微信，点击右上角 "+" 选择 "扫一扫"</p>
              <p>2. 将摄像头对准二维码进行扫描</p>
              <p>3. 在手机上确认登录授权</p>
              <p>4. 完成登录，自动跳转到首页</p>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  )
}