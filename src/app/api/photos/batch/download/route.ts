/**
 * Batch Photo Download API - 批次照片下載端點
 * POST /api/photos/batch/download - 批次下載照片
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { photoIds } = body;

    console.log(`📦 批次下載請求: ${photoIds?.length || 0} 張照片`);

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '請提供有效的照片ID列表',
        },
        { status: 400 }
      );
    }

    // 模擬生成 ZIP 文件
    const mockZipContent = Buffer.from('Mock ZIP file content for batch download');

    console.log(`✅ 批次下載準備完成: ${photoIds.length} 張照片`);

    return new NextResponse(mockZipContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="photos-${new Date().getTime()}.zip"`,
        'Content-Length': mockZipContent.length.toString(),
      },
    });
  } catch (error) {
    console.error('❌ 批次下載失敗:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '批次下載失敗',
      },
      { status: 500 }
    );
  }
}