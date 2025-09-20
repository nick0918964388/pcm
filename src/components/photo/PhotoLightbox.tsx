/**
 * PhotoLightbox Component
 * 照片燈箱預覽元件，基於 yet-another-react-lightbox
 */

'use client'

import { useCallback, useMemo } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import { Download, Share2, Info, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Photo } from '@/types/photo.types'
import { photoService } from '@/services/photoService'
import { usePhotoStore } from '@/store/photoStore'
import { cn } from '@/lib/utils'

// Lightbox 樣式
import 'yet-another-react-lightbox/styles.css'

interface PhotoLightboxProps {
  photos: Photo[]
  open: boolean
  index: number
  onClose: () => void
  onIndexChange?: (index: number) => void
  className?: string
}

export function PhotoLightbox({
  photos,
  open,
  index,
  onClose,
  onIndexChange,
  className
}: PhotoLightboxProps) {
  const { setLightboxIndex } = usePhotoStore()

  /**
   * 轉換照片資料為 lightbox 格式
   */
  const slides = useMemo(() => {
    return photos.map(photo => ({
      src: photo.originalUrl,
      alt: photo.fileName,
      width: photo.width,
      height: photo.height,
      // 附加照片資訊
      photo
    }))
  }, [photos])

  /**
   * 取得當前照片
   */
  const currentPhoto = useMemo(() => {
    return photos[index]
  }, [photos, index])

  /**
   * 處理索引變更
   */
  const handleIndexChange = useCallback((newIndex: number) => {
    setLightboxIndex(newIndex)
    onIndexChange?.(newIndex)
  }, [setLightboxIndex, onIndexChange])

  /**
   * 下載當前照片
   */
  const handleDownload = useCallback(async () => {
    if (currentPhoto) {
      try {
        await photoService.downloadPhoto(currentPhoto, 'original')
      } catch (error) {
        console.error('Download failed:', error)
      }
    }
  }, [currentPhoto])

  /**
   * 分享照片
   */
  const handleShare = useCallback(async () => {
    if (currentPhoto && navigator.share) {
      try {
        await navigator.share({
          title: currentPhoto.fileName,
          text: `查看工程照片: ${currentPhoto.fileName}`,
          url: currentPhoto.originalUrl
        })
      } catch (error) {
        // 如果原生分享失敗，複製到剪貼簿
        try {
          await navigator.clipboard.writeText(currentPhoto.originalUrl)
          // TODO: 顯示複製成功提示
        } catch (clipboardError) {
          console.error('Share and copy failed:', error, clipboardError)
        }
      }
    } else if (currentPhoto) {
      // 備用方案：複製連結
      try {
        await navigator.clipboard.writeText(currentPhoto.originalUrl)
        // TODO: 顯示複製成功提示
      } catch (error) {
        console.error('Copy failed:', error)
      }
    }
  }, [currentPhoto])

  /**
   * 格式化檔案大小
   */
  const formatFileSize = useCallback((bytes: number): string => {
    return photoService.formatFileSize(bytes)
  }, [])

  /**
   * 格式化日期
   */
  const formatDate = useCallback((date: Date): string => {
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }, [])

  /**
   * 自定義工具列
   */
  const renderToolbar = useCallback(() => {
    if (!currentPhoto) return null

    return (
      <div className="fixed top-4 right-4 z-50 flex items-center space-x-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownload}
          className="bg-black/20 backdrop-blur-sm text-white hover:bg-black/40"
        >
          <Download className="w-4 h-4" />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleShare}
          className="bg-black/20 backdrop-blur-sm text-white hover:bg-black/40"
        >
          <Share2 className="w-4 h-4" />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="bg-black/20 backdrop-blur-sm text-white hover:bg-black/40"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    )
  }, [currentPhoto, handleDownload, handleShare, onClose])

  /**
   * 自定義照片資訊面板
   */
  const renderPhotoInfo = useCallback(() => {
    if (!currentPhoto) return null

    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
        <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white">
          {/* 檔案基本資訊 */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-lg truncate mb-1">
                {currentPhoto.fileName}
              </h3>
              <p className="text-sm text-gray-300">
                {formatDate(new Date(currentPhoto.uploadedAt))}
              </p>
            </div>
            <Info className="w-5 h-5 text-gray-300 flex-shrink-0 ml-2" />
          </div>

          <Separator className="bg-gray-600 mb-3" />

          {/* 檔案詳細資訊 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">檔案大小</span>
              <p className="text-white">{formatFileSize(currentPhoto.fileSize)}</p>
            </div>
            <div>
              <span className="text-gray-400">檔案類型</span>
              <p className="text-white">{currentPhoto.mimeType}</p>
            </div>
            <div>
              <span className="text-gray-400">圖片尺寸</span>
              <p className="text-white">{currentPhoto.width} × {currentPhoto.height}</p>
            </div>
            <div>
              <span className="text-gray-400">上傳者</span>
              <p className="text-white">{currentPhoto.uploadedBy}</p>
            </div>
          </div>

          {/* 標籤 */}
          {currentPhoto.metadata.tags && currentPhoto.metadata.tags.length > 0 && (
            <>
              <Separator className="bg-gray-600 my-3" />
              <div>
                <span className="text-gray-400 text-sm block mb-2">標籤</span>
                <div className="flex flex-wrap gap-1">
                  {currentPhoto.metadata.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 描述 */}
          {currentPhoto.metadata.description && (
            <>
              <Separator className="bg-gray-600 my-3" />
              <div>
                <span className="text-gray-400 text-sm block mb-2">描述</span>
                <p className="text-white text-sm">{currentPhoto.metadata.description}</p>
              </div>
            </>
          )}

          {/* GPS 資訊 */}
          {currentPhoto.metadata.location && (
            <>
              <Separator className="bg-gray-600 my-3" />
              <div>
                <span className="text-gray-400 text-sm block mb-2">位置資訊</span>
                <p className="text-white text-sm">
                  緯度: {currentPhoto.metadata.location.latitude.toFixed(6)}<br />
                  經度: {currentPhoto.metadata.location.longitude.toFixed(6)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }, [currentPhoto, formatDate, formatFileSize])

  if (!open || photos.length === 0) return null

  return (
    <div className={cn("relative", className)}>
      <Lightbox
        open={open}
        close={onClose}
        index={index}
        slides={slides}
        on={{
          view: ({ index }) => handleIndexChange(index)
        }}
        carousel={{
          finite: photos.length <= 1,
          preload: 2
        }}
        animation={{
          fade: 300,
          swipe: 500
        }}
        controller={{
          closeOnPullDown: true,
          closeOnBackdropClick: true
        }}
        render={{
          buttonPrev: photos.length <= 1 ? () => null : undefined,
          buttonNext: photos.length <= 1 ? () => null : undefined,
        }}
        styles={{
          container: {
            backgroundColor: "rgba(0, 0, 0, 0.9)"
          },
          slide: {
            filter: "drop-shadow(0 0 20px rgba(0, 0, 0, 0.5))"
          }
        }}
      />

      {/* 自定義 UI 覆蓋層 */}
      {open && (
        <>
          {renderToolbar()}
          {renderPhotoInfo()}
        </>
      )}
    </div>
  )
}