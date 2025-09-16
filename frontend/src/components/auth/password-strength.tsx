'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
  className?: string;
}

interface PasswordRequirement {
  label: string;
  regex: RegExp;
  met: boolean;
}

export function PasswordStrength({
  password,
  showRequirements = true,
  className
}: PasswordStrengthProps) {
  const [strength, setStrength] = useState(0);
  const [requirements, setRequirements] = useState<PasswordRequirement[]>([]);

  useEffect(() => {
    const calculateStrength = () => {
      let score = 0;
      const checks: PasswordRequirement[] = [
        {
          label: '至少8个字符',
          regex: /.{8,}/,
          met: false
        },
        {
          label: '包含大写字母',
          regex: /[A-Z]/,
          met: false
        },
        {
          label: '包含小写字母',
          regex: /[a-z]/,
          met: false
        },
        {
          label: '包含数字',
          regex: /[0-9]/,
          met: false
        },
        {
          label: '包含特殊字符',
          regex: /[!@#$%^&*(),.?":{}|<>]/,
          met: false
        }
      ];

      checks.forEach(check => {
        if (check.regex.test(password)) {
          check.met = true;
          score++;
        }
      });

      // Additional strength bonus for longer passwords
      if (password.length >= 12) score++;
      if (password.length >= 16) score++;

      setRequirements(checks);
      setStrength(Math.min(score, 5)); // Cap at 5 for display purposes
    };

    calculateStrength();
  }, [password]);

  const getStrengthLabel = () => {
    if (!password) return '';
    if (strength <= 1) return '弱';
    if (strength <= 2) return '一般';
    if (strength <= 3) return '中等';
    if (strength <= 4) return '强';
    return '非常强';
  };

  const getStrengthColor = () => {
    if (!password) return 'bg-gray-200';
    if (strength <= 1) return 'bg-red-500';
    if (strength <= 2) return 'bg-orange-500';
    if (strength <= 3) return 'bg-yellow-500';
    if (strength <= 4) return 'bg-green-500';
    return 'bg-green-600';
  };

  const getTextColor = () => {
    if (!password) return 'text-gray-500';
    if (strength <= 1) return 'text-red-600';
    if (strength <= 2) return 'text-orange-600';
    if (strength <= 3) return 'text-yellow-600';
    if (strength <= 4) return 'text-green-600';
    return 'text-green-700';
  };

  if (!password) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">密码强度</span>
          <span className={cn('text-sm font-medium', getTextColor())}>
            {getStrengthLabel()}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300',
              getStrengthColor()
            )}
            style={{
              width: `${(strength / 5) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="space-y-1">
          {requirements.map((req, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center gap-2 text-sm transition-colors',
                req.met ? 'text-green-600' : 'text-gray-500'
              )}
            >
              {req.met ? (
                <Check className="w-4 h-4" />
              ) : (
                <X className="w-4 h-4" />
              )}
              <span>{req.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface PasswordMatchIndicatorProps {
  password: string;
  confirmPassword: string;
  className?: string;
}

export function PasswordMatchIndicator({
  password,
  confirmPassword,
  className
}: PasswordMatchIndicatorProps) {
  if (!confirmPassword) return null;

  const isMatch = password === confirmPassword;

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm',
        isMatch ? 'text-green-600' : 'text-red-600',
        className
      )}
    >
      {isMatch ? (
        <>
          <Check className="w-4 h-4" />
          <span>密码匹配</span>
        </>
      ) : (
        <>
          <X className="w-4 h-4" />
          <span>密码不匹配</span>
        </>
      )}
    </div>
  );
}

// Utility function to validate password strength
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  missingRequirements: string[];
} {
  const requirements = [
    { label: '至少8个字符', regex: /.{8,}/ },
    { label: '包含大写字母', regex: /[A-Z]/ },
    { label: '包含小写字母', regex: /[a-z]/ },
    { label: '包含数字', regex: /[0-9]/ },
    { label: '包含特殊字符', regex: /[!@#$%^&*(),.?":{}|<>]/ }
  ];

  let score = 0;
  const missingRequirements: string[] = [];

  requirements.forEach(req => {
    if (req.regex.test(password)) {
      score++;
    } else {
      missingRequirements.push(req.label);
    }
  });

  // Minimum requirements: at least 8 chars and 3 other requirements met
  const isValid = password.length >= 8 && score >= 3;

  return {
    isValid,
    score,
    missingRequirements
  };
}