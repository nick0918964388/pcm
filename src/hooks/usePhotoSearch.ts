/**
 * usePhotoSearch Hook
 * 照片搜尋功能的邏輯封裝
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useDebounce } from './useDebounce'
import type { SearchSuggestion, SearchHistory, Photo } from '@/types/photo.types'

interface UsePhotoSearchOptions {
  photos: Photo[]
  debounceMs?: number
  maxSuggestions?: number
  maxHistory?: number
}

interface UsePhotoSearchReturn {
  // 搜尋狀態
  query: string
  suggestions: SearchSuggestion[]
  searchHistory: SearchHistory[]
  showSuggestions: boolean
  selectedIndex: number

  // 搜尋操作
  setQuery: (query: string) => void
  executeSearch: (query?: string) => void
  clearSearch: () => void

  // 建議操作
  selectSuggestion: (suggestion: SearchSuggestion) => void
  setSuggestionVisibility: (visible: boolean) => void
  setSelectedIndex: (index: number) => void

  // 歷史操作
  selectFromHistory: (history: SearchHistory) => void
  clearHistory: () => void

  // 工具函式
  generateSuggestions: (inputQuery: string) => SearchSuggestion[]
}

const STORAGE_KEY = 'photo-search-history'

export const usePhotoSearch = ({
  photos,
  debounceMs = 300,
  maxSuggestions = 8,
  maxHistory = 10
}: UsePhotoSearchOptions): UsePhotoSearchReturn => {
  // 狀態管理
  const [query, setQueryState] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // 防抖的查詢
  const debouncedQuery = useDebounce(query, debounceMs)

  // 載入搜尋歷史
  useEffect(() => {
    const loadHistory = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          const history = parsed.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }))
          setSearchHistory(history)
        }
      } catch (error) {
        console.warn('Failed to load search history:', error)
      }
    }

    loadHistory()
  }, [])

  // 儲存搜尋歷史
  const saveHistory = useCallback((history: SearchHistory[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    } catch (error) {
      console.warn('Failed to save search history:', error)
    }
  }, [])

  // 生成搜尋建議 - 使用 useMemo 優化效能
  const generateSuggestions = useCallback((inputQuery: string): SearchSuggestion[] => {
    if (!inputQuery || inputQuery.length < 2) return []

    const queryLower = inputQuery.toLowerCase()
    const suggestionMap = new Map<string, SearchSuggestion>()

    // 從檔名中提取建議
    photos.forEach(photo => {
      const fileName = photo.fileName.toLowerCase()
      if (fileName.includes(queryLower)) {
        // 提取相關詞彙
        const words = fileName
          .split(/[._-\s]+/)
          .filter(word => word.length > 2 && word.includes(queryLower))

        words.forEach(word => {
          if (!suggestionMap.has(word)) {
            const count = photos.filter(p =>
              p.fileName.toLowerCase().includes(word)
            ).length

            suggestionMap.set(word, {
              id: `filename-${word}`,
              query: word,
              type: 'filename',
              count
            })
          }
        })
      }
    })

    // 從標籤中提取建議
    photos.forEach(photo => {
      photo.metadata.tags?.forEach(tag => {
        const tagLower = tag.toLowerCase()
        if (tagLower.includes(queryLower) && !suggestionMap.has(tagLower)) {
          const count = photos.filter(p =>
            p.metadata.tags?.some(t => t.toLowerCase() === tagLower)
          ).length

          suggestionMap.set(tagLower, {
            id: `tag-${tagLower}`,
            query: tag,
            type: 'tag',
            count
          })
        }
      })
    })

    // 從描述中提取建議
    photos.forEach(photo => {
      if (photo.metadata.description?.toLowerCase().includes(queryLower)) {
        const words = photo.metadata.description.toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 2 && word.includes(queryLower))

        words.forEach(word => {
          if (!suggestionMap.has(word)) {
            const count = photos.filter(p =>
              p.metadata.description?.toLowerCase().includes(word)
            ).length

            suggestionMap.set(word, {
              id: `description-${word}`,
              query: word,
              type: 'description',
              count
            })
          }
        })
      }
    })

    // 加入相關的搜尋歷史
    searchHistory
      .filter(history => history.query.toLowerCase().includes(queryLower))
      .slice(0, 3)
      .forEach(history => {
        if (!suggestionMap.has(history.query.toLowerCase())) {
          suggestionMap.set(history.query.toLowerCase(), {
            id: `history-${history.id}`,
            query: history.query,
            type: 'history',
            count: history.resultCount,
            lastUsed: history.timestamp
          })
        }
      })

    // 轉換為陣列並排序
    const results = Array.from(suggestionMap.values())
      .sort((a, b) => {
        // 優先級：完全匹配 > 標籤 > 歷史 > 檔名 > 描述
        const getPriority = (suggestion: SearchSuggestion) => {
          if (suggestion.query.toLowerCase() === queryLower) return 0
          if (suggestion.type === 'tag') return 1
          if (suggestion.type === 'history') return 2
          if (suggestion.type === 'filename') return 3
          return 4
        }

        const priorityA = getPriority(a)
        const priorityB = getPriority(b)

        if (priorityA !== priorityB) {
          return priorityA - priorityB
        }

        // 相同優先級按計數排序
        return (b.count || 0) - (a.count || 0)
      })
      .slice(0, maxSuggestions)

    return results
  }, [photos, searchHistory, maxSuggestions])

  // 當防抖查詢改變時自動更新建議
  useEffect(() => {
    if (debouncedQuery) {
      const newSuggestions = generateSuggestions(debouncedQuery)
      setSuggestions(newSuggestions)
      setShowSuggestions(newSuggestions.length > 0)
      setSelectedIndex(-1)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }
  }, [debouncedQuery, generateSuggestions])

  // 設置查詢（建議會自動更新）
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery)
  }, [])

  // 執行搜尋
  const executeSearch = useCallback((searchQuery?: string) => {
    const finalQuery = searchQuery || query
    if (!finalQuery.trim()) return

    // 計算結果數量（這裡需要實際的搜尋邏輯）
    const resultCount = photos.filter(photo =>
      photo.fileName.toLowerCase().includes(finalQuery.toLowerCase()) ||
      photo.metadata.description?.toLowerCase().includes(finalQuery.toLowerCase()) ||
      photo.metadata.tags?.some(tag =>
        tag.toLowerCase().includes(finalQuery.toLowerCase())
      )
    ).length

    // 加入搜尋歷史
    const newHistoryItem: SearchHistory = {
      id: `history-${Date.now()}`,
      query: finalQuery,
      timestamp: new Date(),
      resultCount
    }

    const updatedHistory = [
      newHistoryItem,
      ...searchHistory.filter(h => h.query !== finalQuery)
    ].slice(0, maxHistory)

    setSearchHistory(updatedHistory)
    saveHistory(updatedHistory)
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }, [query, photos, searchHistory, maxHistory, saveHistory])

  // 清除搜尋
  const clearSearch = useCallback(() => {
    setQueryState('')
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }, [])

  // 選擇建議
  const selectSuggestion = useCallback((suggestion: SearchSuggestion) => {
    setQueryState(suggestion.query)
    executeSearch(suggestion.query)
  }, [executeSearch])

  // 設置建議可見性
  const setSuggestionVisibility = useCallback((visible: boolean) => {
    setShowSuggestions(visible)
    if (!visible) {
      setSelectedIndex(-1)
    }
  }, [])

  // 從歷史選擇
  const selectFromHistory = useCallback((history: SearchHistory) => {
    setQueryState(history.query)
    executeSearch(history.query)
  }, [executeSearch])

  // 清除歷史
  const clearHistory = useCallback(() => {
    setSearchHistory([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear search history:', error)
    }
  }, [])

  return {
    // 狀態
    query,
    suggestions,
    searchHistory,
    showSuggestions,
    selectedIndex,

    // 操作
    setQuery,
    executeSearch,
    clearSearch,
    selectSuggestion,
    setSuggestionVisibility,
    setSelectedIndex,
    selectFromHistory,
    clearHistory,

    // 工具
    generateSuggestions
  }
}