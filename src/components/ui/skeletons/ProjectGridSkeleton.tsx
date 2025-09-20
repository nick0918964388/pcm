import React from 'react'
import { ProjectCardSkeleton } from './ProjectCardSkeleton'
import { Skeleton, SkeletonButton } from '@/components/ui/skeleton'
import { ViewMode } from '@/types/project'
import { cn } from '@/lib/utils'

interface ProjectGridSkeletonProps {
  viewMode?: ViewMode
  itemCount?: number
  showFilters?: boolean
  showSelectButton?: boolean
  className?: string
}

/**
 * 專案網格/表格載入骨架
 */
export function ProjectGridSkeleton({ 
  viewMode = ViewMode.GRID,
  itemCount = 6,
  showFilters = true,
  showSelectButton = false,
  className = '' 
}: ProjectGridSkeletonProps) {
  
  return (
    <div className={cn("space-y-6", className)}>
      {/* 篩選和搜尋區域骨架 */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* 搜尋和篩選 */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <Skeleton className="h-10 w-full sm:w-80" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
          
          {/* 檢視模式切換 */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      )}

      {/* 統計資訊骨架 */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <SkeletonButton size="sm" className="w-20" />
        </div>
      </div>

      {/* 專案網格/表格骨架 */}
      {viewMode === ViewMode.GRID ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: itemCount }).map((_, index) => (
            <ProjectCardSkeleton 
              key={index}
              viewMode={viewMode}
              showSelectButton={showSelectButton}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* 表格標題骨架 */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
          
          {/* 表格內容骨架 */}
          {Array.from({ length: itemCount }).map((_, index) => (
            <ProjectCardSkeleton 
              key={index}
              viewMode={viewMode}
              showSelectButton={showSelectButton}
            />
          ))}
        </div>
      )}

      {/* 分頁骨架 */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <SkeletonButton size="sm" className="w-16" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <SkeletonButton size="sm" className="w-16" />
        </div>
      </div>
    </div>
  )
}

/**
 * 專案選擇器載入骨架
 */
export function ProjectSelectorSkeleton({ 
  inNavbar = false, 
  className = '' 
}: { 
  inNavbar?: boolean
  className?: string 
}) {
  if (inNavbar) {
    return <Skeleton className={cn("h-8 w-24 rounded-md", className)} />
  }
  
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <SkeletonButton size="sm" className="w-20" />
      </div>
      
      <Skeleton className="h-12 w-full rounded-lg border-2" />
      
      <div className="text-center">
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
    </div>
  )
}