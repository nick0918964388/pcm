/**
 * Album Photos API - 相簿照片管理端點
 * GET /api/albums/[albumId]/photos - 取得相簿中的照片列表
 * POST /api/albums/[albumId]/photos - 批次上傳照片到相簿
 *
 * 任務 7.2: 實作照片管理 Oracle API 端點
 * - 實作 /api/albums/[albumId]/photos 批次上傳端點
 * - 建立分塊上傳專用 API 端點和 Oracle 狀態管理
 */

import { NextRequest, NextResponse } from 'next/server';
import { OracleRepositoryFactory } from '@/lib/repositories/oracle-repository-factory';
import { ChunkedUploadService } from '@/lib/services/chunked-upload-service';
import { LocalFileStorageService } from '@/lib/storage/local-file-storage';
import type { ApiResponse } from '@/types/photo.types';
import type {
  Photo,
  CreatePhotoRequest,
  PhotoBatchUploadResult,
} from '@/lib/repositories/types/photo.types';

/**
 * GET /api/albums/[albumId]/photos
 * 取得相簿中的照片列表
 * Requirements: 2.1, 5.4
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { albumId: string } }
) {
  try {
    const albumId = params.albumId;
    const { searchParams } = new URL(request.url);

    // 分頁參數
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log(
      `📋 取得相簿照片列表: ${albumId}, page=${page}, limit=${limit}`
    );

    // 使用 Oracle Repository
    const albumRepository = OracleRepositoryFactory.getAlbumRepository();
    const photoRepository = OracleRepositoryFactory.getPhotoRepository();

    // 檢查相簿是否存在
    const album = await albumRepository.findById(albumId);
    if (!album) {
      return NextResponse.json(
        {
          success: false,
          error: '相簿不存在',
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // TODO: 驗證使用者權限
    // const userId = await getUserIdFromRequest(request)
    // const hasPermission = await verifyAlbumViewPermission(albumId, userId)
    // if (!hasPermission) {
    //   return NextResponse.json({
    //     success: false,
    //     error: '權限不足，無法查看此相簿'
    //   }, { status: 403 })
    // }

    // 取得相簿中的照片
    const photos = await photoRepository.getAlbumPhotos(albumId);

    // 格式化照片資料
    const formattedPhotos = photos.map(photo => ({
      id: photo.id,
      albumId: photo.albumId,
      fileName: photo.fileName,
      fileSize: photo.fileSize,
      mimeType: photo.mimeType,
      width: photo.width,
      height: photo.height,
      thumbnailUrl: `/api/photos/${photo.id}/thumbnail`,
      originalUrl: `/api/photos/${photo.id}/download`,
      uploadedBy: photo.uploadedBy,
      uploadedAt: photo.uploadedAt,
      uploadStatus: photo.uploadStatus,
      metadata: photo.metadata,
    }));

    // 實作分頁邏輯
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPhotos = formattedPhotos.slice(startIndex, endIndex);
    const totalPages = Math.ceil(formattedPhotos.length / limit);

    console.log(`✅ 成功取得 ${paginatedPhotos.length} 張照片`);

    return NextResponse.json({
      success: true,
      data: paginatedPhotos,
      meta: {
        page,
        limit,
        total: formattedPhotos.length,
        totalPages,
      },
    } as ApiResponse<typeof paginatedPhotos>);
  } catch (error) {
    console.error('❌ 取得相簿照片列表失敗:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '取得相簿照片列表失敗',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}

/**
 * POST /api/albums/[albumId]/photos
 * 批次上傳照片到相簿
 * Requirements: 2.1, 2.2, 2.6, 4.6, 5.4
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { albumId: string } }
) {
  try {
    const albumId = params.albumId;

    console.log(`📤 批次上傳照片到相簿: ${albumId}`);

    // 使用 Oracle Repository
    const albumRepository = OracleRepositoryFactory.getAlbumRepository();

    // 檢查相簿是否存在
    const album = await albumRepository.findById(albumId);
    if (!album) {
      return NextResponse.json(
        {
          success: false,
          error: '相簿不存在',
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // TODO: 驗證使用者權限
    // const userId = await getUserIdFromRequest(request)
    // const hasPermission = await verifyAlbumUploadPermission(albumId, userId)
    // if (!hasPermission) {
    //   return NextResponse.json({
    //     success: false,
    //     error: '權限不足，無法上傳至此相簿'
    //   }, { status: 403 })
    // }

    // 解析 FormData
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '沒有選擇要上傳的檔案',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    console.log(`📁 準備上傳 ${files.length} 個檔案`);

    // 使用分塊上傳服務處理批次上傳
    const chunkedUploadService = new ChunkedUploadService();

    // 將檔案轉換為上傳請求格式
    const uploadRequests = await Promise.all(
      files.map(async (file, index) => {
        // 建立檔案路徑
        const projectId = album.projectId;
        const albumName = album.name;
        const filePath = `/uploads/photos/${projectId}/${albumName}/${file.name}`;

        return {
          albumId,
          fileName: file.name,
          filePath,
          fileSize: file.size,
          mimeType: file.type,
          uploadedBy: 'current_user', // TODO: 從認證中取得使用者ID
          metadata: {},
        } as CreatePhotoRequest;
      })
    );

    // 執行批次上傳
    const uploadResult = await chunkedUploadService.uploadBatch(
      files,
      uploadRequests,
      {
        albumId,
        projectId: album.projectId,
        userId: 'current_user', // TODO: 從認證中取得使用者ID
      }
    );

    // 根據結果決定回應狀態碼
    let statusCode = 201; // Created
    if (uploadResult.totalFailed > 0) {
      if (uploadResult.totalSuccess > 0) {
        statusCode = 207; // Multi-Status (部分成功)
      } else {
        statusCode = 400; // Bad Request (全部失敗)
      }
    }

    console.log(
      `✅ 批次上傳完成: ${uploadResult.totalSuccess} 成功, ${uploadResult.totalFailed} 失敗`
    );

    return NextResponse.json(
      {
        success: true,
        data: uploadResult,
        message: `批次上傳完成：${uploadResult.totalSuccess} 成功，${uploadResult.totalFailed} 失敗`,
      } as ApiResponse<PhotoBatchUploadResult>,
      { status: statusCode }
    );
  } catch (error) {
    console.error('❌ 批次上傳照片失敗:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '批次上傳照片失敗',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
