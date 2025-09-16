import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PlanFeature {
  text: string;
  included: boolean;
  highlighted?: boolean;
}

export interface PlanCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  period: string;
  features: PlanFeature[];
  icon?: React.ReactNode;
  color?: string;
  gradient?: string;
  popular?: boolean;
  current?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  buttonText?: string;
  quotaInfo?: string;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  id,
  name,
  description,
  price,
  originalPrice,
  currency,
  period,
  features,
  icon,
  color = 'text-gray-600',
  gradient = 'from-gray-100 to-gray-200',
  popular = false,
  current = false,
  disabled = false,
  onSelect,
  buttonText = '选择此计划',
  quotaInfo
}) => {
  const savings = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className={cn(
        'relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all',
        popular && 'ring-2 ring-purple-500 shadow-xl',
        current && 'ring-2 ring-green-500',
        !disabled && 'hover:shadow-2xl'
      )}
    >
      {/* Badges */}
      {popular && (
        <div className="absolute top-0 right-0 bg-purple-500 text-white px-3 py-1 text-xs font-bold rounded-bl-lg z-10">
          最受欢迎
        </div>
      )}
      {current && (
        <div className="absolute top-0 left-0 bg-green-500 text-white px-3 py-1 text-xs font-bold rounded-br-lg z-10">
          当前计划
        </div>
      )}

      {/* Header */}
      <div className={cn(
        'relative h-32 bg-gradient-to-br p-6',
        gradient
      )}>
        <div className="relative z-10">
          <div className={cn('flex items-center gap-2 mb-2', color)}>
            {icon}
            <h3 className="text-xl font-bold">{name}</h3>
          </div>
          <p className="text-sm text-gray-600">{description}</p>
        </div>

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id={`pattern-${id}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="currentColor" />
            </pattern>
            <rect width="100" height="100" fill={`url(#pattern-${id})`} />
          </svg>
        </div>
      </div>

      <div className="p-6">
        {/* Pricing */}
        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            {originalPrice && originalPrice > price && (
              <span className="text-lg text-gray-400 line-through">
                {currency}{originalPrice}
              </span>
            )}
            <span className="text-3xl font-bold text-gray-900">
              {currency}{price}
            </span>
            <span className="text-gray-500">/{period}</span>
          </div>

          {savings > 0 && (
            <div className="mt-1 inline-block">
              <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                节省 {savings}%
              </span>
            </div>
          )}

          {quotaInfo && (
            <div className="mt-3 text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2 rounded">
              {quotaInfo}
            </div>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-6">
          {features.map((feature, idx) => (
            <li
              key={idx}
              className={cn(
                'flex items-start gap-2 text-sm',
                feature.highlighted && 'font-semibold'
              )}
            >
              {feature.included ? (
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <X className="h-4 w-4 text-gray-300 mt-0.5 flex-shrink-0" />
              )}
              <span className={cn(
                feature.included ? 'text-gray-700' : 'text-gray-400'
              )}>
                {feature.text}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <button
          onClick={onSelect}
          disabled={disabled}
          className={cn(
            'w-full py-3 px-4 rounded-lg font-medium transition-all transform',
            disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : popular
              ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl hover:scale-105'
              : 'bg-gray-900 text-white hover:bg-gray-800 shadow hover:shadow-lg hover:scale-105'
          )}
        >
          {buttonText}
        </button>
      </div>
    </motion.div>
  );
};

export default PlanCard;