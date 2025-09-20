import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { ContactAPI } from '@/lib/api/contact'
import type { VendorContact, ContactFilters, ContactPagination, ContactSort } from '@/types/vendor'

export interface UseContactsOptions {
  vendorId: string
  page?: number
  limit?: number
  filters?: ContactFilters
  sort?: ContactSort
}

export interface ContactQueryResult {
  contacts: VendorContact[]
  pagination: ContactPagination
  stats?: {
    totalContacts: number
    activeContacts: number
    primaryContacts: number
    totalByDepartment: Record<string, number>
    totalByStatus: Record<string, number>
  }
}

/**
 * 聯絡人資料查詢 Hook
 */
export function useContacts(options: UseContactsOptions) {
  const { 
    vendorId,
    page = 1, 
    limit = 20, 
    filters = {}, 
    sort = { field: 'name', direction: 'asc' } 
  } = options

  // 使用 SWR 進行資料獲取和快取
  const { data, error, isLoading, mutate } = useSWR(
    vendorId ? ['contacts', vendorId, page, limit, filters, sort] : null,
    async () => {
      const result = await ContactAPI.getContacts({
        vendorId,
        page,
        pageSize: limit,
        sortBy: sort.field,
        sortOrder: sort.direction.toUpperCase() as 'ASC' | 'DESC',
        ...filters
      })
      
      return {
        contacts: result.data,
        pagination: result.pagination,
        stats: result.stats
      } as ContactQueryResult
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
    contacts: data?.contacts || [],
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
    hasData: (data?.contacts || []).length > 0,
    isEmpty: !isLoading && (data?.contacts || []).length === 0
  }
}

/**
 * 單一聯絡人詳情 Hook
 */
export function useContact(contactId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    contactId ? ['contact', contactId] : null,
    async () => {
      if (!contactId) return null
      return await ContactAPI.getContactById(contactId)
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
    contact: data || null,
    loading: isLoading,
    error: error?.message || null,
    refresh
  }
}

/**
 * 聯絡人新增/更新操作 Hook
 */
export function useContactMutation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createContact = useCallback(async (contactData: Partial<VendorContact>) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await ContactAPI.createContact(contactData)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '建立聯絡人失敗'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateContact = useCallback(async (contactId: string, contactData: Partial<VendorContact>) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await ContactAPI.updateContact(contactId, contactData)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新聯絡人失敗'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteContact = useCallback(async (contactId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      await ContactAPI.deleteContact(contactId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '刪除聯絡人失敗'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createContact,
    updateContact,
    deleteContact,
    loading,
    error
  }
}