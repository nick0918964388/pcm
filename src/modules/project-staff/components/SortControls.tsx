/**
 * @fileoverview 排序控制組件
 * @version 1.0
 * @date 2025-08-31
 * 
 * 提供排序欄位選擇和排序方向控制的組件
 */

'use client'

import React, { useCallback } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

// ==================== TYPES ====================

export interface SortOption {
  /** 排序欄位值 */
  value: string
  /** 顯示標籤 */
  label: string
}

export interface SortControlsProps {
  /** 當前排序欄位 */
  sortBy: string
  /** 當前排序方向 */
  sortOrder: 'asc' | 'desc'
  /** 排序變更回調 */
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  /** 排序選項 */
  sortOptions?: SortOption[]
  /** 是否禁用 */
  disabled?: boolean
  /** 簡化模式（只顯示方向按鈕） */
  compact?: boolean
  /** 是否顯示標籤 */
  showLabel?: boolean
  /** 響應式設計 */
  responsive?: boolean
  /** 是否顯示重置按鈕 */
  showReset?: boolean
  /** 組件類名 */
  className?: string
}

// ==================== DEFAULT OPTIONS ====================

const DEFAULT_SORT_OPTIONS: SortOption[] = [
  { value: 'name', label: '姓名' },
  { value: 'role', label: '角色' },
  { value: 'joinedAt', label: '加入時間' },
  { value: 'workload', label: '工作負載' },
  { value: 'lastActiveAt', label: '最後活躍時間' }
]

// ==================== COMPONENT ====================

export const SortControls: React.FC<SortControlsProps> = ({
  sortBy,
  sortOrder,
  onSortChange,
  sortOptions = DEFAULT_SORT_OPTIONS,
  disabled = false,
  compact = false,
  showLabel = true,
  responsive = false,
  showReset = false,
  className
}) => {
  // ===== HANDLERS =====
  const handleSortFieldChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSortBy = e.target.value
    onSortChange(newSortBy, sortOrder)
  }, [sortOrder, onSortChange])

  const handleSortDirectionToggle = useCallback(() => {
    const newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc'
    onSortChange(sortBy, newSortOrder)
  }, [sortBy, sortOrder, onSortChange])

  const handleReset = useCallback(() => {
    onSortChange('', 'asc')
  }, [onSortChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      handleSortDirectionToggle()
    }
  }, [handleSortDirectionToggle])

  // ===== RENDER HELPERS =====
  const renderSortIcon = () => {
    if (sortOrder === 'asc') {
      return <ArrowUp className="w-4 h-4" data-testid="sort-asc-icon" />
    } else {
      return <ArrowDown className="w-4 h-4" data-testid="sort-desc-icon" />
    }
  }

  // ===== RENDER =====
  return (
    <div 
      className={cn(
        'flex items-center space-x-3',
        responsive && 'responsive',
        className
      )}
      data-testid="sort-controls-container"
    >
      {/* 排序欄位選擇 */}
      {!compact && (
        <div className="flex items-center space-x-2">
          {showLabel && (
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              排序方式
            </label>
          )}
          
          <select
            value={sortBy}
            onChange={handleSortFieldChange}
            disabled={disabled}
            className={cn(
              'px-3 py-1.5 text-sm border border-gray-300 rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              'dark:bg-gray-800 dark:border-gray-600 dark:text-white',
              'dark:focus:ring-blue-400'
            )}
            aria-label="選擇排序欄位"
          >
            <option value="">選擇排序欄位</option>
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 排序方向按鈕 */}
      <button
        type="button"
        onClick={handleSortDirectionToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled || !sortBy}
        data-testid="sort-direction-button"
        className={cn(
          'inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium',
          'border border-gray-300 rounded-md',
          'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500',
          'disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50',
          'dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-blue-400',
          sortBy ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
        )}
        aria-label={`排序方向：${sortOrder === 'asc' ? '遞增' : '遞減'}`}
        title={`點擊切換排序方向（當前：${sortOrder === 'asc' ? '遞增' : '遞減'}）`}
      >
        <span className="flex items-center space-x-1">
          {sortBy ? renderSortIcon() : <ArrowUpDown className="w-4 h-4" />}
          {!compact && (
            <span>
              {sortBy 
                ? (sortOrder === 'asc' ? '遞增' : '遞減')
                : '排序方向'
              }
            </span>
          )}
        </span>
      </button>

      {/* 重置按鈕 */}
      {showReset && sortBy && (
        <button
          type="button"
          onClick={handleReset}
          disabled={disabled}
          className={cn(
            'inline-flex items-center space-x-1 px-2 py-1.5 text-sm',
            'text-gray-600 hover:text-gray-900',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'dark:text-gray-400 dark:hover:text-gray-100'
          )}
          aria-label="重置排序"
        >
          <RotateCcw className="w-3 h-3" />
          <span>重置排序</span>
        </button>
      )}

      {/* 當前排序狀態指示 */}
      {sortBy && !compact && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <span>
            按 {sortOptions.find(opt => opt.value === sortBy)?.label || sortBy}{' '}
            {sortOrder === 'asc' ? '遞增' : '遞減'}排序
          </span>
        </div>
      )}
    </div>
  )
}

export default SortControls