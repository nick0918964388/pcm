/**
 * Project API Service
 * 
 * Comprehensive API service for project management operations including search,
 * filtering, pagination, and access control as per requirements US1 and US2.
 * 
 * Features:
 * - US1 (AC1.1): Display user's authorized project list
 * - US2 (AC2.1): Support search by project name and code
 * - US2 (AC2.2): Support filtering by status
 * - US2 (AC2.3): Support filtering by project type
 * 
 * @module ProjectApiService
 * @version 1.0
 * @date 2025-08-29
 */

import {
  Project,
  ProjectFilters,
  ProjectSort,
  ProjectPagination,
  ProjectListResponse,
  ProjectResponse,
  ProjectStatistics,
  ProjectDashboard,
  ApiResponse,
  ProjectStatus,
  ProjectType,
  PROJECT_CONSTANTS
} from '@/types/project'
import { formatDate, delay } from '@/lib/utils'

// ==================== CONFIGURATION ====================

/**
 * API configuration and constants
 */
const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  DEFAULT_PAGE_SIZE: PROJECT_CONSTANTS.DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE: PROJECT_CONSTANTS.MAX_PAGE_SIZE,
} as const

/**
 * HTTP methods enumeration
 */
enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

/**
 * HTTP status codes
 */
enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

// ==================== ERROR HANDLING ====================

/**
 * Custom error class for API operations
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Network error class for connectivity issues
 */
export class NetworkError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message)
    this.name = 'NetworkError'
  }
}

/**
 * Validation error class for request validation
 */
export class ValidationError extends Error {
  constructor(message: string, public errors: Record<string, string[]>) {
    super(message)
    this.name = 'ValidationError'
  }
}

// ==================== TYPES ====================

/**
 * Request configuration options
 */
interface RequestConfig {
  method: HttpMethod
  headers?: Record<string, string>
  body?: any
  timeout?: number
  retries?: number
}

/**
 * Query parameters for project list API
 */
interface ProjectQueryParams {
  // Search
  search?: string
  
  // Filters
  status?: string[]
  type?: string[]
  managerId?: string
  tags?: string[]
  
  // Date ranges
  startDateFrom?: string
  startDateTo?: string
  endDateFrom?: string
  endDateTo?: string
  
  // Numeric ranges
  progressMin?: number
  progressMax?: number
  budgetMin?: number
  budgetMax?: number
  
  // Pagination
  page?: number
  pageSize?: number
  
  // Sorting
  sortField?: string
  sortDirection?: 'asc' | 'desc'
}

/**
 * Access record for tracking project access
 */
