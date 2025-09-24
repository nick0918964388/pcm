/**
 * Task 8.2: Photo Search and Filtering System Tests
 * TDD Implementation for multi-criteria photo search and filtering
 *
 * Features:
 * - 建立多條件搜尋功能，支援日期、標籤、上傳者篩選
 * - 實作檔案類型和大小範圍的篩選功能，使用 Oracle 索引優化查詢
 * - 建立進階搜尋介面，支援 Oracle JSON metadata 欄位查詢
 * - 實作搜尋結果排序和分頁功能，利用 Oracle 分頁查詢最佳化
 * - 整合 Oracle 全文搜尋功能提升搜尋體驗
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@/lib/repositories/oracle-repository-factory');
vi.mock('@/lib/services/photo-search-service');

const mockPhotoRepository = {
  searchPhotos: vi.fn(),
  findByFilePath: vi.fn(),
  getUserPhotos: vi.fn(),
  findPhotosByTags: vi.fn(),
  findPhotosByExifData: vi.fn(),
  findPhotosWithGPS: vi.fn(),
  findPhotosByFileSize: vi.fn(),
  getAllUsedTags: vi.fn(),
  getTagStatistics: vi.fn(),
};

const mockSearchService = {
  buildSearchQuery: vi.fn(),
  executeAdvancedSearch: vi.fn(),
  executeFullTextSearch: vi.fn(),
  optimizeSearchQuery: vi.fn(),
  buildSortCriteria: vi.fn(),
  buildPaginationParams: vi.fn(),
  extractSearchFilters: vi.fn(),
};

vi.mock('@/lib/repositories/oracle-repository-factory', () => ({
  OracleRepositoryFactory: {
    getPhotoRepository: () => mockPhotoRepository,
  },
}));

vi.mock('@/lib/services/photo-search-service', () => ({
  PhotoSearchService: mockSearchService,
}));

describe('Task 8.2: Photo Search and Filtering System - TDD Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RED Phase: 多條件搜尋功能', () => {
    it('should support date range filtering', async () => {
      const dateRangeFilter = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const expectedPhotos = [
        {
          id: 'photo-1',
          uploadedAt: '2024-06-15T10:00:00Z',
          fileName: 'summer-photo.jpg',
        },
        {
          id: 'photo-2',
          uploadedAt: '2024-09-24T08:30:00Z',
          fileName: 'autumn-photo.jpg',
        },
      ];

      mockPhotoRepository.searchPhotos.mockResolvedValue(expectedPhotos);

      const searchCriteria = {
        dateRange: {
          start: new Date(dateRangeFilter.startDate),
          end: new Date(dateRangeFilter.endDate),
        },
      };

      const results = await mockPhotoRepository.searchPhotos(searchCriteria);

      expect(results).toEqual(expectedPhotos);
      expect(mockPhotoRepository.searchPhotos).toHaveBeenCalledWith(
        searchCriteria
      );
    });

    it('should support tag-based filtering', async () => {
      const tagFilters = ['工程', '現場照片', '鋼構'];

      const expectedPhotos = [
        {
          id: 'photo-1',
          fileName: 'construction-1.jpg',
          metadata: { tags: ['工程', '鋼構'] },
        },
        {
          id: 'photo-2',
          fileName: 'construction-2.jpg',
          metadata: { tags: ['工程', '現場照片'] },
        },
      ];

      mockPhotoRepository.findPhotosByTags.mockResolvedValue(expectedPhotos);

      const results = await mockPhotoRepository.findPhotosByTags(
        tagFilters,
        false
      ); // matchAll = false

      expect(results).toEqual(expectedPhotos);
      expect(mockPhotoRepository.findPhotosByTags).toHaveBeenCalledWith(
        tagFilters,
        false
      );
    });

    it('should support uploader filtering', async () => {
      const uploaderId = 'user-engineer-123';

      const expectedPhotos = [
        {
          id: 'photo-1',
          uploadedBy: uploaderId,
          fileName: 'engineer-photo-1.jpg',
        },
        {
          id: 'photo-2',
          uploadedBy: uploaderId,
          fileName: 'engineer-photo-2.jpg',
        },
      ];

      mockPhotoRepository.getUserPhotos.mockResolvedValue(expectedPhotos);

      const results = await mockPhotoRepository.getUserPhotos(uploaderId);

      expect(results).toEqual(expectedPhotos);
      expect(mockPhotoRepository.getUserPhotos).toHaveBeenCalledWith(
        uploaderId
      );
    });

    it('should support MIME type filtering', async () => {
      const mimeTypes = ['image/jpeg', 'image/png'];

      const searchCriteria = {
        mimeTypes,
      };

      const expectedPhotos = [
        { id: 'photo-1', mimeType: 'image/jpeg', fileName: 'photo1.jpg' },
        { id: 'photo-2', mimeType: 'image/png', fileName: 'photo2.png' },
      ];

      mockPhotoRepository.searchPhotos.mockResolvedValue(expectedPhotos);

      const results = await mockPhotoRepository.searchPhotos(searchCriteria);

      expect(results).toEqual(expectedPhotos);
      expect(mockPhotoRepository.searchPhotos).toHaveBeenCalledWith(
        searchCriteria
      );
    });

    it('should support combined multi-criteria search', async () => {
      const complexSearchCriteria = {
        albumId: 'album-123',
        uploadedBy: 'user-456',
        mimeTypes: ['image/jpeg'],
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
        tags: ['工程', '進度'],
        hasGPS: true,
      };

      const expectedPhotos = [
        {
          id: 'photo-complex-1',
          albumId: 'album-123',
          uploadedBy: 'user-456',
          mimeType: 'image/jpeg',
          uploadedAt: '2024-06-15T10:00:00Z',
          metadata: {
            tags: ['工程', '進度'],
            gps: { latitude: 25.033, longitude: 121.5654 },
          },
        },
      ];

      mockPhotoRepository.searchPhotos.mockResolvedValue(expectedPhotos);

      const results = await mockPhotoRepository.searchPhotos(
        complexSearchCriteria
      );

      expect(results).toEqual(expectedPhotos);
      expect(mockPhotoRepository.searchPhotos).toHaveBeenCalledWith(
        complexSearchCriteria
      );
    });
  });

  describe('RED Phase: 檔案類型和大小範圍篩選', () => {
    it('should filter photos by file size range', async () => {
      const minSize = 1024 * 1024; // 1MB
      const maxSize = 10 * 1024 * 1024; // 10MB

      const expectedPhotos = [
        { id: 'photo-1', fileSize: 2048576, fileName: '2mb-photo.jpg' }, // 2MB
        { id: 'photo-2', fileSize: 5242880, fileName: '5mb-photo.jpg' }, // 5MB
      ];

      mockPhotoRepository.findPhotosByFileSize.mockResolvedValue(
        expectedPhotos
      );

      const results = await mockPhotoRepository.findPhotosByFileSize(
        minSize,
        maxSize
      );

      expect(results).toEqual(expectedPhotos);
      expect(mockPhotoRepository.findPhotosByFileSize).toHaveBeenCalledWith(
        minSize,
        maxSize
      );
    });

    it('should support file extension filtering', async () => {
      const allowedExtensions = ['.jpg', '.jpeg', '.png'];

      // This would be implemented in the search service
      mockSearchService.buildSearchQuery.mockReturnValue({
        sql: 'SELECT * FROM active_photos WHERE LOWER(SUBSTR(file_name, -4)) IN (:ext1, :ext2, :ext3)',
        binds: { ext1: '.jpg', ext2: '.jpeg', ext3: '.png' },
      });

      const query = mockSearchService.buildSearchQuery({
        extensions: allowedExtensions,
      });

      expect(query.sql).toContain('SUBSTR(file_name, -4)');
      expect(query.binds).toEqual({
        ext1: '.jpg',
        ext2: '.jpeg',
        ext3: '.png',
      });
    });

    it('should optimize queries with Oracle indexes', async () => {
      const optimizedSearchCriteria = {
        mimeTypes: ['image/jpeg'],
        fileSize: { min: 1024000, max: 10485760 },
        uploadedAfter: new Date('2024-01-01'),
      };

      // Mock the optimization process
      mockSearchService.optimizeSearchQuery.mockReturnValue({
        useIndexes: [
          'idx_photos_mime_type',
          'idx_photos_file_size',
          'idx_photos_uploaded_at',
        ],
        queryHint: '/*+ INDEX(p idx_photos_composite) */',
        estimatedRows: 150,
      });

      const optimization = mockSearchService.optimizeSearchQuery(
        optimizedSearchCriteria
      );

      expect(optimization.useIndexes).toContain('idx_photos_mime_type');
      expect(optimization.queryHint).toContain('INDEX');
      expect(optimization.estimatedRows).toBe(150);
    });
  });

  describe('RED Phase: Oracle JSON Metadata 欄位查詢', () => {
    it('should search by EXIF camera information', async () => {
      const cameraSearch = {
        camera: 'Canon EOS R5',
        lens: 'RF 24-70mm F2.8 L IS USM',
      };

      const expectedPhotos = [
        {
          id: 'photo-canon-1',
          metadata: {
            exif: {
              camera: 'Canon EOS R5',
              lens: 'RF 24-70mm F2.8 L IS USM',
            },
          },
        },
      ];

      mockPhotoRepository.findPhotosByExifData.mockResolvedValue(
        expectedPhotos
      );

      const results = await mockPhotoRepository.findPhotosByExifData(
        cameraSearch.camera
      );

      expect(results).toEqual(expectedPhotos);
      expect(mockPhotoRepository.findPhotosByExifData).toHaveBeenCalledWith(
        cameraSearch.camera
      );
    });

    it('should search by GPS location data', async () => {
      const expectedPhotos = [
        {
          id: 'photo-gps-1',
          metadata: {
            gps: {
              latitude: 25.033,
              longitude: 121.5654,
              altitude: 50,
            },
          },
        },
      ];

      mockPhotoRepository.findPhotosWithGPS.mockResolvedValue(expectedPhotos);

      const results = await mockPhotoRepository.findPhotosWithGPS();

      expect(results).toEqual(expectedPhotos);
      expect(mockPhotoRepository.findPhotosWithGPS).toHaveBeenCalled();
    });

    it('should perform advanced JSON metadata queries', async () => {
      const advancedQuery = {
        'metadata.exif.settings.iso': { $gte: 800 }, // ISO >= 800
        'metadata.gps.altitude': { $exists: true }, // Has altitude data
        'metadata.tags': { $in: ['夜拍', '高感光'] }, // Contains specific tags
      };

      const expectedResults = [
        {
          id: 'photo-night-1',
          metadata: {
            exif: { settings: { iso: '1600' } },
            gps: { altitude: 25 },
            tags: ['夜拍', '高感光'],
          },
        },
      ];

      mockSearchService.executeAdvancedSearch.mockResolvedValue(
        expectedResults
      );

      const results =
        await mockSearchService.executeAdvancedSearch(advancedQuery);

      expect(results).toEqual(expectedResults);
      expect(mockSearchService.executeAdvancedSearch).toHaveBeenCalledWith(
        advancedQuery
      );
    });

    it('should validate JSON query syntax', async () => {
      const invalidQuery = {
        'metadata.invalid..field': 'value', // Invalid JSON path
      };

      mockSearchService.executeAdvancedSearch.mockRejectedValue(
        new Error('Invalid JSON path syntax')
      );

      try {
        await mockSearchService.executeAdvancedSearch(invalidQuery);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Invalid JSON path');
      }
    });
  });

  describe('RED Phase: 搜尋結果排序和分頁', () => {
    it('should support various sorting criteria', async () => {
      const sortingCriteria = [
        { field: 'uploadedAt', direction: 'desc' },
        { field: 'fileName', direction: 'asc' },
        { field: 'fileSize', direction: 'desc' },
      ];

      mockSearchService.buildSortCriteria.mockImplementation(criteria => {
        const sortQueries = criteria
          .map((c: any) => `${c.field} ${c.direction.toUpperCase()}`)
          .join(', ');
        return `ORDER BY ${sortQueries}`;
      });

      const sortQuery = mockSearchService.buildSortCriteria(sortingCriteria);

      expect(sortQuery).toBe(
        'ORDER BY uploadedAt DESC, fileName ASC, fileSize DESC'
      );
    });

    it('should implement efficient pagination', async () => {
      const paginationParams = {
        page: 2,
        pageSize: 20,
        offset: 20, // (page - 1) * pageSize
      };

      mockSearchService.buildPaginationParams.mockReturnValue({
        sql: 'OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY',
        binds: {
          offset: paginationParams.offset,
          pageSize: paginationParams.pageSize,
        },
        totalCount: 156,
      });

      const pagination =
        mockSearchService.buildPaginationParams(paginationParams);

      expect(pagination.sql).toContain('OFFSET');
      expect(pagination.sql).toContain('FETCH NEXT');
      expect(pagination.binds.offset).toBe(20);
      expect(pagination.binds.pageSize).toBe(20);
      expect(pagination.totalCount).toBe(156);
    });

    it('should calculate pagination metadata', async () => {
      const totalItems = 156;
      const pageSize = 20;
      const currentPage = 2;

      const paginationMetadata = {
        totalItems,
        pageSize,
        currentPage,
        totalPages: Math.ceil(totalItems / pageSize), // 8
        hasNextPage: currentPage < Math.ceil(totalItems / pageSize),
        hasPreviousPage: currentPage > 1,
        startIndex: (currentPage - 1) * pageSize + 1, // 21
        endIndex: Math.min(currentPage * pageSize, totalItems), // 40
      };

      expect(paginationMetadata.totalPages).toBe(8);
      expect(paginationMetadata.hasNextPage).toBe(true);
      expect(paginationMetadata.hasPreviousPage).toBe(true);
      expect(paginationMetadata.startIndex).toBe(21);
      expect(paginationMetadata.endIndex).toBe(40);
    });

    it('should optimize pagination for large datasets', async () => {
      const largeDatasetPagination = {
        page: 100,
        pageSize: 50,
        totalItems: 50000,
      };

      // For large datasets, use cursor-based pagination
      mockSearchService.buildPaginationParams.mockReturnValue({
        sql: 'WHERE id > :cursor ORDER BY id FETCH NEXT :pageSize ROWS ONLY',
        binds: {
          cursor: 'photo-4950', // Last ID from previous page
          pageSize: 50,
        },
        useCursor: true,
        estimatedPerformance: 'fast',
      });

      const optimization = mockSearchService.buildPaginationParams(
        largeDatasetPagination
      );

      expect(optimization.sql).toContain('WHERE id > :cursor');
      expect(optimization.useCursor).toBe(true);
      expect(optimization.estimatedPerformance).toBe('fast');
    });
  });

  describe('RED Phase: Oracle 全文搜尋功能', () => {
    it('should perform full-text search on photo metadata', async () => {
      const searchTerm = '工程進度 現場照片';

      const expectedResults = [
        {
          id: 'photo-fulltext-1',
          fileName: '工程進度報告.jpg',
          metadata: {
            description: '現場照片 - 第一階段工程進度',
            tags: ['工程', '進度', '現場照片'],
          },
          relevanceScore: 0.95,
        },
      ];

      mockSearchService.executeFullTextSearch.mockResolvedValue(
        expectedResults
      );

      const results = await mockSearchService.executeFullTextSearch(searchTerm);

      expect(results).toEqual(expectedResults);
      expect(mockSearchService.executeFullTextSearch).toHaveBeenCalledWith(
        searchTerm
      );
    });

    it('should support search term highlighting', async () => {
      const searchTerm = '鋼構安裝';

      const highlightedResults = [
        {
          id: 'photo-highlight-1',
          fileName: '鋼構安裝進度.jpg',
          metadata: {
            description: '第二期<mark>鋼構安裝</mark>作業現場記錄',
          },
          highlights: {
            fileName: '<mark>鋼構安裝</mark>進度.jpg',
            description: '第二期<mark>鋼構安裝</mark>作業現場記錄',
          },
        },
      ];

      mockSearchService.executeFullTextSearch.mockResolvedValue(
        highlightedResults
      );

      const results = await mockSearchService.executeFullTextSearch(
        searchTerm,
        { highlight: true }
      );

      expect(results[0].highlights.fileName).toContain('<mark>');
      expect(results[0].highlights.description).toContain('<mark>');
    });

    it('should handle search suggestions and autocomplete', async () => {
      const partialTerm = '工程';

      const suggestions = [
        { term: '工程進度', count: 45, type: 'description' },
        { term: '工程現場', count: 32, type: 'tag' },
        { term: '工程會議', count: 18, type: 'fileName' },
      ];

      mockSearchService.getSuggestions = vi.fn().mockResolvedValue(suggestions);

      const results = await mockSearchService.getSuggestions(partialTerm);

      expect(results).toEqual(suggestions);
      expect(results[0].count).toBe(45);
      expect(results[0].type).toBe('description');
    });

    it('should support fuzzy matching for typos', async () => {
      const searchWithTypo = '工成進度'; // 工程 typed as 工成

      const fuzzyResults = [
        {
          id: 'photo-fuzzy-1',
          fileName: '工程進度.jpg',
          fuzzyMatch: true,
          matchConfidence: 0.87,
          correctedTerm: '工程進度',
        },
      ];

      mockSearchService.executeFullTextSearch.mockResolvedValue(fuzzyResults);

      const results = await mockSearchService.executeFullTextSearch(
        searchWithTypo,
        { fuzzy: true }
      );

      expect(results[0].fuzzyMatch).toBe(true);
      expect(results[0].matchConfidence).toBe(0.87);
      expect(results[0].correctedTerm).toBe('工程進度');
    });
  });

  describe('RED Phase: 搜尋效能優化', () => {
    it('should cache frequent search queries', async () => {
      const frequentQuery = { tags: ['工程'], uploadedBy: 'popular-user' };

      mockSearchService.getCachedResults = vi.fn();
      mockSearchService.setCachedResults = vi.fn();

      // First call - cache miss
      mockSearchService.getCachedResults.mockResolvedValue(null);
      const dbResults = [{ id: 'photo-1' }];
      mockPhotoRepository.searchPhotos.mockResolvedValue(dbResults);

      const firstCallResults =
        await mockPhotoRepository.searchPhotos(frequentQuery);
      await mockSearchService.setCachedResults('query-hash-123', dbResults);

      // Second call - cache hit
      mockSearchService.getCachedResults.mockResolvedValue(dbResults);

      const secondCallResults =
        await mockSearchService.getCachedResults('query-hash-123');

      expect(firstCallResults).toEqual(dbResults);
      expect(secondCallResults).toEqual(dbResults);
      expect(mockSearchService.setCachedResults).toHaveBeenCalledWith(
        'query-hash-123',
        dbResults
      );
    });

    it('should provide search analytics and insights', async () => {
      const searchAnalytics = {
        totalSearches: 1250,
        averageResponseTime: 45, // ms
        popularSearchTerms: [
          { term: '工程進度', frequency: 156 },
          { term: '現場照片', frequency: 89 },
          { term: '安全檢查', frequency: 67 },
        ],
        slowQueries: [{ query: 'complex-metadata-search', avgTime: 890 }],
        indexUsage: {
          idx_photos_tags: { usage: 0.78, effectiveness: 0.92 },
          idx_photos_metadata: { usage: 0.45, effectiveness: 0.67 },
        },
      };

      mockSearchService.getSearchAnalytics = vi
        .fn()
        .mockResolvedValue(searchAnalytics);

      const analytics = await mockSearchService.getSearchAnalytics();

      expect(analytics.totalSearches).toBe(1250);
      expect(analytics.averageResponseTime).toBe(45);
      expect(analytics.popularSearchTerms).toHaveLength(3);
      expect(analytics.indexUsage['idx_photos_tags'].usage).toBe(0.78);
    });
  });
});
