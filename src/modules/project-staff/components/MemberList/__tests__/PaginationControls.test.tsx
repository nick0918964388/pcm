/**
 * @fileoverview PaginationControls 組件測試
 * @version 1.0
 * @date 2025-08-31
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaginationControls } from '../PaginationControls'

describe('PaginationControls', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    totalItems: 100,
    pageSize: 10,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn()
  }

  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('應該正確顯示分頁資訊', () => {
    // Act
    render(<PaginationControls {...defaultProps} />)

    // Assert
    expect(screen.getByText(/顯示第 1-10 項，共 100 項/)).toBeInTheDocument()
  })

  it('應該顯示正確的頁碼按鈕', () => {
    // Act
    render(<PaginationControls {...defaultProps} />)

    // Assert
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('應該支援點擊頁碼切換', async () => {
    // Arrange
    const onPageChange = vi.fn()
    
    render(<PaginationControls {...defaultProps} onPageChange={onPageChange} />)

    // Act
    const pageButton = screen.getByText('3')
    await user.click(pageButton)

    // Assert
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('應該支援上一頁按鈕', async () => {
    // Arrange
    const onPageChange = vi.fn()
    
    render(
      <PaginationControls 
        {...defaultProps} 
        currentPage={5}
        onPageChange={onPageChange} 
      />
    )

    // Act
    const prevButton = screen.getByLabelText('上一頁')
    await user.click(prevButton)

    // Assert
    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it('應該支援下一頁按鈕', async () => {
    // Arrange
    const onPageChange = vi.fn()
    
    render(<PaginationControls {...defaultProps} onPageChange={onPageChange} />)

    // Act
    const nextButton = screen.getByLabelText('下一頁')
    await user.click(nextButton)

    // Assert
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('應該支援首頁和末頁按鈕', async () => {
    // Arrange
    const onPageChange = vi.fn()
    
    render(
      <PaginationControls 
        {...defaultProps} 
        currentPage={5}
        onPageChange={onPageChange}
        showFirstLast 
      />
    )

    // Act
    const firstButton = screen.getByLabelText('第一頁')
    const lastButton = screen.getByLabelText('最後一頁')
    
    await user.click(firstButton)
    await user.click(lastButton)

    // Assert
    expect(onPageChange).toHaveBeenCalledWith(1)
    expect(onPageChange).toHaveBeenCalledWith(10)
  })

  it('應該在第一頁時禁用上一頁按鈕', () => {
    // Act
    render(<PaginationControls {...defaultProps} currentPage={1} />)

    // Assert
    const prevButton = screen.getByLabelText('上一頁')
    expect(prevButton).toBeDisabled()
  })

  it('應該在最後一頁時禁用下一頁按鈕', () => {
    // Act
    render(<PaginationControls {...defaultProps} currentPage={10} />)

    // Assert
    const nextButton = screen.getByLabelText('下一頁')
    expect(nextButton).toBeDisabled()
  })

  it('應該支援每頁筆數調整', () => {
    // Act
    render(
      <PaginationControls 
        {...defaultProps} 
        showPageSizeSelector 
      />
    )

    // Assert
    expect(screen.getByLabelText('每頁顯示')).toBeInTheDocument()
  })

  it('應該支援快速跳頁', async () => {
    // Arrange
    const onPageChange = vi.fn()
    
    render(
      <PaginationControls 
        {...defaultProps} 
        onPageChange={onPageChange}
        showQuickJumper 
      />
    )

    // Act
    const jumpInput = screen.getByLabelText('跳至頁面')
    await user.type(jumpInput, '5')
    await user.keyboard('{Enter}')

    // Assert
    expect(onPageChange).toHaveBeenCalledWith(5)
  })

  it('應該支援省略號顯示', () => {
    // Act
    render(
      <PaginationControls 
        {...defaultProps} 
        currentPage={50}
        totalPages={100} 
      />
    )

    // Assert
    expect(screen.getAllByText('...')).toHaveLength(2)
  })

  it('應該支援緊湊模式', () => {
    // Act
    render(<PaginationControls {...defaultProps} compact />)

    // Assert
    const pagination = screen.getByRole('navigation')
    expect(pagination).toHaveClass('compact')
  })

  it('應該正確處理無數據情況', () => {
    // Act
    render(
      <PaginationControls 
        {...defaultProps} 
        totalItems={0}
        totalPages={0}
      />
    )

    // Assert
    expect(screen.getByText('暫無資料')).toBeInTheDocument()
  })

  it('應該支援自訂頁碼範圍', () => {
    // Act
    render(
      <PaginationControls 
        {...defaultProps} 
        currentPage={5}
        totalPages={20}
        siblingCount={1}
      />
    )

    // Assert
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
  })
})