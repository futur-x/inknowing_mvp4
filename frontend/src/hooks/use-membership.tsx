import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/user';
import { toast } from 'react-hot-toast';
import {
  MembershipTier,
  BillingCycle,
  PaymentMethod,
  PaymentOrder,
  PaymentSession,
  calculatePrice,
  formatPrice
} from '@/lib/payment-utils';
import {
  createPaymentOrder,
  createPaymentSession,
  processPayment,
  getOrderStatus,
  verifyPayment,
  cancelPaymentOrder,
  getUserPaymentOrders
} from '@/lib/mock-payment-provider';

interface UseMembershipOptions {
  onUpgradeSuccess?: (tier: MembershipTier) => void;
  onUpgradeError?: (error: string) => void;
  onCancelSuccess?: () => void;
}

export function useMembership(options: UseMembershipOptions = {}) {
  const router = useRouter();
  const { profile: userInfo, setProfile: updateUserInfo, setMembership, setQuota } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [orderHistory, setOrderHistory] = useState<PaymentOrder[]>([]);

  // Get current membership info
  const currentTier = (userInfo?.membership_type || 'free') as MembershipTier;
  const userId = userInfo?.id || '';

  // Load order history
  const loadOrderHistory = useCallback(async () => {
    if (!userId) return;

    try {
      const orders = await getUserPaymentOrders(userId);
      setOrderHistory(orders);
    } catch (error) {
      console.error('Failed to load order history:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadOrderHistory();
  }, [loadOrderHistory]);

  // Check if user can upgrade to a specific tier
  const canUpgrade = useCallback((targetTier: MembershipTier): boolean => {
    if (targetTier === 'free') return false;
    if (currentTier === 'super') return false;

    const tierOrder = ['free', 'basic', 'premium', 'super'];
    const currentIndex = tierOrder.indexOf(currentTier);
    const targetIndex = tierOrder.indexOf(targetTier);

    return targetIndex > currentIndex;
  }, [currentTier]);

  // Check if user can downgrade to a specific tier
  const canDowngrade = useCallback((targetTier: MembershipTier): boolean => {
    if (currentTier === 'free') return false;
    if (targetTier === currentTier) return false;

    const tierOrder = ['free', 'basic', 'premium', 'super'];
    const currentIndex = tierOrder.indexOf(currentTier);
    const targetIndex = tierOrder.indexOf(targetTier);

    return targetIndex < currentIndex;
  }, [currentTier]);

  // Initiate membership upgrade
  const initiateMembershipUpgrade = useCallback(async (
    tier: MembershipTier,
    billingCycle: BillingCycle,
    paymentMethod: PaymentMethod
  ) => {
    if (!userId) {
      toast.error('请先登录');
      router.push('/auth/login');
      return null;
    }

    if (!canUpgrade(tier) && !canDowngrade(tier)) {
      toast.error('无法切换到该计划');
      return null;
    }

    setIsLoading(true);

    try {
      // Create payment order
      const order = await createPaymentOrder(userId, tier, billingCycle, paymentMethod);
      setCurrentOrder(order);

      // Create payment session
      const session = await createPaymentSession(order.id);
      setPaymentSession(session);

      toast.success('订单创建成功，正在跳转到支付页面...');

      return { order, session };
    } catch (error) {
      console.error('Failed to initiate upgrade:', error);
      toast.error('创建订单失败，请重试');
      options.onUpgradeError?.('创建订单失败');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId, canUpgrade, canDowngrade, router, options]);

  // Process payment for current order
  const processCurrentPayment = useCallback(async (paymentDetails?: any) => {
    if (!paymentSession) {
      toast.error('无有效的支付会话');
      return false;
    }

    setIsLoading(true);

    try {
      const result = await processPayment(paymentSession.sessionId, paymentDetails);

      if (result.success) {
        // Update user membership in store
        if (currentOrder) {
          updateUserInfo({
            ...userInfo!,
            membership_type: currentOrder.plan
          });
          setQuota({
            total: getMonthlyQuotaForTier(currentOrder.plan),
            used: 0,
            remaining: getMonthlyQuotaForTier(currentOrder.plan),
            reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          });
        }

        toast.success('支付成功！会员已升级');
        options.onUpgradeSuccess?.(currentOrder!.plan);

        // Clear current order and session
        setCurrentOrder(null);
        setPaymentSession(null);

        // Redirect to success page
        router.push(`/membership/success?orderId=${currentOrder?.id}`);

        return true;
      } else {
        toast.error(result.message || '支付失败');
        options.onUpgradeError?.(result.message || '支付失败');
        return false;
      }
    } catch (error) {
      console.error('Payment processing failed:', error);
      toast.error('支付处理失败，请重试');
      options.onUpgradeError?.('支付处理失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [paymentSession, currentOrder, updateUserInfo, router, options]);

  // Cancel current order
  const cancelCurrentOrder = useCallback(async () => {
    if (!currentOrder) return false;

    setIsLoading(true);

    try {
      const cancelled = await cancelPaymentOrder(currentOrder.id);

      if (cancelled) {
        toast.success('订单已取消');
        setCurrentOrder(null);
        setPaymentSession(null);
        options.onCancelSuccess?.();
        return true;
      } else {
        toast.error('无法取消订单');
        return false;
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
      toast.error('取消订单失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentOrder, options]);

  // Check order status
  const checkOrderStatus = useCallback(async (orderId: string) => {
    try {
      const order = await getOrderStatus(orderId);
      return order;
    } catch (error) {
      console.error('Failed to check order status:', error);
      return null;
    }
  }, []);

  // Verify payment completion
  const verifyPaymentCompletion = useCallback(async (orderId: string) => {
    try {
      const verified = await verifyPayment(orderId);

      if (verified) {
        const order = await getOrderStatus(orderId);
        if (order) {
          updateUserInfo({
            ...userInfo!,
            membership_type: order.plan
          });
          setQuota({
            total: getMonthlyQuotaForTier(order.plan),
            used: 0,
            remaining: getMonthlyQuotaForTier(order.plan),
            reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          });

          toast.success('支付验证成功，会员已升级');
          options.onUpgradeSuccess?.(order.plan);
        }
      }

      return verified;
    } catch (error) {
      console.error('Failed to verify payment:', error);
      return false;
    }
  }, [updateUserInfo, options]);

  // Calculate price for upgrade
  const calculateUpgradePrice = useCallback((
    targetTier: MembershipTier,
    billingCycle: BillingCycle
  ): { price: number; originalPrice: number; savings: number } => {
    const price = calculatePrice(targetTier, billingCycle);
    const originalPrice = billingCycle === 'yearly'
      ? calculatePrice(targetTier, 'monthly') * 12
      : price;
    const savings = originalPrice - price;

    return { price, originalPrice, savings };
  }, []);

  // Format membership name
  const formatMembershipName = useCallback((tier: MembershipTier): string => {
    const names: Record<MembershipTier, string> = {
      free: '免费版',
      basic: '基础版',
      premium: '高级版',
      super: '超级版'
    };
    return names[tier] || tier;
  }, []);

  return {
    // State
    currentTier,
    isLoading,
    currentOrder,
    paymentSession,
    orderHistory,

    // Actions
    initiateMembershipUpgrade,
    processCurrentPayment,
    cancelCurrentOrder,
    checkOrderStatus,
    verifyPaymentCompletion,
    loadOrderHistory,

    // Helpers
    canUpgrade,
    canDowngrade,
    calculateUpgradePrice,
    formatMembershipName,
    formatPrice
  };
}

// Helper functions
function getQuotaForTier(tier: MembershipTier): number {
  const quotas: Record<MembershipTier, number> = {
    free: 20,
    basic: 200,
    premium: 500,
    super: 1000
  };
  return quotas[tier] || 20;
}

function getMonthlyQuotaForTier(tier: MembershipTier): number {
  const quotas: Record<MembershipTier, number> = {
    free: 20 * 30, // Daily limit * 30
    basic: 200,
    premium: 500,
    super: 1000
  };
  return quotas[tier] || 600;
}