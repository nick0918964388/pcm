/**
 * @fileoverview PaginationControls 組件實現
 * @version 1.0
 * @date 2025-08-31
 */

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  showFirstLast?: boolean
  showPageSizeSelector?: boolean
  showQuickJumper?: boolean
  compact?: boolean
  siblingCount?: number
  className?: string
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  showFirstLast = false,
  showPageSizeSelector = false,
  showQuickJumper = false,
  compact = false,
  siblingCount = 1,
  className
}) => {
  const [jumpPage, setJumpPage] = useState('')

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = []
    
    if (totalPages <= 7) {
      // 如果總頁數不多，顯示所有頁碼
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // 複雜的分頁邏輯
      const startPages = currentPage <= 3 ? [1, 2, 3] : [1]
      const endPages = currentPage >= totalPages - 2 ? [totalPages - 2, totalPages - 1, totalPages] : [totalPages]
      
      const middleStart = Math.max(2, currentPage - siblingCount)
      const middleEnd = Math.min(totalPages - 1, currentPage + siblingCount)
      
      // 添加開始頁碼
      startPages.forEach(page => {
        if (page <= totalPages) pages.push(page)
      })
      
      // 添加省略號（如果需要）
      if (currentPage > 4) {
        pages.push('ellipsis')
      }
      
      // 添加中間頁碼
      if (currentPage > 3 && currentPage < totalPages - 2) {
        for (let i = middleStart; i <= middleEnd; i++) {
          if (i > 3 && i < totalPages - 2) {
            pages.push(i)
          }
        }
      }
      
      // 添加省略號（如果需要）
      if (currentPage < totalPages - 3) {
        pages.push('ellipsis')
      }
      
      // 添加結束頁碼
      if (currentPage < totalPages - 2) {
        endPages.forEach(page => {
          if (page > 0) pages.push(page)
        })
      }
    }
    
    // 去重
    return pages.filter((page, index, arr) => {
      if (page === 'ellipsis') return true
      return index === 0 || arr[index - 1] !== page
    })
  }, [currentPage, totalPages, siblingCount])

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page)
    }
  }

  const handlePageSizeChange = (newPageSize: string) => {
    const size = parseInt(newPageSize)
    if (onPageSizeChange && size > 0) {
      onPageSizeChange(size)
    }
  }

  const handleQuickJump = () => {
    const page = parseInt(jumpPage)
    if (page >= 1 && page <= totalPages) {
      handlePageChange(page)
      setJumpPage('')
    }
  }

  const handleJumpKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuickJump()
    }
  }

  if (totalItems === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-gray-500">
        暫無資料
      </div>
    )
  }

  return (
    <nav 
      role="navigation" 
      aria-label="分頁導航"
      className={cn(
        "flex items-center justify-between space-x-4 px-2 py-4",
        compact && "compact py-2",
        className
      )}
    >
      {/* 資料資訊 */}
      <div className="flex items-center space-x-4 text-sm text-gray-700">
        <span>
          顯示第 {startItem}-{endItem} 項，共 {totalItems} 項
        </span>
        
        {showPageSizeSelector && (
          <div className="flex items-center space-x-2">
            <label htmlFor="page-size-select" className="text-sm">
              每頁顯示
            </label>
            <Select 
              value={pageSize.toString()} 
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger 
                id="page-size-select"
                aria-label="每頁顯示"
                className="w-20"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm">項</span>
          </div>
        )}
      </div>

      {/* 分頁控制 */}
      <div className="flex items-center space-x-2">
        {showQuickJumper && (
          <div className="flex items-center space-x-2 mr-4">
            <span className="text-sm">跳至</span>
            <Input
              type="number"
              min="1"
              max={totalPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyDown={handleJumpKeyDown}
              placeholder="頁面"
              aria-label="跳至頁面"
              className="w-16 text-center"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleQuickJump}
              disabled={!jumpPage || parseInt(jumpPage) < 1 || parseInt(jumpPage) > totalPages}
            >
              跳轉
            </Button>
          </div>
        )}

        {/* 首頁按鈕 */}
        {showFirstLast && (
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            aria-label="第一頁"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}

        {/* 上一頁按鈕 */}
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="上一頁"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* 頁碼按鈕 */}
        <div className="flex items-center space-x-1">
          {pageNumbers.map((page, index) => {
            if (page === 'ellipsis') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                  ...
                </span>
              )
            }
            
            return (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size={compact ? "sm" : "default"}
                onClick={() => handlePageChange(page)}
                aria-label={`第 ${page} 頁`}
                aria-current={page === currentPage ? "page" : undefined}
                className="min-w-[40px]"
              >
                {page}
              </Button>
            )
          })}
        </div>

        {/* 下一頁按鈕 */}
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="下一頁"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* 末頁按鈕 */}
        {showFirstLast && (
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="最後一頁"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </nav>
  )
}