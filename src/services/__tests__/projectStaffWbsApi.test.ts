import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { 
  ProjectStaffWBSApiService,
  ProjectApiServiceExtension,
  StaffApiError,
  WBSApiError 
} from '../projectStaffWbsApi'
import {
  ProjectMemberExtended,
  ProjectMemberFilters,
  MemberSkill,
  WorkStatus,
  SkillCategory
} from '@/types/project'
import {
  WBSItem,
  WBSStatus,
  WBSPriority,
  WBSFilters,
  WBSTreeOperations,
  WBSBatchUpdateRequest,
  WBSBatchDeleteRequest,
  WBSValidationResult,
  WBSStatistics
} from '@/types/wbs'

// Mock fetch for testing
global.fetch = vi.fn()

describe('ProjectApiServiceExtension 專案人員 API 測試', () => {
  let apiExtension: ProjectApiServiceExtension
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.mocked(fetch)
    mockFetch.mockClear()
    apiExtension = new ProjectApiServiceExtension()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('專案人員查詢功能', () => {
    it('應該成功查詢專案人員列表', async () => {
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockMembers,
          total: 1,
          page: 1,
          pageSize: 10,
          timestamp: new Date().toISOString()
        })
      } as Response)

      const result = await apiExtension.getProjectMembers('proj-001')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/proj-001/members'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].userName).toBe('張小明')
      expect(result.data[0].skills?.[0].name).toBe('React')
    })

    it('應該支援人員搜尋功能', async () => {
      const filters: ProjectMemberFilters = {
        search: '張小明',
        skills: ['React'],
        workStatus: [WorkStatus.AVAILABLE],
        workloadRange: { min: 0, max: 80 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          total: 0,
          timestamp: new Date().toISOString()
        })
      } as Response)

      await apiExtension.searchProjectMembers('proj-001', filters)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=%E5%BC%B5%E5%B0%8F%E6%98%8E'), // URL encoded "張小明"
        expect.any(Object)
      )
    })

    it('應該處理人員查詢錯誤', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          message: '專案不存在',
          errorCode: 'PROJECT_NOT_FOUND'
        })
      } as Response)

      await expect(apiExtension.getProjectMembers('invalid-proj')).rejects.toThrow(StaffApiError)
    })
  })

  describe('專案人員管理功能', () => {
    it('應該成功新增專案人員', async () => {
      const newMember = {
        userId: 'user-002',
        role: 'developer',
        permissions: ['read']
      }

      const mockResponse = {
        id: 'member-002',
        projectId: 'proj-001',
        ...newMember,
        userName: '李小華',
        email: 'li@example.com',
        joinedAt: new Date(),
        isActive: true
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockResponse,
          timestamp: new Date().toISOString()
        })
      } as Response)

      const result = await apiExtension.addProjectMember('proj-001', newMember)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/proj-001/members'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newMember)
        })
      )
      expect(result.success).toBe(true)
      expect(result.data.userName).toBe('李小華')
    })

    it('應該成功更新專案人員', async () => {
      const updates = {
        role: 'senior_developer',
        workload: 90
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'member-001', ...updates },
          timestamp: new Date().toISOString()
        })
      } as Response)

      const result = await apiExtension.updateProjectMember('proj-001', 'member-001', updates)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/proj-001/members/member-001'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates)
        })
      )
      expect(result.success).toBe(true)
    })

    it('應該成功移除專案人員', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: '人員已成功移除',
          timestamp: new Date().toISOString()
        })
      } as Response)

      const result = await apiExtension.removeProjectMember('proj-001', 'member-001')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/proj-001/members/member-001'),
        expect.objectContaining({ method: 'DELETE' })
      )
      expect(result.success).toBe(true)
    })
  })
})

