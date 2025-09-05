/**
 * @fileoverview 專案人員篩選元件
 * 
 * 提供專案人員的多條件篩選功能，包括：
 * - 角色篩選
 * - 部門篩選
 * - 工作狀態篩選
 * - 技能篩選
 * - 工作負載範圍篩選
 * - 加入日期範圍篩選
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { 
  Filter, 
  X, 
  Calendar, 
  Users, 
  Building, 
  Activity,
  Briefcase,
  TrendingUp,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { ProjectMemberSearchParams, WorkStatus } from '@/types/project'

interface FilterOption {
  value: string
  label: string
  count?: number
  icon?: React.ReactNode
}

interface ProjectMemberFiltersProps {
  /** 當前篩選參數 */
  filters: ProjectMemberSearchParams
  /** 篩選變更回調 */
  onFiltersChange: (filters: ProjectMemberSearchParams) => void
  /** 可用的角色選項 */
  roleOptions?: FilterOption[]
  /** 可用的部門選項 */
  departmentOptions?: FilterOption[]
  /** 可用的技能選項 */
  skillOptions?: FilterOption[]
  /** 是否顯示結果計數 */
  showCounts?: boolean
  /** 自訂樣式類名 */
  className?: string
}

// 預設選項
const DEFAULT_ROLE_OPTIONS: FilterOption[] = [
  { value: 'PROJECT_MANAGER', label: '專案經理', icon: <Users className="w-4 h-4" /> },
  { value: 'SENIOR_ENGINEER', label: '資深工程師', icon: <Briefcase className="w-4 h-4" /> },
  { value: 'ENGINEER', label: '工程師', icon: <Briefcase className="w-4 h-4" /> },
  { value: 'COORDINATOR', label: '協調員', icon: <Activity className="w-4 h-4" /> },
  { value: 'ADMIN_STAFF', label: '行政人員', icon: <Building className="w-4 h-4" /> },
  { value: 'SITE_SUPERVISOR', label: '工地主任', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'QA_ENGINEER', label: '品保工程師', icon: <Activity className="w-4 h-4" /> },
]

const DEFAULT_DEPARTMENT_OPTIONS: FilterOption[] = [
  { value: '工程部', label: '工程部', icon: <Building className="w-4 h-4" /> },
  { value: '設計部', label: '設計部', icon: <Building className="w-4 h-4" /> },
  { value: '工務部', label: '工務部', icon: <Building className="w-4 h-4" /> },
  { value: '行政部', label: '行政部', icon: <Building className="w-4 h-4" /> },
  { value: '施工部', label: '施工部', icon: <Building className="w-4 h-4" /> },
  { value: '品保部', label: '品保部', icon: <Building className="w-4 h-4" /> },
]

const WORK_STATUS_OPTIONS: FilterOption[] = [
  { value: 'ACTIVE', label: '活躍', icon: <Activity className="w-4 h-4" /> },
  { value: 'INACTIVE', label: '非活躍', icon: <Activity className="w-4 h-4" /> },
  { value: 'ON_LEAVE', label: '請假中', icon: <Calendar className="w-4 h-4" /> },
  { value: 'BUSY', label: '忙碌', icon: <TrendingUp className="w-4 h-4" /> },
]

/**
 * 專案人員篩選元件
 */
