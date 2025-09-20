/**
 * 廠商 API 服務
 * 處理前端與廠商相關的 HTTP 請求
 */

import type { Vendor, VendorFilters } from '@/types/vendor'

export interface VendorQueryOptions {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  search?: string
  types?: string[]
  statuses?: string[]
  locations?: string[]
}

export interface VendorApiResponse<T> {
  data: T
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  stats?: {
    totalByType: Record<string, number>
    totalByStatus: Record<string, number>
    totalContacts: number
  }
}

export class VendorAPI {
  private static baseUrl = '/api/vendors'

  /**
   * 取得廠商列表
   */
  static async getVendors(options: VendorQueryOptions = {}): Promise<VendorApiResponse<Vendor[]>> {
    const searchParams = new URLSearchParams()
    
    if (options.page) searchParams.set('page', options.page.toString())
    if (options.pageSize) searchParams.set('limit', options.pageSize.toString())
    if (options.sortBy) searchParams.set('sortBy', options.sortBy)
    if (options.sortOrder) searchParams.set('sortOrder', options.sortOrder)
    if (options.search) searchParams.set('search', options.search)
    if (options.types?.length) searchParams.set('types', options.types.join(','))
    if (options.statuses?.length) searchParams.set('statuses', options.statuses.join(','))

    const url = `${this.baseUrl}?${searchParams.toString()}`
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '請求失敗' }))
        console.error('API 錯誤響應:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      
      // 確保回傳格式正確
      if (!result || typeof result !== 'object') {
        console.error('無效的 API 響應格式:', result)
        throw new Error('API 回傳格式錯誤')
      }
      
      // 如果 API 直接回傳陣列，包裝成預期格式
      if (Array.isArray(result)) {
        return {
          data: result,
          pagination: {
            page: options.page || 1,
            pageSize: options.pageSize || 20,
            total: result.length,
            totalPages: Math.ceil(result.length / (options.pageSize || 20)),
            hasNext: false,
            hasPrev: false
          }
        }
      }
      
      // 確保 data 欄位存在且為陣列
      if (!result.data || !Array.isArray(result.data)) {
        console.error('API 響應缺少 data 欄位或 data 不是陣列:', result)
        // 如果沒有 data 欄位，嘗試使用 vendors 或其他可能的欄位名稱
        if (result.vendors && Array.isArray(result.vendors)) {
          result.data = result.vendors
        } else {
          result.data = []
        }
      }
      
      // 確保 pagination 欄位存在
      if (!result.pagination) {
        result.pagination = {
          page: options.page || 1,
          pageSize: options.pageSize || 20,
          total: result.data.length,
          totalPages: Math.ceil(result.data.length / (options.pageSize || 20)),
          hasNext: false,
          hasPrev: false
        }
      }
      
      return result
    } catch (error) {
      console.error('取得廠商列表失敗:', error)
      throw error
    }
  }

  /**
   * 取得單一廠商詳情
   */
  static async getVendorById(vendorId: string): Promise<Vendor> {
    try {
      const response = await fetch(`${this.baseUrl}/${vendorId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '請求失敗' }))
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('取得廠商詳情失敗:', error)
      throw error
    }
  }

  /**
   * 建立新廠商
   */
  static async createVendor(vendorData: Partial<Vendor>): Promise<Vendor> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vendorData),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '請求失敗' }))
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('建立廠商失敗:', error)
      throw error
    }
  }

  /**
   * 更新廠商資料
   */
  static async updateVendor(vendorId: string, vendorData: Partial<Vendor>): Promise<Vendor> {
    try {
      const response = await fetch(`${this.baseUrl}/${vendorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vendorData),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '請求失敗' }))
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('更新廠商失敗:', error)
      throw error
    }
  }

  /**
   * 刪除廠商
   */
  static async deleteVendor(vendorId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${vendorId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '請求失敗' }))
        throw new Error(error.error || `HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('刪除廠商失敗:', error)
      throw error
    }
  }

  /**
   * 取得廠商統計
   */
  static async getVendorStats(): Promise<{
    totalByType: Record<string, number>
    totalByStatus: Record<string, number>
    totalContacts: number
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '請求失敗' }))
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('取得廠商統計失敗:', error)
      throw error
    }
  }

  /**
   * 匯出廠商資料
   */
  static async exportVendors(
    filters: VendorFilters = {},
    format: 'excel' | 'csv' | 'pdf' = 'excel'
  ): Promise<{
    downloadUrl: string
    fileName: string
  }> {
    const searchParams = new URLSearchParams()
    searchParams.set('format', format)
    
    if (filters.search) searchParams.set('search', filters.search)
    if (filters.types?.length) searchParams.set('types', filters.types.join(','))
    if (filters.statuses?.length) searchParams.set('statuses', filters.statuses.join(','))
    if (filters.locations?.length) searchParams.set('locations', filters.locations.join(','))

    try {
      const response = await fetch(`${this.baseUrl}/export?${searchParams.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '請求失敗' }))
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      // 如果是文件下載，直接處理 blob
      if (format === 'csv') {
        const blob = await response.blob()
        const downloadUrl = URL.createObjectURL(blob)
        return {
          downloadUrl,
          fileName: `vendors-${new Date().toISOString().split('T')[0]}.csv`
        }
      }

      return await response.json()
    } catch (error) {
      console.error('匯出廠商資料失敗:', error)
      throw error
    }
  }
}