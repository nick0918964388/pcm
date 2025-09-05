'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import { TableSkeleton, Skeleton } from '@/components/ui/skeleton'

export interface Column<T> {
  key: keyof T | string
  title: string
  width?: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  render?: (value: any, record: T, index: number) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  pagination?: {
    current: number
    pageSize: number
    total: number
    onChange: (page: number, pageSize: number) => void
  }
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  className?: string
  emptyText?: string
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  pagination,
  onSort,
  className,
  emptyText = '暫無資料'
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string>('')
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (!onSort) return

    let direction: 'asc' | 'desc' = 'asc'
    
    if (sortKey === key && sortDirection === 'asc') {
      direction = 'desc'
    }

    setSortKey(key)
    setSortDirection(direction)
    onSort(key, direction)
  }

  const renderCell = (column: Column<T>, record: T, index: number) => {
    const value = typeof column.key === 'string' 
      ? record[column.key] 
      : record[column.key as keyof T]

    if (column.render) {
      return column.render(value, record, index)
    }

    return value
  }

  const SortIcon = ({ column }: { column: Column<T> }) => {
    if (!column.sortable) return null

    const isActive = sortKey === column.key
    
    return (
      <span className="ml-1 inline-flex flex-col">
        <svg
          className={cn(
            'h-3 w-3 -mb-0.5',
            isActive && sortDirection === 'asc' ? 'text-brand-primary' : 'text-gray-300'
          )}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
        </svg>
        <svg
          className={cn(
            'h-3 w-3',
            isActive && sortDirection === 'desc' ? 'text-brand-primary' : 'text-gray-300'
          )}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </span>
    )
  }

  return (
    <div className={cn('bg-white rounded-lg shadow overflow-hidden', className)}>
      {/* 桌面版表格 */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={cn(
                    'px-3 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable && 'cursor-pointer hover:bg-gray-100'
                  )}
                  style={{ width: column.width }}
                  onClick={column.sortable ? () => handleSort(column.key as string) : undefined}
                >
                  <div className="flex items-center">
                    {column.title}
                    <SortIcon column={column} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 sm:px-6 py-6"
                >
                  <TableSkeleton rows={5} columns={columns.length} />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 sm:px-6 py-12 text-center text-gray-500"
                >
                  <div className="text-4xl mb-2">📄</div>
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((record, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={colIndex}
                      className={cn(
                        'px-3 sm:px-6 py-4 text-sm text-gray-900',
                        'whitespace-nowrap sm:whitespace-normal',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {renderCell(column, record, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 行動版卡片列表 */}
      <div className="sm:hidden">
        {loading ? (
          <div className="px-4 py-6">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white p-4 rounded-lg border space-y-3">
                  {columns.slice(0, 6).map((column, j) => (
                    <div key={j} className="flex justify-between items-center">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500">
            <div className="text-4xl mb-2">📄</div>
            {emptyText}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {data.map((record, index) => (
              <div key={index} className="px-4 py-4 space-y-2">
                {columns.map((column, colIndex) => (
                  <div key={colIndex} className="flex justify-between items-start">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0 flex-shrink-0 mr-3">
                      {column.title}
                    </dt>
                    <dd className="text-sm text-gray-900 text-right flex-1 min-w-0">
                      {renderCell(column, record, index)}
                    </dd>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {pagination && (
        <div className="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.current === 1}
              onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
            >
              上一頁
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.current * pagination.pageSize >= pagination.total}
              onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
            >
              下一頁
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                顯示第{' '}
                <span className="font-medium">
                  {(pagination.current - 1) * pagination.pageSize + 1}
                </span>{' '}
                到{' '}
                <span className="font-medium">
                  {Math.min(pagination.current * pagination.pageSize, pagination.total)}
                </span>{' '}
                筆，共{' '}
                <span className="font-medium">{pagination.total}</span>{' '}
                筆資料
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current === 1}
                onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
              >
                上一頁
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current * pagination.pageSize >= pagination.total}
                onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
              >
                下一頁
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}