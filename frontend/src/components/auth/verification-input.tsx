'use client';

import { useState, useEffect, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { cn } from '@/lib/utils';

interface VerificationInputProps {
  length?: number;
  onComplete: (code: string) => void;
  onChange?: (code: string) => void;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function VerificationInput({
  length = 6,
  onComplete,
  onChange,
  error = false,
  disabled = false,
  autoFocus = true,
  className
}: VerificationInputProps) {
  const [values, setValues] = useState<string[]>(new Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, value: string) => {
    // Only accept numeric input
    const numericValue = value.replace(/[^0-9]/g, '');

    if (numericValue.length > 1) {
      // Handle paste scenario
      const pastedValues = numericValue.slice(0, length).split('');
      const newValues = [...values];

      pastedValues.forEach((val, i) => {
        if (index + i < length) {
          newValues[index + i] = val;
        }
      });

      setValues(newValues);

      // Focus the next empty input or the last one
      const nextEmptyIndex = newValues.findIndex((val, i) => i >= index && val === '');
      const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : Math.min(index + pastedValues.length, length - 1);

      if (inputRefs.current[focusIndex]) {
        inputRefs.current[focusIndex]?.focus();
      }

      const code = newValues.join('');
      onChange?.(code);

      if (code.length === length && !code.includes('')) {
        onComplete(code);
      }
    } else if (numericValue.length === 1) {
      const newValues = [...values];
      newValues[index] = numericValue;
      setValues(newValues);

      // Auto-focus next input
      if (index < length - 1 && inputRefs.current[index + 1]) {
        inputRefs.current[index + 1]?.focus();
      }

      const code = newValues.join('');
      onChange?.(code);

      if (code.length === length && !code.includes('')) {
        onComplete(code);
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!values[index] && index > 0) {
        // Move to previous input when backspace on empty field
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current field
        const newValues = [...values];
        newValues[index] = '';
        setValues(newValues);
        onChange?.(newValues.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    inputRefs.current[index]?.select();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain');
    const numericValue = pastedData.replace(/[^0-9]/g, '').slice(0, length);

    if (numericValue) {
      const newValues = numericValue.split('').concat(new Array(length - numericValue.length).fill(''));
      setValues(newValues);

      // Focus the last filled input or the next empty one
      const lastFilledIndex = newValues.findIndex(val => val === '') - 1;
      const focusIndex = lastFilledIndex >= 0 ? lastFilledIndex : length - 1;

      if (inputRefs.current[focusIndex]) {
        inputRefs.current[focusIndex]?.focus();
      }

      const code = newValues.join('');
      onChange?.(code);

      if (code.length === length && !code.includes('')) {
        onComplete(code);
      }
    }
  };

  return (
    <div className={cn('flex gap-2', className)}>
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={() => handleFocus(index)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            'w-12 h-12 text-center text-lg font-semibold rounded-lg border-2 transition-all',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            {
              'border-gray-300 focus:border-primary focus:ring-primary': !error,
              'border-red-500 focus:border-red-500 focus:ring-red-500': error,
              'bg-gray-50 cursor-not-allowed': disabled,
              'bg-white': !disabled
            }
          )}
          aria-label={`Verification code digit ${index + 1}`}
        />
      ))}
    </div>
  );
}

interface VerificationCodeWithTimerProps extends VerificationInputProps {
  phoneNumber?: string;
  onResend: () => Promise<void>;
  initialCountdown?: number;
}

export function VerificationCodeWithTimer({
  phoneNumber,
  onResend,
  initialCountdown = 60,
  ...inputProps
}: VerificationCodeWithTimerProps) {
  const [countdown, setCountdown] = useState(initialCountdown);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  const handleResend = async () => {
    if (!canResend || isResending) return;

    setIsResending(true);
    try {
      await onResend();
      setCountdown(initialCountdown);
      setCanResend(false);
    } catch (error) {
      console.error('Failed to resend code:', error);
    } finally {
      setIsResending(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3');
  };

  return (
    <div className="space-y-4">
      {phoneNumber && (
        <p className="text-sm text-gray-600">
          验证码已发送至 <span className="font-medium">{formatPhoneNumber(phoneNumber)}</span>
        </p>
      )}

      <VerificationInput {...inputProps} />

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {countdown > 0 ? (
            <>重新发送 ({countdown}s)</>
          ) : (
            <button
              onClick={handleResend}
              disabled={isResending || !canResend}
              className="text-primary hover:text-primary-dark disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isResending ? '发送中...' : '重新发送验证码'}
            </button>
          )}
        </span>
      </div>
    </div>
  );
}