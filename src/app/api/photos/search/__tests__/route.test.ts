import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { PhotoSearchService } from '@/lib/services/photo-search-service';

// Mock the PhotoSearchService
vi.mock('@/lib/services/photo-search-service');
const mockSearchService = vi.mocked(PhotoSearchService);

describe('/api/photos/search - Photo Search API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/photos/search', () => {
    it('should perform basic search with query parameter', async () => {
      const mockSearchResults = {
        photos: [
          {
            id: 'photo1',
            filename: 'test.jpg',
            album_id: 'album1',
            uploaded_by: 'user1',
            uploaded_at: '2024-01-01T00:00:00.000Z',
            file_size: 1024000,
            metadata: { exif: { camera: 'Canon' } },
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
        searchInfo: {
          query: 'test',
          executionTime: 50,
          cacheHit: false,
        },
      };

      mockSearchService.search.mockResolvedValue(mockSearchResults);

      const url = new URL('http://localhost:3000/api/photos/search?q=test');
      const request = new NextRequest(url);

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual(mockSearchResults);
      expect(mockSearchService.search).toHaveBeenCalledWith({
        query: 'test',
        page: 1,
        limit: 20,
        userId: undefined,
        projectId: undefined,
      });
    });

    it('should handle advanced search with multiple filters', async () => {
      const mockAdvancedResults = {
        photos: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        searchInfo: { query: '', executionTime: 25, cacheHit: true },
      };

      mockSearchService.advancedSearch.mockResolvedValue(mockAdvancedResults);

      const url = new URL(
        'http://localhost:3000/api/photos/search?advanced=true&dateFrom=2024-01-01&dateTo=2024-12-31&fileType=jpg&tags=nature,landscape&camera=Canon&minSize=1000000&maxSize=10000000'
      );
      const request = new NextRequest(url);

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual(mockAdvancedResults);
      expect(mockSearchService.advancedSearch).toHaveBeenCalledWith({
        filters: {
          dateFrom: '2024-01-01',
          dateTo: '2024-12-31',
          fileType: 'jpg',
          tags: ['nature', 'landscape'],
          camera: 'Canon',
          minSize: 1000000,
          maxSize: 10000000,
        },
        page: 1,
        limit: 20,
        userId: undefined,
        projectId: undefined,
      });
    });

    it('should handle pagination parameters', async () => {
      const mockResults = {
        photos: [],
        pagination: { page: 2, limit: 50, total: 100, totalPages: 2 },
        searchInfo: { query: 'test', executionTime: 30, cacheHit: false },
      };

      mockSearchService.search.mockResolvedValue(mockResults);

      const url = new URL(
        'http://localhost:3000/api/photos/search?q=test&page=2&limit=50'
      );
      const request = new NextRequest(url);

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(50);
      expect(mockSearchService.search).toHaveBeenCalledWith({
        query: 'test',
        page: 2,
        limit: 50,
        userId: undefined,
        projectId: undefined,
      });
    });

    it('should handle sorting parameters', async () => {
      const mockResults = {
        photos: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        searchInfo: { query: '', executionTime: 20, cacheHit: false },
      };

      mockSearchService.search.mockResolvedValue(mockResults);

      const url = new URL(
        'http://localhost:3000/api/photos/search?sortBy=uploaded_at&sortOrder=desc'
      );
      const request = new NextRequest(url);

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(mockSearchService.search).toHaveBeenCalledWith({
        query: '',
        page: 1,
        limit: 20,
        sortBy: 'uploaded_at',
        sortOrder: 'desc',
        userId: undefined,
        projectId: undefined,
      });
    });

    it('should handle GPS radius search', async () => {
      const mockResults = {
        photos: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        searchInfo: { query: '', executionTime: 40, cacheHit: false },
      };

      mockSearchService.advancedSearch.mockResolvedValue(mockResults);

      const url = new URL(
        'http://localhost:3000/api/photos/search?advanced=true&lat=40.7128&lng=-74.0060&radius=1000'
      );
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockSearchService.advancedSearch).toHaveBeenCalledWith({
        filters: {
          gpsLocation: {
            lat: 40.7128,
            lng: -74.006,
            radius: 1000,
          },
        },
        page: 1,
        limit: 20,
        userId: undefined,
        projectId: undefined,
      });
    });

    it('should handle user and project filters', async () => {
      const mockResults = {
        photos: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        searchInfo: { query: 'test', executionTime: 35, cacheHit: false },
      };

      mockSearchService.search.mockResolvedValue(mockResults);

      const url = new URL(
        'http://localhost:3000/api/photos/search?q=test&userId=user123&projectId=proj456'
      );
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockSearchService.search).toHaveBeenCalledWith({
        query: 'test',
        page: 1,
        limit: 20,
        userId: 'user123',
        projectId: 'proj456',
      });
    });

    it('should handle service errors gracefully', async () => {
      mockSearchService.search.mockRejectedValue(
        new Error('Database connection failed')
      );

      const url = new URL('http://localhost:3000/api/photos/search?q=test');
      const request = new NextRequest(url);

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Search failed');
      expect(result.details).toBe('Database connection failed');
    });

    it('should validate pagination limits', async () => {
      const url = new URL(
        'http://localhost:3000/api/photos/search?q=test&limit=1000'
      );
      const request = new NextRequest(url);

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Invalid pagination parameters');
    });

    it('should handle empty search queries', async () => {
      const mockResults = {
        photos: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        searchInfo: { query: '', executionTime: 10, cacheHit: true },
      };

      mockSearchService.search.mockResolvedValue(mockResults);

      const url = new URL('http://localhost:3000/api/photos/search');
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockSearchService.search).toHaveBeenCalledWith({
        query: '',
        page: 1,
        limit: 20,
        userId: undefined,
        projectId: undefined,
      });
    });

    it('should handle malformed GPS coordinates', async () => {
      const url = new URL(
        'http://localhost:3000/api/photos/search?advanced=true&lat=invalid&lng=-74.0060&radius=1000'
      );
      const request = new NextRequest(url);

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Invalid GPS coordinates');
    });

    it('should handle tag array parsing', async () => {
      const mockResults = {
        photos: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        searchInfo: { query: '', executionTime: 25, cacheHit: false },
      };

      mockSearchService.advancedSearch.mockResolvedValue(mockResults);

      const url = new URL(
        'http://localhost:3000/api/photos/search?advanced=true&tags=nature,landscape,photography'
      );
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockSearchService.advancedSearch).toHaveBeenCalledWith({
        filters: {
          tags: ['nature', 'landscape', 'photography'],
        },
        page: 1,
        limit: 20,
        userId: undefined,
        projectId: undefined,
      });
    });
  });
});
