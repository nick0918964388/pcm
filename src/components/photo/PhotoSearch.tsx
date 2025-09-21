/**
 * PhotoSearch Component
 * 照片搜尋元件 - 提供即時搜尋、建議和歷史記錄功能
 */

'use client'

import React, { useRef, useEffect } from 'react'
import { Search, X, Clock, History } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { usePhotoStore } from '@/stores/photoStore'
import { usePhotoSearch } from '@/hooks/usePhotoSearch'
import { cn } from '@/lib/utils'

interface PhotoSearchProps {
  className?: string
  placeholder?: string
  onSearch?: (query: string) => void
}

export const PhotoSearch: React.FC<PhotoSearchProps> = ({
  className,
  placeholder = '搜尋照片...',
  onSearch
}) => {
  const { setFilters, getFilteredPhotos, photos } = usePhotoStore()

  // 使用搜尋 Hook
  const {
    query,
    suggestions,
    searchHistory,
    showSuggestions,
    selectedIndex,
    setQuery,
    executeSearch,
    clearSearch,
    selectSuggestion,
    setSuggestionVisibility,
    setSelectedIndex,
    selectFromHistory
  } = usePhotoSearch({ photos })

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // 當搜尋執行時，更新 store 的 filters
  useEffect(() => {
    if (query) {
      setFilters({ searchQuery: query })
      onSearch?.(query)
    } else {
      setFilters({ searchQuery: '' })
    }
  }, [query, setFilters, onSearch])

  // 處理輸入變化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }

  // 處理搜尋提交
  const handleSearch = () => {
    executeSearch()
  }

  // 處理建議選擇
  const handleSuggestionClick = (suggestion: any) => {
    selectSuggestion(suggestion)
  }

  // 處理歷史選擇
  const handleHistoryClick = (history: any) => {
    selectFromHistory(history)
  }

  // 清除搜尋
  const handleClear = () => {
    clearSearch()
    inputRef.current?.focus()
  }

  // 鍵盤導航
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(
          selectedIndex < suggestions.length - 1 ? selectedIndex + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(
          selectedIndex > 0 ? selectedIndex - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex])
        } else {
          handleSearch()
        }
        break
      case 'Escape':
        setSuggestionVisibility(false)
        break
    }
  }

  // 獲取搜尋結果統計
  const filteredPhotos = getFilteredPhotos()
  const resultCount = filteredPhotos.length

  return (
    <div className={cn('relative w-full max-w-md', className)}>
      {/* 搜尋輸入框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />

        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-20"
          aria-label="搜尋照片"
          aria-expanded={showSuggestions}
          aria-autocomplete="list"
          role="combobox"
        />

        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {/* 搜尋歷史按鈕 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                aria-label="搜尋歷史"
              >
                <History className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="end">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">最近搜尋</div>
                {searchHistory.length > 0 ? (
                  <div className="space-y-1">
                    {searchHistory.slice(0, 5).map((history) => (
                      <button
                        key={history.id}
                        onClick={() => handleHistoryClick(history)}
                        className="w-full text-left p-2 rounded hover:bg-muted flex items-center justify-between"
                      >
                        <span className="text-sm">{history.query}</span>
                        <Badge variant="secondary" className="text-xs">
                          {history.resultCount}
                        </Badge>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-2">
                    沒有搜尋歷史
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* 清除按鈕 */}
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 w-7 p-0"
              aria-label="清除搜尋"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* 搜尋建議下拉列表 */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full mt-1 w-full bg-background border rounded-md shadow-md z-10 max-h-60 overflow-y-auto"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                'w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between',
                index === selectedIndex && 'bg-muted highlighted'
              )}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <div className="flex items-center gap-2">
                {suggestion.type === 'history' && (
                  <Clock className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="text-sm">{suggestion.query}</span>
                {suggestion.type === 'tag' && (
                  <Badge variant="outline" className="text-xs">
                    標籤
                  </Badge>
                )}
              </div>
              {suggestion.count && (
                <Badge variant="secondary" className="text-xs">
                  {suggestion.count}
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 搜尋結果統計 */}
      {query && (
        <div className="mt-2 text-xs text-muted-foreground">
          {resultCount > 0 ? (
            `找到 ${resultCount} 張照片`
          ) : (
            '沒有找到符合的照片'
          )}
        </div>
      )}
    </div>
  )
}