import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  useProjectScopeStore,
  useProjectMembers,
  useWBSTree,
  useMemberFilters,
  useWBSOperations
} from '../projectScopeStore'
import {
  ProjectMemberExtended,
  ProjectMemberFilters,
  WorkStatus,
  SkillCategory
} from '@/types/project'
import {
  WBSItem,
  WBSStatus,
  WBSPriority,
  WBSFilters,
  WBSStatistics
} from '@/types/wbs'

// Mock timers for testing cache TTL
vi.useFakeTimers()

describe('ProjectScopeStore 專案人員管理擴展', () => {
  beforeEach(() => {
    // Clear any persisted state
    localStorage.clear()
    sessionStorage.clear()
    
    // Reset store completely
    useProjectScopeStore.persist.clearStorage()
    useProjectScopeStore.setState({
      currentProject: null,
      currentProjectPermission: 'viewer' as any,
      recentProjects: [],
      favoriteProjects: [],
      userPreferences: {
        defaultProjectView: 'grid',
        projectsPerPage: 12,
        showRecentProjects: true,
        autoSaveLastProject: true,
        theme: 'system',
        language: 'zh-TW'
      },
      isProjectSelectorOpen: false,
      loading: false,
      error: null,
      projectMembers: {
        data: [],
        filteredData: [],
        currentFilters: {},
        loading: false,
        error: null,
        pagination: {
          page: 1,
          pageSize: 10,
          total: 0,
          totalPages: 0
        },
        cache: {
          lastFetchTime: null,
          ttl: 300000 // 5 minutes
        }
      },
      wbsManagement: {
        treeData: [],
        expandedNodes: new Set(),
        selectedNodes: new Set(),
        dragState: {
          isDragging: false,
          draggedNode: null,
          dropTarget: null
        },
        viewState: {
          showCompleted: true,
          viewMode: 'tree',
          filterPanelOpen: false
        },
        currentFilters: {},
        statistics: null,
        loading: false,
        error: null,
        cache: {
          lastFetchTime: null,
          ttl: 300000
        }
      }
    }, true)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('專案人員狀態管理', () => {
    it('應該初始化專案人員狀態', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      
      expect(result.current.projectMembers).toBeDefined()
      expect(result.current.projectMembers.data).toEqual([])
      expect(result.current.projectMembers.loading).toBe(false)
      expect(result.current.projectMembers.error).toBe(null)
    })

    it('應該能載入專案人員資料', () => {
      const mockMembers: ProjectMemberExtended[] = [
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
        }
      ]

      const { result } = renderHook(() => useProjectScopeStore())
      
      act(() => {
        result.current.loadProjectMembers(mockMembers, 1, 10, 1)
      })

      expect(result.current.projectMembers.data).toEqual(mockMembers)
      expect(result.current.projectMembers.pagination.total).toBe(1)
    })

    it('應該能設定載入狀態', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      
      act(() => {
        result.current.setProjectMembersLoading(true)
      })

      expect(result.current.projectMembers.loading).toBe(true)
    })

    it('應該能設定錯誤狀態', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      const errorMessage = '載入失敗'
      
      act(() => {
        result.current.setProjectMembersError(errorMessage)
      })

      expect(result.current.projectMembers.error).toBe(errorMessage)
    })
  })

  describe('專案人員篩選功能', () => {
    it('應該能套用篩選條件', () => {
      const filters: ProjectMemberFilters = {
        search: '張小明',
        role: ['developer'],
        skills: ['React'],
        workStatus: [WorkStatus.AVAILABLE],
        isActive: true,
        workloadRange: { min: 50, max: 100 }
      }

      const { result } = renderHook(() => useProjectScopeStore())
      
      act(() => {
        result.current.applyMemberFilters(filters)
      })

      expect(result.current.projectMembers.currentFilters).toEqual(filters)
    })

    it('應該能清除篩選條件', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      
      // 先設定篩選條件
      act(() => {
        result.current.applyMemberFilters({
          search: '測試',
          role: ['developer']
        })
      })

      // 然後清除
      act(() => {
        result.current.clearMemberFilters()
      })

      expect(result.current.projectMembers.currentFilters).toEqual({})
    })

    it('應該能更新分頁設定', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      
      act(() => {
        result.current.updateMemberPagination({ page: 2, pageSize: 20 })
      })

      expect(result.current.projectMembers.pagination.page).toBe(2)
      expect(result.current.projectMembers.pagination.pageSize).toBe(20)
    })
  })

  describe('專案人員快取機制', () => {
    it('應該檢查快取是否有效', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      
      // 模擬資料載入
      act(() => {
        result.current.loadProjectMembers([], 1, 10, 0)
      })

      expect(result.current.isMemberCacheValid()).toBe(true)
    })

    it('應該在快取過期後返回無效', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      
      // 載入資料
      act(() => {
        result.current.loadProjectMembers([], 1, 10, 0)
      })

      // 模擬時間過去 6 分鐘（超過 TTL）
      act(() => {
        vi.advanceTimersByTime(6 * 60 * 1000)
      })

      expect(result.current.isMemberCacheValid()).toBe(false)
    })

    it('應該能刷新快取', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      
      act(() => {
        result.current.refreshMemberCache()
      })

      expect(result.current.projectMembers.cache.lastFetchTime).not.toBeNull()
    })
  })
})

