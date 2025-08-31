/**
 * Projects Page - Main Project Selection Interface
 * 
 * This is the central hub for project selection that serves as the main entry point
 * for users to browse, search, filter, and select projects. The page integrates
 * all existing components to provide a comprehensive project management interface.
 * 
 * @module ProjectsPage
 * @version 1.0
 * @date 2025-08-30
 * 
 * Requirements Coverage:
 * - US1 (AC1.1): Display list of accessible projects
 * - US1 (AC1.2): Show project basic info (code, name, status, progress)
 * - US1 (AC1.3): Support grid and table view modes
 * - US2 (AC2.1, AC2.2, AC2.3): Search and filtering functionality
 * - US4 (AC4.1, AC4.2): Responsive desktop and mobile experience
 */

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useProjects } from '@/hooks/useProjects'
import { ViewMode, Project } from '@/types/project'

// Import existing components
import {
  ProjectGrid,
  ProjectTable,
  SearchFilter,
  ViewModeToggle
} from './components'

// Import UI components
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

// Import icons
import { 
  RefreshCw, 
  FolderOpen, 
  TrendingUp, 
  Clock, 
  Users,
  Settings,
  Search,
  Filter
} from 'lucide-react'

// ==================== INTERFACES ====================

/**
 * Page metadata for SEO and navigation
 */
interface PageMetadata {
  title: string
  description: string
  keywords: string[]
}

/**
 * Project summary statistics for the header
 */
interface ProjectSummary {
  total: number
  active: number
  completed: number
  overdue: number
}

// ==================== CONSTANTS ====================

/**
 * Page metadata
 */
const PAGE_METADATA: PageMetadata = {
  title: '專案選擇 - PCM 專案管理系統',
  description: '瀏覽和選擇您有權限存取的專案，支援搜尋和篩選功能',
  keywords: ['專案管理', '專案選擇', '工程管理', 'PCM']
}

/**
 * Debounce delay for search input
 */
const SEARCH_DEBOUNCE_DELAY = 300

// ==================== MAIN COMPONENT ====================

/**
 * Projects Page Component
 * 
 * Main page component that serves as the central hub for project selection.
 * Integrates all existing components to provide a comprehensive interface
 * for browsing, searching, filtering, and selecting projects.
 * 
 * Features:
 * - Project list display with grid/table view modes
 * - Search and filtering functionality
 * - Responsive design for all device sizes
 * - Project navigation and access recording
 * - Real-time project statistics
 * - Loading and error state handling
 * 
 * @returns JSX.Element The projects page component
 */
