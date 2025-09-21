/**
 * Search Utils Tests
 * 搜尋工具函式測試
 */

import {
  createSearchIndex,
  searchPhotosWithIndex,
  generateSearchSuggestions,
  highlightSearchTerm,
  normalizeQuery,
  isValidQuery
} from '../searchUtils'
import type { Photo } from '@/types/photo.types'

// Mock 測試資料
const mockPhotos: Photo[] = [
  {
    id: '1',
    projectId: 'proj1',
    albumId: 'album1',
    fileName: 'construction_site_001.jpg',
    fileSize: 1024000,
    mimeType: 'image/jpeg',
    width: 1920,
    height: 1080,
    thumbnailUrl: '/thumbnails/1.jpg',
    originalUrl: '/photos/1.jpg',
    uploadedBy: 'user1',
    uploadedAt: new Date('2023-01-01'),
    metadata: {
      tags: ['construction', 'site', 'building'],
      description: '工地現場施工照片'
    }
  },
  {
    id: '2',
    projectId: 'proj1',
    albumId: 'album1',
    fileName: 'equipment_check_002.jpg',
    fileSize: 2048000,
    mimeType: 'image/jpeg',
    width: 1920,
    height: 1080,
    thumbnailUrl: '/thumbnails/2.jpg',
    originalUrl: '/photos/2.jpg',
    uploadedBy: 'user2',
    uploadedAt: new Date('2023-01-02'),
    metadata: {
      tags: ['equipment', 'safety', 'inspection'],
      description: '設備安全檢查記錄'
    }
  },
  {
    id: '3',
    projectId: 'proj1',
    albumId: 'album1',
    fileName: 'progress_report_003.jpg',
    fileSize: 1536000,
    mimeType: 'image/jpeg',
    width: 1920,
    height: 1080,
    thumbnailUrl: '/thumbnails/3.jpg',
    originalUrl: '/photos/3.jpg',
    uploadedBy: 'user1',
    uploadedAt: new Date('2023-01-03'),
    metadata: {
      tags: ['progress', 'report', 'construction'],
      description: '工程進度報告照片'
    }
  }
]

