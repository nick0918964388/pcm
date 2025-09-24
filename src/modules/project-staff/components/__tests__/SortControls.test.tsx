/**
 * @fileoverview SortControls 組件測試
 * @version 1.0
 * @date 2025-08-31
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SortControls } from '../SortControls';

describe('SortControls', () => {
  const defaultProps = {
    sortBy: 'name',
    sortOrder: 'asc' as const,
    onSortChange: vi.fn(),
  };

  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('應該正確渲染排序控制項', () => {
    // Act
    render(<SortControls {...defaultProps} />);

    // Assert
    expect(screen.getByText('排序方式')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByTestId('sort-direction-button')).toBeInTheDocument();
  });

  it('應該顯示當前排序欄位', () => {
    // Act
    render(<SortControls {...defaultProps} sortBy='joinedAt' />);

    // Assert
    const sortSelect = screen.getByRole('combobox');
    expect(sortSelect).toHaveValue('joinedAt');
  });

  it('應該支援切換排序欄位', async () => {
    // Arrange
    const onSortChange = vi.fn();

    render(<SortControls {...defaultProps} onSortChange={onSortChange} />);

    // Act
    const sortSelect = screen.getByRole('combobox');
    await user.selectOptions(sortSelect, 'joinedAt');

    // Assert
    expect(onSortChange).toHaveBeenCalledWith('joinedAt', 'asc');
  });

  it('應該支援切換排序方向', async () => {
    // Arrange
    const onSortChange = vi.fn();

    render(<SortControls {...defaultProps} onSortChange={onSortChange} />);

    // Act
    const sortDirectionButton = screen.getByTestId('sort-direction-button');
    await user.click(sortDirectionButton);

    // Assert
    expect(onSortChange).toHaveBeenCalledWith('name', 'desc');
  });

  it('應該正確顯示排序方向圖標', () => {
    // Act - 遞增排序
    const { rerender } = render(
      <SortControls {...defaultProps} sortOrder='asc' />
    );

    expect(screen.getByTestId('sort-asc-icon')).toBeInTheDocument();

    // Act - 遞減排序
    rerender(<SortControls {...defaultProps} sortOrder='desc' />);

    expect(screen.getByTestId('sort-desc-icon')).toBeInTheDocument();
  });

  it('應該支援自定義排序選項', () => {
    // Arrange
    const customSortOptions = [
      { value: 'customField', label: '自定義欄位' },
      { value: 'anotherField', label: '另一個欄位' },
    ];

    // Act
    render(<SortControls {...defaultProps} sortOptions={customSortOptions} />);

    // Assert
    expect(screen.getByText('自定義欄位')).toBeInTheDocument();
    expect(screen.getByText('另一個欄位')).toBeInTheDocument();
  });

  it('應該支援禁用狀態', () => {
    // Act
    render(<SortControls {...defaultProps} disabled />);

    // Assert
    const sortSelect = screen.getByRole('combobox');
    const sortDirectionButton = screen.getByTestId('sort-direction-button');

    expect(sortSelect).toBeDisabled();
    expect(sortDirectionButton).toBeDisabled();
  });

  it('應該支援簡化模式（只有方向按鈕）', () => {
    // Act
    render(<SortControls {...defaultProps} compact />);

    // Assert
    expect(screen.queryByText('排序方式')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByTestId('sort-direction-button')).toBeInTheDocument();
  });

  it('應該支援顯示排序提示', () => {
    // Act
    render(<SortControls {...defaultProps} showLabel />);

    // Assert
    expect(screen.getByText('排序方式')).toBeInTheDocument();
  });

  it('應該支援響應式設計', () => {
    // Act
    render(<SortControls {...defaultProps} responsive />);

    // Assert
    const container = screen.getByTestId('sort-controls-container');
    expect(container).toHaveClass('responsive');
  });

  it('應該正確處理鍵盤導航', async () => {
    // Arrange
    const onSortChange = vi.fn();

    render(<SortControls {...defaultProps} onSortChange={onSortChange} />);

    // Act
    const sortDirectionButton = screen.getByTestId('sort-direction-button');
    sortDirectionButton.focus();
    await user.keyboard('{Space}');

    // Assert
    expect(onSortChange).toHaveBeenCalledWith('name', 'desc');
  });

  it('應該支援排序狀態重置', async () => {
    // Arrange
    const onSortChange = vi.fn();

    render(
      <SortControls {...defaultProps} onSortChange={onSortChange} showReset />
    );

    // Act
    const resetButton = screen.getByText('重置排序');
    await user.click(resetButton);

    // Assert
    expect(onSortChange).toHaveBeenCalledWith('', 'asc');
  });
});
