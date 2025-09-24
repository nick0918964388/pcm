/**
 * Chunked Upload Start API - 開始分塊上傳端點
 * POST /api/uploads/chunked/start - 開始新的分塊上傳會話
 *
 * 任務 7.2: 實作照片管理 Oracle API 端點
 * - 建立分塊上傳專用 API 端點和 Oracle 狀態管理
 * - 支援大檔案分塊上傳，減少記憶體使用
 * - Oracle 資料庫追蹤上傳狀態和進度
 */

import { NextRequest, NextResponse } from 'next/server';
import { ChunkedUploadService } from '@/lib/services/chunked-upload-service';
import type { ApiResponse } from '@/types/photo.types';

// 支援的檔案類型
const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
];

// 檔案大小限制 (500MB)
const MAX_FILE_SIZE = 500 * 1024 * 1024;

// 最小分塊大小 (256KB)
const MIN_CHUNK_SIZE = 256 * 1024;

// 最大分塊大小 (10MB)
const MAX_CHUNK_SIZE = 10 * 1024 * 1024;

interface StartUploadRequest {
  fileName: string;
  fileSize: number;
  mimeType: string;
  albumId: string;
  chunkSize: number;
  totalChunks: number;
  userId?: string;
}

/**
 * POST /api/uploads/chunked/start
 * 開始新的分塊上傳會話
 * Requirements: 2.2, 2.6, 4.6, 5.4
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📤 開始分塊上傳會話');

    // 解析請求資料
    let requestData: StartUploadRequest;
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

    // 驗證必要欄位
    const { fileName, fileSize, mimeType, albumId, chunkSize, totalChunks } =
      requestData;

    if (
      !fileName ||
      !fileSize ||
      !mimeType ||
      !albumId ||
      !chunkSize ||
      !totalChunks
    ) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必要的上傳參數',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // 驗證檔案大小
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `檔案大小超過限制，最大支援 ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    if (fileSize <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: '檔案大小必須大於 0',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // 驗證檔案類型
    if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: `不支援的檔案類型: ${mimeType}`,
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // 驗證分塊大小
    if (chunkSize < MIN_CHUNK_SIZE || chunkSize > MAX_CHUNK_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `分塊大小必須介於 ${MIN_CHUNK_SIZE / 1024}KB 到 ${MAX_CHUNK_SIZE / (1024 * 1024)}MB 之間`,
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // 驗證分塊數量計算
    const expectedChunks = Math.ceil(fileSize / chunkSize);
    if (totalChunks !== expectedChunks) {
      return NextResponse.json(
        {
          success: false,
          error: `分塊數量不正確，預期 ${expectedChunks}，收到 ${totalChunks}`,
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // TODO: 驗證使用者權限和相簿存在性
    // const userId = await getUserIdFromRequest(request)
    // const hasUploadPermission = await verifyAlbumUploadPermission(albumId, userId)
    // if (!hasUploadPermission) {
    //   return NextResponse.json({
    //     success: false,
    //     error: '權限不足，無法上傳至此相簿'
    //   }, { status: 403 })
    // }

    console.log(
      `📁 建立分塊上傳會話: ${fileName} (${fileSize} bytes, ${totalChunks} chunks)`
    );

    // 使用分塊上傳服務建立會話
    const chunkedUploadService = new ChunkedUploadService();

    const uploadSession = await chunkedUploadService.startUploadSession({
      fileName,
      fileSize,
      mimeType,
      albumId,
      chunkSize,
      totalChunks,
      userId: requestData.userId || 'current_user', // TODO: 從認證中取得
    });

    console.log(`✅ 分塊上傳會話建立成功: ${uploadSession.id}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: uploadSession.id,
          fileName: uploadSession.fileName,
          fileSize: uploadSession.fileSize,
          chunkSize: uploadSession.chunkSize,
          totalChunks: uploadSession.totalChunks,
          uploadedChunks: uploadSession.uploadedChunks,
          status: uploadSession.status,
          expiresAt: uploadSession.expiresAt,
        },
        message: '分塊上傳會話建立成功',
      } as ApiResponse<typeof uploadSession>,
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ 建立分塊上傳會話失敗:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '建立分塊上傳會話失敗',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