interface ProjectAccessRecord {
  projectId: string
  userId: string
  accessTime: Date
  accessType: 'view' | 'edit' | 'download'
  ipAddress?: string
  userAgent?: string
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Build query string from parameters
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
 * Convert filters to query parameters
 */
function filtersToQueryParams(filters: ProjectFilters): ProjectQueryParams {
  const params: ProjectQueryParams = {}
  
  if (filters.search) {
    params.search = filters.search
  }
  
  if (filters.status && filters.status.length > 0) {
    params.status = filters.status
  }
  
  if (filters.type && filters.type.length > 0) {
    params.type = filters.type
  }
  
  if (filters.managerId) {
    params.managerId = filters.managerId
  }
  
  if (filters.tags && filters.tags.length > 0) {
    params.tags = filters.tags
  }
  
  if (filters.startDateRange) {
    params.startDateFrom = filters.startDateRange.from.toISOString()
    params.startDateTo = filters.startDateRange.to.toISOString()
  }
  
  if (filters.endDateRange) {
    params.endDateFrom = filters.endDateRange.from.toISOString()
    params.endDateTo = filters.endDateRange.to.toISOString()
  }
  
  if (filters.progressRange) {
    params.progressMin = filters.progressRange.min
    params.progressMax = filters.progressRange.max
  }
  
  if (filters.budgetRange) {
    params.budgetMin = filters.budgetRange.min
    params.budgetMax = filters.budgetRange.max
  }
  
  return params
}

/**
 * Transform API response dates from strings to Date objects
 */
function transformProjectDates(project: any): Project {
  return {
    ...project,
    startDate: new Date(project.startDate),
    endDate: new Date(project.endDate),
    actualStartDate: project.actualStartDate ? new Date(project.actualStartDate) : undefined,
    actualEndDate: project.actualEndDate ? new Date(project.actualEndDate) : undefined,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
    lastAccessDate: project.lastAccessDate ? new Date(project.lastAccessDate) : undefined,
    teamMembers: project.teamMembers?.map((member: any) => ({
      ...member,
      joinedAt: new Date(member.joinedAt)
    })) || [],
    permissions: project.permissions?.map((permission: any) => ({
      ...permission,
      grantedAt: new Date(permission.grantedAt),
      expiresAt: permission.expiresAt ? new Date(permission.expiresAt) : undefined
    })) || []
  }
}

/**
 * Validate request parameters
 */
function validateGetProjectsParams(
  filters?: ProjectFilters,
  sort?: ProjectSort,
  pagination?: { page: number; pageSize: number }
): void {
  // Validate pagination
  if (pagination) {
    if (pagination.page < 1) {
      throw new ValidationError('Invalid page number', {
        page: ['頁碼必須大於 0']
      })
    }
    
    if (pagination.pageSize < 1 || pagination.pageSize > API_CONFIG.MAX_PAGE_SIZE) {
      throw new ValidationError('Invalid page size', {
        pageSize: [`每頁資料筆數必須介於 1 到 ${API_CONFIG.MAX_PAGE_SIZE} 之間`]
      })
    }
  }
  
  // Validate search length
  if (filters?.search && filters.search.length < PROJECT_CONSTANTS.MIN_SEARCH_LENGTH) {
    throw new ValidationError('Search term too short', {
      search: [`搜尋關鍵字至少需要 ${PROJECT_CONSTANTS.MIN_SEARCH_LENGTH} 個字元`]
    })
  }
  
  // Validate date ranges
  if (filters?.startDateRange) {
    if (filters.startDateRange.from > filters.startDateRange.to) {
      throw new ValidationError('Invalid date range', {
        startDateRange: ['開始日期不能晚於結束日期']
      })
    }
  }
  
  if (filters?.endDateRange) {
    if (filters.endDateRange.from > filters.endDateRange.to) {
      throw new ValidationError('Invalid date range', {
        endDateRange: ['開始日期不能晚於結束日期']
      })
    }
  }
  
  // Validate progress range
  if (filters?.progressRange) {
    const { min, max } = filters.progressRange
    if (min < 0 || min > 100 || max < 0 || max > 100 || min > max) {
      throw new ValidationError('Invalid progress range', {
        progressRange: ['進度範圍必須在 0-100 之間，且最小值不能大於最大值']
      })
    }
  }
}

// ==================== HTTP CLIENT ====================

/**
 * HTTP client class with retry logic and error handling
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
  
  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`
  }
  
  /**
   * Remove authentication token
   */
  removeAuthToken(): void {
    delete this.defaultHeaders['Authorization']
  }
  
  /**
   * Make HTTP request with retry logic
   */
  async request<T>(endpoint: string, config: RequestConfig): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    let lastError: Error
    