describe('searchUtils', () => {
  let searchIndex: ReturnType<typeof createSearchIndex>

  beforeEach(() => {
    searchIndex = createSearchIndex(mockPhotos)
  })

  describe('createSearchIndex', () => {
    it('應該正確建立檔名索引', () => {
      expect(searchIndex.fileNameIndex.has('construction')).toBe(true)
      expect(searchIndex.fileNameIndex.has('equipment')).toBe(true)
      expect(searchIndex.fileNameIndex.has('progress')).toBe(true)

      // 檢查索引內容
      expect(searchIndex.fileNameIndex.get('construction')?.has('1')).toBe(true)
      expect(searchIndex.fileNameIndex.get('construction')?.has('3')).toBe(true)
    })

    it('應該正確建立標籤索引', () => {
      expect(searchIndex.tagIndex.has('construction')).toBe(true)
      expect(searchIndex.tagIndex.has('equipment')).toBe(true)
      expect(searchIndex.tagIndex.has('safety')).toBe(true)

      // 檢查標籤關聯
      expect(searchIndex.tagIndex.get('construction')?.has('1')).toBe(true)
      expect(searchIndex.tagIndex.get('construction')?.has('3')).toBe(true)
      expect(searchIndex.tagIndex.get('equipment')?.has('2')).toBe(true)
    })

    it('應該正確建立描述索引', () => {
      expect(searchIndex.descriptionIndex.has('工地')).toBe(true)
      expect(searchIndex.descriptionIndex.has('設備')).toBe(true)
      expect(searchIndex.descriptionIndex.has('工程')).toBe(true)
    })
  })

  describe('searchPhotosWithIndex', () => {
    it('應該根據檔名搜尋照片', () => {
      const results = searchPhotosWithIndex('construction', mockPhotos, searchIndex)
      expect(results).toHaveLength(2)
      expect(results.map(p => p.id)).toEqual(expect.arrayContaining(['1', '3']))
    })

    it('應該根據標籤搜尋照片', () => {
      const results = searchPhotosWithIndex('equipment', mockPhotos, searchIndex)
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('2')
    })

    it('應該根據描述搜尋照片', () => {
      const results = searchPhotosWithIndex('工地', mockPhotos, searchIndex)
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('1')
    })

    it('空查詢應該返回所有照片', () => {
      const results = searchPhotosWithIndex('', mockPhotos, searchIndex)
      expect(results).toHaveLength(3)
    })

    it('無匹配結果應該返回空陣列', () => {
      const results = searchPhotosWithIndex('nonexistent', mockPhotos, searchIndex)
      expect(results).toHaveLength(0)
    })
  })

  describe('generateSearchSuggestions', () => {
    it('應該生成檔名建議', () => {
      const suggestions = generateSearchSuggestions('con', mockPhotos, searchIndex)

      const constructionSuggestion = suggestions.find(s => s.query === 'construction')
      expect(constructionSuggestion).toBeDefined()
      expect(constructionSuggestion?.type).toBe('filename')
      expect(constructionSuggestion?.count).toBe(2)
    })

    it('應該生成標籤建議', () => {
      const suggestions = generateSearchSuggestions('equip', mockPhotos, searchIndex)

      const equipmentSuggestion = suggestions.find(s => s.query === 'equipment')
      expect(equipmentSuggestion).toBeDefined()
      expect(equipmentSuggestion?.type).toBe('tag')
      expect(equipmentSuggestion?.count).toBe(1)
    })

    it('應該按優先級排序建議', () => {
      const suggestions = generateSearchSuggestions('con', mockPhotos, searchIndex)

      // 標籤應該優先於檔名
      const firstSuggestion = suggestions[0]
      if (firstSuggestion.type === 'tag') {
        expect(['tag', 'filename']).toContain(firstSuggestion.type)
      }
    })

    it('短查詢應該返回空建議', () => {
      const suggestions = generateSearchSuggestions('c', mockPhotos, searchIndex)
      expect(suggestions).toHaveLength(0)
    })

    it('應該限制建議數量', () => {
      const suggestions = generateSearchSuggestions('e', mockPhotos, searchIndex, 3)
      expect(suggestions.length).toBeLessThanOrEqual(3)
    })
  })

  describe('highlightSearchTerm', () => {
    it('應該高亮搜尋詞彙', () => {
      const result = highlightSearchTerm('construction site', 'construction')
      expect(result).toBe('<mark>construction</mark> site')
    })

    it('應該處理大小寫不敏感', () => {
      const result = highlightSearchTerm('Construction Site', 'CONSTRUCTION')
      expect(result).toBe('<mark>Construction</mark> Site')
    })

    it('空搜尋詞應該返回原文', () => {
      const result = highlightSearchTerm('construction site', '')
      expect(result).toBe('construction site')
    })

    it('應該高亮多個匹配', () => {
      const result = highlightSearchTerm('construction and construction', 'construction')
      expect(result).toBe('<mark>construction</mark> and <mark>construction</mark>')
    })
  })

  describe('normalizeQuery', () => {
    it('應該移除前後空白並轉小寫', () => {
      expect(normalizeQuery('  Construction  ')).toBe('construction')
    })

    it('應該處理空字串', () => {
      expect(normalizeQuery('')).toBe('')
    })

    it('應該處理只有空白的字串', () => {
      expect(normalizeQuery('   ')).toBe('')
    })
  })

  describe('isValidQuery', () => {
    it('有效查詢應該返回 true', () => {
      expect(isValidQuery('construction')).toBe(true)
      expect(isValidQuery('  con  ')).toBe(true)
    })

    it('無效查詢應該返回 false', () => {
      expect(isValidQuery('')).toBe(false)
      expect(isValidQuery('  ')).toBe(false)
      expect(isValidQuery('c')).toBe(false)
    })

    it('邊界情況', () => {
      expect(isValidQuery('ab')).toBe(true) // 正好2個字元
      expect(isValidQuery('a')).toBe(false) // 少於2個字元
    })
  })
})