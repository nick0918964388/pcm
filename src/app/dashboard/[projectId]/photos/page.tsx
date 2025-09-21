/**
 * Photo Gallery Page
 * 工程照片庫主頁面
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Upload,
  Search,
  Filter,
  Grid3X3,
  List,
  FolderOpen,
  Image as ImageIcon,
  Calendar,
  User,
  Download
} from 'lucide-react'
import { PhotoUploader, PhotoGrid, PhotoLightbox, PhotoGalleryList } from '@/components/photo'
import { DownloadProgress, BatchDownloadProgress } from '@/components/photo/DownloadProgress'
import { usePhotoStore } from '@/store/photoStore'
import { photoService, BatchDownloadOptions } from '@/services/photoService'
import { Photo, Album, UploadResult, UserPermissions } from '@/types/photo.types'

export default function PhotoGalleryPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [showUploader, setShowUploader] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<BatchDownloadProgress | null>(null)

  // TODO: 這裡應該從認證系統獲取實際的使用者權限
  const userPermissions: UserPermissions = {
    canView: ['album-1'], // 暫時硬編碼，實際應從 API 獲取
    canEdit: ['album-1'],
    canDelete: ['album-1']
  }

  const {
    photos,
    albums,
    currentAlbum,
    selectedPhotos,
    lightboxOpen,
    lightboxIndex,
    searchQuery,
    viewMode,
    filters,
    setPhotos,
    setAlbums,
    setCurrentAlbum,
    setSearchQuery,
    setViewMode,
    selectPhoto,
    deselectPhoto,
    openLightbox,
    closeLightbox,
    getFilteredPhotos,
    setLoading: setStoreLoading,
    setError: setStoreError
  } = usePhotoStore()

  /**
   * 載入專案相簿
   */
  const loadAlbums = useCallback(async () => {
    try {
      const response = await photoService.getAlbums(projectId)
      if (response.success && response.data) {
        setAlbums(response.data)
        // 預設選擇第一個相簿
        if (response.data.length > 0) {
          setCurrentAlbum(response.data[0].id)
        }
      } else {
        setError(response.errors?.[0] || '載入相簿失敗')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入相簿失敗')
    }
  }, [projectId, setAlbums, setCurrentAlbum])

  /**
   * 載入照片
   */
  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true)
      setStoreLoading(true)

      const response = await photoService.getPhotos(projectId, {
        albumId: currentAlbum || undefined
      })

      if (response.success && response.data) {
        setPhotos(response.data)
      } else {
        setStoreError(response.errors?.[0] || '載入照片失敗')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入照片失敗'
      setError(errorMessage)
      setStoreError(errorMessage)
    } finally {
      setLoading(false)
      setStoreLoading(false)
    }
  }, [projectId, currentAlbum, setPhotos, setStoreLoading, setStoreError])

  /**
   * 初始化頁面
   */
  useEffect(() => {
    const initializePage = async () => {
      await loadAlbums()
      await loadPhotos()
    }
    initializePage()
  }, [loadAlbums, loadPhotos])

  /**
   * 處理上傳完成
   */
  const handleUploadComplete = useCallback(async (results: UploadResult[]) => {
    console.log('上傳完成:', results)
    // 重新載入照片
    await loadPhotos()
    setShowUploader(false)
  }, [loadPhotos])

  /**
   * 處理上傳錯誤
   */
  const handleUploadError = useCallback((errors: string[]) => {
    console.error('上傳錯誤:', errors)
  }, [])

  /**
   * 處理照片點擊
   */
  const handlePhotoClick = useCallback((photo: Photo, index: number) => {
    const filteredPhotos = getFilteredPhotos()
    const actualIndex = filteredPhotos.findIndex(p => p.id === photo.id)
    openLightbox(actualIndex >= 0 ? actualIndex : index)
  }, [getFilteredPhotos, openLightbox])

  /**
   * 處理照片選取
   */
  const handlePhotoSelect = useCallback((photoId: string, selected: boolean) => {
    if (selected) {
      selectPhoto(photoId)
    } else {
      deselectPhoto(photoId)
    }
  }, [selectPhoto, deselectPhoto])

  /**
   * 處理照片下載（支援單張和批次）
   */
  const handlePhotoDownload = useCallback(async (photoOrPhotos: Photo | Photo[]) => {
    try {
      if (Array.isArray(photoOrPhotos)) {
        // 批次下載
        const photos = photoOrPhotos
        if (photos.length === 0) {
          alert('請選擇要下載的照片')
          return
        }

        // 檢查是否需要分批下載
        if (photoService.shouldSplitDownload(photos)) {
          const confirmMessage = `選取的照片較多（${photos.length}張），將分批下載為多個ZIP檔案。確定繼續嗎？`
          if (!confirm(confirmMessage)) {
            return
          }
        }

        // 建立進度追蹤
        const progressId = `download-${Date.now()}`
        const initialProgress: BatchDownloadProgress = {
          id: progressId,
          totalFiles: photos.length,
          completedFiles: 0,
          failedFiles: 0,
          overallProgress: 0,
          status: 'preparing',
          items: photos.map(photo => ({
            id: photo.id,
            fileName: photo.fileName,
            progress: 0,
            status: 'pending'
          })),
          startTime: new Date()
        }

        setDownloadProgress(initialProgress)

        // 設定下載選項
        const options: BatchDownloadOptions = {
          onProgress: (progress) => {
            setDownloadProgress(prev => prev ? {
              ...prev,
              overallProgress: progress,
              status: progress < 90 ? 'downloading' : progress < 100 ? 'zipping' : 'completed'
            } : null)
          }
        }

        // 執行批次下載
        await photoService.downloadPhotos(photos, options)

        // 下載完成，清除選取
        clearSelection()

        // 標記為完成
        setDownloadProgress(prev => prev ? {
          ...prev,
          completedFiles: photos.length,
          overallProgress: 100,
          status: 'completed'
        } : null)

      } else {
        // 單張下載
        await photoService.downloadPhoto(photoOrPhotos, 'original')
      }
    } catch (error) {
      console.error('下載失敗:', error)

      // 更新進度為失敗狀態
      if (Array.isArray(photoOrPhotos)) {
        setDownloadProgress(prev => prev ? {
          ...prev,
          status: 'failed',
          failedFiles: prev.totalFiles - prev.completedFiles
        } : null)
      } else {
        alert('下載失敗')
      }
    }
  }, [clearSelection])

  /**
   * 處理照片刪除
   */
  const handlePhotoDelete = useCallback(async (photo: Photo) => {
    if (confirm(`確定要刪除照片「${photo.fileName}」嗎？`)) {
      try {
        const response = await photoService.deletePhoto(photo.id)
        if (response.success) {
          await loadPhotos()
        } else {
          alert(response.errors?.[0] || '刪除失敗')
        }
      } catch (error) {
        console.error('刪除失敗:', error)
        alert('刪除失敗')
      }
    }
  }, [loadPhotos])

  /**
   * 處理相簿切換
   */
  const handleAlbumChange = useCallback((albumId: string | null) => {
    setCurrentAlbum(albumId)
  }, [setCurrentAlbum])

  /**
   * 取得過濾後的照片
   */
  const filteredPhotos = getFilteredPhotos()

  /**
   * 取得當前相簿資訊
   */
  const currentAlbumInfo = albums.find(album => album.id === currentAlbum)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 頁面標題 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <ImageIcon className="w-6 h-6 mr-2 text-primary" />
                iPhoto 2.0 - 工程照片庫
              </h1>
              <p className="text-gray-600 mt-1">
                專案 {projectId} 的照片管理與預覽
              </p>
            </div>
            <Button onClick={() => setShowUploader(!showUploader)}>
              <Upload className="w-4 h-4 mr-2" />
              {showUploader ? '隱藏上傳' : '上傳照片'}
            </Button>
          </div>
        </div>

        {/* 上傳區域 */}
        {showUploader && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>上傳照片</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUploader
                projectId={projectId}
                albumId={currentAlbum || undefined}
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
              />
            </CardContent>
          </Card>
        )}

        {/* 相簿與過濾器 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* 相簿列表 */}
          <PhotoGalleryList
            albums={albums}
            projectId={projectId}
            selectedAlbum={currentAlbum}
            loading={loading}
            error={error}
            userPermissions={userPermissions}
            onAlbumSelect={handleAlbumChange}
            onAlbumCreate={() => {
              // TODO: 實作新增相簿功能
              console.log('Create album')
            }}
            onAlbumDelete={async (albumId) => {
              // TODO: 實作刪除相簿功能
              console.log('Delete album:', albumId)
            }}
          />

          {/* 搜尋與過濾器 */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center">
                  <Filter className="w-4 h-4 mr-2" />
                  搜尋與篩選
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="搜尋照片檔名、描述或標籤..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  日期範圍
                </Button>
                <Button variant="outline" size="sm">
                  <User className="w-4 h-4 mr-2" />
                  上傳者
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 照片網格 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                {currentAlbumInfo ? (
                  <>
                    <FolderOpen className="w-5 h-5 mr-2" />
                    {currentAlbumInfo.name}
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5 mr-2" />
                    所有照片
                  </>
                )}
                <Badge variant="secondary" className="ml-2">
                  {filteredPhotos.length}
                </Badge>
              </CardTitle>

              {selectedPhotos.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    已選取 {selectedPhotos.length} 張
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const selectedPhotoObjects = filteredPhotos.filter(p => selectedPhotos.includes(p.id))
                      handlePhotoDownload(selectedPhotoObjects)
                    }}
                    disabled={!!downloadProgress && downloadProgress.status !== 'completed'}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    批次下載
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <PhotoGrid
              photos={filteredPhotos}
              selectedPhotos={selectedPhotos}
              loading={loading}
              error={error}
              onPhotoClick={handlePhotoClick}
              onPhotoSelect={handlePhotoSelect}
              onPhotoDownload={handlePhotoDownload}
              onPhotoDelete={handlePhotoDelete}
              columnCount={viewMode === 'grid' ? 4 : 2}
              height={600}
            />
          </CardContent>
        </Card>

        {/* 下載進度 */}
        {downloadProgress && (
          <div className="fixed bottom-4 right-4 z-50">
            <DownloadProgress
              progress={downloadProgress}
              onCancel={() => {
                photoService.cancelBatchDownload()
                setDownloadProgress(prev => prev ? { ...prev, status: 'cancelled' } : null)
              }}
              onClose={() => {
                setDownloadProgress(null)
              }}
            />
          </div>
        )}

        {/* 燈箱 */}
        <PhotoLightbox
          photos={filteredPhotos}
          open={lightboxOpen}
          index={lightboxIndex}
          onClose={closeLightbox}
          enableZoom={true}
          enableFullscreen={true}
          enableThumbnails={true}
          enableKeyboardShortcuts={true}
          enableTouchGestures={true}
        />
      </div>
    </div>
  )
}