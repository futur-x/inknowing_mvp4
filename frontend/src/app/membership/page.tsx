'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/user';
import { Check, Star, Sparkles, Crown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MembershipTier {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  features: string[];
  quotaLimit: string;
  icon: React.ReactNode;
  popular?: boolean;
  color: string;
  gradient: string;
}

const membershipTiers: MembershipTier[] = [
  {
    id: 'free',
    name: '免费版',
    description: '开启您的智能阅读之旅',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'CNY',
    features: [
      '每日20次对话额度',
      '访问公开书籍库',
      '基础AI对话功能',
      '搜索书籍功能',
      '保存对话历史'
    ],
    quotaLimit: '20次/天',
    icon: <Zap className="h-6 w-6" />,
    color: 'text-gray-600',
    gradient: 'from-gray-100 to-gray-200'
  },
  {
    id: 'basic',
    name: '基础版',
    description: '适合日常阅读爱好者',
    monthlyPrice: 29,
    yearlyPrice: 290,
    currency: 'CNY',
    features: [
      '每月200次对话额度',
      '所有免费版功能',
      '上传个人书籍 (5本/月)',
      '高级AI理解能力',
      '导出对话记录',
      '优先客户支持'
    ],
    quotaLimit: '200次/月',
    icon: <Star className="h-6 w-6" />,
    color: 'text-blue-600',
    gradient: 'from-blue-100 to-blue-200'
  },
  {
    id: 'premium',
    name: '高级版',
    description: '为专业用户打造',
    monthlyPrice: 99,
    yearlyPrice: 990,
    currency: 'CNY',
    features: [
      '每月500次对话额度',
      '所有基础版功能',
      '无限上传书籍',
      '多角色深度对话',
      'AI笔记生成',
      '批量书籍处理',
      '团队协作功能',
      'API访问权限'
    ],
    quotaLimit: '500次/月',
    icon: <Sparkles className="h-6 w-6" />,
    popular: true,
    color: 'text-purple-600',
    gradient: 'from-purple-100 to-purple-200'
  },
  {
    id: 'super',
    name: '超级版',
    description: '无限可能，极致体验',
    monthlyPrice: 299,
    yearlyPrice: 2990,
    currency: 'CNY',
    features: [
      '每月1000次对话额度',
      '所有高级版功能',
      '专属AI模型定制',
      '优先处理队列',
      '专属客户经理',
      '定制化功能开发',
      '企业级数据安全',
      '线下培训支持'
    ],
    quotaLimit: '1000次/月',
    icon: <Crown className="h-6 w-6" />,
    color: 'text-yellow-600',
    gradient: 'from-yellow-100 to-yellow-200'
  }
];

export default function MembershipPage() {
  const router = useRouter();
  const { profile: userInfo } = useUserStore();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const currentTier = userInfo?.membership_type || 'free';

  const handleSelectPlan = (tierId: string) => {
    if (tierId === 'free' || tierId === currentTier) {
      return;
    }

    // Navigate to checkout with selected plan
    router.push(`/membership/checkout?plan=${tierId}&cycle=${billingCycle}`);
  };

  const calculateSavings = (tier: MembershipTier) => {
    if (tier.monthlyPrice === 0) return 0;
    const yearlySavings = (tier.monthlyPrice * 12) - tier.yearlyPrice;
    return Math.round((yearlySavings / (tier.monthlyPrice * 12)) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-gray-900 mb-4"
          >
            选择最适合您的会员计划
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600 mb-8"
          >
            解锁更多功能，开启智能阅读新体验
          </motion.p>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center bg-gray-100 rounded-lg p-1"
          >
            <button
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              月付
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              年付
              <span className="ml-1 text-xs text-green-600 font-semibold">
                省20%
              </span>
            </button>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {membershipTiers.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
              className={cn(
                'relative bg-white rounded-2xl shadow-lg overflow-hidden',
                tier.popular && 'ring-2 ring-purple-500',
                currentTier === tier.id && 'ring-2 ring-green-500'
              )}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute top-0 right-0 bg-purple-500 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                  最受欢迎
                </div>
              )}

              {/* Current Plan Badge */}
              {currentTier === tier.id && (
                <div className="absolute top-0 left-0 bg-green-500 text-white px-3 py-1 text-xs font-bold rounded-br-lg">
                  当前计划
                </div>
              )}

              <div className={cn(
                'h-32 bg-gradient-to-br p-6 flex items-center justify-between',
                tier.gradient
              )}>
                <div>
                  <div className={cn('flex items-center gap-2 mb-2', tier.color)}>
                    {tier.icon}
                    <h3 className="text-xl font-bold">{tier.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600">{tier.description}</p>
                </div>
              </div>

              <div className="p-6">
                {/* Pricing */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900">
                      ¥{billingCycle === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice}
                    </span>
                    <span className="text-gray-500">
                      /{billingCycle === 'monthly' ? '月' : '年'}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && tier.monthlyPrice > 0 && (
                    <p className="text-sm text-green-600 mt-1">
                      节省 {calculateSavings(tier)}% (¥{tier.monthlyPrice * 12 - tier.yearlyPrice}/年)
                    </p>
                  )}
                  <div className="mt-2 text-sm font-medium text-gray-700">
                    配额: {tier.quotaLimit}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(tier.id)}
                  disabled={tier.id === 'free' || currentTier === tier.id}
                  className={cn(
                    'w-full py-3 px-4 rounded-lg font-medium transition-all',
                    tier.id === 'free' || currentTier === tier.id
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : tier.popular
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  )}
                >
                  {currentTier === tier.id
                    ? '当前计划'
                    : tier.id === 'free'
                    ? '免费使用'
                    : currentTier === 'free'
                    ? '立即升级'
                    : '切换计划'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">常见问题</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">如何升级会员？</h3>
              <p className="text-sm text-gray-600">
                选择您需要的会员计划，点击"立即升级"按钮，按照指引完成支付即可。
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">可以随时取消吗？</h3>
              <p className="text-sm text-gray-600">
                是的，您可以随时在个人中心取消订阅，已支付的费用将按比例退还。
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">支持哪些支付方式？</h3>
              <p className="text-sm text-gray-600">
                我们支持支付宝、微信支付以及国际信用卡支付。
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">额度用完了怎么办？</h3>
              <p className="text-sm text-gray-600">
                您可以升级到更高级的会员计划，或等待下个计费周期自动刷新额度。
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}