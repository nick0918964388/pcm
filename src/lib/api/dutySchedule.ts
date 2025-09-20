/**
 * 廠商人員值班查詢 API 服務層
 */

import { api } from '@/lib/api'
import type {
  DutyScheduleFilters,
  DutySchedulePagination,
  DutyScheduleSort,
  DutyScheduleListResponse,
  CurrentDutyResponse,
  DutyScheduleResponse
} from '@/types/dutySchedule'

export class DutyScheduleAPI {
  /**
   * 查詢值班安排列表
   */
  static async getSchedules(
    projectId: string,
    filters: DutyScheduleFilters = {},
    pagination: Partial<DutySchedulePagination> = {},
    sort: DutyScheduleSort = { field: 'dutyDate', direction: 'desc' }
  ): Promise<DutyScheduleListResponse> {
    const params = new URLSearchParams({
      page: String(pagination.page || 1),
      pageSize: String(pagination.pageSize || 20),
      sortBy: sort.field as string,
      sortOrder: sort.direction,
      ...this.serializeFilters(filters)
    })

    return api.get(`/projects/${projectId}/duty-schedules?${params}`)
  }

  /**
   * 取得當前值班資訊
   */
  static async getCurrentDuty(projectId: string): Promise<CurrentDutyResponse> {
    return api.get(`/projects/${projectId}/duty-schedules/current`)
  }

  /**
   * 取得值班記錄詳情
   */
  static async getScheduleDetail(
    projectId: string, 
    scheduleId: string
  ): Promise<DutyScheduleResponse> {
    return api.get(`/projects/${projectId}/duty-schedules/${scheduleId}`)
  }

  /**
   * 取得值班統計資訊
   */
  static async getStats(
    projectId: string,
    filters: DutyScheduleFilters = {}
  ) {
    const params = new URLSearchParams({
      ...this.serializeFilters(filters)
    })

    return api.get(`/projects/${projectId}/duty-schedules/stats?${params}`)
  }

  /**
   * 匯出值班資料
   */
  static async exportSchedules(
    projectId: string,
    filters: DutyScheduleFilters = {},
    format: 'excel' | 'csv' | 'pdf' = 'excel'
  ) {
    return api.post(`/projects/${projectId}/duty-schedules/export`, {
      format,
      filters,
      columns: [
        'dutyDate',
        'shiftType', 
        'personName',
        'vendorName',
        'mobile',
        'status',
        'workArea'
      ]
    })
  }

  /**
   * 序列化篩選條件為查詢參數
   */
  private static serializeFilters(filters: DutyScheduleFilters): Record<string, string> {
    const params: Record<string, string> = {}
    
    if (filters.search) {
      params.search = filters.search
    }
    
    if (filters.dateRange) {
      params.dateFrom = filters.dateRange.from.toISOString().split('T')[0]
      params.dateTo = filters.dateRange.to.toISOString().split('T')[0]
    }
    
    if (filters.specificDate) {
      params.specificDate = filters.specificDate.toISOString().split('T')[0]
    }
    
    if (filters.vendorIds?.length) {
      params.vendorIds = filters.vendorIds.join(',')
    }
    
    if (filters.vendorTypes?.length) {
      params.vendorTypes = filters.vendorTypes.join(',')
    }
    
    if (filters.shiftTypes?.length) {
      params.shiftTypes = filters.shiftTypes.join(',')
    }
    
    if (filters.statuses?.length) {
      params.statuses = filters.statuses.join(',')
    }
    
    if (filters.workAreas?.length) {
      params.workAreas = filters.workAreas.join(',')
    }
    
    if (filters.urgencyLevels?.length) {
      params.urgencyLevels = filters.urgencyLevels.join(',')
    }
    
    if (filters.currentOnly) {
      params.currentOnly = 'true'
    }
    
    if (filters.includeReplacements === false) {
      params.includeReplacements = 'false'
    }
    
    return params
  }
}

/**
 * Mock API 實作 (開發階段使用)
 */
export class MockDutyScheduleAPI {
  static async getSchedules(
    projectId: string,
    filters: DutyScheduleFilters = {},
    pagination: Partial<DutySchedulePagination> = {}
  ): Promise<DutyScheduleListResponse> {
    // 模擬 API 延遲
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const { generateMockDutyScheduleQueryResult } = await import('@/types/dutySchedule')
    const result = generateMockDutyScheduleQueryResult(filters, pagination)
    
    return {
      success: true,
      data: result,
      timestamp: new Date()
    }
  }

  static async getCurrentDuty(projectId: string): Promise<CurrentDutyResponse> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const { generateMockDutySchedules } = await import('@/types/dutySchedule')
    const allSchedules = generateMockDutySchedules(20)
    
    // 篩選當前值班的資料
    const currentShifts = allSchedules.filter(s => s.status === '值班中').slice(0, 5)
    const nextShifts = allSchedules.filter(s => s.status === '已排班').slice(0, 3)
    const emergencyContacts = allSchedules.filter(s => s.shiftType === '緊急').slice(0, 2)
    
    return {
      success: true,
      data: {
        currentShifts,
        nextShifts,
        emergencyContacts,
        summary: {
          totalOnDuty: currentShifts.length,
          byShiftType: {
            '日班': 3,
            '夜班': 2,
            '全日': 0,
            '緊急': 2,
            '加班': 0
          },
          byWorkArea: {
            '主工區': 4,
            '辦公區': 1,
            '倉儲區': 0,
            '設備區': 2,
            '安全區': 0,
            '入口處': 0,
            '其他': 0
          },
          lastUpdated: new Date().toISOString()
        }
      },
      timestamp: new Date()
    }
  }

  static async getScheduleDetail(
    projectId: string,
    scheduleId: string
  ): Promise<DutyScheduleResponse> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const { generateMockDutySchedules } = await import('@/types/dutySchedule')
    const schedules = generateMockDutySchedules(1)
    const schedule = schedules[0]
    
    return {
      success: true,
      data: {
        ...schedule,
        id: scheduleId
      },
      timestamp: new Date()
    }
  }
}