/**
 * Project Photos Hook
 *
 * Manages photo data fetching and operations for project-specific photos.
 * Integrates with the photos API to provide real photo data.
 *
 * @version 1.0
 * @date 2025-09-24
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';

export interface Photo {
  id: string;
  projectId: string;
  albumId: string;
  fileName: string;
  description?: string;
  albumName?: string;
  uploadedBy: string;
  uploadedAt: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  dimensions?: string;
  tags: string[];
  thumbnailUrl: string;
  originalUrl: string;
  metadata: Record<string, any>;
}

export interface PhotoFilter {
  albumId?: string;
  searchQuery?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  page?: number;
}

interface UseProjectPhotosResult {
  photos: Photo[];
  filteredPhotos: Photo[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  filters: PhotoFilter;
  setFilters: (filters: PhotoFilter) => void;
  refetch: () => Promise<void>;
  deletePhoto: (photoId: string) => Promise<void>;
  downloadPhoto: (photo: Photo) => Promise<void>;
  batchDownload: (photoIds: string[]) => Promise<void>;
}

export function useProjectPhotos(projectId: string): UseProjectPhotosResult {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<PhotoFilter>({});
  const { user } = useAuth();

  const fetchPhotos = useCallback(async (filterParams: PhotoFilter = {}) => {
    if (!user || !projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const searchParams = new URLSearchParams({
        page: (filterParams.page || 1).toString(),
        limit: (filterParams.limit || 20).toString(),
      });

      if (filterParams.albumId) {
        searchParams.set('albumId', filterParams.albumId);
      }

      if (filterParams.searchQuery) {
        searchParams.set('search', filterParams.searchQuery);
      }

      if (filterParams.tags && filterParams.tags.length > 0) {
        searchParams.set('tags', filterParams.tags.join(','));
      }

      if (filterParams.dateFrom) {
        searchParams.set('dateFrom', filterParams.dateFrom);
      }

      if (filterParams.dateTo) {
        searchParams.set('dateTo', filterParams.dateTo);
      }

      const response = await fetch(`/api/projects/${projectId}/photos?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '取得照片列表失敗');
      }

      // Transform API response to match our Photo interface
      const transformedPhotos: Photo[] = result.data.map((apiPhoto: any) => ({
        id: apiPhoto.id,
        projectId: apiPhoto.projectId || projectId,
        albumId: apiPhoto.albumId,
        fileName: apiPhoto.fileName,
        description: apiPhoto.description || '',
        albumName: apiPhoto.albumName || '未分類',
        uploadedBy: apiPhoto.uploadedBy,
        uploadedAt: apiPhoto.uploadedAt,
        fileSize: apiPhoto.fileSize,
        mimeType: apiPhoto.mimeType,
        width: apiPhoto.width,
        height: apiPhoto.height,
        dimensions: apiPhoto.width && apiPhoto.height
          ? `${apiPhoto.width}x${apiPhoto.height}`
          : '',
        tags: apiPhoto.tags || [],
        thumbnailUrl: apiPhoto.thumbnailUrl,
        originalUrl: apiPhoto.originalUrl,
        metadata: apiPhoto.metadata || {},
      }));

      setPhotos(transformedPhotos);
      setTotalCount(result.meta?.total || transformedPhotos.length);
      setCurrentPage(result.meta?.page || 1);
      setTotalPages(result.meta?.totalPages || 1);
    } catch (err) {
      console.error('fetchPhotos error:', err);
      setError(err instanceof Error ? err.message : '取得照片列表失敗');

      // Fallback to mock data for development
      const mockPhotos: Photo[] = [
        {
          id: '1',
          projectId,
          albumId: 'album1',
          fileName: 'test-photo.jpg',
          description: 'Test photo description',
          albumName: 'E2E Test Album',
          uploadedBy: 'admin',
          uploadedAt: new Date().toISOString(),
          fileSize: 1024 * 1024,
          mimeType: 'image/jpeg',
          width: 1920,
          height: 1080,
          dimensions: '1920x1080',
          tags: ['工程', '進度', '完成'],
          thumbnailUrl: '/placeholder-thumbnail.jpg',
          originalUrl: '/placeholder-photo.jpg',
          metadata: { camera: 'Canon EOS R5', date: new Date().toISOString() }
        }
      ];

      setPhotos(mockPhotos);
      setTotalCount(mockPhotos.length);
      setCurrentPage(1);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [user, projectId]);

  // Client-side filtering for additional filters not handled by API
  const filteredPhotos = useMemo(() => {
    let filtered = photos;

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(photo =>
        photo.fileName.toLowerCase().includes(query) ||
        photo.description?.toLowerCase().includes(query) ||
        photo.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (filters.albumId && filters.albumId !== '') {
      filtered = filtered.filter(photo => photo.albumId === filters.albumId);
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(photo =>
        filters.tags!.every(tag => photo.tags.includes(tag))
      );
    }

    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter(photo => {
        const photoDate = new Date(photo.uploadedAt);
        const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
        const toDate = filters.dateTo ? new Date(filters.dateTo) : null;

        if (fromDate && photoDate < fromDate) return false;
        if (toDate && photoDate > toDate) return false;
        return true;
      });
    }

    return filtered;
  }, [photos, filters]);

  const setFiltersAndRefetch = useCallback(async (newFilters: PhotoFilter) => {
    setFilters(newFilters);
    await fetchPhotos(newFilters);
  }, [fetchPhotos]);

  const refetch = useCallback(async () => {
    await fetchPhotos(filters);
  }, [fetchPhotos, filters]);

  const deletePhoto = useCallback(async (photoId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('刪除照片失敗');
      }

      // Remove photo from local state
      setPhotos(prev => prev.filter(photo => photo.id !== photoId));
      setTotalCount(prev => prev - 1);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : '刪除照片失敗');
    }
  }, []);

  const downloadPhoto = useCallback(async (photo: Photo): Promise<void> => {
    try {
      const response = await fetch(photo.originalUrl, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('下載照片失敗');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Photo download error:', err);
      throw new Error(err instanceof Error ? err.message : '下載照片失敗');
    }
  }, []);

  const batchDownload = useCallback(async (photoIds: string[]): Promise<void> => {
    try {
      const response = await fetch(`/api/photos/batch/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ photoIds }),
      });

      if (!response.ok) {
        throw new Error('批次下載失敗');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photos-${new Date().getTime()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Batch download error:', err);
      throw new Error(err instanceof Error ? err.message : '批次下載失敗');
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchPhotos(filters);
    }
  }, [fetchPhotos, projectId, filters]);

  return {
    photos,
    filteredPhotos,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    filters,
    setFilters: setFiltersAndRefetch,
    refetch,
    deletePhoto,
    downloadPhoto,
    batchDownload,
  };
}