/**
 * API Endpoints for Photo Metadata Export
 * Task 8.3: 實作 Metadata 匯出和報告功能
 *
 * 提供照片 metadata 批次匯出功能
 * 支援多種匯出格式（CSV、JSON、Excel）
 * 利用 Oracle 查詢優化提升匯出效能
 */

import { NextRequest, NextResponse } from 'next/server';
import { MetadataExportService } from '@/lib/services/metadata-export-service';
import { z } from 'zod';

// 請求參數驗證 schema
const exportRequestSchema = z
  .object({
    photoIds: z.array(z.string()).optional(),
    albumId: z.string().optional(),
    projectId: z.string().optional(),
    format: z.enum(['json', 'csv', 'xlsx']).default('json'),
  })
  .refine(
    data => {
      // 至少需要一個條件
      return data.photoIds || data.albumId || data.projectId;
    },
    {
      message: 'At least one of photoIds, albumId, or projectId is required',
    }
  );

/**
 * POST /api/photos/export
 * Export photo metadata in various formats
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 驗證請求參數
    const validationResult = exportRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request parameters',
          errors: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { photoIds, albumId, projectId, format } = validationResult.data;
    const exportService = new MetadataExportService();

    let exportResult;

    if (photoIds && photoIds.length > 0) {
      // 匯出特定照片
      switch (format) {
        case 'csv':
          exportResult = await exportService.exportToCSV(photoIds);
          break;
        case 'xlsx':
          exportResult = await exportService.exportToExcel(photoIds);
          break;
        default:
          exportResult = await exportService.exportToJSON(photoIds);
      }
    } else if (albumId) {
      // 匯出相簿內所有照片
      exportResult = await exportService.exportAlbumMetadata(albumId, format);
    } else if (projectId) {
      // 匯出專案內所有照片
      exportResult = await exportService.exportProjectMetadata(
        projectId,
        format
      );
    }

    if (!exportResult) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to export metadata',
        },
        { status: 500 }
      );
    }

    // 根據格式設定適當的 response headers
    const headers = new Headers();
    headers.set('Content-Type', exportResult.contentType);
    headers.set(
      'Content-Disposition',
      `attachment; filename="${exportResult.fileName}"`
    );

    // 返回檔案內容
    return new NextResponse(exportResult.content, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Export failed',
      },
      { status: 500 }
    );
  }
}
