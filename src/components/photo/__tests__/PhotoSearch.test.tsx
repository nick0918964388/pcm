/**
 * PhotoSearch Component Tests
 * 照片搜尋元件測試 - TDD RED Phase
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoSearch } from '../PhotoSearch'
import { usePhotoStore } from '@/stores/photoStore'
import type { Photo, SearchSuggestion } from '@/types/photo.types'

// Mock usePhotoStore
jest.mock('@/stores/photoStore')
const mockUsePhotoStore = usePhotoStore as jest.MockedFunction<typeof usePhotoStore>

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

const mockSuggestions: SearchSuggestion[] = [
  {
    id: '1',
    query: 'construction',
    type: 'tag',
    count: 5
  },
  {
    id: '2',
    query: 'equipment',
    type: 'tag',
    count: 3
  }
]

describe('PhotoSearch', () => {
  const mockSetFilters = jest.fn()
  const mockGetFilteredPhotos = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    mockUsePhotoStore.mockReturnValue({
      photos: mockPhotos,
      filters: {},
      setFilters: mockSetFilters,
      getFilteredPhotos: mockGetFilteredPhotos,
      // 其他必要屬性的 mock 值
      albums: [],
      uploadQueue: [],
      currentAlbumId: null,
      viewMode: 'grid',
      sortBy: 'uploadedAt',
      sortOrder: 'desc',
      isLoading: false,
      error: null,
      _filteredPhotosCache: null,
      _cacheKey: null,
      setPhotos: jest.fn(),
      addPhoto: jest.fn(),
      removePhoto: jest.fn(),
      updatePhoto: jest.fn(),
      setAlbums: jest.fn(),
      setCurrentAlbum: jest.fn(),
      clearFilters: jest.fn(),
      addToUploadQueue: jest.fn(),
      updateUploadProgress: jest.fn(),
      removeFromUploadQueue: jest.fn(),
      setViewMode: jest.fn(),
      setSorting: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      reset: jest.fn()
    })
  })

  describe('基本搜尋功能', () => {
    it('應該渲染搜尋輸入框', () => {
      render(<PhotoSearch />)

      const searchInput = screen.getByPlaceholderText(/搜尋照片/i)
      expect(searchInput).toBeInTheDocument()
    })

    it('應該在輸入時更新搜尋查詢', async () => {
      const user = userEvent.setup()
      render(<PhotoSearch />)

      const searchInput = screen.getByPlaceholderText(/搜尋照片/i)

      await user.type(searchInput, 'construction')

      expect(searchInput).toHaveValue('construction')
    })

    it('應該在輸入時觸發即時搜尋', async () => {
      const user = userEvent.setup()
      render(<PhotoSearch />)

      const searchInput = screen.getByPlaceholderText(/搜尋照片/i)

      await user.type(searchInput, 'construction')

      await waitFor(() => {
        expect(mockSetFilters).toHaveBeenCalledWith({
          searchQuery: 'construction'
        })
      })
    })
  })

  describe('搜尋建議功能', () => {
    it('應該在輸入時顯示搜尋建議', async () => {
      const user = userEvent.setup()
      render(<PhotoSearch />)

      const searchInput = screen.getByPlaceholderText(/搜尋照片/i)

      await user.type(searchInput, 'con')

      await waitFor(() => {
        expect(screen.getByText('construction')).toBeInTheDocument()
      })
    })

    it('應該能夠點擊建議項目', async () => {
      const user = userEvent.setup()
      render(<PhotoSearch />)

      const searchInput = screen.getByPlaceholderText(/搜尋照片/i)

      await user.type(searchInput, 'con')

      await waitFor(() => {
        const suggestion = screen.getByText('construction')
        return user.click(suggestion)
      })

      expect(searchInput).toHaveValue('construction')
      expect(mockSetFilters).toHaveBeenCalledWith({
        searchQuery: 'construction'
      })
    })
  })

  describe('搜尋歷史功能', () => {
    it('應該顯示搜尋歷史按鈕', () => {
      render(<PhotoSearch />)

      const historyButton = screen.getByRole('button', { name: /搜尋歷史/i })
      expect(historyButton).toBeInTheDocument()
    })

    it('應該在點擊歷史按鈕時顯示歷史列表', async () => {
      const user = userEvent.setup()
      render(<PhotoSearch />)

      const historyButton = screen.getByRole('button', { name: /搜尋歷史/i })
      await user.click(historyButton)

      expect(screen.getByText(/最近搜尋/i)).toBeInTheDocument()
    })

    it('應該能夠從歷史列表選擇查詢', async () => {
      const user = userEvent.setup()
      render(<PhotoSearch />)

      const historyButton = screen.getByRole('button', { name: /搜尋歷史/i })
      await user.click(historyButton)

      // 假設歷史中有 'equipment' 查詢
      const historyItem = screen.getByText('equipment')
      await user.click(historyItem)

      const searchInput = screen.getByPlaceholderText(/搜尋照片/i)
      expect(searchInput).toHaveValue('equipment')
    })
  })

  describe('清除搜尋功能', () => {
    it('應該顯示清除按鈕當有搜尋查詢時', async () => {
      const user = userEvent.setup()
      render(<PhotoSearch />)

      const searchInput = screen.getByPlaceholderText(/搜尋照片/i)
      await user.type(searchInput, 'test')

      const clearButton = screen.getByRole('button', { name: /清除搜尋/i })
      expect(clearButton).toBeInTheDocument()
    })

    it('應該在點擊清除按鈕時清空搜尋', async () => {
      const user = userEvent.setup()
      render(<PhotoSearch />)

      const searchInput = screen.getByPlaceholderText(/搜尋照片/i)
      await user.type(searchInput, 'test')

      const clearButton = screen.getByRole('button', { name: /清除搜尋/i })
      await user.click(clearButton)

      expect(searchInput).toHaveValue('')
      expect(mockSetFilters).toHaveBeenCalledWith({
        searchQuery: ''
      })
    })
  })

  describe('鍵盤導航', () => {
    it('應該支援方向鍵導航建議列表', async () => {
      const user = userEvent.setup()
      render(<PhotoSearch />)

      const searchInput = screen.getByPlaceholderText(/搜尋照片/i)
      await user.type(searchInput, 'c')

      // 使用方向鍵下移
      await user.keyboard('{ArrowDown}')

      // 第一個建議應該被高亮
      expect(screen.getByText('construction')).toHaveClass('highlighted')
    })

    it('應該支援 Enter 鍵選擇建議', async () => {
      const user = userEvent.setup()
      render(<PhotoSearch />)

      const searchInput = screen.getByPlaceholderText(/搜尋照片/i)
      await user.type(searchInput, 'c')

      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')

      expect(searchInput).toHaveValue('construction')
    })

    it('應該支援 Escape 鍵關閉建議列表', async () => {
      const user = userEvent.setup()
      render(<PhotoSearch />)

      const searchInput = screen.getByPlaceholderText(/搜尋照片/i)
      await user.type(searchInput, 'c')

      // 建議應該顯示
      expect(screen.getByText('construction')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      // 建議應該隱藏
      expect(screen.queryByText('construction')).not.toBeInTheDocument()
    })
  })

  describe('搜尋結果統計', () => {
    it('應該顯示搜尋結果數量', () => {
      mockGetFilteredPhotos.mockReturnValue([mockPhotos[0]])

      render(<PhotoSearch />)

      expect(screen.getByText(/找到 1 張照片/i)).toBeInTheDocument()
    })

    it('應該在無結果時顯示適當訊息', () => {
      mockGetFilteredPhotos.mockReturnValue([])

      render(<PhotoSearch />)

      expect(screen.getByText(/沒有找到符合的照片/i)).toBeInTheDocument()
    })
  })
})