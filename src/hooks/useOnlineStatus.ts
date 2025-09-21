/**
 * useOnlineStatus Hook
 * 網路連線狀態 hook
 */

import { useState, useEffect } from 'react'

interface OnlineStatus {
  isOnline: boolean
  wasOffline: boolean
}

export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setIsOnline(true)
      // Track if we were previously offline
      if (!isOnline) {
        setWasOffline(true)
        // Reset after a delay
        setTimeout(() => setWasOffline(false), 5000)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    // Listen for online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isOnline])

  return { isOnline, wasOffline }
}