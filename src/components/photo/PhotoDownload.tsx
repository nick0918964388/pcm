/**
 * PhotoDownload - 照片下載元件
 * 提供照片下載功能，包含解析度選擇、進度顯示和權限控制
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Download, X, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { cn } from '../../lib/utils';
import { PhotoDownloadService } from '../../services/photoDownloadService';
import type {
  Photo,
  DownloadOptions,
  PhotoResolution,
  DownloadProgress,
} from '../../types/photo.types';

interface PhotoDownloadProps {
  photo: Photo;
  onDownloadStart: (photoId: string, options: DownloadOptions) => void;
  onDownloadComplete: (photoId: string, fileName: string) => void;
  onDownloadError: (photoId: string, error: string) => void;
  isDownloading?: boolean;
  downloadProgress?: number;
  compact?: boolean;
  showFileSize?: boolean;
  enableShortcuts?: boolean;
  className?: string;
}

const PhotoDownload: React.FC<PhotoDownloadProps> = ({
  photo,
  onDownloadStart,
  onDownloadComplete,
  onDownloadError,
  isDownloading = false,
  downloadProgress = 0,
  compact = false,
  showFileSize = false,
  enableShortcuts = false,
  className,
}) => {
  const [service] = useState(() => new PhotoDownloadService());
  const [downloadId, setDownloadId] = useState<string | null>(null);

  // 處理下載
  const handleDownload = useCallback(
    async (resolution: PhotoResolution) => {
      try {
        // 生成下載ID
        const newDownloadId = `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setDownloadId(newDownloadId);

        const options: DownloadOptions = {
          resolution,
          includeMetadata: false,
          watermark: false,
        };

        // 驗證權限 (假設從 context 或 props 取得 userId)
        const userId = 'current-user'; // TODO: 從認證 context 取得
        const hasPermission = await service.validateDownloadPermissions(
          photo.id,
          userId
        );

        if (!hasPermission) {
          onDownloadError(photo.id, '權限不足，無法下載此照片');
          return;
        }

        // 開始下載追蹤
        const fileName = service.generateDownloadFileName(
          photo.fileName,
          resolution
        );
        service.startDownloadTracking(newDownloadId, photo.id, fileName);

        // 觸發下載開始事件
        onDownloadStart(photo.id, options);

        // 執行下載
        const result = await service.downloadPhoto(photo.id, options);

        if (result.success) {
          // 觸發實際下載
          service.triggerDownload(result.downloadUrl, result.fileName);

          // 更新進度為完成
          service.updateDownloadProgress(newDownloadId, 100);

          onDownloadComplete(photo.id, result.fileName);
        } else {
          onDownloadError(photo.id, result.error || '下載失敗');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '下載失敗';
        onDownloadError(photo.id, errorMessage);
      } finally {
        setDownloadId(null);
      }
    },
    [photo, service, onDownloadStart, onDownloadComplete, onDownloadError]
  );

  // 取消下載
  const handleCancel = useCallback(() => {
    if (downloadId) {
      service.cancelDownload(downloadId);
      setDownloadId(null);
    }
  }, [downloadId, service]);

  // 快捷鍵支援
  useEffect(() => {
    if (!enableShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();
        handleDownload('original');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableShortcuts, handleDownload]);

  // 如果正在下載，顯示進度
  if (isDownloading) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className='flex-1'>
          <div className='flex items-center justify-between mb-1'>
            <span className='text-sm text-muted-foreground'>下載中...</span>
            <span className='text-sm font-medium'>{downloadProgress}%</span>
          </div>
          <Progress value={downloadProgress} className='h-2' />
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={handleCancel}
          className='px-2'
        >
          <X className='h-4 w-4' />
          {!compact && <span className='ml-1'>取消</span>}
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size={compact ? 'sm' : 'default'}
          className={cn('flex items-center', className)}
        >
          <Download className='h-4 w-4' data-testid='download-icon' />
          {!compact && <span className='ml-2'>下載</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        <div className='px-2 py-1 text-sm font-medium text-muted-foreground border-b mb-1'>
          選擇解析度
        </div>
        {(
          [
            'thumbnail',
            'small',
            'medium',
            'large',
            'original',
          ] as PhotoResolution[]
        ).map(resolution => (
          <DropdownMenuItem
            key={resolution}
            onClick={() => handleDownload(resolution)}
            className='flex items-center justify-between'
          >
            <span>{service.getResolutionDisplayName(resolution)}</span>
            {resolution === 'original' && showFileSize && (
              <span className='text-xs text-muted-foreground'>
                {service.formatFileSize(photo.fileSize)}
              </span>
            )}
          </DropdownMenuItem>
        ))}
        {enableShortcuts && (
          <>
            <div className='px-2 py-1 text-xs text-muted-foreground border-t mt-1'>
              快捷鍵: Ctrl+D (原圖)
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PhotoDownload;
