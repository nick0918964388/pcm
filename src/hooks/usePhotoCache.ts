/**
 * 照片快取Hook
 * 提供客戶端圖片快取功能
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createImageCache } from '@/utils/performanceUtils'

interface CacheOptions {
  maxSize?: number
  maxAge?: number
  enableCompression?: boolean
  compressionQuality?: number
}

interface CacheStats {
  size: number
  count: number
  hitRate: number
  maxSize: number
}

interface UseCacheReturn {
  get: (key: string) => Promise<string | null>
  set: (key: string, data: Blob | string) => Promise<boolean>
  delete: (key: string) => Promise<void>
  clear: () => Promise<void>
  preload: (urls: string[]) => Promise<void>
  getStats: () => CacheStats
  isEnabled: boolean
  error: string | null
}

interface CacheEntry {
  data: Blob
  timestamp: number
  size: number
  hits: number
  url?: string
}

export function usePhotoCache(options: CacheOptions = {}): UseCacheReturn {
  const {
    maxSize = 100 * 1024 * 1024, // 100MB
    maxAge = 7 * 24 * 60 * 60 * 1000, // 7天
    enableCompression = true,
    compressionQuality = 0.8
  } = options

  const [isEnabled, setIsEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<CacheStats>({
    size: 0,
    count: 0,
    hitRate: 0,
    maxSize
  })

  const cacheRef = useRef<any>(null)
  const hitCountRef = useRef(0)
  const missCountRef = useRef(0)
  const memoryCache = useRef<Map<string, CacheEntry>>(new Map())

  // 初始化快取
  useEffect(() => {
    const initCache = async () => {
      try {
        // 檢查瀏覽器支援
        if (!window.indexedDB) {
          setError('IndexedDB not supported')
          return
        }

        cacheRef.current = await createImageCache('photo-cache', {
          maxSize,
          maxAge
        })
        setIsEnabled(true)
        setError(null)

        // 載入現有快取統計
        await updateStats()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize cache')
        setIsEnabled(false)
      }
    }

    initCache()
  }, [maxSize, maxAge])

  // 更新快取統計
  const updateStats = useCallback(async () => {
    if (!cacheRef.current) return

    try {
      let totalSize = 0
      let count = 0

      // 計算記憶體快取大小
      memoryCache.current.forEach(entry => {
        totalSize += entry.size
        count++
      })

      const hitRate = hitCountRef.current + missCountRef.current > 0
        ? hitCountRef.current / (hitCountRef.current + missCountRef.current)
        : 0

      setStats({
        size: totalSize,
        count,
        hitRate: Math.round(hitRate * 100) / 100,
        maxSize
      })
    } catch (err) {
      console.warn('Failed to update cache stats:', err)
    }
  }, [maxSize])

  // 壓縮圖片
  const compressImage = useCallback(async (blob: Blob): Promise<Blob> => {
    if (!enableCompression || !blob.type.startsWith('image/')) {
      return blob
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // 計算壓縮尺寸
        const maxDimension = 1024
        const scale = Math.min(maxDimension / img.width, maxDimension / img.height, 1)

        canvas.width = img.width * scale
        canvas.height = img.height * scale

        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

          canvas.toBlob(
            (compressed) => resolve(compressed || blob),
            'image/jpeg',
            compressionQuality
          )
        } else {
          resolve(blob)
        }
      }

      img.onerror = () => resolve(blob)
      img.src = URL.createObjectURL(blob)
    })
  }, [enableCompression, compressionQuality])

  // 從快取獲取
  const get = useCallback(async (key: string): Promise<string | null> => {
    if (!isEnabled) return null

    try {
      // 先檢查記憶體快取
      const memoryEntry = memoryCache.current.get(key)
      if (memoryEntry) {
        // 檢查是否過期
        if (Date.now() - memoryEntry.timestamp < maxAge) {
          memoryEntry.hits++
          hitCountRef.current++
          await updateStats()
          return memoryEntry.url || URL.createObjectURL(memoryEntry.data)
        } else {
          memoryCache.current.delete(key)
        }
      }

      // 檢查IndexedDB快取
      const cached = await cacheRef.current?.get(key)
      if (cached) {
        hitCountRef.current++
        const url = URL.createObjectURL(cached)

        // 加入記憶體快取
        memoryCache.current.set(key, {
          data: cached,
          timestamp: Date.now(),
          size: cached.size,
          hits: 1,
          url
        })

        await updateStats()
        return url
      }

      missCountRef.current++
      await updateStats()
      return null
    } catch (err) {
      console.warn('Cache get failed:', err)
      missCountRef.current++
      return null
    }
  }, [isEnabled, maxAge, updateStats])

  // 存入快取
  const set = useCallback(async (key: string, data: Blob | string): Promise<boolean> => {
    if (!isEnabled) return false

    try {
      let blob: Blob

      if (typeof data === 'string') {
        // 從URL載入圖片
        const response = await fetch(data)
        if (!response.ok) return false
        blob = await response.blob()
      } else {
        blob = data
      }

      // 壓縮圖片
      const compressed = await compressImage(blob)

      // 檢查大小限制
      if (compressed.size > maxSize) {
        console.warn('Image too large for cache:', compressed.size)
        return false
      }

      // 檢查快取容量
      await cleanupIfNeeded(compressed.size)

      // 存入IndexedDB
      await cacheRef.current?.set(key, compressed)

      // 存入記憶體快取
      const url = URL.createObjectURL(compressed)
      memoryCache.current.set(key, {
        data: compressed,
        timestamp: Date.now(),
        size: compressed.size,
        hits: 0,
        url
      })

      await updateStats()
      return true
    } catch (err) {
      console.warn('Cache set failed:', err)
      return false
    }
  }, [isEnabled, maxSize, compressImage, updateStats])

  // 清理快取空間
  const cleanupIfNeeded = useCallback(async (newItemSize: number) => {
    const currentSize = stats.size
    const availableSpace = maxSize - currentSize

    if (newItemSize <= availableSpace) return

    // 按使用頻率和時間排序
    const entries = Array.from(memoryCache.current.entries())
      .map(([key, entry]) => ({ key, ...entry }))
      .sort((a, b) => {
        // 優先刪除使用頻率低且較舊的項目
        const scoreA = a.hits / (Date.now() - a.timestamp)
        const scoreB = b.hits / (Date.now() - b.timestamp)
        return scoreA - scoreB
      })

    let freedSpace = 0
    for (const entry of entries) {
      if (freedSpace >= newItemSize) break

      await delete(entry.key)
      freedSpace += entry.size
    }
  }, [stats.size, maxSize])

  // 刪除快取項目
  const deleteItem = useCallback(async (key: string): Promise<void> => {
    if (!isEnabled) return

    try {
      await cacheRef.current?.delete(key)

      const memoryEntry = memoryCache.current.get(key)
      if (memoryEntry?.url) {
        URL.revokeObjectURL(memoryEntry.url)
      }
      memoryCache.current.delete(key)

      await updateStats()
    } catch (err) {
      console.warn('Cache delete failed:', err)
    }
  }, [isEnabled, updateStats])

  // 清空快取
  const clear = useCallback(async (): Promise<void> => {
    if (!isEnabled) return

    try {
      await cacheRef.current?.clear()

      // 清理記憶體快取中的URL
      memoryCache.current.forEach(entry => {
        if (entry.url) {
          URL.revokeObjectURL(entry.url)
        }
      })
      memoryCache.current.clear()

      hitCountRef.current = 0
      missCountRef.current = 0

      await updateStats()
    } catch (err) {
      console.warn('Cache clear failed:', err)
    }
  }, [isEnabled, updateStats])

  // 預載入圖片
  const preload = useCallback(async (urls: string[]): Promise<void> => {
    if (!isEnabled) return

    const promises = urls.map(async (url) => {
      const key = `preload-${url}`
      const cached = await get(key)

      if (!cached) {
        await set(key, url)
      }
    })

    await Promise.allSettled(promises)
  }, [isEnabled, get, set])

  // 獲取統計資訊
  const getStats = useCallback(() => stats, [stats])

  // 清理過期快取
  useEffect(() => {
    if (!isEnabled) return

    const cleanup = setInterval(async () => {
      const now = Date.now()
      const expiredKeys: string[] = []

      memoryCache.current.forEach((entry, key) => {
        if (now - entry.timestamp > maxAge) {
          expiredKeys.push(key)
        }
      })

      for (const key of expiredKeys) {
        await deleteItem(key)
      }
    }, 5 * 60 * 1000) // 每5分鐘清理一次

    return () => clearInterval(cleanup)
  }, [isEnabled, maxAge, deleteItem])

  return {
    get,
    set,
    delete: deleteItem,
    clear,
    preload,
    getStats,
    isEnabled,
    error
  }
}