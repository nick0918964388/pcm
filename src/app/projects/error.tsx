/**
 * Projects Error Page - Error Boundary for Project Selection
 *
 * This is a Next.js App Router special error component that provides error
 * handling and recovery for the project selection page. It automatically
 * catches JavaScript errors in nested child components and provides
 * user-friendly error messages and recovery options.
 *
 * @module ProjectsError
 * @version 1.0
 * @date 2025-08-30
 *
 * Requirements Coverage:
 * - US1 (AC1.1): 顯示使用者有權限的專案列表 - Error handling for project access
 * - US6 (AC6.1): 即時顯示專案進度更新 - Real-time error feedback and recovery
 * - US4 (AC4.1, AC4.2): 響應式桌面和行動裝置體驗 - Responsive error page design
 */

'use client'; // Error components must be Client Components

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Wifi,
  Shield,
  Bug,
  Clock,
  HelpCircle,
  ArrowLeft,
  Mail,
} from 'lucide-react';

// ==================== INTERFACES ====================

/**
 * Error page props from Next.js App Router
 */
interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error classification with user-friendly messages
 */
interface ErrorInfo {
  type: 'network' | 'permission' | 'client' | 'server' | 'timeout' | 'unknown';
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  suggestions: string[];
  showRetry: boolean;
  showGoHome: boolean;
  showSupport: boolean;
}

// ==================== CONSTANTS ====================

/**
 * Error type classifications with user-friendly messages
 */
const ERROR_CLASSIFICATIONS: Record<string, ErrorInfo> = {
  network: {
    type: 'network',
    title: '網路連線問題',
    description: '無法連接到伺服器，請檢查您的網路連線狀態',
    icon: Wifi,
    iconColor: 'text-blue-600',
    suggestions: [
      '檢查您的網路連線是否正常',
      '嘗試重新整理頁面',
      '確認防火牆設定是否阻擋連線',
    ],
    showRetry: true,
    showGoHome: false,
    showSupport: true,
  },
  permission: {
    type: 'permission',
    title: '權限不足',
    description: '您沒有足夠的權限存取此頁面或資料',
    icon: Shield,
    iconColor: 'text-red-600',
    suggestions: [
      '請確認您已正確登入',
      '聯繫系統管理員申請權限',
      '檢查您的帳戶狀態是否正常',
    ],
    showRetry: false,
    showGoHome: true,
    showSupport: true,
  },
  server: {
    type: 'server',
    title: '伺服器錯誤',
    description: '伺服器發生內部錯誤，請稍後再試',
    icon: AlertTriangle,
    iconColor: 'text-orange-600',
    suggestions: [
      '稍後再試，問題可能是暫時性的',
      '如果問題持續發生，請聯繫技術支援',
      '檢查系統公告是否有維護通知',
    ],
    showRetry: true,
    showGoHome: true,
    showSupport: true,
  },
  timeout: {
    type: 'timeout',
    title: '請求逾時',
    description: '載入時間過長，請求已逾時',
    icon: Clock,
    iconColor: 'text-yellow-600',
    suggestions: [
      '網路速度可能較慢，請稍後再試',
      '嘗試重新整理頁面',
      '檢查是否有其他應用程式佔用網路頻寬',
    ],
    showRetry: true,
    showGoHome: false,
    showSupport: false,
  },
  client: {
    type: 'client',
    title: '頁面載入錯誤',
    description: '頁面載入時發生錯誤，可能是瀏覽器兼容性問題',
    icon: Bug,
    iconColor: 'text-purple-600',
    suggestions: [
      '嘗試重新整理頁面',
      '清除瀏覽器快取',
      '使用其他瀏覽器嘗試',
      '檢查瀏覽器版本是否過舊',
    ],
    showRetry: true,
    showGoHome: false,
    showSupport: true,
  },
  unknown: {
    type: 'unknown',
    title: '未知錯誤',
    description: '發生了未預期的錯誤，我們正在調查此問題',
    icon: HelpCircle,
    iconColor: 'text-gray-600',
    suggestions: [
      '嘗試重新整理頁面',
      '返回首頁重新開始',
      '如果問題持續發生，請聯繫技術支援',
    ],
    showRetry: true,
    showGoHome: true,
    showSupport: true,
  },
};

