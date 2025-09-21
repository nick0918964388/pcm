/**
 * 虛擬滾動照片網格組件
 * 提供高效能的大量照片顯示功能
 */

'use client'

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo
} from 'react'
import { cn } from '@/lib/utils'
import { Photo } from '@/types/photo.types'
import { usePhotoPerformance } from '@/hooks/usePhotoPerformance'
import { throttleResize } from '@/utils/performanceUtils'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ImageIcon,
  Download,
  Eye,
  MoreHorizontal,
  RotateCcw
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface VirtualizedPhotoGridProps {
  photos: Photo[]
  height: number
  itemHeight?: number
  columnsPerRow?: number
  overscan?: number
  preloadCount?: number
  enableCaching?: boolean
  enableRetry?: boolean
  selectable?: boolean
  responsive?: boolean
  selectedPhotos?: string[]
  onPhotoClick?: (photo: Photo, index: number) => void
  onPhotoSelect?: (photoId: string | 'all', selected: boolean) => void
  onPhotoDownload?: (photo: Photo | Photo[]) => void
  onPhotoDelete?: (photo: Photo) => void
  onPerformanceUpdate?: (metrics: any) => void
  className?: string
}

interface VirtualPhotoItemProps {
  photo: Photo
  index: number
  style: React.CSSProperties
  isVisible: boolean
  isLoaded: boolean
  hasFailed: boolean
  loadingProgress: number
  selectable: boolean
  selected: boolean
  enableRetry: boolean
  onLoad: () => void
  onError: () => void
  onRetry: () => void
  onSelect: (selected: boolean) => void
  onClick: () => void
  onDownload: () => void
  onDelete: () => void
}

/**
 * 虛擬照片項目組件
 */
