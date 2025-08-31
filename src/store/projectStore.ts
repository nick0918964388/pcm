/**
 * Project Store - Zustand-based state management for project functionality
 * 
 * This store provides comprehensive state management for project-related operations
 * including fetching, filtering, searching, and real-time updates.
 * 
 * @module ProjectStore
 * @version 1.0
 * @date 2025-08-30
 * 
 * Requirements Coverage:
 * - US2 (AC2.1, AC2.2): Project search and filtering functionality
 * - US6 (AC6.1): Real-time project progress updates
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
  Project,
  ProjectFilters,
  ProjectSort,
  ProjectPagination,
  ViewMode,
  ProjectStatus,
  ProjectType,
  ApiResponse,
  ProjectListResponse,
} from '../types/project'

// ==================== TYPES ====================

/**
 * Project store state interface
 */
export interface ProjectStoreState {
  // ===== Core Data =====
  /** List of all projects */
  projects: Project[]
  /** Currently filtered projects for display */
  filteredProjects: Project[]
  /** Loading state for async operations */
  loading: boolean
  /** Error message if any */
  error: string | null
  
  // ===== Filter & Search State =====
  /** Current applied filters */
  filters: ProjectFilters
  /** Current search query */
  searchQuery: string
  /** Current sort configuration */
  sort: ProjectSort
  /** Current pagination state */
  pagination: ProjectPagination
  /** Current view mode (grid/table) */
  viewMode: ViewMode
  
  // ===== UI State =====
  /** Selected project IDs */
  selectedProjects: string[]
  /** Whether the store has been initialized */
  initialized: boolean
  
  // ===== Real-time Updates =====
  /** Last update timestamp */
  lastUpdate: Date | null
  /** Real-time update subscription status */
  subscribed: boolean
}

/**
 * Project store actions interface
 */
export interface ProjectStoreActions {
  // ===== Data Loading =====
  /** Initialize the store and load initial data */
  initialize: () => Promise<void>
  /** Fetch all projects from API */
  fetchProjects: () => Promise<void>
  /** Refresh project data */
  refresh: () => Promise<void>
  /** Get project by ID */
  getProject: (id: string) => Project | undefined
  
  // ===== Search & Filter Actions =====
  /** Search projects by query string */
  searchProjects: (query: string) => Promise<void>
  /** Apply filters to project list */
  applyFilters: (filters: Partial<ProjectFilters>) => Promise<void>
  /** Reset all filters */
  resetFilters: () => void
  /** Set sort configuration */
  setSort: (sort: ProjectSort) => void
  /** Apply filters and update filtered projects */
  updateFilteredProjects: () => void
  
  // ===== Pagination Actions =====
  /** Change current page */
  setPage: (page: number) => void
  /** Change page size */
  setPageSize: (pageSize: number) => void
  /** Set pagination state */
  setPagination: (pagination: ProjectPagination) => void
  
  // ===== View Actions =====
  /** Toggle view mode between grid and table */
  toggleViewMode: () => void
  /** Set view mode */
  setViewMode: (mode: ViewMode) => void
  
  // ===== Selection Actions =====
  /** Select/deselect project */
  toggleProjectSelection: (projectId: string) => void
  /** Select all filtered projects */
  selectAll: () => void
  /** Clear all selections */
  clearSelection: () => void
  
  // ===== Real-time Updates =====
  /** Subscribe to real-time project updates */
  subscribeToUpdates: () => Promise<void>
  /** Unsubscribe from real-time updates */
  unsubscribeFromUpdates: () => void
  /** Handle incoming real-time update */
  handleRealtimeUpdate: (update: any) => void
  
  // ===== Utility Actions =====
  /** Set error state */
  setError: (error: string | null) => void
  /** Set loading state */
  setLoading: (loading: boolean) => void
  /** Reset store to initial state */
  reset: () => void
}

/**
 * Combined project store interface
 */
export type ProjectStore = ProjectStoreState & ProjectStoreActions

// ==================== INITIAL STATE ====================

/**
 * Default store state
 */
