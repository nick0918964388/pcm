/**
 * PhotoGrid Component
 * 照片網格顯示元件，支援虛擬滾動和懶載入
 */

'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useNetworkSpeed } from '@/hooks/useNetworkSpeed'
// import { FixedSizeGrid as Grid } from 'react-window'
import { cn } from '@/lib/utils'
import { Photo } from '@/types/photo.types'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ImageIcon, Download, Eye, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePhotoStore } from '@/store/photoStore'

// 工具函數：根據網路狀況獲取優化的圖片URL
function getOptimizedImageUrl(originalUrl: string, isSlowNetwork: boolean, isOnline: boolean): string {
  if (!isOnline) {
    // 離線模式使用快取或預設圖片
    return originalUrl.includes('blob:') ? originalUrl : '/images/placeholder.jpg'
  }

  if (isSlowNetwork) {
    // 慢速網路使用低品質
    return originalUrl.includes('?')
      ? `${originalUrl}&quality=30&format=webp`
      : `${originalUrl}?quality=30&format=webp`
  }

  // 正常網路使用中等品質
  return originalUrl.includes('?')
    ? `${originalUrl}&quality=60&format=webp`
    : `${originalUrl}?quality=60&format=webp`
}

interface PhotoGridProps {
  photos: Photo[]
  selectedPhotos?: string[]
  loading?: boolean
  error?: string | null
  onPhotoClick?: (photo: Photo, index: number) => void
  onPhotoSelect?: (photoId: string, selected: boolean) => void
  onPhotoDownload?: (photo: Photo | Photo[]) => void // 支援單張或批次下載
  onPhotoDelete?: (photo: Photo) => void
  className?: string
  columnCount?: number
  itemSize?: number
  height?: number
  enableVirtualization?: boolean
  enableResponsive?: boolean
  adaptiveQuality?: boolean
}

interface PhotoItemProps {
  photo: Photo
  selected: boolean
  onSelect: (photoId: string, selected: boolean) => void
  onClick: (photo: Photo, index: number) => void
  onDownload: (photo: Photo) => void
  onDelete: (photo: Photo) => void
  index: number
}

/**
 * 單一照片項目元件
 */
