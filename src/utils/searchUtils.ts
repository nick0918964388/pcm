/**
 * Search Utilities
 * 搜尋相關的工具函式
 */

import type { Photo, SearchSuggestion } from '@/types/photo.types'

// 搜尋索引類型
interface SearchIndex {
  fileNameIndex: Map<string, Set<string>>
  tagIndex: Map<string, Set<string>>
  descriptionIndex: Map<string, Set<string>>
}

/**
 * 建立搜尋索引以提升搜尋效能
 */
export function createSearchIndex(photos: Photo[]): SearchIndex {
  const fileNameIndex = new Map<string, Set<string>>()
  const tagIndex = new Map<string, Set<string>>()
  const descriptionIndex = new Map<string, Set<string>>()

  photos.forEach(photo => {
    // 索引檔名
    const fileName = photo.fileName.toLowerCase()
    const fileWords = fileName.split(/[._-\s]+/).filter(word => word.length > 2)

    fileWords.forEach(word => {
      if (!fileNameIndex.has(word)) {
        fileNameIndex.set(word, new Set())
      }
      fileNameIndex.get(word)!.add(photo.id)
    })

    // 索引標籤
    photo.metadata.tags?.forEach(tag => {
      const tagLower = tag.toLowerCase()
      if (!tagIndex.has(tagLower)) {
        tagIndex.set(tagLower, new Set())
      }
      tagIndex.get(tagLower)!.add(photo.id)
    })

    // 索引描述
    if (photo.metadata.description) {
      const description = photo.metadata.description.toLowerCase()
      const descWords = description.split(/\s+/).filter(word => word.length > 2)

      descWords.forEach(word => {
        if (!descriptionIndex.has(word)) {
          descriptionIndex.set(word, new Set())
        }
        descriptionIndex.get(word)!.add(photo.id)
      })
    }
  })

  return { fileNameIndex, tagIndex, descriptionIndex }
}

/**
 * 使用索引搜尋照片
 */
export function searchPhotosWithIndex(
  query: string,
  photos: Photo[],
  index: SearchIndex
): Photo[] {
  if (!query.trim()) return photos

  const queryLower = query.toLowerCase()
  const resultIds = new Set<string>()

  // 搜尋檔名索引
  index.fileNameIndex.forEach((photoIds, term) => {
    if (term.includes(queryLower)) {
      photoIds.forEach(id => resultIds.add(id))
    }
  })

  // 搜尋標籤索引
  index.tagIndex.forEach((photoIds, term) => {
    if (term.includes(queryLower)) {
      photoIds.forEach(id => resultIds.add(id))
    }
  })

  // 搜尋描述索引
  index.descriptionIndex.forEach((photoIds, term) => {
    if (term.includes(queryLower)) {
      photoIds.forEach(id => resultIds.add(id))
    }
  })

  // 轉換為照片物件
  const photoMap = new Map(photos.map(p => [p.id, p]))
  return Array.from(resultIds)
    .map(id => photoMap.get(id))
    .filter((photo): photo is Photo => photo !== undefined)
}

/**
 * 生成高效能搜尋建議
 */
export function generateSearchSuggestions(
  query: string,
  photos: Photo[],
  index: SearchIndex,
  maxSuggestions: number = 8
): SearchSuggestion[] {
  if (!query || query.length < 2) return []

  const queryLower = query.toLowerCase()
  const suggestionMap = new Map<string, SearchSuggestion>()

  // 從檔名索引中找建議
  index.fileNameIndex.forEach((photoIds, term) => {
    if (term.includes(queryLower) && !suggestionMap.has(term)) {
      suggestionMap.set(term, {
        id: `filename-${term}`,
        query: term,
        type: 'filename',
        count: photoIds.size
      })
    }
  })

  // 從標籤索引中找建議
  index.tagIndex.forEach((photoIds, term) => {
    if (term.includes(queryLower) && !suggestionMap.has(term)) {
      suggestionMap.set(term, {
        id: `tag-${term}`,
        query: term,
        type: 'tag',
        count: photoIds.size
      })
    }
  })

  // 從描述索引中找建議
  index.descriptionIndex.forEach((photoIds, term) => {
    if (term.includes(queryLower) && !suggestionMap.has(term)) {
      suggestionMap.set(term, {
        id: `description-${term}`,
        query: term,
        type: 'description',
        count: photoIds.size
      })
    }
  })

  // 排序和限制結果
  return Array.from(suggestionMap.values())
    .sort((a, b) => {
      // 優先級：完全匹配 > 標籤 > 檔名 > 描述
      const getPriority = (suggestion: SearchSuggestion) => {
        if (suggestion.query === queryLower) return 0
        if (suggestion.type === 'tag') return 1
        if (suggestion.type === 'filename') return 2
        return 3
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
}

/**
 * 高亮搜尋結果
 */
export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) return text

  const regex = new RegExp(`(${searchTerm})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

/**
 * 搜尋查詢正規化
 */
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

/**
 * 檢查查詢是否有效
 */
export function isValidQuery(query: string): boolean {
  return query.trim().length >= 2
}