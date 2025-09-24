/**
 * Oracle照片倉儲實作
 * Task 3.1: 建立 Oracle 照片倉儲
 *
 * 擴展現有 OracleBaseRepository 建立 OraclePhotoRepository
 * 整合現有 photos 和 photo_versions Oracle 表格結構
 * 實作照片基礎 CRUD 操作，使用 Oracle CLOB 儲存 metadata
 * 建立照片版本管理功能，支援 thumbnail、small、medium、large 版本
 * 實作照片與相簿的關聯管理，利用 Oracle 外鍵約束確保資料一致性
 */

import { OracleBaseRepository } from '../database/oracle-base-repository';
import { OracleQueryExecutor } from '../database/oracle-query-executor';
import {
  OracleQueryOptions,
  OracleBatchOptions,
} from '../database/oracle-repository-types';
import {
  Photo,
  PhotoVersion,
  CreatePhotoRequest,
  UpdatePhotoRequest,
  PhotoSearchCriteria,
  PhotoBatchUploadResult,
  PhotoMetadata,
  VersionType,
  PhotoDeletionResult,
  PhotoTagOperation,
  BatchTagUpdateResult,
} from './types/photo.types';

export class OraclePhotoRepository extends OracleBaseRepository<Photo> {
  constructor(queryExecutor?: OracleQueryExecutor) {
    super('photos', queryExecutor, {
      primaryKey: 'id',
      enableSoftDelete: true,
      softDeleteColumn: 'deleted_at',
      enableAuditColumns: false, // photos 表格沒有 updated_at 欄位
    });
  }

  /**
   * 映射 Oracle 行資料為照片實體
   */
  protected mapFromOracle(row: any): Photo {
    return {
      id: row.id,
      albumId: row.album_id,
      fileName: row.file_name,
      filePath: row.file_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      width: row.width,
      height: row.height,
      thumbnailPath: row.thumbnail_path,
      uploadedBy: row.uploaded_by,
      uploadedAt: new Date(row.uploaded_at),
      uploadStatus: row.upload_status,
      metadata: this.parseMetadata(row.metadata),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    };
  }

  /**
   * 映射照片實體為 Oracle 行資料
   */
  protected mapToOracle(entity: Partial<Photo>): Record<string, any> {
    const row: Record<string, any> = {};

    if (entity.albumId !== undefined) row.album_id = entity.albumId;
    if (entity.fileName !== undefined) row.file_name = entity.fileName;
    if (entity.filePath !== undefined) row.file_path = entity.filePath;
    if (entity.fileSize !== undefined) row.file_size = entity.fileSize;
    if (entity.mimeType !== undefined) row.mime_type = entity.mimeType;
    if (entity.width !== undefined) row.width = entity.width;
    if (entity.height !== undefined) row.height = entity.height;
    if (entity.thumbnailPath !== undefined)
      row.thumbnail_path = entity.thumbnailPath;
    if (entity.uploadedBy !== undefined) row.uploaded_by = entity.uploadedBy;
    if (entity.uploadStatus !== undefined)
      row.upload_status = entity.uploadStatus;
    if (entity.metadata !== undefined)
      row.metadata = JSON.stringify(entity.metadata);

    return row;
  }

  /**
   * 解析 JSON metadata
   */
  private parseMetadata(metadataJson: string): PhotoMetadata {
    try {
      if (!metadataJson || metadataJson === '{}') {
        return {};
      }
      const parsed = JSON.parse(metadataJson);

      // 處理日期字符串轉換
      if (parsed.exif?.dateTime) {
        parsed.exif.dateTime = new Date(parsed.exif.dateTime);
      }

      return parsed;
    } catch (error) {
      console.warn('Failed to parse photo metadata:', error);
      return {};
    }
  }

