/**
 * PhotoGrid Component
 * 照片網格顯示元件，支援虛擬滾動和懶載入
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
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

interface PhotoGridProps {
  photos: Photo[]
  selectedPhotos?: string[]
  loading?: boolean
  error?: string | null
  onPhotoClick?: (photo: Photo, index: number) => void
  onPhotoSelect?: (photoId: string, selected: boolean) => void
  onPhotoDownload?: (photo: Photo) => void
  onPhotoDelete?: (photo: Photo) => void
  className?: string
  columnCount?: number
  itemSize?: number
  height?: number
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

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
    setImageError(false)
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
      selected && "ring-2 ring-primary"
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
  height = 600
}: PhotoGridProps) {
  const { selectAllPhotos, clearSelection } = usePhotoStore()

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

  // Simple responsive grid columns
  const getGridColumns = useCallback(() => {
    if (columnCount <= 2) return 'grid-cols-1 sm:grid-cols-2'
    if (columnCount === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  }, [columnCount])

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
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                下載選取項目
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 簡單網格實作 */}
      <div
        className={cn("grid gap-4 auto-rows-max", getGridColumns())}
        style={{ maxHeight: height, overflow: 'auto' }}
      >
        {photos.map((photo, index) => (
          <PhotoItem
            key={photo.id}
            photo={photo}
            selected={selectedPhotos.includes(photo.id)}
            onSelect={onPhotoSelect}
            onClick={onPhotoClick}
            onDownload={onPhotoDownload}
            onDelete={onPhotoDelete}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}