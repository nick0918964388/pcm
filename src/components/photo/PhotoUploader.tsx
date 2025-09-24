/**
 * PhotoUploader Component
 * 照片上傳元件，支援拖拽和多檔案上傳
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePhotoStore } from '@/store/photoStore';
import { photoService } from '@/services/photoService';
import { UploadFile, UploadResult } from '@/types/photo.types';

interface PhotoUploaderProps {
  projectId: string;
  albumId?: string;
  multiple?: boolean;
  disabled?: boolean;
  maxFiles?: number;
  className?: string;
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (errors: string[]) => void;
  onUploadProgress?: (fileId: string, progress: number) => void;
}

export function PhotoUploader({
  projectId,
  albumId,
  multiple = true,
  disabled = false,
  maxFiles = 10,
  className,
  onUploadComplete,
  onUploadError,
  onUploadProgress,
}: PhotoUploaderProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    uploadQueue,
    uploadProgress,
    addToUploadQueue,
    removeFromUploadQueue,
    updateUploadProgress,
    updateUploadStatus,
  } = usePhotoStore();

  /**
   * 處理檔案上傳
   */
  const handleUpload = useCallback(
    async (files: File[]) => {
      if (disabled || files.length === 0) return;

      setValidationErrors([]);
      setIsUploading(true);

      try {
        // 驗證檔案
        const validation = photoService.validateFiles(files);
        if (!validation.isValid) {
          setValidationErrors(validation.errors);
          setIsUploading(false);
          onUploadError?.(validation.errors);
          return;
        }

        // 建立上傳檔案物件
        const uploadFiles: UploadFile[] = [];
        for (const file of files) {
          const uploadFile = await photoService.createUploadFile(
            file,
            projectId,
            albumId
          );
          uploadFiles.push(uploadFile);
          addToUploadQueue(uploadFile);
        }

        // 開始上傳
        const results = await photoService.uploadPhotos(
          uploadFiles,
          (fileId, progress) => {
            updateUploadProgress(fileId, progress);
            onUploadProgress?.(fileId, progress);
          }
        );

        // 更新上傳狀態
        results.forEach((result, index) => {
          const uploadFile = uploadFiles[index];
          if (result.success) {
            updateUploadStatus(uploadFile.id, 'completed');
          } else {
            updateUploadStatus(uploadFile.id, 'failed', result.errors?.[0]);
          }
        });

        // 處理結果
        const successResults = results.filter(r => r.success);
        const failedResults = results.filter(r => !r.success);

        if (successResults.length > 0) {
          onUploadComplete?.(successResults);
        }

        if (failedResults.length > 0) {
          const errors = failedResults.flatMap(
            r => r.errors || ['Unknown error']
          );
          setValidationErrors(errors);
          onUploadError?.(errors);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Upload failed';
        setValidationErrors([errorMessage]);
        onUploadError?.([errorMessage]);
      } finally {
        setIsUploading(false);
      }
    },
    [
      projectId,
      albumId,
      disabled,
      addToUploadQueue,
      updateUploadProgress,
      updateUploadStatus,
      onUploadComplete,
      onUploadError,
      onUploadProgress,
    ]
  );

  /**
   * 設置 Dropzone
   */
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop: handleUpload,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.heic', '.webp'],
    },
    multiple,
    maxFiles,
    disabled: disabled || isUploading,
    onDropRejected: rejectedFiles => {
      const errors = rejectedFiles.flatMap(rejection =>
        rejection.errors.map(
          error => `${rejection.file.name}: ${error.message}`
        )
      );
      setValidationErrors(errors);
      onUploadError?.(errors);
    },
  });

  /**
   * 處理檔案輸入變更
   */
  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length > 0) {
        handleUpload(files);
      }
      // 清空輸入框以允許重複選擇相同檔案
      event.target.value = '';
    },
    [handleUpload]
  );

  /**
   * 取消上傳
   */
  const handleCancelUpload = useCallback(
    (fileId: string) => {
      removeFromUploadQueue(fileId);
    },
    [removeFromUploadQueue]
  );

  /**
   * 格式化檔案大小
   */
  const formatFileSize = useCallback((bytes: number): string => {
    return photoService.formatFileSize(bytes);
  }, []);

  /**
   * 取得狀態圖示
   */
  const getStatusIcon = useCallback((status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className='w-4 h-4 text-green-600' />;
      case 'failed':
        return <AlertCircle className='w-4 h-4 text-red-600' />;
      case 'uploading':
        return <Upload className='w-4 h-4 text-blue-600 animate-pulse' />;
      default:
        return <ImageIcon className='w-4 h-4 text-gray-400' />;
    }
  }, []);

  /**
   * 取得拖拽區域樣式
   */
  const getDropzoneClassName = useCallback(() => {
    return cn(
      'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200',
      'hover:border-primary hover:bg-primary/5',
      {
        'border-primary bg-primary/10': isDragAccept,
        'border-red-500 bg-red-500/10': isDragReject,
        'border-primary bg-primary/5': isDragActive,
        'opacity-50 cursor-not-allowed': disabled || isUploading,
        'border-gray-300': !isDragActive && !isDragAccept && !isDragReject,
      },
      className
    );
  }, [
    isDragActive,
    isDragAccept,
    isDragReject,
    disabled,
    isUploading,
    className,
  ]);

  return (
    <div className='w-full space-y-4'>
      {/* 上傳區域 */}
      <div {...getRootProps({ className: getDropzoneClassName() })}>
        <input
          {...getInputProps()}
          ref={fileInputRef}
          onChange={handleFileInputChange}
        />

        <div className='flex flex-col items-center space-y-4'>
          <div className='p-4 bg-primary/10 rounded-full'>
            <Upload
              className={cn('w-8 h-8 text-primary', {
                'animate-pulse': isUploading,
              })}
            />
          </div>

          <div>
            <p className='text-lg font-medium text-gray-900'>
              {disabled || isUploading ? '上傳中...' : '點擊或拖拽照片到此區域'}
            </p>
            <p className='text-sm text-gray-500'>
              支援 JPG、PNG、HEIC 格式，單檔最大 10MB
            </p>
            {multiple && (
              <p className='text-xs text-gray-400 mt-1'>
                最多可選擇 {maxFiles} 個檔案
              </p>
            )}
          </div>

          <Button
            type='button'
            variant='outline'
            disabled={disabled || isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className='w-4 h-4 mr-2' />
            選擇檔案
          </Button>
        </div>
      </div>

      {/* 驗證錯誤 */}
      {validationErrors.length > 0 && (
        <Card className='border-red-200 bg-red-50'>
          <CardHeader>
            <CardTitle className='text-sm text-red-800 flex items-center'>
              <AlertCircle className='w-4 h-4 mr-2' />
              上傳錯誤
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className='text-sm text-red-700 space-y-1'>
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 上傳佇列 */}
      {uploadQueue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='text-sm'>
              上傳佇列 ({uploadQueue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {uploadQueue.map(uploadFile => {
                const progress = uploadProgress[uploadFile.id] || 0;
                const isCompleted = uploadFile.status === 'completed';
                const isFailed = uploadFile.status === 'failed';

                return (
                  <div
                    key={uploadFile.id}
                    className='flex items-center space-x-3'
                  >
                    {getStatusIcon(uploadFile.status)}

                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between'>
                        <p className='text-sm font-medium text-gray-900 truncate'>
                          {uploadFile.file.name}
                        </p>
                        <div className='flex items-center space-x-2'>
                          <Badge
                            variant={
                              isCompleted
                                ? 'default'
                                : isFailed
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {isCompleted
                              ? '上傳完成'
                              : isFailed
                                ? '上傳失敗'
                                : `${progress}%`}
                          </Badge>

                          {!isCompleted && (
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleCancelUpload(uploadFile.id)}
                            >
                              <X className='w-4 h-4' />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className='flex items-center justify-between text-xs text-gray-500 mt-1'>
                        <span>{formatFileSize(uploadFile.file.size)}</span>
                        {uploadFile.error && (
                          <span className='text-red-600'>
                            {uploadFile.error}
                          </span>
                        )}
                      </div>

                      {!isCompleted && !isFailed && (
                        <Progress value={progress} className='mt-2 h-1' />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
