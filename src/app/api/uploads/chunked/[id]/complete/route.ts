/**
 * Chunked Upload Complete API - 完成分塊上傳端點
 * POST /api/uploads/chunked/[id]/complete - 完成分塊上傳並合併檔案
 *
 * 任務 7.2: 實作照片管理 Oracle API 端點
 * - 建立分塊上傳專用 API 端點和 Oracle 狀態管理
 * - 完成分塊上傳後合併檔案並建立照片記錄
 * - Oracle 資料庫更新最終狀態
 */

import { NextRequest, NextResponse } from 'next/server';
import { ChunkedUploadService } from '@/lib/services/chunked-upload-service';
import type { ApiResponse } from '@/types/photo.types';

interface CompleteUploadRequest {
  checksum?: string;
  metadata?: Record<string, any>;
}

/**
 * POST /api/uploads/chunked/[id]/complete
 * 完成分塊上傳，合併檔案並建立照片記錄
 * Requirements: 2.2, 2.6, 4.6, 5.4
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    console.log(`🎯 完成分塊上傳會話: ${sessionId}`);

    // 解析請求資料（可選）
    let requestData: CompleteUploadRequest = {};
    try {
      const body = await request.text();
      if (body.trim()) {
        requestData = JSON.parse(body);
      }
    } catch (error) {
      // 如果解析失敗，使用預設空物件
      console.warn('完成上傳請求解析失敗，使用預設參數:', error);
    }

    // 使用分塊上傳服務完成上傳
    const chunkedUploadService = new ChunkedUploadService();

    try {
      const completionResult = await chunkedUploadService.completeUploadSession(
        sessionId,
        requestData.checksum,
        requestData.metadata
      );

      console.log(`✅ 分塊上傳完成: ${completionResult.photo.fileName}`);

      // 轉換為前端格式
      const photoData = {
        id: completionResult.photo.id,
        albumId: completionResult.photo.albumId,
        fileName: completionResult.photo.fileName,
        fileSize: completionResult.photo.fileSize,
        mimeType: completionResult.photo.mimeType,
        width: completionResult.photo.width,
        height: completionResult.photo.height,
        thumbnailUrl: `/api/photos/${completionResult.photo.id}/thumbnail`,
        originalUrl: `/api/photos/${completionResult.photo.id}/download`,
        uploadedBy: completionResult.photo.uploadedBy,
        uploadedAt: completionResult.photo.uploadedAt,
        uploadStatus: completionResult.photo.uploadStatus,
        metadata: completionResult.photo.metadata,
      };

      return NextResponse.json({
        success: true,
        data: {
          sessionId: completionResult.sessionId,
          status: completionResult.status,
          photo: photoData,
        },
        message: `檔案 ${completionResult.photo.fileName} 上傳完成`,
      } as ApiResponse<typeof completionResult>);
    } catch (error) {
      if (error instanceof Error) {
        // 處理特定錯誤類型
        if (error.message.includes('上傳會話不存在')) {
          return NextResponse.json(
            {
              success: false,
              error: '上傳會話不存在或已過期',
            } as ApiResponse<never>,
            { status: 404 }
          );
        }

        if (error.message.includes('分塊上傳不完整')) {
          return NextResponse.json(
            {
              success: false,
              error: error.message,
            } as ApiResponse<never>,
            { status: 400 }
          );
        }

        if (error.message.includes('檔案校驗失敗')) {
          return NextResponse.json(
            {
              success: false,
              error: error.message,
            } as ApiResponse<never>,
            { status: 400 }
          );
        }

        if (error.message.includes('檔案合併失敗')) {
          return NextResponse.json(
            {
              success: false,
              error: error.message,
            } as ApiResponse<never>,
            { status: 500 }
          );
        }
      }

      throw error; // 重新拋出其他錯誤
    }
  } catch (error) {
    console.error(`❌ 完成分塊上傳失敗 (會話: ${params.id}):`, error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '完成分塊上傳失敗',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
