/**
 * Project Staff & WBS API Service Extension
 * 
 * 擴展現有 ProjectApiService 以支援專案人員和 WBS 管理功能
 * 整合專案人員查詢、管理以及 WBS 樹狀結構操作的完整 API 服務
 * 
 * Features:
 * - 專案人員查詢、搜索、新增、編輯、刪除
 * - WBS 樹狀結構管理和節點操作
 * - 批量更新和刪除操作
 * - 工作負載和專案配置分析
 * - 完整的錯誤處理和驗證
 * 
 * @module ProjectStaffWBSApiService
 * @version 1.0
 * @date 2025-01-26
 */

import {
  ProjectMemberExtended,
  ProjectMemberFilters,
  ProjectMemberQueryResult,
  CreateProjectMemberInput,
  UpdateProjectMemberInput,
  ApiResponse
} from '@/types/project'

import {
  WBSItem,
  WBSFilters,
  WBSQueryResult,
  WBSBatchUpdateRequest,
  WBSBatchDeleteRequest,
  WBSBatchResult,
  WBSValidationResult,
  WBSStatistics,
  WBSApiResponse,
  CreateWBSItemInput,
  UpdateWBSItemInput
} from '@/types/wbs'

// ==================== ADDITIONAL TYPES ====================

/**
 * 專案人員查詢選項
 */
export interface ProjectMemberQueryOptions {
  page?: number
  pageSize?: number
  filters?: ProjectMemberFilters
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * 搜索建議項目
 */
export interface SearchSuggestion {
  value: string
  label: string
  type: 'user' | 'skill' | 'role'
}

/**
 * 專案人員統計資料
 */
export interface ProjectMemberStats {
  totalMembers: number
  activeMembers: number
  inactiveMembers: number
  averageWorkload: number
  skillDistribution: Record<string, number>
  roleDistribution: Record<string, number>
  workStatusDistribution: Record<string, number>
}

/**
 * Staff API 響應包裝器
 */
export interface StaffApiResponse<T> extends ApiResponse<T> {}

// ==================== ERROR CLASSES ====================

/**
 * 專案人員 API 錯誤類別
 */
export class StaffApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'StaffApiError'
  }
}

/**
 * WBS API 錯誤類別
 */
export class WBSApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'WBSApiError'
  }
}

// ==================== CONFIGURATION ====================

const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3009/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const

// ==================== UTILITY FUNCTIONS ====================

/**
 * 建立查詢字串
 */
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    
    if (Array.isArray(value)) {
      value.forEach(item => searchParams.append(`${key}[]`, String(item)))
    } else if (value instanceof Date) {
      searchParams.append(key, value.toISOString())
    } else {
      searchParams.append(key, String(value))
    }
  })
  
  return searchParams.toString()
}

/**
 * HTTP 客戶端類別
 */
class HttpClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }
  
  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`
  }
  
  removeAuthToken(): void {
    delete this.defaultHeaders['Authorization']
  }
  
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params ? buildQueryString(params) : ''
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint
    const url = `${this.baseUrl}${fullEndpoint}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.defaultHeaders
    })
    
    if (!response.ok) {
      const error = await this.handleErrorResponse(response, endpoint)
      throw error
    }
    
    return response.json()
  }
  
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: data ? JSON.stringify(data) : undefined
    })
    
    if (!response.ok) {
      const error = await this.handleErrorResponse(response, endpoint)
      throw error
    }
    
    return response.json()
  }
  
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.defaultHeaders,
      body: data ? JSON.stringify(data) : undefined
    })
    
    if (!response.ok) {
      const error = await this.handleErrorResponse(response, endpoint)
      throw error
    }
    
    return response.json()
  }
  
  async delete<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.defaultHeaders
    })
    
    if (!response.ok) {
      const error = await this.handleErrorResponse(response, endpoint)
      throw error
    }
    
    return response.json()
  }
  
  private async handleErrorResponse(response: Response, endpoint?: string): Promise<Error> {
    let errorData: any
    
    try {
      errorData = await response.json()
    } catch {
      errorData = { message: response.statusText }
    }
    
    const message = errorData.message || '未知錯誤'
    const errorCode = errorData.errorCode
    const details = errorData.details
    
    // 根據端點類型返回相應的錯誤類別
    const urlToCheck = endpoint || response.url || ''
    if (urlToCheck.includes('/members')) {
      return new StaffApiError(message, response.status, errorCode, details)
    } else if (urlToCheck.includes('/wbs')) {
      return new WBSApiError(message, response.status, errorCode, details)
    }
    
    return new Error(message)
  }
}

