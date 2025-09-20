import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface TableSkeletonProps {
  rows?: number
  columns?: number
  headers?: string[]
  showActions?: boolean
  className?: string
}

/**
 * 表格載入骨架
 * 用於顯示表格資料載入狀態
 */
export function TableSkeleton({ 
  rows = 3,
  columns = 4,
  headers = [],
  showActions = false,
  className = '' 
}: TableSkeletonProps) {
  
  // 如果沒有提供 headers，就生成預設的欄位數
  const tableColumns = headers.length > 0 ? headers.length : columns
  const actualColumns = showActions ? tableColumns + 1 : tableColumns

  return (
    <Table className={cn("", className)}>
      <TableHeader>
        <TableRow>
          {Array.from({ length: actualColumns }).map((_, i) => (
            <TableHead key={i}>
              {headers[i] ? (
                <span>{headers[i]}</span>
              ) : (
                <Skeleton className="h-4 w-16" />
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: actualColumns }).map((_, colIndex) => (
              <TableCell key={colIndex}>
                {colIndex === actualColumns - 1 && showActions ? (
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-6 w-6 rounded" />
                  </div>
                ) : colIndex === 0 ? (
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ) : (
                  <Skeleton className={cn(
                    "h-4",
                    colIndex % 3 === 0 ? "w-24" : 
                    colIndex % 3 === 1 ? "w-32" : "w-16"
                  )} />
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/**
 * ESH 事件表格載入骨架
 */
export function ESHTableSkeleton({ className = '' }: { className?: string }) {
  return (
    <TableSkeleton
      rows={3}
      headers={['類型', '工地', '廠欣', '事件描述', '日期']}
      className={className}
    />
  )
}

/**
 * 最新消息表格載入骨架
 */
export function NewsTableSkeleton({ className = '' }: { className?: string }) {
  return (
    <TableSkeleton
      rows={2}
      headers={['類別', '工地', '消息內容', '日期']}
      className={className}
    />
  )
}