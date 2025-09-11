/**
 * @fileoverview ViewModeToggle 組件測試
 * @version 1.0
 * @date 2025-08-31
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ViewModeToggle } from '../ViewModeToggle'

export type ViewMode = 'card' | 'table' | 'grid'

describe('ViewModeToggle', () => {
  const defaultProps = {
    currentMode: 'card' as ViewMode,
    onModeChange: vi.fn()
  }

  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('應該正確渲染檢視模式按鈕', () => {
    // Act
    render(<ViewModeToggle {...defaultProps} />)

    // Assert
    expect(screen.getByLabelText('卡片檢視')).toBeInTheDocument()
    expect(screen.getByLabelText('表格檢視')).toBeInTheDocument()
    expect(screen.getByLabelText('網格檢視')).toBeInTheDocument()
  })

  it('應該正確顯示當前選中的模式', () => {
    // Act
    render(<ViewModeToggle {...defaultProps} currentMode="card" />)

    // Assert
    const cardButton = screen.getByLabelText('卡片檢視')
    expect(cardButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('應該支援切換到表格檢視', async () => {
    // Arrange
    const onModeChange = vi.fn()
    
    render(<ViewModeToggle {...defaultProps} onModeChange={onModeChange} />)

    // Act
    const tableButton = screen.getByLabelText('表格檢視')
    await user.click(tableButton)

    // Assert
    expect(onModeChange).toHaveBeenCalledWith('table')
  })

  it('應該支援切換到網格檢視', async () => {
    // Arrange
    const onModeChange = vi.fn()
    
    render(<ViewModeToggle {...defaultProps} onModeChange={onModeChange} />)

    // Act
    const gridButton = screen.getByLabelText('網格檢視')
    await user.click(gridButton)

    // Assert
    expect(onModeChange).toHaveBeenCalledWith('grid')
  })

  it('應該支援鍵盤導航', async () => {
    // Arrange
    const onModeChange = vi.fn()
    
    render(<ViewModeToggle {...defaultProps} onModeChange={onModeChange} />)

    // Act
    const cardButton = screen.getByLabelText('卡片檢視')
    cardButton.focus()
    await user.keyboard('{ArrowRight}')
    await user.keyboard('{Enter}')

    // Assert
    expect(onModeChange).toHaveBeenCalledWith('table')
  })

  it('應該支援禁用特定模式', () => {
    // Act
    render(
      <ViewModeToggle 
        {...defaultProps} 
        disabledModes={['grid']}
      />
    )

    // Assert
    const gridButton = screen.getByLabelText('網格檢視')
    expect(gridButton).toBeDisabled()
  })

  it('應該支援顯示模式圖標', () => {
    // Act
    render(<ViewModeToggle {...defaultProps} showIcons />)

    // Assert
    expect(screen.getByTestId('card-icon')).toBeInTheDocument()
    expect(screen.getByTestId('table-icon')).toBeInTheDocument()
    expect(screen.getByTestId('grid-icon')).toBeInTheDocument()
  })

  it('應該支援顯示模式文字', () => {
    // Act
    render(<ViewModeToggle {...defaultProps} showLabels />)

    // Assert
    expect(screen.getByText('卡片')).toBeInTheDocument()
    expect(screen.getByText('表格')).toBeInTheDocument()
    expect(screen.getByText('網格')).toBeInTheDocument()
  })

  it('應該支援緊湊模式', () => {
    // Act
    render(<ViewModeToggle {...defaultProps} compact />)

    // Assert
    const toggle = screen.getByRole('group')
    expect(toggle).toHaveClass('compact')
  })

  it('應該支援自訂樣式', () => {
    // Act
    render(
      <ViewModeToggle 
        {...defaultProps} 
        className="custom-class"
      />
    )

    // Assert
    const toggle = screen.getByRole('group')
    expect(toggle).toHaveClass('custom-class')
  })
})