describe('ProjectScopeStore WBS 管理擴展', () => {
  beforeEach(() => {
    // Clear any persisted state
    localStorage.clear()
    sessionStorage.clear()
    
    // Reset store completely
    useProjectScopeStore.persist.clearStorage()
    useProjectScopeStore.setState({
      currentProject: null,
      currentProjectPermission: 'viewer' as any,
      recentProjects: [],
      favoriteProjects: [],
      userPreferences: {
        defaultProjectView: 'grid',
        projectsPerPage: 12,
        showRecentProjects: true,
        autoSaveLastProject: true,
        theme: 'system',
        language: 'zh-TW'
      },
      isProjectSelectorOpen: false,
      loading: false,
      error: null,
      projectMembers: {
        data: [],
        filteredData: [],
        currentFilters: {},
        loading: false,
        error: null,
        pagination: {
          page: 1,
          pageSize: 10,
          total: 0,
          totalPages: 0
        },
        cache: {
          lastFetchTime: null,
          ttl: 300000
        }
      },
      wbsManagement: {
        treeData: [],
        expandedNodes: new Set(),
        selectedNodes: new Set(),
        dragState: {
          isDragging: false,
          draggedNode: null,
          dropTarget: null
        },
        viewState: {
          showCompleted: true,
          viewMode: 'tree',
          filterPanelOpen: false
        },
        currentFilters: {},
        statistics: null,
        loading: false,
        error: null,
        cache: {
          lastFetchTime: null,
          ttl: 300000
        }
      }
    }, true)
  })

  describe('WBS 樹狀結構管理', () => {
    it('應該初始化 WBS 狀態', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      
      expect(result.current.wbsManagement).toBeDefined()
      expect(result.current.wbsManagement.treeData).toEqual([])
      expect(result.current.wbsManagement.expandedNodes).toEqual(new Set())
      expect(result.current.wbsManagement.selectedNodes).toEqual(new Set())
    })

    it('應該能載入 WBS 樹狀資料', () => {
      const mockWBSData: WBSItem[] = [
        {
          id: 'wbs-001',
          code: '1.0',
          name: '專案規劃階段',
          status: WBSStatus.IN_PROGRESS,
          priority: WBSPriority.HIGH,
          level: 0,
          order: 1,
          projectId: 'proj-001',
          assigneeIds: ['user-001'],
          estimatedHours: 40,
          actualHours: 20,
          progress: 50,
          isMilestone: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'admin',
          updatedBy: 'admin',
          version: 1,
          children: []
        }
      ]

      const { result } = renderHook(() => useProjectScopeStore())
      
      act(() => {
        result.current.loadWBSTree(mockWBSData)
      })

      expect(result.current.wbsManagement.treeData).toEqual(mockWBSData)
    })

    it('應該能展開/摺疊節點', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      const nodeId = 'wbs-001'
      
      act(() => {
        result.current.toggleWBSNode(nodeId)
      })

      expect(result.current.wbsManagement.expandedNodes.has(nodeId)).toBe(true)
      
      act(() => {
        result.current.toggleWBSNode(nodeId)
      })

      expect(result.current.wbsManagement.expandedNodes.has(nodeId)).toBe(false)
    })

    it('應該能選取節點', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      const nodeId = 'wbs-001'
      
      act(() => {
        result.current.selectWBSNode(nodeId, false)
      })

      expect(result.current.wbsManagement.selectedNodes.has(nodeId)).toBe(true)
    })

    it('應該支援多選節點', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      const nodeId1 = 'wbs-001'
      const nodeId2 = 'wbs-002'
      
      act(() => {
        result.current.selectWBSNode(nodeId1, false)
        result.current.selectWBSNode(nodeId2, true) // 按住 Ctrl 多選
      })

      expect(result.current.wbsManagement.selectedNodes.has(nodeId1)).toBe(true)
      expect(result.current.wbsManagement.selectedNodes.has(nodeId2)).toBe(true)
    })
  })

  describe('WBS 拖拽功能', () => {
    it('應該能開始拖拽', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      const draggedNode = 'wbs-001'
      
      act(() => {
        result.current.startWBSDrag(draggedNode)
      })

      expect(result.current.wbsManagement.dragState.isDragging).toBe(true)
      expect(result.current.wbsManagement.dragState.draggedNode).toBe(draggedNode)
    })

    it('應該能設定放置目標', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      const dropTarget = 'wbs-002'
      
      act(() => {
        result.current.setWBSDropTarget(dropTarget)
      })

      expect(result.current.wbsManagement.dragState.dropTarget).toBe(dropTarget)
    })

    it('應該能結束拖拽', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      
      // 先開始拖拽
      act(() => {
        result.current.startWBSDrag('wbs-001')
      })

      // 然後結束拖拽
      act(() => {
        result.current.endWBSDrag()
      })

      expect(result.current.wbsManagement.dragState.isDragging).toBe(false)
      expect(result.current.wbsManagement.dragState.draggedNode).toBe(null)
      expect(result.current.wbsManagement.dragState.dropTarget).toBe(null)
    })
  })

  describe('WBS 篩選功能', () => {
    it('應該能套用 WBS 篩選條件', () => {
      const filters: WBSFilters = {
        status: [WBSStatus.IN_PROGRESS],
        priority: [WBSPriority.HIGH],
        assigneeId: ['user-001'],
        keyword: '規劃',
        isMilestone: false
      }

      const { result } = renderHook(() => useProjectScopeStore())
      
      act(() => {
        result.current.applyWBSFilters(filters)
      })

      expect(result.current.wbsManagement.currentFilters).toEqual(filters)
    })

    it('應該能清除 WBS 篩選條件', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      
      // 先設定篩選條件
      act(() => {
        result.current.applyWBSFilters({
          status: [WBSStatus.IN_PROGRESS]
        })
      })

      // 然後清除
      act(() => {
        result.current.clearWBSFilters()
      })

      expect(result.current.wbsManagement.currentFilters).toEqual({})
    })
  })

  describe('WBS 統計資料', () => {
    it('應該能載入 WBS 統計資料', () => {
      const mockStatistics: WBSStatistics = {
        totalItems: 10,
        completedItems: 3,
        inProgressItems: 4,
        pendingItems: 2,
        overdueItems: 1,
        completionRate: 30,
        totalEstimatedHours: 200,
        totalActualHours: 120,
        averageProgress: 45,
        riskItems: 2
      }

      const { result } = renderHook(() => useProjectScopeStore())
      
      act(() => {
        result.current.loadWBSStatistics(mockStatistics)
      })

      expect(result.current.wbsManagement.statistics).toEqual(mockStatistics)
    })
  })

  describe('WBS 檢視模式', () => {
    it('應該能切換檢視模式', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      
      act(() => {
        result.current.setWBSViewMode('gantt')
      })

      expect(result.current.wbsManagement.viewState.viewMode).toBe('gantt')
    })

    it('應該能切換完成項目顯示', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      
      act(() => {
        result.current.toggleWBSShowCompleted()
      })

      expect(result.current.wbsManagement.viewState.showCompleted).toBe(false)
    })

    it('應該能切換篩選面板', () => {
      const { result } = renderHook(() => useProjectScopeStore())
      
      act(() => {
        result.current.toggleWBSFilterPanel()
      })

      expect(result.current.wbsManagement.viewState.filterPanelOpen).toBe(true)
    })
  })
})

