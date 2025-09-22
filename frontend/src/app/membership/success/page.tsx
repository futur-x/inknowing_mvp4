'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Download,
  Mail,
  ArrowRight,
  Sparkles,
  Trophy,
  Zap,
  Book
} from 'lucide-react';
import { useUserStore } from '@/stores/user';
import confetti from 'canvas-confetti';
import { formatPrice, MembershipTier } from '@/lib/payment-utils';
import { generatePaymentReceipt } from '@/lib/mock-payment-provider';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile: userInfo } = useUserStore();
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const orderId = searchParams.get('orderId');

  useEffect(() => {
    // Trigger confetti animation
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Load receipt data
    const loadReceipt = async () => {
      if (orderId) {
        try {
          const receiptData = await generatePaymentReceipt(orderId);
          setReceipt(receiptData);
        } catch (error) {
          console.error('Failed to load receipt:', error);
        }
      }
      setLoading(false);
    };

    loadReceipt();
  }, [orderId]);

  const getMembershipBenefits = (tier: MembershipTier) => {
    const benefits: Record<MembershipTier, Array<{ icon: React.ReactNode; text: string }>> = {
      free: [],
      basic: [
        { icon: <Zap className="h-5 w-5 text-yellow-500" />, text: '200次/月对话额度' },
        { icon: <Book className="h-5 w-5 text-blue-500" />, text: '上传个人书籍' },
        { icon: <Sparkles className="h-5 w-5 text-purple-500" />, text: '高级AI理解' }
      ],
      premium: [
        { icon: <Zap className="h-5 w-5 text-yellow-500" />, text: '500次/月对话额度' },
        { icon: <Book className="h-5 w-5 text-blue-500" />, text: '无限上传书籍' },
        { icon: <Trophy className="h-5 w-5 text-orange-500" />, text: 'AI笔记生成' },
        { icon: <Sparkles className="h-5 w-5 text-purple-500" />, text: 'API访问权限' }
      ],
      super: [
        { icon: <Zap className="h-5 w-5 text-yellow-500" />, text: '1000次/月对话额度' },
        { icon: <Trophy className="h-5 w-5 text-orange-500" />, text: '专属AI模型' },
        { icon: <Sparkles className="h-5 w-5 text-purple-500" />, text: '专属客户经理' },
        { icon: <Book className="h-5 w-5 text-blue-500" />, text: '定制化功能' }
      ]
    };
    return benefits[tier] || [];
  };

  const currentTier = (userInfo?.membership_type || 'free') as MembershipTier;
  const benefits = getMembershipBenefits(currentTier);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Icon Animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 20
          }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-50 animate-pulse" />
            <div className="relative bg-gradient-to-br from-green-400 to-green-600 rounded-full p-6">
              <CheckCircle className="h-16 w-16 text-white" />
            </div>
          </div>
        </motion.div>

        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            支付成功！
          </h1>
          <p className="text-lg text-gray-600">
            恭喜您成功升级为
            <span className="font-semibold text-purple-600 mx-1">
              {currentTier === 'basic' && '基础版'}
              {currentTier === 'premium' && '高级版'}
              {currentTier === 'super' && '超级版'}
            </span>
            会员
          </p>
        </motion.div>

        {/* Order Details */}
        {receipt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg shadow-lg p-6 mb-8"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">订单详情</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">订单编号</span>
                <span className="font-mono text-gray-900">{receipt.orderId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">支付金额</span>
                <span className="font-semibold text-gray-900">
                  {formatPrice(receipt.totalAmount, receipt.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">支付时间</span>
                <span className="text-gray-900">
                  {new Date(receipt.date).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">支付方式</span>
                <span className="text-gray-900">
                  {receipt.paymentMethod === 'alipay' && '支付宝'}
                  {receipt.paymentMethod === 'wechat' && '微信支付'}
                  {receipt.paymentMethod === 'credit_card' && '信用卡'}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 flex gap-4">
              <button className="flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors">
                <Download className="h-4 w-4" />
                <span className="text-sm font-medium">下载发票</span>
              </button>
              <button className="flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors">
                <Mail className="h-4 w-4" />
                <span className="text-sm font-medium">发送到邮箱</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Membership Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-purple-900 mb-4">
            您的专属权益
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {benefits.map((benefit, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + idx * 0.1 }}
                className="flex items-center gap-3 bg-white rounded-lg p-3"
              >
                {benefit.icon}
                <span className="text-sm font-medium text-gray-700">
                  {benefit.text}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8"
        >
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            接下来您可以
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>立即开始与AI对话，享受更高的对话额度</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>上传您的个人书籍，创建专属知识库</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>在个人中心查看和管理您的会员权益</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>探索更多高级功能，提升阅读体验</span>
            </li>
          </ul>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <button
            onClick={() => router.push('/chat')}
            className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
          >
            开始对话
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => router.push('/upload')}
            className="flex-1 bg-white border border-purple-600 text-purple-600 py-3 px-6 rounded-lg font-medium hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
          >
            上传书籍
            <Book className="h-4 w-4" />
          </button>
          <button
            onClick={() => router.push('/profile/membership')}
            className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            管理会员
          </button>
        </motion.div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <AuthGuard redirectTo="/auth/login?redirect=/membership/success">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </AuthGuard>
  );
}