'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, error, clearError } = useAuthStore();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // 如果已經登入，重導向到專案選擇頁
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/project-selection');
    }
  }, [isAuthenticated, router]);

  // 清除錯誤訊息
  useEffect(() => {
    if (error || validationError) {
      const timer = setTimeout(() => {
        clearError();
        setValidationError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, validationError, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 表單驗證
    if (!formData.username || !formData.password) {
      setValidationError('請輸入使用者名稱和密碼');
      return;
    }

    setIsLoading(true);
    setValidationError(null);

    try {
      const success = await login({
        username: formData.username,
        password: formData.password,
      });

      if (success) {
        // 登入成功，AuthProvider 會自動處理重導向
        router.push('/project-selection');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center px-4'>
      <div className='w-full max-w-md'>
        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-brand-primary mb-2'>
            工程關鍵指標平台
          </h1>
          <p className='text-gray-600'>PCM - Project Control Management</p>
        </div>

        <div className='bg-white p-8 rounded-lg shadow-lg'>
          {/* 錯誤訊息顯示 */}
          {(error || validationError) && (
            <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700'>
              <AlertCircle className='h-4 w-4 flex-shrink-0' />
              <span className='text-sm'>{error || validationError}</span>
            </div>
          )}

          {/* 登入提示 */}
          <div className='mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
            <p className='text-sm text-blue-700'>
              <strong>測試帳號:</strong> admin / password
            </p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-6'>
            <div>
              <label className='block text-gray-700 font-medium mb-2'>
                使用者名稱
              </label>
              <input
                type='text'
                value={formData.username}
                onChange={e =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className='w-full px-3 py-2 border border-gray-300 rounded focus:border-[#00645A] focus:outline-none focus:ring-2 focus:ring-[#00645A] focus:ring-opacity-20 transition-colors'
                placeholder='請輸入使用者名稱'
                disabled={isLoading}
              />
            </div>

            <div>
              <label className='block text-gray-700 font-medium mb-2'>
                密碼
              </label>
              <div className='relative'>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={e =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className='w-full px-3 py-2 pr-10 border border-gray-300 rounded focus:border-[#00645A] focus:outline-none focus:ring-2 focus:ring-[#00645A] focus:ring-opacity-20 transition-colors'
                  placeholder='請輸入密碼'
                  disabled={isLoading}
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600'
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className='h-4 w-4' />
                  ) : (
                    <Eye className='h-4 w-4' />
                  )}
                </button>
              </div>
            </div>

            <button
              type='submit'
              disabled={isLoading}
              className='w-full bg-[#00645A] text-white py-3 px-4 rounded font-medium hover:bg-[#00645A]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2'
            >
              {isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
              <span>{isLoading ? '登入中...' : '登入'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
