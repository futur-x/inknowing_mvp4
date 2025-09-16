// Register Page - InKnowing MVP 4.0
// Business Logic Conservation: Anonymous → Registered → Authenticated State Transition

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RegisterForm } from '@/components/forms/register-form';
import { useAuthStore } from '@/stores/auth';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Register Form */}
        <RegisterForm />

        {/* Security Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-blue-900">安全承诺</h3>
                <p className="text-xs text-blue-700 leading-relaxed">
                  我们采用银行级安全加密技术保护您的个人信息，绝不向第三方泄露您的隐私数据。
                  您的密码经过不可逆加密存储，我们无法获取您的明文密码。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
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