export default function ProjectsPage() {
  const router = useRouter()

  // ===== State Management =====
  
  // Get project data and operations from the useProjects hook
  const {
    projects,
    filteredProjects,
    loading,
    error,
    filters,
    viewMode,
    pagination,
    filteredCount,
    hasActiveFilters,
    searchProjects,
    applyFilters,
    resetFilters,
    toggleViewMode,
    refresh,
    getProject
  } = useProjects()

  // Local state for UI interactions
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState(filters.search || '')
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null)

  // Search debounce timer
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // ===== Computed Values =====

  /**
   * Calculate project summary statistics
   */
  const projectSummary: ProjectSummary = React.useMemo(() => {
    const total = filteredProjects.length
    const active = filteredProjects.filter(p => p.status === '進行中').length
    const completed = filteredProjects.filter(p => p.status === '已完成').length
    const overdue = filteredProjects.filter(p => {
      const now = new Date()
      return p.status !== '已完成' && p.status !== '已取消' && 
             new Date(p.endDate) < now
    }).length

    return { total, active, completed, overdue }
  }, [filteredProjects])

  /**
   * Get available managers for filter options
   */
  const availableManagers = React.useMemo(() => {
    const managers = new Map<string, { id: string; name: string }>()
    projects.forEach(project => {
      if (!managers.has(project.managerId)) {
        managers.set(project.managerId, {
          id: project.managerId,
          name: project.managerName
        })
      }
    })
    return Array.from(managers.values())
  }, [projects])

  /**
   * Get available tags for filter options
   */
  const availableTags = React.useMemo(() => {
    const tags = new Set<string>()
    projects.forEach(project => {
      project.tags.forEach(tag => tags.add(tag))
    })
    return Array.from(tags).sort()
  }, [projects])

  // ===== Event Handlers =====

  /**
   * Handle search input changes with debouncing
   */
  const handleSearchChange = React.useCallback((value: string) => {
    setSearchValue(value)
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      searchProjects(value)
    }, SEARCH_DEBOUNCE_DELAY)
  }, [searchProjects])

  /**
   * Handle filter changes
   */
  const handleFiltersChange = React.useCallback(async (newFilters: any) => {
    await applyFilters(newFilters)
  }, [applyFilters])

  /**
   * Handle filter reset
   */
  const handleFiltersReset = React.useCallback(() => {
    setSearchValue('')
    resetFilters()
  }, [resetFilters])

  /**
   * Handle view mode toggle
   */
  const handleViewModeToggle = React.useCallback(() => {
    toggleViewMode()
  }, [toggleViewMode])

  /**
   * Handle project navigation (enter project)
   */
  const handleProjectEnter = React.useCallback(async (projectId: string) => {
    try {
      setSelectedProjectId(projectId)
      
      // In a real application, this would navigate to the project detail page
      // For now, we'll use the dashboard route as a placeholder
      router.push(`/dashboard?projectId=${projectId}`)
      
    } catch (error) {
      console.error('進入專案時發生錯誤:', error)
      setSelectedProjectId(null)
    }
  }, [router])

  /**
   * Handle access recording
   */
  const handleAccessRecord = React.useCallback(async (projectId: string) => {
    try {
      // In a real application, this would call an API to record access
      console.log('記錄專案存取:', projectId)
      
      // Update the last access date in the project data
      const project = getProject(projectId)
      if (project) {
        project.lastAccessDate = new Date()
      }
      
    } catch (error) {
      console.error('記錄專案存取時發生錯誤:', error)
    }
  }, [getProject])

  /**
   * Handle refresh button click
   */
  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refresh()
    } finally {
      setIsRefreshing(false)
    }
  }, [refresh])

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'r':
          e.preventDefault()
          handleRefresh()
          break
        case 'f':
          e.preventDefault()
          // Focus search input (would need ref to implement)
          break
        case '1':
          e.preventDefault()
          if (viewMode !== ViewMode.GRID) handleViewModeToggle()
          break
        case '2':
          e.preventDefault()
          if (viewMode !== ViewMode.TABLE) handleViewModeToggle()
          break
      }
    }
  }, [handleRefresh, handleViewModeToggle, viewMode])

  // ===== Effects =====

  /**
   * Set up keyboard event listeners
   */
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Convert native event to React event
      handleKeyDown(e as any)
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleKeyDown])

  /**
   * Clean up search timeout on unmount
   */
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // ===== Render Helpers =====

  /**
   * Render project statistics cards
   */
  const renderProjectStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">總專案</p>
            <p className="text-2xl font-bold text-primary">{projectSummary.total}</p>
          </div>
          <FolderOpen className="h-8 w-8 text-muted-foreground" />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">進行中</p>
            <p className="text-2xl font-bold text-blue-600">{projectSummary.active}</p>
          </div>
          <TrendingUp className="h-8 w-8 text-blue-600" />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">已完成</p>
            <p className="text-2xl font-bold text-green-600">{projectSummary.completed}</p>
          </div>
          <Users className="h-8 w-8 text-green-600" />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">已逾期</p>
            <p className="text-2xl font-bold text-red-600">{projectSummary.overdue}</p>
          </div>
          <Clock className="h-8 w-8 text-red-600" />
        </div>
      </Card>
    </div>
  )

  /**
   * Render page header with title and actions
   */
  const renderPageHeader = () => (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          專案選擇
        </h1>
        <p className="text-muted-foreground">
          瀏覽和管理您有權限存取的專案
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading || isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={cn(
            "h-4 w-4",
            (loading || isRefreshing) && "animate-spin"
          )} />
          <span className="hidden sm:inline">重新整理</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">設定</span>
        </Button>
      </div>
    </div>
  )

  /**
   * Render search and filter controls
   */
  const renderFilterControls = () => (
    <div className="space-y-4 mb-6">
      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜尋專案名稱、代碼或描述..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ViewModeToggle
            currentMode={viewMode}
            onModeChange={handleViewModeToggle}
            size="md"
          />
        </div>
      </div>

      {/* Advanced Filters */}
      <SearchFilter
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={hasActiveFilters ? handleFiltersReset : undefined}
        loading={loading}
        availableManagers={availableManagers}
        availableTags={availableTags}
        layout="compact"
        className="bg-background"
      />

      {/* Filter Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>
            顯示 {filteredCount} 個專案 (共 {projects.length} 個)
          </span>
        </div>
      )}
    </div>
  )

  /**
   * Render loading state
   */
  const renderLoadingState = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-12" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-6">
        {viewMode === ViewMode.GRID ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }, (_, i) => (
              <Card key={i} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-12" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="h-10 w-full" />
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="p-6 space-y-4">
              {Array.from({ length: 10 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )

  // ===== Main Render =====

  return (
    <div className="min-h-screen bg-background">
      {/* Page Container */}
      <div className="container mx-auto px-4 py-6 lg:px-8 lg:py-8">
        {/* Page Header */}
        {renderPageHeader()}

        {/* Project Statistics */}
        {!loading && renderProjectStats()}

        {/* Search and Filter Controls */}
        {renderFilterControls()}

        {/* Main Content Area */}
        <div className="space-y-6">
          {/* Loading State */}
          {loading && renderLoadingState()}

          {/* Error State */}
          {error && !loading && (
            <Card className="p-6">
              <div className="text-center text-red-600">
                <p className="font-medium">載入專案資料時發生錯誤</p>
                <p className="text-sm mt-2">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  className="mt-4"
                >
                  重試
                </Button>
              </div>
            </Card>
          )}

          {/* Project List Content */}
          {!loading && !error && (
            <>
              {/* Grid View */}
              {viewMode === ViewMode.GRID && (
                <ProjectGrid
                  projects={filteredProjects}
                  loading={loading}
                  error={error}
                  onProjectEnter={handleProjectEnter}
                  onAccessRecord={handleAccessRecord}
                  onRetry={handleRefresh}
                  className="w-full"
                />
              )}

              {/* Table View */}
              {viewMode === ViewMode.TABLE && (
                <ProjectTable
                  projects={filteredProjects}
                  loading={loading}
                  onProjectEnter={handleProjectEnter}
                  onAccessRecord={handleAccessRecord}
                  emptyText="沒有找到符合條件的專案"
                  className="w-full"
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Loading Indicator for Navigation */}
      {selectedProjectId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>正在進入專案...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

// ==================== METADATA ====================

/**
 * Page metadata is handled by Next.js App Router automatically for client components
 * For server components, metadata would be exported separately
 */