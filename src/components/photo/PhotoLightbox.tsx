/**
 * PhotoLightbox Component
 * 照片燈箱預覽元件，基於 yet-another-react-lightbox
 */

'use client';

import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import {
  Download,
  Share2,
  Info,
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid3X3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Photo } from '@/types/photo.types';
import { photoService } from '@/services/photoService';
import { usePhotoStore } from '@/store/photoStore';
import { cn } from '@/lib/utils';

// Lightbox 樣式
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

interface PhotoLightboxProps {
  photos: Photo[];
  open: boolean;
  index: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  className?: string;
  // 新增功能選項
  enableZoom?: boolean;
  enableFullscreen?: boolean;
  enableThumbnails?: boolean;
  enableKeyboardShortcuts?: boolean;
  enableTouchGestures?: boolean;
}

export function PhotoLightbox({
  photos,
  open,
  index,
  onClose,
  onIndexChange,
  className,
  enableZoom = true,
  enableFullscreen = true,
  enableThumbnails = true,
  enableKeyboardShortcuts = true,
  enableTouchGestures = true,
}: PhotoLightboxProps) {
  const { setLightboxIndex } = usePhotoStore();
  const [isPreloading, setIsPreloading] = useState(false);
  const preloadedImages = useRef(new Set<string>());

  /**
   * 預載相鄰照片以提升性能
   */
  const preloadAdjacentPhotos = useCallback(() => {
    if (!open || photos.length === 0) return;

    setIsPreloading(true);
    const preloadPromises: Promise<void>[] = [];

    // 預載當前、上一張和下一張照片
    const indicesToPreload = [
      index,
      Math.max(0, index - 1),
      Math.min(photos.length - 1, index + 1),
      Math.max(0, index - 2),
      Math.min(photos.length - 1, index + 2),
    ];

    indicesToPreload.forEach(idx => {
      const photo = photos[idx];
      if (photo && !preloadedImages.current.has(photo.originalUrl)) {
        const promise = new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            preloadedImages.current.add(photo.originalUrl);
            resolve();
          };
          img.onerror = () =>
            reject(new Error(`Failed to preload ${photo.fileName}`));
          img.src = photo.originalUrl;
        });
        preloadPromises.push(promise);
      }
    });

    Promise.allSettled(preloadPromises).finally(() => {
      setIsPreloading(false);
    });
  }, [open, photos, index]);

  /**
   * 預載相鄰照片當索引改變時
   */
  useEffect(() => {
    if (open) {
      const timer = setTimeout(preloadAdjacentPhotos, 100);
      return () => clearTimeout(timer);
    }
  }, [open, index, preloadAdjacentPhotos]);

  /**
   * 轉換照片資料為 lightbox 格式
   */
  const slides = useMemo(() => {
    return photos.map(photo => ({
      src: photo.originalUrl,
      alt: photo.fileName,
      width: photo.width,
      height: photo.height,
      // 縮圖支援
      thumbnail: enableThumbnails ? photo.thumbnailUrl : undefined,
      // 附加照片資訊
      photo,
    }));
  }, [photos, enableThumbnails]);

  /**
   * 取得當前照片
   */
  const currentPhoto = useMemo(() => {
    return photos[index];
  }, [photos, index]);

  /**
   * 處理索引變更
   */
  const handleIndexChange = useCallback(
    (newIndex: number) => {
      setLightboxIndex(newIndex);
      onIndexChange?.(newIndex);
    },
    [setLightboxIndex, onIndexChange]
  );

  /**
   * 下載當前照片
   */
  const handleDownload = useCallback(async () => {
    if (currentPhoto) {
      try {
        await photoService.downloadPhoto(currentPhoto, 'original');
      } catch (error) {
        console.error('Download failed:', error);
      }
    }
  }, [currentPhoto]);

  /**
   * 分享照片
   */
  const handleShare = useCallback(async () => {
    if (currentPhoto && navigator.share) {
      try {
        await navigator.share({
          title: currentPhoto.fileName,
          text: `查看工程照片: ${currentPhoto.fileName}`,
          url: currentPhoto.originalUrl,
        });
      } catch (error) {
        // 如果原生分享失敗，複製到剪貼簿
        try {
          await navigator.clipboard.writeText(currentPhoto.originalUrl);
          // TODO: 顯示複製成功提示
        } catch (clipboardError) {
          console.error('Share and copy failed:', error, clipboardError);
        }
      }
    } else if (currentPhoto) {
      // 備用方案：複製連結
      try {
        await navigator.clipboard.writeText(currentPhoto.originalUrl);
        // TODO: 顯示複製成功提示
      } catch (error) {
        console.error('Copy failed:', error);
      }
    }
  }, [currentPhoto]);

  /**
   * 格式化檔案大小
   */
  const formatFileSize = useCallback((bytes: number): string => {
    return photoService.formatFileSize(bytes);
  }, []);

  /**
   * 格式化日期
   */
  const formatDate = useCallback((date: Date): string => {
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }, []);

  /**
   * 自定義工具列
   */
  const renderToolbar = useCallback(() => {
    if (!currentPhoto) return null;

    return (
      <div className='fixed top-4 right-4 z-50 flex items-center space-x-2'>
        {enableZoom && (
          <>
            <Button
              variant='secondary'
              size='sm'
              title='放大 (Z)'
              className='bg-black/20 backdrop-blur-sm text-white hover:bg-black/40'
            >
              <ZoomIn className='w-4 h-4' />
            </Button>
            <Button
              variant='secondary'
              size='sm'
              title='縮小 (Shift+Z)'
              className='bg-black/20 backdrop-blur-sm text-white hover:bg-black/40'
            >
              <ZoomOut className='w-4 h-4' />
            </Button>
          </>
        )}

        {enableFullscreen && (
          <Button
            variant='secondary'
            size='sm'
            title='全螢幕 (F)'
            className='bg-black/20 backdrop-blur-sm text-white hover:bg-black/40'
          >
            <Maximize className='w-4 h-4' />
          </Button>
        )}

        {enableThumbnails && (
          <Button
            variant='secondary'
            size='sm'
            title='縮圖 (T)'
            className='bg-black/20 backdrop-blur-sm text-white hover:bg-black/40'
          >
            <Grid3X3 className='w-4 h-4' />
          </Button>
        )}

        <Button
          variant='secondary'
          size='sm'
          title='下載 (D)'
          onClick={handleDownload}
          className='bg-black/20 backdrop-blur-sm text-white hover:bg-black/40'
        >
          <Download className='w-4 h-4' />
        </Button>

        <Button
          variant='secondary'
          size='sm'
          title='分享 (S)'
          onClick={handleShare}
          className='bg-black/20 backdrop-blur-sm text-white hover:bg-black/40'
        >
          <Share2 className='w-4 h-4' />
        </Button>

        <Button
          variant='secondary'
          size='sm'
          title='關閉 (ESC)'
          onClick={onClose}
          className='bg-black/20 backdrop-blur-sm text-white hover:bg-black/40'
        >
          <X className='w-4 h-4' />
        </Button>
      </div>
    );
  }, [
    currentPhoto,
    handleDownload,
    handleShare,
    onClose,
    enableZoom,
    enableFullscreen,
    enableThumbnails,
  ]);

  /**
   * 自定義照片資訊面板
   */
  const renderPhotoInfo = useCallback(() => {
    if (!currentPhoto) return null;

    return (
      <div className='fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto'>
        <div className='bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white'>
          {/* 檔案基本資訊 */}
          <div className='flex items-start justify-between mb-3'>
            <div className='flex-1 min-w-0'>
              <h3 className='font-medium text-lg truncate mb-1'>
                {currentPhoto.fileName}
              </h3>
              <p className='text-sm text-gray-300'>
                {formatDate(new Date(currentPhoto.uploadedAt))}
              </p>
            </div>
            <Info className='w-5 h-5 text-gray-300 flex-shrink-0 ml-2' />
          </div>

          <Separator className='bg-gray-600 mb-3' />

          {/* 檔案詳細資訊 */}
          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div>
              <span className='text-gray-400'>檔案大小</span>
              <p className='text-white'>
                {formatFileSize(currentPhoto.fileSize)}
              </p>
            </div>
            <div>
              <span className='text-gray-400'>檔案類型</span>
              <p className='text-white'>{currentPhoto.mimeType}</p>
            </div>
            <div>
              <span className='text-gray-400'>圖片尺寸</span>
              <p className='text-white'>
                {currentPhoto.width} × {currentPhoto.height}
              </p>
            </div>
            <div>
              <span className='text-gray-400'>上傳者</span>
              <p className='text-white'>{currentPhoto.uploadedBy}</p>
            </div>
          </div>

          {/* 鍵盤快捷鍵提示 */}
          {enableKeyboardShortcuts && (
            <>
              <Separator className='bg-gray-600 my-3' />
              <div>
                <span className='text-gray-400 text-sm block mb-2'>
                  鍵盤快捷鍵
                </span>
                <div className='grid grid-cols-2 gap-2 text-xs text-gray-300'>
                  <div>← / → 切換照片</div>
                  <div>ESC 關閉</div>
                  <div>F 全螢幕</div>
                  <div>D 下載</div>
                  <div>S 分享</div>
                  <div>Home/End 首末張</div>
                </div>
              </div>
            </>
          )}

          {/* 標籤 */}
          {currentPhoto.metadata.tags &&
            currentPhoto.metadata.tags.length > 0 && (
              <>
                <Separator className='bg-gray-600 my-3' />
                <div>
                  <span className='text-gray-400 text-sm block mb-2'>標籤</span>
                  <div className='flex flex-wrap gap-1'>
                    {currentPhoto.metadata.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant='secondary'
                        className='text-xs'
                      >
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
              <Separator className='bg-gray-600 my-3' />
              <div>
                <span className='text-gray-400 text-sm block mb-2'>描述</span>
                <p className='text-white text-sm'>
                  {currentPhoto.metadata.description}
                </p>
              </div>
            </>
          )}

          {/* GPS 資訊 */}
          {currentPhoto.metadata.location && (
            <>
              <Separator className='bg-gray-600 my-3' />
              <div>
                <span className='text-gray-400 text-sm block mb-2'>
                  位置資訊
                </span>
                <p className='text-white text-sm'>
                  緯度: {currentPhoto.metadata.location.latitude.toFixed(6)}
                  <br />
                  經度: {currentPhoto.metadata.location.longitude.toFixed(6)}
                </p>
              </div>
            </>
          )}

          {/* 照片索引資訊 */}
          <>
            <Separator className='bg-gray-600 my-3' />
            <div className='flex justify-between items-center text-xs text-gray-400'>
              <span>
                {index + 1} / {photos.length}
              </span>
              <span>照片 ID: {currentPhoto.id}</span>
              {isPreloading && (
                <span className='text-blue-400 animate-pulse'>預載中...</span>
              )}
            </div>
          </>
        </div>
      </div>
    );
  }, [
    currentPhoto,
    formatDate,
    formatFileSize,
    enableKeyboardShortcuts,
    index,
    photos.length,
  ]);

  /**
   * 鍵盤快捷鍵支援
   */
  useEffect(() => {
    if (!open || !enableKeyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (index > 0) {
            handleIndexChange(index - 1);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (index > 0) {
            handleIndexChange(index - 1);
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (index < photos.length - 1) {
            handleIndexChange(index + 1);
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (index < photos.length - 1) {
            handleIndexChange(index + 1);
          }
          break;
        case 'Home':
          event.preventDefault();
          handleIndexChange(0);
          break;
        case 'End':
          event.preventDefault();
          handleIndexChange(photos.length - 1);
          break;
        case 'f':
        case 'F':
          if (enableFullscreen) {
            event.preventDefault();
            // 觸發全螢幕切換（通過 CSS 類別或 API）
          }
          break;
        case 'd':
        case 'D':
          event.preventDefault();
          handleDownload();
          break;
        case 's':
        case 'S':
          event.preventDefault();
          handleShare();
          break;
        case ' ':
          event.preventDefault();
          // 暫停/播放幻燈片（如果實作）
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    open,
    enableKeyboardShortcuts,
    index,
    photos.length,
    handleIndexChange,
    handleDownload,
    handleShare,
  ]);

  if (!open || photos.length === 0) return null;

  return (
    <div className={cn('relative', className)}>
      <Lightbox
        open={open}
        close={onClose}
        index={index}
        slides={slides}
        plugins={[
          ...(enableZoom ? [Zoom] : []),
          ...(enableFullscreen ? [Fullscreen] : []),
          ...(enableThumbnails ? [Thumbnails] : []),
        ]}
        zoom={
          enableZoom
            ? {
                maxZoomPixelRatio: 3,
                zoomInMultiplier: 2,
                doubleTapDelay: 300,
                doubleClickDelay: 300,
                doubleClickMaxStops: 2,
                keyboardMoveDistance: 50,
                wheelZoomDistanceFactor: 100,
                pinchZoomDistanceFactor: 100,
                scrollToZoom: true,
              }
            : undefined
        }
        fullscreen={
          enableFullscreen
            ? {
                auto: false,
              }
            : undefined
        }
        thumbnails={
          enableThumbnails
            ? {
                position: 'bottom',
                width: 120,
                height: 80,
                border: 1,
                borderRadius: 4,
                padding: 4,
                gap: 16,
                showToggle: true,
              }
            : undefined
        }
        on={{
          view: ({ index }) => handleIndexChange(index),
        }}
        carousel={{
          finite: photos.length <= 1,
          preload: 3,
          spacing: '12px',
          imageFit: 'contain',
          padding: '16px',
        }}
        animation={{
          fade: 300,
          swipe: enableTouchGestures ? 500 : 0,
        }}
        controller={{
          closeOnPullDown: enableTouchGestures,
          closeOnBackdropClick: true,
          touchAction: enableTouchGestures ? 'pan-y' : 'none',
          aria: {
            closeButton: '關閉燈箱',
            nextButton: '下一張照片',
            prevButton: '上一張照片',
          },
        }}
        render={{
          buttonPrev: photos.length <= 1 ? () => null : undefined,
          buttonNext: photos.length <= 1 ? () => null : undefined,
        }}
        noScroll={{
          disabled: false,
        }}
        styles={{
          container: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(2px)',
          },
          slide: {
            filter: 'drop-shadow(0 0 20px rgba(0, 0, 0, 0.5))',
          },
          navigationPrev: {
            color: 'white',
            filter: 'drop-shadow(0 0 8px rgba(0, 0, 0, 0.8))',
          },
          navigationNext: {
            color: 'white',
            filter: 'drop-shadow(0 0 8px rgba(0, 0, 0, 0.8))',
          },
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
  );
}
