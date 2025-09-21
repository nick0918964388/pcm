/**
 * 優化的照片庫組件
 * 整合所有效能優化策略，提供最佳的首次載入體驗
 */

'use client'

import {
  Suspense,
  lazy,
  useState,
  useEffect,
  useCallback,
  useMemo
} from 'react'
import { cn } from '@/lib/utils'
import { Photo } from '@/types/photo.types'
import { usePhotoCache } from '@/hooks/usePhotoCache'
import { useBatchProgressivePreload } from '@/hooks/useProgressiveImage'
import { optimizeImageLoading, detectWebPSupport } from '@/utils/performanceUtils'
import { usePhotoStore } from '@/store/photoStore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ImageIcon,
  Wifi,
  WifiOff,
  Settings,
  Zap,
  Clock
} from 'lucide-react'

// 懶載入組件
const VirtualizedPhotoGrid = lazy(() =>
  import('./VirtualizedPhotoGrid').then(module => ({
    default: module.VirtualizedPhotoGrid
  }))
)

const PhotoLightbox = lazy(() =>
  import('./PhotoLightbox').then(module => ({
    default: module.PhotoLightbox
  }))
)

interface OptimizedPhotoGalleryProps {
  projectId: string
  className?: string
  initialPhotos?: Photo[]
  enablePreloading?: boolean
  enableOptimizations?: boolean
}

interface LoadingStrategy {
  quality: 'low' | 'medium' | 'high'
  preloadCount: number
  concurrency: number
  cacheEnabled: boolean
}

interface PerformanceMetrics {
  firstContentfulPaint: number
  largestContentfulPaint: number
  totalLoadTime: number
  cacheHitRate: number
  networkEffectiveType: string
  webpSupported: boolean
}

/**
 * 載入指示器組件
 */
function LoadingIndicator({ progress, strategy, metrics }: {
  progress: number
  strategy: LoadingStrategy
  metrics: PerformanceMetrics
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-blue-500" />
          <span className="font-medium">正在優化載入體驗</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {strategy.quality} 質量
        </Badge>
      </div>

      <Progress value={progress} className="mb-4" />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center space-x-2">
          {metrics.networkEffectiveType === '4g' ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-orange-500" />
          )}
          <span>網路: {metrics.networkEffectiveType}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-blue-500" />
          <span>快取命中: {Math.round(metrics.cacheHitRate * 100)}%</span>
        </div>
        <div className="col-span-2 text-xs text-gray-500">
          WebP支援: {metrics.webpSupported ? '是' : '否'} |
          預載入: {strategy.preloadCount} 張 |
          並發: {strategy.concurrency}
        </div>
      </div>
    </Card>
  )
}

/**
 * 效能設定面板組件
 */
function PerformanceSettings({ strategy, onStrategyChange }: {
  strategy: LoadingStrategy
  onStrategyChange: (strategy: LoadingStrategy) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2"
      >
        <Settings className="w-4 h-4" />
        <span>效能設定</span>
      </Button>

      {isOpen && (
        <Card className="absolute top-10 right-0 w-80 p-4 z-10 shadow-lg">
          <h3 className="font-medium mb-3">載入策略設定</h3>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">圖片質量</label>
              <select
                value={strategy.quality}
                onChange={(e) => onStrategyChange({
                  ...strategy,
                  quality: e.target.value as LoadingStrategy['quality']
                })}
                className="w-full mt-1 p-2 border rounded"
              >
                <option value="low">低 (節省流量)</option>
                <option value="medium">中 (平衡)</option>
                <option value="high">高 (最佳質量)</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">預載入數量</label>
              <input
                type="range"
                min="0"
                max="20"
                value={strategy.preloadCount}
                onChange={(e) => onStrategyChange({
                  ...strategy,
                  preloadCount: parseInt(e.target.value)
                })}
                className="w-full mt-1"
              />
              <div className="text-xs text-gray-500 mt-1">
                {strategy.preloadCount} 張照片
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">並發載入</label>
              <input
                type="range"
                min="1"
                max="10"
                value={strategy.concurrency}
                onChange={(e) => onStrategyChange({
                  ...strategy,
                  concurrency: parseInt(e.target.value)
                })}
                className="w-full mt-1"
              />
              <div className="text-xs text-gray-500 mt-1">
                同時載入 {strategy.concurrency} 張
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="w-full mt-3"
          >
            關閉
          </Button>
        </Card>
      )}
    </div>
  )
}

/**
 * 骨架載入組件
 */
function PhotoGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="aspect-square">
          <Skeleton className="w-full h-full" />
        </Card>
      ))}
    </div>
  )
}

/**
 * 優化的照片庫主組件
 */