const initialState: ProjectStoreState = {
  // Core Data
  projects: [],
  filteredProjects: [],
  loading: false,
  error: null,
  
  // Filter & Search State
  filters: {},
  searchQuery: '',
  sort: {
    field: 'updatedAt',
    direction: 'desc',
  },
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  },
  viewMode: ViewMode.GRID,
  
  // UI State
  selectedProjects: [],
  initialized: false,
  
  // Real-time Updates
  lastUpdate: null,
  subscribed: false,
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Filter projects based on current filters and search query
 */
function filterProjects(
  projects: Project[],
  filters: ProjectFilters,
  searchQuery: string
): Project[] {
  let result = [...projects]
  
  // Apply search filter (US2 AC2.1)
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim()
    result = result.filter(project =>
      project.name.toLowerCase().includes(query) ||
      project.code.toLowerCase().includes(query) ||
      project.description.toLowerCase().includes(query) ||
      project.managerName.toLowerCase().includes(query) ||
      project.client?.toLowerCase().includes(query) ||
      project.location?.toLowerCase().includes(query) ||
      project.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }
  
  // Apply status filter (US2 AC2.2)
  if (filters.status && filters.status.length > 0) {
    result = result.filter(project => filters.status!.includes(project.status))
  }
  
  // Apply type filter
  if (filters.type && filters.type.length > 0) {
    result = result.filter(project => filters.type!.includes(project.type))
  }
  
  // Apply date range filter
  if (filters.startDateRange) {
    result = result.filter(project => 
      project.startDate >= filters.startDateRange!.from &&
      project.startDate <= filters.startDateRange!.to
    )
  }
  
  // Apply progress range filter
  if (filters.progressRange) {
    result = result.filter(project =>
      project.progress >= filters.progressRange!.min &&
      project.progress <= filters.progressRange!.max
    )
  }
  
  // Apply manager filter
  if (filters.managerId) {
    result = result.filter(project => project.managerId === filters.managerId)
  }
  
  // Apply tags filter
  if (filters.tags && filters.tags.length > 0) {
    result = result.filter(project =>
      filters.tags!.some(tag => project.tags.includes(tag))
    )
  }
  
  return result
}

/**
 * Sort projects based on sort configuration
 */
function sortProjects(projects: Project[], sort: ProjectSort): Project[] {
  const sorted = [...projects].sort((a, b) => {
    let aValue: any
    let bValue: any
    
    // Get values based on sort field
    switch (sort.field) {
      case 'name':
        aValue = a.name
        bValue = b.name
        break
      case 'code':
        aValue = a.code
        bValue = b.code
        break
      case 'status':
        aValue = a.status
        bValue = b.status
        break
      case 'type':
        aValue = a.type
        bValue = b.type
        break
      case 'progress':
        aValue = a.progress
        bValue = b.progress
        break
      case 'startDate':
        aValue = new Date(a.startDate).getTime()
        bValue = new Date(b.startDate).getTime()
        break
      case 'endDate':
        aValue = new Date(a.endDate).getTime()
        bValue = new Date(b.endDate).getTime()
        break
      case 'updatedAt':
      default:
        aValue = new Date(a.updatedAt).getTime()
        bValue = new Date(b.updatedAt).getTime()
        break
    }
    
    // Apply sorting logic
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sort.direction === 'asc'
        ? aValue.localeCompare(bValue, 'zh-TW')
        : bValue.localeCompare(aValue, 'zh-TW')
    }
    
    if (sort.direction === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })
  
  return sorted
}

/**
 * Mock API call to fetch projects
 */
async function fetchProjectsFromAPI(
  filters?: ProjectFilters,
  searchQuery?: string,
  sort?: ProjectSort,
  pagination?: ProjectPagination
): Promise<ProjectListResponse> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // In real implementation, this would make HTTP request
  // For now, return mock data to match the API structure
  const params = new URLSearchParams()
  
  if (searchQuery) {
    params.append('search', searchQuery)
  }
  
  if (pagination) {
    params.append('page', pagination.page.toString())
    params.append('limit', pagination.pageSize.toString())
  }
  
  if (sort) {
    params.append('sortBy', sort.field as string)
    params.append('sortOrder', sort.direction)
  }
  
  if (filters?.status) {
    filters.status.forEach(status => {
      params.append('status[]', status.toString())
    })
  }
  
  const response = await fetch('/api/projects?' + params.toString())
  
  if (!response.ok) {
    throw new Error('Failed to fetch projects')
  }
  
  return response.json()
}

