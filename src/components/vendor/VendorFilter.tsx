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
import { VendorFilter as VendorFilterType, VendorType, VendorStatus } from '@/types/vendor'
import { Search, Filter, X, ArrowUpDown } from 'lucide-react'

interface VendorFilterProps {
  filter: VendorFilterType
  onFilterChange: (filter: VendorFilterType) => void
  totalCount: number
  filteredCount: number
}

const vendorTypes: VendorType[] = [
  '主要承攬商',
  '次要承攬商',
  '設備供應商',
  '材料供應商',
  '顧問公司',
  '檢測機構',
  '其他'
]

const vendorStatuses: { value: VendorStatus; label: string }[] = [
  { value: 'active', label: '活躍' },
  { value: 'inactive', label: '非活躍' },
  { value: 'pending', label: '待審核' },
  { value: 'suspended', label: '暫停' }
]

const sortOptions = [
  { value: 'name', label: '廠商名稱' },
  { value: 'lastContact', label: '最後聯絡時間' },
  { value: 'contactCount', label: '聯絡人數量' }
] as const

export function VendorFilter({ filter, onFilterChange, totalCount, filteredCount }: VendorFilterProps) {
  const hasActiveFilters = filter.type || filter.status || filter.search

  const handleSearchChange = (search: string) => {
    onFilterChange({ ...filter, search: search || undefined })
  }

  const handleTypeToggle = (type: VendorType, checked: boolean) => {
    onFilterChange({ 
      ...filter, 
      type: checked ? type : undefined 
    })
  }

  const handleStatusToggle = (status: VendorStatus, checked: boolean) => {
    onFilterChange({ 
      ...filter, 
      status: checked ? status : undefined 
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
            placeholder="搜尋廠商名稱、描述或聯絡資訊..."
            value={filter.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            startIcon={<Search />}
            className="w-full"
          />
        </div>

        {/* 篩選按鈕 */}
        <div className="flex gap-2">
          {/* 類型篩選 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="whitespace-nowrap"
              >
                <Filter className="h-4 w-4 mr-2" />
                廠商類型
                {filter.type && <Badge variant="secondary" className="ml-2 text-xs">1</Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>選擇廠商類型</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {vendorTypes.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={filter.type === type}
                  onCheckedChange={(checked) => handleTypeToggle(type, checked)}
                >
                  {type}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 狀態篩選 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="whitespace-nowrap"
              >
                <Filter className="h-4 w-4 mr-2" />
                狀態
                {filter.status && <Badge variant="secondary" className="ml-2 text-xs">1</Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuLabel>選擇狀態</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {vendorStatuses.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status.value}
                  checked={filter.status === status.value}
                  onCheckedChange={(checked) => handleStatusToggle(status.value, checked)}
                >
                  {status.label}
                </DropdownMenuCheckboxItem>
              ))}
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
            <DropdownMenuContent align="end" className="w-40">
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
          {filter.type && (
            <Badge variant="outline" className="text-xs">
              類型: {filter.type}
              <button
                onClick={() => handleTypeToggle(filter.type!, false)}
                className="ml-1 hover:bg-[#00645A]/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {filter.status && (
            <Badge variant="outline" className="text-xs">
              狀態: {vendorStatuses.find(s => s.value === filter.status)?.label}
              <button
                onClick={() => handleStatusToggle(filter.status!, false)}
                className="ml-1 hover:bg-[#00645A]/10 rounded-full p-0.5"
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
          顯示 {filteredCount} / {totalCount} 個廠商
        </div>
      </div>
    </div>
  )
}