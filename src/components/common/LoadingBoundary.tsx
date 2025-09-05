import React, { Suspense, ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { DashboardSkeleton, ProjectGridSkeleton, CardSkeleton } from '@/components/ui/skeletons'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface LoadingBoundaryProps {
  /** 子組件 */
  children: ReactNode
  /** 載入骨架類型 */
  fallbackType?: 'dashboard' | 'project-grid' | 'card' | 'custom'
  /** 自訂載入組件 */
  customFallback?: ReactNode
  /** 是否顯示錯誤邊界 */
  withErrorBoundary?: boolean
  /** 載入訊息 */
  loadingMessage?: string
  /** 錯誤回調 */
  onError?: (error: Error, errorInfo: any) => void
}

/**
 * 錯誤回退組件
 */
function ErrorFallback({ 
  error, 
  resetErrorBoundary,
  message = "載入內容時發生錯誤" 
}: { 
  error: Error
  resetErrorBoundary: () => void
  message?: string
}) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          發生錯誤
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-red-700">{message}</p>
          <details className="text-xs text-red-600">
            <summary className="cursor-pointer">錯誤詳情</summary>
            <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
              {error.message}
            </pre>
          </details>
          <Button
            onClick={resetErrorBoundary}
            variant="outline"
            size="sm"
            className="text-red-700 border-red-300 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            重新載入
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 獲取載入回退組件
 */
function getLoadingFallback(type: string, customFallback?: ReactNode, message?: string) {
  if (customFallback) {
    return customFallback
  }

  const loadingIndicator = message ? (
    <div className="flex items-center justify-center p-4 text-sm text-gray-600">
      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
      {message}
    </div>
  ) : null

  switch (type) {
    case 'dashboard':
      return (
        <div>
          {loadingIndicator}
          <DashboardSkeleton />
        </div>
      )
    
    case 'project-grid':
      return (
        <div>
          {loadingIndicator}
          <ProjectGridSkeleton />
        </div>
      )
    
    case 'card':
      return (
        <div>
          {loadingIndicator}
          <CardSkeleton />
        </div>
      )
    
    default:
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-sm text-gray-600">
              {message || '載入中...'}
            </p>
          </div>
        </div>
      )
  }
}

/**
 * 載入邊界組件
 * 
 * 結合 Suspense 和 ErrorBoundary，提供統一的載入和錯誤處理
 */
export function LoadingBoundary({
  children,
  fallbackType = 'custom',
  customFallback,
  withErrorBoundary = true,
  loadingMessage,
  onError
}: LoadingBoundaryProps) {
  const loadingFallback = getLoadingFallback(fallbackType, customFallback, loadingMessage)
  
  const content = (
    <Suspense fallback={loadingFallback}>
      {children}
    </Suspense>
  )

  if (withErrorBoundary) {
    return (
      <ErrorBoundary
        FallbackComponent={({ error, resetErrorBoundary }) => (
          <ErrorFallback 
            error={error} 
            resetErrorBoundary={resetErrorBoundary}
            message="載入內容時發生錯誤，請稍後再試。"
          />
        )}
        onError={onError}
        onReset={() => window.location.reload()}
      >
        {content}
      </ErrorBoundary>
    )
  }

  return content
}

/**
 * Dashboard 載入邊界
 */
export function DashboardLoadingBoundary({ 
  children, 
  loadingMessage = "載入儀表板資料..." 
}: { 
  children: ReactNode
  loadingMessage?: string
}) {
  return (
    <LoadingBoundary 
      fallbackType="dashboard" 
      loadingMessage={loadingMessage}
      withErrorBoundary
    >
      {children}
    </LoadingBoundary>
  )
}

/**
 * 專案網格載入邊界
 */
export function ProjectGridLoadingBoundary({ 
  children, 
  loadingMessage = "載入專案資料..." 
}: { 
  children: ReactNode
  loadingMessage?: string
}) {
  return (
    <LoadingBoundary 
      fallbackType="project-grid" 
      loadingMessage={loadingMessage}
      withErrorBoundary
    >
      {children}
    </LoadingBoundary>
  )
}

/**
 * 卡片載入邊界
 */
export function CardLoadingBoundary({ 
  children, 
  loadingMessage = "載入資料..." 
}: { 
  children: ReactNode
  loadingMessage?: string
}) {
  return (
    <LoadingBoundary 
      fallbackType="card" 
      loadingMessage={loadingMessage}
      withErrorBoundary
    >
      {children}
    </LoadingBoundary>
  )
}