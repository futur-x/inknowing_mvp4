import React from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Tag,
  Calendar,
  CreditCard,
  Percent,
  Shield,
  Info,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MembershipTier,
  BillingCycle,
  PaymentMethod,
  formatPrice
} from '@/lib/payment-utils';

interface OrderSummaryProps {
  plan: MembershipTier;
  billingCycle: BillingCycle;
  paymentMethod: PaymentMethod;
  price: number;
  originalPrice: number;
  discount: number;
  promoCode?: string;
  className?: string;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  plan,
  billingCycle,
  paymentMethod,
  price,
  originalPrice,
  discount,
  promoCode,
  className
}) => {
  const taxRate = 0.06; // 6% tax
  const taxAmount = Math.round(price * taxRate);
  const totalAmount = price + taxAmount;

  const getPlanName = (tier: MembershipTier) => {
    const names: Record<MembershipTier, string> = {
      free: '免费版',
      basic: '基础版',
      premium: '高级版',
      super: '超级版'
    };
    return names[tier];
  };

  const getPaymentMethodName = (method: PaymentMethod) => {
    const names: Record<PaymentMethod, string> = {
      alipay: '支付宝',
      wechat: '微信支付',
      credit_card: '信用卡'
    };
    return names[method];
  };

  const getPlanFeatures = (tier: MembershipTier) => {
    const features: Record<MembershipTier, string[]> = {
      free: ['每日20次对话', '基础功能'],
      basic: ['每月200次对话', '上传书籍', '优先支持'],
      premium: ['每月500次对话', '无限上传', 'AI笔记', 'API访问'],
      super: ['每月1000次对话', '所有功能', '专属客服', '定制开发']
    };
    return features[tier] || [];
  };

  return (
    <div className={cn('bg-white rounded-lg shadow-sm', className)}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingCart className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">订单摘要</h3>
        </div>
        <p className="text-sm text-gray-600">
          请确认您的订单信息
        </p>
      </div>

      {/* Order Details */}
      <div className="p-6 space-y-4">
        {/* Plan Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-purple-900">
                {getPlanName(plan)} 会员
              </h4>
              <p className="text-sm text-purple-700">
                {billingCycle === 'monthly' ? '月付计划' : '年付计划'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-900">
                {formatPrice(price, 'CNY')}
              </p>
              {discount > 0 && (
                <p className="text-sm text-purple-600 line-through">
                  {formatPrice(originalPrice, 'CNY')}
                </p>
              )}
            </div>
          </div>

          {/* Plan Features */}
          <div className="space-y-2 pt-3 border-t border-purple-200">
            {getPlanFeatures(plan).map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-purple-800">{feature}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Billing Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>计费周期</span>
            </div>
            <span className="font-medium text-gray-900">
              {billingCycle === 'monthly' ? '每月' : '每年'}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <CreditCard className="h-4 w-4" />
              <span>支付方式</span>
            </div>
            <span className="font-medium text-gray-900">
              {getPaymentMethodName(paymentMethod)}
            </span>
          </div>

          {discount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-green-600">
                <Percent className="h-4 w-4" />
                <span>优惠金额</span>
              </div>
              <span className="font-medium text-green-600">
                -{formatPrice(discount, 'CNY')}
              </span>
            </div>
          )}

          {promoCode && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-blue-600">
                <Tag className="h-4 w-4" />
                <span>优惠码</span>
              </div>
              <span className="font-medium text-blue-600">
                {promoCode}
              </span>
            </div>
          )}
        </div>

        {/* Price Breakdown */}
        <div className="pt-4 border-t border-gray-200 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">小计</span>
            <span className="text-gray-900">{formatPrice(price, 'CNY')}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">税费 ({(taxRate * 100).toFixed(0)}%)</span>
            <span className="text-gray-900">{formatPrice(taxAmount, 'CNY')}</span>
          </div>
        </div>

        {/* Total */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900">总计</span>
            <span className="text-2xl font-bold text-purple-600">
              {formatPrice(totalAmount, 'CNY')}
            </span>
          </div>
          {billingCycle === 'yearly' && (
            <p className="text-xs text-gray-500 text-right mt-1">
              相当于 {formatPrice(Math.round(totalAmount / 12), 'CNY')}/月
            </p>
          )}
        </div>

        {/* Promo Code Input */}
        <div className="pt-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="输入优惠码"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors">
              应用
            </button>
          </div>
        </div>

        {/* Security Info */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Shield className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-green-900 mb-1">安全保障</p>
              <ul className="space-y-1 text-green-700">
                <li>• SSL加密传输</li>
                <li>• 30天退款保证</li>
                <li>• 随时取消订阅</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Auto-renewal Notice */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">自动续费说明</p>
              <p>
                您的会员将在到期时自动续费，您可以随时在个人中心取消自动续费。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;