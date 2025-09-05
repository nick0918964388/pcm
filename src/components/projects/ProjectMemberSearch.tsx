/**
 * @fileoverview 專案人員搜索元件
 * 
 * 提供專案人員的實時搜索功能，包括：
 * - 實時搜索建議
 * - 防抖輸入
 * - 搜索歷史
 * - 快速篩選標籤
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Search, X, Clock, User, MapPin, Briefcase } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useProjectMemberSearch } from '@/hooks/useProjectMembers'
import { cn } from '@/lib/utils'

interface SearchSuggestion {
  value: string
  label: string
  type: 'user' | 'skill' | 'role' | 'department'
  icon?: React.ReactNode
}

interface ProjectMemberSearchProps {
  /** 專案 ID */
  projectId: string
  /** 搜索值 */
  value: string
  /** 搜索值變更回調 */
  onValueChange: (value: string) => void
  /** 搜索建議選擇回調 */
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void
  /** 是否顯示建議 */
  showSuggestions?: boolean
  /** 佔位符文字 */
  placeholder?: string
  /** 自訂樣式類名 */
  className?: string
}

/**
 * 專案人員搜索元件
 */
export function ProjectMemberSearch({
  projectId,
  value,
  onValueChange,
  onSuggestionSelect,
  showSuggestions = true,
  placeholder = "搜索成員姓名、信箱、部門或技能...",
  className
}: ProjectMemberSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [localValue, setLocalValue] = useState(value)

  // 使用搜索 hook
  const { suggestions, isLoading, search, clearSearch } = useProjectMemberSearch(
    projectId,
    { debounceMs: 300, minLength: 2 }
  )

  // 處理輸入變更
  const handleInputChange = useCallback((newValue: string) => {
    setLocalValue(newValue)
    onValueChange(newValue)
    search(newValue)
    
    if (newValue && showSuggestions) {
      setIsOpen(true)
    }
  }, [onValueChange, search, showSuggestions])

  // 處理建議選擇
  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    setLocalValue(suggestion.value)
    onValueChange(suggestion.value)
    setIsOpen(false)
    
    // 添加到搜索歷史
    setSearchHistory(prev => {
      const newHistory = [suggestion.value, ...prev.filter(item => item !== suggestion.value)]
      return newHistory.slice(0, 5) // 只保留最近 5 條
    })
    
    onSuggestionSelect?.(suggestion)
  }, [onValueChange, onSuggestionSelect])

  // 清除搜索
  const handleClear = useCallback(() => {
    setLocalValue('')
    onValueChange('')
    clearSearch()
    setIsOpen(false)
  }, [onValueChange, clearSearch])

  // 從建議數據生成搜索建議
  const searchSuggestions: SearchSuggestion[] = React.useMemo(() => {
    if (!suggestions || !Array.isArray(suggestions)) return []
    
    return suggestions.map((item: any) => ({
      value: item.value || item.label || '',
      label: item.label || item.value || '',
      type: item.type || 'user',
      icon: getSuggestionIcon(item.type || 'user')
    }))
  }, [suggestions])

  // 獲取建議圖示
  function getSuggestionIcon(type: string) {
    switch (type) {
      case 'user':
        return <User className="w-4 h-4" />
      case 'skill':
        return <Briefcase className="w-4 h-4" />
      case 'role':
        return <Badge className="w-4 h-4" />
      case 'department':
        return <MapPin className="w-4 h-4" />
      default:
        return <Search className="w-4 h-4" />
    }
  }

  // 同步外部 value 變更
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value)
    }
  }, [value, localValue])

  // 載入搜索歷史
  useEffect(() => {
    const savedHistory = localStorage.getItem(`search-history-${projectId}`)
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory))
      } catch (error) {
        console.error('Failed to parse search history:', error)
      }
    }
  }, [projectId])

  // 保存搜索歷史
  useEffect(() => {
    if (searchHistory.length > 0) {
      localStorage.setItem(`search-history-${projectId}`, JSON.stringify(searchHistory))
    }
  }, [searchHistory, projectId])

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={isOpen && showSuggestions} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder={placeholder}
              value={localValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => showSuggestions && setIsOpen(true)}
              className="pl-10 pr-10"
            />
            {localValue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        
        <PopoverContent className="w-full p-0" align="start">
          <Command className="rounded-lg border shadow-md">
            <CommandList className="max-h-64">
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <div className="flex items-center space-x-2 text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500" />
                    <span className="text-sm">搜索中...</span>
                  </div>
                </div>
              )}
              
              {!isLoading && searchSuggestions.length === 0 && localValue.length >= 2 && (
                <CommandEmpty>
                  <div className="text-center py-4">
                    <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">沒有找到相關建議</p>
                  </div>
                </CommandEmpty>
              )}
              
              {/* 搜索建議 */}
              {searchSuggestions.length > 0 && (
                <CommandGroup heading="搜索建議">
                  {searchSuggestions.map((suggestion, index) => (
                    <CommandItem
                      key={`${suggestion.type}-${index}`}
                      value={suggestion.value}
                      onSelect={() => handleSuggestionSelect(suggestion)}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      {suggestion.icon}
                      <span className="flex-1">{suggestion.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {suggestion.type === 'user' ? '成員' : 
                         suggestion.type === 'skill' ? '技能' :
                         suggestion.type === 'role' ? '角色' : '部門'}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {/* 搜索歷史 */}
              {searchHistory.length > 0 && !localValue && (
                <CommandGroup heading="搜索歷史">
                  {searchHistory.map((historyItem, index) => (
                    <CommandItem
                      key={`history-${index}`}
                      value={historyItem}
                      onSelect={() => handleSuggestionSelect({
                        value: historyItem,
                        label: historyItem,
                        type: 'user',
                        icon: <Clock className="w-4 h-4" />
                      })}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="flex-1">{historyItem}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/**
 * 簡化版搜索元件（不含建議功能）
 */
export function SimpleProjectMemberSearch({
  value,
  onValueChange,
  placeholder = "搜索成員...",
  className
}: {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="pl-10"
      />
    </div>
  )
}

export default ProjectMemberSearch