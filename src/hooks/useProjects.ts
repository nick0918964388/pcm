/**
 * useProjects Hook - Project Management Custom Hook
 * 
 * This hook provides a comprehensive interface for managing project data and state.
 * It integrates with the project store (projectStore.ts) and handles all project-related
 * operations including fetching, filtering, sorting, and pagination.
 * 
 * @module useProjects
 * @version 1.0
 * @date 2025-08-29
 * 
 * Requirements Coverage:
 * - US2 (AC2.1, AC2.2): Project search and filtering functionality
 * - US4 (AC4.1, AC4.2): Responsive experience with desktop and mobile support
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { 
  Project, 
  ProjectFilters, 
  ProjectSort, 
  ProjectPagination, 
  ViewMode,
  ProjectStatus,
  ProjectType
} from '@/types/project'

/**
 * Mock data for development - simulating projectStore integration
 * In a real implementation, this would import from src/store/projectStore.ts
 */
const mockProjectData: Project[] = [
  {
    id: '1',
    code: 'F20P1',
    name: '台北捷運信義線延伸工程',
    description: '捷運信義線從象山站延伸至貓空地區的大型基礎設施建設項目',
    status: 'IN_PROGRESS' as any,
    type: 'INFRASTRUCTURE' as any,
    progress: 65,
    startDate: new Date('2024-01-15'),
    endDate: new Date('2025-12-31'),
    actualStartDate: new Date('2024-01-20'),
    managerId: 'mgr001',
    managerName: '王大明',
    teamMembers: [],
    totalBudget: 15000000000,
    usedBudget: 9750000000,
    currency: 'TWD',
    totalMilestones: 15,
    completedMilestones: 10,
    permissions: [],
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2024-08-20'),
    tags: ['交通', '基礎建設', '政府專案'],
    location: '台北市信義區',
    client: '台北市政府交通局',
    lastAccessDate: new Date('2024-08-28')
  },
  {
    id: '2',
    code: 'F22P4',
    name: '高雄港區再開發計畫',
    description: '高雄港舊港區轉型為現代化商業及住宅複合區域',
    status: 'PLANNING' as any,
    type: 'CONSTRUCTION' as any,
    progress: 25,
    startDate: new Date('2024-03-01'),
    endDate: new Date('2026-08-31'),
    managerId: 'mgr002',
    managerName: '李小華',
    teamMembers: [],
    totalBudget: 8500000000,
    usedBudget: 2125000000,
    currency: 'TWD',
    totalMilestones: 12,
    completedMilestones: 3,
    permissions: [],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-08-25'),
    tags: ['都市更新', '港區開發'],
    location: '高雄市前鎮區',
    client: '高雄市政府都發局',
    lastAccessDate: new Date('2024-08-27')
  },
  {
    id: '3',
    code: 'F23P2',
    name: '台中綠能科技園區',
    description: '打造亞洲最大的綠色能源科技研發與製造基地',
    status: 'IN_PROGRESS' as any,
    type: 'INFRASTRUCTURE' as any,
    progress: 80,
    startDate: new Date('2023-06-01'),
    endDate: new Date('2024-12-31'),
    actualStartDate: new Date('2023-06-15'),
    managerId: 'mgr003',
    managerName: '張志明',
    teamMembers: [],
    totalBudget: 12000000000,
    usedBudget: 9600000000,
    currency: 'TWD',
    totalMilestones: 18,
    completedMilestones: 14,
    permissions: [],
    createdAt: new Date('2023-04-01'),
    updatedAt: new Date('2024-08-29'),
    tags: ['綠能', '科技園區', '永續發展'],
    location: '台中市西屯區',
    client: '經濟部工業局'
  }
]

/**
 * Mock store state for simulating Zustand store behavior
 */
let mockStoreState = {
  projects: mockProjectData,
  loading: false,
  error: null as string | null,
  filters: {} as ProjectFilters,
  viewMode: ViewMode.GRID,
  pagination: {
    page: 1,
    pageSize: 10,
    total: mockProjectData.length,
    totalPages: Math.ceil(mockProjectData.length / 10)
  }
}

/**
 * Project management hook return interface
 */
export interface UseProjectsReturn {
  // ===== State =====
  /** List of projects */
  projects: Project[]
  /** Loading state */
  loading: boolean
  /** Error message if any */
  error: string | null
  /** Current filters applied */
  filters: ProjectFilters
  /** Current view mode (grid/table) */
  viewMode: ViewMode
  /** Pagination information */
  pagination: ProjectPagination
  
  // ===== Computed Values =====
  /** Filtered projects based on current filters */
  filteredProjects: Project[]
  /** Total count of filtered projects */
  filteredCount: number
  /** Whether there are active filters */
  hasActiveFilters: boolean
  