// ==================== API SERVICE EXTENSION ====================

/**
 * ProjectApiService 擴展類別
 * 提供專案人員和 WBS 管理的 API 功能
 */
export class ProjectApiServiceExtension {
  private client: HttpClient
  
  constructor() {
    this.client = new HttpClient(API_CONFIG.BASE_URL)
  }
  
  setAuthToken(token: string): void {
    this.client.setAuthToken(token)
  }
  
  removeAuthToken(): void {
    this.client.removeAuthToken()
  }
  
  // ==================== 專案人員 API ====================
  
  /**
   * 取得專案人員列表
   */
  async getProjectMembers(
    projectId: string,
    pagination?: { page: number; pageSize: number }
  ): Promise<ProjectMemberQueryResult> {
    const params: Record<string, any> = {}
    
    if (pagination) {
      params.page = pagination.page
      params.pageSize = pagination.pageSize
    }
    
    return this.client.get<ProjectMemberQueryResult>(`/projects/${projectId}/members`, params)
  }
  
  /**
   * 搜尋專案人員
   */
  async searchProjectMembers(
    projectId: string,
    filters: ProjectMemberFilters,
    pagination?: { page: number; pageSize: number }
  ): Promise<ProjectMemberQueryResult> {
    const params: Record<string, any> = {
      ...this.filtersToQueryParams(filters)
    }
    
    if (pagination) {
      params.page = pagination.page
      params.pageSize = pagination.pageSize
    }
    
    return this.client.get<ProjectMemberQueryResult>(`/projects/${projectId}/members`, params)
  }
  
  /**
   * 新增專案人員
   */
  async addProjectMember(
    projectId: string,
    memberData: CreateProjectMemberInput
  ): Promise<ApiResponse<ProjectMemberExtended>> {
    return this.client.post<ApiResponse<ProjectMemberExtended>>(
      `/projects/${projectId}/members`,
      memberData
    )
  }
  
  /**
   * 更新專案人員
   */
  async updateProjectMember(
    projectId: string,
    memberId: string,
    updates: UpdateProjectMemberInput
  ): Promise<ApiResponse<ProjectMemberExtended>> {
    return this.client.put<ApiResponse<ProjectMemberExtended>>(
      `/projects/${projectId}/members/${memberId}`,
      updates
    )
  }
  
  /**
   * 移除專案人員
   */
  async removeProjectMember(
    projectId: string,
    memberId: string
  ): Promise<ApiResponse<void>> {
    return this.client.delete<ApiResponse<void>>(
      `/projects/${projectId}/members/${memberId}`
    )
  }
  
  // ==================== WBS API ====================
  
  /**
   * 取得 WBS 樹狀結構
   */
  async getWBSTree(projectId: string): Promise<WBSApiResponse<WBSItem[]>> {
    return this.client.get<WBSApiResponse<WBSItem[]>>(`/projects/${projectId}/wbs`)
  }
  
  /**
   * 取得 WBS 項目列表（支援篩選）
   */
  async getWBSItems(
    projectId: string,
    filters?: WBSFilters,
    pagination?: { page: number; pageSize: number }
  ): Promise<WBSQueryResult> {
    const params: Record<string, any> = {}
    
    if (filters) {
      Object.assign(params, this.wbsFiltersToQueryParams(filters))
    }
    
    if (pagination) {
      params.page = pagination.page
      params.pageSize = pagination.pageSize
    }
    
    return this.client.get<WBSQueryResult>(`/projects/${projectId}/wbs/items`, params)
  }
  
