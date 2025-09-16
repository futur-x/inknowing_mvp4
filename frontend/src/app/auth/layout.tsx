// Auth Layout - InKnowing MVP 4.0
// Business Logic Conservation: Authentication flow layout wrapper

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width=%2260%22%20height=%2260%22%20viewBox=%220%200%2060%2060%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill=%22none%22%20fill-rule=%22evenodd%22%3E%3Cg%20fill=%22%23ffffff%22%20fill-opacity=%220.1%22%3E%3Ccircle%20cx=%227%22%20cy=%227%22%20r=%227%22/%3E%3Ccircle%20cx=%2253%22%20cy=%227%22%20r=%227%22/%3E%3Ccircle%20cx=%227%22%20cy=%2253%22%20r=%227%22/%3E%3Ccircle%20cx=%2253%22%20cy=%2253%22%20r=%227%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          {/* Logo */}
          <div className="mb-8">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">知</span>
              </div>
              <span className="text-3xl font-bold">InKnowing</span>
            </Link>
          </div>

          {/* Main Content */}
          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight mb-6">
              与书籍对话
              <br />
              探索知识宇宙
            </h1>
            <p className="text-xl opacity-90 leading-relaxed mb-8">
              通过AI技术，让每一本书都能与您直接对话。
              提出问题，获得答案，深度探索书籍的精髓。
            </p>

            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="opacity-90">智能书籍问答系统</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="opacity-90">角色扮演深度对话</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="opacity-90">个人知识图谱构建</span>
              </div>
            </div>
          </div>

          {/* Floating Elements */}
          <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full backdrop-blur-sm"></div>
          <div className="absolute bottom-32 right-32 w-20 h-20 bg-white/5 rounded-full backdrop-blur-sm"></div>
          <div className="absolute top-1/2 right-10 w-16 h-16 bg-white/10 rounded-full backdrop-blur-sm"></div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="w-full max-w-md mx-auto px-6 lg:px-8">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-white">知</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">InKnowing</span>
            </Link>
          </div>

          {/* Auth Form Content */}
          <div className="bg-white rounded-2xl shadow-xl p-8 lg:shadow-none lg:bg-transparent lg:rounded-none lg:p-0">
            {children}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500 space-y-2">
            <p>
              继续使用即表示您同意我们的{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">
                服务条款
              </Link>
              {' '}和{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                隐私政策
              </Link>
            </p>
            <p>© 2024 InKnowing. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}