describe('ProjectApiServiceExtension WBS API 測試', () => {
  let apiExtension: ProjectApiServiceExtension
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.mocked(fetch)
    mockFetch.mockClear()
    apiExtension = new ProjectApiServiceExtension()
  })

  describe('WBS 樹狀結構管理', () => {
    it('應該成功取得 WBS 樹狀結構', async () => {
      const mockWBSItems: WBSItem[] = [
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockWBSItems,
          timestamp: new Date().toISOString()
        })
      } as Response)

      const result = await apiExtension.getWBSTree('proj-001')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/proj-001/wbs'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('專案規劃階段')
    })

    it('應該支援 WBS 篩選功能', async () => {
      const filters: WBSFilters = {
        status: [WBSStatus.IN_PROGRESS],
        priority: [WBSPriority.HIGH],
        assigneeId: ['user-001'],
        keyword: '規劃'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          timestamp: new Date().toISOString()
        })
      } as Response)

      await apiExtension.getWBSItems('proj-001', filters)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status%5B%5D=in_progress'),
        expect.any(Object)
      )
    })

    it('應該處理 WBS 查詢錯誤', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          message: '伺服器內部錯誤',
          errorCode: 'INTERNAL_ERROR'
        })
      } as Response)

      await expect(apiExtension.getWBSTree('proj-001')).rejects.toThrow(WBSApiError)
    })
  })

  describe('WBS 節點操作', () => {
    it('應該成功創建 WBS 項目', async () => {
      const newWBSItem = {
        name: '需求分析',
        description: '進行詳細需求分析',
        parentId: 'wbs-001',
        status: WBSStatus.PENDING,
        priority: WBSPriority.HIGH,
        estimatedHours: 20,
        assigneeIds: ['user-002'],
        isMilestone: false
      }

      const mockResponse = {
        id: 'wbs-002',
        code: '1.1',
        level: 1,
        order: 1,
        projectId: 'proj-001',
        ...newWBSItem,
        actualHours: 0,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        updatedBy: 'admin',
        version: 1
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockResponse,
          timestamp: new Date().toISOString()
        })
      } as Response)

      const result = await apiExtension.createWBSItem('proj-001', newWBSItem)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/proj-001/wbs'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newWBSItem)
        })
      )
      expect(result.success).toBe(true)
      expect(result.data.name).toBe('需求分析')
    })

    it('應該成功更新 WBS 項目', async () => {
      const updates = {
        status: WBSStatus.IN_PROGRESS,
        progress: 30,
        actualHours: 6
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'wbs-002', ...updates },
          timestamp: new Date().toISOString()
        })
      } as Response)

      const result = await apiExtension.updateWBSItem('proj-001', 'wbs-002', updates)

      expect(result.success).toBe(true)
      expect(result.data.status).toBe(WBSStatus.IN_PROGRESS)
    })

    it('應該成功移動 WBS 項目', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'WBS 項目已成功移動',
          timestamp: new Date().toISOString()
        })
      } as Response)

      const result = await apiExtension.moveWBSItem('proj-001', 'wbs-002', 'wbs-003', 1)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/proj-001/wbs/wbs-002/move'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            targetParentId: 'wbs-003',
            position: 1
          })
        })
      )
      expect(result.success).toBe(true)
    })

    it('應該成功刪除 WBS 項目', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'WBS 項目已成功刪除',
          timestamp: new Date().toISOString()
        })
      } as Response)

      const result = await apiExtension.deleteWBSItem('proj-001', 'wbs-002')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/proj-001/wbs/wbs-002'),
        expect.objectContaining({ method: 'DELETE' })
      )
      expect(result.success).toBe(true)
    })
  })

  describe('WBS 批次操作', () => {
    it('應該成功執行批次更新', async () => {
      const batchRequest: WBSBatchUpdateRequest = {
        itemIds: ['wbs-001', 'wbs-002'],
        updates: {
          status: WBSStatus.IN_PROGRESS,
          priority: WBSPriority.HIGH
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            success: true,
            processedCount: 2,
            failedCount: 0,
            errors: []
          },
          timestamp: new Date().toISOString()
        })
      } as Response)

      const result = await apiExtension.batchUpdateWBS('proj-001', batchRequest)

      expect(result.success).toBe(true)
      expect(result.data.processedCount).toBe(2)
    })

    it('應該成功執行批次刪除', async () => {
      const batchRequest: WBSBatchDeleteRequest = {
        itemIds: ['wbs-003', 'wbs-004'],
        force: false
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            success: true,
            processedCount: 2,
            failedCount: 0,
            errors: []
          },
          timestamp: new Date().toISOString()
        })
      } as Response)

      const result = await apiExtension.batchDeleteWBS('proj-001', batchRequest)

      expect(result.success).toBe(true)
      expect(result.data.processedCount).toBe(2)
    })
  })

  describe('WBS 驗證與統計', () => {
    it('應該成功驗證 WBS 結構', async () => {
      const validationResult: WBSValidationResult = {
        isValid: true,
        errors: []
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: validationResult,
          timestamp: new Date().toISOString()
        })
      } as Response)

      const result = await apiExtension.validateWBSStructure('proj-001')

      expect(result.success).toBe(true)
      expect(result.data.isValid).toBe(true)
    })

    it('應該成功取得 WBS 統計資料', async () => {
      const statistics: WBSStatistics = {
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: statistics,
          timestamp: new Date().toISOString()
        })
      } as Response)

      const result = await apiExtension.getWBSStatistics('proj-001')

      expect(result.success).toBe(true)
      expect(result.data.totalItems).toBe(10)
      expect(result.data.completionRate).toBe(30)
    })
  })
})

describe('ProjectStaffWBSApiService 整合測試', () => {
  let service: ProjectStaffWBSApiService
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.mocked(fetch)
    mockFetch.mockClear()
    service = new ProjectStaffWBSApiService()
  })

  it('應該整合專案人員和 WBS API 功能', async () => {
    // Test that the service has both staff and WBS methods
    expect(typeof service.getProjectMembers).toBe('function')
    expect(typeof service.getWBSTree).toBe('function')
    expect(typeof service.searchProjectMembers).toBe('function')
    expect(typeof service.createWBSItem).toBe('function')
  })

  it('應該支援工作負載分析', async () => {
    const mockAnalysis = {
      totalMembers: 5,
      averageWorkload: 75,
      overloadedMembers: 1,
      availableMembers: 3,
      workloadDistribution: [
        { userId: 'user-001', workload: 90, tasks: 3 },
        { userId: 'user-002', workload: 60, tasks: 2 }
      ]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockAnalysis,
        timestamp: new Date().toISOString()
      })
    } as Response)

    const result = await service.analyzeWorkload('proj-001')

    expect(result.success).toBe(true)
    expect(result.data.totalMembers).toBe(5)
    expect(result.data.workloadDistribution).toHaveLength(2)
  })

  it('應該支援專案配置分析', async () => {
    const mockConfiguration = {
      projectId: 'proj-001',
      totalWBSItems: 20,
      assignedItems: 18,
      unassignedItems: 2,
      milestones: 4,
      criticalPath: ['wbs-001', 'wbs-005', 'wbs-010'],
      resourceUtilization: 85
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockConfiguration,
        timestamp: new Date().toISOString()
      })
    } as Response)

    const result = await service.analyzeProjectConfiguration('proj-001')

    expect(result.success).toBe(true)
    expect(result.data.totalWBSItems).toBe(20)
    expect(result.data.criticalPath).toHaveLength(3)
  })
})