/**
 * Photo Gallery 資料類型定義
 * 工程照片庫功能的核心資料結構
 */

export interface PhotoMetadata {
  exifData?: ExifData
  location?: GeoLocation
  tags?: string[]
  description?: string
  capturedAt?: Date
  cameraModel?: string
}

export interface ExifData {
  make?: string
  model?: string
  dateTime?: string
  gps?: {
    latitude?: number
    longitude?: number
  }
  orientation?: number
  iso?: number
  focalLength?: number
  aperture?: number
  shutterSpeed?: string
}

export interface GeoLocation {
  latitude: number
  longitude: number
  accuracy?: number
}

export interface Album {
  id: string
  projectId: string
  name: string
  description?: string
  coverPhotoId?: string
  photoCount: number
  createdAt: Date
  updatedAt: Date
}

export interface Photo {
  id: string
  projectId: string
  albumId: string
  fileName: string
  fileSize: number
  mimeType: string
  width: number
  height: number
  thumbnailUrl: string
  originalUrl: string
  uploadedBy: string
  uploadedAt: Date
  metadata: PhotoMetadata
}

export interface UploadFile {
  id: string
  file: File
  projectId: string
  albumId?: string
  metadata: PhotoMetadata
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  error?: string
}

export interface PhotoFilters {
  searchQuery?: string
  dateRange?: {
    start: Date
    end: Date
  }
  tags?: string[]
  uploadedBy?: string
  albumId?: string
}

export interface UploadResult {
  success: boolean
  photoId: string
  thumbnailUrl: string
  originalUrl: string
  metadata: PhotoMetadata
  errors?: string[]
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: string[]
  meta?: {
    total: number
    page: number
    limit: number
  }
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface UserPermissions {
  canView: string[]
  canEdit: string[]
  canDelete: string[]
}

export type PhotoViewMode = 'grid' | 'list'
export type PhotoSortBy = 'uploadedAt' | 'fileName' | 'fileSize'
export type PhotoSortOrder = 'asc' | 'desc'