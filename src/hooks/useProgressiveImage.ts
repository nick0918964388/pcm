/**
 * 漸進式圖片載入Hook
 * 提供高質量的圖片載入體驗
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePhotoCache } from './usePhotoCache'

interface ProgressiveImageOptions {
  placeholder?: string
  lowQualityUrl?: string
  highQualityUrl: string
  enableBlur?: boolean
  enableFadeIn?: boolean
  enableCache?: boolean
  retryCount?: number
  retryDelay?: number
  onLoadStart?: () => void
  onProgress?: (progress: number) => void
  onLoadComplete?: () => void
  onError?: (error: Error) => void
}

interface ProgressiveImageReturn {
  src: string
  isLoading: boolean
  isLoaded: boolean
  hasError: boolean
  progress: number
  retry: () => void
  preload: () => Promise<void>
}

interface LoadingState {
  stage: 'placeholder' | 'lowQuality' | 'highQuality' | 'error'
  progress: number
  error: Error | null
}

export function useProgressiveImage(options: ProgressiveImageOptions): ProgressiveImageReturn {
  const {
    placeholder,
    lowQualityUrl,
    highQualityUrl,
    enableBlur = true,
    enableFadeIn = true,
    enableCache = true,
    retryCount = 3,
    retryDelay = 1000,
    onLoadStart,
    onProgress,
    onLoadComplete,
    onError
  } = options

  const [loadingState, setLoadingState] = useState<LoadingState>({
    stage: 'placeholder',
    progress: 0,
    error: null
  })

  const [currentSrc, setCurrentSrc] = useState(placeholder || '')
  const [currentRetry, setCurrentRetry] = useState(0)

  const loadingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const cache = usePhotoCache({
    maxSize: 50 * 1024 * 1024, // 50MB
    enableCompression: true
  })

  // 載入圖片的核心函數
  const loadImage = useCallback((url: string, stage: LoadingState['stage']): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const startTime = Date.now()

      // 設置載入事件
      img.onload = () => {
        const loadTime = Date.now() - startTime
        console.log(`Image loaded (${stage}): ${url} in ${loadTime}ms`)
        resolve(url)
      }

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${url}`))
      }

      // 模擬進度更新（實際應用中可能需要更精確的進度追蹤）
      if (stage === 'highQuality') {
        const progressInterval = setInterval(() => {
          const elapsed = Date.now() - startTime
          const estimatedTotal = 2000 // 預估載入時間
          const progress = Math.min(90, (elapsed / estimatedTotal) * 100)

          setLoadingState(prev => ({ ...prev, progress }))
          onProgress?.(progress)

          if (progress >= 90) {
            clearInterval(progressInterval)
          }
        }, 100)

        img.onload = () => {
          clearInterval(progressInterval)
          setLoadingState(prev => ({ ...prev, progress: 100 }))
          onProgress?.(100)
          resolve(url)
        }
      }

      img.src = url
    })
  }, [onProgress])

  // 從快取載入圖片
  const loadFromCache = useCallback(async (url: string): Promise<string | null> => {
    if (!enableCache || !cache.isEnabled) return null

    try {
      const cachedUrl = await cache.get(url)
      if (cachedUrl) {
        console.log('Image loaded from cache:', url)
        return cachedUrl
      }
    } catch (error) {
      console.warn('Cache load failed:', error)
    }

    return null
  }, [enableCache, cache])

  // 存入快取
  const saveToCache = useCallback(async (url: string): Promise<void> => {
    if (!enableCache || !cache.isEnabled) return

    try {
      await cache.set(url, url)
    } catch (error) {
      console.warn('Cache save failed:', error)
    }
  }, [enableCache, cache])

  // 漸進式載入邏輯
  const startProgressiveLoad = useCallback(async () => {
    if (loadingRef.current) return

    loadingRef.current = true
    abortControllerRef.current = new AbortController()

    try {
      onLoadStart?.()

      // 階段1：顯示低質量圖片（如果有）
      if (lowQualityUrl) {
        setLoadingState({ stage: 'lowQuality', progress: 20, error: null })

        try {
          // 先檢查快取
          const cachedLowQuality = await loadFromCache(lowQualityUrl)
          if (cachedLowQuality) {
            setCurrentSrc(cachedLowQuality)
          } else {
            const lowQualitySrc = await loadImage(lowQualityUrl, 'lowQuality')
            setCurrentSrc(lowQualitySrc)
            await saveToCache(lowQualityUrl)
          }

          setLoadingState(prev => ({ ...prev, progress: 40 }))
          onProgress?.(40)
        } catch (error) {
          console.warn('Low quality image load failed:', error)
          // 低質量圖片載入失敗不影響高質量圖片載入
        }
      }

      // 階段2：載入高質量圖片
      setLoadingState(prev => ({ ...prev, stage: 'highQuality', progress: 50 }))
      onProgress?.(50)

      // 先檢查快取
      const cachedHighQuality = await loadFromCache(highQualityUrl)
      if (cachedHighQuality) {
        setCurrentSrc(cachedHighQuality)
        setLoadingState({ stage: 'highQuality', progress: 100, error: null })
        onProgress?.(100)
        onLoadComplete?.()
      } else {
        const highQualitySrc = await loadImage(highQualityUrl, 'highQuality')
        setCurrentSrc(highQualitySrc)
        await saveToCache(highQualityUrl)

        setLoadingState({ stage: 'highQuality', progress: 100, error: null })
        onLoadComplete?.()
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error')
      setLoadingState({ stage: 'error', progress: 0, error: err })
      onError?.(err)

      // 自動重試
      if (currentRetry < retryCount) {
        setTimeout(() => {
          setCurrentRetry(prev => prev + 1)
          loadingRef.current = false
          startProgressiveLoad()
        }, retryDelay * (currentRetry + 1))
      }
    } finally {
      loadingRef.current = false
    }
  }, [
    lowQualityUrl,
    highQualityUrl,
    currentRetry,
    retryCount,
    retryDelay,
    onLoadStart,
    onProgress,
    onLoadComplete,
    onError,
    loadImage,
    loadFromCache,
    saveToCache
  ])

  // 手動重試
  const retry = useCallback(() => {
    setCurrentRetry(0)
    setLoadingState({ stage: 'placeholder', progress: 0, error: null })
    setCurrentSrc(placeholder || '')
    loadingRef.current = false
    startProgressiveLoad()
  }, [placeholder, startProgressiveLoad])

  // 預載入
  const preload = useCallback(async (): Promise<void> => {
    try {
      if (lowQualityUrl) {
        await cache.set(lowQualityUrl, lowQualityUrl)
      }
      await cache.set(highQualityUrl, highQualityUrl)
    } catch (error) {
      console.warn('Preload failed:', error)
    }
  }, [lowQualityUrl, highQualityUrl, cache])

  // 開始載入
  useEffect(() => {
    startProgressiveLoad()

    return () => {
      abortControllerRef.current?.abort()
      loadingRef.current = false
    }
  }, [startProgressiveLoad])

  // 清理資源
  useEffect(() => {
    return () => {
      if (currentSrc && currentSrc.startsWith('blob:')) {
        URL.revokeObjectURL(currentSrc)
      }
    }
  }, [currentSrc])

  return {
    src: currentSrc,
    isLoading: loadingState.stage !== 'highQuality' && loadingState.stage !== 'error',
    isLoaded: loadingState.stage === 'highQuality',
    hasError: loadingState.stage === 'error',
    progress: loadingState.progress,
    retry,
    preload
  }
}

// 生成漸進式JPEG URL的工具函數
export function createProgressiveUrls(baseUrl: string) {
  const url = new URL(baseUrl)

  return {
    placeholder: `${url.origin}${url.pathname}?w=20&q=20&blur=10`, // 20px寬度，低質量，模糊
    lowQuality: `${url.origin}${url.pathname}?w=200&q=50`, // 200px寬度，中等質量
    highQuality: baseUrl // 原始圖片
  }
}

// 批量預載入Hook
export function useBatchProgressivePreload(urls: string[]) {
  const [preloadProgress, setPreloadProgress] = useState(0)
  const [isPreloading, setIsPreloading] = useState(false)

  const cache = usePhotoCache()

  const preloadBatch = useCallback(async () => {
    if (urls.length === 0) return

    setIsPreloading(true)
    setPreloadProgress(0)

    try {
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i]
        const progressiveUrls = createProgressiveUrls(url)

        // 預載入低質量版本
        await cache.set(`low-${url}`, progressiveUrls.lowQuality)

        // 更新進度
        const progress = ((i + 1) / urls.length) * 100
        setPreloadProgress(progress)
      }
    } catch (error) {
      console.warn('Batch preload failed:', error)
    } finally {
      setIsPreloading(false)
    }
  }, [urls, cache])

  return {
    preload: preloadBatch,
    progress: preloadProgress,
    isPreloading
  }
}