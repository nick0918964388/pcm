import { cn } from "@/lib/utils"
import React from 'react'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

function Skeleton({
  className,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200 dark:bg-gray-800", className)}
      {...props}
    />
  )
}

// 文字 Skeleton
function SkeletonText({ 
  lines = 1, 
  className,
  ...props 
}: { 
  lines?: number 
  className?: string 
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          )} 
        />
      ))}
    </div>
  )
}

// 頭像 Skeleton
function SkeletonAvatar({ 
  size = "md", 
  className 
}: { 
  size?: "sm" | "md" | "lg"
  className?: string 
}) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12", 
    lg: "h-16 w-16"
  }
  
  return (
    <Skeleton className={cn("rounded-full", sizeClasses[size], className)} />
  )
}

// 按鈕 Skeleton
function SkeletonButton({ 
  size = "md",
  className 
}: { 
  size?: "sm" | "md" | "lg"
  className?: string 
}) {
  const sizeClasses = {
    sm: "h-8 px-3",
    md: "h-10 px-4",
    lg: "h-12 px-6"
  }
  
  return (
    <Skeleton className={cn("rounded-md", sizeClasses[size], className)} />
  )
}

// 表格 Skeleton
function TableSkeleton({ 
  rows = 5, 
  columns = 8, 
  className 
}: { 
  rows?: number
  columns?: number
  className?: string 
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Table Header Skeleton */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4" />
        ))}
      </div>
      
      {/* Table Rows Skeleton */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                "h-6",
                // 第一列稍短
                colIndex === 0 && "h-4 w-12",
                // 最後一列按鈕樣式
                colIndex === columns - 1 && "h-8 w-16"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// 卡片 Skeleton
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-6 space-y-3 bg-white rounded-lg border", className)}>
      <div className="flex items-center space-x-3">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  )
}

export { 
  Skeleton, 
  SkeletonText, 
  SkeletonAvatar, 
  SkeletonButton,
  TableSkeleton,
  CardSkeleton
}
