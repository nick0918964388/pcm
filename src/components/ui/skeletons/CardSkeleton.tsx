import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton, SkeletonText, SkeletonButton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface CardSkeletonProps {
  showHeader?: boolean
  showActions?: boolean
  headerHeight?: number
  contentLines?: number
  className?: string
}

/**
 * 通用卡片載入骨架
 */
export function CardSkeleton({ 
  showHeader = true,
  showActions = false,
  headerHeight = 6,
  contentLines = 3,
  className = '' 
}: CardSkeletonProps) {
  return (
    <Card className={cn("", className)}>
      {showHeader && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className={`h-${headerHeight} w-32`} />
          {showActions && (
            <div className="flex items-center space-x-2">
              <SkeletonButton size="sm" className="w-16" />
            </div>
          )}
        </CardHeader>
      )}
      <CardContent>
        <SkeletonText lines={contentLines} />
      </CardContent>
    </Card>
  )
}

/**
 * KPI 進度卡片載入骨架
 */
export function KPICardSkeleton({ className = '' }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-16" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/**
 * 里程碑時間軸卡片載入骨架
 */
export function MilestoneCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-6 w-28" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center space-x-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/**
 * 專案狀態卡片載入骨架
 */
export function StatusCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>
            <div className="mt-4">
              <Skeleton className="h-3 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}