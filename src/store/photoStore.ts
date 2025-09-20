/**
 * Photo Gallery Zustand Store
 * 照片庫狀態管理
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import {
  Photo,
  Album,
  UploadFile,
  PhotoFilters,
  PhotoViewMode,
  PhotoSortBy,
  PhotoSortOrder
} from '@/types/photo.types'

interface PhotoStore {
  // 核心資料
  photos: Photo[]
  albums: Album[]
  currentAlbum: string | null

  // 載入狀態
  loading: boolean
  error: string | null

  // 篩選與搜尋
  filters: PhotoFilters
  searchQuery: string
  viewMode: PhotoViewMode
  sortBy: PhotoSortBy
  sortOrder: PhotoSortOrder

  // 上傳狀態
  uploadQueue: UploadFile[]
  uploadProgress: Record<string, number>

  // 選取狀態
  selectedPhotos: string[]
  lightboxOpen: boolean
  lightboxIndex: number

  // Actions - Photos
  setPhotos: (photos: Photo[]) => void
  addPhoto: (photo: Photo) => void
  removePhoto: (photoId: string) => void
  updatePhoto: (photoId: string, updates: Partial<Photo>) => void

  // Actions - Albums
  setAlbums: (albums: Album[]) => void
  setCurrentAlbum: (albumId: string | null) => void
  updateAlbum: (albumId: string, updates: Partial<Album>) => void

  // Actions - Loading & Error
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void

  // Actions - Filtering & Search
  setFilters: (filters: PhotoFilters) => void
  updateFilters: (updates: Partial<PhotoFilters>) => void
  setSearchQuery: (query: string) => void
  setViewMode: (mode: PhotoViewMode) => void
  setSorting: (sortBy: PhotoSortBy, sortOrder: PhotoSortOrder) => void
  getFilteredPhotos: () => Photo[]

  // Actions - Upload Queue
  addToUploadQueue: (file: UploadFile) => void
  removeFromUploadQueue: (fileId: string) => void
  updateUploadProgress: (fileId: string, progress: number) => void
  updateUploadStatus: (fileId: string, status: UploadFile['status'], error?: string) => void
  clearUploadQueue: () => void

  // Actions - Selection & Lightbox
  selectPhoto: (photoId: string) => void
  deselectPhoto: (photoId: string) => void
  selectAllPhotos: () => void
  clearSelection: () => void
  openLightbox: (photoIndex: number) => void
  closeLightbox: () => void
  setLightboxIndex: (index: number) => void

  // Actions - Utility
  reset: () => void
}

const initialState = {
  photos: [],
  albums: [],
  currentAlbum: null,
  loading: false,
  error: null,
  filters: {},
  searchQuery: '',
  viewMode: 'grid' as PhotoViewMode,
  sortBy: 'uploadedAt' as PhotoSortBy,
  sortOrder: 'desc' as PhotoSortOrder,
  uploadQueue: [],
  uploadProgress: {},
  selectedPhotos: [],
  lightboxOpen: false,
  lightboxIndex: 0
}

export const usePhotoStore = create<PhotoStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Photos Actions
        setPhotos: (photos) => set({ photos }),
        addPhoto: (photo) => set((state) => ({
          photos: [...state.photos, photo]
        })),
        removePhoto: (photoId) => set((state) => ({
          photos: state.photos.filter(p => p.id !== photoId),
          selectedPhotos: state.selectedPhotos.filter(id => id !== photoId)
        })),
        updatePhoto: (photoId, updates) => set((state) => ({
          photos: state.photos.map(p =>
            p.id === photoId ? { ...p, ...updates } : p
          )
        })),

        // Albums Actions
        setAlbums: (albums) => set({ albums }),
        setCurrentAlbum: (albumId) => set({ currentAlbum: albumId }),
        updateAlbum: (albumId, updates) => set((state) => ({
          albums: state.albums.map(a =>
            a.id === albumId ? { ...a, ...updates } : a
          )
        })),

        // Loading & Error Actions
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),

        // Filtering & Search Actions
        setFilters: (filters) => set({ filters }),
        updateFilters: (updates) => set((state) => ({
          filters: { ...state.filters, ...updates }
        })),
        setSearchQuery: (searchQuery) => set({ searchQuery }),
        setViewMode: (viewMode) => set({ viewMode }),
        setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),

        getFilteredPhotos: () => {
          const { photos, filters, searchQuery, currentAlbum, sortBy, sortOrder } = get()

          let filtered = [...photos]

          // Filter by current album
          if (currentAlbum) {
            filtered = filtered.filter(p => p.albumId === currentAlbum)
          }

          // Apply filters
          if (filters.albumId) {
            filtered = filtered.filter(p => p.albumId === filters.albumId)
          }

          if (filters.dateRange) {
            filtered = filtered.filter(p => {
              const uploadDate = new Date(p.uploadedAt)
              return uploadDate >= filters.dateRange!.start && uploadDate <= filters.dateRange!.end
            })
          }

          if (filters.uploadedBy) {
            filtered = filtered.filter(p => p.uploadedBy === filters.uploadedBy)
          }

          if (filters.tags && filters.tags.length > 0) {
            filtered = filtered.filter(p =>
              p.metadata.tags && p.metadata.tags.some(tag =>
                filters.tags!.includes(tag)
              )
            )
          }

          // Apply search query
          if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(p =>
              p.fileName.toLowerCase().includes(query) ||
              (p.metadata.description && p.metadata.description.toLowerCase().includes(query)) ||
              (p.metadata.tags && p.metadata.tags.some(tag =>
                tag.toLowerCase().includes(query)
              ))
            )
          }

          // Apply sorting
          filtered.sort((a, b) => {
            let comparison = 0

            switch (sortBy) {
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

            return sortOrder === 'asc' ? comparison : -comparison
          })

          return filtered
        },

        // Upload Queue Actions
        addToUploadQueue: (file) => set((state) => ({
          uploadQueue: [...state.uploadQueue, file]
        })),
        removeFromUploadQueue: (fileId) => set((state) => ({
          uploadQueue: state.uploadQueue.filter(f => f.id !== fileId),
          uploadProgress: Object.fromEntries(
            Object.entries(state.uploadProgress).filter(([id]) => id !== fileId)
          )
        })),
        updateUploadProgress: (fileId, progress) => set((state) => ({
          uploadProgress: { ...state.uploadProgress, [fileId]: progress }
        })),
        updateUploadStatus: (fileId, status, error) => set((state) => ({
          uploadQueue: state.uploadQueue.map(f =>
            f.id === fileId ? { ...f, status, error } : f
          )
        })),
        clearUploadQueue: () => set({ uploadQueue: [], uploadProgress: {} }),

        // Selection & Lightbox Actions
        selectPhoto: (photoId) => set((state) => ({
          selectedPhotos: state.selectedPhotos.includes(photoId)
            ? state.selectedPhotos
            : [...state.selectedPhotos, photoId]
        })),
        deselectPhoto: (photoId) => set((state) => ({
          selectedPhotos: state.selectedPhotos.filter(id => id !== photoId)
        })),
        selectAllPhotos: () => set((state) => ({
          selectedPhotos: state.photos.map(p => p.id)
        })),
        clearSelection: () => set({ selectedPhotos: [] }),
        openLightbox: (photoIndex) => set({
          lightboxOpen: true,
          lightboxIndex: photoIndex
        }),
        closeLightbox: () => set({ lightboxOpen: false }),
        setLightboxIndex: (lightboxIndex) => set({ lightboxIndex }),

        // Utility Actions
        reset: () => set(initialState)
      }),
      {
        name: 'photo-gallery-store',
        // Only persist certain state, not everything
        partialize: (state) => ({
          viewMode: state.viewMode,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          filters: state.filters
        })
      }
    ),
    { name: 'PhotoStore' }
  )
)