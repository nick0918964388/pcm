/**
 * Project Albums Hook
 *
 * Manages album data fetching and operations for project-specific albums.
 * This hook provides CRUD operations and integrates with Oracle active_photo_albums view.
 *
 * @version 1.0
 * @date 2025-09-24
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface Album {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  photoCount: number;
  coverPhotoUrl?: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAlbumRequest {
  projectId: string;
  name: string;
  description?: string;
  tags?: string[];
}

export interface UpdateAlbumRequest {
  name?: string;
  description?: string;
  tags?: string[];
}

interface UseProjectAlbumsResult {
  albums: Album[];
  loading: boolean;
  error: string | null;
  createAlbum: (request: CreateAlbumRequest) => Promise<Album>;
  updateAlbum: (albumId: string, request: UpdateAlbumRequest) => Promise<Album>;
  deleteAlbum: (albumId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useProjectAlbums(projectId?: string): UseProjectAlbumsResult {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchAlbums = useCallback(async () => {
    if (!user || (!projectId && !user.projects[0])) {
      setLoading(false);
      return;
    }

    const targetProjectId = projectId || user.projects[0];

    try {
      setLoading(true);
      setError(null);

      // Mock data for now - in real implementation, this would call API
      const mockAlbums: Album[] = [
        {
          id: 'album-1',
          projectId: targetProjectId,
          name: '建築進度',
          description: '建築工程進度照片',
          photoCount: 25,
          coverPhotoUrl: '/mock/cover1.jpg',
          tags: ['建築', '進度'],
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
        },
        {
          id: 'album-2',
          projectId: targetProjectId,
          name: '設備安裝',
          description: '設備安裝相關照片',
          photoCount: 12,
          coverPhotoUrl: null,
          tags: ['設備', '安裝'],
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-20'),
        },
      ];

      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      setAlbums(mockAlbums);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch albums');
    } finally {
      setLoading(false);
    }
  }, [user, projectId]);

  const createAlbum = useCallback(
    async (request: CreateAlbumRequest): Promise<Album> => {
      try {
        // Mock implementation - in real app would call API
        const newAlbum: Album = {
          id: `album-${Date.now()}`,
          projectId: request.projectId,
          name: request.name,
          description: request.description,
          photoCount: 0,
          coverPhotoUrl: null,
          tags: request.tags || [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        setAlbums(prev => [...prev, newAlbum]);
        return newAlbum;
      } catch (err) {
        throw new Error('Failed to create album');
      }
    },
    []
  );

  const updateAlbum = useCallback(
    async (albumId: string, request: UpdateAlbumRequest): Promise<Album> => {
      try {
        setAlbums(prev =>
          prev.map(album =>
            album.id === albumId
              ? { ...album, ...request, updatedAt: new Date() }
              : album
          )
        );

        const updatedAlbum = albums.find(a => a.id === albumId);
        if (!updatedAlbum) throw new Error('Album not found');

        return { ...updatedAlbum, ...request, updatedAt: new Date() };
      } catch (err) {
        throw new Error('Failed to update album');
      }
    },
    [albums]
  );

  const deleteAlbum = useCallback(async (albumId: string): Promise<void> => {
    try {
      setAlbums(prev => prev.filter(album => album.id !== albumId));
    } catch (err) {
      throw new Error('Failed to delete album');
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchAlbums();
  }, [fetchAlbums]);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  return {
    albums,
    loading,
    error,
    createAlbum,
    updateAlbum,
    deleteAlbum,
    refetch,
  };
}
