'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PasswordStrength, PasswordMatchIndicator, validatePasswordStrength } from '@/components/auth/password-strength';
import { useAuthStore } from '@/stores/auth';
import { Loader2, Phone, Lock, MessageSquare, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface RegisterFormData {
  phone: string;
  nickname: string;
  password: string;
  confirmPassword: string;
  verificationCode: string;
  agreedToTerms: boolean;
}

export function RegisterForm() {
  const router = useRouter();
  const { register, sendVerificationCode, error, isLoading, clearError } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'phone' | 'wechat'>('phone');
  const [currentStep, setCurrentStep] = useState<'info' | 'verify'>('info');
  const [formData, setFormData] = useState<RegisterFormData>({
    phone: '',
    nickname: '',
    password: '',
    confirmPassword: '',
    verificationCode: '',
    agreedToTerms: false
  });

  const [validationErrors, setValidationErrors] = useState<Partial<RegisterFormData>>({});
  const [verificationSent, setVerificationSent] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    clearError();
  }, [clearError]);

  const validateForm = (): boolean => {
    const errors: Partial<RegisterFormData> = {};

    // Validate phone
    if (!formData.phone) {
      errors.phone = '请输入手机号';
    } else if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      errors.phone = '请输入有效的手机号';
    }

    // Validate nickname
    if (!formData.nickname) {
      errors.nickname = '请输入昵称';
    }

    // Validate password
    if (!formData.password) {
      errors.password = '请输入密码';
    } else {
      const passwordValidation = validatePasswordStrength(formData.password);
      if (!passwordValidation.isValid) {
        errors.password = '密码强度不足';
      }
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      errors.confirmPassword = '请确认密码';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致';
    }

    // Validate terms agreement
    if (!formData.agreedToTerms) {
      errors.agreedToTerms = '请同意服务条款';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendVerificationCode = async (phone: string) => {
    try {
      await sendVerificationCode(phone);
      setVerificationSent(true);
      setCurrentStep('verify');
      setSuccessMessage('验证码已发送到您的手机');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to send verification code:', error);
      throw error;
    }
  };

  const handlePhoneRegister = async () => {
    if (!validateForm()) return;

    if (currentStep === 'info') {
      // Move to verification step
      await handleSendVerificationCode(formData.phone);
    } else if (currentStep === 'verify') {
      // Complete registration
      if (!formData.verificationCode || formData.verificationCode.length !== 6) {
        setValidationErrors({ verificationCode: '请输入6位验证码' });
        return;
      }

      try {
        await register({
          type: 'phone',
          phone: formData.phone,
          code: formData.verificationCode,
          nickname: formData.nickname,
          password: formData.password
        });

        setSuccessMessage('注册成功！正在跳转...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } catch (error) {
        console.error('Registration failed:', error);
      }
    }
  };

  const handleWeChatRegister = async () => {
    // WeChat registration logic - requires WeChat SDK integration
    console.log('WeChat registration not yet implemented');
    setValidationErrors({ phone: '微信注册功能即将开放' });
  };

  const handleInputChange = (field: keyof RegisterFormData) => (value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    if (error) clearError();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">创建账号</CardTitle>
        <CardDescription className="text-center">
          加入InKnowing，开启您的阅读之旅
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'phone' | 'wechat')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="phone">
              <Phone className="mr-2 h-4 w-4" />
              手机号注册
            </TabsTrigger>
            <TabsTrigger value="wechat">
              <MessageSquare className="mr-2 h-4 w-4" />
              微信注册
            </TabsTrigger>
          </TabsList>

          <TabsContent value="phone" className="space-y-4 mt-4">
            {currentStep === 'info' ? (
              <>
                {/* Phone Input */}
                <div className="space-y-2">
                  <Label htmlFor="phone">手机号</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone')(e.target.value)}
                    disabled={isLoading}
                    placeholder="请输入手机号"
                    maxLength={11}
                    className={cn(
                      validationErrors.phone && "border-red-500 focus:border-red-500"
                    )}
                  />
                  {validationErrors.phone && (
                    <p className="text-sm text-red-600">{validationErrors.phone}</p>
                  )}
                </div>

                {/* Nickname Input */}
                <div className="space-y-2">
                  <Label htmlFor="nickname">昵称</Label>
                  <Input
                    id="nickname"
                    name="nickname"
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => handleInputChange('nickname')(e.target.value)}
                    disabled={isLoading}
                    placeholder="请输入昵称"
                    className={cn(
                      validationErrors.nickname && "border-red-500 focus:border-red-500"
                    )}
                  />
                  {validationErrors.nickname && (
                    <p className="text-sm text-red-600">{validationErrors.nickname}</p>
                  )}
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password')(e.target.value)}
                    disabled={isLoading}
                    placeholder="设置密码"
                    className={cn(
                      validationErrors.password && "border-red-500 focus:border-red-500"
                    )}
                  />
                  {formData.password && (
                    <PasswordStrength password={formData.password} />
                  )}
                  {validationErrors.password && (
                    <p className="text-sm text-red-600">{validationErrors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">确认密码</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword')(e.target.value)}
                    disabled={isLoading}
                    placeholder="再次输入密码"
                    className={cn(
                      validationErrors.confirmPassword && "border-red-500 focus:border-red-500"
                    )}
                  />
                  {formData.confirmPassword && (
                    <PasswordMatchIndicator
                      password={formData.password}
                      confirmPassword={formData.confirmPassword}
                    />
                  )}
                  {validationErrors.confirmPassword && (
                    <p className="text-sm text-red-600">{validationErrors.confirmPassword}</p>
                  )}
                </div>

                {/* Terms and Conditions */}
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.agreedToTerms}
                    onCheckedChange={(checked) => handleInputChange('agreedToTerms')(checked as boolean)}
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor="terms"
                    className="text-sm leading-relaxed cursor-pointer"
                  >
                    我已阅读并同意
                    <Link href="/terms" className="text-primary hover:underline ml-1">
                      服务条款
                    </Link>
                    和
                    <Link href="/privacy" className="text-primary hover:underline ml-1">
                      隐私政策
                    </Link>
                  </Label>
                </div>
                {validationErrors.agreedToTerms && (
                  <p className="text-sm text-red-600">{validationErrors.agreedToTerms}</p>
                )}
              </>
            ) : (
              /* Verification Step */
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600">
                    验证码已发送至
                  </p>
                  <p className="font-medium">{formData.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">输入验证码</Label>
                  <Input
                    id="code"
                    name="code"
                    type="text"
                    value={formData.verificationCode}
                    onChange={(e) => handleInputChange('verificationCode')(e.target.value)}
                    disabled={isLoading}
                    placeholder="请输入6位验证码"
                    maxLength={6}
                    className={cn(
                      validationErrors.verificationCode && "border-red-500 focus:border-red-500"
                    )}
                  />
                  {validationErrors.verificationCode && (
                    <p className="text-sm text-red-600">{validationErrors.verificationCode}</p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep('info')}
                  disabled={isLoading}
                  className="w-full"
                >
                  返回上一步
                </Button>
              </div>
            )}

            <Button
              onClick={handlePhoneRegister}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : currentStep === 'info' ? (
                <>
                  下一步
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                '完成注册'
              )}
            </Button>
          </TabsContent>

          <TabsContent value="wechat" className="space-y-4 mt-4">
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">微信注册功能即将开放</p>
              <p className="text-sm text-gray-500 mt-2">敬请期待</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-center text-gray-600">
          已有账号？
          <Link href="/auth/login" className="text-primary hover:underline ml-1">
            立即登录
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}