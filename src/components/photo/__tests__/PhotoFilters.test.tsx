/**
 * @fileoverview PhotoFilters 元件測試檔案
 * 測試照片篩選器元件的各項功能
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { PhotoFilters } from '../PhotoFilters'
import type { PhotoFilters as PhotoFiltersType } from '@/types/photo.types'

// Mock data
const mockFilters: PhotoFiltersType = {
  searchQuery: '',
  dateRange: undefined,
  tags: [],
  uploadedBy: undefined,
  albumId: undefined
}

const mockTagOptions = [
  { value: 'construction', label: '施工' },
  { value: 'inspection', label: '檢查' },
  { value: 'quality', label: '品質' },
  { value: 'safety', label: '安全' }
]

const mockUploaderOptions = [
  { value: 'user1', label: '張工程師' },
  { value: 'user2', label: '李主任' },
  { value: 'user3', label: '王技師' }
]

const mockOnFiltersChange = vi.fn()

describe('PhotoFilters Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本渲染', () => {
    it('應該顯示篩選按鈕', () => {
      render(
        <PhotoFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      expect(screen.getByRole('button', { name: /篩選/i })).toBeInTheDocument()
    })

    it('應該在有活動篩選條件時顯示篩選數量', () => {
      const filtersWithData: PhotoFiltersType = {
        ...mockFilters,
        searchQuery: 'test',
        tags: ['construction']
      }

      render(
        <PhotoFilters
          filters={filtersWithData}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      expect(screen.getByText('2')).toBeInTheDocument() // 篩選數量
    })
  })

  describe('搜尋功能', () => {
    it('應該顯示搜尋輸入框', async () => {
      const user = userEvent.setup()

      render(
        <PhotoFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      // 點擊篩選按鈕開啟面板
      await user.click(screen.getByRole('button', { name: /篩選/i }))

      expect(screen.getByPlaceholderText('搜尋照片...')).toBeInTheDocument()
    })

    it('應該在輸入搜尋關鍵字時觸發變更回調', async () => {
      const user = userEvent.setup()

      render(
        <PhotoFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      await user.click(screen.getByRole('button', { name: /篩選/i }))

      const searchInput = screen.getByPlaceholderText('搜尋照片...')
      await user.type(searchInput, 'test keyword')

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          ...mockFilters,
          searchQuery: 'test keyword'
        })
      })
    })
  })

  describe('日期範圍篩選', () => {
    it('應該顯示開始和結束日期輸入框', async () => {
      const user = userEvent.setup()

      render(
        <PhotoFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      await user.click(screen.getByRole('button', { name: /篩選/i }))

      expect(screen.getByLabelText('開始日期')).toBeInTheDocument()
      expect(screen.getByLabelText('結束日期')).toBeInTheDocument()
    })

    it('應該在設定日期範圍時觸發變更回調', async () => {
      const user = userEvent.setup()

      render(
        <PhotoFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      await user.click(screen.getByRole('button', { name: /篩選/i }))

      const startDateInput = screen.getByLabelText('開始日期')
      const endDateInput = screen.getByLabelText('結束日期')

      await user.type(startDateInput, '2024-01-01')
      await user.type(endDateInput, '2024-01-31')

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      })
    })
  })

  describe('標籤篩選', () => {
    it('應該顯示標籤選項', async () => {
      const user = userEvent.setup()

      render(
        <PhotoFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      await user.click(screen.getByRole('button', { name: /篩選/i }))

      mockTagOptions.forEach(tag => {
        expect(screen.getByLabelText(tag.label)).toBeInTheDocument()
      })
    })

    it('應該在選擇標籤時觸發變更回調', async () => {
      const user = userEvent.setup()

      render(
        <PhotoFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      await user.click(screen.getByRole('button', { name: /篩選/i }))

      const constructionCheckbox = screen.getByLabelText('施工')
      await user.click(constructionCheckbox)

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        tags: ['construction']
      })
    })

    it('應該支援多標籤選擇', async () => {
      const user = userEvent.setup()

      render(
        <PhotoFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      await user.click(screen.getByRole('button', { name: /篩選/i }))

      const constructionCheckbox = screen.getByLabelText('施工')
      const inspectionCheckbox = screen.getByLabelText('檢查')

      await user.click(constructionCheckbox)
      await user.click(inspectionCheckbox)

      expect(mockOnFiltersChange).toHaveBeenLastCalledWith({
        ...mockFilters,
        tags: ['construction', 'inspection']
      })
    })

    it('應該支援取消選擇標籤', async () => {
      const user = userEvent.setup()
      const filtersWithTags: PhotoFiltersType = {
        ...mockFilters,
        tags: ['construction', 'inspection']
      }

      render(
        <PhotoFilters
          filters={filtersWithTags}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      await user.click(screen.getByRole('button', { name: /篩選/i }))

      const constructionCheckbox = screen.getByLabelText('施工')
      await user.click(constructionCheckbox)

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...filtersWithTags,
        tags: ['inspection']
      })
    })
  })

  describe('上傳者篩選', () => {
    it('應該顯示上傳者選項', async () => {
      const user = userEvent.setup()

      render(
        <PhotoFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      await user.click(screen.getByRole('button', { name: /篩選/i }))

      expect(screen.getByText('上傳者')).toBeInTheDocument()
    })

    it('應該在選擇上傳者時觸發變更回調', async () => {
      const user = userEvent.setup()

      render(
        <PhotoFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      await user.click(screen.getByRole('button', { name: /篩選/i }))

      const uploaderSelect = screen.getByText('選擇上傳者')
      await user.click(uploaderSelect)

      const option = screen.getByText('張工程師')
      await user.click(option)

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        uploadedBy: 'user1'
      })
    })
  })

  describe('已套用篩選條件的視覺化顯示', () => {
    it('應該顯示搜尋關鍵字標籤', () => {
      const filtersWithSearch: PhotoFiltersType = {
        ...mockFilters,
        searchQuery: 'test keyword'
      }

      render(
        <PhotoFilters
          filters={filtersWithSearch}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      expect(screen.getByText('搜尋: test keyword')).toBeInTheDocument()
    })

    it('應該顯示標籤篩選標籤', () => {
      const filtersWithTags: PhotoFiltersType = {
        ...mockFilters,
        tags: ['construction', 'inspection']
      }

      render(
        <PhotoFilters
          filters={filtersWithTags}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      expect(screen.getByText('標籤: 2項')).toBeInTheDocument()
    })

    it('應該顯示上傳者篩選標籤', () => {
      const filtersWithUploader: PhotoFiltersType = {
        ...mockFilters,
        uploadedBy: 'user1'
      }

      render(
        <PhotoFilters
          filters={filtersWithUploader}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      expect(screen.getByText('上傳者: 張工程師')).toBeInTheDocument()
    })

    it('應該允許移除個別篩選條件', async () => {
      const user = userEvent.setup()
      const filtersWithData: PhotoFiltersType = {
        ...mockFilters,
        searchQuery: 'test',
        tags: ['construction']
      }

      render(
        <PhotoFilters
          filters={filtersWithData}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      const removeButtons = screen.getAllByLabelText('移除篩選條件')
      await user.click(removeButtons[0])

      expect(mockOnFiltersChange).toHaveBeenCalled()
    })
  })

  describe('清除所有篩選條件', () => {
    it('應該提供清除全部按鈕', async () => {
      const user = userEvent.setup()
      const filtersWithData: PhotoFiltersType = {
        ...mockFilters,
        searchQuery: 'test',
        tags: ['construction']
      }

      render(
        <PhotoFilters
          filters={filtersWithData}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      await user.click(screen.getByRole('button', { name: /篩選/i }))

      expect(screen.getByText('清除全部')).toBeInTheDocument()
    })

    it('應該在點擊清除全部時重置所有篩選條件', async () => {
      const user = userEvent.setup()
      const filtersWithData: PhotoFiltersType = {
        ...mockFilters,
        searchQuery: 'test',
        tags: ['construction'],
        uploadedBy: 'user1'
      }

      render(
        <PhotoFilters
          filters={filtersWithData}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      await user.click(screen.getByRole('button', { name: /篩選/i }))
      await user.click(screen.getByText('清除全部'))

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        searchQuery: '',
        dateRange: undefined,
        tags: [],
        uploadedBy: undefined,
        albumId: undefined
      })
    })
  })

  describe('響應式設計', () => {
    it('應該在小螢幕上適當調整佈局', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320
      })

      render(
        <PhotoFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      const filterButton = screen.getByRole('button', { name: /篩選/i })
      expect(filterButton).toHaveClass('w-full') // 小螢幕時全寬度
    })
  })

  describe('無障礙性', () => {
    it('應該有適當的ARIA屬性', async () => {
      const user = userEvent.setup()

      render(
        <PhotoFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      const filterButton = screen.getByRole('button', { name: /篩選/i })
      expect(filterButton).toHaveAttribute('aria-expanded', 'false')

      await user.click(filterButton)
      expect(filterButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('應該支援鍵盤導航', async () => {
      render(
        <PhotoFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          tagOptions={mockTagOptions}
          uploaderOptions={mockUploaderOptions}
        />
      )

      const filterButton = screen.getByRole('button', { name: /篩選/i })

      // 使用Tab鍵應該能夠聚焦到按鈕
      filterButton.focus()
      expect(document.activeElement).toBe(filterButton)

      // 使用Enter鍵應該能開啟面板
      fireEvent.keyDown(filterButton, { key: 'Enter' })
      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜尋照片...')).toBeInTheDocument()
      })
    })
  })
})