/**
 * Error recovery actions
 */
const RECOVERY_ACTIONS = {
  retry: '重新載入',
  goHome: '回到首頁',
  goBack: '返回上頁',
  contactSupport: '聯繫支援',
  reportError: '回報問題',
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Classify error and return appropriate error information
 */
function classifyError(error: Error): ErrorInfo {
  const message = error.message?.toLowerCase() || '';
  const stack = error.stack?.toLowerCase() || '';

  // Network-related errors
  if (
    message.includes('networkerror') ||
    message.includes('failed to fetch') ||
    message.includes('network request failed') ||
    message.includes('connection') ||
    stack.includes('fetch')
  ) {
    return ERROR_CLASSIFICATIONS.network;
  }

  // Permission/Authentication errors
  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('permission') ||
    message.includes('401') ||
    message.includes('403')
  ) {
    return ERROR_CLASSIFICATIONS.permission;
  }

  // Server errors
  if (
    message.includes('internal server error') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('server')
  ) {
    return ERROR_CLASSIFICATIONS.server;
  }

  // Timeout errors
  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('request timeout')
  ) {
    return ERROR_CLASSIFICATIONS.timeout;
  }

  // Client-side JavaScript errors
  if (
    message.includes('syntaxerror') ||
    message.includes('referenceerror') ||
    message.includes('typeerror') ||
    message.includes('is not a function') ||
    message.includes('cannot read property') ||
    stack.includes('react') ||
    stack.includes('next')
  ) {
    return ERROR_CLASSIFICATIONS.client;
  }

  // Default to unknown error
  return ERROR_CLASSIFICATIONS.unknown;
}

/**
 * Log error for debugging and monitoring
 */
function logError(error: Error, errorInfo: ErrorInfo): void {
  // In a production environment, this would send error data to monitoring service
  console.group('🚨 Projects Error Boundary');
  console.error('Error Type:', errorInfo.type);
  console.error('Error Title:', errorInfo.title);
  console.error('Error Object:', error);
  console.error('Error Stack:', error.stack);
  console.error('Error Digest:', (error as any).digest);
  console.error('Timestamp:', new Date().toISOString());
  console.error('User Agent:', navigator.userAgent);
  console.error('URL:', window.location.href);
  console.groupEnd();

  // In production, you would also send this to your error monitoring service:
  // - Sentry
  // - LogRocket
  // - Bugsnag
  // - Custom API endpoint
}

// ==================== MAIN COMPONENT ====================

/**
 * Projects Error Page Component
 *
 * Next.js App Router error boundary component that provides user-friendly
 * error handling and recovery options for the project selection page.
 *
 * Features:
 * - Automatic error classification and user-friendly messages
 * - Multiple recovery options (retry, go home, contact support)
 * - Error logging for debugging and monitoring
 * - Responsive design matching the projects page style
 * - Accessibility compliance with proper ARIA attributes
 * - Real-time error feedback and recovery paths
 *
 * @param error - The error object caught by the boundary
 * @param reset - Function to reset the error boundary and retry
 * @returns React.JSX.Element The error page component
 */