describe('Utility Hooks 測試', () => {
  describe('useProjectMembers Hook', () => {
    it('應該返回專案人員狀態和操作', () => {
      const { result } = renderHook(() => useProjectMembers())
      
      expect(result.current.members).toBeDefined()
      expect(result.current.loading).toBeDefined()
      expect(result.current.error).toBeDefined()
      expect(typeof result.current.loadMembers).toBe('function')
      expect(typeof result.current.applyFilters).toBe('function')
    })
  })

  describe('useWBSTree Hook', () => {
    it('應該返回 WBS 樹狀態和操作', () => {
      const { result } = renderHook(() => useWBSTree())
      
      expect(result.current.treeData).toBeDefined()
      expect(result.current.expandedNodes).toBeDefined()
      expect(result.current.selectedNodes).toBeDefined()
      expect(typeof result.current.toggleNode).toBe('function')
      expect(typeof result.current.selectNode).toBe('function')
    })
  })

  describe('useMemberFilters Hook', () => {
    it('應該返回篩選狀態和操作', () => {
      const { result } = renderHook(() => useMemberFilters())
      
      expect(result.current.filters).toBeDefined()
      expect(typeof result.current.applyFilters).toBe('function')
      expect(typeof result.current.clearFilters).toBe('function')
    })
  })

  describe('useWBSOperations Hook', () => {
    it('應該返回 WBS 操作方法', () => {
      const { result } = renderHook(() => useWBSOperations())
      
      expect(typeof result.current.startDrag).toBe('function')
      expect(typeof result.current.endDrag).toBe('function')
      expect(typeof result.current.setViewMode).toBe('function')
    })
  })
})