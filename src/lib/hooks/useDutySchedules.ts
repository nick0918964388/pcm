/**
 * 廠商人員值班查詢相關 Hooks
 */

import { useState, useCallback, useEffect } from 'react'
import useSWR from 'swr'
import { DutyScheduleAPI } from '@/lib/api/dutySchedule'
import type {
  DutySchedule,
  DutyScheduleFilters,
  DutySchedulePagination,
  DutyScheduleSort,
  DutyScheduleStats
} from '@/types/dutySchedule'

// 使用真實 API
const API = DutyScheduleAPI

/**
 * 值班安排查詢 Hook
 */
export function useDutySchedules(projectId: string) {
  const [filters, setFilters] = useState<DutyScheduleFilters>({})
  const [pagination, setPagination] = useState<DutySchedulePagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })
  const [sort, setSort] = useState<DutyScheduleSort>({
    field: 'dutyDate',
    direction: 'desc'
  })

  // 使用 SWR 進行資料獲取和快取
  const { data, error, isLoading, mutate } = useSWR(
    ['duty-schedules', projectId, filters, pagination.page, pagination.pageSize, sort],
    () => API.getSchedules(projectId, filters, pagination, sort),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1分鐘內重複請求去重
      errorRetryCount: 3,
      errorRetryInterval: 5000
    }
  )

  // 更新篩選條件
  const updateFilters = useCallback((newFilters: DutyScheduleFilters) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  // 更新分頁
  const updatePagination = useCallback((page: number, pageSize: number) => {
    setPagination(prev => ({ ...prev, page, pageSize }))
  }, [])

  // 更新排序
  const updateSort = useCallback((newSort: DutyScheduleSort) => {
    setSort(newSort)
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  // 重新整理資料
  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  // 重置篩選條件
  const resetFilters = useCallback(() => {
    setFilters({})
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  // 快速篩選函數
  const quickFilter = useCallback({
    today: () => updateFilters({
      ...filters,
      specificDate: new Date(),
      dateRange: undefined
    }),
    tomorrow: () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      updateFilters({
        ...filters,
        specificDate: tomorrow,
        dateRange: undefined
      })
    },
    thisWeek: () => {
      const today = new Date()
      const weekLater = new Date(today)
      weekLater.setDate(weekLater.getDate() + 7)
      updateFilters({
        ...filters,
        dateRange: { from: today, to: weekLater },
        specificDate: undefined
      })
    },
    currentOnly: () => updateFilters({
      ...filters,
      currentOnly: true
    })
  }, [filters, updateFilters])

  return {
    // 資料
    schedules: data?.data?.schedules || [],
    stats: data?.data?.stats || null,
    pagination: data?.data?.pagination || pagination,
    
    // 狀態
    loading: isLoading,
    error,
    
    // 篩選和排序
    filters,
    sort,
    updateFilters,
    updatePagination,
    updateSort,
    resetFilters,
    quickFilter,
    
    // 操作
    refresh,
    
    // 計算屬性
    hasData: (data?.data?.schedules || []).length > 0,
    isEmpty: !isLoading && (data?.data?.schedules || []).length === 0,
    isFiltered: Object.keys(filters).some(key => {
      const value = filters[key as keyof DutyScheduleFilters]
      return value !== undefined && value !== null && value !== ''
    })
  }
}

/**
 * 當前值班資訊 Hook
 */
export function useCurrentDuty(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    ['current-duty', projectId],
    () => API.getCurrentDuty(projectId),
    {
      refreshInterval: 60000, // 每分鐘刷新
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30秒內重複請求去重
      errorRetryCount: 3
    }
  )

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    currentShifts: data?.data?.currentShifts || [],
    nextShifts: data?.data?.nextShifts || [],
    emergencyContacts: data?.data?.emergencyContacts || [],
    summary: data?.data?.summary || null,
    loading: isLoading,
    error,
    refresh,
    
    // 計算屬性
    totalOnDuty: data?.data?.currentShifts?.length || 0,
    hasEmergencyContacts: (data?.data?.emergencyContacts || []).length > 0
  }
}

/**
 * 單一值班記錄詳情 Hook
 */
export function useDutyScheduleDetail(projectId: string, scheduleId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    scheduleId ? ['duty-schedule-detail', projectId, scheduleId] : null,
    () => scheduleId ? API.getScheduleDetail(projectId, scheduleId) : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true
    }
  )

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    schedule: data?.data || null,
    loading: isLoading,
    error,
    refresh
  }
}

/**
 * 值班資料匯出 Hook
 */
export function useDutyScheduleExport() {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportData = useCallback(async (
    projectId: string,
    filters: DutyScheduleFilters = {},
    format: 'excel' | 'csv' | 'pdf' = 'excel'
  ) => {
    setExporting(true)
    setError(null)

    try {
      const response = await DutyScheduleAPI.exportSchedules(projectId, filters, format)
      
      if (response.success) {
        // 觸發下載
        const link = document.createElement('a')
        link.href = response.data.downloadUrl
        link.download = response.data.fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        return response.data
      } else {
        throw new Error(response.message || '匯出失敗')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '匯出過程中發生錯誤'
      setError(errorMessage)
      throw err
    } finally {
      setExporting(false)
    }
  }, [])

  return {
    exportData,
    exporting,
    error
  }
}

/**
 * 值班人員聯絡 Hook
 */
export function useDutyContact() {
  const call = useCallback((phoneNumber: string, personName?: string) => {
    if (!phoneNumber) return false
    
    try {
      window.open(`tel:${phoneNumber}`)
      return true
    } catch (error) {
      console.error('Failed to initiate call:', error)
      return false
    }
  }, [])

  const email = useCallback((emailAddress: string, subject?: string) => {
    if (!emailAddress) return false
    
    try {
      const mailto = subject 
        ? `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}`
        : `mailto:${emailAddress}`
      window.open(mailto)
      return true
    } catch (error) {
      console.error('Failed to initiate email:', error)
      return false
    }
  }, [])

  const sms = useCallback((phoneNumber: string, message?: string) => {
    if (!phoneNumber) return false
    
    try {
      const sms = message
        ? `sms:${phoneNumber}?body=${encodeURIComponent(message)}`
        : `sms:${phoneNumber}`
      window.open(sms)
      return true
    } catch (error) {
      console.error('Failed to initiate SMS:', error)
      return false
    }
  }, [])

  return {
    call,
    email,
    sms
  }
}

/**
 * 值班狀態監控 Hook (WebSocket)
 */
export function useDutyStatusMonitor(projectId: string) {
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    // TODO: 實作 WebSocket 連線
    // const ws = new WebSocket(`ws://api.domain.com/ws/projects/${projectId}/duty-schedules`)
    
    // ws.onopen = () => setConnected(true)
    // ws.onclose = () => setConnected(false)
    // ws.onmessage = (event) => {
    //   const message = JSON.parse(event.data)
    //   setLastUpdate(new Date())
    //   if (message.type === 'alert') {
    //     setNotifications(prev => [...prev, message])
    //   }
    // }

    // return () => ws.close()
  }, [projectId])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    connected,
    lastUpdate,
    notifications,
    clearNotifications
  }
}