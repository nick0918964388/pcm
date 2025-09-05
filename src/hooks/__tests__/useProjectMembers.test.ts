/**
 * @fileoverview useProjectMembers hooks 測試
 * @version 1.0
 * @date 2025-08-31
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, createElement } from 'react'
import { ProjectMemberExtended, ProjectMemberFilters, WorkStatus, SkillCategory } from '@/types/project'
import { 
  useProjectMembersQuery, 
  useProjectMemberSearch,
  useProjectMemberStats 
} from '../useProjectMembers'

// Mock API service
const mockApiInstance = {
  queryProjectMembers: vi.fn(),
  searchProjectMembers: vi.fn(),
  getProjectMemberStats: vi.fn()
}

vi.mock('@/services/projectStaffWbsApi', () => ({
  ProjectStaffWbsApiService: vi.fn().mockImplementation(() => mockApiInstance)
}))

// Create query client for each test
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
})

// Wrapper component for React Query
const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: ReactNode }) => 
    createElement(QueryClientProvider, { client: queryClient }, children)
}

// Mock data
const mockProjectMembers: ProjectMemberExtended[] = [
  {
    id: 'member-001',
    projectId: 'proj-001',
    userId: 'user-001',
    userName: '張小明',
    email: 'zhang@example.com',
    role: 'developer',
    joinedAt: new Date('2025-01-01'),
    isActive: true,
    permissions: ['read', 'write'],
    skills: [{
      name: 'React',
      category: SkillCategory.TECHNICAL,
      level: 5,
      years: 3
    }],
    workload: 80,
    workStatus: WorkStatus.AVAILABLE,
    lastActiveAt: new Date()
  },
  {
    id: 'member-002',
    projectId: 'proj-001',
    userId: 'user-002',
    userName: '李小華',
    email: 'li@example.com',
    role: 'designer',
    joinedAt: new Date('2025-01-15'),
    isActive: true,
    permissions: ['read'],
    skills: [{
      name: 'UI/UX',
      category: SkillCategory.DESIGN,
      level: 4,
      years: 2
    }],
    workload: 60,
    workStatus: WorkStatus.BUSY,
    lastActiveAt: new Date()
  }
]

describe('useProjectMembersQuery', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createQueryClient()
    
    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('應該成功載入專案人員資料', async () => {
    // Arrange
    mockApiInstance.queryProjectMembers.mockResolvedValue({
      success: true,
      data: mockProjectMembers,
      total: 2,
      page: 1,
      pageSize: 10,
      hasMore: false,
      message: 'Success'
    })

    const wrapper = createWrapper(queryClient)

    // Act
    const { result } = renderHook(
      () => useProjectMembersQuery('proj-001'),
      { wrapper }
    )

    // Assert initial state
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()

    // Wait for query to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data?.data).toEqual(mockProjectMembers)
    expect(result.current.data?.total).toBe(2)
    expect(mockApiInstance.queryProjectMembers).toHaveBeenCalledWith('proj-001', {
      page: 1,
      pageSize: 10
    })
  })

  it('應該支援分頁查詢', async () => {
    // Arrange
    mockApiInstance.queryProjectMembers.mockResolvedValue({
      success: true,
      data: [mockProjectMembers[0]],
      total: 2,
      page: 2,
      pageSize: 1,
      hasMore: false,
      message: 'Success'
    })

    const wrapper = createWrapper(queryClient)

    // Act
    const { result } = renderHook(
      () => useProjectMembersQuery('proj-001', {
        page: 2,
        pageSize: 1
      }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Assert
    expect(mockApiInstance.queryProjectMembers).toHaveBeenCalledWith('proj-001', {
      page: 2,
      pageSize: 1
    })
    expect(result.current.data?.page).toBe(2)
    expect(result.current.data?.pageSize).toBe(1)
  })

  it('應該支援篩選條件', async () => {
    // Arrange
    const filters: ProjectMemberFilters = {
      search: '張',
      role: ['developer'],
      skills: ['React'],
      workStatus: [WorkStatus.AVAILABLE],
      isActive: true,
      workloadRange: { min: 50, max: 100 }
    }

    mockApiInstance.queryProjectMembers.mockResolvedValue({
      success: true,
      data: [mockProjectMembers[0]],
      total: 1,
      page: 1,
      pageSize: 10,
      hasMore: false,
      message: 'Success'
    })

    const wrapper = createWrapper(queryClient)

    // Act
    const { result } = renderHook(
      () => useProjectMembersQuery('proj-001', {
        page: 1,
        pageSize: 10,
        filters
      }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Assert
    expect(mockApiInstance.queryProjectMembers).toHaveBeenCalledWith('proj-001', {
      page: 1,
      pageSize: 10,
      filters
    })
  })

  it('應該正確處理錯誤狀態', async () => {
    // Arrange
    const errorMessage = '載入失敗'
    mockApiInstance.queryProjectMembers.mockRejectedValue(new Error(errorMessage))

    const wrapper = createWrapper(queryClient)

    // Act
    const { result } = renderHook(
      () => useProjectMembersQuery('proj-001'),
      { wrapper }
    )

    // Wait for error with longer timeout
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    }, { timeout: 3000 })

    // Assert
    expect(result.current.error).toBeDefined()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('應該支援手動重新獲取', async () => {
    // Arrange
    mockApiInstance.queryProjectMembers.mockResolvedValue({
      success: true,
      data: mockProjectMembers,
      total: 2,
      page: 1,
      pageSize: 10,
      hasMore: false,
      message: 'Success'
    })

    const wrapper = createWrapper(queryClient)

    // Act
    const { result } = renderHook(
      () => useProjectMembersQuery('proj-001'),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Reset mock call count
    mockApiInstance.queryProjectMembers.mockClear()

    // Refetch
    await act(async () => {
      await result.current.refetch()
    })

    // Assert
    expect(mockApiInstance.queryProjectMembers).toHaveBeenCalledTimes(1)
  })
})

describe('useProjectMemberSearch', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createQueryClient()
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('應該提供搜索建議', async () => {
    // Arrange
    const mockSearchResults = [
      { value: '張小明', label: '張小明 (developer)', type: 'user' },
      { value: 'React', label: 'React', type: 'skill' }
    ]

    mockApiInstance.searchProjectMembers.mockResolvedValue({
      success: true,
      data: mockSearchResults,
      message: 'Success'
    })

    const wrapper = createWrapper(queryClient)

    // Act
    const { result } = renderHook(
      () => useProjectMemberSearch('proj-001'),
      { wrapper }
    )

    await act(async () => {
      await result.current.search('張')
    })

    // Assert
    await waitFor(() => {
      expect(result.current.suggestions).toEqual(mockSearchResults)
    })
    expect(mockApiInstance.searchProjectMembers).toHaveBeenCalledWith('proj-001', '張')
  })

  it('應該實現防抖機制', async () => {
    // Arrange
    mockApiInstance.searchProjectMembers.mockResolvedValue({
      success: true,
      data: [],
      message: 'Success'
    })

    const wrapper = createWrapper(queryClient)

    // Act
    const { result } = renderHook(
      () => useProjectMemberSearch('proj-001', { debounceMs: 300 }),
      { wrapper }
    )

    // Multiple rapid calls
    act(() => {
      result.current.search('張')
      result.current.search('張小')
      result.current.search('張小明')
    })

    // Wait for debounce
    await waitFor(() => {
      expect(mockApiInstance.searchProjectMembers).toHaveBeenCalledTimes(1)
    })

    expect(mockApiInstance.searchProjectMembers).toHaveBeenCalledWith('proj-001', '張小明')
  })
})

describe('useProjectMemberStats', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createQueryClient()
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('應該載入專案人員統計資料', async () => {
    // Arrange
    const mockStats = {
      totalMembers: 10,
      activeMembers: 8,
      inactiveMembers: 2,
      averageWorkload: 75,
      skillDistribution: {
        'React': 5,
        'Vue': 3,
        'Angular': 2
      },
      roleDistribution: {
        'developer': 6,
        'designer': 2,
        'manager': 2
      },
      workStatusDistribution: {
        [WorkStatus.AVAILABLE]: 5,
        [WorkStatus.BUSY]: 3,
        [WorkStatus.UNAVAILABLE]: 2
      }
    }

    mockApiInstance.getProjectMemberStats.mockResolvedValue({
      success: true,
      data: mockStats,
      message: 'Success'
    })

    const wrapper = createWrapper(queryClient)

    // Act
    const { result } = renderHook(
      () => useProjectMemberStats('proj-001'),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Assert
    expect(result.current.data).toEqual(mockStats)
    expect(mockApiInstance.getProjectMemberStats).toHaveBeenCalledWith('proj-001')
  })
})