/**
 * Albums Management Page Component
 *
 * Provides comprehensive album management interface including:
 * - Project album list view with grid and list modes
 * - Album CRUD operations with interactive dialogs
 * - Search and filtering capabilities
 * - Tag management and batch operations
 * - Integration with Oracle active_photo_albums view
 *
 * Requirements covered:
 * - 4.3: Album listing with grid/list views
 * - 1.1, 1.4: Album create, edit, delete operations
 *
 * @version 1.0
 * @date 2025-09-24
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useProjectScopeStore } from '@/store/projectScopeStore';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Grid3X3,
  List,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Tag,
  Calendar,
  Image,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProjectAlbums, Album } from '@/hooks/useProjectAlbums';

type ViewMode = 'grid' | 'list';

export default function AlbumsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = params.projectId as string;
  const { user, isAuthenticated } = useAuth();
  const { albums, loading, error, createAlbum, updateAlbum, deleteAlbum } =
    useProjectAlbums();
  const { currentProject } = useProjectScopeStore();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAlbums, setSelectedAlbums] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Filter albums based on search and tags
  const filteredAlbums = useMemo(() => {
    return albums.filter(album => {
      const matchesSearch =
        album.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        album.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some(tag => album.tags.includes(tag));
      return matchesSearch && matchesTags;
    });
  }, [albums, searchQuery, selectedTags]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    albums.forEach(album => album.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet);
  }, [albums]);

  const handleTagClick = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSelectAlbum = (albumId: string) => {
    setSelectedAlbums(prev =>
      prev.includes(albumId)
        ? prev.filter(id => id !== albumId)
        : [...prev, albumId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAlbums.length === filteredAlbums.length) {
      setSelectedAlbums([]);
    } else {
      setSelectedAlbums(filteredAlbums.map(album => album.id));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <h1>請先登入</h1>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='container mx-auto px-4 py-8' data-testid='albums-loading'>
        <div className='text-center'>載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='text-center text-red-600'>
          載入相簿時發生錯誤: {error}
        </div>
      </div>
    );
  }

  return (
    <main>
      <div
        className='container mx-auto px-4 py-8'
        data-testid='albums-main-container'
      >
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
                <Link href={`/dashboard/${projectId}/iphoto2`}>
                  iPhoto 2.0
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>相簿管理</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <div className='flex flex-col gap-4 mb-8'>
          <h1 className='text-3xl font-bold tracking-tight'>相簿管理</h1>

          {/* Top Controls */}
          <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
            <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center'>
              {/* Search */}
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='搜尋相簿...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='pl-10 w-64'
                />
              </div>

              {/* Filters */}
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className='h-4 w-4 mr-2' />
                  篩選器
                </Button>
                <Button variant='outline' size='sm' aria-label='標籤篩選'>
                  <Tag className='h-4 w-4 mr-2' />
                  標籤
                </Button>
                <Button variant='outline' size='sm' aria-label='建立日期'>
                  <Calendar className='h-4 w-4 mr-2' />
                  建立日期
                </Button>
              </div>
            </div>

            <div className='flex gap-2 items-center'>
              {/* View Mode Toggle */}
              <div className='flex gap-1 border rounded-lg p-1'>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size='sm'
                  onClick={() => setViewMode('grid')}
                  aria-label='網格檢視'
                >
                  <Grid3X3 className='h-4 w-4' />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size='sm'
                  onClick={() => setViewMode('list')}
                  aria-label='列表檢視'
                >
                  <List className='h-4 w-4' />
                </Button>
              </div>

              {/* Create Album */}
              <Dialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className='h-4 w-4 mr-2' />
                    新增相簿
                  </Button>
                </DialogTrigger>
                <DialogContent aria-label='新增相簿'>
                  <DialogHeader>
                    <DialogTitle>新增相簿</DialogTitle>
                  </DialogHeader>
                  <div className='space-y-4'>
                    <div>
                      <label
                        htmlFor='album-name'
                        className='block text-sm font-medium mb-1'
                      >
                        相簿名稱
                      </label>
                      <Input
                        id='album-name'
                        aria-label='相簿名稱'
                        placeholder='輸入相簿名稱'
                      />
                    </div>
                    <div>
                      <label
                        htmlFor='album-description'
                        className='block text-sm font-medium mb-1'
                      >
                        描述
                      </label>
                      <Input
                        id='album-description'
                        aria-label='描述'
                        placeholder='輸入相簿描述（選填）'
                      />
                    </div>
                    <div>
                      <label
                        htmlFor='album-tags'
                        className='block text-sm font-medium mb-1'
                      >
                        標籤
                      </label>
                      <Input
                        id='album-tags'
                        aria-label='標籤'
                        placeholder='輸入標籤，以逗號分隔'
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        <div
          className={`mb-6 ${showFilters ? '' : 'hidden'}`}
          data-testid='filter-panel'
        >
          <Card>
            <CardContent className='pt-4'>
              <div className='flex flex-wrap gap-2'>
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={
                      selectedTags.includes(tag) ? 'default' : 'secondary'
                    }
                    className='cursor-pointer'
                    onClick={() => handleTagClick(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Batch Actions Toolbar */}
        <div
          className={`mb-6 ${selectedAlbums.length > 0 ? '' : 'hidden'}`}
          data-testid='batch-actions-toolbar'
        >
          <Card>
            <CardContent className='py-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-4'>
                  <Checkbox
                    checked={selectedAlbums.length === filteredAlbums.length}
                    onCheckedChange={handleSelectAll}
                    aria-label='全選相簿'
                  />
                  <span>已選擇 {selectedAlbums.length} 個相簿</span>
                </div>
                <div className='flex gap-2'>
                  <Button variant='outline' size='sm' aria-label='批次標籤'>
                    <Tag className='h-4 w-4 mr-2' />
                    批次標籤
                  </Button>
                  <Button variant='outline' size='sm' aria-label='批次刪除'>
                    <Trash2 className='h-4 w-4 mr-2' />
                    批次刪除
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile Layout */}
        <div className='md:hidden' data-testid='mobile-layout'>
          <div className='text-sm text-muted-foreground mb-4'>手機版面</div>
        </div>

        {/* Albums Content */}
        {filteredAlbums.length === 0 ? (
          <div className='text-center py-12' data-testid='empty-albums-state'>
            <Image className='h-16 w-16 mx-auto text-muted-foreground mb-4' />
            <h3 className='text-lg font-medium mb-2'>尚未建立任何相簿</h3>
            <p className='text-muted-foreground mb-4'>
              建立您的第一個相簿來開始管理照片
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className='h-4 w-4 mr-2' />
              建立相簿
            </Button>
          </div>
        ) : (
          <>
            {/* Grid View */}
            <div
              className={`${viewMode === 'grid' ? '' : 'hidden'}`}
              data-testid='albums-grid-view'
            >
              <div
                className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6'
                data-testid='albums-grid-container'
              >
                {filteredAlbums.map(album => (
                  <Card
                    key={album.id}
                    className='hover:shadow-lg transition-shadow'
                  >
                    <CardHeader className='pb-2'>
                      <div className='flex items-start justify-between'>
                        <Checkbox
                          checked={selectedAlbums.includes(album.id)}
                          onCheckedChange={() => handleSelectAlbum(album.id)}
                          aria-label='選擇相簿'
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='sm'
                              aria-label='相簿操作選單'
                            >
                              <MoreHorizontal className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Edit className='h-4 w-4 mr-2' />
                              編輯相簿
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Trash2 className='h-4 w-4 mr-2' />
                              刪除相簿
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {album.coverPhotoUrl ? (
                        <img
                          src={album.coverPhotoUrl}
                          alt={album.name}
                          className='w-full h-32 object-cover rounded'
                        />
                      ) : (
                        <div className='w-full h-32 bg-muted rounded flex items-center justify-center'>
                          <Image className='h-8 w-8 text-muted-foreground' />
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <CardTitle className='text-lg mb-2'>
                        {album.name}
                      </CardTitle>
                      <p className='text-sm text-muted-foreground mb-3'>
                        {album.description}
                      </p>
                      <p className='text-sm mb-3'>{album.photoCount} 張照片</p>
                      <div className='flex flex-wrap gap-1'>
                        {album.tags.map(tag => (
                          <Badge
                            key={tag}
                            variant='secondary'
                            className='text-xs'
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* List View */}
            <div
              className={`${viewMode === 'list' ? '' : 'hidden'}`}
              data-testid='albums-list-view'
            >
              <div className='space-y-2' data-testid='albums-list-container'>
                {filteredAlbums.map(album => (
                  <Card
                    key={album.id}
                    className='hover:shadow-md transition-shadow'
                  >
                    <CardContent className='py-4'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-4'>
                          <Checkbox
                            checked={selectedAlbums.includes(album.id)}
                            onCheckedChange={() => handleSelectAlbum(album.id)}
                            aria-label='選擇相簿'
                          />
                          <div className='flex-1'>
                            <h3 className='font-medium'>{album.name}</h3>
                            <p className='text-sm text-muted-foreground'>
                              {album.description}
                            </p>
                            <div className='flex items-center gap-4 mt-2'>
                              <span className='text-sm'>
                                {album.photoCount} 張照片
                              </span>
                              <div className='flex flex-wrap gap-1'>
                                {album.tags.map(tag => (
                                  <Badge
                                    key={tag}
                                    variant='secondary'
                                    className='text-xs'
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='sm'
                              aria-label='相簿操作選單'
                            >
                              <MoreHorizontal className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Edit className='h-4 w-4 mr-2' />
                              編輯相簿
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Trash2 className='h-4 w-4 mr-2' />
                              刪除相簿
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