  /**
   * 映射照片版本資料
   */
  private mapVersionFromOracle(row: any): PhotoVersion {
    return {
      id: row.id,
      photoId: row.photo_id,
      versionType: row.version_type,
      filePath: row.file_path,
      width: row.width,
      height: row.height,
      fileSize: row.file_size,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * 建立新照片記錄
   * Requirements: 2.1, 2.2, 2.6
   */
  async createPhoto(
    request: CreatePhotoRequest,
    options: OracleQueryOptions = {}
  ): Promise<Photo> {
    const photoData = {
      ...request,
      uploadStatus: 'completed' as const,
      metadata: request.metadata || {},
    };

    return await this.create(photoData, options);
  }

  /**
   * 建立照片版本
   * Requirements: 2.1, 2.6
   */
  async createPhotoVersions(
    photoId: string,
    versions: Array<Omit<PhotoVersion, 'id' | 'createdAt'>>,
    options: OracleBatchOptions = {}
  ): Promise<boolean> {
    if (versions.length === 0) return true;

    const batchData = versions.map(version => ({
      photo_id: photoId,
      version_type: version.versionType,
      file_path: version.filePath,
      width: version.width,
      height: version.height,
      file_size: version.fileSize,
    }));

    const sql = `
      INSERT INTO photo_versions (
        id, photo_id, version_type, file_path, width, height, file_size, created_at
      ) VALUES (
        SYS_GUID(), :photo_id, :version_type, :file_path, :width, :height, :file_size, SYSDATE
      )
    `;

    const result = await this.queryExecutor.executeBatch(
      { sql, binds: batchData },
      options
    );
    return (result.rowsAffected || 0) > 0;
  }

  /**
   * 取得照片的所有版本
   * Requirements: 2.1, 2.6
   */
  async getPhotoVersions(
    photoId: string,
    options: OracleQueryOptions = {}
  ): Promise<PhotoVersion[]> {
    const sql = `
      SELECT * FROM photo_versions
      WHERE photo_id = :photoId
      ORDER BY
        CASE version_type
          WHEN 'original' THEN 1
          WHEN 'large' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'small' THEN 4
          WHEN 'thumbnail' THEN 5
        END
    `;

    const result = await this.executeRaw(sql, { photoId }, options);
    return result.rows
      ? result.rows.map(row => this.mapVersionFromOracle(row))
      : [];
  }

  /**
   * 取得指定版本的照片
   * Requirements: 2.1, 2.6
   */
  async getPhotoVersion(
    photoId: string,
    versionType: VersionType,
    options: OracleQueryOptions = {}
  ): Promise<PhotoVersion | null> {
    const sql = `
      SELECT * FROM photo_versions
      WHERE photo_id = :photoId AND version_type = :versionType
    `;

    const result = await this.executeRaw(
      sql,
      { photoId, versionType },
      options
    );
    return result.rows && result.rows.length > 0
      ? this.mapVersionFromOracle(result.rows[0])
      : null;
  }

  /**
   * 取得相簿的所有照片
   * Requirements: 2.1
   */
  async getAlbumPhotos(
    albumId: string,
    options: OracleQueryOptions = {}
  ): Promise<Photo[]> {
    const sql = `
      SELECT * FROM active_photos
      WHERE album_id = :albumId
      ORDER BY uploaded_at DESC
    `;

    const result = await this.executeRaw(sql, { albumId }, options);
    return result.rows ? result.rows.map(row => this.mapFromOracle(row)) : [];
  }

  /**
   * 搜尋照片
   * Requirements: 2.1, 6.4
   */
  async searchPhotos(
    criteria: PhotoSearchCriteria,
    options: OracleQueryOptions = {}
  ): Promise<Photo[]> {
    let sql = `SELECT * FROM active_photos WHERE 1=1`;
    const binds: Record<string, any> = {};

    // 相簿篩選
    if (criteria.albumId) {
      sql += ` AND album_id = :albumId`;
      binds.albumId = criteria.albumId;
    }

    // 上傳者篩選
    if (criteria.uploadedBy) {
      sql += ` AND uploaded_by = :uploadedBy`;
      binds.uploadedBy = criteria.uploadedBy;
    }

    // MIME 類型篩選
    if (criteria.mimeTypes && criteria.mimeTypes.length > 0) {
      const mimeTypePlaceholders = criteria.mimeTypes
        .map((_, index) => `:mimeType${index}`)
        .join(', ');
      sql += ` AND mime_type IN (${mimeTypePlaceholders})`;
      criteria.mimeTypes.forEach((mimeType, index) => {
        binds[`mimeType${index}`] = mimeType;
      });
    }

    // 日期範圍篩選
    if (criteria.dateRange) {
      sql += ` AND uploaded_at BETWEEN :startDate AND :endDate`;
      binds.startDate = criteria.dateRange.start;
      binds.endDate = criteria.dateRange.end;
    }

    // 標籤篩選（使用 JSON 查詢）
    if (criteria.tags && criteria.tags.length > 0) {
      const tagConditions = criteria.tags
        .map(
          (_, index) =>
            `JSON_EXISTS(metadata, '$.tags[*]' PASSING :tag${index} AS "tagValue" COLUMNS (value VARCHAR2(255) PATH '$' VALIDATE USING STRICT) ERROR ON ERROR NULL ON EMPTY)`
        )
        .join(' AND ');
      sql += ` AND (${tagConditions})`;
      criteria.tags.forEach((tag, index) => {
        binds[`tag${index}`] = tag;
      });
    }

    // GPS 位置篩選
    if (criteria.hasGPS !== undefined) {
      if (criteria.hasGPS) {
        sql += ` AND JSON_EXISTS(metadata, '$.gps.latitude')`;
      } else {
        sql += ` AND NOT JSON_EXISTS(metadata, '$.gps.latitude')`;
      }
    }

    sql += ` ORDER BY uploaded_at DESC`;

    const result = await this.executeRaw(sql, binds, options);
    return result.rows ? result.rows.map(row => this.mapFromOracle(row)) : [];
  }

  /**
   * 更新照片 metadata
   * Requirements: 2.4, 6.1, 6.2
   */
  async updatePhotoMetadata(
    photoId: string,
    metadataUpdates: Partial<PhotoMetadata>,
    options: OracleQueryOptions & { replaceAll?: boolean } = {}
  ): Promise<Photo> {
    const { replaceAll, ...queryOptions } = options;

    let sql: string;
    let binds: Record<string, any>;

    if (replaceAll) {
      // 完整替換 metadata
      sql = `
        UPDATE photos
        SET metadata = :newMetadata
        WHERE id = :id AND deleted_at IS NULL
      `;
      binds = {
        newMetadata: JSON.stringify(metadataUpdates),
        id: photoId,
      };
    } else {
      // 部分合併 metadata（預設行為）
      sql = `
        UPDATE photos
        SET metadata = JSON_MERGEPATCH(metadata, :jsonPatch)
        WHERE id = :id AND deleted_at IS NULL
      `;
      binds = {
        jsonPatch: JSON.stringify(metadataUpdates),
        id: photoId,
      };
    }

    await this.executeRaw(sql, binds, queryOptions);
    return (await this.findById(photoId, queryOptions)) as Photo;
  }

  /**
   * 更新照片上傳狀態
   * Requirements: 2.1, 2.6
   */
  async updateUploadStatus(
    photoId: string,
    status: Photo['uploadStatus'],
    options: OracleQueryOptions = {}
  ): Promise<Photo> {
    return await this.update(photoId, { uploadStatus: status }, options);
  }

  /**
   * 批次刪除照片
   * Requirements: 2.5
   */
  async batchDeletePhotos(
    photoIds: string[],
    options: OracleQueryOptions = {}
  ): Promise<number> {
    return await this.deleteMany(photoIds, options);
  }

  /**
   * 批次上傳照片處理
   * Requirements: 2.1, 2.6
   */
  async batchCreatePhotos(
    requests: CreatePhotoRequest[],
    options: OracleBatchOptions = {}
  ): Promise<PhotoBatchUploadResult> {
    const result: PhotoBatchUploadResult = {
      successful: [],
      failed: [],
      totalProcessed: requests.length,
      totalSuccess: 0,
      totalFailed: 0,
    };

    for (let i = 0; i < requests.length; i++) {
      try {
        const photo = await this.createPhoto(requests[i], options);
        result.successful.push(photo);
        result.totalSuccess++;
      } catch (error) {
        result.failed.push({
          fileName: requests[i].fileName,
          error: error instanceof Error ? error.message : '未知錯誤',
          originalIndex: i,
        });
        result.totalFailed++;
      }
    }

    return result;
  }

  /**
   * 取得照片統計資訊
   * Requirements: 2.1
   */
  async getPhotoStats(
    albumId?: string,
    options: OracleQueryOptions = {}
  ): Promise<{
    totalPhotos: number;
    totalSize: number;
    averageSize: number;
    latestUpload?: Date;
  }> {
    let sql = `
      SELECT
        COUNT(*) as total_photos,
        COALESCE(SUM(file_size), 0) as total_size,
        COALESCE(AVG(file_size), 0) as average_size,
        MAX(uploaded_at) as latest_upload
      FROM photos
      WHERE deleted_at IS NULL
    `;

    const binds: Record<string, any> = {};

    if (albumId) {
      sql += ` AND album_id = :albumId`;
      binds.albumId = albumId;
    }

    const result = await this.executeRaw(sql, binds, options);

    if (!result.rows || result.rows.length === 0) {
      return { totalPhotos: 0, totalSize: 0, averageSize: 0 };
    }

    const row = result.rows[0];
    return {
      totalPhotos: row.total_photos || 0,
      totalSize: row.total_size || 0,
      averageSize: row.average_size || 0,
      latestUpload: row.latest_upload ? new Date(row.latest_upload) : undefined,
    };
  }

  /**
   * 根據檔案路徑查找照片
   * Requirements: 2.1
   */
  async findByFilePath(
    filePath: string,
    options: OracleQueryOptions = {}
  ): Promise<Photo | null> {
    return await this.findOne({ filePath }, options);
  }

  /**
   * 取得使用者上傳的照片
   * Requirements: 2.1
   */
  async getUserPhotos(
    userId: string,
    options: OracleQueryOptions = {}
  ): Promise<Photo[]> {
    return await this.findBy({ uploadedBy: userId }, options);
  }

  /**
   * 刪除照片版本
   * Requirements: 2.5, 2.6
   */
  async deletePhotoVersion(
    photoId: string,
    versionType: VersionType,
    options: OracleQueryOptions = {}
  ): Promise<boolean> {
    const sql = `
      DELETE FROM photo_versions
      WHERE photo_id = :photoId AND version_type = :versionType
    `;

    const result = await this.executeRaw(
      sql,
      { photoId, versionType },
      options
    );
    return (result.rowsAffected || 0) > 0;
  }

  /**
   * 清理孤兒版本（沒有對應照片的版本）
   * Requirements: 2.5, 2.6
   */
  async cleanupOrphanVersions(
    options: OracleQueryOptions = {}
  ): Promise<number> {
    const sql = `
      DELETE FROM photo_versions
      WHERE photo_id NOT IN (
        SELECT id FROM photos WHERE deleted_at IS NULL
      )
    `;

    const result = await this.executeRaw(sql, {}, options);
    return result.rowsAffected || 0;
  }

  // ============================================
  // 照片管理操作功能 (Task 3.2)
  // ============================================

  /**
   * 為照片添加標籤
   * Requirements: 2.4
   */
  async addPhotoTags(
    photoId: string,
    tags: string[],
    options: OracleQueryOptions = {}
  ): Promise<Photo> {
    return await this.updatePhotoMetadata(photoId, { tags }, options);
  }

  /**
   * 移除照片標籤
   * Requirements: 2.4
   */
  async removePhotoTag(
    photoId: string,
    tagToRemove: string,
    options: OracleQueryOptions = {}
  ): Promise<Photo> {
    // 先查詢當前照片的標籤
    const currentPhoto = await this.findById(photoId, options);
    if (!currentPhoto) {
      throw new Error('照片不存在');
    }

    const currentTags = currentPhoto.metadata.tags || [];
    const updatedTags = currentTags.filter(tag => tag !== tagToRemove);

    return await this.updatePhotoMetadata(
      photoId,
      { tags: updatedTags },
      options
    );
  }

  /**
   * 更新照片描述
   * Requirements: 2.4
   */
  async updatePhotoDescription(
    photoId: string,
    description: string,
    options: OracleQueryOptions = {}
  ): Promise<Photo> {
    return await this.updatePhotoMetadata(photoId, { description }, options);
  }

  /**
   * 同步刪除照片和本地檔案
   * Requirements: 2.5
   */
  async deletePhotoWithFiles(
    photoId: string,
    userId: string,
    options: OracleQueryOptions = {}
  ): Promise<PhotoDeletionResult> {
    // 1. 查詢照片資訊
    const photo = await this.findById(photoId, options);
    if (!photo) {
      throw new Error('照片不存在');
    }

    try {
      // 2. 軟刪除照片
      const deletePhotoResult = await this.softDelete(photoId, options);

      // 3. 刪除所有版本
      const deleteVersionsSql = `
        DELETE FROM photo_versions
        WHERE photo_id = :photoId
      `;
      const deleteVersionsResult = await this.executeRaw(
        deleteVersionsSql,
        { photoId },
        options
      );

      return {
        success: true,
        deletedPhoto: deletePhotoResult,
        deletedVersions: deleteVersionsResult.rowsAffected || 0,
        filePath: photo.filePath,
      };
    } catch (error) {
      return {
        success: false,
        deletedPhoto: false,
        deletedVersions: 0,
        filePath: photo.filePath,
      };
    }
  }

  /**
   * 批次更新照片標籤
   * Requirements: 2.4
   */
  async batchUpdatePhotoTags(
    photoIds: string[],
    tagsToAdd: string[],
    options: OracleQueryOptions = {}
  ): Promise<number> {
    if (photoIds.length === 0) return 0;

    const placeholders = photoIds.map((_, index) => `:id${index}`).join(', ');
    const binds = photoIds.reduce(
      (acc, id, index) => {
        acc[`id${index}`] = id;
        return acc;
      },
      {} as Record<string, any>
    );

    binds.jsonPatch = JSON.stringify({ tags: tagsToAdd });

    const sql = `
      UPDATE photos
      SET metadata = JSON_MERGEPATCH(metadata, :jsonPatch)
      WHERE id IN (${placeholders}) AND deleted_at IS NULL
    `;

    const result = await this.executeRaw(sql, binds, options);
    return result.rowsAffected || 0;
  }

  /**
   * 根據標籤搜尋照片
   * Requirements: 2.4, 6.4
   */
  async findPhotosByTags(
    tags: string[],
    matchAll: boolean = false,
    options: OracleQueryOptions = {}
  ): Promise<Photo[]> {
    let sql = `SELECT * FROM active_photos WHERE 1=1`;
    const binds: Record<string, any> = {};

    if (tags.length > 0) {
      if (matchAll) {
        // 必須包含所有標籤
        const tagConditions = tags
          .map(
            (_, index) =>
              `JSON_EXISTS(metadata, '$.tags[*]' PASSING :tag${index} AS "tag" COLUMNS (value VARCHAR2(255) PATH '$' DEFAULT '' ON ERROR) WHERE value = :tag${index})`
          )
          .join(' AND ');
        sql += ` AND (${tagConditions})`;
      } else {
        // 包含任一標籤
        const tagConditions = tags
          .map(
            (_, index) =>
              `JSON_EXISTS(metadata, '$.tags[*]' PASSING :tag${index} AS "tag" COLUMNS (value VARCHAR2(255) PATH '$' DEFAULT '' ON ERROR) WHERE value = :tag${index})`
          )
          .join(' OR ');
        sql += ` AND (${tagConditions})`;
      }

      tags.forEach((tag, index) => {
        binds[`tag${index}`] = tag;
      });
    }

    sql += ` ORDER BY uploaded_at DESC`;

    const result = await this.executeRaw(sql, binds, options);
    return result.rows ? result.rows.map(row => this.mapFromOracle(row)) : [];
  }

  /**
   * 取得所有使用的標籤
   * Requirements: 2.4
   */
  async getAllUsedTags(
    albumId?: string,
    options: OracleQueryOptions = {}
  ): Promise<string[]> {
    let sql = `
      SELECT DISTINCT JSON_VALUE(metadata, '$.tags[*]') as tag
      FROM photos
      WHERE deleted_at IS NULL
        AND JSON_EXISTS(metadata, '$.tags')
    `;

    const binds: Record<string, any> = {};

    if (albumId) {
      sql += ` AND album_id = :albumId`;
      binds.albumId = albumId;
    }

    sql += ` ORDER BY tag`;

    const result = await this.executeRaw(sql, binds, options);
    return result.rows
      ? result.rows.map(row => row.tag).filter(tag => tag)
      : [];
  }

  /**
   * 取得標籤使用統計
   * Requirements: 2.4
   */
  async getTagStatistics(
    options: OracleQueryOptions = {}
  ): Promise<Array<{ tag: string; count: number }>> {
    const sql = `
      SELECT
        JSON_VALUE(tags.value, '$') as tag,
        COUNT(*) as count
      FROM photos p,
           JSON_TABLE(p.metadata, '$.tags[*]' COLUMNS (value VARCHAR2(255) PATH '$')) tags
      WHERE p.deleted_at IS NULL
      GROUP BY JSON_VALUE(tags.value, '$')
      ORDER BY count DESC, tag ASC
    `;

    const result = await this.executeRaw(sql, {}, options);
    return result.rows
      ? result.rows.map(row => ({
          tag: row.tag,
          count: row.count || 0,
        }))
      : [];
  }

  /**
   * 照片標籤的批次操作
   * Requirements: 2.4
   */
  async batchTagOperations(
    operations: PhotoTagOperation[],
    options: OracleQueryOptions = {}
  ): Promise<BatchTagUpdateResult> {
    const result: BatchTagUpdateResult = {
      totalProcessed: operations.length,
      successful: 0,
      failed: [],
    };

    for (const operation of operations) {
      try {
        switch (operation.operation) {
          case 'add':
            await this.addPhotoTags(operation.photoId, operation.tags, options);
            break;
          case 'remove':
            for (const tag of operation.tags) {
              await this.removePhotoTag(operation.photoId, tag, options);
            }
            break;
          case 'replace':
            await this.updatePhotoMetadata(
              operation.photoId,
              { tags: operation.tags },
              options
            );
            break;
        }
        result.successful++;
      } catch (error) {
        result.failed.push({
          photoId: operation.photoId,
          error: error instanceof Error ? error.message : '未知錯誤',
        });
      }
    }

    return result;
  }

  /**
   * 根據 EXIF 資料搜尋照片
   * Requirements: 6.1, 6.2
   */
  async findPhotosByExifData(
    camera?: string,
    dateRange?: { start: Date; end: Date },
    options: OracleQueryOptions = {}
  ): Promise<Photo[]> {
    let sql = `SELECT * FROM active_photos WHERE 1=1`;
    const binds: Record<string, any> = {};

    if (camera) {
      sql += ` AND JSON_VALUE(metadata, '$.exif.camera') = :camera`;
      binds.camera = camera;
    }

    if (dateRange) {
      sql += ` AND JSON_VALUE(metadata, '$.exif.dateTime') BETWEEN :startDate AND :endDate`;
      binds.startDate = dateRange.start.toISOString();
      binds.endDate = dateRange.end.toISOString();
    }

    sql += ` ORDER BY uploaded_at DESC`;

    const result = await this.executeRaw(sql, binds, options);
    return result.rows ? result.rows.map(row => this.mapFromOracle(row)) : [];
  }

  /**
   * 取得 GPS 位置的照片
   * Requirements: 6.1, 6.2
   */
  async findPhotosWithGPS(options: OracleQueryOptions = {}): Promise<Photo[]> {
    const sql = `
      SELECT * FROM active_photos
      WHERE JSON_EXISTS(metadata, '$.gps.latitude')
        AND JSON_EXISTS(metadata, '$.gps.longitude')
      ORDER BY uploaded_at DESC
    `;

    const result = await this.executeRaw(sql, {}, options);
    return result.rows ? result.rows.map(row => this.mapFromOracle(row)) : [];
  }

  /**
   * 更新照片的 EXIF 資料
   * Requirements: 6.1, 6.2, 6.6
   */
  async updatePhotoExifData(
    photoId: string,
    exifData: PhotoMetadata['exif'],
    options: OracleQueryOptions = {}
  ): Promise<Photo> {
    return await this.updatePhotoMetadata(photoId, { exif: exifData }, options);
  }

  /**
   * 根據檔案大小範圍搜尋照片
   * Requirements: 6.4
   */
  async findPhotosByFileSize(
    minSize: number,
    maxSize: number,
    options: OracleQueryOptions = {}
  ): Promise<Photo[]> {
    const sql = `
      SELECT * FROM active_photos
      WHERE file_size BETWEEN :minSize AND :maxSize
      ORDER BY file_size DESC
    `;

    const binds = { minSize, maxSize };
    const result = await this.executeRaw(sql, binds, options);
    return result.rows ? result.rows.map(row => this.mapFromOracle(row)) : [];
  }

  /**
   * 取得重複檔案名稱的照片
   * Requirements: 2.4
   */
  async findDuplicateFileNames(
    albumId?: string,
    options: OracleQueryOptions = {}
  ): Promise<Array<{ fileName: string; photos: Photo[] }>> {
    let sql = `
      SELECT file_name, COUNT(*) as count
      FROM photos
      WHERE deleted_at IS NULL
    `;

    const binds: Record<string, any> = {};

    if (albumId) {
      sql += ` AND album_id = :albumId`;
      binds.albumId = albumId;
    }

    sql += `
      GROUP BY file_name
      HAVING COUNT(*) > 1
      ORDER BY count DESC, file_name
    `;

    const result = await this.executeRaw(sql, binds, options);

    if (!result.rows || result.rows.length === 0) {
      return [];
    }

    const duplicates: Array<{ fileName: string; photos: Photo[] }> = [];

    for (const row of result.rows) {
      const photos = await this.findBy({ fileName: row.file_name }, options);
      duplicates.push({
        fileName: row.file_name,
        photos,
      });
    }

    return duplicates;
  }

  /**
   * 取得照片 metadata
   * 任務 7.2: 實作照片 metadata 更新和查詢 API
   */
  async getPhotoMetadata(
    photoId: string,
    options: OracleQueryOptions = {}
  ): Promise<PhotoMetadata> {
    const sql = `
      SELECT metadata FROM photos
      WHERE id = :photoId AND deleted_at IS NULL
    `;

    const result = await this.executeRaw(sql, { photoId }, options);

    if (!result.rows || result.rows.length === 0) {
      throw new Error('照片不存在');
    }

    const metadata = result.rows[0].metadata;

    // 如果 metadata 是 CLOB 字串，解析為 JSON
    if (typeof metadata === 'string') {
      try {
        return JSON.parse(metadata);
      } catch (error) {
        console.warn(`解析照片 metadata JSON 失敗 (${photoId}):`, error);
        return {};
      }
    }

    return metadata || {};
  }

  /**
   * 清除照片 metadata
   * 任務 7.2: 實作照片 metadata 更新和查詢 API
   */
  async clearPhotoMetadata(
    photoId: string,
    options?: { fields?: string[] } & OracleQueryOptions
  ): Promise<Photo> {
    const { fields, ...queryOptions } = options || {};

    if (fields && fields.length > 0) {
      // 選擇性清除特定欄位
      const photo = await this.findById(photoId, queryOptions);
      if (!photo) {
        throw new Error('照片不存在');
      }

      const currentMetadata = photo.metadata || {};
      const updatedMetadata = { ...currentMetadata };

      // 刪除指定欄位
      fields.forEach(field => {
        delete updatedMetadata[field];
      });

      return await this.updatePhotoMetadata(photoId, updatedMetadata, {
        ...queryOptions,
        replaceAll: true,
      });
    } else {
      // 清除所有 metadata
      return await this.updatePhotoMetadata(
        photoId,
        {},
        {
          ...queryOptions,
          replaceAll: true,
        }
      );
    }
  }

  /**
   * 重新命名照片
   * 任務 7.2: 擴展 /api/photos 端點支援相簿特定操作
   */
  async renamePhoto(
    photoId: string,
    newFileName: string,
    options: OracleQueryOptions = {}
  ): Promise<Photo> {
    const sql = `
      UPDATE photos
      SET file_name = :newFileName
      WHERE id = :photoId AND deleted_at IS NULL
    `;

    const result = await this.executeRaw(
      sql,
      { photoId, newFileName },
      options
    );

    if (result.rowsAffected === 0) {
      throw new Error('照片不存在或已被刪除');
    }

    // 返回更新後的照片
    const updatedPhoto = await this.findById(photoId, options);
    if (!updatedPhoto) {
      throw new Error('更新後無法找到照片');
    }

    return updatedPhoto;
  }

  // ============================================
  // 檔案存取和下載功能 (Task 7.3)
  // ============================================

  /**
   * 驗證使用者對照片的檔案存取權限
   * Requirements: 3.5 - Oracle 權限驗證
   */
  async verifyFileAccess(
    photoId: string,
    userId: string,
    options: OracleQueryOptions = {}
  ): Promise<boolean> {
    const sql = `
      SELECT 1
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      JOIN projects proj ON pa.project_id = proj.id
      LEFT JOIN project_members pm ON proj.id = pm.project_id
      WHERE p.id = :photoId
        AND p.deleted_at IS NULL
        AND pa.deleted_at IS NULL
        AND (
          p.uploaded_by = :userId OR
          pm.user_id = :userId OR
          proj.created_by = :userId
        )
    `;

    const result = await this.executeRaw(sql, { photoId, userId }, options);
    return result.rows && result.rows.length > 0;
  }

  /**
   * 取得照片詳細資訊包含專案權限
   * Requirements: 3.5 - 安全檔案存取
   */
  async getPhotoWithPermissions(
    photoId: string,
    userId: string,
    options: OracleQueryOptions = {}
  ): Promise<(Photo & { projectId: string; albumName: string }) | null> {
    const sql = `
      SELECT
        p.*,
        pa.project_id,
        pa.name as album_name
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      JOIN projects proj ON pa.project_id = proj.id
      LEFT JOIN project_members pm ON proj.id = pm.project_id
      WHERE p.id = :photoId
        AND p.deleted_at IS NULL
        AND pa.deleted_at IS NULL
        AND (
          p.uploaded_by = :userId OR
          pm.user_id = :userId OR
          proj.created_by = :userId
        )
    `;

    const result = await this.executeRaw(sql, { photoId, userId }, options);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const photo = this.mapFromOracle(row);

    return {
      ...photo,
      projectId: row.project_id,
      albumName: row.album_name,
    };
  }

  /**
   * 記錄下載統計資料
   * Requirements: 3.5 - 下載追蹤
   */
  async updateDownloadStats(
    stats: {
      photoId: string;
      userId: string;
      downloadedAt: Date;
      resolution: string;
      fileSize: number;
      userAgent?: string;
    },
    options: OracleQueryOptions = {}
  ): Promise<boolean> {
    const sql = `
      INSERT INTO photo_download_stats (
        id, photo_id, user_id, downloaded_at, resolution,
        file_size, user_agent, created_at
      ) VALUES (
        SYS_GUID(), :photoId, :userId, :downloadedAt, :resolution,
        :fileSize, :userAgent, SYSDATE
      )
    `;

    const binds = {
      photoId: stats.photoId,
      userId: stats.userId,
      downloadedAt: stats.downloadedAt,
      resolution: stats.resolution,
      fileSize: stats.fileSize,
      userAgent: stats.userAgent || null,
    };

    try {
      const result = await this.executeRaw(sql, binds, options);
      return (result.rowsAffected || 0) > 0;
    } catch (error) {
      // 如果統計表不存在，僅記錄警告但不影響下載功能
      console.warn('Failed to record download stats:', error);
      return false;
    }
  }

  /**
   * 取得照片的下載統計
   * Requirements: 3.5 - 下載分析
   */
  async getPhotoDownloadStats(
    photoId: string,
    options: OracleQueryOptions = {}
  ): Promise<{
    totalDownloads: number;
    uniqueUsers: number;
    lastDownload?: Date;
    resolutionStats: Array<{ resolution: string; count: number }>;
  }> {
    const sql = `
      SELECT
        COUNT(*) as total_downloads,
        COUNT(DISTINCT user_id) as unique_users,
        MAX(downloaded_at) as last_download
      FROM photo_download_stats
      WHERE photo_id = :photoId
    `;

    const resolutionStatsSql = `
      SELECT
        resolution,
        COUNT(*) as count
      FROM photo_download_stats
      WHERE photo_id = :photoId
      GROUP BY resolution
      ORDER BY count DESC
    `;

    try {
      const [statsResult, resolutionResult] = await Promise.all([
        this.executeRaw(sql, { photoId }, options),
        this.executeRaw(resolutionStatsSql, { photoId }, options),
      ]);

      const stats = statsResult.rows?.[0] || {
        total_downloads: 0,
        unique_users: 0,
        last_download: null,
      };
      const resolutionStats =
        resolutionResult.rows?.map(row => ({
          resolution: row.resolution,
          count: row.count || 0,
        })) || [];

      return {
        totalDownloads: stats.total_downloads || 0,
        uniqueUsers: stats.unique_users || 0,
        lastDownload: stats.last_download
          ? new Date(stats.last_download)
          : undefined,
        resolutionStats,
      };
    } catch (error) {
      // 如果統計表不存在，返回默認值
      console.warn('Failed to get download stats:', error);
      return {
        totalDownloads: 0,
        uniqueUsers: 0,
        resolutionStats: [],
      };
    }
  }

  /**
   * 驗證批次檔案存取權限
   * Requirements: 3.5 - 批次下載安全
   */
  async verifyBatchFileAccess(
    photoIds: string[],
    userId: string,
    options: OracleQueryOptions = {}
  ): Promise<{
    authorized: string[];
    unauthorized: string[];
  }> {
    if (photoIds.length === 0) {
      return { authorized: [], unauthorized: [] };
    }

    const placeholders = photoIds.map((_, index) => `:id${index}`).join(', ');
    const binds = photoIds.reduce(
      (acc, id, index) => {
        acc[`id${index}`] = id;
        return acc;
      },
      { userId } as Record<string, any>
    );

    const sql = `
      SELECT DISTINCT p.id
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      JOIN projects proj ON pa.project_id = proj.id
      LEFT JOIN project_members pm ON proj.id = pm.project_id
      WHERE p.id IN (${placeholders})
        AND p.deleted_at IS NULL
        AND pa.deleted_at IS NULL
        AND (
          p.uploaded_by = :userId OR
          pm.user_id = :userId OR
          proj.created_by = :userId
        )
    `;

    const result = await this.executeRaw(sql, binds, options);
    const authorizedIds = result.rows?.map(row => row.id) || [];
    const unauthorizedIds = photoIds.filter(id => !authorizedIds.includes(id));

    return {
      authorized: authorizedIds,
      unauthorized: unauthorizedIds,
    };
  }

  /**
   * 取得照片的所有可用版本檔案路徑
   * Requirements: 3.5 - 多解析度檔案存取
   */
  async getPhotoFilePaths(
    photoId: string,
    options: OracleQueryOptions = {}
  ): Promise<{
    original?: string;
    thumbnail?: string;
    versions: Array<{ type: string; path: string; size: number }>;
  }> {
    // 取得原始照片路徑
    const photoSql = `
      SELECT file_path, thumbnail_path
      FROM photos
      WHERE id = :photoId AND deleted_at IS NULL
    `;

    // 取得所有版本路徑
    const versionsSql = `
      SELECT version_type, file_path, file_size
      FROM photo_versions
      WHERE photo_id = :photoId
      ORDER BY
        CASE version_type
          WHEN 'original' THEN 1
          WHEN 'large' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'small' THEN 4
          WHEN 'thumbnail' THEN 5
        END
    `;

    const [photoResult, versionsResult] = await Promise.all([
      this.executeRaw(photoSql, { photoId }, options),
      this.executeRaw(versionsSql, { photoId }, options),
    ]);

    const photo = photoResult.rows?.[0];
    const versions =
      versionsResult.rows?.map(row => ({
        type: row.version_type,
        path: row.file_path,
        size: row.file_size || 0,
      })) || [];

    return {
      original: photo?.file_path,
      thumbnail: photo?.thumbnail_path,
      versions,
    };
  }

  // ============================================
  // Metadata Export and Statistics (Task 8.3)
  // ============================================

  /**
   * 根據ID查找多個照片
   * Task 8.3: 實作 Metadata 匯出和報告功能
   */
  async findByIds(
    photoIds: string[],
    options: OracleQueryOptions = {}
  ): Promise<Photo[]> {
    if (photoIds.length === 0) return [];

    const placeholders = photoIds.map((_, index) => `:id${index}`).join(', ');
    const binds = photoIds.reduce(
      (acc, id, index) => {
        acc[`id${index}`] = id;
        return acc;
      },
      {} as Record<string, any>
    );

    const sql = `
      SELECT * FROM active_photos
      WHERE id IN (${placeholders})
      ORDER BY uploaded_at DESC
    `;

    const result = await this.executeRaw(sql, binds, options);
    return result.rows ? result.rows.map(row => this.mapFromOracle(row)) : [];
  }

  /**
   * 根據相簿ID查找所有照片
   * Task 8.3: 實作 Metadata 匯出和報告功能
   */
  async findByAlbum(
    albumId: string,
    options: OracleQueryOptions = {}
  ): Promise<Photo[]> {
    return await this.getAlbumPhotos(albumId, options);
  }

  /**
   * 根據專案ID查找所有照片
   * Task 8.3: 實作 Metadata 匯出和報告功能
   */
  async findByProject(
    projectId: string,
    options: OracleQueryOptions = {}
  ): Promise<Photo[]> {
    const sql = `
      SELECT p.* FROM active_photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      WHERE pa.project_id = :projectId
      ORDER BY p.uploaded_at DESC
    `;

    const result = await this.executeRaw(sql, { projectId }, options);
    return result.rows ? result.rows.map(row => this.mapFromOracle(row)) : [];
  }

  /**
   * 根據檔案路徑查找多個照片 (Task 10.2 需要)
   */
  async findByFilePath(
    filePath: string,
    options: OracleQueryOptions = {}
  ): Promise<Photo[]> {
    const sql = `
      SELECT * FROM active_photos
      WHERE file_path = :filePath
    `;

    const result = await this.executeRaw(sql, { filePath }, options);
    return result.rows ? result.rows.map(row => this.mapFromOracle(row)) : [];
  }

  /**
   * 計算相簿中的照片數量 (Task 10.2 需要)
   */
  async countByAlbumId(
    albumId: string,
    options: OracleQueryOptions = {}
  ): Promise<number> {
    const sql = `
      SELECT COUNT(*) as count
      FROM photos
      WHERE album_id = :albumId AND deleted_at IS NULL
    `;

    const result = await this.executeRaw(sql, { albumId }, options);
    return result.rows?.[0]?.count || 0;
  }

  /**
   * 查找所有照片記錄 (用於系統檢查，Task 10.2 需要)
   */
  async findAll(
    limit: number = 100,
    options: OracleQueryOptions = {}
  ): Promise<Photo[]> {
    const sql = `
      SELECT * FROM active_photos
      ORDER BY uploaded_at DESC
      FETCH FIRST :limit ROWS ONLY
    `;

    const result = await this.executeRaw(sql, { limit }, options);
    return result.rows ? result.rows.map(row => this.mapFromOracle(row)) : [];
  }

  /**
   * 根據相簿ID查找照片 (Task 10.2 需要)
   */
  async findByAlbumId(
    albumId: string,
    options: OracleQueryOptions = {}
  ): Promise<Photo[]> {
    return await this.getAlbumPhotos(albumId, options);
  }

  /**
   * 取得專案照片統計資訊
   * Task 8.3: 實作 Metadata 匯出和報告功能
   */
  async getStatistics(
    projectId: string,
    options: OracleQueryOptions = {}
  ): Promise<{
    totalPhotos: number;
    totalFileSize: number;
    averageFileSize: number;
    photosByType: Record<string, number>;
    photosByMonth: Record<string, number>;
    topUploaders: Array<{ userId: string; count: number }>;
    topTags: Array<{ tag: string; count: number }>;
    averageResolution?: { width: number; height: number };
  }> {
    // 基本統計
    const basicStatsSql = `
      SELECT
        COUNT(*) as total_photos,
        COALESCE(SUM(file_size), 0) as total_file_size,
        COALESCE(AVG(file_size), 0) as average_file_size,
        COALESCE(AVG(width), 0) as avg_width,
        COALESCE(AVG(height), 0) as avg_height
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      WHERE pa.project_id = :projectId AND p.deleted_at IS NULL
    `;

    // 按類型統計
    const typeStatsSql = `
      SELECT mime_type, COUNT(*) as count
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      WHERE pa.project_id = :projectId AND p.deleted_at IS NULL
      GROUP BY mime_type
    `;

    // 按月份統計
    const monthStatsSql = `
      SELECT
        TO_CHAR(uploaded_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      WHERE pa.project_id = :projectId AND p.deleted_at IS NULL
      GROUP BY TO_CHAR(uploaded_at, 'YYYY-MM')
      ORDER BY month
    `;

    // 上傳者統計
    const uploaderStatsSql = `
      SELECT uploaded_by as user_id, COUNT(*) as count
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      WHERE pa.project_id = :projectId AND p.deleted_at IS NULL
      GROUP BY uploaded_by
      ORDER BY count DESC
      FETCH FIRST 10 ROWS ONLY
    `;

    // 標籤統計
    const tagStatsSql = `
      SELECT
        JSON_VALUE(tags.value, '$') as tag,
        COUNT(*) as count
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id,
           JSON_TABLE(p.metadata, '$.tags[*]' COLUMNS (value VARCHAR2(255) PATH '$')) tags
      WHERE pa.project_id = :projectId AND p.deleted_at IS NULL
      GROUP BY JSON_VALUE(tags.value, '$')
      ORDER BY count DESC
      FETCH FIRST 10 ROWS ONLY
    `;

    const [basicStats, typeStats, monthStats, uploaderStats, tagStats] =
      await Promise.all([
        this.executeRaw(basicStatsSql, { projectId }, options),
        this.executeRaw(typeStatsSql, { projectId }, options),
        this.executeRaw(monthStatsSql, { projectId }, options),
        this.executeRaw(uploaderStatsSql, { projectId }, options),
        this.executeRaw(tagStatsSql, { projectId }, options).catch(() => ({
          rows: [],
        })), // 處理沒有標籤的情況
      ]);

    const basicRow = basicStats.rows?.[0] || {};

    const photosByType: Record<string, number> = {};
    typeStats.rows?.forEach(row => {
      photosByType[row.mime_type] = row.count || 0;
    });

    const photosByMonth: Record<string, number> = {};
    monthStats.rows?.forEach(row => {
      photosByMonth[row.month] = row.count || 0;
    });

    const topUploaders =
      uploaderStats.rows?.map(row => ({
        userId: row.user_id,
        count: row.count || 0,
      })) || [];

    const topTags =
      tagStats.rows?.map(row => ({
        tag: row.tag,
        count: row.count || 0,
      })) || [];

    return {
      totalPhotos: basicRow.total_photos || 0,
      totalFileSize: basicRow.total_file_size || 0,
      averageFileSize: basicRow.average_file_size || 0,
      photosByType,
      photosByMonth,
      topUploaders,
      topTags,
      averageResolution:
        basicRow.avg_width && basicRow.avg_height
          ? {
              width: Math.round(basicRow.avg_width),
              height: Math.round(basicRow.avg_height),
            }
          : undefined,
    };
  }
}