  /**
   * 創建 WBS 項目
   */
  async createWBSItem(
    projectId: string,
    itemData: CreateWBSItemInput
  ): Promise<WBSApiResponse<WBSItem>> {
    return this.client.post<WBSApiResponse<WBSItem>>(
      `/projects/${projectId}/wbs`,
      itemData
    )
  }
  
  /**
   * 更新 WBS 項目
   */
  async updateWBSItem(
    projectId: string,
    itemId: string,
    updates: UpdateWBSItemInput
  ): Promise<WBSApiResponse<WBSItem>> {
    return this.client.put<WBSApiResponse<WBSItem>>(
      `/projects/${projectId}/wbs/${itemId}`,
      updates
    )
  }
  
  /**
   * 移動 WBS 項目
   */
  async moveWBSItem(
    projectId: string,
    itemId: string,
    targetParentId: string,
    position?: number
  ): Promise<WBSApiResponse<void>> {
    const moveData = {
      targetParentId,
      position
    }
    
    return this.client.put<WBSApiResponse<void>>(
      `/projects/${projectId}/wbs/${itemId}/move`,
      moveData
    )
  }
  
  /**
   * 刪除 WBS 項目
   */
  async deleteWBSItem(
    projectId: string,
    itemId: string
  ): Promise<WBSApiResponse<void>> {
    return this.client.delete<WBSApiResponse<void>>(
      `/projects/${projectId}/wbs/${itemId}`
    )
  }
  
  // ==================== WBS 批次操作 ====================
  
  /**
   * 批次更新 WBS 項目
   */
  async batchUpdateWBS(
    projectId: string,
    request: WBSBatchUpdateRequest
  ): Promise<WBSApiResponse<WBSBatchResult>> {
    return this.client.put<WBSApiResponse<WBSBatchResult>>(
      `/projects/${projectId}/wbs/batch-update`,
      request
    )
  }
  
  /**
   * 批次刪除 WBS 項目
   */
  async batchDeleteWBS(
    projectId: string,
    request: WBSBatchDeleteRequest
  ): Promise<WBSApiResponse<WBSBatchResult>> {
    return this.client.post<WBSApiResponse<WBSBatchResult>>(
      `/projects/${projectId}/wbs/batch-delete`,
      request
    )
  }
  
  // ==================== WBS 驗證與統計 ====================
  
  /**
   * 驗證 WBS 結構
   */
  async validateWBSStructure(projectId: string): Promise<WBSApiResponse<WBSValidationResult>> {
    return this.client.get<WBSApiResponse<WBSValidationResult>>(
      `/projects/${projectId}/wbs/validate`
    )
  }
  
  /**
   * 取得 WBS 統計資料
   */
  async getWBSStatistics(projectId: string): Promise<WBSApiResponse<WBSStatistics>> {
    return this.client.get<WBSApiResponse<WBSStatistics>>(
      `/projects/${projectId}/wbs/statistics`
    )
  }
  
  // ==================== UTILITY METHODS ====================
  
  /**
   * 將人員篩選條件轉為查詢參數
   */
  private filtersToQueryParams(filters: ProjectMemberFilters): Record<string, any> {
    const params: Record<string, any> = {}
    
    if (filters.search) {
      params.search = filters.search
    }
    
    if (filters.role && filters.role.length > 0) {
      params.role = filters.role
    }
    
    if (filters.skills && filters.skills.length > 0) {
      params.skills = filters.skills
    }
    
    if (filters.workStatus && filters.workStatus.length > 0) {
      params.workStatus = filters.workStatus
    }
    
    if (filters.isActive !== undefined) {
      params.isActive = filters.isActive
    }
    
    if (filters.workloadRange) {
      if (filters.workloadRange.min !== undefined) {
        params.workloadMin = filters.workloadRange.min
      }
      if (filters.workloadRange.max !== undefined) {
        params.workloadMax = filters.workloadRange.max
      }
    }
    
    if (filters.joinedDateRange) {
      params.joinedFrom = filters.joinedDateRange.from.toISOString()
      params.joinedTo = filters.joinedDateRange.to.toISOString()
    }
    
    return params
  }
  
