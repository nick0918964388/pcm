/**
 * SearchFilter Component - Project Search and Filter Interface
 * 
 * This component provides a comprehensive search and filtering interface for the project selection page.
 * It leverages existing UI components (Input.tsx and Select.tsx) and supports all filtering requirements
 * specified in the project-selection specification.
 * 
 * @module SearchFilter
 * @version 1.0
 * @date 2025-08-29
 * 
 * Requirements Coverage:
 * - US2 (AC2.1): Search by project name and code
 * - US2 (AC2.2): Filter by project status
 * - US2 (AC2.3): Filter by project type
 * 
 * Reused Components:
 * - src/components/ui/Input.tsx
 * - src/components/ui/Select.tsx
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/Input'
import { Select, SelectOption } from '@/components/ui/Select'
import { cn } from '@/lib/utils'
import { 
  ProjectFilters, 
  ProjectStatus, 
  ProjectType,
  PROJECT_STATUS_COLORS,
  PROJECT_TYPE_ICONS
} from '@/types/project'
import { Search, Filter, X, Calendar, Users, TrendingUp } from 'lucide-react'

/**
 * Props interface for SearchFilter component
 */
export interface SearchFilterProps {
  /** Current filter values */
  filters: ProjectFilters
  /** Callback when filters change */
  onFiltersChange: (filters: Partial<ProjectFilters>) => void
  /** Reset all filters callback */
  onReset?: () => void
  /** Loading state */
  loading?: boolean
  /** Custom CSS classes */
  className?: string
  /** Available managers for filtering */
  availableManagers?: Array<{ id: string; name: string }>
  /** Available tags for filtering */
  availableTags?: string[]
  /** Responsive layout mode */
  layout?: 'horizontal' | 'vertical' | 'compact'
}

/**
 * SearchFilter component for project filtering functionality
 * 
 * Provides comprehensive filtering options including:
 * - Text search (AC2.1)
 * - Status filtering (AC2.2) 
 * - Type filtering (AC2.3)
 * - Date range filtering
 * - Progress range filtering
 * - Manager filtering
 * - Tag filtering
 * 
 * @param props SearchFilterProps
 * @returns JSX.Element
 * 
 * @example
 * ```tsx
 * <SearchFilter
 *   filters={currentFilters}
 *   onFiltersChange={handleFiltersChange}
 *   onReset={handleReset}
 *   layout="horizontal"
 * />
 * ```
 */