// ==================== STORE IMPLEMENTATION ====================

/**
 * Create the project store using Zustand
 */
export const useProjectStore = create<ProjectStore>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // ===== Data Loading Actions =====
      
      initialize: async () => {
        const state = get()
        if (state.initialized) return
        
        set({ initialized: true, loading: true })
        
        try {
          await get().fetchProjects()
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '初始化失敗',
            loading: false 
          })
        }
      },
      
      fetchProjects: async () => {
        set({ loading: true, error: null })
        
        try {
          const state = get()
          const response = await fetchProjectsFromAPI(
            state.filters,
            state.searchQuery,
            state.sort,
            state.pagination
          )
          
          if (response.success) {
            set({
              projects: response.data,
              pagination: response.pagination || state.pagination,
              lastUpdate: new Date(),
              loading: false,
            })
            
            // Update filtered projects
            get().updateFilteredProjects()
          } else {
            throw new Error(response.message || '載入專案失敗')
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '載入專案失敗',
            loading: false,
          })
        }
      },
      
      refresh: async () => {
        await get().fetchProjects()
      },
      
      getProject: (id: string) => {
        return get().projects.find(project => project.id === id)
      },
      
      // ===== Search & Filter Actions =====
      
      searchProjects: async (query: string) => {
        set({ searchQuery: query, pagination: { ...get().pagination, page: 1 } })
        get().updateFilteredProjects()
        
        // In real implementation, might trigger new API call
        // await get().fetchProjects()
      },
      
      applyFilters: async (newFilters: Partial<ProjectFilters>) => {
        set({
          filters: { ...get().filters, ...newFilters },
          pagination: { ...get().pagination, page: 1 }
        })
        get().updateFilteredProjects()
        
        // In real implementation, might trigger new API call
        // await get().fetchProjects()
      },
      
      resetFilters: () => {
        set({
          filters: {},
          searchQuery: '',
          pagination: { ...get().pagination, page: 1 }
        })
        get().updateFilteredProjects()
      },
      
      setSort: (sort: ProjectSort) => {
        set({ sort })
        get().updateFilteredProjects()
      },
      
      updateFilteredProjects: () => {
        const state = get()
        let filtered = filterProjects(state.projects, state.filters, state.searchQuery)
        filtered = sortProjects(filtered, state.sort)
        
        // Update pagination total
        const total = filtered.length
        const totalPages = Math.ceil(total / state.pagination.pageSize)
        
        set({
          filteredProjects: filtered,
          pagination: {
            ...state.pagination,
            total,
            totalPages
          }
        })
      },
      
      // ===== Pagination Actions =====
      
      setPage: (page: number) => {
        set({ pagination: { ...get().pagination, page } })
      },
      
      setPageSize: (pageSize: number) => {
        set({
          pagination: {
            ...get().pagination,
            pageSize,
            page: 1,
            totalPages: Math.ceil(get().pagination.total / pageSize)
          }
        })
        get().updateFilteredProjects()
      },
      
      setPagination: (pagination: ProjectPagination) => {
        set({ pagination })
      },
      
      // ===== View Actions =====
      
      toggleViewMode: () => {
        const currentMode = get().viewMode
        set({ viewMode: currentMode === ViewMode.GRID ? ViewMode.TABLE : ViewMode.GRID })
      },
      
      setViewMode: (mode: ViewMode) => {
        set({ viewMode: mode })
      },
      
      // ===== Selection Actions =====
      
      toggleProjectSelection: (projectId: string) => {
        const state = get()
        const isSelected = state.selectedProjects.includes(projectId)
        
        if (isSelected) {
          set({ selectedProjects: state.selectedProjects.filter(id => id !== projectId) })
        } else {
          set({ selectedProjects: [...state.selectedProjects, projectId] })
        }
      },
      
      selectAll: () => {
        const filteredProjectIds = get().filteredProjects.map(p => p.id)
        set({ selectedProjects: filteredProjectIds })
      },
      
      clearSelection: () => {
        set({ selectedProjects: [] })
      },
      
      // ===== Real-time Updates =====
      
      subscribeToUpdates: async () => {
        if (get().subscribed) return
        
        set({ subscribed: true })
        
        // In real implementation, this would establish WebSocket connection
        // or Server-Sent Events for real-time updates (US6 AC6.1)
        console.log('Subscribed to real-time project updates')
        
        // Simulate periodic updates
        const interval = setInterval(async () => {
          if (!get().subscribed) {
            clearInterval(interval)
            return
          }
          
          // Simulate receiving real-time updates
          const updates = await fetch('/api/projects/progress-updates').then(r => r.json())
          if (updates.success && updates.data?.updates?.length > 0) {
            get().handleRealtimeUpdate(updates.data.updates)
          }
        }, 30000) // Check every 30 seconds
      },
      
      unsubscribeFromUpdates: () => {
        set({ subscribed: false })
        console.log('Unsubscribed from real-time project updates')
      },
      
      handleRealtimeUpdate: (updates: any[]) => {
        const state = get()
        let hasChanges = false
        
        const updatedProjects = state.projects.map(project => {
          const update = updates.find(u => u.projectId === project.id)
          if (update) {
            hasChanges = true
            return {
              ...project,
              progress: update.currentProgress,
              updatedAt: new Date(update.updatedAt),
            }
          }
          return project
        })
        
        if (hasChanges) {
          set({
            projects: updatedProjects,
            lastUpdate: new Date(),
          })
          get().updateFilteredProjects()
        }
      },
      
      // ===== Utility Actions =====
      
      setError: (error: string | null) => {
        set({ error })
      },
      
      setLoading: (loading: boolean) => {
        set({ loading })
      },
      
      reset: () => {
        set({ ...initialState })
      },
    }),
    {
      name: 'project-store',
    }
  )
)

