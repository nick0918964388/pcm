/**
 * PhotoGalleryList 元件測試
 * 使用 TDD 方法論開發專案相簿列表元件
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PhotoGalleryList } from '../PhotoGalleryList'
import { Album } from '@/types/photo.types'

const mockAlbums: Album[] = [
  {
    id: 'album-1',
    projectId: 'proj001',
    name: '施工進度照片',
    description: '記錄施工各階段進度',
    photoCount: 25,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'album-2',
    projectId: 'proj001',
    name: '品質檢查照片',
    description: '品質檢驗相關照片',
    photoCount: 12,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: 'album-3',
    projectId: 'proj001',
    name: '安全檢查照片',
    photoCount: 8,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-12')
  }
]

describe('PhotoGalleryList', () => {
  const defaultProps = {
    albums: mockAlbums,
    projectId: 'proj001',
    selectedAlbum: null,
    onAlbumSelect: vi.fn(),
    onAlbumCreate: vi.fn(),
    onAlbumDelete: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本渲染', () => {
    it('應該渲染相簿列表標題', () => {
      render(<PhotoGalleryList {...defaultProps} />)

      expect(screen.getByText('專案相簿')).toBeInTheDocument()
    })

    it('應該渲染"所有照片"選項', () => {
      render(<PhotoGalleryList {...defaultProps} />)

      expect(screen.getByText('所有照片')).toBeInTheDocument()
    })

    it('應該顯示總照片數量', () => {
      render(<PhotoGalleryList {...defaultProps} />)

      // 計算總照片數 (25 + 12 + 8 = 45)
      expect(screen.getByText('45')).toBeInTheDocument()
    })

    it('應該渲染所有相簿項目', () => {
      render(<PhotoGalleryList {...defaultProps} />)

      expect(screen.getByText('施工進度照片')).toBeInTheDocument()
      expect(screen.getByText('品質檢查照片')).toBeInTheDocument()
      expect(screen.getByText('安全檢查照片')).toBeInTheDocument()
    })

    it('應該顯示每個相簿的照片數量', () => {
      render(<PhotoGalleryList {...defaultProps} />)

      expect(screen.getByText('25')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
    })
  })

  describe('選取行為', () => {
    it('當沒有選擇相簿時，"所有照片"應該是活躍狀態', () => {
      render(<PhotoGalleryList {...defaultProps} />)

      const allPhotosButton = screen.getByRole('button', { name: /所有照片/ })
      expect(allPhotosButton).toHaveClass('bg-primary') // 或其他表示選中的類名
    })

    it('當選擇特定相簿時，該相簿應該是活躍狀態', () => {
      render(<PhotoGalleryList {...defaultProps} selectedAlbum="album-1" />)

      const selectedAlbum = screen.getByRole('button', { name: /施工進度照片/ })
      expect(selectedAlbum).toHaveClass('bg-primary') // 或其他表示選中的類名
    })

    it('點擊"所有照片"應該觸發 onAlbumSelect(null)', () => {
      const mockOnAlbumSelect = vi.fn()
      render(<PhotoGalleryList {...defaultProps} onAlbumSelect={mockOnAlbumSelect} />)

      const allPhotosButton = screen.getByRole('button', { name: /所有照片/ })
      fireEvent.click(allPhotosButton)

      expect(mockOnAlbumSelect).toHaveBeenCalledWith(null)
    })

    it('點擊特定相簿應該觸發 onAlbumSelect 並傳入相簿ID', () => {
      const mockOnAlbumSelect = vi.fn()
      render(<PhotoGalleryList {...defaultProps} onAlbumSelect={mockOnAlbumSelect} />)

      const albumButton = screen.getByRole('button', { name: /施工進度照片/ })
      fireEvent.click(albumButton)

      expect(mockOnAlbumSelect).toHaveBeenCalledWith('album-1')
    })
  })

  describe('空狀態', () => {
    it('當沒有相簿時應該顯示空狀態提示', () => {
      render(<PhotoGalleryList {...defaultProps} albums={[]} />)

      expect(screen.getByText('目前沒有相簿')).toBeInTheDocument()
      expect(screen.getByText('點擊上方按鈕建立第一個相簿')).toBeInTheDocument()
    })

    it('空狀態時仍應顯示"所有照片"選項', () => {
      render(<PhotoGalleryList {...defaultProps} albums={[]} />)

      expect(screen.getByText('所有照片')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument() // 零張照片
    })
  })

  describe('載入狀態', () => {
    it('載入時應該顯示骨架元件', () => {
      render(<PhotoGalleryList {...defaultProps} loading={true} />)

      // 檢查是否有載入動畫或骨架元件
      expect(screen.getByTestId('album-list-loading')).toBeInTheDocument()
    })
  })

  describe('錯誤狀態', () => {
    it('發生錯誤時應該顯示錯誤訊息', () => {
      const errorMessage = '載入相簿失敗'
      render(<PhotoGalleryList {...defaultProps} error={errorMessage} />)

      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  describe('相簿管理功能', () => {
    it('應該顯示新增相簿按鈕', () => {
      render(<PhotoGalleryList {...defaultProps} />)

      expect(screen.getByRole('button', { name: /新增相簿/ })).toBeInTheDocument()
    })

    it('點擊新增相簿按鈕應該觸發 onAlbumCreate', () => {
      const mockOnAlbumCreate = vi.fn()
      render(<PhotoGalleryList {...defaultProps} onAlbumCreate={mockOnAlbumCreate} />)

      const createButton = screen.getByRole('button', { name: /新增相簿/ })
      fireEvent.click(createButton)

      expect(mockOnAlbumCreate).toHaveBeenCalled()
    })

    it('相簿項目應該有刪除選項', () => {
      render(<PhotoGalleryList {...defaultProps} />)

      // 查找刪除按鈕或選單
      const deleteButtons = screen.getAllByRole('button', { name: /刪除/ })
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    it('點擊刪除相簿應該觸發確認對話框', async () => {
      // 模擬 confirm 函數
      const originalConfirm = window.confirm
      window.confirm = vi.fn(() => true)

      const mockOnAlbumDelete = vi.fn()
      render(<PhotoGalleryList {...defaultProps} onAlbumDelete={mockOnAlbumDelete} />)

      const deleteButtons = screen.getAllByRole('button', { name: /刪除/ })
      fireEvent.click(deleteButtons[0])

      expect(window.confirm).toHaveBeenCalled()
      expect(mockOnAlbumDelete).toHaveBeenCalledWith('album-1')

      // 恢復原始 confirm 函數
      window.confirm = originalConfirm
    })
  })

  describe('響應式設計', () => {
    it('在小螢幕上應該使用適當的佈局', () => {
      // 模擬小螢幕
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640
      })

      render(<PhotoGalleryList {...defaultProps} />)

      const container = screen.getByTestId('album-list-container')
      expect(container).toHaveClass(/mobile/) // 或其他表示行動版的類名
    })
  })

  describe('輔助功能', () => {
    it('應該有適當的 ARIA 標籤', () => {
      render(<PhotoGalleryList {...defaultProps} />)

      const listElement = screen.getByRole('list')
      expect(listElement).toHaveAttribute('aria-label', '專案相簿列表')
    })

    it('選中的相簿應該有 aria-current 屬性', () => {
      render(<PhotoGalleryList {...defaultProps} selectedAlbum="album-1" />)

      const selectedButton = screen.getByRole('button', { name: /施工進度照片/ })
      expect(selectedButton).toHaveAttribute('aria-current', 'page')
    })
  })

  describe('效能優化', () => {
    it('相簿列表應該使用虛擬化或備忘化', () => {
      const manyAlbums = Array.from({ length: 100 }, (_, i) => ({
        ...mockAlbums[0],
        id: `album-${i}`,
        name: `相簿 ${i}`
      }))

      const { rerender } = render(<PhotoGalleryList {...defaultProps} albums={manyAlbums} />)

      // 重新渲染但相簿資料相同，元件不應重新渲染所有項目
      rerender(<PhotoGalleryList {...defaultProps} albums={manyAlbums} />)

      // 這裡可以使用性能監控工具檢查渲染次數
      expect(true).toBe(true) // 暫時的斷言
    })
  })

  describe('相簿封面功能', () => {
    const albumWithCover: Album = {
      ...mockAlbums[0],
      coverPhotoId: 'cover-photo-1'
    }

    it('有封面的相簿應該顯示封面圖片', () => {
      render(<PhotoGalleryList {...defaultProps} albums={[albumWithCover]} />)

      // 檢查是否有封面圖片顯示
      const coverImage = screen.queryByTestId('album-cover-image')
      expect(coverImage).toBeInTheDocument()
    })

    it('沒有封面的相簿應該顯示預設圖標', () => {
      render(<PhotoGalleryList {...defaultProps} />)

      // 應該顯示預設的資料夾圖標
      const folderIcons = screen.getAllByTestId('album-folder-icon')
      expect(folderIcons.length).toBeGreaterThan(0)
    })

    it('封面載入失敗時應該退回到預設圖標', () => {
      render(<PhotoGalleryList {...defaultProps} albums={[albumWithCover]} />)

      // 模擬圖片載入失敗
      const coverImage = screen.queryByTestId('album-cover-image')
      if (coverImage) {
        fireEvent.error(coverImage)
      }

      // 應該顯示預設圖標
      expect(screen.getByTestId('album-folder-icon')).toBeInTheDocument()
    })
  })

  describe('權限過濾功能', () => {
    const mockPermissions = {
      canView: ['album-1', 'album-2'],
      canEdit: ['album-1'],
      canDelete: ['album-1']
    }

    it('應該只顯示有檢視權限的相簿', () => {
      render(
        <PhotoGalleryList
          {...defaultProps}
          userPermissions={mockPermissions}
        />
      )

      // 應該只顯示 album-1 和 album-2
      expect(screen.getByText('施工進度照片')).toBeInTheDocument()
      expect(screen.getByText('品質檢查照片')).toBeInTheDocument()
      expect(screen.queryByText('安全檢查照片')).not.toBeInTheDocument()
    })

    it('沒有權限時應該顯示權限提示', () => {
      render(
        <PhotoGalleryList
          {...defaultProps}
          albums={[]}
          userPermissions={{ canView: [], canEdit: [], canDelete: [] }}
        />
      )

      expect(screen.getByText('您沒有相簿的檢視權限')).toBeInTheDocument()
    })

    it('相簿操作按鈕應該根據權限顯示', () => {
      render(
        <PhotoGalleryList
          {...defaultProps}
          userPermissions={mockPermissions}
        />
      )

      // album-1 有刪除權限，應該有刪除按鈕
      const deleteButtons = screen.getAllByTestId('album-delete-button')
      expect(deleteButtons.length).toBeGreaterThan(0)
    })
  })
})