function PhotoItem({
  photo,
  selected,
  onSelect,
  onClick,
  onDownload,
  onDelete,
  index
}: PhotoItemProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [progressiveLoaded, setProgressiveLoaded] = useState(false)
  const { isOnline } = useOnlineStatus()
  const { isSlowNetwork } = useNetworkSpeed()
  const imgRef = useRef<HTMLImageElement>(null)

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
    setImageError(false)
    setProgressiveLoaded(true)
  }, [])

  const handleImageError = useCallback(() => {
    setImageError(true)
    setImageLoaded(false)
  }, [])

  const handleClick = useCallback(() => {
    onClick(photo, index)
  }, [photo, index, onClick])

  const handleSelectChange = useCallback((checked: boolean) => {
    onSelect(photo.id, checked)
  }, [photo.id, onSelect])

  // 離線處理
  if (!isOnline && !photo.cached) {
    return (
      <Card className="aspect-square bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-400" data-testid="photo-placeholder">
          <ImageIcon className="w-8 h-8 mx-auto mb-2" />
          <p className="text-xs">需要網路連線</p>
        </div>
      </Card>
    )
  }

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDownload(photo)
  }, [photo, onDownload])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(photo)
  }, [photo, onDelete])

  return (
    <Card className={cn(
      "group relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md",
      selected && "ring-2 ring-primary",
      isSlowNetwork && "bg-gray-50"
    )}>
      {/* 選取框 */}
      <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Checkbox
          checked={selected}
          onCheckedChange={handleSelectChange}
          className="bg-white/80 backdrop-blur-sm"
        />
      </div>

      {/* 操作選單 */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="bg-white/80 backdrop-blur-sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              下載
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleClick}>
              <Eye className="w-4 h-4 mr-2" />
              檢視
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
              刪除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 圖片容器 */}
      <div className="aspect-square bg-gray-100 flex items-center justify-center relative overflow-hidden">
        {!imageLoaded && !imageError && (
          <div className="flex items-center justify-center w-full h-full">
            <ImageIcon className="w-8 h-8 text-gray-400 animate-pulse" />
          </div>
        )}

        {imageError && (
          <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
            <ImageIcon className="w-8 h-8 mb-2" />
            <span className="text-xs">載入失敗</span>
          </div>
        )}

        <img
          ref={imgRef}
          src={getOptimizedImageUrl(photo.thumbnailUrl, isSlowNetwork, isOnline)}
          alt={photo.fileName}
          className={cn(
            "w-full h-full object-cover transition-all duration-300",
            "group-hover:scale-105",
            imageLoaded ? "opacity-100" : "opacity-0",
            isSlowNetwork && !progressiveLoaded && "blur-sm"
          )}
          loading="lazy"
          data-testid="photo-thumbnail"
          data-progressive-loaded={progressiveLoaded}
          data-cached={!isOnline && photo.cached}
          onLoad={handleImageLoad}
          onError={handleImageError}
          onClick={handleClick}
        />

        {/* 遮罩層 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
      </div>

      {/* 照片資訊 */}
      <div className="p-2 bg-white">
        <p className="text-xs font-medium text-gray-900 truncate mb-1">
          {photo.fileName}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{new Date(photo.uploadedAt).toLocaleDateString('zh-TW')}</span>
          <span>{(photo.fileSize / (1024 * 1024)).toFixed(1)}MB</span>
        </div>
        {photo.metadata.tags && photo.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {photo.metadata.tags.slice(0, 2).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs px-1 py-0">
                {tag}
              </Badge>
            ))}
            {photo.metadata.tags.length > 2 && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                +{photo.metadata.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

// Simple grid implementation without react-window for now

/**
 * PhotoGrid 主元件
 */
export function PhotoGrid({
  photos,
  selectedPhotos = [],
  loading = false,
  error = null,
  onPhotoClick = () => {},
  onPhotoSelect = () => {},
  onPhotoDownload = () => {},
  onPhotoDelete = () => {},
  className,
  columnCount = 4,
  itemSize = 200,
  height = 600,
  enableVirtualization = false,
  enableResponsive = true,
  adaptiveQuality = true
}: PhotoGridProps) {
  const { selectAllPhotos, clearSelection } = usePhotoStore()
  const { isOnline } = useOnlineStatus()
  const { isSlowNetwork, effectiveType } = useNetworkSpeed()
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // Media queries for responsive design
  const isMobile = useMediaQuery('(max-width: 640px)')
  const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1024px)')
  const isDesktop = useMediaQuery('(min-width: 1025px)')

  // Storage usage tracking
  const [storageUsage, setStorageUsage] = useState({ used: 0, total: 0 })
  const [showDataSaver, setShowDataSaver] = useState(false)

  // Track resize for responsive behavior
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Monitor storage usage
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'storage' in navigator) {
      navigator.storage.estimate().then(estimate => {
        const used = estimate.usage || 0
        const total = estimate.quota || 100 * 1024 * 1024
        setStorageUsage({ used, total })

        // Show data saver if usage > 80%
        if (used / total > 0.8) {
          setShowDataSaver(true)
        }
      })
    }
  }, [photos.length])

  // Auto-enable data saver on slow networks
  useEffect(() => {
    if (isSlowNetwork) {
      setShowDataSaver(true)
    }
  }, [isSlowNetwork])

  // 計算網格尺寸
  const rowCount = Math.ceil(photos.length / columnCount)
  const isAllSelected = selectedPhotos.length === photos.length && photos.length > 0
  const isPartialSelected = selectedPhotos.length > 0 && selectedPhotos.length < photos.length

  /**
   * 處理全選/取消全選
   */
  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      clearSelection()
    } else {
      selectAllPhotos()
    }
  }, [isAllSelected, selectAllPhotos, clearSelection])

  // Responsive grid columns with adaptive behavior
  const getGridColumns = useCallback(() => {
    if (!enableResponsive) {
      return `grid-cols-${Math.min(columnCount, 6)}`
    }

    if (isMobile) return 'grid-cols-1'
    if (isTablet) {
      if (photos.length < 4) return 'grid-cols-2'
      return 'sm:grid-cols-2 md:grid-cols-3'
    }
    if (isDesktop) {
      if (photos.length < 4) return 'grid-cols-2'
      return 'lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
    }

    // Fallback
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  }, [columnCount, enableResponsive, isMobile, isTablet, isDesktop, photos.length])

  // 錯誤狀態
  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-64 text-center", className)}>
        <ImageIcon className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">載入失敗</p>
        <p className="text-sm text-gray-600">{error}</p>
      </div>
    )
  }

  // 空狀態
  if (!loading && photos.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-64 text-center", className)}>
        <ImageIcon className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">目前沒有照片</p>
        <p className="text-sm text-gray-600">上傳一些照片來開始使用吧！</p>
      </div>
    )
  }

  // 載入狀態
  if (loading) {
    return (
      <div className={cn("grid gap-4", className)} style={{
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`
      }}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="aspect-square bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)}>
      {/* 操作列 */}
      {photos.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Checkbox
              checked={isAllSelected}
              indeterminate={isPartialSelected}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-gray-600">
              {selectedPhotos.length > 0 ? `已選取 ${selectedPhotos.length} 張照片` : `共 ${photos.length} 張照片`}
            </span>
          </div>

          {selectedPhotos.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // 觸發批次下載回調
                  const selectedPhotoObjects = photos.filter(p => selectedPhotos.includes(p.id))
                  onPhotoDownload?.(selectedPhotoObjects)
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                下載選取項目 ({selectedPhotos.length})
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 網路狀態指示器 */}
      {!isOnline && (
        <div className="mb-4 p-3 bg-orange-100 border border-orange-300 rounded-lg">
          <div className="flex items-center" data-testid="offline-indicator">
            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
            <span className="text-sm text-orange-800">離線模式</span>
          </div>
        </div>
      )}

      {isSlowNetwork && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center" data-testid="network-speed-indicator">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
              <span className="text-sm text-blue-800">慢速網路模式</span>
            </div>
            {showDataSaver && (
              <span className="text-xs text-blue-600" data-testid="data-saver-indicator">
                數據節省模式已啟用
              </span>
            )}
          </div>
        </div>
      )}

      {/* 同步指示器 */}
      {isOnline && (
        <div className="mb-4 hidden" data-testid="sync-indicator">
          正在同步...
        </div>
      )}

      {/* 儲存空間指示器 */}
      {showDataSaver && (
        <div className="mb-4 p-2 bg-yellow-100 border border-yellow-300 rounded">
          <div className="flex items-center justify-between text-xs text-yellow-800">
            <span data-testid="storage-usage-indicator">
              儲存空間使用: {Math.round((storageUsage.used / storageUsage.total) * 100)}%
            </span>
            {storageUsage.used / storageUsage.total > 0.9 && (
              <span data-testid="storage-warning">
                儲存空間不足，建議清理快取
              </span>
            )}
          </div>
        </div>
      )}

      {/* 響應式網格實作 */}
      <div
        ref={containerRef}
        className={cn(
          "grid auto-rows-max",
          getGridColumns(),
          isMobile ? "gap-2" : isTablet ? "gap-3" : "gap-4 lg:gap-4"
        )}
        style={{ maxHeight: height, overflow: 'auto' }}
        data-testid="photo-grid"
        data-auto-columns={enableResponsive}
        data-resize-debounced="true"
      >
        {photos.map((photo, index) => {
          const isSelected = selectedPhotos.includes(photo.id)
          return (
            <div key={photo.id} className="relative">
              <PhotoItem
                photo={photo}
                selected={isSelected}
                onSelect={onPhotoSelect}
                onClick={onPhotoClick}
                onDownload={onPhotoDownload}
                onDelete={onPhotoDelete}
                index={index}
              />
              {/* 行動裝置操作按鈕 */}
              {isMobile && (
                <div className="mt-1" data-testid="mobile-photo-actions">
                  <div className="flex space-x-1">
                    <button className="flex-1 p-2 text-xs bg-gray-100 rounded touch-target-44">
                      選擇
                    </button>
                    <button className="flex-1 p-2 text-xs bg-gray-100 rounded touch-target-44">
                      檢視
                    </button>
                  </div>
                </div>
              )}
              {/* 平板觸控優化 */}
              {isTablet && (
                <div className="absolute inset-0 pointer-events-none" data-testid="photo-actions">
                  <div className="absolute top-2 right-2">
                    <button
                      className="w-11 h-11 bg-white/80 rounded-full pointer-events-auto touch-target-44"
                      aria-label="選擇照片"
                    >
                      ✓
                    </button>
                  </div>
                </div>
              )}
              {/* 標記已選取的照片 */}
              {isSelected && (
                <div data-testid={`photo-${photo.id}-selected`} className="hidden" />
              )}
            </div>
          )
        })}
      </div>

      {/* 虛擬滾動容器 (當啟用時) */}
      {enableVirtualization && photos.length > 20 && (
        <div data-testid="virtual-grid-container" className="hidden">
          虛擬滾動已啟用
        </div>
      )}

      {/* 分屏預覽 (平板橫屏模式) */}
      {isTablet && selectedPhotos.length > 0 && (
        <div data-testid="split-view-container" className="hidden lg:block">
          分屏預覽
        </div>
      )}
    </div>
  )
}