'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface AuthProviderProps {
  children: ReactNode;
}

// 不需要認證的路由
const publicRoutes = ['/login', '/'];

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isAuthenticated,
    isLoading,
    checkAuth,
    handleSessionTimeout,
    handleSessionWarning,
    updateLastActivity,
  } = useAuthStore();

  // 檢查認證狀態
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 路由保護 - 等待認證檢查完成後再執行
  useEffect(() => {
    // 如果還在載入中，不執行路由保護邏輯
    if (isLoading) return;

    const isPublicRoute = publicRoutes.includes(pathname);

    if (!isAuthenticated && !isPublicRoute) {
      // 未登入且訪問受保護路由，重導向到登入頁
      router.push('/login');
    } else if (isAuthenticated && pathname === '/login') {
      // 已登入但在登入頁，重導向到專案選擇頁
      router.push('/project-selection');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Session 監控
  useEffect(() => {
    if (!isAuthenticated) return;

    // 處理 session 警告
    handleSessionWarning(remaining => {
      console.log(`Session 將在 ${remaining} 分鐘後過期`);
      // TODO: 顯示警告 Modal
    });

    // 處理 session timeout
    handleSessionTimeout(() => {
      console.log('Session 已過期，請重新登入');
      // TODO: 顯示過期提示
    });

    // 監聽使用者活動
    const activityEvents = [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];
    const handleActivity = () => {
      updateLastActivity();
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [
    isAuthenticated,
    handleSessionWarning,
    handleSessionTimeout,
    updateLastActivity,
  ]);

  return <>{children}</>;
}
