"use client"

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Project } from '@/types/project'
import { ProjectCard } from './ProjectCard'
import { AlertCircle, Loader2 } from 'lucide-react'

/**
 * Props for ProjectGrid component
 */
interface ProjectGridProps {
  /** 專案列表資料 */
  projects: Project[]
  /** 載入中狀態 */
  loading?: boolean
  /** 進入專案事件處理 */
  onProjectEnter?: (projectId: string) => void | Promise<void>
  /** 存取記錄事件處理 */
  onAccessRecord?: (projectId: string) => void | Promise<void>
  /** 自定義類別名稱 */
  className?: string
  /** 緊湊模式 */
  compact?: boolean
  /** 錯誤狀態 */
  error?: string | null
  /** 重試函數 */
  onRetry?: () => void
}

/**
 * 載入中骨架元件
 */
const ProjectCardSkeleton = React.memo(() => (
  <div className="bg-card border border-border rounded-lg p-6 space-y-4 animate-pulse">
    {/* Header skeleton */}
    <div className="flex items-center justify-between">
      <div className="h-5 w-16 bg-muted rounded" />
      <div className="h-5 w-12 bg-muted rounded" />
    </div>
    
    {/* Title skeleton */}
    <div className="space-y-2">
      <div className="h-6 w-3/4 bg-muted rounded" />
      <div className="h-4 w-full bg-muted rounded" />
      <div className="h-4 w-2/3 bg-muted rounded" />
    </div>
    
    {/* Progress skeleton */}
    <div className="space-y-2">
      <div className="flex justify-between">
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="h-4 w-8 bg-muted rounded" />
      </div>
      <div className="h-2 w-full bg-muted rounded" />
    </div>
    
    {/* Info skeleton */}
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 bg-muted rounded" />
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-4 w-16 bg-muted rounded ml-auto" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 bg-muted rounded" />
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-4 w-20 bg-muted rounded ml-auto" />
      </div>
    </div>
    
    {/* Button skeleton */}
    <div className="h-10 w-full bg-muted rounded" />
  </div>
))

ProjectCardSkeleton.displayName = 'ProjectCardSkeleton'

/**
 * 空狀態元件
 */
const EmptyState = React.memo<{ onRetry?: () => void }>(({ onRetry }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
      <AlertCircle className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">
      沒有找到專案
    </h3>
    <p className="text-sm text-muted-foreground mb-4 max-w-md">
      目前沒有符合條件的專案資料。請檢查篩選條件或稍後再試。
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
      >
        重新整理
      </button>
    )}
  </div>
))

EmptyState.displayName = 'EmptyState'

/**
 * 錯誤狀態元件
 */
const ErrorState = React.memo<{ error: string; onRetry?: () => void }>(({ 
  error, 
  onRetry 
}) => (
  <div className="col-span-full">
    <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-destructive font-medium">
          {error}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium text-destructive hover:text-destructive/80 underline hover:no-underline transition-colors"
        >
          重試
        </button>
      )}
    </div>
  </div>
))

ErrorState.displayName = 'ErrorState'

/**
 * ProjectGrid 元件
 * 
 * 響應式專案網格顯示元件，支援以下功能：
 * - 響應式網格佈局（行動版1欄，平板2欄，桌面3-4欄）
 * - 載入狀態顯示
 * - 空狀態處理
 * - 錯誤狀態處理
 * - 緊湊模式支援
 * - 無障礙訪問支援
 * 
 * 響應式斷點：
 * - Mobile (< 768px): 1 column
 * - Tablet (768px - 1024px): 2 columns
 * - Desktop (1024px - 1280px): 3 columns
 * - Large Desktop (>= 1280px): 4 columns
 */
export const ProjectGrid = React.memo<ProjectGridProps>(({
  projects,
  loading = false,
  onProjectEnter,
  onAccessRecord,
  className,
  compact = false,
  error = null,
  onRetry
}) => {
  // 計算骨架元件數量
  const skeletonCount = React.useMemo(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth
      if (width >= 1280) return 8  // xl: 4 columns * 2 rows
      if (width >= 1024) return 6  // lg: 3 columns * 2 rows
      if (width >= 768) return 4   // md: 2 columns * 2 rows
      return 3                     // sm: 1 column * 3 rows
    }
    return 6 // 預設值
  }, [])

  // 處理鍵盤導航
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    // 支援方向鍵導航
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      // 這裡可以實作格子間的鍵盤導航邏輯
      // 目前交由個別 ProjectCard 處理
    }
  }, [])

  return (
    <div
      className={cn(
        "project-grid w-full",
        className
      )}
      role="grid"
      aria-label="專案網格"
      onKeyDown={handleKeyDown}
    >
      {/* 錯誤狀態 */}
      {error && (
        <div className={cn(
          "grid gap-6 mb-6",
          "grid-cols-1"
        )}>
          <ErrorState error={error} onRetry={onRetry} />
        </div>
      )}

      {/* 主要網格內容 */}
      <div
        className={cn(
          "grid gap-6",
          // 響應式網格系統
          "grid-cols-1",           // Mobile: 1 column
          "md:grid-cols-2",        // Tablet: 2 columns
          "lg:grid-cols-3",        // Desktop: 3 columns
          "xl:grid-cols-4",        // Large desktop: 4 columns
          // 緊湊模式調整
          compact && [
            "gap-4",
            "sm:grid-cols-2",      // 緊湊模式下更早啟用2欄
            "md:grid-cols-3",      // 平板提前到3欄
            "lg:grid-cols-4",      // 桌面4欄
            "xl:grid-cols-5"       // 大桌面5欄
          ]
        )}
        role="presentation"
      >
        {/* 載入中狀態 */}
        {loading && (
          Array.from({ length: skeletonCount }, (_, index) => (
            <ProjectCardSkeleton key={`skeleton-${index}`} />
          ))
        )}

        {/* 專案卡片列表 */}
        {!loading && !error && projects.length > 0 && (
          projects.map((project) => (
            <div key={project.id} role="gridcell">
              <ProjectCard
                project={project}
                onProjectEnter={onProjectEnter}
                onAccessRecord={onAccessRecord}
                compact={compact}
                loading={loading}
              />
            </div>
          ))
        )}

        {/* 空狀態 */}
        {!loading && !error && projects.length === 0 && (
          <EmptyState onRetry={onRetry} />
        )}
      </div>

      {/* 載入中全局指示器（當有既有資料時顯示） */}
      {loading && projects.length > 0 && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">
            載入更多專案...
          </span>
        </div>
      )}
    </div>
  )
})

ProjectGrid.displayName = 'ProjectGrid'

export default ProjectGrid