  /**
   * 將 WBS 篩選條件轉為查詢參數
   */
  private wbsFiltersToQueryParams(filters: WBSFilters): Record<string, any> {
    const params: Record<string, any> = {}
    
    if (filters.projectId) {
      params.projectId = filters.projectId
    }
    
    if (filters.status && filters.status.length > 0) {
      params.status = filters.status
    }
    
    if (filters.priority && filters.priority.length > 0) {
      params.priority = filters.priority
    }
    
    if (filters.assigneeId && filters.assigneeId.length > 0) {
      params.assigneeId = filters.assigneeId
    }
    
    if (filters.reviewerId && filters.reviewerId.length > 0) {
      params.reviewerId = filters.reviewerId
    }
    
    if (filters.keyword) {
      params.keyword = filters.keyword
    }
    
    if (filters.dateRange) {
      if (filters.dateRange.startDate) {
        params.startDateFrom = filters.dateRange.startDate.toISOString()
      }
      if (filters.dateRange.endDate) {
        params.endDateTo = filters.dateRange.endDate.toISOString()
      }
    }
    
    if (filters.progressRange) {
      if (filters.progressRange.min !== undefined) {
        params.progressMin = filters.progressRange.min
      }
      if (filters.progressRange.max !== undefined) {
        params.progressMax = filters.progressRange.max
      }
    }
    
    if (filters.hoursRange) {
      if (filters.hoursRange.estimated) {
        if (filters.hoursRange.estimated.min !== undefined) {
          params.estimatedHoursMin = filters.hoursRange.estimated.min
        }
        if (filters.hoursRange.estimated.max !== undefined) {
          params.estimatedHoursMax = filters.hoursRange.estimated.max
        }
      }
      if (filters.hoursRange.actual) {
        if (filters.hoursRange.actual.min !== undefined) {
          params.actualHoursMin = filters.hoursRange.actual.min
        }
        if (filters.hoursRange.actual.max !== undefined) {
          params.actualHoursMax = filters.hoursRange.actual.max
        }
      }
    }
    
    if (filters.levelRange) {
      if (filters.levelRange.min !== undefined) {
        params.levelMin = filters.levelRange.min
      }
      if (filters.levelRange.max !== undefined) {
        params.levelMax = filters.levelRange.max
      }
    }
    
    if (filters.isMilestone !== undefined) {
      params.isMilestone = filters.isMilestone
    }
    
    if (filters.isCriticalPath !== undefined) {
      params.isCriticalPath = filters.isCriticalPath
    }
    
    if (filters.tags && filters.tags.length > 0) {
      params.tags = filters.tags
    }
    
    return params
  }
}

// ==================== INTEGRATED SERVICE ====================

/**
 * 整合的專案人員與 WBS API 服務類別
 * 結合專案人員管理和 WBS 管理功能，並提供額外的分析功能
 */
export class ProjectStaffWBSApiService extends ProjectApiServiceExtension {
  constructor() {
    super()
  }
  
  // ==================== 專案人員查詢 API ====================
  
  /**
   * 查詢專案人員列表
   */
  async queryProjectMembers(
    projectId: string, 
    options: ProjectMemberQueryOptions = {}
  ): Promise<ProjectMemberQueryResult> {
    const params = new URLSearchParams()
    
    if (options.page !== undefined) params.append('page', options.page.toString())
    if (options.pageSize !== undefined) params.append('pageSize', options.pageSize.toString())
    if (options.sortBy) params.append('sortBy', options.sortBy)
    if (options.sortOrder) params.append('sortOrder', options.sortOrder)
    
    // 處理篩選條件
    if (options.filters) {
      if (options.filters.search) params.append('search', options.filters.search)
      if (options.filters.role?.length) params.append('role', options.filters.role.join(','))
      if (options.filters.skills?.length) params.append('skills', options.filters.skills.join(','))
      if (options.filters.workStatus?.length) params.append('workStatus', options.filters.workStatus.join(','))
      if (options.filters.isActive !== undefined) params.append('isActive', options.filters.isActive.toString())
      if (options.filters.workloadRange) {
        if (options.filters.workloadRange.min !== undefined) params.append('workloadMin', options.filters.workloadRange.min.toString())
        if (options.filters.workloadRange.max !== undefined) params.append('workloadMax', options.filters.workloadRange.max.toString())
      }
    }
    
    return this.client.get<ProjectMemberQueryResult>(
      `/projects/${projectId}/members?${params.toString()}`
    )
  }
  
