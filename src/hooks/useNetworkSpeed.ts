/**
 * useNetworkSpeed Hook
 * 網路速度檢測 hook
 */

import { useState, useEffect } from 'react'

interface NetworkSpeed {
  isSlowNetwork: boolean
  effectiveType: string
  downlink: number
  rtt: number
  saveData: boolean
}

interface NavigatorConnection {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g'
  downlink: number
  rtt: number
  saveData: boolean
}

declare global {
  interface Navigator {
    connection?: NavigatorConnection
    mozConnection?: NavigatorConnection
    webkitConnection?: NavigatorConnection
  }
}

export function useNetworkSpeed(): NetworkSpeed {
  const [networkInfo, setNetworkInfo] = useState<NetworkSpeed>({
    isSlowNetwork: false,
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false
  })

  useEffect(() => {
    if (typeof navigator === 'undefined') return

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection

    const updateNetworkInfo = () => {
      if (connection) {
        const isSlowNetwork =
          connection.effectiveType === '2g' ||
          connection.effectiveType === 'slow-2g' ||
          connection.downlink < 1.5 ||
          connection.rtt > 1000 ||
          connection.saveData

        setNetworkInfo({
          isSlowNetwork,
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        })
      }
    }

    // Initial check
    updateNetworkInfo()

    // Listen for changes
    if (connection && 'addEventListener' in connection) {
      connection.addEventListener('change', updateNetworkInfo)
    }

    return () => {
      if (connection && 'removeEventListener' in connection) {
        connection.removeEventListener('change', updateNetworkInfo)
      }
    }
  }, [])

  return networkInfo
}