export function OptimizedPhotoGallery({
  projectId,
  className,
  initialPhotos = [],
  enablePreloading = true,
  enableOptimizations = true
}: OptimizedPhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [loadingStrategy, setLoadingStrategy] = useState<LoadingStrategy>(
    optimizeImageLoading()
  )
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    totalLoadTime: 0,
    cacheHitRate: 0,
    networkEffectiveType: '4g',
    webpSupported: false
  })
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)

  const {
    photos: storePhotos,
    loading,
    selectedPhotos,
    lightboxOpen,
    lightboxIndex,
    loadPhotos,
    selectPhoto,
    deselectPhoto,
    openLightbox,
    closeLightbox
  } = usePhotoStore()

  const cache = usePhotoCache({
    maxSize: 100 * 1024 * 1024, // 100MB
    enableCompression: true
  })

  // 批量預載入
  const thumbnailUrls = useMemo(() =>
    photos.slice(0, loadingStrategy.preloadCount).map(p => p.thumbnailUrl),
    [photos, loadingStrategy.preloadCount]
  )

  const { preload, progress, isPreloading } = useBatchProgressivePreload(thumbnailUrls)

  // 初始化效能監控
  useEffect(() => {
    const initPerformanceMetrics = async () => {
      const webpSupported = await detectWebPSupport()
      const connection = (navigator as any).connection

      setPerformanceMetrics(prev => ({
        ...prev,
        webpSupported,
        networkEffectiveType: connection?.effectiveType || '4g'
      }))
    }

    initPerformanceMetrics()
  }, [])

  // 載入照片資料
  useEffect(() => {
    const loadPhotoData = async () => {
      const startTime = performance.now()

      try {
        if (initialPhotos.length === 0) {
          await loadPhotos(projectId)
          setPhotos(storePhotos)
        }

        // 測量首次內容繪製時間
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'paint') {
                if (entry.name === 'first-contentful-paint') {
                  setPerformanceMetrics(prev => ({
                    ...prev,
                    firstContentfulPaint: entry.startTime
                  }))
                }
              }
              if (entry.entryType === 'largest-contentful-paint') {
                setPerformanceMetrics(prev => ({
                  ...prev,
                  largestContentfulPaint: entry.startTime
                }))
              }
            }
          })

          observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] })
        }

        const totalLoadTime = performance.now() - startTime
        setPerformanceMetrics(prev => ({
          ...prev,
          totalLoadTime
        }))

        setIsInitialLoading(false)
      } catch (error) {
        console.error('Failed to load photos:', error)
        setIsInitialLoading(false)
      }
    }

    loadPhotoData()
  }, [projectId, initialPhotos, loadPhotos, storePhotos])

  // 開始預載入
  useEffect(() => {
    if (enablePreloading && photos.length > 0 && !isInitialLoading) {
      preload()
    }
  }, [enablePreloading, photos, isInitialLoading, preload])

  // 更新快取命中率
  useEffect(() => {
    const updateCacheStats = () => {
      const stats = cache.getStats()
      setPerformanceMetrics(prev => ({
        ...prev,
        cacheHitRate: stats.hitRate
      }))
    }

    const interval = setInterval(updateCacheStats, 5000)
    return () => clearInterval(interval)
  }, [cache])

  // 照片點擊處理
  const handlePhotoClick = useCallback((photo: Photo, index: number) => {
    setSelectedPhotoId(photo.id)
    openLightbox(index)
  }, [openLightbox])

  // 照片選取處理
  const handlePhotoSelect = useCallback((photoId: string, selected: boolean) => {
    if (selected) {
      selectPhoto(photoId)
    } else {
      deselectPhoto(photoId)
    }
  }, [selectPhoto, deselectPhoto])

  // 策略變更處理
  const handleStrategyChange = useCallback((newStrategy: LoadingStrategy) => {
    setLoadingStrategy(newStrategy)
  }, [])

  // 載入狀態
  if (isInitialLoading || loading) {
    return (
      <div className={cn("space-y-6", className)}>
        {enableOptimizations && (
          <LoadingIndicator
            progress={progress}
            strategy={loadingStrategy}
            metrics={performanceMetrics}
          />
        )}
        <PhotoGridSkeleton />
      </div>
    )
  }

  // 空狀態
  if (photos.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-64 text-center", className)}>
        <ImageIcon className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">目前沒有照片</p>
        <p className="text-sm text-gray-600">上傳一些照片來開始使用吧！</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* 控制面板 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">照片庫</h2>
          <Badge variant="outline">
            {photos.length} 張照片
          </Badge>
          {isPreloading && (
            <Badge variant="secondary" className="animate-pulse">
              預載入中...
            </Badge>
          )}
        </div>

        {enableOptimizations && (
          <PerformanceSettings
            strategy={loadingStrategy}
            onStrategyChange={handleStrategyChange}
          />
        )}
      </div>

      {/* 效能指標 */}
      {enableOptimizations && performanceMetrics.firstContentfulPaint > 0 && (
        <Card className="p-4">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">首次繪製</div>
              <div className="font-medium">
                {Math.round(performanceMetrics.firstContentfulPaint)}ms
              </div>
            </div>
            <div>
              <div className="text-gray-500">最大繪製</div>
              <div className="font-medium">
                {Math.round(performanceMetrics.largestContentfulPaint)}ms
              </div>
            </div>
            <div>
              <div className="text-gray-500">載入時間</div>
              <div className="font-medium">
                {Math.round(performanceMetrics.totalLoadTime)}ms
              </div>
            </div>
            <div>
              <div className="text-gray-500">快取命中</div>
              <div className="font-medium">
                {Math.round(performanceMetrics.cacheHitRate * 100)}%
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 照片網格 */}
      <Suspense fallback={<PhotoGridSkeleton />}>
        <VirtualizedPhotoGrid
          photos={photos}
          height={600}
          selectedPhotos={selectedPhotos}
          selectable
          responsive
          enableCaching={loadingStrategy.cacheEnabled}
          preloadCount={loadingStrategy.preloadCount}
          onPhotoClick={handlePhotoClick}
          onPhotoSelect={handlePhotoSelect}
        />
      </Suspense>

      {/* 燈箱 */}
      {lightboxOpen && (
        <Suspense fallback={<div>載入中...</div>}>
          <PhotoLightbox
            photos={photos}
            currentIndex={lightboxIndex}
            isOpen={lightboxOpen}
            onClose={closeLightbox}
          />
        </Suspense>
      )}
    </div>
  )
}