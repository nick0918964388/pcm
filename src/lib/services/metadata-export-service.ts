import { OraclePhotoRepository } from '@/lib/repositories/oracle-photo-repository';
import { OracleAlbumRepository } from '@/lib/repositories/oracle-album-repository';
import { PhotoSearchService } from './photo-search-service';
import * as XLSX from 'xlsx';

export interface ExportResult {
  format: 'json' | 'csv' | 'xlsx';
  content: string | Buffer;
  contentType: string;
  fileName: string;
  sheets?: number;
}

export interface AlbumExportResult extends ExportResult {
  albumInfo: {
    id: string;
    name: string;
    photoCount: number;
  };
  photos: any[];
}

export interface ProjectExportResult extends ExportResult {
  projectId: string;
  albums: any[];
  totalPhotos: number;
}

export interface StatisticsReport {
  summary: {
    totalPhotos: number;
    totalSize: string;
    averageSize: string;
  };
  typeDistribution: Record<string, number>;
  monthlyTrend: Record<string, number>;
  topUploaders: Array<{ userId: string; count: number }>;
  topTags: Array<{ tag: string; count: number }>;
  averageResolution?: {
    width: number;
    height: number;
  };
}

export interface BatchExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  batchSize?: number;
  onProgress?: (progress: {
    processed: number;
    total: number;
    percentage: number;
  }) => void;
}

export interface CustomFieldDefinition {
  [fieldName: string]: 'string' | 'number' | 'boolean' | 'date' | 'json';
}

export interface ExportWithCustomFieldsResult {
  fields: string[];
  data: any[];
}

export class MetadataExportService {
  private customFields: CustomFieldDefinition = {};
  private readonly MAX_ROWS_PER_SHEET = 1000;

  /**
   * Export photo metadata to JSON format
   */
  async exportToJSON(photoIds: string[]): Promise<ExportResult> {
    if (photoIds.length === 0) {
      return {
        format: 'json',
        content: '[]',
        contentType: 'application/json',
        fileName: this.generateFileName('json'),
      };
    }

    const photoRepository = await OraclePhotoRepository.getRepository();
    const photos = await photoRepository.findByIds(photoIds);

    const content = JSON.stringify(photos, null, 2);

    return {
      format: 'json',
      content,
      contentType: 'application/json',
      fileName: this.generateFileName('json'),
    };
  }

  /**
   * Export photo metadata to CSV format
   */
  async exportToCSV(photoIds: string[]): Promise<ExportResult> {
    let photos: any[] = [];

    // Check if photoIds is already an array of photo objects (for internal use)
    if (photoIds.length > 0 && typeof photoIds[0] === 'object') {
      photos = photoIds as any[];
    } else {
      // Fetch photos by IDs
      const photoRepository = await OraclePhotoRepository.getRepository();
      photos = await photoRepository.findByIds(photoIds);
    }

    const headers = [
      'ID',
      'File Name',
      'File Size',
      'Type',
      'Width',
      'Height',
      'Tags',
      'Uploaded By',
      'Uploaded At',
      'Album ID',
    ];

    const rows = [headers.join(',')];

    for (const photo of photos) {
      const row = [
        photo.id,
        this.escapeCSV(photo.fileName),
        photo.fileSize,
        photo.mimeType,
        photo.width || '',
        photo.height || '',
        this.escapeCSV((photo.tags || []).join(',')),
        photo.uploadedBy,
        photo.uploadedAt?.toISOString() || '',
        photo.albumId || '',
      ];
      rows.push(row.join(','));
    }

    return {
      format: 'csv',
      content: rows.join('\n'),
      contentType: 'text/csv',
      fileName: this.generateFileName('csv'),
    };
  }

