/**
 * Chunked Upload Chunk API - 分塊上傳端點
 * POST /api/uploads/chunked/[id]/chunk - 上傳單一分塊
 *
 * 任務 7.2: 實作照片管理 Oracle API 端點
 * - 建立分塊上傳專用 API 端點和 Oracle 狀態管理
 * - 支援分塊重複上傳和斷點續傳
 * - Oracle 資料庫追蹤每個分塊的狀態
 */

import { NextRequest, NextResponse } from 'next/server';
import { ChunkedUploadService } from '@/lib/services/chunked-upload-service';
import type { ApiResponse } from '@/types/photo.types';

/**
 * POST /api/uploads/chunked/[id]/chunk
 * 上傳單一分塊到指定的上傳會話
 * Requirements: 2.2, 2.6, 4.6
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    console.log(`📦 上傳分塊到會話: ${sessionId}`);

    // 解析 FormData
    const formData = await request.formData();
    const chunkFile = formData.get('chunk') as File;
    const chunkIndexStr = formData.get('chunkIndex') as string;

    // 驗證必要參數
    if (!chunkFile) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少分塊資料',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    if (!chunkIndexStr || isNaN(Number(chunkIndexStr))) {
      return NextResponse.json(
        {
          success: false,
          error: '分塊索引無效',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    const chunkIndex = parseInt(chunkIndexStr);

    if (chunkIndex < 0) {
      return NextResponse.json(
        {
          success: false,
          error: '分塊索引必須大於等於 0',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // 驗證分塊大小（不能為空）
    console.log(
      `📦 處理分塊 ${chunkIndex}, 檔案名稱: ${chunkFile.name}, 大小: ${chunkFile.size} bytes, 類型: ${chunkFile.type}`
    );

    if (chunkFile.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '分塊不能為空',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // 使用分塊上傳服務處理分塊
    const chunkedUploadService = new ChunkedUploadService();

    try {
      const chunkResult = await chunkedUploadService.uploadChunk(
        sessionId,
        chunkIndex,
        chunkFile
      );

      console.log(`✅ 分塊 ${chunkIndex} 上傳成功`);

      // 根據結果決定回應訊息
      let message = `分塊 ${chunkIndex} 上傳成功`;
      if (chunkResult.duplicate) {
        message = `分塊 ${chunkIndex} 已存在，跳過上傳`;
      }

      return NextResponse.json({
        success: true,
        data: {
          sessionId: chunkResult.sessionId,
          chunkIndex: chunkResult.chunkIndex,
          chunkSize: chunkResult.chunkSize,
          uploaded: chunkResult.uploaded,
          duplicate: chunkResult.duplicate || false,
          checksum: chunkResult.checksum,
        },
        message,
      } as ApiResponse<typeof chunkResult>);
    } catch (error) {
      if (error instanceof Error && error.message.includes('上傳會話不存在')) {
        return NextResponse.json(
          {
            success: false,
            error: '上傳會話不存在或已過期',
          } as ApiResponse<never>,
          { status: 404 }
        );
      }

      if (error instanceof Error && error.message.includes('分塊索引無效')) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          } as ApiResponse<never>,
          { status: 400 }
        );
      }

      throw error; // 重新拋出其他錯誤
    }
  } catch (error) {
    console.error(`❌ 上傳分塊失敗 (會話: ${params.id}):`, error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '上傳分塊失敗',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