function VirtualPhotoItem({
  photo,
  index,
  style,
  isVisible,
  isLoaded,
  hasFailed,
  loadingProgress,
  selectable,
  selected,
  enableRetry,
  onLoad,
  onError,
  onRetry,
  onSelect,
  onClick,
  onDownload,
  onDelete
}: VirtualPhotoItemProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
    onLoad()
  }, [onLoad])

  const handleImageError = useCallback(() => {
    onError()
  }, [onError])

  const handleClick = useCallback(() => {
    onClick()
  }, [onClick])

  const handleSelect = useCallback((checked: boolean) => {
    onSelect(checked)
  }, [onSelect])

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDownload()
  }, [onDownload])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }, [onDelete])

  const handleRetry = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onRetry()
  }, [onRetry])

  return (
    <div
      style={style}
      className={cn(
        "absolute group cursor-pointer transition-all duration-200",
        selected && "ring-2 ring-primary"
      )}
      data-testid={`photo-item-${photo.id}`}
      data-photo-id={photo.id}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={handleClick}
    >
      <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
        {/* 選取框 */}
        {selectable && (
          <div className={cn(
            "absolute top-2 left-2 z-10 transition-opacity",
            showActions ? "opacity-100" : "opacity-0"
          )}>
            <Checkbox
              checked={selected}
              onCheckedChange={handleSelect}
              className="bg-white/80 backdrop-blur-sm"
            />
          </div>
        )}

        {/* 操作選單 */}
        <div className={cn(
          "absolute top-2 right-2 z-10 transition-opacity",
          showActions ? "opacity-100" : "opacity-0"
        )}>
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

        {/* 圖片內容 */}
        <div className="w-full h-full flex items-center justify-center">
          {!isVisible && (
            <div className="flex items-center justify-center w-full h-full">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
          )}

          {isVisible && !imageLoaded && !hasFailed && (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <ImageIcon className="w-8 h-8 text-gray-400 animate-pulse mb-2" />
              {loadingProgress > 0 && (
                <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {hasFailed && (
            <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
              <ImageIcon className="w-8 h-8 mb-2" />
              <span className="text-xs mb-2">載入失敗</span>
              {enableRetry && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRetry}
                  className="text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  重試
                </Button>
              )}
            </div>
          )}

          {isVisible && !hasFailed && (
            <img
              src={photo.thumbnailUrl}
              alt={photo.fileName}
              className={cn(
                "w-full h-full object-cover transition-all duration-300",
                "group-hover:scale-105",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              loading="lazy"
              onLoad={handleImageLoad}
              onError={handleImageError}
              data-testid={`photo-img-${photo.id}`}
            />
          )}

          {/* 漸進式載入遮罩 */}
          {isVisible && loadingProgress > 0 && loadingProgress < 100 && (
            <div className="absolute inset-0 bg-gradient-to-t from-gray-200 to-transparent opacity-30" />
          )}

          {/* Hover遮罩 */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
        </div>

        {/* 照片資訊 */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <p className="text-xs font-medium text-white truncate mb-1">
            {photo.fileName}
          </p>
          <div className="flex items-center justify-between text-xs text-white/80">
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
      </div>
    </div>
  )
}

/**
 * 虛擬滾動照片網格主組件
 */
export function VirtualizedPhotoGrid({
  photos,
  height,
  itemHeight = 200,
  columnsPerRow: initialColumns = 4,
  overscan = 2,
  preloadCount = 5,
  enableCaching = true,
  enableRetry = true,
  selectable = false,
  responsive = true,
  selectedPhotos = [],
  onPhotoClick = () => {},
  onPhotoSelect = () => {},
  onPhotoDownload = () => {},
  onPhotoDelete = () => {},
  onPerformanceUpdate = () => {},
  className
}: VirtualizedPhotoGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const [columnsPerRow, setColumnsPerRow] = useState(initialColumns)

  // 效能優化Hook
  const {
    visiblePhotos,
    totalHeight,
    loadedImages,
    failedImages,
    loadingProgress,
    performanceMetrics,
    handleScroll,
    handleIntersection,
    handleImageError,
    retryFailedImage,
    startLoadTimer,
    endLoadTimer,
    updateLoadingProgress
  } = usePhotoPerformance({
    photos,
    containerHeight: height,
    itemHeight,
    columnsPerRow,
    threshold: 0.1,
    preloadCount,
    enableCaching,
    enableProgressiveLoading: true,
    enablePerformanceMonitoring: true
  })

  // Intersection Observer設定
  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: '50px'
    })

    return () => observer.disconnect()
  }, [handleIntersection])

  // 響應式調整
  useEffect(() => {
    if (!responsive) return

    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth
        setContainerWidth(width)

        // 根據寬度調整列數
        if (width < 768) {
          setColumnsPerRow(Math.min(2, initialColumns))
        } else if (width < 1024) {
          setColumnsPerRow(Math.min(3, initialColumns))
        } else {
          setColumnsPerRow(initialColumns)
        }
      }
    }

    const throttledResize = throttleResize(updateDimensions, 100)
    const resizeObserver = new ResizeObserver(throttledResize)

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
      updateDimensions()
    }

    return () => resizeObserver.disconnect()
  }, [responsive, initialColumns])

  // 滾動處理
  const handleContainerScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    handleScroll(newScrollTop)
  }, [handleScroll])

  // 計算項目位置
  const getItemStyle = useCallback((index: number): React.CSSProperties => {
    const row = Math.floor(index / columnsPerRow)
    const col = index % columnsPerRow
    const itemWidth = containerWidth / columnsPerRow

    return {
      left: col * itemWidth,
      top: row * itemHeight,
      width: itemWidth,
      height: itemHeight
    }
  }, [columnsPerRow, containerWidth, itemHeight])

  // 全選處理
  const isAllSelected = useMemo(() =>
    selectedPhotos.length === photos.length && photos.length > 0,
    [selectedPhotos.length, photos.length]
  )

  const isPartialSelected = useMemo(() =>
    selectedPhotos.length > 0 && selectedPhotos.length < photos.length,
    [selectedPhotos.length, photos.length]
  )

  const handleSelectAll = useCallback(() => {
    onPhotoSelect('all', !isAllSelected)
  }, [isAllSelected, onPhotoSelect])

  // 效能監控更新
  useEffect(() => {
    onPerformanceUpdate(performanceMetrics)
  }, [performanceMetrics, onPerformanceUpdate])

  // 預載入link標籤
  useEffect(() => {
    const preloadLinks = visiblePhotos.slice(0, preloadCount).map(photo => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = photo.thumbnailUrl
      return link
    })

    preloadLinks.forEach(link => document.head.appendChild(link))

    return () => {
      preloadLinks.forEach(link => {
        if (document.head.contains(link)) {
          document.head.removeChild(link)
        }
      })
    }
  }, [visiblePhotos, preloadCount])

  return (
    <div className={cn("w-full", className)}>
      {/* 操作列 */}
      {selectable && photos.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Checkbox
              checked={isAllSelected}
              indeterminate={isPartialSelected}
              onCheckedChange={handleSelectAll}
              data-testid="select-all-checkbox"
            />
            <span className="text-sm text-gray-600">
              {selectedPhotos.length > 0
                ? `已選取 ${selectedPhotos.length} 張照片`
                : `共 ${photos.length} 張照片`
              }
            </span>
          </div>

          {selectedPhotos.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const selectedPhotoObjects = photos.filter(p => selectedPhotos.includes(p.id))
                onPhotoDownload(selectedPhotoObjects)
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              下載選取項目 ({selectedPhotos.length})
            </Button>
          )}
        </div>
      )}

      {/* 虛擬滾動容器 */}
      <div
        ref={containerRef}
        className="relative overflow-auto"
        style={{ height }}
        onScroll={handleContainerScroll}
        data-testid="virtualized-photo-grid"
      >
        {/* 滾動空間 */}
        <div
          style={{ height: totalHeight }}
          data-testid="scroll-container"
        />

        {/* 可見項目 */}
        {visiblePhotos.map((photo, index) => {
          const globalIndex = photos.indexOf(photo)
          const itemStyle = getItemStyle(globalIndex)

          return (
            <VirtualPhotoItem
              key={photo.id}
              photo={photo}
              index={globalIndex}
              style={itemStyle}
              isVisible={loadedImages.has(photo.id)}
              isLoaded={loadedImages.has(photo.id)}
              hasFailed={failedImages.has(photo.id)}
              loadingProgress={loadingProgress[photo.id] || 0}
              selectable={selectable}
              selected={selectedPhotos.includes(photo.id)}
              enableRetry={enableRetry}
              onLoad={() => {
                endLoadTimer(photo.id)
                updateLoadingProgress(photo.id, 100)
              }}
              onError={() => handleImageError(photo.id, new Error('載入失敗'))}
              onRetry={() => retryFailedImage(photo.id)}
              onSelect={(selected) => onPhotoSelect(photo.id, selected)}
              onClick={() => onPhotoClick(photo, globalIndex)}
              onDownload={() => onPhotoDownload(photo)}
              onDelete={() => onPhotoDelete(photo)}
            />
          )
        })}
      </div>

      {/* 效能資訊 */}
      {performanceMetrics.loadedImages > 0 && (
        <div className="mt-2 text-xs text-gray-500 flex justify-between">
          <span>
            已載入: {performanceMetrics.loadedImages}/{photos.length}
          </span>
          <span>
            平均載入時間: {performanceMetrics.averageLoadTime.toFixed(0)}ms
          </span>
        </div>
      )}
    </div>
  )
}