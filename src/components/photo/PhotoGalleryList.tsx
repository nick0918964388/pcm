/**
 * PhotoGalleryList Component
 * 專案相簿列表元件，支援相簿切換與管理
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  FolderOpen,
  Plus,
  MoreHorizontal,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Album, UserPermissions } from '@/types/photo.types';

interface PhotoGalleryListProps {
  albums: Album[];
  projectId: string;
  selectedAlbum: string | null;
  loading?: boolean;
  error?: string | null;
  userPermissions?: UserPermissions;
  onAlbumSelect: (albumId: string | null) => void;
  onAlbumCreate?: () => void;
  onAlbumDelete?: (albumId: string) => void;
  className?: string;
}

interface AlbumItemProps {
  album: Album;
  isSelected: boolean;
  canDelete: boolean;
  onSelect: (albumId: string) => void;
  onDelete?: (albumId: string) => void;
}

/**
 * 相簿封面元件
 */
function AlbumCover({ album }: { album: Album }) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  if (!album.coverPhotoId || imageError) {
    return (
      <FolderOpen
        className='w-4 h-4 mr-2 flex-shrink-0'
        data-testid='album-folder-icon'
      />
    );
  }

  return (
    <img
      src={`/api/photos/${album.coverPhotoId}/thumbnail`}
      alt={`${album.name} 封面`}
      className='w-4 h-4 mr-2 flex-shrink-0 rounded object-cover'
      onError={handleImageError}
      data-testid='album-cover-image'
    />
  );
}

/**
 * 單一相簿項目元件
 */
function AlbumItem({
  album,
  isSelected,
  canDelete,
  onSelect,
  onDelete,
}: AlbumItemProps) {
  const handleClick = useCallback(() => {
    onSelect(album.id);
  }, [album.id, onSelect]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onDelete && confirm(`確定要刪除相簿「${album.name}」嗎？`)) {
        onDelete(album.id);
      }
    },
    [album.id, album.name, onDelete]
  );

  return (
    <li>
      <div
        className={cn(
          'flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer group',
          isSelected
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-gray-100'
        )}
      >
        <Button
          variant='ghost'
          size='sm'
          className={cn(
            'flex-1 justify-start h-auto p-0',
            isSelected &&
              'text-primary-foreground hover:text-primary-foreground'
          )}
          onClick={handleClick}
          aria-current={isSelected ? 'page' : undefined}
        >
          <AlbumCover album={album} />
          <span className='truncate mr-2'>{album.name}</span>
          <Badge
            variant={isSelected ? 'secondary' : 'secondary'}
            className={cn(
              'ml-auto',
              isSelected && 'bg-primary-foreground/20 text-primary-foreground'
            )}
          >
            {album.photoCount}
          </Badge>
        </Button>

        {onDelete && canDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className={cn(
                  'opacity-0 group-hover:opacity-100 p-1 h-auto',
                  isSelected &&
                    'text-primary-foreground hover:text-primary-foreground'
                )}
                data-testid='album-delete-button'
              >
                <MoreHorizontal className='w-4 h-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleDelete} className='text-red-600'>
                <Trash2 className='w-4 h-4 mr-2' />
                刪除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </li>
  );
}

/**
 * 載入骨架元件
 */
function LoadingSkeleton() {
  return (
    <div data-testid='album-list-loading' className='space-y-2'>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className='flex items-center p-2 space-x-2'>
          <div className='w-4 h-4 bg-gray-200 rounded animate-pulse' />
          <div className='flex-1 h-4 bg-gray-200 rounded animate-pulse' />
          <div className='w-8 h-4 bg-gray-200 rounded animate-pulse' />
        </div>
      ))}
    </div>
  );
}

/**
 * 空狀態元件
 */
function EmptyState() {
  return (
    <div className='text-center py-6 text-gray-500'>
      <FolderOpen className='w-8 h-8 mx-auto mb-2 text-gray-400' />
      <p className='text-sm font-medium'>目前沒有相簿</p>
      <p className='text-xs'>點擊上方按鈕建立第一個相簿</p>
    </div>
  );
}