  /**
   * 搜索專案人員
   */
  async searchProjectMembers(projectId: string, query: string): Promise<StaffApiResponse<SearchSuggestion[]>> {
    return this.client.get<StaffApiResponse<SearchSuggestion[]>>(
      `/projects/${projectId}/members/search?q=${encodeURIComponent(query)}`
    )
  }
  
  /**
   * 獲取專案人員統計資料
   */
  async getProjectMemberStats(projectId: string): Promise<StaffApiResponse<ProjectMemberStats>> {
    return this.client.get<StaffApiResponse<ProjectMemberStats>>(
      `/projects/${projectId}/members/stats`
    )
  }
  
  /**
   * 獲取專案人員詳細資訊
   */
  async getProjectMemberDetail(projectId: string, memberId: string): Promise<StaffApiResponse<ProjectMemberExtended>> {
    return this.client.get<StaffApiResponse<ProjectMemberExtended>>(
      `/projects/${projectId}/members/${memberId}`
    )
  }
  
  /**
   * 創建專案成員
   */
  async createProjectMember(projectId: string, data: CreateProjectMemberInput): Promise<ProjectMemberExtended> {
    const response = await this.client.post<StaffApiResponse<ProjectMemberExtended>>(
      `/projects/${projectId}/members`,
      data
    )
    return response.data
  }
  
  /**
   * 刪除專案成員 
   */
  async deleteProjectMember(projectId: string, memberId: string): Promise<void> {
    await this.client.delete(`/projects/${projectId}/members/${memberId}`)
  }
  
  /**
   * 批量操作專案成員
   */
  async bulkOperateProjectMembers(projectId: string, request: { operation: string, memberIds: string[], data?: any }): Promise<any> {
    return this.client.post(
      `/projects/${projectId}/members/bulk`,
      request
    )
  }
  
  /**
   * 獲取專案成員角色統計
   */
  async getProjectMemberRoleStats(projectId: string): Promise<any> {
    return this.client.get(`/projects/${projectId}/members/stats/roles`)
  }
  
  // ==================== 整合查詢 API ====================
  
  /**
   * 工作負載分析
   */
  async analyzeWorkload(projectId: string): Promise<ApiResponse<any>> {
    return this.client.get<ApiResponse<any>>(`/projects/${projectId}/analysis/workload`)
  }
  
  /**
   * 專案配置分析
   */
  async analyzeProjectConfiguration(projectId: string): Promise<ApiResponse<any>> {
    return this.client.get<ApiResponse<any>>(`/projects/${projectId}/analysis/configuration`)
  }
  
  /**
   * 取得專案人員與 WBS 整合報告
   */
  async getIntegratedReport(
    projectId: string,
    reportType: 'workload' | 'timeline' | 'resource' | 'progress'
  ): Promise<ApiResponse<any>> {
    return this.client.get<ApiResponse<any>>(
      `/projects/${projectId}/reports/${reportType}`
    )
  }
}

// ==================== SINGLETON INSTANCES ====================

/**
 * 預設專案人員與 WBS API 服務實例
 */
export const projectStaffWBSApi = new ProjectStaffWBSApiService()

// Export types for external use
export type {
  ProjectMemberExtended,
  ProjectMemberFilters,
  ProjectMemberQueryResult,
  CreateProjectMemberInput,
  UpdateProjectMemberInput,
  WBSItem,
  WBSFilters,
  WBSQueryResult,
  WBSBatchUpdateRequest,
  WBSBatchDeleteRequest,
  WBSBatchResult,
  WBSValidationResult,
  WBSStatistics,
  WBSApiResponse,
  CreateWBSItemInput,
  UpdateWBSItemInput
}