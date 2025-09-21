/**
 * usePhotoSearch Hook Tests
 * 照片搜尋 Hook 測試
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { usePhotoSearch } from '../usePhotoSearch'
import type { Photo } from '@/types/photo.types'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock as any

// Mock 測試資料
const mockPhotos: Photo[] = [
  {
    id: '1',
    projectId: 'proj1',
    albumId: 'album1',
    fileName: 'construction_site.jpg',
    fileSize: 1024000,
    mimeType: 'image/jpeg',
    width: 1920,
    height: 1080,
    thumbnailUrl: '/thumbnails/1.jpg',
    originalUrl: '/photos/1.jpg',
    uploadedBy: 'user1',
    uploadedAt: new Date('2023-01-01'),
    metadata: {
      tags: ['construction', 'site'],
      description: '工地現場照片'
    }
  },
  {
    id: '2',
    projectId: 'proj1',
    albumId: 'album1',
    fileName: 'equipment_check.jpg',
    fileSize: 2048000,
    mimeType: 'image/jpeg',
    width: 1920,
    height: 1080,
    thumbnailUrl: '/thumbnails/2.jpg',
    originalUrl: '/photos/2.jpg',
    uploadedBy: 'user2',
    uploadedAt: new Date('2023-01-02'),
    metadata: {
      tags: ['equipment', 'safety'],
      description: '設備檢查照片'
    }
  }
]

describe('usePhotoSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('應該初始化預設狀態', () => {
    const { result } = renderHook(() =>
      usePhotoSearch({ photos: mockPhotos })
    )

    expect(result.current.query).toBe('')
    expect(result.current.suggestions).toEqual([])
    expect(result.current.searchHistory).toEqual([])
    expect(result.current.showSuggestions).toBe(false)
    expect(result.current.selectedIndex).toBe(-1)
  })

  it('應該載入搜尋歷史', () => {
    const mockHistory = [
      {
        id: 'history-1',
        query: 'construction',
        timestamp: '2023-01-01T00:00:00.000Z',
        resultCount: 1
      }
    ]

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockHistory))

    const { result } = renderHook(() =>
      usePhotoSearch({ photos: mockPhotos })
    )

    expect(result.current.searchHistory).toHaveLength(1)
    expect(result.current.searchHistory[0].query).toBe('construction')
  })

  it('應該設置查詢並生成建議', async () => {
    const { result } = renderHook(() =>
      usePhotoSearch({ photos: mockPhotos, debounceMs: 0 })
    )

    act(() => {
      result.current.setQuery('construction')
    })

    expect(result.current.query).toBe('construction')

    // 等待防抖完成
    await waitFor(() => {
      expect(result.current.suggestions.length).toBeGreaterThan(0)
    })

    expect(result.current.showSuggestions).toBe(true)
  })

  it('應該執行搜尋並保存歷史', () => {
    const { result } = renderHook(() =>
      usePhotoSearch({ photos: mockPhotos })
    )

    act(() => {
      result.current.setQuery('construction')
      result.current.executeSearch()
    })

    expect(result.current.searchHistory).toHaveLength(1)
    expect(result.current.searchHistory[0].query).toBe('construction')
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('應該選擇建議', async () => {
    const { result } = renderHook(() =>
      usePhotoSearch({ photos: mockPhotos, debounceMs: 0 })
    )

    act(() => {
      result.current.setQuery('con')
    })

    await waitFor(() => {
      expect(result.current.suggestions.length).toBeGreaterThan(0)
    })

    const firstSuggestion = result.current.suggestions[0]

    act(() => {
      result.current.selectSuggestion(firstSuggestion)
    })

    expect(result.current.query).toBe(firstSuggestion.query)
    expect(result.current.searchHistory).toHaveLength(1)
  })

  it('應該清除搜尋', () => {
    const { result } = renderHook(() =>
      usePhotoSearch({ photos: mockPhotos })
    )

    act(() => {
      result.current.setQuery('construction')
    })

    expect(result.current.query).toBe('construction')

    act(() => {
      result.current.clearSearch()
    })

    expect(result.current.query).toBe('')
    expect(result.current.suggestions).toEqual([])
    expect(result.current.showSuggestions).toBe(false)
  })

  it('應該從歷史選擇', () => {
    const mockHistory = [
      {
        id: 'history-1',
        query: 'equipment',
        timestamp: new Date('2023-01-01'),
        resultCount: 1
      }
    ]

    localStorageMock.getItem.mockReturnValue(JSON.stringify([
      {
        id: 'history-1',
        query: 'equipment',
        timestamp: '2023-01-01T00:00:00.000Z',
        resultCount: 1
      }
    ]))

    const { result } = renderHook(() =>
      usePhotoSearch({ photos: mockPhotos })
    )

    act(() => {
      result.current.selectFromHistory(mockHistory[0])
    })

    expect(result.current.query).toBe('equipment')
    expect(result.current.searchHistory).toHaveLength(2) // 原有 + 新增
  })

  it('應該生成正確的建議', async () => {
    const { result } = renderHook(() =>
      usePhotoSearch({ photos: mockPhotos, debounceMs: 0 })
    )

    const suggestions = result.current.generateSuggestions('con')

    expect(suggestions.length).toBeGreaterThan(0)

    const constructionSuggestion = suggestions.find(s =>
      s.query.includes('construction')
    )
    expect(constructionSuggestion).toBeDefined()
  })

  it('應該限制歷史數量', () => {
    const { result } = renderHook(() =>
      usePhotoSearch({ photos: mockPhotos, maxHistory: 2 })
    )

    // 執行多次搜尋
    act(() => {
      result.current.setQuery('query1')
      result.current.executeSearch()
    })

    act(() => {
      result.current.setQuery('query2')
      result.current.executeSearch()
    })

    act(() => {
      result.current.setQuery('query3')
      result.current.executeSearch()
    })

    expect(result.current.searchHistory).toHaveLength(2)
  })

  it('應該防止重複的歷史項目', () => {
    const { result } = renderHook(() =>
      usePhotoSearch({ photos: mockPhotos })
    )

    // 執行相同查詢兩次
    act(() => {
      result.current.setQuery('construction')
      result.current.executeSearch()
    })

    act(() => {
      result.current.setQuery('construction')
      result.current.executeSearch()
    })

    expect(result.current.searchHistory).toHaveLength(1)
    expect(result.current.searchHistory[0].query).toBe('construction')
  })

  it('應該清除歷史', () => {
    const { result } = renderHook(() =>
      usePhotoSearch({ photos: mockPhotos })
    )

    act(() => {
      result.current.setQuery('construction')
      result.current.executeSearch()
    })

    expect(result.current.searchHistory).toHaveLength(1)

    act(() => {
      result.current.clearHistory()
    })

    expect(result.current.searchHistory).toHaveLength(0)
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('photo-search-history')
  })

  it('應該處理無效的 localStorage 資料', () => {
    localStorageMock.getItem.mockReturnValue('invalid-json')

    const { result } = renderHook(() =>
      usePhotoSearch({ photos: mockPhotos })
    )

    // 應該不會拋出錯誤，並保持空歷史
    expect(result.current.searchHistory).toEqual([])
  })
})