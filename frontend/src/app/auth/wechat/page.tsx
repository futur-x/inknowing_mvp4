// WeChat OAuth Login Page - InKnowing MVP 4.0
// Business Logic Conservation: WeChat OAuth Integration

'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { WeChatLogin } from '@/components/auth/wechat-login'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Smartphone } from 'lucide-react'

export default function WeChatLoginPage() {
  const searchParams = useSearchParams()
  const mode = (searchParams.get('mode') as 'login' | 'register') || 'login'
  const redirect = searchParams.get('redirect') || '/'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.5 2C4.36 2 1 4.69 1 8.5c0 2.43 1.29 4.58 3.32 5.95-.23-1.17-.43-2.97.09-4.25C4.78 9.17 6.28 7.75 8.5 7.75s3.72 1.42 4.09 2.45c.52 1.28.32 3.08.09 4.25C14.71 13.08 16 10.93 16 8.5 16 4.69 12.64 2 8.5 2z"/>
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          微信{mode === 'login' ? '登录' : '注册'}
        </h1>
        <p className="text-gray-600">
          使用微信扫码，快速{mode === 'login' ? '登录' : '注册'}您的账户
        </p>
      </div>

      {/* WeChat Login Component */}
      <div className="flex justify-center">
        <WeChatLogin
          mode={mode}
          redirectTo={redirect}
        />
      </div>

      {/* Alternative Methods */}
      <div className="space-y-4">
        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">或选择其他方式</span>
          </div>
        </div>

        {/* Alternative Login Methods */}
        <div className="flex flex-col space-y-3">
          <Button
            variant="outline"
            className="w-full"
            asChild
          >
            <Link href={`/auth/${mode}?method=phone`}>
              <Smartphone className="w-4 h-4 mr-2" />
              手机号{mode === 'login' ? '登录' : '注册'}
            </Link>
          </Button>

          {mode === 'login' && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                还没有账户？{' '}
                <Link
                  href="/auth/register"
                  className="text-blue-600 hover:underline font-medium"
                >
                  立即注册
                </Link>
              </p>
            </div>
          )}

          {mode === 'register' && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                已有账户？{' '}
                <Link
                  href="/auth/login"
                  className="text-blue-600 hover:underline font-medium"
                >
                  立即登录
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Security Notice for WeChat */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-green-900">微信登录安全保障</h3>
            <div className="text-xs text-green-700 leading-relaxed space-y-1">
              <p>• 我们仅获取您的微信基本信息（头像、昵称）</p>
              <p>• 不会获取您的微信聊天记录或联系人信息</p>
              <p>• 您可以随时在微信设置中取消授权</p>
            </div>
          </div>
        </div>
      </div>

      {/* Back Navigation */}
      <div className="text-center">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回首页
        </Link>
      </div>
    </div>
  )
}