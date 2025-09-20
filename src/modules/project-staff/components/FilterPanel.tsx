/**
 * @fileoverview 整合搜索和篩選功能的面板組件
 * @version 1.0
 * @date 2025-08-31
 * 
 * 整合 ProjectMemberSearchInput 和 ProjectMemberFilters 的主面板組件
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { RotateCcw, Loader2 } from 'lucide-react'
import { ProjectMemberFilters as FilterTypes } from '@/types/project'
import { ProjectMemberSearchInput } from './ProjectMemberSearchInput'
import { ProjectMemberFilters } from './ProjectMemberFilters'
import { cn } from '@/lib/utils'

// ==================== TYPES ====================

export interface FilterPanelProps {
  /** 專案 ID */
  projectId: string
  /** 搜索變更回調 */
  onSearchChange: (query: string) => void
  /** 篩選條件變更回調 */
  onFiltersChange: (filters: Partial<FilterTypes>) => void
  /** 初始篩選條件 */
  initialFilters?: Partial<FilterTypes>
  /** 搜索占位符 */
  searchPlaceholder?: string
  /** 可用角色列表 */
  availableRoles?: string[]
  /** 可用技能列表 */
  availableSkills?: string[]
  /** 部門列表 */
  departments?: string[]
  /** 是否可摺疊 */
  collapsible?: boolean
  /** 默認是否展開 */
  defaultExpanded?: boolean
  /** 是否顯示清除所有按鈕 */
  showClearAll?: boolean
  /** 是否顯示篩選數量 */
  showFilterCount?: boolean
  /** 是否顯示搜索歷史 */
  showSearchHistory?: boolean
  /** 搜索歷史記錄 */
  searchHistory?: string[]
  /** 響應式設計 */
  responsive?: boolean
  /** 載入狀態 */
  loading?: boolean
  /** 組件類名 */
  className?: string
}

// ==================== COMPONENT ====================

export const FilterPanel: React.FC<FilterPanelProps> = ({
  projectId,
  onSearchChange,
  onFiltersChange,
  initialFilters = {},
  searchPlaceholder = '搜索專案成員...',
  availableRoles = [],
  availableSkills = [],
  departments = [],
  collapsible = true,
  defaultExpanded = true,
  showClearAll = true,
  showFilterCount = true,
  showSearchHistory = false,
  searchHistory = [],
  responsive = true,
  loading = false,
  className
}) => {
  // ===== STATES =====
  const [currentFilters, setCurrentFilters] = useState<Partial<FilterTypes>>(initialFilters)
  const [searchQuery, setSearchQuery] = useState('')

  // ===== EFFECTS =====
  useEffect(() => {
    setCurrentFilters(initialFilters)
  }, [initialFilters])

  // ===== HANDLERS =====
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
    onSearchChange(query)
  }, [onSearchChange])

  const handleFiltersChange = useCallback((filters: Partial<FilterTypes>) => {
    setCurrentFilters(filters)
    onFiltersChange(filters)
  }, [onFiltersChange])

  const handleClearAll = useCallback(() => {
    setSearchQuery('')
    setCurrentFilters({})
    onSearchChange('')
    onFiltersChange({})
  }, [onSearchChange, onFiltersChange])

  // ===== COMPUTED VALUES =====
  const hasActiveFilters = Object.keys(currentFilters).some(key => {
    const value = currentFilters[key as keyof FilterTypes]
    if (Array.isArray(value)) {
      return value.length > 0
    }
    if (value && typeof value === 'object') {
      return Object.keys(value).length > 0
    }
    return value !== undefined
  })

  const hasActiveSearch = searchQuery.length > 0
  const hasAnyActiveConditions = hasActiveFilters || hasActiveSearch

  // ===== RENDER =====
  return (
    <div 
      className={cn(
        'space-y-4',
        responsive && 'responsive',
        className
      )}
      data-testid="filter-panel-container"
    >
      {/* 載入覆蓋層 */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center space-x-2" data-testid="loading-spinner">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">載入中...</span>
          </div>
        </div>
      )}

      {/* 搜索輸入框 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <ProjectMemberSearchInput
              projectId={projectId}
              onSearch={handleSearchChange}
              placeholder={searchPlaceholder}
              showClearButton={true}
              showHistory={showSearchHistory}
              searchHistory={searchHistory}
              autoFocus={false}
            />
          </div>
          
          {/* 清除所有條件按鈕 */}
          {showClearAll && hasAnyActiveConditions && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              aria-label="清除所有條件"
            >
              <RotateCcw className="w-4 h-4" />
              <span>清除所有條件</span>
            </button>
          )}
        </div>
      </div>

      {/* 篩選器面板 */}
      <ProjectMemberFilters
        filters={currentFilters}
        onFiltersChange={handleFiltersChange}
        availableRoles={availableRoles}
        availableSkills={availableSkills}
        departments={departments}
        collapsible={collapsible}
        defaultExpanded={defaultExpanded}
        showClearAll={false} // 已經有統一的清除按鈕
        showFilterCount={showFilterCount}
        responsive={responsive}
      />

      {/* 條件摘要 */}
      {(hasActiveSearch || hasActiveFilters) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                當前篩選條件
              </h4>
              
              <div className="flex flex-wrap gap-2">
                {/* 搜索條件 */}
                {hasActiveSearch && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                    搜索: "{searchQuery}"
                  </span>
                )}
                
                {/* 篩選條件 */}
                {Object.entries(currentFilters).map(([key, value]) => {
                  if (!value) return null
                  
                  let displayText = ''
                  if (Array.isArray(value)) {
                    displayText = `${key}: ${value.length} 項`
                  } else if (typeof value === 'object') {
                    displayText = `${key}: 已設定範圍`
                  } else {
                    displayText = `${key}: ${value}`
                  }
                  
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                    >
                      {displayText}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FilterPanel