  // ===== Actions =====
  /** Load projects from API/store */
  loadProjects: () => Promise<void>
  /** Search projects by keyword */
  searchProjects: (query: string) => Promise<void>
  /** Apply filters to project list */
  applyFilters: (filters: Partial<ProjectFilters>) => Promise<void>
  /** Reset all filters */
  resetFilters: () => void
  /** Toggle view mode between grid and table */
  toggleViewMode: () => void
  /** Change pagination settings */
  changePage: (page: number, pageSize?: number) => Promise<void>
  /** Refresh project data */
  refresh: () => Promise<void>
  /** Get project by ID */
  getProject: (id: string) => Project | undefined
}

/**
 * Custom hook for managing project data and operations
 * 
 * This hook provides a comprehensive interface for project management including:
 * - Loading and caching project data
 * - Searching and filtering projects
 * - Pagination support
 * - View mode management
 * - Error handling
 * 
 * @param initialFilters Optional initial filters to apply
 * @returns UseProjectsReturn object with state and actions
 * 
 * @example
 * ```typescript
 * function ProjectListPage() {
 *   const {
 *     projects,
 *     loading,
 *     searchProjects,
 *     applyFilters,
 *     toggleViewMode,
 *     viewMode
 *   } = useProjects()
 *   
 *   return (
 *     <div>
 *       <SearchInput onSearch={searchProjects} />
 *       <FilterPanel onFiltersChange={applyFilters} />
 *       <ViewToggle mode={viewMode} onToggle={toggleViewMode} />
 *       <ProjectList projects={projects} loading={loading} />
 *     </div>
 *   )
 * }
 * ```
 */