export function ProjectMemberFilters({
  filters,
  onFiltersChange,
  roleOptions = DEFAULT_ROLE_OPTIONS,
  departmentOptions = DEFAULT_DEPARTMENT_OPTIONS,
  skillOptions = [],
  showCounts = false,
  className
}: ProjectMemberFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  // 計算已套用篩選器數量
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.role) count++
    if (filters.department) count++
    if (filters.workStatus) count++
    if (filters.skills && filters.skills.length > 0) count++
    if (filters.workloadRange && (filters.workloadRange.min || filters.workloadRange.max)) count++
    if (filters.joinDateRange && (filters.joinDateRange.start || filters.joinDateRange.end)) count++
    return count
  }, [filters])

  // 更新單個篩選器
  const updateFilter = useCallback((key: keyof ProjectMemberSearchParams, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }, [filters, onFiltersChange])

  // 清除所有篩選器
  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      page: filters.page,
      pageSize: filters.pageSize,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder
    })
  }, [filters.page, filters.pageSize, filters.sortBy, filters.sortOrder, onFiltersChange])

  // 移除特定篩選器
  const removeFilter = useCallback((key: keyof ProjectMemberSearchParams) => {
    const newFilters = { ...filters }
    delete newFilters[key]
    onFiltersChange(newFilters)
  }, [filters, onFiltersChange])

  // 處理技能篩選
  const handleSkillToggle = useCallback((skillValue: string) => {
    const currentSkills = filters.skills || []
    const newSkills = currentSkills.includes(skillValue)
      ? currentSkills.filter(skill => skill !== skillValue)
      : [...currentSkills, skillValue]
    
    updateFilter('skills', newSkills.length > 0 ? newSkills : undefined)
  }, [filters.skills, updateFilter])

  // 處理工作負載範圍變更
  const handleWorkloadRangeChange = useCallback((values: number[]) => {
    updateFilter('workloadRange', {
      min: values[0],
      max: values[1]
    })
  }, [updateFilter])

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* 篩選按鈕 */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className={cn(
              "flex items-center space-x-2",
              activeFiltersCount > 0 && "border-primary"
            )}
          >
            <Filter className="w-4 h-4" />
            <span>篩選</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
            <ChevronDown className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-96 p-0" align="start">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">篩選條件</CardTitle>
                  <CardDescription>
                    設定多個條件來精確查找專案成員
                  </CardDescription>
                </div>
                {activeFiltersCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-xs"
                  >
                    清除全部
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* 角色篩選 */}
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>角色</span>
                </Label>
                <Select
                  value={filters.role || ''}
                  onValueChange={(value) => updateFilter('role', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇角色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部角色</SelectItem>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center space-x-2">
                          {option.icon}
                          <span>{option.label}</span>
                          {showCounts && option.count !== undefined && (
                            <Badge variant="secondary" className="text-xs ml-auto">
                              {option.count}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 部門篩選 */}
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <Building className="w-4 h-4" />
                  <span>部門</span>
                </Label>
                <Select
                  value={filters.department || ''}
                  onValueChange={(value) => updateFilter('department', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇部門" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部部門</SelectItem>
                    {departmentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center space-x-2">
                          {option.icon}
                          <span>{option.label}</span>
                          {showCounts && option.count !== undefined && (
                            <Badge variant="secondary" className="text-xs ml-auto">
                              {option.count}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 工作狀態篩選 */}
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <Activity className="w-4 h-4" />
                  <span>工作狀態</span>
                </Label>
                <Select
                  value={filters.workStatus || ''}
                  onValueChange={(value) => updateFilter('workStatus', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇狀態" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部狀態</SelectItem>
                    {WORK_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center space-x-2">
                          {option.icon}
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 技能篩選 */}
              {skillOptions.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <Briefcase className="w-4 h-4" />
                    <span>技能</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {skillOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`skill-${option.value}`}
                          checked={filters.skills?.includes(option.value) || false}
                          onCheckedChange={() => handleSkillToggle(option.value)}
                        />
                        <Label
                          htmlFor={`skill-${option.value}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 工作負載範圍篩選 */}
              <div className="space-y-3">
                <Label className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>工作負載 (%)</span>
                </Label>
                <div className="px-2">
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[
                      filters.workloadRange?.min || 0,
                      filters.workloadRange?.max || 100
                    ]}
                    onValueChange={handleWorkloadRangeChange}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{filters.workloadRange?.min || 0}%</span>
                    <span>{filters.workloadRange?.max || 100}%</span>
                  </div>
                </div>
              </div>

              {/* 加入日期範圍篩選 */}
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>加入日期</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="start-date" className="text-xs text-gray-500">
                      開始日期
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={filters.joinDateRange?.start || ''}
                      onChange={(e) => updateFilter('joinDateRange', {
                        ...filters.joinDateRange,
                        start: e.target.value || undefined
                      })}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date" className="text-xs text-gray-500">
                      結束日期
                    </Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={filters.joinDateRange?.end || ''}
                      onChange={(e) => updateFilter('joinDateRange', {
                        ...filters.joinDateRange,
                        end: e.target.value || undefined
                      })}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>

      {/* 已套用的篩選標籤 */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center space-x-1 flex-wrap">
          {filters.role && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span className="text-xs">
                角色: {roleOptions.find(r => r.value === filters.role)?.label || filters.role}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter('role')}
                className="h-auto w-auto p-0.5 hover:bg-gray-200"
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}

          {filters.department && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span className="text-xs">部門: {filters.department}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter('department')}
                className="h-auto w-auto p-0.5 hover:bg-gray-200"
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}

          {filters.workStatus && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span className="text-xs">
                狀態: {WORK_STATUS_OPTIONS.find(s => s.value === filters.workStatus)?.label || filters.workStatus}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter('workStatus')}
                className="h-auto w-auto p-0.5 hover:bg-gray-200"
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}

          {filters.skills && filters.skills.length > 0 && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span className="text-xs">技能: {filters.skills.length}項</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter('skills')}
                className="h-auto w-auto p-0.5 hover:bg-gray-200"
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

export default ProjectMemberFilters