    for (let attempt = 0; attempt < (config.retries || API_CONFIG.RETRY_ATTEMPTS); attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(
          () => controller.abort(),
          config.timeout || API_CONFIG.TIMEOUT
        )
        
        const response = await fetch(url, {
          method: config.method,
          headers: { ...this.defaultHeaders, ...config.headers },
          body: config.body ? JSON.stringify(config.body) : undefined,
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          throw await this.handleErrorResponse(response)
        }
        
        return await response.json()
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on client errors (4xx)
        if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500) {
          throw error
        }
        
        // Wait before retry (except for last attempt)
        if (attempt < (config.retries || API_CONFIG.RETRY_ATTEMPTS) - 1) {
          await delay(API_CONFIG.RETRY_DELAY * Math.pow(2, attempt)) // Exponential backoff
        }
      }
    }
    
    throw new NetworkError('Request failed after all retry attempts', lastError)
  }
  
  /**
   * Handle error responses
   */
  private async handleErrorResponse(response: Response): Promise<ApiError> {
    let errorData: any
    
    try {
      errorData = await response.json()
    } catch {
      errorData = { message: response.statusText }
    }
    
    const message = errorData.message || '未知錯誤'
    const errorCode = errorData.errorCode
    const details = errorData.details
    
    return new ApiError(message, response.status, errorCode, details)
  }
  
  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params ? buildQueryString(params) : ''
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint
    
    return this.request<T>(fullEndpoint, { method: HttpMethod.GET })
  }
  
  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: HttpMethod.POST,
      body: data
    })
  }
  
  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: HttpMethod.PUT,
      body: data
    })
  }
  
  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: HttpMethod.PATCH,
      body: data
    })
  }
  
  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: HttpMethod.DELETE })
  }
}

// ==================== API SERVICE CLASS ====================

/**
 * Project API Service
 * 
 * Comprehensive service for all project-related API operations
 */
export class ProjectApiService {
  private client: HttpClient
  
