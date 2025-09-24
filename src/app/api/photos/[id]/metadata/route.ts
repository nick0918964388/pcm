/**
 * Photo Metadata API - 照片 Metadata 管理端點
 * GET /api/photos/[id]/metadata - 取得照片 metadata
 * POST /api/photos/[id]/metadata - 自動提取 EXIF 資料 (Task 8.1)
 * PUT /api/photos/[id]/metadata - 完整更新照片 metadata
 * PATCH /api/photos/[id]/metadata - 部分更新照片 metadata
 * DELETE /api/photos/[id]/metadata - 清除照片 metadata
 *
 * 任務 7.2: 實作照片管理 Oracle API 端點
 * 任務 8.1: 建立 EXIF 資料提取和 Oracle 儲存功能
 * - 實作照片 EXIF 資料自動提取功能
 * - 建立 GPS 位置、拍攝時間和相機資訊的 Oracle JSON 格式儲存
 * - 實作 metadata 資料驗證和清理機制
 * - 建立 metadata 更新失敗的恢復和 Oracle 日誌功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { OracleRepositoryFactory } from '@/lib/repositories/oracle-repository-factory';
import { ExifExtractionService } from '@/lib/services/exif-extraction-service';
import { z } from 'zod';
import type { ApiResponse } from '@/types/photo.types';
import type { PhotoMetadata } from '@/lib/repositories/types/photo.types';

// EXIF 提取請求驗證 Schema
const ExifExtractionSchema = z.object({
  force: z.boolean().optional().default(false), // 是否強制重新提取
  validate: z.boolean().optional().default(true), // 是否驗證資料
});

/**
 * GET /api/photos/[id]/metadata
 * 取得照片的完整 metadata
 * Requirements: 6.1, 6.2, 6.6
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const photoId = params.id;

    console.log(`📋 取得照片 metadata: ${photoId}`);

    // 使用 Oracle Repository
    const photoRepository = OracleRepositoryFactory.getPhotoRepository();

    // 檢查照片是否存在
    const photo = await photoRepository.findById(photoId);
    if (!photo) {
      return NextResponse.json(
        {
          success: false,
          error: '照片不存在',
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // TODO: 驗證使用者權限
    // const userId = await getUserIdFromRequest(request)
    // const hasPermission = await verifyPhotoViewPermission(photo.albumId, userId)
    // if (!hasPermission) {
    //   return NextResponse.json({
    //     success: false,
    //     error: '權限不足，無法查看此照片的 metadata'
    //   }, { status: 403 })
    // }

    // 取得照片 metadata
    const metadata = await photoRepository.getPhotoMetadata(photoId);

    console.log(`✅ 成功取得照片 metadata: ${photoId}`);

    return NextResponse.json({
      success: true,
      data: metadata || {},
      message: 'metadata 取得成功',
    } as ApiResponse<PhotoMetadata>);
  } catch (error) {
    console.error(`❌ 取得照片 metadata 失敗 (${params.id}):`, error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '取得照片 metadata 失敗',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}

/**
 * POST /api/photos/[id]/metadata
 * 自動提取和儲存照片 EXIF 資料
 * Task 8.1: 建立 EXIF 資料提取和 Oracle 儲存功能
 * Requirements: 6.1, 6.2, 6.6
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const photoId = params.id;

    // TODO: 從認證中間件取得用戶ID
    const userId = 'test-user-123';

    console.log(`🔍 EXIF 資料提取請求: ${photoId}, 使用者: ${userId}`);

    // 解析請求資料
    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      // 如果沒有請求體，使用預設值
      requestData = {};
    }

    const validatedData = ExifExtractionSchema.parse(requestData);

    // 1. 使用 Oracle Repository
    const photoRepository = OracleRepositoryFactory.getPhotoRepository();

    // 2. 驗證照片存取權限
    const hasAccess = await photoRepository.verifyFileAccess(photoId, userId);
    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: '權限不足，無法存取此照片',
        } as ApiResponse<never>,
        { status: 403 }
      );
    }

    // 3. 取得照片資訊
    const photo = await photoRepository.findById(photoId);
    if (!photo) {
      return NextResponse.json(
        {
          success: false,
          error: '照片不存在',
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // 4. 檢查是否需要提取 EXIF 資料
    const hasExistingExif =
      photo.metadata &&
      (photo.metadata.exif || photo.metadata.gps || photo.metadata.technical);
    if (hasExistingExif && !validatedData.force) {
      return NextResponse.json(
        {
          success: true,
          message: '照片已存在 EXIF 資料，使用 force=true 強制重新提取',
          data: photo.metadata,
        } as ApiResponse<PhotoMetadata>,
        { status: 200 }
      );
    }

    // 5. 檢查檔案格式是否支援 EXIF
    if (!ExifExtractionService.isFileSupported(photo.filePath)) {
      return NextResponse.json(
        {
          success: false,
          error: '此檔案格式不支援 EXIF 資料提取',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // 6. 建立 metadata 備份（如果有現有資料）
    let backupId: string | null = null;
    if (hasExistingExif) {
      try {
        backupId =
          (await photoRepository.createMetadataBackup?.(
            photoId,
            photo.metadata
          )) || null;
      } catch (error) {
        console.warn('建立 metadata 備份失敗:', error);
      }
    }

    // 7. 提取 EXIF 資料
    let extractedMetadata: PhotoMetadata | null = null;
    try {
      extractedMetadata = await ExifExtractionService.extractExifData(
        photo.filePath
      );
    } catch (error) {
      console.error('EXIF 資料提取失敗:', error);

      return NextResponse.json(
        {
          success: false,
          error: `EXIF 資料提取失敗: ${error instanceof Error ? error.message : 'Unknown error'}`,
        } as ApiResponse<never>,
        { status: 500 }
      );
    }

    // 8. 如果沒有提取到 EXIF 資料
    if (!extractedMetadata || Object.keys(extractedMetadata).length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: '照片無 EXIF 資料',
          data: {},
        } as ApiResponse<PhotoMetadata>,
        { status: 200 }
      );
    }

    // 9. 驗證提取的資料
    if (validatedData.validate) {
      const validation =
        ExifExtractionService.validateExifData(extractedMetadata);
      if (!validation.valid) {
        console.error('EXIF 資料驗證失敗:', validation.errors);

        return NextResponse.json(
          {
            success: false,
            error: `EXIF 資料驗證失敗: ${validation.errors.join(', ')}`,
          } as ApiResponse<never>,
          { status: 400 }
        );
      }

      if (validation.warnings && validation.warnings.length > 0) {
        console.warn('EXIF 資料驗證警告:', validation.warnings);
      }
    }

    // 10. 合併現有 metadata 與新提取的 EXIF 資料
    const mergedMetadata = {
      ...photo.metadata,
      ...extractedMetadata,
      // 保留自訂欄位
      tags: photo.metadata?.tags || [],
      description: photo.metadata?.description || '',
      customFields: photo.metadata?.customFields || {},
    };

    // 11. 儲存到 Oracle
    try {
      const updatedPhoto = await photoRepository.updatePhotoMetadata(
        photoId,
        mergedMetadata,
        {
          replaceAll: true, // 完全替換 metadata
        }
      );

      // 12. 記錄操作日誌
      await logMetadataOperation({
        photoId,
        userId,
        operation: 'exif_extraction',
        metadata: extractedMetadata,
        success: true,
        backupId,
      });

      console.log(`✅ EXIF 資料提取和儲存成功: ${photoId}`);

      return NextResponse.json(
        {
          success: true,
          message: 'EXIF 資料提取和儲存成功',
          data: updatedPhoto.metadata,
        } as ApiResponse<PhotoMetadata>,
        { status: 200 }
      );
    } catch (oracleError) {
      console.error('Oracle 儲存失敗:', oracleError);

      // 13. 嘗試恢復備份
      if (backupId) {
        try {
          await photoRepository.restoreMetadataFromBackup?.(photoId, backupId);
          console.log('已恢復 metadata 備份');
        } catch (restoreError) {
          console.error('恢復備份失敗:', restoreError);
        }
      }

      // 記錄失敗日誌
      await logMetadataOperation({
        photoId,
        userId,
        operation: 'exif_extraction',
        metadata: extractedMetadata,
        success: false,
        error:
          oracleError instanceof Error
            ? oracleError.message
            : 'Oracle storage failed',
        backupId,
      });

      return NextResponse.json(
        {
          success: false,
          error: `資料儲存失敗: ${oracleError instanceof Error ? oracleError.message : 'Unknown error'}`,
        } as ApiResponse<never>,
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ EXIF 資料處理失敗:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: `請求格式錯誤: ${error.errors[0]?.message || 'Validation failed'}`,
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'EXIF 資料處理失敗',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}

/**
 * PUT /api/photos/[id]/metadata
 * 完整更新照片 metadata（覆蓋現有資料）
 * Requirements: 6.1, 6.2, 6.6
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const photoId = params.id;

    console.log(`🔄 完整更新照片 metadata: ${photoId}`);

    // 解析請求資料
    let metadata: PhotoMetadata;
    try {
      metadata = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: '請求格式無效',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // 驗證 metadata 格式
    const validationError = validateMetadata(metadata);
    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: `metadata 格式無效: ${validationError}`,
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // 使用 Oracle Repository
    const photoRepository = OracleRepositoryFactory.getPhotoRepository();

    // 檢查照片是否存在
    const photo = await photoRepository.findById(photoId);
    if (!photo) {
      return NextResponse.json(
        {
          success: false,
          error: '照片不存在',
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // TODO: 驗證使用者權限
    // const userId = await getUserIdFromRequest(request)
    // const hasPermission = await verifyPhotoMetadataUpdatePermission(photo.albumId, userId)
    // if (!hasPermission) {
    //   return NextResponse.json({
    //     success: false,
    //     error: '權限不足，無法修改此照片的 metadata'
    //   }, { status: 403 })
    // }

    // 完整更新 metadata（覆蓋現有資料）
    const updatedPhoto = await photoRepository.updatePhotoMetadata(
      photoId,
      metadata,
      { replaceAll: true }
    );

    console.log(`✅ 照片 metadata 完整更新成功: ${photoId}`);

    return NextResponse.json({
      success: true,
      data: updatedPhoto.metadata || {},
      message: 'metadata 完整更新成功',
    } as ApiResponse<PhotoMetadata>);
  } catch (error) {
    console.error(`❌ 完整更新照片 metadata 失敗 (${params.id}):`, error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '完整更新照片 metadata 失敗',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/photos/[id]/metadata
 * 部分更新照片 metadata（合併現有資料）
 * Requirements: 6.1, 6.2, 6.6
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const photoId = params.id;

    console.log(`🔧 部分更新照片 metadata: ${photoId}`);

    // 解析請求資料
    let partialMetadata: Partial<PhotoMetadata>;
    try {
      partialMetadata = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: '請求格式無效',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // 驗證 metadata 格式
    const validationError = validateMetadata(partialMetadata, true);
    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: `metadata 格式無效: ${validationError}`,
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // 使用 Oracle Repository
    const photoRepository = OracleRepositoryFactory.getPhotoRepository();

    // 檢查照片是否存在
    const photo = await photoRepository.findById(photoId);
    if (!photo) {
      return NextResponse.json(
        {
          success: false,
          error: '照片不存在',
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // TODO: 驗證使用者權限
    // const userId = await getUserIdFromRequest(request)
    // const hasPermission = await verifyPhotoMetadataUpdatePermission(photo.albumId, userId)
    // if (!hasPermission) {
    //   return NextResponse.json({
    //     success: false,
    //     error: '權限不足，無法修改此照片的 metadata'
    //   }, { status: 403 })
    // }

    // 部分更新 metadata（合併現有資料）
    const updatedPhoto = await photoRepository.updatePhotoMetadata(
      photoId,
      partialMetadata,
      { replaceAll: false }
    );

    console.log(`✅ 照片 metadata 部分更新成功: ${photoId}`);

    return NextResponse.json({
      success: true,
      data: updatedPhoto.metadata || {},
      message: 'metadata 部分更新成功',
    } as ApiResponse<PhotoMetadata>);
  } catch (error) {
    console.error(`❌ 部分更新照片 metadata 失敗 (${params.id}):`, error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '部分更新照片 metadata 失敗',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/photos/[id]/metadata
 * 清除照片 metadata
 * - 支援完全清除：DELETE /api/photos/[id]/metadata
 * - 支援選擇性清除：DELETE /api/photos/[id]/metadata?fields=tags,customFields
 * Requirements: 6.1, 6.2, 6.6
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const photoId = params.id;
    const { searchParams } = new URL(request.url);

    // 解析要清除的欄位
    const fieldsParam = searchParams.get('fields');
    const fieldsToDelete = fieldsParam
      ? fieldsParam.split(',').map(f => f.trim())
      : null;

    console.log(`🗑️ 清除照片 metadata: ${photoId}`, {
      fields: fieldsToDelete || 'all',
    });

    // 使用 Oracle Repository
    const photoRepository = OracleRepositoryFactory.getPhotoRepository();

    // 檢查照片是否存在
    const photo = await photoRepository.findById(photoId);
    if (!photo) {
      return NextResponse.json(
        {
          success: false,
          error: '照片不存在',
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // TODO: 驗證使用者權限
    // const userId = await getUserIdFromRequest(request)
    // const hasPermission = await verifyPhotoMetadataUpdatePermission(photo.albumId, userId)
    // if (!hasPermission) {
    //   return NextResponse.json({
    //     success: false,
    //     error: '權限不足，無法刪除此照片的 metadata'
    //   }, { status: 403 })
    // }

    // 清除 metadata
    const clearedPhoto = await photoRepository.clearPhotoMetadata(
      photoId,
      fieldsToDelete ? { fields: fieldsToDelete } : undefined
    );

    const message = fieldsToDelete
      ? `指定的 metadata 欄位已清除: ${fieldsToDelete.join(', ')}`
      : '所有 metadata 已清除';

    console.log(`✅ 照片 metadata 清除成功: ${photoId}`);

    return NextResponse.json({
      success: true,
      data: clearedPhoto.metadata || {},
      message,
    } as ApiResponse<PhotoMetadata>);
  } catch (error) {
    console.error(`❌ 清除照片 metadata 失敗 (${params.id}):`, error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '清除照片 metadata 失敗',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}

/**
 * 驗證 metadata 格式
 */
