/**
 * API Endpoints for Custom Metadata Fields Management
 * Task 8.3: 實作 Metadata 匯出和報告功能
 *
 * 實作自訂 metadata 欄位管理功能
 * 使用 Oracle JSON 靈活儲存自訂欄位
 */

import { NextRequest, NextResponse } from 'next/server';
import { MetadataExportService } from '@/lib/services/metadata-export-service';
import { z } from 'zod';

// 自訂欄位定義 schema
const customFieldsSchema = z.record(
  z.string(),
  z.enum(['string', 'number', 'boolean', 'date', 'json'])
);

// 匯出請求 schema
const exportWithCustomFieldsSchema = z.object({
  photoIds: z.array(z.string()),
  includeCustomFields: z.boolean().default(true),
});

// 全域自訂欄位設定（實際應用中應儲存在資料庫）
let globalCustomFields: Record<string, string> = {};

/**
 * GET /api/photos/custom-fields
 * Get current custom field definitions
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: globalCustomFields,
    });
  } catch (error) {
    console.error('Custom fields error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to get custom fields',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/photos/custom-fields
 * Define or update custom metadata fields
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // 驗證欄位定義
    const validationResult = customFieldsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid field definitions',
          errors: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const exportService = new MetadataExportService();

    try {
      await exportService.defineCustomFields(validationResult.data);
      globalCustomFields = validationResult.data;

      return NextResponse.json({
        success: true,
        message: 'Custom fields defined successfully',
        data: validationResult.data,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Failed to define custom fields',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Custom fields error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update custom fields',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/photos/custom-fields/export
 * Export photos with custom metadata fields
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 驗證請求參數
    const validationResult = exportWithCustomFieldsSchema.safeParse(body);
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

    const { photoIds, includeCustomFields } = validationResult.data;
    const exportService = new MetadataExportService();

    // 設定自訂欄位
    if (Object.keys(globalCustomFields).length > 0) {
      await exportService.defineCustomFields(globalCustomFields);
    }

    let result;

    if (includeCustomFields && Object.keys(globalCustomFields).length > 0) {
      // 匯出包含自訂欄位的資料
      result = await exportService.exportWithCustomFields(photoIds);
    } else {
      // 匯出標準資料
      result = await exportService.exportToJSON(photoIds);
    }

    return NextResponse.json({
      success: true,
      data: result,
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

/**
 * DELETE /api/photos/custom-fields
 * Clear custom field definitions
 */
export async function DELETE() {
  try {
    globalCustomFields = {};

    return NextResponse.json({
      success: true,
      message: 'Custom fields cleared successfully',
    });
  } catch (error) {
    console.error('Custom fields error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to clear custom fields',
      },
      { status: 500 }
    );
  }
}
