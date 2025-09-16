// Home Page - InKnowing MVP 4.0
// Business Logic Conservation: Entry point for anonymous users - Discovery Phase

'use client';

import React from 'react'
import { HeroSection } from '@/components/home/hero-section'
import { FeaturedBooks } from '@/components/home/featured-books'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Search, Book, MessageCircle } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section with Search */}
      <HeroSection />

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              InKnowing如何工作
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              我们的AI驱动平台通过自然对话让书籍变得互动，
              让知识变得触手可及。
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center border-border/50 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Search className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>提出问题</CardTitle>
                <CardDescription>
                  使用自然语言搜索我们的知识库
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  使用我们的AI语义搜索找到能回答您特定问题的书籍。
                  无需知道确切的标题或作者。
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-border/50 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="mx-auto mb-4 w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle>开始对话</CardTitle>
                <CardDescription>
                  与书籍或书中角色进行对话
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  直接与内容对话或与书中角色进行角色扮演。
                  提出后续问题，深入探讨话题。
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-border/50 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
                  <Book className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle>学习与发现</CardTitle>
                <CardDescription>
                  通过互动学习获得洞察和知识
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  将被动阅读转化为主动学习。获得个性化的
                  洞察并探索不同书籍之间的联系。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Books Section */}
      <FeaturedBooks />
    </div>
  )
}
