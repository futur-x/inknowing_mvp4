import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Smartphone, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PaymentMethod,
  validateCreditCard,
  validateCVV,
  validateExpiry,
  formatCreditCard,
  TEST_CARDS
} from '@/lib/payment-utils';

interface PaymentFormProps {
  paymentMethod: PaymentMethod;
  onSubmit: (paymentDetails: any) => void;
  onBack?: () => void;
  onChange?: (details: any) => void;
  isLoading?: boolean;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  paymentMethod,
  onSubmit,
  onBack,
  onChange,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    // Credit Card Fields
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',

    // Billing Address
    email: '',
    country: 'CN',
    postalCode: '',

    // Agreement
    agreeToTerms: false,
    savePaymentMethod: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Notify parent of changes
  useEffect(() => {
    onChange?.(formData);
  }, [formData, onChange]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    let processedValue = value;

    // Format credit card number
    if (name === 'cardNumber') {
      processedValue = formatCreditCard(value.replace(/\s/g, '').slice(0, 16));
    }

    // Format expiry date
    if (name === 'expiryDate') {
      processedValue = value
        .replace(/\D/g, '')
        .slice(0, 4)
        .replace(/(\d{2})(\d)/, '$1/$2');
    }

    // Format CVV
    if (name === 'cvv') {
      processedValue = value.replace(/\D/g, '').slice(0, 4);
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue
    }));

    // Clear error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle blur for validation
  const handleBlur = (fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    validateField(fieldName);
  };

  // Field validation
  const validateField = (fieldName: string): boolean => {
    let error = '';

    switch (fieldName) {
      case 'cardNumber':
        if (paymentMethod === 'credit_card') {
          if (!formData.cardNumber) {
            error = '请输入卡号';
          } else if (!validateCreditCard(formData.cardNumber)) {
            error = '卡号无效';
          }
        }
        break;

      case 'cardName':
        if (paymentMethod === 'credit_card' && !formData.cardName) {
          error = '请输入持卡人姓名';
        }
        break;

      case 'expiryDate':
        if (paymentMethod === 'credit_card') {
          if (!formData.expiryDate) {
            error = '请输入有效期';
          } else if (!validateExpiry(formData.expiryDate)) {
            error = '有效期无效或已过期';
          }
        }
        break;

      case 'cvv':
        if (paymentMethod === 'credit_card') {
          if (!formData.cvv) {
            error = '请输入CVV';
          } else if (!validateCVV(formData.cvv)) {
            error = 'CVV无效';
          }
        }
        break;

      case 'email':
        if (!formData.email) {
          error = '请输入邮箱';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          error = '邮箱格式无效';
        }
        break;

      case 'agreeToTerms':
        if (!formData.agreeToTerms) {
          error = '请同意服务条款';
        }
        break;
    }

    setErrors(prev => ({ ...prev, [fieldName]: error }));
    return !error;
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const fieldsToValidate = ['email', 'agreeToTerms'];

    if (paymentMethod === 'credit_card') {
      fieldsToValidate.push('cardNumber', 'cardName', 'expiryDate', 'cvv');
    }

    const validations = fieldsToValidate.map(field => validateField(field));
    return validations.every(valid => valid);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    } else {
      // Mark all fields as touched to show errors
      const newTouched: Record<string, boolean> = {};
      Object.keys(formData).forEach(key => {
        newTouched[key] = true;
      });
      setTouched(newTouched);
    }
  };

  // Render credit card form
  const renderCreditCardForm = () => (
    <>
      {/* Test Card Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 mb-2">测试卡号</p>
            <div className="space-y-1 text-blue-700">
              <p>成功: {TEST_CARDS.success}</p>
              <p>拒绝: {TEST_CARDS.decline}</p>
              <p>余额不足: {TEST_CARDS.insufficientFunds}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card Number */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          卡号
        </label>
        <div className="relative">
          <input
            type="text"
            name="cardNumber"
            value={formData.cardNumber}
            onChange={handleChange}
            onBlur={() => handleBlur('cardNumber')}
            placeholder="1234 5678 9012 3456"
            className={cn(
              'w-full px-3 py-2 border rounded-lg pl-10',
              errors.cardNumber && touched.cardNumber
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-purple-500'
            )}
          />
          <CreditCard className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        </div>
        {errors.cardNumber && touched.cardNumber && (
          <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>
        )}
      </div>

      {/* Cardholder Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          持卡人姓名
        </label>
        <input
          type="text"
          name="cardName"
          value={formData.cardName}
          onChange={handleChange}
          onBlur={() => handleBlur('cardName')}
          placeholder="ZHANG SAN"
          className={cn(
            'w-full px-3 py-2 border rounded-lg',
            errors.cardName && touched.cardName
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:ring-purple-500'
          )}
        />
        {errors.cardName && touched.cardName && (
          <p className="text-red-500 text-xs mt-1">{errors.cardName}</p>
        )}
      </div>

      {/* Expiry and CVV */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            有效期
          </label>
          <input
            type="text"
            name="expiryDate"
            value={formData.expiryDate}
            onChange={handleChange}
            onBlur={() => handleBlur('expiryDate')}
            placeholder="MM/YY"
            className={cn(
              'w-full px-3 py-2 border rounded-lg',
              errors.expiryDate && touched.expiryDate
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-purple-500'
            )}
          />
          {errors.expiryDate && touched.expiryDate && (
            <p className="text-red-500 text-xs mt-1">{errors.expiryDate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CVV
          </label>
          <input
            type="text"
            name="cvv"
            value={formData.cvv}
            onChange={handleChange}
            onBlur={() => handleBlur('cvv')}
            placeholder="123"
            className={cn(
              'w-full px-3 py-2 border rounded-lg',
              errors.cvv && touched.cvv
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-purple-500'
            )}
          />
          {errors.cvv && touched.cvv && (
            <p className="text-red-500 text-xs mt-1">{errors.cvv}</p>
          )}
        </div>
      </div>
    </>
  );

  // Render QR payment form (Alipay/WeChat)
  const renderQRPaymentForm = () => (
    <div className="bg-gray-50 rounded-lg p-6 text-center">
      <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {paymentMethod === 'alipay' ? '支付宝' : '微信'}扫码支付
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        点击"确认支付"后，将显示支付二维码
      </p>
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8">
        <p className="text-gray-400">二维码将在此显示</p>
      </div>
      <p className="text-xs text-gray-500 mt-4">
        支付完成后，系统将自动确认并升级您的会员
      </p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">支付信息</h3>

      {/* Payment Method Specific Form */}
      {paymentMethod === 'credit_card' ? renderCreditCardForm() : renderQRPaymentForm()}

      {/* Email */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          邮箱地址
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={() => handleBlur('email')}
          placeholder="your@email.com"
          className={cn(
            'w-full px-3 py-2 border rounded-lg',
            errors.email && touched.email
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:ring-purple-500'
          )}
        />
        {errors.email && touched.email && (
          <p className="text-red-500 text-xs mt-1">{errors.email}</p>
        )}
      </div>

      {/* Billing Country */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          账单地区
        </label>
        <select
          name="country"
          value={formData.country}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500"
        >
          <option value="CN">中国大陆</option>
          <option value="HK">中国香港</option>
          <option value="TW">中国台湾</option>
          <option value="US">美国</option>
          <option value="JP">日本</option>
          <option value="SG">新加坡</option>
        </select>
      </div>

      {/* Terms and Save Payment */}
      <div className="space-y-3 mb-6">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="savePaymentMethod"
            checked={formData.savePaymentMethod}
            onChange={handleChange}
            className="mt-1"
          />
          <span className="text-sm text-gray-600">
            保存此支付方式以便下次使用
          </span>
        </label>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="agreeToTerms"
            checked={formData.agreeToTerms}
            onChange={handleChange}
            onBlur={() => handleBlur('agreeToTerms')}
            className="mt-1"
          />
          <span className="text-sm text-gray-600">
            我已阅读并同意
            <a href="#" className="text-purple-600 hover:underline mx-1">
              服务条款
            </a>
            和
            <a href="#" className="text-purple-600 hover:underline mx-1">
              隐私政策
            </a>
          </span>
        </label>
        {errors.agreeToTerms && touched.agreeToTerms && (
          <p className="text-red-500 text-xs">{errors.agreeToTerms}</p>
        )}
      </div>

      {/* Action Buttons */}
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
          type="submit"
          disabled={isLoading}
          className={cn(
            'flex-1 py-3 px-4 rounded-lg font-medium transition-all',
            isLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          )}
        >
          {isLoading ? '处理中...' : '确认支付'}
        </button>
      </div>
    </form>
  );
};

export default PaymentForm;