  constructor() {
    this.client = new HttpClient(API_CONFIG.BASE_URL)
  }
  
  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.client.setAuthToken(token)
  }
  
  /**
   * Remove authentication token
   */
  removeAuthToken(): void {
    this.client.removeAuthToken()
  }
  
  // ==================== PROJECT OPERATIONS ====================
  
  /**
   * Get paginated project list with comprehensive filtering and sorting
   * 
   * @param filters - Search and filter criteria (US2: AC2.1, AC2.2, AC2.3)
   * @param sort - Sorting configuration
   * @param pagination - Pagination settings
   * @returns Promise resolving to paginated project list
   * 
   * @example
   * ```typescript
   * const result = await projectApi.getProjects({
   *   search: '辦公大樓',
   *   status: [ProjectStatus.IN_PROGRESS],
   *   type: [ProjectType.CONSTRUCTION]
   * })
   * ```
   */
  async getProjects(
    filters?: ProjectFilters,
    sort?: ProjectSort,
    pagination?: { page: number; pageSize: number }
  ): Promise<ProjectListResponse> {
    // Validate parameters
    validateGetProjectsParams(filters, sort, pagination)
    
    // Build query parameters
    const queryParams: ProjectQueryParams = {}
    
    // Add filters
    if (filters) {
      Object.assign(queryParams, filtersToQueryParams(filters))
    }
    
    // Add sorting
    if (sort) {
      queryParams.sortField = sort.field
      queryParams.sortDirection = sort.direction
    }
    
    // Add pagination
    if (pagination) {
      queryParams.page = pagination.page
      queryParams.pageSize = pagination.pageSize
    } else {
      queryParams.page = 1
      queryParams.pageSize = API_CONFIG.DEFAULT_PAGE_SIZE
    }
    
    try {
      const response = await this.client.get<ProjectListResponse>('/projects', queryParams)
      
      // Transform dates in response
      const transformedData = response.data.map(transformProjectDates)
      
      return {
        ...response,
        data: transformedData,
        timestamp: new Date(response.timestamp)
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new NetworkError('取得專案列表失敗', error as Error)
    }
  }
  
  /**
   * Get single project by ID
   * 
   * @param projectId - Project unique identifier
   * @returns Promise resolving to project data
   * 
   * @example
   * ```typescript
   * const project = await projectApi.getProjectById('proj-123')
   * ```
   */
  async getProjectById(projectId: string): Promise<ProjectResponse> {
    if (!projectId) {
      throw new ValidationError('Project ID is required', {
        projectId: ['專案 ID 為必填項目']
      })
    }
    
    try {
      const response = await this.client.get<ProjectResponse>(`/projects/${projectId}`)
      
      return {
        ...response,
        data: transformProjectDates(response.data),
        timestamp: new Date(response.timestamp)
      }
    } catch (error) {
      if (error instanceof ApiError) {
        // Customize error messages
        if (error.statusCode === HttpStatus.NOT_FOUND) {
          throw new ApiError('找不到指定的專案', error.statusCode, error.errorCode)
        }
        if (error.statusCode === HttpStatus.FORBIDDEN) {
          throw new ApiError('您沒有權限查看此專案', error.statusCode, error.errorCode)
        }
        throw error
      }
      throw new NetworkError('取得專案詳情失敗', error as Error)
    }
  }
  
  /**
   * Get project statistics summary for dashboard
   * 
   * @param filters - Optional filters to apply to statistics
   * @returns Promise resolving to project statistics
   * 
   * @example
   * ```typescript
   * const stats = await projectApi.getProjectSummary()
   * ```
   */
  async getProjectSummary(filters?: ProjectFilters): Promise<ApiResponse<ProjectStatistics>> {
    try {
      const queryParams = filters ? filtersToQueryParams(filters) : {}
      const response = await this.client.get<ApiResponse<ProjectStatistics>>('/projects/summary', queryParams)
      
      return {
        ...response,
        timestamp: new Date(response.timestamp)
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new NetworkError('取得專案統計資訊失敗', error as Error)
    }
  }
  
  /**
   * Get comprehensive project dashboard data
   * 
   * @returns Promise resolving to dashboard data
   * 
   * @example
   * ```typescript
   * const dashboard = await projectApi.getProjectDashboard()
   * ```
   */
  async getProjectDashboard(): Promise<ApiResponse<ProjectDashboard>> {
    try {
      const response = await this.client.get<ApiResponse<ProjectDashboard>>('/projects/dashboard')
      
      // Transform dates in nested project arrays
      const transformedData = {
        ...response.data,
        recentProjects: response.data.recentProjects.map(transformProjectDates),
        upcomingDeadlines: response.data.upcomingDeadlines.map(transformProjectDates),
        attentionRequired: response.data.attentionRequired.map(transformProjectDates)
      }
      
      return {
        ...response,
        data: transformedData,
        timestamp: new Date(response.timestamp)
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new NetworkError('取得專案儀表板資料失敗', error as Error)
    }
  }
  
  // ==================== ACCESS TRACKING ====================
  
  /**
   * Record project access for tracking and analytics
   * 
   * @param projectId - Project ID that was accessed
   * @param accessType - Type of access (view, edit, download)
   * @param metadata - Additional access metadata
   * @returns Promise resolving to success status
   * 
   * @example
   * ```typescript
   * await projectApi.recordProjectAccess('proj-123', 'view')
   * ```
   */
  async recordProjectAccess(
    projectId: string,
    accessType: 'view' | 'edit' | 'download' = 'view',
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<ApiResponse<void>> {
    if (!projectId) {
      throw new ValidationError('Project ID is required', {
        projectId: ['專案 ID 為必填項目']
      })
    }
    
    const accessRecord: Partial<ProjectAccessRecord> = {
      accessType,
      accessTime: new Date(),
      ...metadata
    }
    
    try {
      const response = await this.client.post<ApiResponse<void>>(
        `/projects/${projectId}/access`,
        accessRecord
      )
      
      return {
        ...response,
        timestamp: new Date(response.timestamp)
      }
    } catch (error) {
      // Access recording failures should not block the main operation
      // Log the error but don't throw
      console.warn('Failed to record project access:', error)
      
      return {
        success: false,
        data: undefined,
        message: '存取記錄失敗',
        timestamp: new Date()
      }
    }
  }
  
  // ==================== SEARCH OPERATIONS ====================
  
  /**
   * Search projects by name or code (US2: AC2.1)
   * 
   * @param query - Search query string
   * @param limit - Maximum number of results
   * @returns Promise resolving to search results
   * 
   * @example
   * ```typescript
   * const results = await projectApi.searchProjects('辦公大樓', 20)
   * ```
   */
  async searchProjects(query: string, limit: number = 10): Promise<ProjectListResponse> {
    if (!query || query.length < PROJECT_CONSTANTS.MIN_SEARCH_LENGTH) {
      throw new ValidationError('Search query too short', {
        query: [`搜尋關鍵字至少需要 ${PROJECT_CONSTANTS.MIN_SEARCH_LENGTH} 個字元`]
      })
    }
    
    return this.getProjects(
      { search: query },
      undefined,
      { page: 1, pageSize: Math.min(limit, API_CONFIG.MAX_PAGE_SIZE) }
    )
  }
  
  /**
   * Get projects by status (US2: AC2.2)
   * 
   * @param statuses - Array of project statuses to filter by
   * @param pagination - Pagination settings
   * @returns Promise resolving to filtered projects
   * 
   * @example
   * ```typescript
   * const projects = await projectApi.getProjectsByStatus([
   *   ProjectStatus.IN_PROGRESS,
   *   ProjectStatus.PLANNING
   * ])
   * ```
   */
  async getProjectsByStatus(
    statuses: ProjectStatus[],
    pagination?: { page: number; pageSize: number }
  ): Promise<ProjectListResponse> {
    if (!statuses || statuses.length === 0) {
      throw new ValidationError('At least one status must be provided', {
        statuses: ['至少需要選擇一個專案狀態']
      })
    }
    
    return this.getProjects({ status: statuses }, undefined, pagination)
  }
  
  /**
   * Get projects by type (US2: AC2.3)
   * 
   * @param types - Array of project types to filter by
   * @param pagination - Pagination settings
   * @returns Promise resolving to filtered projects
   * 
   * @example
   * ```typescript
   * const projects = await projectApi.getProjectsByType([
   *   ProjectType.CONSTRUCTION,
   *   ProjectType.RENOVATION
   * ])
   * ```
   */
  async getProjectsByType(
    types: ProjectType[],
    pagination?: { page: number; pageSize: number }
  ): Promise<ProjectListResponse> {
    if (!types || types.length === 0) {
      throw new ValidationError('At least one type must be provided', {
        types: ['至少需要選擇一個專案類型']
      })
    }
    
    return this.getProjects({ type: types }, undefined, pagination)
  }
  
  // ==================== UTILITY METHODS ====================
  
  /**
   * Check API health status
   * 
   * @returns Promise resolving to health status
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: Date }>> {
    try {
      const response = await this.client.get<ApiResponse<{ status: string; timestamp: string }>>('/health')
      
      return {
        ...response,
        data: {
          status: response.data.status,
          timestamp: new Date(response.data.timestamp)
        },
        timestamp: new Date(response.timestamp)
      }
    } catch (error) {
      throw new NetworkError('API 健康檢查失敗', error as Error)
    }
  }
  
  /**
   * Get API version information
   * 
   * @returns Promise resolving to version info
   */
  async getApiVersion(): Promise<ApiResponse<{ version: string; build: string }>> {
    try {
      const response = await this.client.get<ApiResponse<{ version: string; build: string }>>('/version')
      
      return {
        ...response,
        timestamp: new Date(response.timestamp)
      }
    } catch (error) {
      throw new NetworkError('取得 API 版本資訊失敗', error as Error)
    }
  }
}

// ==================== SINGLETON INSTANCE ====================

/**
 * Default project API service instance
 * 
 * @example
 * ```typescript
 * import { projectApi } from '@/services/projectApi'
 * 
 * // Set auth token
 * projectApi.setAuthToken('your-jwt-token')
 * 
 * // Get projects
 * const projects = await projectApi.getProjects()
 * ```
 */
export const projectApi = new ProjectApiService()

// Export types for external use
export type {
  ProjectFilters,
  ProjectSort,
  ProjectPagination,
  ProjectListResponse,
  ProjectResponse,
  ProjectStatistics,
  ProjectDashboard,
  ApiResponse
}

export {
  ApiError,
  NetworkError,
  ValidationError,
  HttpStatus
}