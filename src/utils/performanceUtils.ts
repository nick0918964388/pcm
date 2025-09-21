/**
 * 效能優化工具函數
 * 提供圖片預載入、快取管理、效能監控等功能
 */

interface PreloadResult {
  success: string[]
  failed: string[]
}

interface PreloadOptions {
  concurrency?: number
  timeout?: number
}

interface CacheOptions {
  maxSize?: number
  maxAge?: number
}

interface ImageCache {
  get: (key: string) => Promise<Blob | null>
  set: (key: string, data: Blob) => Promise<void>
  delete: (key: string) => Promise<void>
  clear: () => Promise<void>
}

interface PerformanceResult {
  operation: string
  duration: number
  timestamp: number
}

interface VisibleRangeOptions {
  scrollTop: number
  containerHeight: number
  itemHeight: number
  totalItems: number
  columnsPerRow: number
  overscan?: number
}

interface VisibleRange {
  startIndex: number
  endIndex: number
}

interface LoadingStrategy {
  quality: 'low' | 'medium' | 'high'
  preloadCount: number
  concurrency: number
  cacheEnabled: boolean
}

interface ImageSizeOptions {
  containerWidth: number
  columnCount: number
  gutterSize?: number
}

interface CompressionOptions {
  quality?: number
  maxWidth?: number
  maxHeight?: number
  format?: 'jpeg' | 'webp'
}

/**
 * 預載入圖片列表
 */
export async function preloadImages(
  urls: string[],
  options: PreloadOptions = {}
): Promise<PreloadResult> {
  const { concurrency = 5, timeout = 30000 } = options
  const result: PreloadResult = { success: [], failed: [] }

  // 分批處理以控制並發數
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    const promises = batch.map(url => loadImage(url, timeout))

    const results = await Promise.allSettled(promises)
    results.forEach((result, index) => {
      const url = batch[index]
      if (result.status === 'fulfilled') {
        result.success.push(url)
      } else {
        result.failed.push(url)
      }
    })
  }

  return result
}

/**
 * 載入單張圖片
 */
function loadImage(url: string, timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const timer = setTimeout(() => {
      reject(new Error(`Image load timeout: ${url}`))
    }, timeout)

    img.onload = () => {
      clearTimeout(timer)
      resolve(url)
    }

    img.onerror = () => {
      clearTimeout(timer)
      reject(new Error(`Image load failed: ${url}`))
    }

    img.src = url
  })
}

/**
 * 創建圖片快取
 */
export async function createImageCache(
  name: string,
  options: CacheOptions = {}
): Promise<ImageCache> {
  const { maxSize = 50 * 1024 * 1024, maxAge = 24 * 60 * 60 * 1000 } = options

  const db = await openDatabase(name)

  return {
    async get(key: string): Promise<Blob | null> {
      try {
        const transaction = db.transaction(['cache'], 'readonly')
        const store = transaction.objectStore('cache')
        const request = store.get(key)

        return new Promise((resolve) => {
          request.onsuccess = () => {
            const result = request.result
            if (result && Date.now() - result.timestamp < maxAge) {
              resolve(result.data)
            } else {
              resolve(null)
            }
          }
          request.onerror = () => resolve(null)
        })
      } catch {
        return null
      }
    },

    async set(key: string, data: Blob): Promise<void> {
      if (data.size > maxSize) {
        throw new Error('Data too large for cache')
      }

      try {
        const transaction = db.transaction(['cache'], 'readwrite')
        const store = transaction.objectStore('cache')

        const entry = {
          key,
          data,
          timestamp: Date.now(),
          size: data.size
        }

        store.put(entry)
      } catch (error) {
        console.warn('Cache write failed:', error)
      }
    },

    async delete(key: string): Promise<void> {
      try {
        const transaction = db.transaction(['cache'], 'readwrite')
        const store = transaction.objectStore('cache')
        store.delete(key)
      } catch (error) {
        console.warn('Cache delete failed:', error)
      }
    },

    async clear(): Promise<void> {
      try {
        const transaction = db.transaction(['cache'], 'readwrite')
        const store = transaction.objectStore('cache')
        store.clear()
      } catch (error) {
        console.warn('Cache clear failed:', error)
      }
    }
  }
}

/**
 * 開啟IndexedDB資料庫
 */
