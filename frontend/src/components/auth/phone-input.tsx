'use client';

import { useState, useEffect, ChangeEvent, FocusEvent } from 'react';
import { cn } from '@/lib/utils';
import { Phone, AlertCircle } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  onValidate?: (isValid: boolean) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  showIcon?: boolean;
  countryCode?: string;
  autoFormat?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  onBlur,
  onValidate,
  placeholder = '请输入手机号',
  error,
  disabled = false,
  required = false,
  className,
  showIcon = true,
  countryCode = '+86',
  autoFormat = true
}: PhoneInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [formattedValue, setFormattedValue] = useState('');

  // Chinese mobile phone regex pattern
  const phoneRegex = /^1[3-9]\d{9}$/;

  useEffect(() => {
    // Format phone number for display
    if (autoFormat && value) {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length <= 3) {
        setFormattedValue(cleaned);
      } else if (cleaned.length <= 7) {
        setFormattedValue(`${cleaned.slice(0, 3)} ${cleaned.slice(3)}`);
      } else {
        setFormattedValue(
          `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7, 11)}`
        );
      }
    } else {
      setFormattedValue(value);
    }

    // Validate phone number
    if (value) {
      const cleaned = value.replace(/\D/g, '');
      const valid = phoneRegex.test(cleaned);
      setIsValid(valid);
      onValidate?.(valid);
    } else {
      setIsValid(true);
      onValidate?.(true);
    }
  }, [value, autoFormat, onValidate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Remove all non-digit characters
    const cleaned = inputValue.replace(/\D/g, '');

    // Limit to 11 digits for Chinese phone numbers
    if (cleaned.length <= 11) {
      onChange(cleaned);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        {showIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{countryCode}</span>
          </div>
        )}

        <input
          type="tel"
          inputMode="numeric"
          value={formattedValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn(
            'w-full px-3 py-2 border rounded-lg transition-all',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            {
              'pl-20': showIcon,
              'border-gray-300 focus:border-primary focus:ring-primary': !error && isValid,
              'border-red-500 focus:border-red-500 focus:ring-red-500': error || (!isValid && value),
              'bg-gray-50 cursor-not-allowed': disabled,
              'bg-white': !disabled
            }
          )}
          aria-invalid={!isValid || !!error}
          aria-describedby={error ? 'phone-error' : undefined}
        />

        {!isValid && value && (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
        )}
      </div>

      {(error || (!isValid && value)) && (
        <p id="phone-error" className="mt-1 text-sm text-red-600">
          {error || '请输入有效的手机号码'}
        </p>
      )}

      {isFocused && !error && (
        <p className="mt-1 text-xs text-gray-500">
          请输入11位中国大陆手机号码
        </p>
      )}
    </div>
  );
}

interface PhoneVerificationInputProps extends Omit<PhoneInputProps, 'onChange'> {
  onSendCode: (phone: string) => Promise<void>;
  cooldown?: number;
  buttonText?: string;
  sendingText?: string;
  countdownText?: (seconds: number) => string;
  onChange?: (phone: string) => void;
}

export function PhoneVerificationInput({
  value,
  onChange,
  onSendCode,
  cooldown = 60,
  buttonText = '获取验证码',
  sendingText = '发送中...',
  countdownText = (seconds) => `${seconds}秒后重试`,
  ...phoneInputProps
}: PhoneVerificationInputProps) {
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [phoneError, setPhoneError] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(false);

  const phoneRegex = /^1[3-9]\d{9}$/;

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  const handlePhoneValidate = (valid: boolean) => {
    setIsPhoneValid(valid);
    if (!valid && value) {
      setPhoneError('请输入有效的手机号码');
    } else {
      setPhoneError('');
    }
  };

  const handleSendCode = async () => {
    const cleaned = value.replace(/\D/g, '');

    if (!phoneRegex.test(cleaned)) {
      setPhoneError('请输入有效的手机号码');
      return;
    }

    if (isSending || countdown > 0) return;

    setIsSending(true);
    setPhoneError('');

    try {
      await onSendCode(cleaned);
      setCountdown(cooldown);
    } catch (error) {
      console.error('Failed to send verification code:', error);
      setPhoneError('发送验证码失败，请稍后重试');
    } finally {
      setIsSending(false);
    }
  };

  const canSendCode = isPhoneValid && !isSending && countdown === 0;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <PhoneInput
            {...phoneInputProps}
            value={value}
            onChange={(phone) => onChange?.(phone)}
            onValidate={handlePhoneValidate}
            error={phoneError}
          />
        </div>

        <button
          type="button"
          onClick={handleSendCode}
          disabled={!canSendCode}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            {
              'bg-primary text-white hover:bg-primary-dark focus:ring-primary': canSendCode,
              'bg-gray-100 text-gray-400 cursor-not-allowed': !canSendCode
            }
          )}
        >
          {isSending ? sendingText : countdown > 0 ? countdownText(countdown) : buttonText}
        </button>
      </div>
    </div>
  );
}

// Utility function to validate Chinese phone number
export function validateChinesePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return /^1[3-9]\d{9}$/.test(cleaned);
}

// Utility function to format phone number
export function formatPhoneNumber(phone: string, hideMiddle = false): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length !== 11) return phone;

  if (hideMiddle) {
    return `${cleaned.slice(0, 3)}****${cleaned.slice(7)}`;
  }

  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
}