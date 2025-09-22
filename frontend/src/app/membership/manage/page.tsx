'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Calendar,
  Download,
  Settings,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  XCircle,
  History,
  Shield
} from 'lucide-react';
import { useUserStore } from '@/stores/user';
import { useMembership } from '@/hooks/use-membership';
import { BillingHistory } from '@/components/membership/billing-history';
import { toast } from 'react-hot-toast';
import { formatPrice, MembershipTier } from '@/lib/payment-utils';
import { cn } from '@/lib/utils';

function ManageMembershipPageContent() {
  const router = useRouter();
  const { profile: userInfo, setProfile: updateUserInfo } = useUserStore();
  const {
    currentTier,
    orderHistory,
    loadOrderHistory,
    formatMembershipName
  } = useMembership();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [autoRenewal, setAutoRenewal] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrderHistory();
  }, [loadOrderHistory]);

  // Mock subscription data
  const subscriptionData = {
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    memberSince: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    totalSpent: 388,
    savedAmount: 100
  };

  const handleCancelSubscription = async () => {
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update user to free tier
      updateUserInfo({
        ...userInfo!,
        membership_type: 'free'
      });

      toast.success('订阅已取消，您可以继续使用至当前计费周期结束');
      setShowCancelModal(false);
      router.push('/membership');
    } catch (error) {
      toast.error('取消订阅失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoRenewal = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAutoRenewal(!autoRenewal);
      toast.success(
        autoRenewal ? '自动续费已关闭' : '自动续费已开启'
      );
    } catch (error) {
      toast.error('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (currentTier === 'free') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              您当前是免费用户
            </h2>
            <p className="text-gray-600 mb-6">
              升级到付费会员，享受更多功能和权益
            </p>
            <button
              onClick={() => router.push('/membership')}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              查看会员计划
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">会员管理</h1>
          <p className="text-gray-600">管理您的订阅、账单和支付方式</p>
        </div>

        {/* Current Subscription */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">当前订阅</h2>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold text-purple-900">
                  {formatMembershipName(currentTier)}
                </h3>
                <p className="text-sm text-purple-700">月付计划</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-900">
                  {formatPrice(
                    currentTier === 'basic' ? 29 :
                    currentTier === 'premium' ? 99 :
                    currentTier === 'super' ? 299 : 0,
                    'CNY'
                  )}
                </p>
                <p className="text-sm text-purple-700">/月</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-700">下次扣费日期</span>
              <span className="font-medium text-purple-900">
                {subscriptionData.nextBillingDate.toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Calendar className="h-4 w-4" />
                <span>会员开通时间</span>
              </div>
              <p className="font-medium text-gray-900">
                {subscriptionData.memberSince.toLocaleDateString('zh-CN')}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <CreditCard className="h-4 w-4" />
                <span>累计消费</span>
              </div>
              <p className="font-medium text-gray-900">
                {formatPrice(subscriptionData.totalSpent, 'CNY')}
              </p>
            </div>
          </div>

          {/* Auto Renewal Toggle */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">自动续费</p>
                <p className="text-sm text-gray-600">
                  {autoRenewal ? '已开启，到期自动续费' : '已关闭，到期后降级为免费版'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleAutoRenewal}
              disabled={loading}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                autoRenewal ? 'bg-purple-600' : 'bg-gray-300'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  autoRenewal ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/membership')}
              className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Settings className="h-4 w-4 text-purple-600" />
                </div>
                <span className="font-medium text-gray-900">更改计划</span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </button>

            <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-medium text-gray-900">管理支付方式</span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </button>

            <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Download className="h-4 w-4 text-green-600" />
                </div>
                <span className="font-medium text-gray-900">下载发票</span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </button>

            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full flex items-center justify-between p-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <span className="font-medium text-red-600">取消订阅</span>
              </div>
              <ChevronRight className="h-4 w-4 text-red-400" />
            </button>
          </div>
        </motion.div>

        {/* Billing History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">账单历史</h2>
          </div>
          <BillingHistory orders={orderHistory} />
        </motion.div>

        {/* Cancel Subscription Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-lg max-w-md w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">确认取消订阅？</h3>
              </div>

              <p className="text-gray-600 mb-4">
                取消订阅后，您将失去以下权益：
              </p>

              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>高级对话额度将降至每日20次</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>无法上传个人书籍</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>失去所有高级功能访问权限</span>
                </li>
              </ul>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-blue-800">
                  您可以继续使用会员服务至
                  <span className="font-semibold mx-1">
                    {subscriptionData.nextBillingDate.toLocaleDateString('zh-CN')}
                  </span>
                  ，之后将自动降级为免费版。
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  我再想想
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '处理中...' : '确认取消'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ManageMembershipPage() {
  return (
    <AuthGuard redirectTo="/auth/login?redirect=/membership/manage">
      <ManageMembershipPageContent />
    </AuthGuard>
  );
}