import { useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'

interface UseSessionMonitorOptions {
  warningThreshold?: number // 警告時間（分鐘）
  checkInterval?: number // 檢查間隔（秒）
  onWarning?: (remainingMinutes: number) => void
  onTimeout?: () => void
}

export function useSessionMonitor(options: UseSessionMonitorOptions = {}) {
  const {
    warningThreshold = 5,
    checkInterval = 60,
    onWarning,
    onTimeout
  } = options

  const { 
    isAuthenticated, 
    updateLastActivity, 
    getRemainingTime,
    isSessionValid,
    logout
  } = useAuthStore()

  // 檢查 session 狀態
  const checkSession = useCallback(() => {
    if (!isAuthenticated) return

    if (!isSessionValid()) {
      // Session 已過期
      logout()
      onTimeout?.()
      return
    }

    const remaining = getRemainingTime()
    
    // 如果剩餘時間少於警告閾值，觸發警告
    if (remaining <= warningThreshold && remaining > 0) {
      onWarning?.(remaining)
    }
  }, [isAuthenticated, isSessionValid, getRemainingTime, warningThreshold, logout, onWarning, onTimeout])

  // 處理使用者活動
  const handleActivity = useCallback(() => {
    if (isAuthenticated) {
      updateLastActivity()
    }
  }, [isAuthenticated, updateLastActivity])

  // 設置 session 監控
  useEffect(() => {
    if (!isAuthenticated) return

    // 設置定時檢查
    const timer = setInterval(checkSession, checkInterval * 1000)

    // 監聽使用者活動事件
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    // 清理函數
    return () => {
      clearInterval(timer)
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [isAuthenticated, checkSession, handleActivity, checkInterval])

  // 初始檢查
  useEffect(() => {
    checkSession()
  }, [checkSession])

  return {
    remainingTime: getRemainingTime(),
    isSessionValid: isSessionValid(),
    updateActivity: handleActivity
  }
}