  /**
   * Export photo metadata to Excel format
   */
  async exportToExcel(photoIds: string[]): Promise<ExportResult> {
    let photos: any[] = [];

    // Check if photoIds is already an array of photo objects (for internal use)
    if (photoIds.length > 0 && typeof photoIds[0] === 'object') {
      photos = photoIds as any[];
    } else {
      // Fetch photos by IDs
      const photoRepository = await OraclePhotoRepository.getRepository();
      photos = await photoRepository.findByIds(photoIds);
    }

    const workbook = XLSX.utils.book_new();
    const sheets = Math.ceil(photos.length / this.MAX_ROWS_PER_SHEET);

    for (let i = 0; i < sheets; i++) {
      const start = i * this.MAX_ROWS_PER_SHEET;
      const end = Math.min(start + this.MAX_ROWS_PER_SHEET, photos.length);
      const sheetData = photos.slice(start, end);

      const worksheet = XLSX.utils.json_to_sheet(
        sheetData.map(photo => ({
          ID: photo.id,
          'File Name': photo.fileName,
          'File Size': photo.fileSize,
          Type: photo.mimeType,
          Width: photo.width || '',
          Height: photo.height || '',
          Tags: (photo.tags || []).join(', '),
          'Uploaded By': photo.uploadedBy,
          'Uploaded At': photo.uploadedAt?.toISOString() || '',
          'Album ID': photo.albumId || '',
        }))
      );

      XLSX.utils.book_append_sheet(workbook, worksheet, `Photos ${i + 1}`);
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return {
      format: 'xlsx',
      content: buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileName: this.generateFileName('xlsx'),
      sheets,
    };
  }

  /**
   * Generate statistics report for a project
   */
  async generateStatisticsReport(projectId: string): Promise<StatisticsReport> {
    const photoRepository = await OraclePhotoRepository.getRepository();
    const stats = await photoRepository.getStatistics(projectId);

    return {
      summary: {
        totalPhotos: stats.totalPhotos || 0,
        totalSize: this.formatBytes(stats.totalFileSize || 0),
        averageSize: this.formatBytes(stats.averageFileSize || 0),
      },
      typeDistribution: stats.photosByType || {},
      monthlyTrend: stats.photosByMonth || {},
      topUploaders: stats.topUploaders || [],
      topTags: stats.topTags || [],
      averageResolution: stats.averageResolution,
    };
  }

  /**
   * Export all photos metadata from an album
   */
  async exportAlbumMetadata(
    albumId: string,
    format: 'json' | 'csv' | 'xlsx'
  ): Promise<AlbumExportResult> {
    const albumRepository = await OracleAlbumRepository.getRepository();
    const photoRepository = await OraclePhotoRepository.getRepository();

    const album = await albumRepository.findById(albumId);
    const photos = await photoRepository.findByAlbum(albumId);

    let exportResult: ExportResult;

    switch (format) {
      case 'csv':
        exportResult = await this.exportToCSV(photos as any);
        break;
      case 'xlsx':
        exportResult = await this.exportToExcel(photos as any);
        break;
      default:
        exportResult = await this.exportToJSON(photos.map(p => p.id));
    }

    return {
      ...exportResult,
      albumInfo: {
        id: album.id,
        name: album.name,
        photoCount: album.photoCount || photos.length,
      },
      photos,
    };
  }

  /**
   * Export all photos metadata from a project
   */
  async exportProjectMetadata(
    projectId: string,
    format: 'json' | 'csv' | 'xlsx'
  ): Promise<ProjectExportResult> {
    const albumRepository = await OracleAlbumRepository.getRepository();
    const photoRepository = await OraclePhotoRepository.getRepository();

    const albums = await albumRepository.findByProject(projectId);
    const photos = await photoRepository.findByProject(projectId);

    let exportResult: ExportResult;

    switch (format) {
      case 'csv':
        exportResult = await this.exportToCSV(photos as any);
        break;
      case 'xlsx':
        exportResult = await this.exportToExcel(photos as any);
        break;
      default:
        exportResult = await this.exportToJSON(photos.map(p => p.id));
    }

    return {
      ...exportResult,
      projectId,
      albums,
      totalPhotos: photos.length,
    };
  }

  /**
   * Define custom metadata fields
   */
  async defineCustomFields(fields: CustomFieldDefinition): Promise<void> {
    const validTypes = ['string', 'number', 'boolean', 'date', 'json'];

    for (const [fieldName, fieldType] of Object.entries(fields)) {
      if (!validTypes.includes(fieldType)) {
        throw new Error(
          `Invalid field type: ${fieldType} for field ${fieldName}`
        );
      }
    }

    this.customFields = fields;
  }

  /**
   * Export photos with custom metadata fields
   */
  async exportWithCustomFields(
    photoIds: string[]
  ): Promise<ExportWithCustomFieldsResult> {
    const photoRepository = await OraclePhotoRepository.getRepository();
    const photos = await photoRepository.findByIds(photoIds);

    const fields = Object.keys(this.customFields);
    const data = photos.map(photo => {
      const customData: any = {};

      for (const field of fields) {
        customData[field] = photo.customMetadata?.[field] || null;
      }

      return {
        ...photo,
        customMetadata: customData,
      };
    });

    return {
      fields,
      data,
    };
  }

  /**
   * Batch export with progress tracking
   */
  async batchExport(
    photoIds: string[],
    options: BatchExportOptions
  ): Promise<ExportResult> {
    const { format, batchSize = 50, onProgress } = options;
    const total = photoIds.length;
    let processed = 0;

    const photoRepository = await OraclePhotoRepository.getRepository();
    const allPhotos: any[] = [];

    // Process in batches
    for (let i = 0; i < total; i += batchSize) {
      const batch = photoIds.slice(i, Math.min(i + batchSize, total));
      const photos = await photoRepository.findByIds(batch);
      allPhotos.push(...photos);

      processed += batch.length;

      if (onProgress) {
        onProgress({
          processed,
          total,
          percentage: Math.round((processed / total) * 100),
        });
      }
    }

    // Export based on format
    switch (format) {
      case 'csv':
        return this.exportToCSV(allPhotos as any);
      case 'xlsx':
        return this.exportToExcel(allPhotos as any);
      default:
        return this.exportToJSON(allPhotos.map(p => p.id));
    }
  }

  /**
   * Format file size in bytes to human readable format
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = bytes / Math.pow(k, i);

    return `${size.toFixed(2)} ${units[i]}`;
  }

  /**
   * Escape CSV special characters
   */
  private escapeCSV(value: string): string {
    if (typeof value !== 'string') return value;

    // If value contains comma, quotes or newline, wrap in quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      // Escape existing quotes by doubling them
      value = value.replace(/"/g, '""');
      return `"${value}"`;
    }

    return value;
  }

  /**
   * Generate unique filename with timestamp
   */
  private generateFileName(extension: string): string {
    const timestamp = Date.now();
    return `photo-metadata-${timestamp}-.${extension}`;
  }
}
