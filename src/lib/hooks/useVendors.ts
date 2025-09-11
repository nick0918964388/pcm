import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { VendorAPI } from '@/lib/api/vendor'
import type { Vendor, VendorFilters, VendorPagination, VendorSort } from '@/types/vendor'

export interface UseVendorsOptions {
  page?: number
  limit?: number
  filters?: VendorFilters
  sort?: VendorSort
}

export interface VendorQueryResult {
  vendors: Vendor[]
  pagination: VendorPagination
  stats?: {
    totalByType: Record<string, number>
    totalByStatus: Record<string, number>
    totalContacts: number
  }
}

/**
 * 廠商資料查詢 Hook
 */
export function useVendors(options: UseVendorsOptions = {}) {
  const { 
    page = 1, 
    limit = 20, 
    filters = {}, 
    sort = { field: 'created_at', direction: 'desc' } 
  } = options

  // 使用 SWR 進行資料獲取和快取
  const { data, error, isLoading, mutate } = useSWR(
    ['vendors', page, limit, filters, sort],
    async () => {
      const result = await VendorAPI.getVendors({
        page,
        pageSize: limit,
        sortBy: sort.field,
        sortOrder: sort.direction.toUpperCase() as 'ASC' | 'DESC',
        ...filters
      })
      
      return {
        vendors: result.data,
        pagination: result.pagination,
        stats: result.stats
      } as VendorQueryResult
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1分鐘內重複請求去重
      errorRetryCount: 3,
      errorRetryInterval: 5000
    }
  )

  // 重新整理資料
  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    // 資料
    vendors: data?.vendors || [],
    pagination: data?.pagination || {
      page,
      pageSize: limit,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    },
    stats: data?.stats,
    
    // 狀態
    loading: isLoading,
    error: error?.message || null,
    
    // 操作
    refresh,
    
    // 計算屬性
    hasData: (data?.vendors || []).length > 0,
    isEmpty: !isLoading && (data?.vendors || []).length === 0
  }
}

/**
 * 單一廠商詳情 Hook
 */
export function useVendor(vendorId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    vendorId ? ['vendor', vendorId] : null,
    async () => {
      if (!vendorId) return null
      return await VendorAPI.getVendorById(vendorId)
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true
    }
  )

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    vendor: data || null,
    loading: isLoading,
    error: error?.message || null,
    refresh
  }
}

/**
 * 廠商新增/更新操作 Hook
 */
export function useVendorMutation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createVendor = useCallback(async (vendorData: Partial<Vendor>) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await VendorAPI.createVendor(vendorData)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '建立廠商失敗'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateVendor = useCallback(async (vendorId: string, vendorData: Partial<Vendor>) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await VendorAPI.updateVendor(vendorId, vendorData)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新廠商失敗'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteVendor = useCallback(async (vendorId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      await VendorAPI.deleteVendor(vendorId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '刪除廠商失敗'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createVendor,
    updateVendor,
    deleteVendor,
    loading,
    error
  }
}

/**
 * 廠商統計資料 Hook
 */
export function useVendorStats() {
  const { data, error, isLoading, mutate } = useSWR(
    'vendor-stats',
    async () => {
      return await VendorAPI.getVendorStats()
    },
    {
      refreshInterval: 300000, // 每5分鐘刷新
      revalidateOnFocus: false,
      revalidateOnReconnect: true
    }
  )

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    stats: data || null,
    loading: isLoading,
    error: error?.message || null,
    refresh
  }
}