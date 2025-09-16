import React from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentOrder, formatPrice } from '@/lib/payment-utils';

interface BillingHistoryProps {
  orders: PaymentOrder[];
  className?: string;
}

export const BillingHistory: React.FC<BillingHistoryProps> = ({
  orders,
  className
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      completed: '支付成功',
      failed: '支付失败',
      processing: '处理中',
      pending: '待支付',
      refunded: '已退款'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'processing':
        return 'text-yellow-600 bg-yellow-50';
      case 'refunded':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getPlanName = (plan: string) => {
    const planMap: Record<string, string> = {
      basic: '基础版',
      premium: '高级版',
      super: '超级版'
    };
    return planMap[plan] || plan;
  };

  const getPaymentMethodName = (method: string) => {
    const methodMap: Record<string, string> = {
      alipay: '支付宝',
      wechat: '微信支付',
      credit_card: '信用卡'
    };
    return methodMap[method] || method;
  };

  // Mock data if no orders
  const displayOrders = orders.length > 0 ? orders : [
    {
      id: 'ORD2024011501',
      userId: 'user123',
      plan: 'premium' as any,
      billingCycle: 'monthly' as any,
      amount: 99,
      currency: 'CNY',
      paymentMethod: 'alipay' as any,
      status: 'completed' as any,
      createdAt: new Date('2024-01-15'),
      expiresAt: new Date('2024-02-15'),
      completedAt: new Date('2024-01-15')
    },
    {
      id: 'ORD2023121501',
      userId: 'user123',
      plan: 'basic' as any,
      billingCycle: 'monthly' as any,
      amount: 29,
      currency: 'CNY',
      paymentMethod: 'wechat' as any,
      status: 'completed' as any,
      createdAt: new Date('2023-12-15'),
      expiresAt: new Date('2024-01-15'),
      completedAt: new Date('2023-12-15')
    }
  ];

  if (displayOrders.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">暂无账单记录</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {displayOrders.map((order, index) => (
        <motion.div
          key={order.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {getStatusIcon(order.status)}
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">
                    {getPlanName(order.plan)} - {order.billingCycle === 'monthly' ? '月付' : '年付'}
                  </p>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded',
                    getStatusColor(order.status)
                  )}>
                    {getStatusText(order.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  订单号: {order.id}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">
                {formatPrice(order.amount, order.currency)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {getPaymentMethodName(order.paymentMethod)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <p className="text-gray-500">
              {order.completedAt
                ? new Date(order.completedAt).toLocaleDateString('zh-CN')
                : new Date(order.createdAt).toLocaleDateString('zh-CN')}
            </p>
            {order.status === 'completed' && (
              <button className="flex items-center gap-1 text-purple-600 hover:text-purple-700 transition-colors">
                <Download className="h-3 w-3" />
                <span>下载发票</span>
              </button>
            )}
          </div>
        </motion.div>
      ))}

      {/* Load More */}
      {displayOrders.length >= 10 && (
        <button className="w-full py-2 text-sm text-purple-600 hover:text-purple-700 transition-colors">
          加载更多
        </button>
      )}
    </div>
  );
};

export default BillingHistory;