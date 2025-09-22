/**
 * PhotoStore getFilteredPhotos 方法詳細測試
 * 測試篩選和排序邏輯的所有場景
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePhotoStore } from '../photoStore'
import type { Photo } from '@/types/photo.types'

const mockDate1 = new Date('2024-01-01T10:00:00Z')
const mockDate2 = new Date('2024-01-02T10:00:00Z')
const mockDate3 = new Date('2024-01-03T10:00:00Z')

describe('PhotoStore - getFilteredPhotos Method', () => {
  const mockPhotos: Photo[] = [
    {
      id: 'photo-1',
      projectId: 'project-1',
      albumId: 'album-1',
      fileName: 'foundation-work.jpg',
      fileSize: 1024,
      mimeType: 'image/jpeg',
      width: 1920,
      height: 1080,
      thumbnailUrl: '/thumb/1.jpg',
      originalUrl: '/orig/1.jpg',
      uploadedBy: 'user-1',
      uploadedAt: mockDate1,
      metadata: {
        tags: ['construction', 'foundation'],
        description: 'Foundation excavation work'
      }
    },
    {
      id: 'photo-2',
      projectId: 'project-1',
      albumId: 'album-2',
      fileName: 'steel-frame.jpg',
      fileSize: 2048,
      mimeType: 'image/jpeg',
      width: 1920,
      height: 1080,
      thumbnailUrl: '/thumb/2.jpg',
      originalUrl: '/orig/2.jpg',
      uploadedBy: 'user-2',
      uploadedAt: mockDate2,
      metadata: {
        tags: ['construction', 'steel'],
        description: 'Steel frame installation'
      }
    },
    {
      id: 'photo-3',
      projectId: 'project-1',
      albumId: 'album-1',
      fileName: 'concrete-pour.jpg',
      fileSize: 1536,
      mimeType: 'image/jpeg',
      width: 1920,
      height: 1080,
      thumbnailUrl: '/thumb/3.jpg',
      originalUrl: '/orig/3.jpg',
      uploadedBy: 'user-1',
      uploadedAt: mockDate3,
      metadata: {
        tags: ['construction', 'concrete'],
        description: 'Concrete pouring process'
      }
    }
  ]

  beforeEach(() => {
    usePhotoStore.getState().reset()
    usePhotoStore.getState().setPhotos(mockPhotos)
  })

  describe('Search Query Filtering', () => {
    it('should filter by filename', () => {
      const store = usePhotoStore.getState()

      store.setFilters({ searchQuery: 'foundation' })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('photo-1')
    })

    it('should filter by description', () => {
      const store = usePhotoStore.getState()

      store.setFilters({ searchQuery: 'installation' })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('photo-2')
    })

    it('should filter by tags', () => {
      const store = usePhotoStore.getState()

      store.setFilters({ searchQuery: 'concrete' })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('photo-3')
    })

    it('should be case insensitive', () => {
      const store = usePhotoStore.getState()

      store.setFilters({ searchQuery: 'FOUNDATION' })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('photo-1')
    })

    it('should return multiple matches', () => {
      const store = usePhotoStore.getState()

      store.setFilters({ searchQuery: 'construction' })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(3)
    })

    it('should return empty array for no matches', () => {
      const store = usePhotoStore.getState()

      store.setFilters({ searchQuery: 'nonexistent' })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(0)
    })
  })

  describe('Tags Filtering', () => {
    it('should filter by single tag', () => {
      const store = usePhotoStore.getState()

      store.setFilters({ tags: ['foundation'] })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('photo-1')
    })

    it('should filter by multiple tags (OR logic)', () => {
      const store = usePhotoStore.getState()

      store.setFilters({ tags: ['foundation', 'steel'] })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(2)
      expect(filtered.map(p => p.id)).toEqual(['photo-1', 'photo-2'])
    })

    it('should return photos that match any of the tags', () => {
      const store = usePhotoStore.getState()

      store.setFilters({ tags: ['concrete', 'nonexistent'] })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('photo-3')
    })

    it('should return empty array for non-existent tags', () => {
      const store = usePhotoStore.getState()

      store.setFilters({ tags: ['nonexistent'] })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(0)
    })
  })

  describe('UploadedBy Filtering', () => {
    it('should filter by uploader', () => {
      const store = usePhotoStore.getState()

      store.setFilters({ uploadedBy: 'user-1' })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(2)
      expect(filtered.map(p => p.id)).toEqual(['photo-1', 'photo-3'])
    })

    it('should return empty array for non-existent uploader', () => {
      const store = usePhotoStore.getState()

      store.setFilters({ uploadedBy: 'non-existent-user' })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(0)
    })
  })

  describe('Album Filtering', () => {
    it('should filter by album ID', () => {
      const store = usePhotoStore.getState()

      store.setFilters({ albumId: 'album-1' })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(2)
      expect(filtered.map(p => p.id)).toEqual(['photo-1', 'photo-3'])
    })

    it('should return empty array for non-existent album', () => {
      const store = usePhotoStore.getState()

      store.setFilters({ albumId: 'non-existent-album' })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(0)
    })
  })

  describe('Date Range Filtering', () => {
    it('should filter by date range', () => {
      const store = usePhotoStore.getState()

      store.setFilters({
        dateRange: {
          start: mockDate1,
          end: mockDate2
        }
      })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(2)
      expect(filtered.map(p => p.id)).toEqual(['photo-1', 'photo-2'])
    })

    it('should filter by start date only', () => {
      const store = usePhotoStore.getState()

      store.setFilters({
        dateRange: {
          start: mockDate2,
          end: new Date('2024-12-31T23:59:59Z')
        }
      })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(2)
      expect(filtered.map(p => p.id)).toEqual(['photo-2', 'photo-3'])
    })

    it('should return empty array for date range with no matches', () => {
      const store = usePhotoStore.getState()

      store.setFilters({
        dateRange: {
          start: new Date('2025-01-01T00:00:00Z'),
          end: new Date('2025-12-31T23:59:59Z')
        }
      })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(0)
    })
  })

  describe('Current Album Filtering', () => {
    it('should filter by current album ID', () => {
      const store = usePhotoStore.getState()

      store.setCurrentAlbum('album-1')
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(2)
      expect(filtered.map(p => p.id)).toEqual(['photo-1', 'photo-3'])
    })

    it('should override filter albumId with currentAlbumId', () => {
      const store = usePhotoStore.getState()

      store.setFilters({ albumId: 'album-2' })
      store.setCurrentAlbum('album-1')
      const filtered = store.getFilteredPhotos()

      // Should return album-1 photos, not album-2
      expect(filtered).toHaveLength(2)
      expect(filtered.map(p => p.id)).toEqual(['photo-1', 'photo-3'])
    })
  })

  describe('Combined Filtering', () => {
    it('should apply multiple filters (AND logic)', () => {
      const store = usePhotoStore.getState()

      store.setFilters({
        searchQuery: 'construction',
        tags: ['foundation'],
        uploadedBy: 'user-1'
      })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('photo-1')
    })

    it('should return empty array when filters have no common results', () => {
      const store = usePhotoStore.getState()

      store.setFilters({
        tags: ['foundation'],
        uploadedBy: 'user-2'  // user-2 didn't upload foundation photos
      })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(0)
    })
  })

  describe('Sorting', () => {
    it('should sort by uploadedAt desc (default)', () => {
      const store = usePhotoStore.getState()
      const filtered = store.getFilteredPhotos()

      expect(filtered.map(p => p.id)).toEqual(['photo-3', 'photo-2', 'photo-1'])
    })

    it('should sort by uploadedAt asc', () => {
      const store = usePhotoStore.getState()

      store.setSorting('uploadedAt', 'asc')
      const filtered = store.getFilteredPhotos()

      expect(filtered.map(p => p.id)).toEqual(['photo-1', 'photo-2', 'photo-3'])
    })

    it('should sort by fileName asc', () => {
      const store = usePhotoStore.getState()

      store.setSorting('fileName', 'asc')
      const filtered = store.getFilteredPhotos()

      expect(filtered.map(p => p.id)).toEqual(['photo-3', 'photo-1', 'photo-2'])
    })

    it('should sort by fileName desc', () => {
      const store = usePhotoStore.getState()

      store.setSorting('fileName', 'desc')
      const filtered = store.getFilteredPhotos()

      expect(filtered.map(p => p.id)).toEqual(['photo-2', 'photo-1', 'photo-3'])
    })

    it('should sort by fileSize asc', () => {
      const store = usePhotoStore.getState()

      store.setSorting('fileSize', 'asc')
      const filtered = store.getFilteredPhotos()

      expect(filtered.map(p => p.id)).toEqual(['photo-1', 'photo-3', 'photo-2'])
    })

    it('should sort by fileSize desc', () => {
      const store = usePhotoStore.getState()

      store.setSorting('fileSize', 'desc')
      const filtered = store.getFilteredPhotos()

      expect(filtered.map(p => p.id)).toEqual(['photo-2', 'photo-3', 'photo-1'])
    })
  })

  describe('Caching Mechanism', () => {
    it('should cache filtered results', () => {
      const store = usePhotoStore.getState()

      const result1 = store.getFilteredPhotos()
      const result2 = store.getFilteredPhotos()

      expect(result1).toBe(result2) // Same reference = cached
    })

    it('should invalidate cache when filters change', () => {
      const store = usePhotoStore.getState()

      const result1 = store.getFilteredPhotos()

      store.setFilters({ searchQuery: 'test' })
      const result2 = store.getFilteredPhotos()

      expect(result1).not.toBe(result2) // Different reference = cache invalidated
    })

    it('should invalidate cache when sorting changes', () => {
      const store = usePhotoStore.getState()

      const result1 = store.getFilteredPhotos()

      store.setSorting('fileName', 'asc')
      const result2 = store.getFilteredPhotos()

      expect(result1).not.toBe(result2)
    })

    it('should invalidate cache when current album changes', () => {
      const store = usePhotoStore.getState()

      const result1 = store.getFilteredPhotos()

      store.setCurrentAlbum('album-1')
      const result2 = store.getFilteredPhotos()

      expect(result1).not.toBe(result2)
    })

    it('should invalidate cache when photos change', () => {
      const store = usePhotoStore.getState()

      const result1 = store.getFilteredPhotos()

      store.addPhoto({
        id: 'photo-4',
        projectId: 'project-1',
        albumId: 'album-1',
        fileName: 'new-photo.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        thumbnailUrl: '/thumb/4.jpg',
        originalUrl: '/orig/4.jpg',
        uploadedBy: 'user-1',
        uploadedAt: new Date(),
        metadata: {}
      })

      const result2 = store.getFilteredPhotos()

      expect(result1).not.toBe(result2)
    })

    it('should generate different cache keys for different filter combinations', () => {
      const store = usePhotoStore.getState()

      // Get first result
      store.setFilters({ searchQuery: 'test1' })
      const result1 = store.getFilteredPhotos()

      // Change filters
      store.setFilters({ searchQuery: 'test2' })
      const result2 = store.getFilteredPhotos()

      // Change back to first filters
      store.setFilters({ searchQuery: 'test1' })
      const result3 = store.getFilteredPhotos()

      expect(result1).not.toBe(result2)
      expect(result1).not.toBe(result3) // Cache doesn't persist across filter changes
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty photos array', () => {
      const store = usePhotoStore.getState()

      store.setPhotos([])
      const filtered = store.getFilteredPhotos()

      expect(filtered).toEqual([])
    })

    it('should handle photos without metadata', () => {
      const photoWithoutMetadata: Photo = {
        id: 'photo-no-meta',
        projectId: 'project-1',
        albumId: 'album-1',
        fileName: 'no-meta.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        thumbnailUrl: '/thumb/no-meta.jpg',
        originalUrl: '/orig/no-meta.jpg',
        uploadedBy: 'user-1',
        uploadedAt: new Date(),
        metadata: {}
      }

      const store = usePhotoStore.getState()
      store.setPhotos([photoWithoutMetadata])

      store.setFilters({ searchQuery: 'no-meta' })
      const filtered = store.getFilteredPhotos()

      expect(filtered).toHaveLength(1)
    })

    it('should handle photos with undefined metadata fields', () => {
      const photoWithUndefinedMeta: Photo = {
        id: 'photo-undefined-meta',
        projectId: 'project-1',
        albumId: 'album-1',
        fileName: 'undefined-meta.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        thumbnailUrl: '/thumb/undefined-meta.jpg',
        originalUrl: '/orig/undefined-meta.jpg',
        uploadedBy: 'user-1',
        uploadedAt: new Date(),
        metadata: {
          description: undefined,
          tags: undefined
        }
      }

      const store = usePhotoStore.getState()
      store.setPhotos([photoWithUndefinedMeta])

      // Should not throw error
      const filtered = store.getFilteredPhotos()
      expect(filtered).toHaveLength(1)
    })
  })
})