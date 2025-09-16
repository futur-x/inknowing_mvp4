// WeChat OAuth Callback Handler - InKnowing MVP 4.0
// Business Logic Conservation: WeChat Authorization Code Processing

'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { CheckCircle, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import type { LoginFormData } from '@/types/api'

type CallbackState = 'processing' | 'success' | 'error' | 'expired'

export default function WeChatCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, register, isLoading, error } = useAuthStore()
  const { fetchAllUserData } = useUserStore()

  // URL parameters from WeChat
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')
  const mode = searchParams.get('mode') || 'login' // login or register
  const redirectTo = searchParams.get('redirect_uri') || '/'

  // Component state
  const [callbackState, setCallbackState] = useState<CallbackState>('processing')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    handleWeChatCallback()
  }, [])

  const handleWeChatCallback = async () => {
    try {
      setCallbackState('processing')

      // Check for WeChat authorization errors
      if (errorParam) {
        throw new Error(getWeChatErrorMessage(errorParam))
      }

      // Validate required parameters
      if (!code) {
        throw new Error('授权码缺失，请重新登录')
      }

      if (!state) {
        throw new Error('状态参数缺失，请重新登录')
      }

      // Validate state parameter (CSRF protection)
      const storedState = sessionStorage.getItem('wechat_oauth_state')
      if (state !== storedState) {
        throw new Error('状态验证失败，请重新登录')
      }

      // Process authentication based on mode
      if (mode === 'register') {
        await handleWeChatRegister(code)
      } else {
        await handleWeChatLogin(code)
      }

      // Fetch user data after successful auth
      await fetchAllUserData()

      setCallbackState('success')
      toast.success(mode === 'login' ? '微信登录成功！' : '微信注册成功！')

      // Redirect after short delay
      setTimeout(() => {
        router.push(redirectTo)
      }, 2000)

    } catch (error) {
      console.error('WeChat callback failed:', error)
      const message = error instanceof Error ? error.message : '微信授权失败'
      setErrorMessage(message)
      setCallbackState('error')
      toast.error(message)
    }
  }

  const handleWeChatLogin = async (authCode: string) => {
    const loginData: LoginFormData = {
      type: 'wechat',
      wechatCode: authCode,
    }

    await login(loginData)
  }

  const handleWeChatRegister = async (authCode: string) => {
    const registerData = {
      type: 'wechat' as const,
      wechatCode: authCode,
    }

    await register(registerData)
  }

  const getWeChatErrorMessage = (error: string): string => {
    switch (error) {
      case 'access_denied':
        return '用户拒绝授权'
      case 'invalid_request':
        return '请求参数错误'
      case 'unauthorized_client':
        return '应用未授权'
      case 'unsupported_response_type':
        return '不支持的响应类型'
      case 'invalid_scope':
        return '权限范围无效'
      case 'server_error':
        return '服务器错误'
      case 'temporarily_unavailable':
        return '服务暂时不可用'
      default:
        return `微信授权失败: ${error}`
    }
  }

  const handleRetry = () => {
    // Generate new state for CSRF protection
    const newState = Math.random().toString(36).substring(2, 15)
    sessionStorage.setItem('wechat_oauth_state', newState)

    // Redirect to WeChat authorization
    const authUrl = buildWeChatAuthUrl(newState)
    window.location.href = authUrl
  }

  const buildWeChatAuthUrl = (state: string): string => {
    const baseUrl = 'https://open.weixin.qq.com/connect/qrconnect'
    const params = new URLSearchParams({
      appid: process.env.NEXT_PUBLIC_WECHAT_APP_ID || 'wx_demo_app_id',
      redirect_uri: `${window.location.origin}/auth/wechat/callback`,
      response_type: 'code',
      scope: 'snsapi_login',
      state: state,
    })

    return `${baseUrl}?${params.toString()}#wechat_redirect`
  }

  const getStateDisplay = () => {
    switch (callbackState) {
      case 'processing':
        return {
          icon: <LoadingSpinner className="w-16 h-16" />,
          title: '处理中...',
          description: `正在处理微信${mode === 'login' ? '登录' : '注册'}信息`,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        }
      case 'success':
        return {
          icon: <CheckCircle className="w-16 h-16" />,
          title: '授权成功',
          description: `微信${mode === 'login' ? '登录' : '注册'}成功，正在跳转...`,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        }
      case 'error':
        return {
          icon: <AlertCircle className="w-16 h-16" />,
          title: '授权失败',
          description: errorMessage || `微信${mode === 'login' ? '登录' : '注册'}失败`,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      default:
        return {
          icon: <LoadingSpinner className="w-16 h-16" />,
          title: '处理中...',
          description: '正在处理请求',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        }
    }
  }

  const stateDisplay = getStateDisplay()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md ${stateDisplay.bgColor} ${stateDisplay.borderColor}`}>
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            {/* Status Icon */}
            <div className={`flex justify-center ${stateDisplay.color}`}>
              {stateDisplay.icon}
            </div>

            {/* Status Text */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {stateDisplay.title}
              </h1>
              <p className="text-gray-600 leading-relaxed">
                {stateDisplay.description}
              </p>
            </div>

            {/* WeChat Logo */}
            <div className="flex justify-center">
              <div className="flex items-center space-x-2 text-green-600">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.5 2C4.36 2 1 4.69 1 8.5c0 2.43 1.29 4.58 3.32 5.95-.23-1.17-.43-2.97.09-4.25C4.78 9.17 6.28 7.75 8.5 7.75s3.72 1.42 4.09 2.45c.52 1.28.32 3.08.09 4.25C14.71 13.08 16 10.93 16 8.5 16 4.69 12.64 2 8.5 2z"/>
                </svg>
                <span className="text-sm font-medium">微信授权</span>
              </div>
            </div>

            {/* Progress bar for processing */}
            {callbackState === 'processing' && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }} />
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              {callbackState === 'error' && (
                <div className="space-y-2">
                  <Button
                    onClick={handleRetry}
                    className="w-full"
                    disabled={isLoading}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    重新授权
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/auth/${mode}`)}
                    className="w-full"
                  >
                    选择其他方式
                  </Button>
                </div>
              )}

              {callbackState === 'success' && (
                <Button
                  onClick={() => router.push(redirectTo)}
                  className="w-full"
                >
                  立即跳转
                </Button>
              )}

              {/* Back to home */}
              <Button
                variant="ghost"
                onClick={() => router.push('/')}
                className="w-full"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回首页
              </Button>
            </div>

            {/* Additional info */}
            {callbackState === 'processing' && (
              <div className="text-xs text-gray-500 space-y-1">
                <p>请稍候，正在验证您的微信身份...</p>
                <p>如果长时间没有响应，请刷新页面重试</p>
              </div>
            )}

            {callbackState === 'error' && (
              <div className="text-xs text-gray-500 space-y-1">
                <p>如果问题持续存在，请：</p>
                <p>1. 检查网络连接</p>
                <p>2. 尝试使用手机号登录</p>
                <p>3. 联系客服获取帮助</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}