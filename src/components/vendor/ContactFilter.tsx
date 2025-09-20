'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { ContactFilter as ContactFilterType } from '@/types/vendor'
import { Search, Filter, X, ArrowUpDown, Star, Users } from 'lucide-react'

interface ContactFilterProps {
  filter: ContactFilterType
  onFilterChange: (filter: ContactFilterType) => void
  totalCount: number
  filteredCount: number
  departments: string[]
}

const sortOptions = [
  { value: 'name', label: '姓名' },
  { value: 'title', label: '職稱' },
  { value: 'department', label: '部門' }
] as const

export function ContactFilter({ 
  filter, 
  onFilterChange, 
  totalCount, 
  filteredCount, 
  departments 
}: ContactFilterProps) {
  const hasActiveFilters = filter.department || filter.isPrimary !== undefined || filter.isActive !== undefined || filter.search

  const handleSearchChange = (search: string) => {
    onFilterChange({ ...filter, search: search || undefined })
  }

  const handleDepartmentToggle = (department: string, checked: boolean) => {
    onFilterChange({ 
      ...filter, 
      department: checked ? department : undefined 
    })
  }

  const handlePrimaryToggle = (checked: boolean) => {
    onFilterChange({ 
      ...filter, 
      isPrimary: checked ? true : undefined 
    })
  }

  const handleActiveToggle = (checked: boolean) => {
    onFilterChange({ 
      ...filter, 
      isActive: checked ? true : undefined 
    })
  }

  const handleSortChange = (sortBy: typeof sortOptions[number]['value']) => {
    const newSortOrder = filter.sortBy === sortBy && filter.sortOrder === 'asc' ? 'desc' : 'asc'
    onFilterChange({ 
      ...filter, 
      sortBy,
      sortOrder: newSortOrder 
    })
  }

  const clearAllFilters = () => {
    onFilterChange({})
  }

  return (
    <div className="space-y-4">
      {/* 搜尋列 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="搜尋聯絡人姓名、職稱、部門或聯絡資訊..."
            value={filter.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            startIcon={<Search />}
            className="w-full"
          />
        </div>

        {/* 篩選按鈕 */}
        <div className="flex gap-2">
          {/* 部門篩選 */}
          {departments.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="whitespace-nowrap"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  部門
                  {filter.department && <Badge variant="secondary" className="ml-2 text-xs">1</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>選擇部門</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {departments.map((department) => (
                  <DropdownMenuCheckboxItem
                    key={department}
                    checked={filter.department === department}
                    onCheckedChange={(checked) => handleDepartmentToggle(department, checked)}
                  >
                    {department}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* 狀態篩選 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="whitespace-nowrap"
              >
                <Users className="h-4 w-4 mr-2" />
                篩選
                {(filter.isPrimary || filter.isActive !== undefined) && 
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {[filter.isPrimary && 'P', filter.isActive !== undefined && 'A'].filter(Boolean).length}
                  </Badge>
                }
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuLabel>聯絡人篩選</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={filter.isPrimary === true}
                onCheckedChange={handlePrimaryToggle}
              >
                <Star className="h-4 w-4 mr-2 text-yellow-500" />
                主要聯絡人
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filter.isActive === true}
                onCheckedChange={handleActiveToggle}
              >
                <div className="h-2 w-2 bg-green-500 rounded-full mr-2" />
                活躍聯絡人
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 排序 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="whitespace-nowrap"
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                排序
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuLabel>排序方式</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sortOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={filter.sortBy === option.value}
                  onCheckedChange={() => handleSortChange(option.value)}
                >
                  {option.label}
                  {filter.sortBy === option.value && (
                    <span className="ml-auto">
                      {filter.sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 已選擇的篩選條件 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {filter.department && (
            <Badge variant="outline" className="text-xs">
              部門: {filter.department}
              <button
                onClick={() => handleDepartmentToggle(filter.department!, false)}
                className="ml-1 hover:bg-[#00645A]/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {filter.isPrimary && (
            <Badge variant="outline" className="text-xs border-yellow-200 text-yellow-700">
              <Star className="h-3 w-3 mr-1 fill-current" />
              主要聯絡人
              <button
                onClick={() => handlePrimaryToggle(false)}
                className="ml-1 hover:bg-yellow-100 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filter.isActive && (
            <Badge variant="outline" className="text-xs border-green-200 text-green-700">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-1" />
              活躍聯絡人
              <button
                onClick={() => handleActiveToggle(false)}
                className="ml-1 hover:bg-green-100 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-7 px-2 text-[#8C8C8C] hover:text-[#00645A]"
            >
              清除所有篩選
            </Button>
          )}
        </div>

        <div className="text-sm text-[#8C8C8C]">
          顯示 {filteredCount} / {totalCount} 個聯絡人
        </div>
      </div>
    </div>
  )
}