export const useProjects = (initialFilters?: ProjectFilters): UseProjectsReturn => {
  // Local state to trigger re-renders when mockStoreState changes
  const [, forceUpdate] = useState({})
  const triggerUpdate = useCallback(() => forceUpdate({}), [])

  // Initialize filters with provided initial filters
  useEffect(() => {
    if (initialFilters) {
      mockStoreState.filters = { ...mockStoreState.filters, ...initialFilters }
      triggerUpdate()
    }
  }, [initialFilters, triggerUpdate])

  /**
   * Apply text search filter to projects
   */
  const filterBySearch = useCallback((projects: Project[], search: string): Project[] => {
    if (!search.trim()) return projects
    
    const searchLower = search.toLowerCase().trim()
    return projects.filter(project => 
      project.name.toLowerCase().includes(searchLower) ||
      project.code.toLowerCase().includes(searchLower) ||
      project.description.toLowerCase().includes(searchLower) ||
      project.managerName.toLowerCase().includes(searchLower) ||
      project.client?.toLowerCase().includes(searchLower) ||
      project.location?.toLowerCase().includes(searchLower)
    )
  }, [])

  /**
   * Apply status filter to projects
   */
  const filterByStatus = useCallback((projects: Project[], statuses: ProjectStatus[]): Project[] => {
    if (!statuses || statuses.length === 0) return projects
    return projects.filter(project => statuses.includes(project.status as ProjectStatus))
  }, [])

  /**
   * Apply type filter to projects
   */
  const filterByType = useCallback((projects: Project[], types: ProjectType[]): Project[] => {
    if (!types || types.length === 0) return projects
    return projects.filter(project => types.includes(project.type as ProjectType))
  }, [])

  /**
   * Apply date range filter to projects
   */
  const filterByDateRange = useCallback((projects: Project[], dateRange: ProjectFilters['startDateRange']): Project[] => {
    if (!dateRange) return projects
    return projects.filter(project => 
      project.startDate >= dateRange.from && project.startDate <= dateRange.to
    )
  }, [])

  /**
   * Apply progress range filter to projects
   */
  const filterByProgress = useCallback((projects: Project[], progressRange: ProjectFilters['progressRange']): Project[] => {
    if (!progressRange) return projects
    return projects.filter(project => 
      project.progress >= progressRange.min && project.progress <= progressRange.max
    )
  }, [])

  /**
   * Get filtered projects based on current filters
   */
  const filteredProjects = useMemo(() => {
    let result = [...mockStoreState.projects]
    const { filters } = mockStoreState

    // Apply search filter
    if (filters.search) {
      result = filterBySearch(result, filters.search)
    }

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      result = filterByStatus(result, filters.status)
    }

    // Apply type filter
    if (filters.type && filters.type.length > 0) {
      result = filterByType(result, filters.type)
    }

    // Apply date range filter
    if (filters.startDateRange) {
      result = filterByDateRange(result, filters.startDateRange)
    }

    // Apply progress range filter
    if (filters.progressRange) {
      result = filterByProgress(result, filters.progressRange)
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      result = result.filter(project => 
        filters.tags!.some(tag => project.tags.includes(tag))
      )
    }

    // Apply manager filter
    if (filters.managerId) {
      result = result.filter(project => project.managerId === filters.managerId)
    }

    return result
  }, [mockStoreState.projects, mockStoreState.filters, filterBySearch, filterByStatus, filterByType, filterByDateRange, filterByProgress, triggerUpdate])

  /**
   * Check if there are any active filters
   */
  const hasActiveFilters = useMemo(() => {
    const { filters } = mockStoreState
    return !!(
      filters.search ||
      (filters.status && filters.status.length > 0) ||
      (filters.type && filters.type.length > 0) ||
      filters.startDateRange ||
      filters.progressRange ||
      (filters.tags && filters.tags.length > 0) ||
      filters.managerId
    )
  }, [mockStoreState.filters])

  /**
   * Load projects from API (simulated)
   */
  const loadProjects = useCallback(async (): Promise<void> => {
    mockStoreState.loading = true
    mockStoreState.error = null
    triggerUpdate()

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // In real implementation, this would call the project store's fetchProjects method
      // await projectStore.fetchProjects()
      
      mockStoreState.loading = false
    } catch (error) {
      mockStoreState.error = error instanceof Error ? error.message : '載入專案資料失敗'
      mockStoreState.loading = false
    }
    triggerUpdate()
  }, [triggerUpdate])

  /**
   * Search projects by keyword
   */
  const searchProjects = useCallback(async (query: string): Promise<void> => {
    mockStoreState.filters = {
      ...mockStoreState.filters,
      search: query
    }
    
    // Reset pagination when searching
    mockStoreState.pagination = {
      ...mockStoreState.pagination,
      page: 1
    }
    
    triggerUpdate()
    // In real implementation, this might trigger a new API call
    // await loadProjects()
  }, [triggerUpdate])

  /**
   * Apply filters to project list
   */
  const applyFilters = useCallback(async (newFilters: Partial<ProjectFilters>): Promise<void> => {
    mockStoreState.filters = {
      ...mockStoreState.filters,
      ...newFilters
    }
    
    // Reset pagination when applying filters
    mockStoreState.pagination = {
      ...mockStoreState.pagination,
      page: 1
    }
    
    triggerUpdate()
    // await loadProjects()
  }, [triggerUpdate])

  /**
   * Reset all filters
   */
  const resetFilters = useCallback(() => {
    mockStoreState.filters = {}
    mockStoreState.pagination = {
      ...mockStoreState.pagination,
      page: 1
    }
    triggerUpdate()
  }, [triggerUpdate])

  /**
   * Toggle view mode between grid and table
   */
  const toggleViewMode = useCallback(() => {
    mockStoreState.viewMode = mockStoreState.viewMode === ViewMode.GRID 
      ? ViewMode.TABLE 
      : ViewMode.GRID
    triggerUpdate()
  }, [triggerUpdate])

  /**
   * Change pagination settings
   */
  const changePage = useCallback(async (page: number, pageSize?: number): Promise<void> => {
    mockStoreState.pagination = {
      ...mockStoreState.pagination,
      page,
      ...(pageSize && { pageSize })
    }
    
    triggerUpdate()
    // await loadProjects()
  }, [triggerUpdate])

  /**
   * Refresh project data
   */
  const refresh = useCallback(async (): Promise<void> => {
    await loadProjects()
  }, [loadProjects])

  /**
   * Get project by ID
   */
  const getProject = useCallback((id: string): Project | undefined => {
    return mockStoreState.projects.find(project => project.id === id)
  }, [])

  // Load projects on mount
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return {
    // State
    projects: mockStoreState.projects,
    loading: mockStoreState.loading,
    error: mockStoreState.error,
    filters: mockStoreState.filters,
    viewMode: mockStoreState.viewMode,
    pagination: mockStoreState.pagination,
    
    // Computed values
    filteredProjects,
    filteredCount: filteredProjects.length,
    hasActiveFilters,
    
    // Actions
    loadProjects,
    searchProjects,
    applyFilters,
    resetFilters,
    toggleViewMode,
    changePage,
    refresh,
    getProject
  }
}

/**
 * Hook for managing a single project
 * 
 * @param projectId The ID of the project to manage
 * @returns Object with project data and actions
 */
export const useProject = (projectId: string) => {
  const { getProject, refresh } = useProjects()
  
  const project = useMemo(() => getProject(projectId), [getProject, projectId])
  
  return {
    project,
    refresh,
    loading: false, // Would be managed by individual project store
    error: null
  }
}

export default useProjects