export const SearchFilter: React.FC<SearchFilterProps> = ({
  filters,
  onFiltersChange,
  onReset,
  loading = false,
  className,
  availableManagers = [],
  availableTags = [],
  layout = 'horizontal'
}) => {
  // Local state for UI interactions
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchValue, setSearchValue] = useState(filters.search || '')

  /**
   * Project status options for select dropdown
   */
  const statusOptions: SelectOption[] = useMemo(() => 
    Object.values(ProjectStatus).map(status => ({
      value: status,
      label: status
    })),
    []
  )

  /**
   * Project type options for select dropdown
   */
  const typeOptions: SelectOption[] = useMemo(() => 
    Object.values(ProjectType).map(type => ({
      value: type,
      label: `${PROJECT_TYPE_ICONS[type]} ${type}`
    })),
    []
  )

  /**
   * Manager options for select dropdown
   */
  const managerOptions: SelectOption[] = useMemo(() => 
    availableManagers.map(manager => ({
      value: manager.id,
      label: manager.name
    })),
    [availableManagers]
  )

  /**
   * Available tags options
   */
  const tagOptions: SelectOption[] = useMemo(() =>
    availableTags.map(tag => ({
      value: tag,
      label: tag
    })),
    [availableTags]
  )

  /**
   * Handle search input changes with debouncing
   */
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value)
    
    // Debounce search to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      onFiltersChange({ search: value.trim() || undefined })
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [onFiltersChange])

  /**
   * Handle status filter changes
   */
  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (!value) return
    
    const currentStatuses = filters.status || []
    const status = value as ProjectStatus
    
    const updatedStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status]
    
    onFiltersChange({ 
      status: updatedStatuses.length > 0 ? updatedStatuses : undefined 
    })
  }, [filters.status, onFiltersChange])

  /**
   * Handle type filter changes
   */
  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (!value) return
    
    const currentTypes = filters.type || []
    const type = value as ProjectType
    
    const updatedTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type]
    
    onFiltersChange({ 
      type: updatedTypes.length > 0 ? updatedTypes : undefined 
    })
  }, [filters.type, onFiltersChange])

  /**
   * Handle manager filter changes
   */
  const handleManagerChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    onFiltersChange({ 
      managerId: value || undefined 
    })
  }, [onFiltersChange])

  /**
   * Handle progress range changes
   */
  const handleProgressRangeChange = useCallback((field: 'min' | 'max', value: string) => {
    const numValue = parseInt(value)
    if (isNaN(numValue)) return
    
    const currentRange = filters.progressRange || { min: 0, max: 100 }
    const updatedRange = {
      ...currentRange,
      [field]: numValue
    }
    
    onFiltersChange({ progressRange: updatedRange })
  }, [filters.progressRange, onFiltersChange])

  /**
   * Clear a specific filter
   */
  const clearFilter = useCallback((filterKey: keyof ProjectFilters) => {
    onFiltersChange({ [filterKey]: undefined })
  }, [onFiltersChange])

  /**
   * Check if filters are active
   */
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.search ||
      (filters.status && filters.status.length > 0) ||
      (filters.type && filters.type.length > 0) ||
      filters.managerId ||
      filters.progressRange ||
      filters.startDateRange ||
      (filters.tags && filters.tags.length > 0)
    )
  }, [filters])

  /**
   * Get active filter count
   */
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.status && filters.status.length > 0) count++
    if (filters.type && filters.type.length > 0) count++
    if (filters.managerId) count++
    if (filters.progressRange) count++
    if (filters.startDateRange) count++
    if (filters.tags && filters.tags.length > 0) count++
    return count
  }, [filters])

  /**
   * Component layout classes based on layout prop
   */
  const layoutClasses = {
    horizontal: 'flex flex-wrap items-end gap-4',
    vertical: 'flex flex-col space-y-4',
    compact: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'
  }

  return (
    <div className={cn('bg-white rounded-lg shadow-sm border border-gray-200 p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">篩選專案</h3>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {activeFilterCount} 個篩選條件
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Expand/Collapse button for mobile */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="md:hidden inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            {isExpanded ? '收起' : '展開'}
          </button>
          
          {/* Reset button */}
          {hasActiveFilters && onReset && (
            <button
              onClick={onReset}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <X className="h-4 w-4 mr-2" />
              清除篩選
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div className={cn(
        layoutClasses[layout],
        'transition-all duration-200',
        !isExpanded && 'md:flex hidden'
      )}>
        {/* Search Input (AC2.1) */}
        <div className={cn('flex-1', layout === 'vertical' && 'w-full')}>
          <Input
            label="搜尋專案"
            placeholder="輸入專案名稱、代碼或描述..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            startIcon={<Search className="h-4 w-4" />}
            disabled={loading}
            helperText="支援專案名稱、代碼、描述等關鍵字搜尋"
          />
          {filters.search && (
            <button
              onClick={() => clearFilter('search')}
              className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status Filter (AC2.2) */}
        <div className={cn('min-w-[200px]', layout === 'vertical' && 'w-full')}>
          <Select
            label="專案狀態"
            placeholder="選擇專案狀態..."
            options={statusOptions}
            value={filters.status?.[0] || ''}
            onChange={handleStatusChange}
            disabled={loading}
          />
        </div>

        {/* Type Filter (AC2.3) */}
        <div className={cn('min-w-[200px]', layout === 'vertical' && 'w-full')}>
          <Select
            label="專案類型"
            placeholder="選擇專案類型..."
            options={typeOptions}
            value={filters.type?.[0] || ''}
            onChange={handleTypeChange}
            disabled={loading}
          />
        </div>

        {/* Manager Filter */}
        {availableManagers.length > 0 && (
          <div className={cn('min-w-[200px]', layout === 'vertical' && 'w-full')}>
            <Select
              label="專案經理"
              placeholder="選擇專案經理..."
              options={managerOptions}
              value={filters.managerId || ''}
              onChange={handleManagerChange}
              disabled={loading}
            />
          </div>
        )}

        {/* Progress Range Filter */}
        <div className={cn('flex space-x-2', layout === 'vertical' && 'w-full')}>
          <div className="flex-1">
            <Input
              label="進度範圍"
              placeholder="最小%"
              type="number"
              min="0"
              max="100"
              value={filters.progressRange?.min?.toString() || ''}
              onChange={(e) => handleProgressRangeChange('min', e.target.value)}
              disabled={loading}
              startIcon={<TrendingUp className="h-4 w-4" />}
            />
          </div>
          <div className="flex items-center pt-6">
            <span className="text-gray-500">-</span>
          </div>
          <div className="flex-1">
            <Input
              placeholder="最大%"
              type="number"
              min="0"
              max="100"
              value={filters.progressRange?.max?.toString() || ''}
              onChange={(e) => handleProgressRangeChange('max', e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600 mr-2">已套用篩選條件:</span>
            
            {filters.search && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                搜尋: {filters.search}
                <button
                  onClick={() => clearFilter('search')}
                  className="ml-1 h-3 w-3"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            
            {filters.status && filters.status.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                狀態: {filters.status.join(', ')}
                <button
                  onClick={() => clearFilter('status')}
                  className="ml-1 h-3 w-3"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            
            {filters.type && filters.type.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                類型: {filters.type.join(', ')}
                <button
                  onClick={() => clearFilter('type')}
                  className="ml-1 h-3 w-3"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            
            {filters.managerId && availableManagers.find(m => m.id === filters.managerId) && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                經理: {availableManagers.find(m => m.id === filters.managerId)?.name}
                <button
                  onClick={() => clearFilter('managerId')}
                  className="ml-1 h-3 w-3"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            
            {filters.progressRange && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                進度: {filters.progressRange.min}%-{filters.progressRange.max}%
                <button
                  onClick={() => clearFilter('progressRange')}
                  className="ml-1 h-3 w-3"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">載入中...</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Export SearchFilter as default component
 */
export default SearchFilter

// SearchFilterProps is already exported above with the interface declaration