/**
 * Photo Management API - 單一照片管理端點
 * DELETE /api/photos/[id] - 刪除照片
 * GET /api/photos/[id] - 取得照片資訊
 * PUT /api/photos/[id] - 更新照片資訊
 * PATCH /api/photos/[id] - 更新照片 Metadata
 *
 * 任務 7.2: 實作照片管理 Oracle API 端點
 * - 擴展現有 /api/photos 端點支援相簿特定操作
 * - 實作照片 metadata 更新和查詢 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseConnection } from '@/lib/database/connection';
import { OracleRepositoryFactory } from '@/lib/repositories/oracle-repository-factory';
import type { ApiResponse } from '@/types/photo.types';
import type {
  Photo,
  PhotoMetadata,
} from '@/lib/repositories/types/photo.types';
import { promises as fs } from 'fs';
import { z } from 'zod';

// 照片更新請求驗證 Schema
const PhotoUpdateSchema = z.object({
  fileName: z
    .string()
    .min(1, '檔案名稱不能為空')
    .max(255, '檔案名稱過長')
    .optional(),
});

// Metadata 更新請求驗證 Schema
const MetadataUpdateSchema = z.object({
  metadata: z.record(z.any()).optional(),
});

/**
 * DELETE /api/photos/[id]
 * 刪除照片（軟刪除）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection: DatabaseConnection | null = null;

  try {
    const photoId = params.id;

    console.log(`🗑️ 刪除照片請求: ${photoId}`);

    // 建立資料庫連接
    connection = new DatabaseConnection();
    await connection.connect();

    // 查詢照片資訊
    const photoQuery = `
      SELECT
        p.*,
        pa.project_id,
        pa.name as album_name
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `;

    const photoResult = await connection.query(photoQuery, [photoId]);

    if (photoResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '照片不存在或已被刪除',
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const photo = photoResult.rows[0];

    // TODO: 驗證使用者權限
    // const userId = await getUserIdFromRequest(request)
    // const hasPermission = await verifyDeletePermission(photo.project_id, userId, photo.uploaded_by)
    // if (!hasPermission) {
    //   return NextResponse.json({
    //     success: false,
    //     error: '權限不足，無法刪除此照片'
    //   }, { status: 403 })
    // }

    // 軟刪除照片（設置 deleted_at 時間戳）
    const deleteQuery = `
      UPDATE photos
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;

    const deleteResult = await connection.query(deleteQuery, [photoId]);

    if (deleteResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '照片刪除失敗',
        } as ApiResponse<never>,
        { status: 500 }
      );
    }

    // 刪除相關的照片版本記錄
    const deleteVersionsQuery = `
      DELETE FROM photo_versions
      WHERE photo_id = $1
    `;
    await connection.query(deleteVersionsQuery, [photoId]);

    // 可選：實際刪除檔案（暫時註解，可根據需求決定是否立即刪除）
    /*
    try {
      await fs.access(photo.file_path)
      await fs.unlink(photo.file_path)

      if (photo.thumbnail_path) {
        await fs.access(photo.thumbnail_path)
        await fs.unlink(photo.thumbnail_path)
      }
    } catch (fileError) {
      console.warn(`檔案刪除失敗: ${fileError}`)
      // 檔案刪除失敗不影響資料庫刪除操作
    }
    */

    console.log(`✅ 照片刪除成功: ${photo.file_name}`);

    return NextResponse.json({
      success: true,
      message: '照片刪除成功',
      data: {
        id: photoId,
        fileName: photo.file_name,
      },
    } as ApiResponse<{ id: string; fileName: string }>);
  } catch (error) {
    console.error('❌ 照片刪除失敗:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '照片刪除失敗',
      } as ApiResponse<never>,
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

/**
 * GET /api/photos/[id]
 * 取得單一照片詳細資訊
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection: DatabaseConnection | null = null;

  try {
    const photoId = params.id;

    console.log(`📷 取得照片資訊: ${photoId}`);

    // 建立資料庫連接
    connection = new DatabaseConnection();
    await connection.connect();

    // 查詢照片詳細資訊
    const photoQuery = `
      SELECT
        p.id,
        p.album_id,
        p.file_name,
        p.file_size,
        p.mime_type,
        p.width,
        p.height,
        p.thumbnail_path,
        p.uploaded_by,
        p.uploaded_at,
        p.metadata,
        pa.project_id,
        pa.name as album_name
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `;

    const photoResult = await connection.query(photoQuery, [photoId]);

    if (photoResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '照片不存在',
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const photo = photoResult.rows[0];

    // TODO: 驗證使用者權限
    // const userId = await getUserIdFromRequest(request)
    // const hasPermission = await verifyViewPermission(photo.project_id, userId)
    // if (!hasPermission) {
    //   return NextResponse.json({
    //     success: false,
    //     error: '權限不足，無法查看此照片'
    //   }, { status: 403 })
    // }

    // 轉換為前端格式
    const photoData = {
      id: photo.id,
      projectId: photo.project_id,
      albumId: photo.album_id,
      fileName: photo.file_name,
      fileSize: photo.file_size,
      mimeType: photo.mime_type,
      width: photo.width,
      height: photo.height,
      thumbnailUrl: `/api/photos/${photo.id}/thumbnail`,
      originalUrl: `/api/photos/${photo.id}/download`,
      uploadedBy: photo.uploaded_by,
      uploadedAt: new Date(photo.uploaded_at),
      metadata: photo.metadata || {},
      albumName: photo.album_name,
    };

    console.log(`✅ 成功取得照片資訊: ${photo.file_name}`);

    return NextResponse.json({
      success: true,
      data: photoData,
    } as ApiResponse<typeof photoData>);
  } catch (error) {
    console.error('❌ 取得照片資訊失敗:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '取得照片資訊失敗',
      } as ApiResponse<never>,
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

/**
 * PUT /api/photos/[id]
 * 更新照片基本資訊
 * Requirements: 2.4, 5.4, 5.5
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const photoId = params.id;

    console.log(`📝 更新照片資訊: ${photoId}`);

    // 解析請求資料
    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: '請求格式無效',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // 驗證請求資料
    if (
      requestData.fileName !== undefined &&
      (!requestData.fileName || requestData.fileName.length === 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: '檔案名稱不能為空',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    const validatedData = requestData;

    // 使用 Oracle Repository
    const photoRepository = OracleRepositoryFactory.getPhotoRepository();

    // 檢查照片是否存在
    const existingPhoto = await photoRepository.findById(photoId);
    if (!existingPhoto) {
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
    // const hasPermission = await verifyPhotoUpdatePermission(existingPhoto.albumId, userId)
    // if (!hasPermission) {
    //   return NextResponse.json({
    //     success: false,
    //     error: '權限不足，無法修改此照片'
    //   }, { status: 403 })
    // }

    let updatedPhoto: Photo;

    // 根據更新類型執行相應操作
    if (validatedData.fileName) {
      updatedPhoto = await photoRepository.renamePhoto(
        photoId,
        validatedData.fileName
      );
    } else {
      // 如果沒有指定更新內容，返回現有照片
      updatedPhoto = existingPhoto;
    }

    // 轉換為前端格式
    const photoData = {
      id: updatedPhoto.id,
      albumId: updatedPhoto.albumId,
      fileName: updatedPhoto.fileName,
      fileSize: updatedPhoto.fileSize,
      mimeType: updatedPhoto.mimeType,
      width: updatedPhoto.width,
      height: updatedPhoto.height,
      thumbnailUrl: `/api/photos/${updatedPhoto.id}/thumbnail`,
      originalUrl: `/api/photos/${updatedPhoto.id}/download`,
      uploadedBy: updatedPhoto.uploadedBy,
      uploadedAt: updatedPhoto.uploadedAt,
      metadata: updatedPhoto.metadata,
    };

    console.log(`✅ 照片更新成功: ${updatedPhoto.fileName}`);

    return NextResponse.json({
      success: true,
      data: photoData,
      message: '照片更新成功',
    } as ApiResponse<typeof photoData>);
  } catch (error) {
    console.error('❌ 更新照片失敗:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.errors[0]?.message || '驗證失敗',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '更新照片失敗',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/photos/[id]
 * 更新照片 Metadata
 * Requirements: 2.4, 6.1, 6.2, 6.6
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const photoId = params.id;

    console.log(`🏷️ 更新照片 Metadata: ${photoId}`);

    // 解析請求資料
    let requestData;
    try {
      requestData = await request.json();
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
    if (
      requestData.metadata &&
      requestData.metadata.tags &&
      !Array.isArray(requestData.metadata.tags)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: '標籤必須是陣列格式',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // 驗證請求資料
    const validatedData = requestData;

    // 使用 Oracle Repository
    const photoRepository = OracleRepositoryFactory.getPhotoRepository();

    // 檢查照片是否存在
    const existingPhoto = await photoRepository.findById(photoId);
    if (!existingPhoto) {
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
    // const hasPermission = await verifyPhotoUpdatePermission(existingPhoto.albumId, userId)
    // if (!hasPermission) {
    //   return NextResponse.json({
    //     success: false,
    //     error: '權限不足，無法修改此照片'
    //   }, { status: 403 })
    // }

    // 更新 metadata
    const updatedPhoto = await photoRepository.updatePhotoMetadata(
      photoId,
      validatedData.metadata
    );

    // 轉換為前端格式
    const photoData = {
      id: updatedPhoto.id,
      albumId: updatedPhoto.albumId,
      fileName: updatedPhoto.fileName,
      fileSize: updatedPhoto.fileSize,
      mimeType: updatedPhoto.mimeType,
      width: updatedPhoto.width,
      height: updatedPhoto.height,
      thumbnailUrl: `/api/photos/${updatedPhoto.id}/thumbnail`,
      originalUrl: `/api/photos/${updatedPhoto.id}/download`,
      uploadedBy: updatedPhoto.uploadedBy,
      uploadedAt: updatedPhoto.uploadedAt,
      metadata: updatedPhoto.metadata,
    };

    console.log(`✅ 照片 Metadata 更新成功: ${updatedPhoto.fileName}`);

    return NextResponse.json({
      success: true,
      data: photoData,
      message: '照片 Metadata 更新成功',
    } as ApiResponse<typeof photoData>);
  } catch (error) {
    console.error('❌ 更新照片 Metadata 失敗:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.errors[0]?.message || '驗證失敗',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '更新照片 Metadata 失敗',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
