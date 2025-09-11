/**
 * @fileoverview FilterPanel 組件測試
 * @version 1.0
 * @date 2025-08-31
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { FilterPanel } from '../FilterPanel'
import { WorkStatus } from '@/types/project'

// Create query client for each test
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
})

// Wrapper component for React Query
const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('FilterPanel', () => {
  const defaultProps = {
    projectId: 'proj-001',
    onFiltersChange: vi.fn(),
    onSearchChange: vi.fn(),
    searchPlaceholder: '搜索專案成員...'
  }

  let queryClient: QueryClient
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    queryClient = createQueryClient()
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('應該正確渲染搜索框和篩選器', () => {
    // Arrange
    const wrapper = createWrapper(queryClient)

    // Act
    render(<FilterPanel {...defaultProps} />, { wrapper })

    // Assert
    expect(screen.getByPlaceholderText('搜索專案成員...')).toBeInTheDocument()
    expect(screen.getByText('篩選條件')).toBeInTheDocument()
  })

  it('應該支援搜索功能', async () => {
    // Arrange
    const onSearchChange = vi.fn()
    const wrapper = createWrapper(queryClient)

    render(
      <FilterPanel 
        {...defaultProps}
        onSearchChange={onSearchChange}
      />, 
      { wrapper }
    )

    // Act
    const searchInput = screen.getByPlaceholderText('搜索專案成員...')
    await user.type(searchInput, '張小明')

    // Assert
    expect(onSearchChange).toHaveBeenCalledWith('張小明')
  })

  it('應該支援篩選器變更', async () => {
    // Arrange
    const onFiltersChange = vi.fn()
    const wrapper = createWrapper(queryClient)

    render(
      <FilterPanel 
        {...defaultProps}
        onFiltersChange={onFiltersChange}
        availableRoles={['developer', 'designer']}
        availableSkills={['React', 'Vue']}
        departments={['Engineering', 'Design']}
      />, 
      { wrapper }
    )

    // Act
    const roleFilter = screen.getByTestId('role-filter')
    await user.click(roleFilter)
    
    const developerOption = screen.getByText('developer')
    await user.click(developerOption)

    // Assert
    expect(onFiltersChange).toHaveBeenCalledWith({
      role: ['developer']
    })
  })

  it('應該支援組合搜索和篩選', async () => {
    // Arrange
    const onSearchChange = vi.fn()
    const onFiltersChange = vi.fn()
    const wrapper = createWrapper(queryClient)

    render(
      <FilterPanel 
        {...defaultProps}
        onSearchChange={onSearchChange}
        onFiltersChange={onFiltersChange}
        availableRoles={['developer']}
        availableSkills={['React']}
        departments={['Engineering']}
      />, 
      { wrapper }
    )

    // Act
    const searchInput = screen.getByPlaceholderText('搜索專案成員...')
    await user.type(searchInput, '張')

    const roleFilter = screen.getByTestId('role-filter')
    await user.click(roleFilter)
    const developerOption = screen.getByText('developer')
    await user.click(developerOption)

    // Assert
    expect(onSearchChange).toHaveBeenCalledWith('張')
    expect(onFiltersChange).toHaveBeenCalledWith({
      role: ['developer']
    })
  })

  it('應該支援摺疊面板', async () => {
    // Arrange
    const wrapper = createWrapper(queryClient)

    render(
      <FilterPanel 
        {...defaultProps}
        collapsible
        defaultExpanded={false}
      />, 
      { wrapper }
    )

    // Act
    const toggleButton = screen.getByTestId('collapse-toggle')
    await user.click(toggleButton)

    // Assert
    expect(screen.getByText('角色')).toBeVisible()
  })

  it('應該支援清除所有條件', async () => {
    // Arrange
    const onSearchChange = vi.fn()
    const onFiltersChange = vi.fn()
    const wrapper = createWrapper(queryClient)

    render(
      <FilterPanel 
        {...defaultProps}
        onSearchChange={onSearchChange}
        onFiltersChange={onFiltersChange}
        initialFilters={{
          role: ['developer'],
          skills: ['React']
        }}
        showClearAll
      />, 
      { wrapper }
    )

    // Act
    const clearAllButton = screen.getByText('清除所有條件')
    await user.click(clearAllButton)

    // Assert
    expect(onSearchChange).toHaveBeenCalledWith('')
    expect(onFiltersChange).toHaveBeenCalledWith({})
  })

  it('應該支援搜索歷史記錄', async () => {
    // Arrange
    const searchHistory = ['張小明', '李小華', 'React']
    const wrapper = createWrapper(queryClient)

    render(
      <FilterPanel 
        {...defaultProps}
        showSearchHistory
        searchHistory={searchHistory}
      />, 
      { wrapper }
    )

    // Act
    const searchInput = screen.getByPlaceholderText('搜索專案成員...')
    await user.click(searchInput)

    // Assert
    expect(screen.getByText('最近搜索')).toBeInTheDocument()
    expect(screen.getByText('張小明')).toBeInTheDocument()
    expect(screen.getByText('李小華')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
  })

  it('應該支援響應式布局', () => {
    // Arrange
    const wrapper = createWrapper(queryClient)

    // Act
    render(
      <FilterPanel 
        {...defaultProps}
        responsive
      />, 
      { wrapper }
    )

    // Assert
    const container = screen.getByTestId('filter-panel-container')
    expect(container).toHaveClass('responsive')
  })

  it('應該顯示篩選條件統計', () => {
    // Arrange
    const wrapper = createWrapper(queryClient)

    // Act
    render(
      <FilterPanel 
        {...defaultProps}
        initialFilters={{
          role: ['developer', 'designer'],
          skills: ['React'],
          workStatus: [WorkStatus.AVAILABLE]
        }}
        showFilterCount
      />, 
      { wrapper }
    )

    // Assert
    expect(screen.getByText('4')).toBeInTheDocument() // 2 roles + 1 skill + 1 work status
  })

  it('應該支援載入狀態', () => {
    // Arrange
    const wrapper = createWrapper(queryClient)

    // Act
    render(
      <FilterPanel 
        {...defaultProps}
        loading
      />, 
      { wrapper }
    )

    // Assert
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })
})