/**
 * 權限提示元件
 */
function NoPermissionState() {
  return (
    <div className='text-center py-6 text-gray-500'>
      <FolderOpen className='w-8 h-8 mx-auto mb-2 text-gray-400' />
      <p className='text-sm font-medium'>您沒有相簿的檢視權限</p>
      <p className='text-xs'>請聯絡管理員申請存取權限</p>
    </div>
  );
}

/**
 * 錯誤狀態元件
 */
function ErrorState({ error }: { error: string }) {
  return (
    <div className='text-center py-6 text-red-600'>
      <p className='text-sm'>{error}</p>
    </div>
  );
}

/**
 * PhotoGalleryList 主元件
 */
export function PhotoGalleryList({
  albums,
  projectId,
  selectedAlbum,
  loading = false,
  error = null,
  userPermissions,
  onAlbumSelect,
  onAlbumCreate,
  onAlbumDelete,
  className,
}: PhotoGalleryListProps) {
  // 根據權限過濾相簿
  const filteredAlbums = useMemo(() => {
    if (!userPermissions) {
      return albums;
    }
    return albums.filter(album => userPermissions.canView.includes(album.id));
  }, [albums, userPermissions]);

  // 計算總照片數
  const totalPhotos = useMemo(() => {
    return filteredAlbums.reduce((total, album) => total + album.photoCount, 0);
  }, [filteredAlbums]);

  // 處理"所有照片"點擊
  const handleAllPhotosClick = useCallback(() => {
    onAlbumSelect(null);
  }, [onAlbumSelect]);

  // 處理相簿選擇
  const handleAlbumSelect = useCallback(
    (albumId: string) => {
      onAlbumSelect(albumId);
    },
    [onAlbumSelect]
  );

  // 檢查是否有權限相關的配置
  const hasPermissions = userPermissions !== undefined;
  const noViewPermissions =
    hasPermissions && userPermissions.canView.length === 0;

  // 檢查螢幕大小（簡化版）
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <Card className={className}>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-sm flex items-center'>
            <FolderOpen className='w-4 h-4 mr-2' />
            專案相簿
          </CardTitle>
          {onAlbumCreate && (
            <Button variant='ghost' size='sm' onClick={onAlbumCreate}>
              <Plus className='w-4 h-4' />
              <span className='sr-only md:not-sr-only md:ml-1'>新增相簿</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className='p-3'>
        <div
          data-testid='album-list-container'
          className={cn('space-y-2', isMobile && 'mobile')}
        >
          {/* 所有照片選項 */}
          <Button
            variant={!selectedAlbum ? 'default' : 'ghost'}
            size='sm'
            className='w-full justify-start'
            onClick={handleAllPhotosClick}
            aria-current={!selectedAlbum ? 'page' : undefined}
          >
            <ImageIcon className='w-4 h-4 mr-2' />
            所有照片
            <Badge variant='secondary' className='ml-auto'>
              {totalPhotos}
            </Badge>
          </Button>

          {/* 錯誤狀態 */}
          {error && <ErrorState error={error} />}

          {/* 載入狀態 */}
          {loading && <LoadingSkeleton />}

          {/* 相簿列表 */}
          {!loading && !error && (
            <>
              {noViewPermissions ? (
                <NoPermissionState />
              ) : filteredAlbums.length > 0 ? (
                <ul role='list' aria-label='專案相簿列表' className='space-y-1'>
                  {filteredAlbums.map(album => (
                    <AlbumItem
                      key={album.id}
                      album={album}
                      isSelected={selectedAlbum === album.id}
                      canDelete={
                        userPermissions?.canDelete.includes(album.id) ?? true
                      }
                      onSelect={handleAlbumSelect}
                      onDelete={onAlbumDelete}
                    />
                  ))}
                </ul>
              ) : (
                <EmptyState />
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