function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(`${name}-cache`, 1)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('cache')) {
        const store = db.createObjectStore('cache', { keyPath: 'key' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('size', 'size', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 測量效能
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<PerformanceResult & { result: T }> {
  const startMark = `${operation}-start`
  const endMark = `${operation}-end`

  performance.mark(startMark)
  const startTime = performance.now()

  try {
    const result = await fn()
    const endTime = performance.now()

    performance.mark(endMark)
    performance.measure(operation, startMark, endMark)

    return {
      operation,
      duration: endTime - startTime,
      timestamp: Date.now(),
      result
    }
  } catch (error) {
    const endTime = performance.now()
    performance.mark(endMark)

    throw {
      ...error,
      duration: endTime - startTime,
      operation
    }
  }
}

/**
 * 防抖滾動處理
 */
export function debounceScroll(
  callback: () => void,
  delay: number
): () => void {
  let timeoutId: NodeJS.Timeout

  return () => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(callback, delay)
  }
}

/**
 * 節流調整大小處理
 */
export function throttleResize(
  callback: () => void,
  delay: number
): () => void {
  let lastCall = 0

  return () => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      callback()
    }
  }
}

/**
 * 計算可見範圍
 */
export function calculateVisibleRange(options: VisibleRangeOptions): VisibleRange {
  const {
    scrollTop,
    containerHeight,
    itemHeight,
    totalItems,
    columnsPerRow,
    overscan = 2
  } = options

  const startRow = Math.floor(scrollTop / itemHeight)
  const endRow = Math.min(
    Math.ceil((scrollTop + containerHeight) / itemHeight),
    Math.ceil(totalItems / columnsPerRow)
  )

  const startIndex = Math.max(0, (startRow - overscan) * columnsPerRow)
  const endIndex = Math.min(
    totalItems - 1,
    (endRow + overscan) * columnsPerRow - 1
  )

  return { startIndex, endIndex }
}

/**
 * 根據網路狀況優化載入策略
 */
export function optimizeImageLoading(): LoadingStrategy {
  const connection = (navigator as any).connection

  if (!connection) {
    return {
      quality: 'medium',
      preloadCount: 5,
      concurrency: 3,
      cacheEnabled: true
    }
  }

  const effectiveType = connection.effectiveType

  switch (effectiveType) {
    case '2g':
      return {
        quality: 'low',
        preloadCount: 2,
        concurrency: 1,
        cacheEnabled: true
      }
    case '3g':
      return {
        quality: 'medium',
        preloadCount: 3,
        concurrency: 2,
        cacheEnabled: true
      }
    case '4g':
      return {
        quality: 'high',
        preloadCount: 8,
        concurrency: 5,
        cacheEnabled: true
      }
    default:
      return {
        quality: 'medium',
        preloadCount: 5,
        concurrency: 3,
        cacheEnabled: true
      }
  }
}

/**
 * 生成響應式圖片大小
 */
export function generateImageSizes(options: ImageSizeOptions): string {
  const { containerWidth, columnCount, gutterSize = 16 } = options

  const itemWidth = (containerWidth - (gutterSize * (columnCount - 1))) / columnCount

  const breakpoints = [
    { maxWidth: 768, columns: Math.min(2, columnCount) },
    { maxWidth: 1024, columns: Math.min(3, columnCount) },
    { maxWidth: 1920, columns: columnCount }
  ]

  const sizes = breakpoints.map(bp => {
    const cols = bp.columns
    const width = (bp.maxWidth - (gutterSize * (cols - 1))) / cols
    return `(max-width: ${bp.maxWidth}px) ${Math.round(width)}px`
  })

  sizes.push(`${Math.round(itemWidth)}px`)

  return sizes.join(', ')
}

/**
 * 檢測WebP支援
 */
export function detectWebPSupport(): Promise<boolean> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      resolve(false)
      return
    }

    const dataURL = canvas.toDataURL('image/webp')
    resolve(dataURL.indexOf('data:image/webp') === 0)
  })
}

/**
 * 壓縮圖片用於快取
 */
export function compressImageForCache(
  imageData: Blob,
  options: CompressionOptions = {}
): Promise<Blob> {
  const { quality = 0.8, maxWidth = 800, maxHeight = 800, format = 'jpeg' } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }

    img.onload = () => {
      // 計算縮放比例
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1)

      canvas.width = img.width * scale
      canvas.height = img.height * scale

      // 繪製縮放後的圖片
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // 轉換為Blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        `image/${format}`,
        quality
      )
    }

    img.onerror = () => reject(new Error('Failed to load image'))

    // 載入圖片資料
    const url = URL.createObjectURL(imageData)
    img.src = url
  })
}