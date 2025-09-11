import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton, SkeletonText, SkeletonButton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ViewMode } from '@/types/project'

interface ProjectCardSkeletonProps {
  viewMode?: ViewMode
  showSelectButton?: boolean
  className?: string
}

/**
 * 專案卡片載入骨架
 * 支援網格和表格檢視模式
 */
export function ProjectCardSkeleton({ 
  viewMode = ViewMode.GRID,
  showSelectButton = false,
  className = '' 
}: ProjectCardSkeletonProps) {

  // 表格模式
  if (viewMode === ViewMode.TABLE) {
    return (
      <div className={cn("border-b border-gray-200 px-6 py-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex-shrink-0">
              <Skeleton className="w-10 h-10 rounded-lg" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-24" />
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right">
              <Skeleton className="h-3 w-8 mb-1" />
              <div className="flex items-center space-x-2">
                <Skeleton className="w-16 h-2 rounded-full" />
                <Skeleton className="h-3 w-8" />
              </div>
            </div>
            
            <div className="text-right">
              <Skeleton className="h-3 w-8 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
            
            <div className="text-right">
              <Skeleton className="h-3 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>

            {showSelectButton && (
              <SkeletonButton size="sm" className="w-16" />
            )}
          </div>
        </div>
      </div>
    )
  }

  // 網格模式
  return (
    <Card className={cn("p-6 min-h-[320px] flex flex-col border-l-4 border-l-gray-200", className)}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-20" />
          </div>
          
          {showSelectButton && (
            <SkeletonButton size="sm" className="w-16 ml-2 flex-shrink-0" />
          )}
        </div>
        
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* 描述 */}
      <div className="flex-1 mb-4">
        <SkeletonText lines={2} />
      </div>

      {/* 進度條 */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-8" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* 專案資訊 */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center">
          <Skeleton className="h-4 w-4 mr-2 flex-shrink-0" />
          <Skeleton className="h-4 w-24" />
        </div>
        
        <div className="flex items-center">
          <Skeleton className="h-4 w-4 mr-2 flex-shrink-0" />
          <Skeleton className="h-4 w-32" />
        </div>
        
        <div className="flex items-center">
          <Skeleton className="h-4 w-4 mr-2 flex-shrink-0" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      {/* 統計資訊 */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-200">
        <div className="flex flex-col items-center min-h-[60px] justify-between">
          <Skeleton className="h-4 w-4 mb-1" />
          <Skeleton className="h-3 w-8 mb-1" />
          <Skeleton className="h-4 w-16" />
        </div>
        
        <div className="flex flex-col items-center min-h-[60px] justify-between">
          <Skeleton className="h-4 w-4 mb-1" />
          <Skeleton className="h-3 w-12 mb-1" />
          <Skeleton className="h-4 w-8" />
        </div>
        
        <div className="flex flex-col items-center min-h-[60px] justify-between">
          <Skeleton className="h-4 w-4 mb-1" />
          <Skeleton className="h-3 w-12 mb-1" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </Card>
  )
}