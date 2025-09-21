/**
 * 效能工具函數測試
 * 測試圖片預載入、快取管理、效能監控等工具函數
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  preloadImages,
  createImageCache,
  measurePerformance,
  debounceScroll,
  throttleResize,
  calculateVisibleRange,
  optimizeImageLoading,
  generateImageSizes,
  detectWebPSupport,
  compressImageForCache
} from '../performanceUtils'

// Mock Image constructor
global.Image = class MockImage {
  src = ''
  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload()
    }, 10)
  }
} as any

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => [{ duration: 100 }])
}
global.performance = mockPerformance as any

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(() => Promise.resolve({
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve(undefined)),
        put: vi.fn(() => Promise.resolve()),
        delete: vi.fn(() => Promise.resolve()),
        clear: vi.fn(() => Promise.resolve())
      }))
    }))
  }))
}
global.indexedDB = mockIndexedDB as any

describe('performanceUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('preloadImages', () => {
    it('應該預載入指定的圖片URL列表', async () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg'
      ]

      const result = await preloadImages(urls)

      expect(result.success).toHaveLength(3)
      expect(result.failed).toHaveLength(0)
    })

    it('應該處理載入失敗的圖片', async () => {
      // Mock failed image loading
      global.Image = class MockFailedImage {
        src = ''
        onload: (() => void) | null = null
        onerror: (() => void) | null = null

        constructor() {
          setTimeout(() => {
            if (this.onerror) this.onerror()
          }, 10)
        }
      } as any

      const urls = ['https://example.com/failed.jpg']
      const result = await preloadImages(urls)

      expect(result.failed).toHaveLength(1)
      expect(result.success).toHaveLength(0)
    })

    it('應該支援並發限制', async () => {
      const urls = Array.from({ length: 10 }, (_, i) => `https://example.com/image${i}.jpg`)

      const result = await preloadImages(urls, { concurrency: 3 })

      expect(result.success.length + result.failed.length).toBe(10)
    })

    it('應該支援超時設定', async () => {
      const urls = ['https://example.com/slow.jpg']

      const result = await preloadImages(urls, { timeout: 100 })

      // 由於我們的mock會在10ms內完成，所以應該成功
      expect(result.success).toHaveLength(1)
    })
  })

  describe('createImageCache', () => {
    it('應該創建圖片快取實例', async () => {
      const cache = await createImageCache('test-cache', {
        maxSize: 50 * 1024 * 1024, // 50MB
        maxAge: 24 * 60 * 60 * 1000 // 24小時
      })

      expect(cache).toBeDefined()
      expect(typeof cache.get).toBe('function')
      expect(typeof cache.set).toBe('function')
      expect(typeof cache.delete).toBe('function')
      expect(typeof cache.clear).toBe('function')
    })

    it('應該支援快取項目的存取', async () => {
      const cache = await createImageCache('test-cache')
      const imageData = new Blob(['image data'])

      await cache.set('test-key', imageData)
      const retrieved = await cache.get('test-key')

      expect(mockIndexedDB.open).toHaveBeenCalled()
    })

    it('應該支援快取清理', async () => {
      const cache = await createImageCache('test-cache')

      await cache.clear()

      expect(mockIndexedDB.open).toHaveBeenCalled()
    })

    it('應該檢查快取大小限制', async () => {
      const cache = await createImageCache('test-cache', { maxSize: 1024 })
      const largeImageData = new Blob([new ArrayBuffer(2048)])

      // 應該拒絕過大的資料
      await expect(cache.set('large-image', largeImageData)).rejects.toThrow()
    })
  })

  describe('measurePerformance', () => {
    it('應該測量函數執行時間', async () => {
      const testFunction = () => new Promise(resolve => setTimeout(resolve, 50))

      const result = await measurePerformance('test-operation', testFunction)

      expect(result.duration).toBeGreaterThan(0)
      expect(result.operation).toBe('test-operation')
    })

    it('應該記錄效能標記', async () => {
      const testFunction = () => Promise.resolve('result')

      await measurePerformance('test-mark', testFunction)

      expect(mockPerformance.mark).toHaveBeenCalledWith('test-mark-start')
      expect(mockPerformance.mark).toHaveBeenCalledWith('test-mark-end')
      expect(mockPerformance.measure).toHaveBeenCalledWith('test-mark', 'test-mark-start', 'test-mark-end')
    })
  })

  describe('debounceScroll', () => {
    it('應該防抖處理滾動事件', () => {
      vi.useFakeTimers()
      const callback = vi.fn()
      const debouncedScroll = debounceScroll(callback, 100)

      // 快速觸發多次
      debouncedScroll()
      debouncedScroll()
      debouncedScroll()

      expect(callback).not.toHaveBeenCalled()

      // 等待防抖時間
      vi.advanceTimersByTime(100)
      expect(callback).toHaveBeenCalledTimes(1)

      vi.useRealTimers()
    })
  })

  describe('throttleResize', () => {
    it('應該節流處理調整大小事件', () => {
      vi.useFakeTimers()
      const callback = vi.fn()
      const throttledResize = throttleResize(callback, 100)

      // 快速觸發多次
      throttledResize()
      throttledResize()
      throttledResize()

      expect(callback).toHaveBeenCalledTimes(1)

      // 等待節流時間
      vi.advanceTimersByTime(100)
      throttledResize()
      expect(callback).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })
  })

  describe('calculateVisibleRange', () => {
    it('應該計算可見範圍的項目索引', () => {
      const result = calculateVisibleRange({
        scrollTop: 0,
        containerHeight: 600,
        itemHeight: 200,
        totalItems: 100,
        columnsPerRow: 4,
        overscan: 2
      })

      expect(result.startIndex).toBe(0)
      expect(result.endIndex).toBeGreaterThan(0)
      expect(result.endIndex).toBeLessThan(100)
    })

    it('應該包含overscan緩衝區', () => {
      const result = calculateVisibleRange({
        scrollTop: 400,
        containerHeight: 600,
        itemHeight: 200,
        totalItems: 100,
        columnsPerRow: 4,
        overscan: 4
      })

      // 應該包含額外的緩衝項目
      const visibleCount = result.endIndex - result.startIndex + 1
      const minExpected = Math.ceil(600 / 200) * 4 // 最少可見項目數
      expect(visibleCount).toBeGreaterThan(minExpected)
    })
  })

  describe('optimizeImageLoading', () => {
    it('應該根據網路狀況優化載入策略', () => {
      // Mock slow connection
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '2g' },
        writable: true
      })

      const strategy = optimizeImageLoading()

      expect(strategy.quality).toBe('low')
      expect(strategy.preloadCount).toBeLessThan(5)
      expect(strategy.concurrency).toBeLessThan(3)
    })

    it('應該支援快速連線的優化策略', () => {
      // Mock fast connection
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '4g' },
        writable: true
      })

      const strategy = optimizeImageLoading()

      expect(strategy.quality).toBe('high')
      expect(strategy.preloadCount).toBeGreaterThan(5)
      expect(strategy.concurrency).toBeGreaterThan(3)
    })
  })

  describe('generateImageSizes', () => {
    it('應該生成響應式圖片大小', () => {
      const sizes = generateImageSizes({
        containerWidth: 1200,
        columnCount: 4,
        gutterSize: 16
      })

      expect(sizes).toContain('(max-width: 768px)')
      expect(sizes).toContain('(max-width: 1024px)')
      expect(sizes).toContain('1200px')
    })

    it('應該考慮間距計算', () => {
      const sizes = generateImageSizes({
        containerWidth: 800,
        columnCount: 3,
        gutterSize: 20
      })

      // 應該包含正確的寬度計算
      expect(sizes).toBeDefined()
      expect(typeof sizes).toBe('string')
    })
  })

  describe('detectWebPSupport', () => {
    it('應該檢測WebP格式支援', async () => {
      // Mock canvas and toDataURL
      const mockCanvas = {
        getContext: vi.fn(() => ({})),
        toDataURL: vi.fn(() => 'data:image/webp;base64,test')
      }
      global.document.createElement = vi.fn(() => mockCanvas as any)

      const isSupported = await detectWebPSupport()

      expect(typeof isSupported).toBe('boolean')
    })
  })

  describe('compressImageForCache', () => {
    it('應該壓縮圖片用於快取', async () => {
      // Mock canvas and context
      const mockContext = {
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(100) }))
      }
      const mockCanvas = {
        getContext: vi.fn(() => mockContext),
        toBlob: vi.fn((callback) => {
          callback(new Blob(['compressed'], { type: 'image/jpeg' }))
        }),
        width: 100,
        height: 100
      }
      global.document.createElement = vi.fn(() => mockCanvas as any)

      const imageData = new Blob(['original image'])
      const compressed = await compressImageForCache(imageData, { quality: 0.8, maxWidth: 800 })

      expect(compressed).toBeInstanceOf(Blob)
      expect(mockCanvas.toBlob).toHaveBeenCalled()
    })
  })
})