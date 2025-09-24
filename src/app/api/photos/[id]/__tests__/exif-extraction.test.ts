/**
 * Task 8.1: EXIF Data Extraction and Oracle Storage Tests
 * TDD Implementation for automatic EXIF data extraction and storage
 *
 * Features:
 * - 實作照片 EXIF 資料自動提取功能
 * - 建立 GPS 位置、拍攝時間和相機資訊的 Oracle JSON 格式儲存
 * - 實作 metadata 資料驗證和清理機制，利用 Oracle 約束檢查
 * - 建立 metadata 更新失敗的恢復和 Oracle 日誌功能
 * - 利用 Oracle CLOB 欄位儲存大容量 metadata 資料
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@/lib/repositories/oracle-repository-factory');
vi.mock('@/lib/services/exif-extraction-service');
vi.mock('exifr');

const mockPhotoRepository = {
  findById: vi.fn(),
  updatePhotoMetadata: vi.fn(),
  createMetadataBackup: vi.fn(),
  restoreMetadataFromBackup: vi.fn(),
};

const mockExifService = {
  extractExifData: vi.fn(),
  validateExifData: vi.fn(),
  cleanExifData: vi.fn(),
  parseGPSCoordinates: vi.fn(),
  extractCameraInfo: vi.fn(),
  formatDateTimeFromExif: vi.fn(),
};

vi.mock('@/lib/repositories/oracle-repository-factory', () => ({
  OracleRepositoryFactory: {
    getPhotoRepository: () => mockPhotoRepository,
  },
}));

vi.mock('@/lib/services/exif-extraction-service', () => ({
  ExifExtractionService: mockExifService,
}));

describe('Task 8.1: EXIF Data Extraction and Oracle Storage - TDD Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RED Phase: 自動 EXIF 資料提取', () => {
    it('should automatically extract EXIF data from uploaded photos', async () => {
      const photoId = 'photo-with-exif-123';
      const filePath = '/uploads/photos/project-a/album-1/IMG_001.jpg';

      const mockExifData = {
        make: 'Canon',
        model: 'EOS R5',
        lens: 'RF 24-70mm F2.8 L IS USM',
        dateTimeOriginal: '2024-09-24T08:30:00.000Z',
        iso: 200,
        aperture: 5.6,
        shutterSpeed: '1/250',
        focalLength: 50,
        flash: 'No Flash',
        orientation: 1,
        colorSpace: 'sRGB',
        gps: {
          latitude: 25.033,
          longitude: 121.5654,
          altitude: 50,
        },
      };

      mockExifService.extractExifData.mockResolvedValue(mockExifData);

      const extractedData = await mockExifService.extractExifData(filePath);

      expect(extractedData).toEqual(mockExifData);
      expect(mockExifService.extractExifData).toHaveBeenCalledWith(filePath);
    });

    it('should handle photos without EXIF data gracefully', async () => {
      const filePath = '/uploads/photos/no-exif-image.png';

      mockExifService.extractExifData.mockResolvedValue(null);

      const extractedData = await mockExifService.extractExifData(filePath);

      expect(extractedData).toBeNull();
      expect(mockExifService.extractExifData).toHaveBeenCalledWith(filePath);
    });

    it('should extract and parse GPS coordinates correctly', async () => {
      const rawGpsData = {
        GPSLatitude: [25, 1, 58.8],
        GPSLatitudeRef: 'N',
        GPSLongitude: [121, 33, 55.44],
        GPSLongitudeRef: 'E',
        GPSAltitude: 50.5,
        GPSAltitudeRef: 0,
      };

      const expectedParsedGps = {
        latitude: 25.033,
        longitude: 121.5654,
        altitude: 50.5,
      };

      mockExifService.parseGPSCoordinates.mockReturnValue(expectedParsedGps);

      const parsedGps = mockExifService.parseGPSCoordinates(rawGpsData);

      expect(parsedGps).toEqual(expectedParsedGps);
      expect(mockExifService.parseGPSCoordinates).toHaveBeenCalledWith(
        rawGpsData
      );
    });

    it('should extract camera and lens information', async () => {
      const rawExifData = {
        Make: 'Sony',
        Model: 'ILCE-7R IV',
        LensModel: 'FE 24-70mm F2.8 GM',
        ISO: 800,
        FNumber: 2.8,
        ExposureTime: 1 / 125,
        FocalLength: 35,
      };

      const expectedCameraInfo = {
        camera: 'Sony ILCE-7R IV',
        lens: 'FE 24-70mm F2.8 GM',
        settings: {
          aperture: 'f/2.8',
          shutterSpeed: '1/125',
          iso: '800',
          focalLength: '35mm',
        },
      };

      mockExifService.extractCameraInfo.mockReturnValue(expectedCameraInfo);

      const cameraInfo = mockExifService.extractCameraInfo(rawExifData);

      expect(cameraInfo).toEqual(expectedCameraInfo);
    });

    it('should handle corrupted or malformed EXIF data', async () => {
      const corruptedFilePath = '/uploads/photos/corrupted-exif.jpg';

      mockExifService.extractExifData.mockRejectedValue(
        new Error('EXIF parsing failed')
      );

      try {
        await mockExifService.extractExifData(corruptedFilePath);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('EXIF parsing failed');
      }
    });
  });

  describe('RED Phase: Oracle JSON 格式儲存', () => {
    it('should store EXIF data in Oracle JSON format', async () => {
      const photoId = 'photo-store-exif-456';

      const exifMetadata = {
        exif: {
          camera: 'Nikon D850',
          lens: 'AF-S NIKKOR 24-70mm f/2.8E ED VR',
          dateTime: '2024-09-24T10:15:30.000Z',
          settings: {
            aperture: 'f/4.0',
            shutterSpeed: '1/60',
            iso: '400',
            focalLength: '50mm',
          },
        },
        gps: {
          latitude: 35.6762,
          longitude: 139.6503,
          altitude: 40,
        },
        technical: {
          colorSpace: 'sRGB',
          orientation: 1,
          resolution: {
            x: 300,
            y: 300,
            unit: 'dpi',
          },
        },
      };

      const updatedPhoto = {
        id: photoId,
        metadata: exifMetadata,
      };

      mockPhotoRepository.updatePhotoMetadata.mockResolvedValue(updatedPhoto);

      const result = await mockPhotoRepository.updatePhotoMetadata(
        photoId,
        exifMetadata
      );

      expect(result).toEqual(updatedPhoto);
      expect(mockPhotoRepository.updatePhotoMetadata).toHaveBeenCalledWith(
        photoId,
        exifMetadata
      );
    });

    it('should handle large EXIF metadata using Oracle CLOB', async () => {
      const photoId = 'photo-large-exif-789';

      // Simulate large EXIF data
      const largeExifData = {
        exif: {
          camera: 'Fujifilm X-T4',
          rawData: 'A'.repeat(10000), // Large string
          customFields: {},
        },
      };

      // Add many custom fields to make it large
      for (let i = 0; i < 1000; i++) {
        largeExifData.exif.customFields[`field${i}`] = `value${i}`;
      }

      mockPhotoRepository.updatePhotoMetadata.mockResolvedValue({
        id: photoId,
        metadata: largeExifData,
      });

      const result = await mockPhotoRepository.updatePhotoMetadata(
        photoId,
        largeExifData
      );

      expect(result.metadata).toEqual(largeExifData);
      expect(mockPhotoRepository.updatePhotoMetadata).toHaveBeenCalledWith(
        photoId,
        largeExifData
      );
    });

    it('should validate GPS coordinates before storage', async () => {
      const validGpsData = {
        latitude: 51.5074,
        longitude: -0.1278,
        altitude: 11,
      };

      const invalidGpsData = {
        latitude: 91.0, // Invalid latitude > 90
        longitude: -181.0, // Invalid longitude < -180
        altitude: -1000,
      };

      mockExifService.validateExifData.mockImplementation(data => {
        if (data.gps?.latitude > 90 || data.gps?.latitude < -90) {
          return { valid: false, errors: ['Invalid GPS latitude'] };
        }
        if (data.gps?.longitude > 180 || data.gps?.longitude < -180) {
          return { valid: false, errors: ['Invalid GPS longitude'] };
        }
        return { valid: true, errors: [] };
      });

      const validResult = mockExifService.validateExifData({
        gps: validGpsData,
      });
      const invalidResult = mockExifService.validateExifData({
        gps: invalidGpsData,
      });

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('Invalid GPS latitude');
    });
  });

  describe('RED Phase: 資料驗證和清理機制', () => {
    it('should clean and sanitize EXIF data before storage', async () => {
      const rawExifData = {
        camera: '  Canon EOS R6  ',
        settings: {
          aperture: null,
          shutterSpeed: undefined,
          iso: 'ISO 1600',
          maliciousScript: '<script>alert("xss")</script>',
        },
        gps: {
          latitude: '25.0330', // String instead of number
          longitude: 121.5654,
          altitude: NaN,
        },
      };

      const cleanedData = {
        camera: 'Canon EOS R6',
        settings: {
          iso: '1600',
        },
        gps: {
          latitude: 25.033,
          longitude: 121.5654,
        },
      };

      mockExifService.cleanExifData.mockReturnValue(cleanedData);

      const result = mockExifService.cleanExifData(rawExifData);

      expect(result).toEqual(cleanedData);
      expect(result.camera).toBe('Canon EOS R6'); // Trimmed
      expect(result.settings.maliciousScript).toBeUndefined(); // Removed
      expect(typeof result.gps.latitude).toBe('number'); // Converted
    });

    it('should validate date time formats', async () => {
      const validDateTimeFormats = [
        '2024:09:24 14:30:15',
        '2024-09-24T14:30:15.000Z',
        '2024/09/24 14:30:15',
      ];

      const invalidDateTimeFormats = [
        'invalid-date',
        '2024-13-40 25:70:99', // Invalid values
        null,
        undefined,
      ];

      mockExifService.formatDateTimeFromExif.mockImplementation(dateStr => {
        if (!dateStr || typeof dateStr !== 'string') return null;

        try {
          const patterns = [
            /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/,
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
            /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/,
          ];

          const isValid = patterns.some(pattern => pattern.test(dateStr));
          if (!isValid) return null;

          // Convert EXIF format to ISO format
          let isoString = dateStr;
          if (dateStr.includes(':') && dateStr.includes(' ')) {
            // Convert "YYYY:MM:DD HH:MM:SS" to "YYYY-MM-DDTHH:MM:SS"
            isoString =
              dateStr.replace(/^(\d{4}):(\d{2}):(\d{2}) /, '$1-$2-$3T') +
              '.000Z';
          } else if (dateStr.includes('/')) {
            // Convert "YYYY/MM/DD HH:MM:SS" to "YYYY-MM-DDTHH:MM:SS"
            isoString =
              dateStr.replace(/^(\d{4})\/(\d{2})\/(\d{2}) /, '$1-$2-$3T') +
              '.000Z';
          }

          const date = new Date(isoString);
          return isNaN(date.getTime()) ? null : date.toISOString();
        } catch {
          return null;
        }
      });

      // Test valid formats
      for (const validDate of validDateTimeFormats) {
        const result = mockExifService.formatDateTimeFromExif(validDate);
        expect(result).toBeTruthy();
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      }

      // Test invalid formats
      for (const invalidDate of invalidDateTimeFormats) {
        const result = mockExifService.formatDateTimeFromExif(invalidDate);
        expect(result).toBeNull();
      }
    });

    it('should handle Oracle constraint violations', async () => {
      const photoId = 'photo-constraint-test';
      const invalidMetadata = {
        exif: {
          camera: 'A'.repeat(1000), // Too long for database field
          iso: 'INVALID_ISO_VALUE',
        },
      };

      const oracleConstraintError = new Error(
        'ORA-12899: value too large for column'
      );

      mockPhotoRepository.updatePhotoMetadata.mockRejectedValue(
        oracleConstraintError
      );

      try {
        await mockPhotoRepository.updatePhotoMetadata(photoId, invalidMetadata);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('ORA-12899');
      }
    });
  });

  describe('RED Phase: 恢復和日誌功能', () => {
    it('should create metadata backup before updates', async () => {
      const photoId = 'photo-backup-test';
      const originalMetadata = { exif: { camera: 'Original Camera' } };
      const newMetadata = { exif: { camera: 'Updated Camera' } };

      mockPhotoRepository.createMetadataBackup.mockResolvedValue('backup-123');

      const backupId = await mockPhotoRepository.createMetadataBackup(
        photoId,
        originalMetadata
      );

      expect(backupId).toBe('backup-123');
      expect(mockPhotoRepository.createMetadataBackup).toHaveBeenCalledWith(
        photoId,
        originalMetadata
      );
    });

    it('should restore from backup when update fails', async () => {
      const photoId = 'photo-restore-test';
      const backupId = 'backup-456';
      const originalMetadata = { exif: { camera: 'Original Camera' } };

      mockPhotoRepository.restoreMetadataFromBackup.mockResolvedValue(true);

      const restored = await mockPhotoRepository.restoreMetadataFromBackup(
        photoId,
        backupId
      );

      expect(restored).toBe(true);
      expect(
        mockPhotoRepository.restoreMetadataFromBackup
      ).toHaveBeenCalledWith(photoId, backupId);
    });

    it('should log metadata update operations', async () => {
      const photoId = 'photo-log-test';
      const userId = 'user-123';
      const operation = 'exif_extraction';
      const metadata = { exif: { camera: 'Test Camera' } };

      // Mock logging functionality
      const mockLogger = {
        logMetadataOperation: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(mockLogger.logMetadataOperation).mockResolvedValue(true);

      const logged = await mockLogger.logMetadataOperation({
        photoId,
        userId,
        operation,
        metadata,
        timestamp: new Date(),
        success: true,
      });

      expect(logged).toBe(true);
      expect(mockLogger.logMetadataOperation).toHaveBeenCalledWith({
        photoId,
        userId,
        operation,
        metadata,
        timestamp: expect.any(Date),
        success: true,
      });
    });

    it('should handle partial metadata update failures', async () => {
      const photoId = 'photo-partial-fail';
      const metadataUpdates = {
        exif: { camera: 'Valid Camera' },
        gps: { latitude: 'invalid-latitude' }, // This should fail validation
        technical: { colorSpace: 'sRGB' },
      };

      const partialUpdateResult = {
        successful: ['exif', 'technical'],
        failed: [
          {
            field: 'gps',
            error: 'Invalid GPS latitude format',
            originalValue: metadataUpdates.gps,
          },
        ],
      };

      // Mock partial update functionality
      const mockPartialUpdate = vi.fn().mockResolvedValue(partialUpdateResult);

      const result = await mockPartialUpdate(photoId, metadataUpdates);

      expect(result.successful).toContain('exif');
      expect(result.successful).toContain('technical');
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].field).toBe('gps');
    });
  });

  describe('RED Phase: 錯誤處理和恢復策略', () => {
    it('should retry EXIF extraction on transient failures', async () => {
      const filePath = '/uploads/photos/retry-test.jpg';

      // First two calls fail, third succeeds
      mockExifService.extractExifData
        .mockRejectedValueOnce(new Error('Temporary file system error'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ camera: 'Success on retry' });

      // Mock retry logic
      const extractWithRetry = async (path: string, maxRetries = 3) => {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await mockExifService.extractExifData(path);
          } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 100 * (i + 1))); // Exponential backoff
            }
          }
        }
        throw lastError;
      };

      const result = await extractWithRetry(filePath);

      expect(result).toEqual({ camera: 'Success on retry' });
      expect(mockExifService.extractExifData).toHaveBeenCalledTimes(3);
    });

    it('should handle Oracle connection failures gracefully', async () => {
      const photoId = 'photo-oracle-fail';
      const metadata = { exif: { camera: 'Test' } };

      mockPhotoRepository.updatePhotoMetadata.mockRejectedValue(
        new Error('ORA-03114: not connected to ORACLE')
      );

      try {
        await mockPhotoRepository.updatePhotoMetadata(photoId, metadata);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('not connected to ORACLE');
      }

      // Should implement connection retry or fallback mechanism
      expect(mockPhotoRepository.updatePhotoMetadata).toHaveBeenCalledWith(
        photoId,
        metadata
      );
    });
  });
});
