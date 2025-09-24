/**
 * @fileoverview ProjectMemberSearchInput 組件測試
 * @version 1.0
 * @date 2025-08-31
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { ProjectMemberSearchInput } from '../ProjectMemberSearchInput';

// Mock useProjectMemberSearch hook
const mockSearch = vi.fn();
const mockClearSearch = vi.fn();

vi.mock('@/hooks/useProjectMembers', () => ({
  useProjectMemberSearch: vi.fn(() => ({
    query: '',
    suggestions: [],
    isLoading: false,
    error: null,
    search: mockSearch,
    clearSearch: mockClearSearch,
  })),
}));

// Create query client for each test
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

// Wrapper component for React Query
const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('ProjectMemberSearchInput', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    queryClient = createQueryClient();
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('應該正確渲染搜索輸入框', () => {
    // Arrange
    const wrapper = createWrapper(queryClient);

    // Act
    render(
      <ProjectMemberSearchInput
        projectId='proj-001'
        onSearch={vi.fn()}
        placeholder='搜索專案成員...'
      />,
      { wrapper }
    );

    // Assert
    expect(screen.getByPlaceholderText('搜索專案成員...')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('應該在輸入時調用搜索函數', async () => {
    // Arrange
    const onSearch = vi.fn();
    const wrapper = createWrapper(queryClient);

    render(
      <ProjectMemberSearchInput
        projectId='proj-001'
        onSearch={onSearch}
        placeholder='搜索專案成員...'
      />,
      { wrapper }
    );

    const searchInput = screen.getByRole('combobox');

    // Act
    await user.type(searchInput, '張小明');

    // Assert
    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith('張小明');
      expect(onSearch).toHaveBeenCalledWith('張小明');
    });
  });

  it('應該顯示搜索建議下拉選單', async () => {
    // Arrange
    const mockSuggestions = [
      { value: '張小明', label: '張小明 (developer)', type: 'user' as const },
      { value: 'React', label: 'React', type: 'skill' as const },
    ];

    const { useProjectMemberSearch } = await import(
      '@/hooks/useProjectMembers'
    );
    vi.mocked(useProjectMemberSearch).mockReturnValue({
      query: '張',
      suggestions: mockSuggestions,
      isLoading: false,
      error: null,
      search: mockSearch,
      clearSearch: mockClearSearch,
    });

    const wrapper = createWrapper(queryClient);

    render(
      <ProjectMemberSearchInput
        projectId='proj-001'
        onSearch={vi.fn()}
        placeholder='搜索專案成員...'
      />,
      { wrapper }
    );

    const searchInput = screen.getByRole('combobox');

    // Act
    await user.type(searchInput, '張');
    await waitFor(() => {
      expect(screen.getByText('張小明 (developer)')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
    });
  });

  it('應該支援鍵盤導航選擇建議', async () => {
    // Arrange
    const mockSuggestions = [
      { value: '張小明', label: '張小明 (developer)', type: 'user' as const },
      { value: '李小華', label: '李小華 (designer)', type: 'user' as const },
    ];

    const { useProjectMemberSearch } = await import(
      '@/hooks/useProjectMembers'
    );
    vi.mocked(useProjectMemberSearch).mockReturnValue({
      query: '小',
      suggestions: mockSuggestions,
      isLoading: false,
      error: null,
      search: mockSearch,
      clearSearch: mockClearSearch,
    });

    const onSearch = vi.fn();
    const wrapper = createWrapper(queryClient);

    render(
      <ProjectMemberSearchInput
        projectId='proj-001'
        onSearch={onSearch}
        placeholder='搜索專案成員...'
      />,
      { wrapper }
    );

    const searchInput = screen.getByRole('combobox');

    // Act
    await user.type(searchInput, '小');
    await waitFor(() => {
      expect(screen.getByText('張小明 (developer)')).toBeInTheDocument();
    });

    // Navigate with arrow keys
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    // Assert
    expect(onSearch).toHaveBeenCalledWith('張小明');
  });

  it('應該顯示載入狀態', () => {
    // Arrange
    const { useProjectMemberSearch } = vi.mocked(
      require('@/hooks/useProjectMembers')
    );
    useProjectMemberSearch.mockReturnValue({
      query: '搜索中',
      suggestions: [],
      isLoading: true,
      error: null,
      search: mockSearch,
      clearSearch: mockClearSearch,
    });

    const wrapper = createWrapper(queryClient);

    // Act
    render(
      <ProjectMemberSearchInput
        projectId='proj-001'
        onSearch={vi.fn()}
        placeholder='搜索專案成員...'
      />,
      { wrapper }
    );

    // Assert
    expect(screen.getByTestId('search-loading')).toBeInTheDocument();
  });

  it('應該支援清除搜索', async () => {
    // Arrange
    const onSearch = vi.fn();
    const wrapper = createWrapper(queryClient);

    render(
      <ProjectMemberSearchInput
        projectId='proj-001'
        onSearch={onSearch}
        placeholder='搜索專案成員...'
        showClearButton
      />,
      { wrapper }
    );

    const searchInput = screen.getByRole('combobox');

    // Act
    await user.type(searchInput, '張小明');
    const clearButton = screen.getByRole('button', { name: /清除/i });
    await user.click(clearButton);

    // Assert
    expect(mockClearSearch).toHaveBeenCalled();
    expect(onSearch).toHaveBeenCalledWith('');
  });

  it('應該支援搜索歷史記錄', async () => {
    // Arrange
    const searchHistory = ['張小明', '李小華', 'React'];
    const onSearch = vi.fn();
    const wrapper = createWrapper(queryClient);

    render(
      <ProjectMemberSearchInput
        projectId='proj-001'
        onSearch={onSearch}
        placeholder='搜索專案成員...'
        searchHistory={searchHistory}
        showHistory
      />,
      { wrapper }
    );

    const searchInput = screen.getByRole('combobox');

    // Act - focus input to show history
    await user.click(searchInput);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('最近搜索')).toBeInTheDocument();
      expect(screen.getByText('張小明')).toBeInTheDocument();
      expect(screen.getByText('李小華')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
    });
  });

  it('應該正確處理錯誤狀態', () => {
    // Arrange
    const { useProjectMemberSearch } = vi.mocked(
      require('@/hooks/useProjectMembers')
    );
    useProjectMemberSearch.mockReturnValue({
      query: '錯誤查詢',
      suggestions: [],
      isLoading: false,
      error: new Error('搜索失敗'),
      search: mockSearch,
      clearSearch: mockClearSearch,
    });

    const wrapper = createWrapper(queryClient);

    // Act
    render(
      <ProjectMemberSearchInput
        projectId='proj-001'
        onSearch={vi.fn()}
        placeholder='搜索專案成員...'
      />,
      { wrapper }
    );

    // Assert
    expect(screen.getByText('搜索失敗')).toBeInTheDocument();
  });
});
