import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckoutStep {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

interface CheckoutStepsProps {
  steps: CheckoutStep[];
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (stepIndex: number) => void;
  allowNavigation?: boolean;
  className?: string;
}

export const CheckoutSteps: React.FC<CheckoutStepsProps> = ({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  allowNavigation = false,
  className
}) => {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const canNavigateToStep = (stepIndex: number) => {
    if (!allowNavigation) return false;

    // Can navigate to completed steps or the next step after last completed
    const maxCompletedStep = Math.max(...completedSteps, -1);
    return completedSteps.includes(stepIndex) || stepIndex <= maxCompletedStep + 1;
  };

  const getStepStatus = (stepIndex: number) => {
    if (completedSteps.includes(stepIndex)) return 'completed';
    if (stepIndex === currentStep) return 'current';
    if (stepIndex < currentStep) return 'visited';
    return 'upcoming';
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop View */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-600 to-purple-700"
              initial={{ width: '0%' }}
              animate={{
                width: `${(Math.max(...completedSteps, -1) + 1) / (steps.length - 1) * 100}%`
              }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </div>

          {/* Steps */}
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const isClickable = canNavigateToStep(index);

            return (
              <motion.div
                key={step.id}
                className="relative z-10 flex flex-col items-center"
                onHoverStart={() => setHoveredStep(index)}
                onHoverEnd={() => setHoveredStep(null)}
              >
                <button
                  onClick={() => isClickable && onStepClick?.(index)}
                  disabled={!isClickable}
                  className={cn(
                    'relative flex items-center justify-center transition-all',
                    isClickable && 'cursor-pointer',
                    !isClickable && 'cursor-not-allowed'
                  )}
                >
                  <motion.div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center font-semibold relative',
                      'transition-all duration-300 border-2',
                      status === 'completed' && 'bg-green-500 border-green-500 text-white',
                      status === 'current' && 'bg-purple-600 border-purple-600 text-white shadow-lg scale-110',
                      status === 'visited' && 'bg-white border-purple-300 text-purple-600',
                      status === 'upcoming' && 'bg-white border-gray-300 text-gray-400'
                    )}
                    whileHover={isClickable ? { scale: 1.1 } : {}}
                    whileTap={isClickable ? { scale: 0.95 } : {}}
                  >
                    {status === 'completed' ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <span>{index + 1}</span>
                    )}

                    {/* Lock icon for non-navigable steps */}
                    {!isClickable && status === 'upcoming' && (
                      <div className="absolute -top-1 -right-1 bg-gray-100 rounded-full p-0.5">
                        <Lock className="h-3 w-3 text-gray-400" />
                      </div>
                    )}

                    {/* Pulse animation for current step */}
                    {status === 'current' && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-purple-600"
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.5, 0, 0.5]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut'
                        }}
                      />
                    )}
                  </motion.div>
                </button>

                {/* Step Info */}
                <AnimatePresence>
                  {(hoveredStep === index || status === 'current') && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-16 whitespace-nowrap"
                    >
                      <div className={cn(
                        'px-3 py-2 rounded-lg shadow-lg',
                        status === 'current'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-900 text-white'
                      )}>
                        <p className="text-sm font-medium">{step.title}</p>
                        {step.description && (
                          <p className="text-xs opacity-75 mt-0.5">{step.description}</p>
                        )}
                      </div>
                      {/* Arrow */}
                      <div className={cn(
                        'w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent mx-auto',
                        status === 'current'
                          ? 'border-b-purple-600'
                          : 'border-b-gray-900'
                      )} style={{ marginTop: '-1px' }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        <div className="space-y-3">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const isClickable = canNavigateToStep(index);

            return (
              <motion.button
                key={step.id}
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg transition-all',
                  isClickable && 'cursor-pointer hover:bg-gray-50',
                  !isClickable && 'cursor-not-allowed opacity-50',
                  status === 'current' && 'bg-purple-50 border-2 border-purple-600',
                  status === 'completed' && 'bg-green-50',
                  status === 'visited' && 'bg-gray-50',
                  status === 'upcoming' && 'bg-white'
                )}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold',
                    status === 'completed' && 'bg-green-500 text-white',
                    status === 'current' && 'bg-purple-600 text-white',
                    status === 'visited' && 'bg-purple-200 text-purple-700',
                    status === 'upcoming' && 'bg-gray-200 text-gray-400'
                  )}
                >
                  {status === 'completed' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                <div className="flex-1 text-left">
                  <p className={cn(
                    'font-medium text-sm',
                    status === 'current' && 'text-purple-900',
                    status === 'completed' && 'text-green-900',
                    status === 'visited' && 'text-gray-700',
                    status === 'upcoming' && 'text-gray-400'
                  )}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className={cn(
                      'text-xs mt-0.5',
                      status === 'current' && 'text-purple-600',
                      status === 'completed' && 'text-green-600',
                      status === 'visited' && 'text-gray-500',
                      status === 'upcoming' && 'text-gray-400'
                    )}>
                      {step.description}
                    </p>
                  )}
                </div>

                {isClickable && status !== 'current' && (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}

                {!isClickable && status === 'upcoming' && (
                  <Lock className="h-4 w-4 text-gray-400" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Step Content Animation Wrapper */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="mt-8"
        />
      </AnimatePresence>
    </div>
  );
};

export default CheckoutSteps;