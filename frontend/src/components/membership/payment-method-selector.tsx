import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Smartphone, Check, Shield, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentMethod } from '@/lib/payment-utils';
import Image from 'next/image';

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: React.ReactNode;
  popular?: boolean;
  badges?: string[];
  processingTime?: string;
  logoUrl?: string;
}

const paymentMethods: PaymentMethodOption[] = [
  {
    id: 'alipay',
    name: '支付宝',
    description: '使用支付宝扫码支付，安全便捷',
    icon: <Smartphone className="h-8 w-8 text-blue-600" />,
    popular: true,
    badges: ['推荐', '即时到账'],
    processingTime: '实时',
    logoUrl: '/alipay-logo.png'
  },
  {
    id: 'wechat',
    name: '微信支付',
    description: '使用微信扫一扫，快速完成支付',
    icon: <Smartphone className="h-8 w-8 text-green-600" />,
    badges: ['即时到账'],
    processingTime: '实时',
    logoUrl: '/wechat-pay-logo.png'
  },
  {
    id: 'credit_card',
    name: '信用卡/借记卡',
    description: '支持Visa, Mastercard, 银联等',
    icon: <CreditCard className="h-8 w-8 text-purple-600" />,
    badges: ['国际支付'],
    processingTime: '1-3分钟',
    logoUrl: '/credit-cards.png'
  }
];

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  onConfirm: () => void;
  onBack?: () => void;
  className?: string;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onMethodChange,
  onConfirm,
  onBack,
  className
}) => {
  return (
    <div className={cn('bg-white rounded-lg shadow-sm p-6', className)}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">选择支付方式</h3>
        <p className="text-sm text-gray-600">
          所有支付方式都经过加密保护，确保您的交易安全
        </p>
      </div>

      {/* Security Badge */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          <span className="text-sm text-green-800 font-medium">
            SSL加密保护 · PCI DSS认证 · 支付安全保障
          </span>
        </div>
      </div>

      {/* Payment Methods Grid */}
      <div className="grid gap-4 mb-6">
        {paymentMethods.map((method, index) => (
          <motion.div
            key={method.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onMethodChange(method.id)}
            className={cn(
              'relative border-2 rounded-lg p-4 cursor-pointer transition-all',
              selectedMethod === method.id
                ? 'border-purple-600 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            {/* Selected Indicator */}
            {selectedMethod === method.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-4 right-4"
              >
                <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              </motion.div>
            )}

            {/* Popular Badge */}
            {method.popular && (
              <div className="absolute top-0 left-4 -translate-y-1/2">
                <span className="bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs font-bold px-2 py-1 rounded">
                  推荐
                </span>
              </div>
            )}

            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex-shrink-0">
                {method.icon}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">{method.name}</h4>
                  {/* Badges */}
                  {method.badges?.map((badge, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        'text-xs px-2 py-0.5 rounded',
                        badge === '推荐'
                          ? 'bg-purple-100 text-purple-700'
                          : badge === '即时到账'
                          ? 'bg-green-100 text-green-700'
                          : badge === '国际支付'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      )}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mb-2">{method.description}</p>

                {/* Processing Time */}
                {method.processingTime && (
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>处理时间: {method.processingTime}</span>
                  </div>
                )}
              </div>

              {/* Logo Placeholder */}
              {method.logoUrl && (
                <div className="flex-shrink-0">
                  <div className="w-16 h-10 bg-gray-100 rounded flex items-center justify-center">
                    <span className="text-xs text-gray-400">Logo</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Additional Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-2">
          <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">支持的货币</p>
            <p>人民币 (CNY) · 美元 (USD) · 自动汇率转换</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            上一步
          </button>
        )}
        <button
          onClick={onConfirm}
          disabled={!selectedMethod}
          className={cn(
            'flex-1 py-3 px-4 rounded-lg font-medium transition-colors',
            selectedMethod
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          继续
        </button>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;