function validateMetadata(
  metadata: any,
  isPartial: boolean = false
): string | null {
  if (!metadata || typeof metadata !== 'object') {
    return '必須是有效的物件';
  }

  // 驗證標籤格式
  if (metadata.tags !== undefined) {
    if (!Array.isArray(metadata.tags)) {
      return 'tags 必須是陣列格式';
    }

    if (metadata.tags.some((tag: any) => typeof tag !== 'string')) {
      return 'tags 陣列中的所有元素都必須是字串';
    }
  }

  // 驗證描述格式
  if (metadata.description !== undefined) {
    if (typeof metadata.description !== 'string') {
      return 'description 必須是字串格式';
    }
  }

  // 驗證 EXIF 格式
  if (metadata.exif !== undefined) {
    if (typeof metadata.exif !== 'object' || metadata.exif === null) {
      return 'exif 必須是物件格式';
    }

    // 驗證 EXIF 設定
    if (metadata.exif.settings !== undefined) {
      if (
        typeof metadata.exif.settings !== 'object' ||
        metadata.exif.settings === null
      ) {
        return 'exif.settings 必須是物件格式';
      }
    }

    // 驗證 EXIF 位置
    if (metadata.exif.location !== undefined) {
      const location = metadata.exif.location;
      if (typeof location !== 'object' || location === null) {
        return 'exif.location 必須是物件格式';
      }

      if (
        location.latitude !== undefined &&
        typeof location.latitude !== 'number'
      ) {
        return 'exif.location.latitude 必須是數字';
      }

      if (
        location.longitude !== undefined &&
        typeof location.longitude !== 'number'
      ) {
        return 'exif.location.longitude 必須是數字';
      }
    }
  }

  // 驗證客製化欄位格式
  if (metadata.customFields !== undefined) {
    if (
      typeof metadata.customFields !== 'object' ||
      metadata.customFields === null
    ) {
      return 'customFields 必須是物件格式';
    }
  }

  return null;
}

/**
 * 記錄 Metadata 操作日誌
 * Task 8.1: 建立 metadata 更新失敗的恢復和 Oracle 日誌功能
 */
async function logMetadataOperation(operation: {
  photoId: string;
  userId: string;
  operation: string;
  metadata: any;
  success: boolean;
  error?: string;
  backupId?: string | null;
}): Promise<void> {
  try {
    // TODO: 實作日誌記錄到 Oracle 或檔案系統
    // 可以考慮建立 metadata_operation_logs 表格
    console.log('📋 Metadata 操作日誌:', {
      ...operation,
      timestamp: new Date().toISOString(),
    });

    // 未來可以擴展為：
    // const logRepository = OracleRepositoryFactory.getMetadataLogRepository()
    // await logRepository.createLog({
    //   ...operation,
    //   timestamp: new Date()
    // })
  } catch (error) {
    console.error('記錄操作日誌失敗:', error);
    // 日誌記錄失敗不應影響主要操作
  }
}
