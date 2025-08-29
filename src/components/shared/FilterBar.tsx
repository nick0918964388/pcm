'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button, Input, Select, SelectOption } from '@/components/ui'

export interface FilterConfig {
  key: string
  type: 'text' | 'select' | 'dateRange'
  label: string
  placeholder?: string
  options?: SelectOption[]
  defaultValue?: string
}

interface FilterBarProps {
  filters: FilterConfig[]
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  onReset?: () => void
  onSearch?: () => void
  className?: string
  loading?: boolean
}

export function FilterBar({
  filters,
  values,
  onChange,
  onReset,
  onSearch,
  className,
  loading = false
}: FilterBarProps) {
  const renderFilter = (filter: FilterConfig) => {
    const value = values[filter.key] || ''

    switch (filter.type) {
      case 'text':
        return (
          <Input
            key={filter.key}
            label={filter.label}
            placeholder={filter.placeholder}
            value={value}
            onChange={(e) => onChange(filter.key, e.target.value)}
            disabled={loading}
          />
        )

      case 'select':
        return (
          <Select
            key={filter.key}
            label={filter.label}
            placeholder={filter.placeholder}
            options={filter.options || []}
            value={value}
            onChange={(e) => onChange(filter.key, e.target.value)}
            disabled={loading}
          />
        )

      case 'dateRange':
        return (
          <div key={filter.key} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {filter.label}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                placeholder="開始日期"
                value={value.start || ''}
                onChange={(e) => onChange(filter.key, { 
                  ...value, 
                  start: e.target.value 
                })}
                disabled={loading}
              />
              <Input
                type="date"
                placeholder="結束日期"
                value={value.end || ''}
                onChange={(e) => onChange(filter.key, { 
                  ...value, 
                  end: e.target.value 
                })}
                disabled={loading}
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const hasFilters = Object.values(values).some(value => {
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== '' && v != null)
    }
    return value !== '' && value != null
  })

  return (
    <div className={cn('bg-white p-6 rounded-lg shadow mb-6', className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {filters.map(renderFilter)}
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          {hasFilters && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brand-primary bg-opacity-10 text-brand-primary">
              已套用篩選條件
            </span>
          )}
        </div>
        
        <div className="flex space-x-3">
          {onReset && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              disabled={loading || !hasFilters}
            >
              重置
            </Button>
          )}
          
          {onSearch && (
            <Button
              variant="default"
              size="sm"
              onClick={onSearch}
              disabled={loading}
            >
              {loading ? '搜尋中...' : '搜尋'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}