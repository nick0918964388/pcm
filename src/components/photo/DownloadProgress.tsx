/**
 * Download Progress Component
 * 批次下載進度追蹤元件
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DownloadProgressItem {
  id: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  error?: string;
}

export interface BatchDownloadProgress {
  id: string;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  overallProgress: number;
  status:
    | 'preparing'
    | 'downloading'
    | 'zipping'
    | 'completed'
    | 'failed'
    | 'cancelled';
  items: DownloadProgressItem[];
  startTime: Date;
  estimatedTimeRemaining?: number;
}

interface DownloadProgressProps {
  progress: BatchDownloadProgress;
  onCancel?: () => void;
  onClose?: () => void;
  className?: string;
}

/**
 * 格式化剩餘時間
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} 秒`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)} 分鐘`;
  } else {
    return `${Math.round(seconds / 3600)} 小時`;
  }
}

/**
 * 取得狀態顯示文字
 */
function getStatusText(status: BatchDownloadProgress['status']): string {
  switch (status) {
    case 'preparing':
      return '準備中...';
    case 'downloading':
      return '下載中...';
    case 'zipping':
      return '壓縮中...';
    case 'completed':
      return '完成';
    case 'failed':
      return '失敗';
    case 'cancelled':
      return '已取消';
    default:
      return '未知狀態';
  }
}

/**
 * 取得狀態圖示
 */
function getStatusIcon(status: BatchDownloadProgress['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle className='w-4 h-4 text-green-600' />;
    case 'failed':
      return <AlertCircle className='w-4 h-4 text-red-600' />;
    case 'cancelled':
      return <X className='w-4 h-4 text-gray-600' />;
    default:
      return <Download className='w-4 h-4 text-blue-600' />;
  }
}

/**
 * 取得狀態顏色
 */
function getStatusColor(status: BatchDownloadProgress['status']): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800';
    case 'downloading':
    case 'zipping':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-yellow-100 text-yellow-800';
  }
}

export function DownloadProgress({
  progress,
  onCancel,
  onClose,
  className,
}: DownloadProgressProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const elapsedTime = Math.floor(
    (currentTime - progress.startTime.getTime()) / 1000
  );
  const canCancel =
    progress.status === 'preparing' ||
    progress.status === 'downloading' ||
    progress.status === 'zipping';
  const isCompleted =
    progress.status === 'completed' ||
    progress.status === 'failed' ||
    progress.status === 'cancelled';

  return (
    <Card className={cn('w-full max-w-2xl', className)}>
      <CardHeader className='pb-4'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-lg flex items-center'>
            {getStatusIcon(progress.status)}
            <span className='ml-2'>批次下載</span>
            <Badge className={cn('ml-2', getStatusColor(progress.status))}>
              {getStatusText(progress.status)}
            </Badge>
          </CardTitle>
          <div className='flex items-center space-x-2'>
            {canCancel && onCancel && (
              <Button variant='outline' size='sm' onClick={onCancel}>
                取消
              </Button>
            )}
            {isCompleted && onClose && (
              <Button variant='ghost' size='sm' onClick={onClose}>
                <X className='w-4 h-4' />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* 整體進度 */}
        <div className='mb-6'>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-sm font-medium'>
              整體進度: {progress.completedFiles}/{progress.totalFiles} 檔案
            </span>
            <span className='text-sm text-gray-600'>
              {Math.round(progress.overallProgress)}%
            </span>
          </div>
          <Progress value={progress.overallProgress} className='h-2' />

          {/* 統計資訊 */}
          <div className='flex items-center justify-between mt-2 text-xs text-gray-600'>
            <div className='flex items-center space-x-4'>
              <span>已完成: {progress.completedFiles}</span>
              {progress.failedFiles > 0 && (
                <span className='text-red-600'>
                  失敗: {progress.failedFiles}
                </span>
              )}
            </div>
            <div className='flex items-center space-x-4'>
              <span>已耗時: {formatTimeRemaining(elapsedTime)}</span>
              {progress.estimatedTimeRemaining && (
                <span>
                  剩餘: {formatTimeRemaining(progress.estimatedTimeRemaining)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 個別檔案進度 */}
        <div className='space-y-2 max-h-60 overflow-y-auto'>
          {progress.items.map(item => (
            <div
              key={item.id}
              className='flex items-center justify-between p-2 bg-gray-50 rounded-lg'
            >
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium text-gray-900 truncate'>
                  {item.fileName}
                </p>
                {item.status === 'downloading' && (
                  <div className='mt-1'>
                    <Progress value={item.progress} className='h-1' />
                  </div>
                )}
                {item.error && (
                  <p className='text-xs text-red-600 mt-1'>{item.error}</p>
                )}
              </div>
              <div className='flex items-center ml-2'>
                {item.status === 'completed' && (
                  <CheckCircle className='w-4 h-4 text-green-600' />
                )}
                {item.status === 'failed' && (
                  <AlertCircle className='w-4 h-4 text-red-600' />
                )}
                {item.status === 'downloading' && (
                  <span className='text-xs text-blue-600'>
                    {Math.round(item.progress)}%
                  </span>
                )}
                {item.status === 'pending' && (
                  <span className='text-xs text-gray-500'>等待中</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default DownloadProgress;