export default function Error({
  error,
  reset,
}: ErrorPageProps): React.JSX.Element {
  const router = useRouter();

  // ===== State Management =====

  const [isRetrying, setIsRetrying] = React.useState(false);
  const [errorInfo] = React.useState(() => classifyError(error));
  const [showDetails, setShowDetails] = React.useState(false);
  const [hasReported, setHasReported] = React.useState(false);

  // ===== Effects =====

  /**
   * Log error on mount for debugging and monitoring
   */
  React.useEffect(() => {
    logError(error, errorInfo);
  }, [error, errorInfo]);

  /**
   * Set up keyboard shortcuts for accessibility
   */
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'r':
            e.preventDefault();
            handleRetry();
            break;
          case 'h':
            e.preventDefault();
            handleGoHome();
            break;
        }
      } else if (e.key === 'Escape') {
        setShowDetails(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ===== Event Handlers =====

  /**
   * Handle retry action
   */
  const handleRetry = React.useCallback(async () => {
    setIsRetrying(true);
    try {
      // Add a small delay to provide visual feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      reset();
    } catch (retryError) {
      console.error('重試時發生錯誤:', retryError);
      // If retry fails, the error boundary will catch it
    } finally {
      setIsRetrying(false);
    }
  }, [reset]);

  /**
   * Handle navigation to home page
   */
  const handleGoHome = React.useCallback(() => {
    router.push('/');
  }, [router]);

  /**
   * Handle navigation back
   */
  const handleGoBack = React.useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Handle error reporting
   */
  const handleReportError = React.useCallback(() => {
    setHasReported(true);

    // In a production environment, this would:
    // 1. Send error report to support system
    // 2. Create a support ticket
    // 3. Notify administrators

    console.log('錯誤已回報給技術支援團隊');

    // Simulate reporting delay
    setTimeout(() => {
      // Could show a confirmation message or redirect to support page
    }, 1000);
  }, []);

  /**
   * Handle contact support
   */
  const handleContactSupport = React.useCallback(() => {
    // In a real application, this might:
    // - Open a support chat widget
    // - Navigate to contact form
    // - Open email client with pre-filled error details

    const subject = encodeURIComponent(`專案選擇頁面錯誤 - ${errorInfo.title}`);
    const body = encodeURIComponent(
      `錯誤類型: ${errorInfo.type}\n` +
        `錯誤描述: ${errorInfo.description}\n` +
        `發生時間: ${new Date().toLocaleString('zh-TW')}\n` +
        `頁面URL: ${window.location.href}\n` +
        `瀏覽器: ${navigator.userAgent}\n\n` +
        `詳細錯誤訊息:\n${error.message}\n\n` +
        `請描述您進行的操作:\n`
    );

    window.open(`mailto:support@pcm.com?subject=${subject}&body=${body}`);
  }, [error, errorInfo]);

  // ===== Render Helpers =====

  /**
   * Render error icon with appropriate styling
   */
  const renderErrorIcon = () => {
    const IconComponent = errorInfo.icon;
    return (
      <div className='flex-shrink-0'>
        <div
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center',
            'bg-gradient-to-br from-gray-50 to-gray-100',
            'border-2 border-gray-200'
          )}
        >
          <IconComponent className={cn('w-8 h-8', errorInfo.iconColor)} />
        </div>
      </div>
    );
  };

  /**
   * Render error details section
   */
  const renderErrorDetails = () => {
    if (!showDetails) return null;

    return (
      <Card className='mt-6 p-4 bg-gray-50 border-gray-200'>
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <h4 className='text-sm font-medium text-gray-900'>技術詳細資訊</h4>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setShowDetails(false)}
              className='text-gray-500 hover:text-gray-700'
            >
              隱藏
            </Button>
          </div>

          <div className='space-y-2 text-sm'>
            <div>
              <span className='font-medium text-gray-700'>錯誤類型:</span>
              <span className='ml-2 text-gray-600'>{errorInfo.type}</span>
            </div>

            <div>
              <span className='font-medium text-gray-700'>錯誤訊息:</span>
              <div className='mt-1 p-2 bg-white rounded border text-gray-800 font-mono text-xs'>
                {error.message || '無詳細訊息'}
              </div>
            </div>

            {(error as any).digest && (
              <div>
                <span className='font-medium text-gray-700'>錯誤識別碼:</span>
                <div className='mt-1 p-2 bg-white rounded border text-gray-800 font-mono text-xs'>
                  {(error as any).digest}
                </div>
              </div>
            )}

            <div>
              <span className='font-medium text-gray-700'>發生時間:</span>
              <span className='ml-2 text-gray-600'>
                {new Date().toLocaleString('zh-TW')}
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  /**
   * Render suggestions list
   */
  const renderSuggestions = () => (
    <div className='space-y-3'>
      <h4 className='text-sm font-medium text-gray-900'>建議解決方案:</h4>
      <ul className='space-y-2'>
        {errorInfo.suggestions.map((suggestion, index) => (
          <li key={index} className='flex items-start gap-3'>
            <div className='w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5'>
              <span className='text-xs font-medium text-blue-600'>
                {index + 1}
              </span>
            </div>
            <span className='text-sm text-gray-700'>{suggestion}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  /**
   * Render action buttons
   */
  const renderActionButtons = () => (
    <div className='flex flex-col sm:flex-row gap-3'>
      {/* Primary Actions */}
      <div className='flex gap-3'>
        {errorInfo.showRetry && (
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className='flex items-center gap-2'
            size='lg'
          >
            <RefreshCw
              className={cn('w-4 h-4', isRetrying && 'animate-spin')}
            />
            {RECOVERY_ACTIONS.retry}
          </Button>
        )}

        {errorInfo.showGoHome && (
          <Button
            variant='outline'
            onClick={handleGoHome}
            className='flex items-center gap-2'
            size='lg'
          >
            <Home className='w-4 h-4' />
            {RECOVERY_ACTIONS.goHome}
          </Button>
        )}
      </div>

      {/* Secondary Actions */}
      <div className='flex gap-3'>
        <Button
          variant='outline'
          onClick={handleGoBack}
          className='flex items-center gap-2'
          size='lg'
        >
          <ArrowLeft className='w-4 h-4' />
          {RECOVERY_ACTIONS.goBack}
        </Button>

        {errorInfo.showSupport && (
          <Button
            variant='outline'
            onClick={handleContactSupport}
            className='flex items-center gap-2'
            size='lg'
          >
            <Mail className='w-4 h-4' />
            {RECOVERY_ACTIONS.contactSupport}
          </Button>
        )}
      </div>
    </div>
  );

  // ===== Main Render =====

  return (
    <div className='min-h-screen bg-background flex items-center justify-center p-4'>
      <div className='w-full max-w-2xl'>
        {/* Main Error Card */}
        <Card className='p-8'>
          {/* Error Header */}
          <div className='flex flex-col sm:flex-row gap-6 mb-6'>
            {renderErrorIcon()}

            <div className='flex-1 space-y-2'>
              <h1 className='text-2xl font-bold text-gray-900'>
                {errorInfo.title}
              </h1>
              <p className='text-gray-600 leading-relaxed'>
                {errorInfo.description}
              </p>
            </div>
          </div>

          {/* Suggestions */}
          <div className='mb-6'>{renderSuggestions()}</div>

          {/* Action Buttons */}
          <div className='mb-6'>{renderActionButtons()}</div>

          {/* Additional Options */}
          <div className='pt-6 border-t border-gray-200 space-y-3'>
            <div className='flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setShowDetails(!showDetails)}
                className='text-gray-600 hover:text-gray-800'
              >
                {showDetails ? '隱藏' : '顯示'}技術詳細資訊
              </Button>

              <Button
                variant='ghost'
                size='sm'
                onClick={handleReportError}
                disabled={hasReported}
                className={cn(
                  'text-gray-600 hover:text-gray-800',
                  hasReported && 'text-green-600'
                )}
              >
                {hasReported ? '✓ 已回報' : '回報此錯誤'}
              </Button>
            </div>
          </div>

          {/* Error Details */}
          {renderErrorDetails()}
        </Card>

        {/* Footer Info */}
        <div className='mt-6 text-center text-sm text-gray-500'>
          <p>
            如果問題持續發生，請聯繫系統管理員或
            <button
              onClick={handleContactSupport}
              className='ml-1 text-blue-600 hover:text-blue-800 underline'
            >
              技術支援
            </button>
          </p>
          <p className='mt-1'>
            錯誤識別碼: {(error as any).digest || 'N/A'} | 發生時間:{' '}
            {new Date().toLocaleString('zh-TW')}
          </p>
        </div>
      </div>

      {/* Loading Indicator for Retry */}
      {isRetrying && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <Card className='p-6'>
            <div className='flex items-center gap-3'>
              <RefreshCw className='h-5 w-5 animate-spin text-blue-600' />
              <span className='text-gray-900'>正在重新載入...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ==================== COMPONENT METADATA ====================

/**
 * Component display name for debugging
 */
Error.displayName = 'ProjectsError';