// ==================== SELECTORS ====================

/**
 * Selector to get paginated projects for current page
 */
export const usePaginatedProjects = () => {
  return useProjectStore(state => {
    const { filteredProjects, pagination } = state
    const startIndex = (pagination.page - 1) * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    return filteredProjects.slice(startIndex, endIndex)
  }, (prev, curr) => {
    // Custom equality check to prevent unnecessary re-renders
    if (prev.length !== curr.length) return false
    return prev.every((project, index) => project.id === curr[index]?.id)
  })
}

/**
 * Selector to check if there are active filters
 */
export const useHasActiveFilters = () => {
  return useProjectStore(state => {
    const { filters, searchQuery } = state
    return !!(
      searchQuery ||
      (filters.status && filters.status.length > 0) ||
      (filters.type && filters.type.length > 0) ||
      filters.startDateRange ||
      filters.progressRange ||
      (filters.tags && filters.tags.length > 0) ||
      filters.managerId
    )
  })
}

/**
 * Selector to get project statistics
 */
export const useProjectStatistics = () => {
  return useProjectStore(state => {
    const { projects } = state
    const total = projects.length
    const byStatus = projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1
      return acc
    }, {} as Record<ProjectStatus, number>)
    
    return {
      total,
      byStatus,
      activeCount: byStatus[ProjectStatus.IN_PROGRESS] || 0,
      completedCount: byStatus[ProjectStatus.COMPLETED] || 0,
      averageProgress: total > 0 
        ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / total)
        : 0,
    }
  }, (prev, curr) => {
    // Custom equality check
    return prev.total === curr.total && 
           prev.activeCount === curr.activeCount && 
           prev.completedCount === curr.completedCount &&
           prev.averageProgress === curr.averageProgress
  })
}

export default useProjectStore