// Verify Page - InKnowing MVP 4.0
// Business Logic Conservation: Phone/Email Verification Flow

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VerificationCodeWithTimer } from '@/components/auth/verification-input';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { Loader2, CheckCircle2, AlertCircle, Phone, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();

  const [verificationType, setVerificationType] = useState<'phone' | 'email'>('phone');
  const [contact, setContact] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Get verification details from URL params
  useEffect(() => {
    const type = searchParams.get('type') as 'phone' | 'email';
    const contactParam = searchParams.get('contact');

    if (type && contactParam) {
      setVerificationType(type);
      setContact(contactParam);
    } else if (!isAuthenticated) {
      // Redirect to register if no verification params
      router.replace('/auth/register');
    }
  }, [searchParams, isAuthenticated, router]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !searchParams.get('change')) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router, searchParams]);

  const handleVerification = async (code: string) => {
    setIsVerifying(true);
    setError('');

    try {
      // Call verification API
      const response = await api.post('/auth/verify', {
        type: verificationType,
        contact,
        code
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          if (searchParams.get('redirect')) {
            router.push(searchParams.get('redirect') as string);
          } else {
            router.push('/dashboard');
          }
        }, 2000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '验证失败，请重试';
      setError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setError('');

    try {
      if (verificationType === 'phone') {
        await api.auth.sendVerificationCode({ phone: contact });
      } else {
        // Email verification endpoint if needed
        await api.post('/auth/send-email-verification', { email: contact });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发送验证码失败';
      setError(errorMessage);
      throw err; // Let the component handle the error
    }
  };

  const formatContact = () => {
    if (verificationType === 'phone') {
      return contact.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    } else {
      const [username, domain] = contact.split('@');
      if (username.length > 3) {
        return `${username.slice(0, 3)}****@${domain}`;
      }
      return `****@${domain}`;
    }
  };

  if (!contact) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-600">加载验证信息...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              {verificationType === 'phone' ? (
                <Phone className="w-8 h-8 text-blue-600" />
              ) : (
                <Mail className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold">
              验证您的{verificationType === 'phone' ? '手机号' : '邮箱'}
            </CardTitle>
            <CardDescription>
              验证码已发送至 <span className="font-medium text-gray-900">{formatContact()}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {success ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  验证成功！正在跳转...
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <VerificationCodeWithTimer
                  phoneNumber={verificationType === 'phone' ? contact : undefined}
                  onComplete={handleVerification}
                  onChange={setVerificationCode}
                  onResend={handleResendCode}
                  disabled={isVerifying}
                  error={!!error}
                />

                <div className="space-y-3">
                  <Button
                    onClick={() => handleVerification(verificationCode)}
                    disabled={isVerifying || verificationCode.length !== 6}
                    className="w-full"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        验证中...
                      </>
                    ) : (
                      '确认验证'
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => router.back()}
                    className="w-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    返回上一步
                  </Button>
                </div>

                <div className="text-center text-sm text-gray-600">
                  <p>没有收到验证码？</p>
                  <p className="mt-1">
                    请检查您的{verificationType === 'phone' ? '手机短信' : '邮箱收件箱'}
                    {verificationType === 'email' && '（包括垃圾邮件文件夹）'}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
