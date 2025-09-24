/**
 * iPhoto 2.0 Photo Browse Page
 *
 * TDD GREEN Phase - Minimal implementation to pass tests
 * Photo browsing interface with search, filter, and management capabilities
 *
 * Requirements covered:
 * - 4.3: Photo browsing with grid and list views
 * - 2.3-2.5: Photo management operations (edit, tag, delete)
 * - 6.4: Photo search and filtering system
 *
 * @version 1.0.0
 * @date 2025-01-24
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Download,
  Edit,
  Trash2,
  Tag,
  MoreVertical,
  Image,
  Calendar,
  User,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProjectAlbums } from '@/hooks/useProjectAlbums';
import { useProjectPhotos, Photo } from '@/hooks/useProjectPhotos';
import { useProjectScopeStore } from '@/store/projectScopeStore';


export default function BrowsePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const { user, isAuthenticated } = useAuth();
  const { albums } = useProjectAlbums();
  const { currentProject } = useProjectScopeStore();

  // Use the real photos hook instead of mock data
  const {
    photos,
    filteredPhotos,
    loading: photosLoading,
    error: photosError,
    totalCount,
    filters,
    setFilters,
    refetch,
    deletePhoto,
    downloadPhoto,
    batchDownload,
  } = useProjectPhotos(projectId);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Local state for filters (will sync with hook)
  const [selectedAlbum, setSelectedAlbum] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Update filters when local state changes
  useEffect(() => {
    const newFilters = {
      albumId: selectedAlbum === 'all' ? undefined : selectedAlbum,
      searchQuery: searchQuery || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };
    setFilters(newFilters);
  }, [selectedAlbum, searchQuery, selectedTags, dateFrom, dateTo, setFilters]);

  // Get all unique tags from photos (must be before conditional returns)
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    photos.forEach(photo => photo.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet);
  }, [photos]);

  // Authentication check
  if (!isAuthenticated) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <h1>請先登入</h1>
      </div>
    );
  }

  // Loading state
  if (photosLoading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#00645A] mx-auto mb-4'></div>
          <p className='text-gray-600'>載入照片中...</p>
        </div>
      </div>
    );
  }

  const handleTagClick = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handlePhotoSelect = (photoId: string) => {
    setSelectedPhotos(prev =>
      prev.includes(photoId)
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPhotos.length === filteredPhotos.length) {
      setSelectedPhotos([]);
    } else {
      setSelectedPhotos(filteredPhotos.map(photo => photo.id));
    }
  };

  const handleBatchDownload = async () => {
    try {
      setLocalError(null);
      await batchDownload(selectedPhotos);
      setSelectedPhotos([]);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : '批次下載失敗');
    }
  };

  const handlePhotoDownload = async (photo: Photo) => {
    try {
      setLocalError(null);
      await downloadPhoto(photo);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : '下載照片失敗');
    }
  };

  const handlePhotoDelete = async (photo: Photo) => {
    if (!confirm(`確定要刪除照片 "${photo.fileName}" 嗎？`)) {
      return;
    }
    try {
      setLocalError(null);
      await deletePhoto(photo.id);
      // Remove from selected photos if it was selected
      setSelectedPhotos(prev => prev.filter(id => id !== photo.id));
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : '刪除照片失敗');
    }
  };

  return (
    <main>
      <div className='container mx-auto px-4 py-8'>
        {/* Breadcrumb Navigation */}
        <Breadcrumb className='mb-6'>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href='/dashboard'>首頁</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/dashboard/${projectId}`}>專案儀表板</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/dashboard/${projectId}/iphoto2`}>iPhoto 2.0</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>照片瀏覽</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold tracking-tight mb-2'>照片瀏覽</h1>
          <p className='text-muted-foreground'>
            瀏覽、搜尋和管理已上傳的照片 ({totalCount} 張照片)
          </p>
          {(photosError || localError) && (
            <div className='mt-4 p-4 bg-red-50 border border-red-200 rounded-md'>
              <p className='text-red-600'>{photosError || localError}</p>
              <Button variant='outline' size='sm' className='mt-2' onClick={refetch}>
                重新載入
              </Button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className='flex flex-col lg:flex-row gap-4 mb-6'>
          {/* Search */}
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='搜尋照片...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-10'
              name='searchQuery'
            />
          </div>

          {/* Album Filter */}
          <Select value={selectedAlbum} onValueChange={setSelectedAlbum} name='albumFilter'>
            <SelectTrigger className='w-48'>
              <SelectValue placeholder='選擇相簿' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>所有相簿</SelectItem>
              {albums.map(album => (
                <SelectItem key={album.id} value={album.name}>
                  {album.name}
                </SelectItem>
              ))}
              <SelectItem value='E2E Test Album'>E2E Test Album</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className='flex gap-1 border rounded-lg p-1'>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size='sm'
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className='h-4 w-4' />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size='sm'
              onClick={() => setViewMode('list')}
            >
              <List className='h-4 w-4' />
            </Button>
          </div>

          {/* Filter Toggle */}
          <Button
            variant='outline'
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className='h-4 w-4 mr-2' />
            篩選器
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className='mb-6'>
            <CardContent className='pt-6'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
                {/* Date Range */}
                <div>
                  <label className='block text-sm font-medium mb-2'>上傳日期範圍</label>
                  <div className='flex gap-2'>
                    <Input
                      type='date'
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      name='dateFrom'
                      placeholder='開始日期'
                    />
                    <Input
                      type='date'
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      name='dateTo'
                      placeholder='結束日期'
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className='flex items-end gap-2'>
                  <Button onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setSelectedTags([]);
                    setSearchQuery('');
                  }}>
                    套用篩選
                  </Button>
                  <Button variant='outline' onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setSelectedTags([]);
                  }}>
                    清除篩選
                  </Button>
                </div>
              </div>

              {/* Tag Filters */}
              {allTags.length > 0 && (
                <div>
                  <label className='block text-sm font-medium mb-2'>標籤篩選</label>
                  <div className='flex flex-wrap gap-2'>
                    {allTags.map(tag => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? 'default' : 'secondary'}
                        className='cursor-pointer'
                        onClick={() => handleTagClick(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Batch Actions */}
        {selectedPhotos.length > 0 && (
          <Card className='mb-6'>
            <CardContent className='py-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-4'>
                  <Checkbox
                    checked={selectedPhotos.length === filteredPhotos.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span>已選擇 {selectedPhotos.length} 張照片</span>
                </div>
                <div className='flex gap-2'>
                  <Button variant='outline' size='sm'>
                    <Edit className='h-4 w-4 mr-2' />
                    批次編輯
                  </Button>
                  <Button variant='outline' size='sm' onClick={handleBatchDownload}>
                    <Download className='h-4 w-4 mr-2' />
                    批次下載
                  </Button>
                  <Button variant='outline' size='sm'>
                    <Trash2 className='h-4 w-4 mr-2' />
                    批次刪除
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos Content */}
        {filteredPhotos.length === 0 ? (
          <div className='text-center py-12'>
            <Image className='h-16 w-16 mx-auto text-muted-foreground mb-4' />
            <h3 className='text-lg font-medium mb-2'>沒有找到照片</h3>
            <p className='text-muted-foreground mb-4'>
              請嘗試調整搜尋條件或上傳新照片
            </p>
            <Button onClick={() => router.push(`/dashboard/${projectId}/iphoto2/upload`)}>
              上傳照片
            </Button>
          </div>
        ) : (
          <>
            {/* Photo Count */}
            <div className='mb-4 text-sm text-muted-foreground'>
              顯示 {filteredPhotos.length} 張照片
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'>
                {filteredPhotos.map(photo => (
                  <Card key={photo.id} className='group hover:shadow-lg transition-shadow'>
                    <div className='relative'>
                      {/* Thumbnail */}
                      <div className='photo-thumbnail aspect-square bg-muted rounded-t-lg overflow-hidden'>
                        <img
                          src={photo.thumbnailUrl}
                          alt={photo.fileName}
                          className='w-full h-full object-cover'
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlBob3RvPC90ZXh0Pjwvc3ZnPg==';
                          }}
                        />
                      </div>

                      {/* Selection Checkbox */}
                      <div className='absolute top-2 left-2 photo-checkbox'>
                        <Checkbox
                          checked={selectedPhotos.includes(photo.id)}
                          onCheckedChange={() => handlePhotoSelect(photo.id)}
                          className='bg-white/80'
                        />
                      </div>

                      {/* Photo Actions */}
                      <div className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='secondary' size='sm'>
                              <MoreVertical className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Edit className='h-4 w-4 mr-2' />
                              編輯
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePhotoDownload(photo)}>
                              <Download className='h-4 w-4 mr-2' />
                              下載
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Tag className='h-4 w-4 mr-2' />
                              標籤
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className='text-destructive'
                              onClick={() => handlePhotoDelete(photo)}
                            >
                              <Trash2 className='h-4 w-4 mr-2' />
                              刪除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <CardContent className='p-3'>
                      {/* Photo Info */}
                      <div className='photo-info'>
                        <h4 className='font-medium text-sm truncate mb-1'>
                          {photo.filename}
                        </h4>
                        {photo.description && (
                          <p className='photo-description text-xs text-muted-foreground mb-2 line-clamp-2'>
                            {photo.description}
                          </p>
                        )}
                        <div className='text-xs text-muted-foreground space-y-1'>
                          <div className='flex items-center gap-1'>
                            <User className='h-3 w-3' />
                            {photo.uploadedBy}
                          </div>
                          <div className='flex items-center gap-1'>
                            <Calendar className='h-3 w-3' />
                            {new Date(photo.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Tags */}
                      {photo.tags.length > 0 && (
                        <div className='flex flex-wrap gap-1 mt-2'>
                          {photo.tags.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant='secondary' className='tag text-xs'>
                              {tag}
                            </Badge>
                          ))}
                          {photo.tags.length > 2 && (
                            <Badge variant='outline' className='text-xs'>
                              +{photo.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className='space-y-2'>
                {filteredPhotos.map(photo => (
                  <Card key={photo.id} className='hover:shadow-md transition-shadow'>
                    <CardContent className='p-4'>
                      <div className='flex items-center gap-4'>
                        <Checkbox
                          checked={selectedPhotos.includes(photo.id)}
                          onCheckedChange={() => handlePhotoSelect(photo.id)}
                        />

                        {/* Thumbnail */}
                        <div className='photo-thumbnail w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0'>
                          <img
                            src={photo.thumbnailUrl}
                            alt={photo.fileName}
                            className='w-full h-full object-cover'
                          />
                        </div>

                        {/* Photo Details */}
                        <div className='flex-1 min-w-0'>
                          <div className='photo-info'>
                            <h4 className='font-medium truncate mb-1'>{photo.fileName}</h4>
                            {photo.description && (
                              <p className='photo-description text-sm text-muted-foreground mb-2'>
                                {photo.description}
                              </p>
                            )}
                            <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                              <span>{photo.albumName}</span>
                              <span>{photo.uploadedBy}</span>
                              <span>{new Date(photo.uploadedAt).toLocaleDateString()}</span>
                              <span>{(photo.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                            </div>
                          </div>

                          {/* Tags */}
                          {photo.tags.length > 0 && (
                            <div className='flex flex-wrap gap-1 mt-2'>
                              {photo.tags.map((tag, index) => (
                                <Badge key={index} variant='secondary' className='tag text-xs'>
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='sm'>
                              <MoreVertical className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Edit className='h-4 w-4 mr-2' />
                              編輯
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePhotoDownload(photo)}>
                              <Download className='h-4 w-4 mr-2' />
                              下載
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Tag className='h-4 w-4 mr-2' />
                              標籤
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className='text-destructive'
                              onClick={() => handlePhotoDelete(photo)}
                            >
                              <Trash2 className='h-4 w-4 mr-2' />
                              刪除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}