'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shield, Lock, CreditCard } from 'lucide-react';
import { useUserStore } from '@/stores/user';
import { useMembership } from '@/hooks/use-membership';
import { CheckoutSteps } from '@/components/membership/checkout-steps';
import { PaymentForm } from '@/components/membership/payment-form';
import { PaymentMethodSelector } from '@/components/membership/payment-method-selector';
import { OrderSummary } from '@/components/membership/order-summary';
import { toast } from 'react-hot-toast';
import {
  MembershipTier,
  BillingCycle,
  PaymentMethod,
  PRICING
} from '@/lib/payment-utils';

const checkoutSteps = [
  { id: 'plan', title: '选择计划', description: '确认会员等级' },
  { id: 'payment', title: '支付方式', description: '选择支付方式' },
  { id: 'confirm', title: '确认订单', description: '确认并支付' }
];

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile: userInfo } = useUserStore();
  const {
    initiateMembershipUpgrade,
    processCurrentPayment,
    cancelCurrentOrder,
    isLoading,
    currentOrder,
    paymentSession
  } = useMembership({
    onUpgradeSuccess: () => {
      router.push('/membership/success');
    },
    onUpgradeError: (error) => {
      toast.error(error);
    }
  });

  // Parse URL params
  const planParam = searchParams.get('plan') as MembershipTier;
  const cycleParam = searchParams.get('cycle') as BillingCycle;

  // Checkout state
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MembershipTier>(planParam || 'basic');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(cycleParam || 'monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('alipay');
  const [paymentDetails, setPaymentDetails] = useState<any>({});

  // Calculate pricing
  const planInfo = PRICING[selectedPlan];
  const price = billingCycle === 'monthly' ? planInfo.monthly : planInfo.yearly;
  const originalPrice = billingCycle === 'yearly' ? planInfo.monthly * 12 : price;
  const discount = originalPrice - price;

  // Handle step navigation
  const goToStep = (step: number) => {
    if (step >= 0 && step < checkoutSteps.length) {
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    if (currentStep < checkoutSteps.length - 1) {
      setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle plan confirmation
  const handlePlanConfirm = () => {
    if (!selectedPlan || selectedPlan === 'free') {
      toast.error('请选择一个付费计划');
      return;
    }
    nextStep();
  };

  // Handle payment method selection
  const handlePaymentMethodConfirm = () => {
    if (!paymentMethod) {
      toast.error('请选择支付方式');
      return;
    }
    nextStep();
  };

  // Handle order confirmation and payment
  const handleOrderConfirm = async () => {
    if (!userInfo) {
      toast.error('请先登录');
      router.push('/auth/login');
      return;
    }

    // Create order if not exists
    if (!currentOrder) {
      const result = await initiateMembershipUpgrade(
        selectedPlan,
        billingCycle,
        paymentMethod
      );

      if (!result) {
        return;
      }
    }

    // Process payment
    if (paymentSession) {
      await processCurrentPayment(paymentDetails);
    }
  };

  // Handle cancel
  const handleCancel = async () => {
    if (currentOrder) {
      await cancelCurrentOrder();
    }
    router.push('/membership');
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Plan Selection
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">确认您的会员计划</h3>

              {/* Plan Details */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xl font-bold text-purple-900">
                    {selectedPlan === 'basic' && '基础版'}
                    {selectedPlan === 'premium' && '高级版'}
                    {selectedPlan === 'super' && '超级版'}
                  </h4>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-900">
                      ¥{price}
                    </div>
                    <div className="text-sm text-purple-700">
                      /{billingCycle === 'monthly' ? '月' : '年'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing Cycle Toggle */}
              <div className="flex items-center gap-4 mb-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="billing"
                    value="monthly"
                    checked={billingCycle === 'monthly'}
                    onChange={() => setBillingCycle('monthly')}
                    className="mr-2"
                  />
                  <span>月付</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="billing"
                    value="yearly"
                    checked={billingCycle === 'yearly'}
                    onChange={() => setBillingCycle('yearly')}
                    className="mr-2"
                  />
                  <span>年付</span>
                  {discount > 0 && (
                    <span className="ml-2 text-sm text-green-600 font-semibold">
                      省¥{discount}
                    </span>
                  )}
                </label>
              </div>

              <button
                onClick={handlePlanConfirm}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                继续选择支付方式
              </button>
            </div>
          </motion.div>
        );

      case 1: // Payment Method
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onMethodChange={setPaymentMethod}
              onConfirm={handlePaymentMethodConfirm}
              onBack={prevStep}
            />
          </motion.div>
        );

      case 2: // Confirmation & Payment
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid md:grid-cols-2 gap-8"
          >
            {/* Payment Form */}
            <div>
              <PaymentForm
                paymentMethod={paymentMethod}
                onSubmit={handleOrderConfirm}
                onBack={prevStep}
                onChange={setPaymentDetails}
                isLoading={isLoading}
              />
            </div>

            {/* Order Summary */}
            <div>
              <OrderSummary
                plan={selectedPlan}
                billingCycle={billingCycle}
                paymentMethod={paymentMethod}
                price={price}
                originalPrice={originalPrice}
                discount={discount}
              />
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            返回会员计划
          </button>

          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">升级会员</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Shield className="h-4 w-4" />
              <span>安全支付</span>
              <Lock className="h-4 w-4 ml-2" />
              <span>SSL加密</span>
            </div>
          </div>
        </div>

        {/* Checkout Steps */}
        <div className="mb-8">
          <CheckoutSteps
            steps={checkoutSteps}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={goToStep}
            allowNavigation={true}
          />
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {renderStepContent()}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <AuthGuard redirectTo="/auth/login?redirect=/membership/checkout">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      }>
        <CheckoutContent />
      </Suspense>
    </AuthGuard>
  );
}