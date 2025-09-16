/**
 * Hero Section Component
 * Main landing area for the homepage
 */

'use client';

import React from 'react';
import { HeroSearchBar } from '@/components/search/search-bar';
import { Button } from '@/components/ui/button';
import { BookOpen, MessageSquare, Sparkles, TrendingUp, Users, Star } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

interface HeroSectionProps {
  className?: string;
}

/**
 * Animated gradient background
 */
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute -inset-[10px] opacity-30">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000" />
      </div>
    </div>
  );
}

/**
 * Platform statistics
 */
function PlatformStats() {
  const stats = [
    { icon: BookOpen, value: '10,000+', label: '精选书籍' },
    { icon: Users, value: '50,000+', label: '活跃用户' },
    { icon: MessageSquare, value: '1M+', label: '智能对话' },
    { icon: Star, value: '4.9', label: '用户评分' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="flex flex-col items-center p-4 bg-background/60 backdrop-blur-sm rounded-lg border border-border/50"
        >
          <stat.icon className="h-8 w-8 mb-2 text-primary" />
          <span className="text-2xl font-bold">{stat.value}</span>
          <span className="text-sm text-muted-foreground">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

export function HeroSection({ className }: HeroSectionProps) {
  const { user } = useAuth();

  return (
    <section className={cn('relative py-20 px-4 overflow-hidden', className)}>
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Content */}
      <div className="relative z-10 container mx-auto">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              与书籍对话，
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                探索无限智慧
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              InKnowing - 您的AI驱动书籍对话平台。通过智能对话深入理解书籍内容，
              与书中角色互动，获得个性化的阅读体验。
            </p>
          </div>

          {/* Search Bar */}
          <div className="pt-4">
            <HeroSearchBar placeholder="搜索书籍、作者或提出您的问题..." />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/books">
              <Button size="lg" variant="default" className="min-w-[160px]">
                <BookOpen className="mr-2 h-5 w-5" />
                浏览书籍
              </Button>
            </Link>

            {!user ? (
              <Link href="/auth/register">
                <Button size="lg" variant="outline" className="min-w-[160px]">
                  <Sparkles className="mr-2 h-5 w-5" />
                  免费开始
                </Button>
              </Link>
            ) : (
              <Link href="/chat">
                <Button size="lg" variant="outline" className="min-w-[160px]">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  开始对话
                </Button>
              </Link>
            )}
          </div>

          {/* Feature Tags */}
          <div className="flex flex-wrap gap-2 justify-center">
            <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              🎯 问题驱动发现
            </div>
            <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              🤖 AI增强阅读
            </div>
            <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              👥 角色对话
            </div>
            <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              📚 海量书库
            </div>
          </div>
        </div>

        {/* Platform Stats */}
        <PlatformStats />
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  );
}