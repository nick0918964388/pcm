/**
 * 照片效能優化Hook
 * 提供懶載入、虛擬滾動、快取等效能優化功能
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Photo } from '@/types/photo.types'

interface UsePhotoPerformanceOptions {
  photos: Photo[]
  containerHeight: number
  itemHeight: number
  columnsPerRow?: number
  threshold?: number
  preloadCount?: number
  enableCaching?: boolean
  enableProgressiveLoading?: boolean
  enablePerformanceMonitoring?: boolean
  maxCacheSize?: number
  maxRetries?: number
}

interface PerformanceMetrics {
  loadTimes: Record<string, number>
  memoryUsage: number
  averageLoadTime: number
  totalImages: number
  loadedImages: number
  failedImages: number
}

interface UsePhotoPerformanceReturn {
  // 可見項目
  visiblePhotos: Photo[]
  totalHeight: number

  // 載入狀態
  loadedImages: Set<string>
  preloadedImages: Set<string>
  failedImages: Set<string>
  loadingProgress: Record<string, number>
  retryCount: Record<string, number>

  // 效能監控
  performanceMetrics: PerformanceMetrics
  progressiveLoadingEnabled: boolean

  // 方法
  handleScroll: (scrollTop: number) => void
  handleIntersection: (entries: IntersectionObserverEntry[]) => void
  handleImageError: (photoId: string, error: Error) => void
  retryFailedImage: (photoId: string) => void
  checkCache: (photoId: string) => Promise<Blob | null>
  cacheImage: (photoId: string, imageData: Blob) => Promise<void>
  clearOldCache: () => Promise<void>
  startLoadTimer: (photoId: string) => void
  endLoadTimer: (photoId: string) => void
  trackMemoryUsage: (photoId: string, size: number) => void
  updateLoadingProgress: (photoId: string, progress: number) => void
}

export function usePhotoPerformance(options: UsePhotoPerformanceOptions): UsePhotoPerformanceReturn {
  const {
    photos,
    containerHeight,
    itemHeight,
    columnsPerRow = 4,
    threshold = 0.1,
    preloadCount = 5,
    enableCaching = false,
    enableProgressiveLoading = false,
    enablePerformanceMonitoring = false,
    maxCacheSize = 50 * 1024 * 1024, // 50MB
    maxRetries = 3
  } = options

  // 狀態管理
  const [visiblePhotos, setVisiblePhotos] = useState<Photo[]>([])
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set())
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [loadingProgress, setLoadingProgress] = useState<Record<string, number>>({})
  const [retryCount, setRetryCount] = useState<Record<string, number>>({})
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    loadTimes: {},
    memoryUsage: 0,
    averageLoadTime: 0,
    totalImages: 0,
    loadedImages: 0,
    failedImages: 0
  })

  // Refs
  const loadTimersRef = useRef<Record<string, number>>({})
  const cacheRef = useRef<IDBDatabase | null>(null)
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null)

  // 計算總高度
  const totalHeight = useMemo(() => {
    const rowCount = Math.ceil(photos.length / columnsPerRow)
    return rowCount * itemHeight
  }, [photos.length, columnsPerRow, itemHeight])

  // 初始化IndexedDB快取
  useEffect(() => {
    if (!enableCaching) return

    const initCache = async () => {
      try {
        const request = indexedDB.open('photo-cache', 1)

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains('images')) {
            const objectStore = db.createObjectStore('images', { keyPath: 'id' })
            objectStore.createIndex('timestamp', 'timestamp', { unique: false })
            objectStore.createIndex('size', 'size', { unique: false })
          }
        }

        request.onsuccess = (event) => {
          cacheRef.current = (event.target as IDBOpenDBRequest).result
        }
      } catch (error) {
        console.warn('Failed to initialize cache:', error)
      }
    }

    initCache()
  }, [enableCaching])

  // 滾動處理
  const handleScroll = useCallback((scrollTop: number) => {
    const startRow = Math.floor(scrollTop / itemHeight)
    const endRow = Math.min(
      Math.ceil((scrollTop + containerHeight) / itemHeight),
      Math.ceil(photos.length / columnsPerRow)
    )

    const overscan = 2 // 緩衝區行數
    const startIndex = Math.max(0, (startRow - overscan) * columnsPerRow)
    const endIndex = Math.min(photos.length - 1, (endRow + overscan) * columnsPerRow - 1)

    const visible = photos.slice(startIndex, endIndex + 1)
    setVisiblePhotos(visible)

    // 預載入下一批圖片
    if (preloadCount > 0) {
      const preloadStart = endIndex + 1
      const preloadEnd = Math.min(photos.length - 1, preloadStart + preloadCount - 1)
      const preloadPhotos = photos.slice(preloadStart, preloadEnd + 1)

      preloadPhotos.forEach(photo => {
        if (!preloadedImages.has(photo.id)) {
          preloadImage(photo.thumbnailUrl, photo.id)
        }
      })
    }
  }, [photos, itemHeight, containerHeight, columnsPerRow, preloadCount, preloadedImages])

  // 預載入圖片
  const preloadImage = useCallback((url: string, photoId: string) => {
    const img = new Image()
    img.onload = () => {
      setPreloadedImages(prev => new Set([...prev, photoId]))
    }
    img.onerror = () => {
      setFailedImages(prev => new Set([...prev, photoId]))
    }
    img.src = url
  }, [])

  // Intersection Observer處理
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const photoId = (entry.target as HTMLElement).dataset.photoId
        if (photoId && !loadedImages.has(photoId)) {
          setLoadedImages(prev => new Set([...prev, photoId]))

          if (enablePerformanceMonitoring) {
            startLoadTimer(photoId)
          }
        }
      }
    })
  }, [loadedImages, enablePerformanceMonitoring])

  // 錯誤處理
  const handleImageError = useCallback((photoId: string, error: Error) => {
    setFailedImages(prev => new Set([...prev, photoId]))

    if (enablePerformanceMonitoring) {
      setPerformanceMetrics(prev => ({
        ...prev,
        failedImages: prev.failedImages + 1
      }))
    }
  }, [enablePerformanceMonitoring])

  // 重試失敗的圖片
  const retryFailedImage = useCallback((photoId: string) => {
    const currentRetries = retryCount[photoId] || 0
    if (currentRetries < maxRetries) {
      setRetryCount(prev => ({ ...prev, [photoId]: currentRetries + 1 }))
      setFailedImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(photoId)
        return newSet
      })
    }
  }, [retryCount, maxRetries])

  // 快取檢查
  const checkCache = useCallback(async (photoId: string): Promise<Blob | null> => {
    if (!enableCaching || !cacheRef.current) return null

    try {
      const transaction = cacheRef.current.transaction(['images'], 'readonly')
      const objectStore = transaction.objectStore('images')
      const request = objectStore.get(photoId)

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const result = request.result
          if (result && result.data) {
            resolve(result.data)
          } else {
            resolve(null)
          }
        }
        request.onerror = () => resolve(null)
      })
    } catch (error) {
      console.warn('Cache check failed:', error)
      return null
    }
  }, [enableCaching])

  // 快取圖片
  const cacheImage = useCallback(async (photoId: string, imageData: Blob): Promise<void> => {
    if (!enableCaching || !cacheRef.current) return

    // 檢查快取大小限制
    if (imageData.size > maxCacheSize) {
      throw new Error('Image too large for cache')
    }

    try {
      const transaction = cacheRef.current.transaction(['images'], 'readwrite')
      const objectStore = transaction.objectStore('images')

      const cacheEntry = {
        id: photoId,
        data: imageData,
        timestamp: Date.now(),
        size: imageData.size
      }

      objectStore.put(cacheEntry)
    } catch (error) {
      console.warn('Cache write failed:', error)
    }
  }, [enableCaching, maxCacheSize])

  // 清理舊快取
  const clearOldCache = useCallback(async (): Promise<void> => {
    if (!enableCaching || !cacheRef.current) return

    try {
      const transaction = cacheRef.current.transaction(['images'], 'readwrite')
      const objectStore = transaction.objectStore('images')

      // 清理超過24小時的快取
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000)
      const index = objectStore.index('timestamp')
      const range = IDBKeyRange.upperBound(cutoffTime)

      index.openCursor(range).onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }
    } catch (error) {
      console.warn('Cache cleanup failed:', error)
    }
  }, [enableCaching])

  // 效能監控
  const startLoadTimer = useCallback((photoId: string) => {
    if (enablePerformanceMonitoring) {
      loadTimersRef.current[photoId] = performance.now()
    }
  }, [enablePerformanceMonitoring])

  const endLoadTimer = useCallback((photoId: string) => {
    if (enablePerformanceMonitoring && loadTimersRef.current[photoId]) {
      const loadTime = performance.now() - loadTimersRef.current[photoId]
      delete loadTimersRef.current[photoId]

      setPerformanceMetrics(prev => {
        const newLoadTimes = { ...prev.loadTimes, [photoId]: loadTime }
        const totalLoadTime = Object.values(newLoadTimes).reduce((sum, time) => sum + time, 0)
        const averageLoadTime = totalLoadTime / Object.keys(newLoadTimes).length

        return {
          ...prev,
          loadTimes: newLoadTimes,
          averageLoadTime,
          loadedImages: prev.loadedImages + 1
        }
      })
    }
  }, [enablePerformanceMonitoring])

  const trackMemoryUsage = useCallback((photoId: string, size: number) => {
    if (enablePerformanceMonitoring) {
      setPerformanceMetrics(prev => ({
        ...prev,
        memoryUsage: prev.memoryUsage + size
      }))
    }
  }, [enablePerformanceMonitoring])

  const updateLoadingProgress = useCallback((photoId: string, progress: number) => {
    setLoadingProgress(prev => ({ ...prev, [photoId]: progress }))
  }, [])

  // 初始化時載入第一批照片
  useEffect(() => {
    handleScroll(0)
  }, [handleScroll])

  return {
    visiblePhotos,
    totalHeight,
    loadedImages,
    preloadedImages,
    failedImages,
    loadingProgress,
    retryCount,
    performanceMetrics,
    progressiveLoadingEnabled: enableProgressiveLoading,
    handleScroll,
    handleIntersection,
    handleImageError,
    retryFailedImage,
    checkCache,
    cacheImage,
    clearOldCache,
    startLoadTimer,
    endLoadTimer,
    trackMemoryUsage,
    updateLoadingProgress
  }
}