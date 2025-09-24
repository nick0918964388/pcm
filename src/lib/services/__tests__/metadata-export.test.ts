import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetadataExportService } from '../metadata-export-service';
import { OraclePhotoRepository } from '@/lib/repositories/oracle-photo-repository';
import { OracleAlbumRepository } from '@/lib/repositories/oracle-album-repository';

// Mock dependencies
vi.mock('@/lib/repositories/oracle-photo-repository');
vi.mock('@/lib/repositories/oracle-album-repository');

describe('MetadataExportService', () => {
  let service: MetadataExportService;
  let mockPhotoRepository: any;
  let mockAlbumRepository: any;

  beforeEach(() => {
    mockPhotoRepository = {
      findByIds: vi.fn(),
      findByAlbum: vi.fn(),
      findByProject: vi.fn(),
      getStatistics: vi.fn(),
    };

    mockAlbumRepository = {
      findById: vi.fn(),
      findByProject: vi.fn(),
    };

    vi.mocked(OraclePhotoRepository).getRepository = vi
      .fn()
      .mockResolvedValue(mockPhotoRepository);
    vi.mocked(OracleAlbumRepository).getRepository = vi
      .fn()
      .mockResolvedValue(mockAlbumRepository);

    service = new MetadataExportService();
  });

  describe('exportToJSON', () => {
    it('should export photo metadata to JSON format', async () => {
      const mockPhotos = [
        {
          id: 'photo1',
          fileName: 'test1.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          width: 1920,
          height: 1080,
          tags: ['landscape', 'nature'],
          metadata: {
            exif: {
              make: 'Canon',
              model: 'EOS R5',
              dateTime: '2024-01-01T10:00:00Z',
            },
          },
          uploadedBy: 'user1',
          uploadedAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'photo2',
          fileName: 'test2.jpg',
          fileSize: 2048000,
          mimeType: 'image/jpeg',
          width: 2560,
          height: 1440,
          tags: ['portrait'],
          metadata: {
            exif: {
              make: 'Nikon',
              model: 'Z9',
              dateTime: '2024-01-02T14:00:00Z',
            },
          },
          uploadedBy: 'user2',
          uploadedAt: new Date('2024-01-02T14:00:00Z'),
        },
      ];

      mockPhotoRepository.findByIds.mockResolvedValue(mockPhotos);

      const result = await service.exportToJSON(['photo1', 'photo2']);

      expect(result).toBeDefined();
      expect(result.format).toBe('json');
      const content = JSON.parse(result.content as string);
      expect(content).toHaveLength(2);
      expect(content[0].fileName).toBe('test1.jpg');
      expect(content[1].fileName).toBe('test2.jpg');
      expect(result.contentType).toBe('application/json');
      expect(result.fileName).toMatch(/^photo-metadata-\d+-\.json$/);
    });

    it('should handle empty photo list', async () => {
      mockPhotoRepository.findByIds.mockResolvedValue([]);

      const result = await service.exportToJSON([]);

      expect(result.content).toBe('[]');
    });
  });

  describe('exportToCSV', () => {
    it('should export photo metadata to CSV format', async () => {
      const mockPhotos = [
        {
          id: 'photo1',
          fileName: 'test1.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          width: 1920,
          height: 1080,
          tags: ['landscape', 'nature'],
          uploadedBy: 'user1',
          uploadedAt: new Date('2024-01-01T10:00:00Z'),
          albumId: 'album1',
        },
      ];

      mockPhotoRepository.findByIds.mockResolvedValue(mockPhotos);

      const result = await service.exportToCSV(['photo1']);

      expect(result).toBeDefined();
      expect(result.format).toBe('csv');
      expect(result.content).toContain(
        'ID,File Name,File Size,Type,Width,Height,Tags,Uploaded By,Uploaded At,Album ID'
      );
      expect(result.content).toContain(
        'photo1,test1.jpg,1024000,image/jpeg,1920,1080,"landscape,nature",user1,2024-01-01T10:00:00.000Z,album1'
      );
      expect(result.contentType).toBe('text/csv');
      expect(result.fileName).toMatch(/^photo-metadata-\d+-\.csv$/);
    });

    it('should handle special characters in CSV', async () => {
      const mockPhotos = [
        {
          id: 'photo1',
          fileName: 'test,"quoted".jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          width: 1920,
          height: 1080,
          tags: ['tag with, comma'],
          uploadedBy: 'user1',
          uploadedAt: new Date('2024-01-01T10:00:00Z'),
        },
      ];

      mockPhotoRepository.findByIds.mockResolvedValue(mockPhotos);

      const result = await service.exportToCSV(['photo1']);

      expect(result.content).toContain('"test,""quoted"".jpg"');
      expect(result.content).toContain('"tag with, comma"');
    });
  });

  describe('exportToExcel', () => {
    it('should export photo metadata to Excel format', async () => {
      const mockPhotos = [
        {
          id: 'photo1',
          fileName: 'test1.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          width: 1920,
          height: 1080,
          tags: ['landscape'],
          uploadedBy: 'user1',
          uploadedAt: new Date('2024-01-01T10:00:00Z'),
        },
      ];

      mockPhotoRepository.findByIds.mockResolvedValue(mockPhotos);

      const result = await service.exportToExcel(['photo1']);

      expect(result).toBeDefined();
      expect(result.format).toBe('xlsx');
      expect(result.content).toBeInstanceOf(Buffer);
      expect(result.contentType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(result.fileName).toMatch(/^photo-metadata-\d+-\.xlsx$/);
    });

    it('should create multiple sheets for large datasets', async () => {
      const mockPhotos = Array.from({ length: 2000 }, (_, i) => ({
        id: `photo${i}`,
        fileName: `test${i}.jpg`,
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        tags: [],
        uploadedBy: 'user1',
        uploadedAt: new Date(),
      }));

      mockPhotoRepository.findByIds.mockResolvedValue(mockPhotos);

      const result = await service.exportToExcel(mockPhotos.map(p => p.id));

      expect(result).toBeDefined();
      expect(result.sheets).toBeGreaterThan(1);
    });
  });

  describe('generateStatisticsReport', () => {
    it('should generate photo statistics report', async () => {
      const mockStatistics = {
        totalPhotos: 1000,
        totalFileSize: 5368709120, // 5GB
        averageFileSize: 5368709,
        photosByType: {
          'image/jpeg': 800,
          'image/png': 150,
          'image/webp': 50,
        },
        photosByMonth: {
          '2024-01': 100,
          '2024-02': 150,
          '2024-03': 200,
        },
        topUploaders: [
          { userId: 'user1', count: 300 },
          { userId: 'user2', count: 250 },
        ],
        topTags: [
          { tag: 'landscape', count: 200 },
          { tag: 'portrait', count: 150 },
        ],
        averageResolution: {
          width: 2048,
          height: 1536,
        },
      };

      mockPhotoRepository.getStatistics.mockResolvedValue(mockStatistics);

      const result = await service.generateStatisticsReport('project1');

      expect(result).toBeDefined();
      expect(result.summary.totalPhotos).toBe(1000);
      expect(result.summary.totalSize).toBe('5.00 GB');
      expect(result.summary.averageSize).toBe('5.12 MB');
      expect(result.typeDistribution['image/jpeg']).toBe(800);
      expect(result.topUploaders[0].userId).toBe('user1');
      expect(result.topTags[0].tag).toBe('landscape');
      expect(result.monthlyTrend['2024-01']).toBe(100);
    });

    it('should handle empty statistics', async () => {
      mockPhotoRepository.getStatistics.mockResolvedValue({
        totalPhotos: 0,
        totalFileSize: 0,
        averageFileSize: 0,
        photosByType: {},
        photosByMonth: {},
        topUploaders: [],
        topTags: [],
      });

      const result = await service.generateStatisticsReport('project1');

      expect(result.summary.totalPhotos).toBe(0);
      expect(result.summary.totalSize).toBe('0 B');
    });
  });

  describe('exportAlbumMetadata', () => {
    it('should export all photos metadata from an album', async () => {
      const mockAlbum = {
        id: 'album1',
        name: 'Test Album',
        projectId: 'project1',
        photoCount: 2,
      };

      const mockPhotos = [
        {
          id: 'photo1',
          fileName: 'test1.jpg',
          albumId: 'album1',
        },
        {
          id: 'photo2',
          fileName: 'test2.jpg',
          albumId: 'album1',
        },
      ];

      mockAlbumRepository.findById.mockResolvedValue(mockAlbum);
      mockPhotoRepository.findByAlbum.mockResolvedValue(mockPhotos);

      const result = await service.exportAlbumMetadata('album1', 'json');

      expect(result).toBeDefined();
      expect(result.albumInfo.name).toBe('Test Album');
      expect(result.photos).toHaveLength(2);
    });
  });

  describe('exportProjectMetadata', () => {
    it('should export all photos metadata from a project', async () => {
      const mockAlbums = [
        { id: 'album1', name: 'Album 1', projectId: 'project1' },
        { id: 'album2', name: 'Album 2', projectId: 'project1' },
      ];

      const mockPhotos = [
        { id: 'photo1', albumId: 'album1' },
        { id: 'photo2', albumId: 'album1' },
        { id: 'photo3', albumId: 'album2' },
      ];

      mockAlbumRepository.findByProject.mockResolvedValue(mockAlbums);
      mockPhotoRepository.findByProject.mockResolvedValue(mockPhotos);

      const result = await service.exportProjectMetadata('project1', 'csv');

      expect(result).toBeDefined();
      expect(result.projectId).toBe('project1');
      expect(result.albums).toHaveLength(2);
      expect(result.totalPhotos).toBe(3);
    });
  });

  describe('customMetadataFields', () => {
    it('should support custom metadata field management', async () => {
      const customFields = {
        location: 'string',
        eventName: 'string',
        photographer: 'string',
        copyright: 'string',
        rating: 'number',
        isPublic: 'boolean',
      };

      await service.defineCustomFields(customFields);

      const mockPhotos = [
        {
          id: 'photo1',
          fileName: 'test.jpg',
          customMetadata: {
            location: 'Taiwan',
            eventName: 'Company Event',
            photographer: 'John Doe',
            rating: 5,
          },
        },
      ];

      mockPhotoRepository.findByIds.mockResolvedValue(mockPhotos);

      const result = await service.exportWithCustomFields(['photo1']);

      expect(result.fields).toContain('location');
      expect(result.fields).toContain('eventName');
      expect(result.data[0].customMetadata.location).toBe('Taiwan');
    });

    it('should validate custom field types', async () => {
      const invalidFields = {
        field1: 'invalid_type',
      };

      await expect(service.defineCustomFields(invalidFields)).rejects.toThrow(
        'Invalid field type'
      );
    });
  });

  describe('batchExport', () => {
    it('should handle batch export with progress callback', async () => {
      const photoIds = Array.from({ length: 100 }, (_, i) => `photo${i}`);
      const progressCallback = vi.fn();

      const mockPhotos = photoIds.map(id => ({
        id,
        fileName: `${id}.jpg`,
      }));

      mockPhotoRepository.findByIds.mockImplementation(async ids => {
        // Simulate batch processing
        return mockPhotos.filter(p => ids.includes(p.id));
      });

      const result = await service.batchExport(photoIds, {
        format: 'json',
        batchSize: 10,
        onProgress: progressCallback,
      });

      expect(result).toBeDefined();
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          processed: expect.any(Number),
          total: 100,
          percentage: expect.any(Number),
        })
      );
    });
  });

  describe('formatBytes', () => {
    it('should format file sizes correctly', () => {
      expect(service.formatBytes(0)).toBe('0 B');
      expect(service.formatBytes(1024)).toBe('1.00 KB');
      expect(service.formatBytes(1048576)).toBe('1.00 MB');
      expect(service.formatBytes(1073741824)).toBe('1.00 GB');
    });
  });
});
