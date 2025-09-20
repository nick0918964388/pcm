/**
 * PhotoStore - Zustand 狀態管理
 * 管理照片庫的所有狀態和操作
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  Photo,
  Album,
  UploadFile,
  PhotoFilters,
  PhotoViewMode,
  PhotoSortBy,
  PhotoSortOrder
} from '@/types/photo.types'

interface PhotoStoreState {
  // 照片資料
  photos: Photo[]
  albums: Album[]

  // 上傳佇列
  uploadQueue: UploadFile[]

  // 導航狀態
  currentAlbumId: string | null

  // 篩選與搜尋
  filters: PhotoFilters

  // 檢視設定
  viewMode: PhotoViewMode
  sortBy: PhotoSortBy
  sortOrder: PhotoSortOrder

  // 載入狀態
  isLoading: boolean
  error: string | null

  // 快取
  _filteredPhotosCache: Photo[] | null
  _cacheKey: string | null
}

interface PhotoStoreActions {
  // 照片操作
  setPhotos: (photos: Photo[]) => void
  addPhoto: (photo: Photo) => void
  removePhoto: (photoId: string) => void
  updatePhoto: (photoId: string, updates: Partial<Photo>) => void

  // 相簿操作
  setAlbums: (albums: Album[]) => void
  setCurrentAlbum: (albumId: string | null) => void

  // 篩選操作
  setFilters: (filters: Partial<PhotoFilters>) => void
  clearFilters: () => void

  // 上傳佇列操作
  addToUploadQueue: (file: UploadFile) => void
  updateUploadProgress: (fileId: string, progress: number, error?: string) => void
  removeFromUploadQueue: (fileId: string) => void

  // 檢視設定
  setViewMode: (mode: PhotoViewMode) => void
  setSorting: (sortBy: PhotoSortBy, sortOrder: PhotoSortOrder) => void

  // 載入狀態
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void

  // 工具函式
  getFilteredPhotos: () => Photo[]
  reset: () => void
}

type PhotoStore = PhotoStoreState & PhotoStoreActions

const initialState: PhotoStoreState = {
  photos: [],
  albums: [],
  uploadQueue: [],
  currentAlbumId: null,
  filters: {},
  viewMode: 'grid',
  sortBy: 'uploadedAt',
  sortOrder: 'desc',
  isLoading: false,
  error: null,
  _filteredPhotosCache: null,
  _cacheKey: null
}

export const usePhotoStore = create<PhotoStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // 照片操作
      setPhotos: (photos) => {
        set({
          photos,
          _filteredPhotosCache: null,
          _cacheKey: null
        })
      },

      addPhoto: (photo) => {
        set((state) => ({
          photos: [...state.photos, photo],
          _filteredPhotosCache: null,
          _cacheKey: null
        }))
      },

      removePhoto: (photoId) => {
        set((state) => ({
          photos: state.photos.filter(p => p.id !== photoId),
          _filteredPhotosCache: null,
          _cacheKey: null
        }))
      },

      updatePhoto: (photoId, updates) => {
        set((state) => ({
          photos: state.photos.map(p =>
            p.id === photoId
              ? { ...p, ...updates }
              : p
          ),
          _filteredPhotosCache: null,
          _cacheKey: null
        }))
      },

      // 相簿操作
      setAlbums: (albums) => {
        set({ albums })
      },

      setCurrentAlbum: (albumId) => {
        set({ currentAlbumId: albumId })
      },

      // 篩選操作
      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
          _filteredPhotosCache: null,
          _cacheKey: null
        }))
      },

      clearFilters: () => {
        set({
          filters: {},
          _filteredPhotosCache: null,
          _cacheKey: null
        })
      },

      // 上傳佇列操作
      addToUploadQueue: (file) => {
        set((state) => ({
          uploadQueue: [...state.uploadQueue, file]
        }))
      },

      updateUploadProgress: (fileId, progress, error) => {
        set((state) => ({
          uploadQueue: state.uploadQueue.map(f => {
            if (f.id === fileId) {
              if (progress === -1) {
                // 處理失敗
                return {
                  ...f,
                  status: 'failed' as const,
                  error: error || 'Upload failed'
                }
              } else if (progress === 100) {
                // 處理完成
                return {
                  ...f,
                  progress: 100,
                  status: 'completed' as const
                }
              } else {
                // 更新進度
                return {
                  ...f,
                  progress,
                  status: 'uploading' as const
                }
              }
            }
            return f
          })
        }))
      },

      removeFromUploadQueue: (fileId) => {
        set((state) => ({
          uploadQueue: state.uploadQueue.filter(f => f.id !== fileId)
        }))
      },

      // 檢視設定
      setViewMode: (mode) => {
        set({ viewMode: mode })
      },

      setSorting: (sortBy, sortOrder) => {
        set({
          sortBy,
          sortOrder,
          _filteredPhotosCache: null,
          _cacheKey: null
        })
      },

      // 載入狀態
      setLoading: (isLoading) => {
        set({ isLoading })
      },

      setError: (error) => {
        set({ error })
      },

      // 工具函式
      getFilteredPhotos: () => {
        const state = get()

        // 建立快取鍵
        const cacheKey = JSON.stringify({
          filters: state.filters,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          currentAlbumId: state.currentAlbumId
        })

        // 如果快取有效，返回快取結果
        if (state._cacheKey === cacheKey && state._filteredPhotosCache) {
          return state._filteredPhotosCache
        }

        let filtered = [...state.photos]

        // 應用篩選條件
        const { searchQuery, tags, uploadedBy, albumId, dateRange } = state.filters

        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          filtered = filtered.filter(p =>
            p.fileName.toLowerCase().includes(query) ||
            p.metadata.description?.toLowerCase().includes(query) ||
            p.metadata.tags?.some(tag => tag.toLowerCase().includes(query))
          )
        }

        if (tags && tags.length > 0) {
          filtered = filtered.filter(p =>
            tags.some(tag => p.metadata.tags?.includes(tag))
          )
        }

        if (uploadedBy) {
          filtered = filtered.filter(p => p.uploadedBy === uploadedBy)
        }

        if (albumId) {
          filtered = filtered.filter(p => p.albumId === albumId)
        }

        if (dateRange) {
          filtered = filtered.filter(p => {
            const uploadDate = new Date(p.uploadedAt)
            return uploadDate >= dateRange.start && uploadDate <= dateRange.end
          })
        }

        // 當前相簿篩選
        if (state.currentAlbumId) {
          filtered = filtered.filter(p => p.albumId === state.currentAlbumId)
        }

        // 排序
        filtered.sort((a, b) => {
          let comparison = 0

          switch (state.sortBy) {
            case 'uploadedAt':
              comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
              break
            case 'fileName':
              comparison = a.fileName.localeCompare(b.fileName)
              break
            case 'fileSize':
              comparison = a.fileSize - b.fileSize
              break
          }

          return state.sortOrder === 'desc' ? -comparison : comparison
        })

        // 更新快取
        set({
          _filteredPhotosCache: filtered,
          _cacheKey: cacheKey
        })

        return filtered
      },

      reset: () => {
        set(initialState)
      }
    }),
    {
      name: 'photo-store'
    }
  )
)