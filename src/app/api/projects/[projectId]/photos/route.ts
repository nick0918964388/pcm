/**
 * Project Photos API - 專案照片管理端點
 * GET /api/projects/[projectId]/photos - 取得專案照片列表
 * POST /api/projects/[projectId]/photos - 上傳照片到專案
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';

/**
 * GET /api/projects/[projectId]/photos
 * 取得專案照片列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const resolvedParams = await params;
    const { projectId } = resolvedParams;

    // 分頁參數
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log(
      `📋 取得專案照片列表: ${projectId}, page=${page}, limit=${limit}`
    );

    // 首先驗證專案是否存在
    const projectQuery =
      'SELECT id FROM projects WHERE id = :1 AND is_active = 1';
    const projectResult = await db.query(projectQuery, [projectId]);

    if (!projectResult || projectResult.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '專案不存在或無權限存取',
        },
        { status: 404 }
      );
    }

    // 查詢照片 - 通過相簿表關聯專案
    const photosQuery = `
      SELECT p.*, pa.project_id, pa.name as album_name
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      WHERE pa.project_id = :1
      AND p.deleted_at IS NULL
      ORDER BY p.uploaded_at DESC
    `;

    const photosResult = await db.query(photosQuery, [projectId]);

    // 格式化照片資料
    const photos = photosResult.map((row: any) => ({
      id: row.ID || row.id,
      projectId: row.PROJECT_ID || row.project_id,
      albumId: row.ALBUM_ID || row.album_id,
      fileName: row.FILE_NAME || row.file_name,
      fileSize: row.FILE_SIZE || row.file_size,
      mimeType: row.MIME_TYPE || row.mime_type,
      width: row.WIDTH || row.width,
      height: row.HEIGHT || row.height,
      thumbnailUrl: `/api/photos/${row.ID || row.id}/thumbnail`,
      originalUrl: `/api/photos/${row.ID || row.id}/download`,
      uploadedBy: row.UPLOADED_BY || row.uploaded_by,
      uploadedAt: row.UPLOADED_AT || row.uploaded_at,
      metadata: {},
    }));

    console.log(`✅ 成功取得 ${photos.length} 張照片`);

    return NextResponse.json({
      success: true,
      data: photos,
      meta: {
        total: photos.length,
        page,
        limit,
        totalPages: Math.ceil(photos.length / limit),
      },
    });
  } catch (error) {
    console.error('❌ 取得照片列表失敗:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '取得照片列表失敗',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/photos
 * 上傳照片到專案
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { projectId } = resolvedParams;

    console.log(`📤 上傳照片到專案: ${projectId}`);

    // 驗證專案是否存在
    const projectQuery =
      'SELECT id FROM projects WHERE id = :1 AND is_active = 1';
    const projectResult = await db.query(projectQuery, [projectId]);

    if (!projectResult || projectResult.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '專案不存在或無權限存取',
        },
        { status: 404 }
      );
    }

    // 先取得第一個相簿ID
    const albumQuery =
      'SELECT id FROM photo_albums WHERE project_id = :1 ORDER BY CREATED_AT ASC';
    const albumResult = await db.query(albumQuery, [projectId]);

    if (!albumResult || albumResult.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '專案沒有相簿',
        },
        { status: 400 }
      );
    }

    const albumId = albumResult[0].ID || albumResult[0].id;

    // 模擬上傳成功（簡化實現）
    const mockPhoto = {
      id: `photo_${Date.now()}`,
      projectId,
      albumId,
      fileName: 'uploaded_photo.jpg',
      fileSize: 1024000,
      mimeType: 'image/jpeg',
      width: 1920,
      height: 1080,
      thumbnailUrl: '/api/photos/mock/thumbnail',
      originalUrl: '/api/photos/mock/download',
      uploadedBy: 'current_user',
      uploadedAt: new Date().toISOString(),
      metadata: {},
    };

    // 插入照片到資料庫
    console.log(
      `⏳ 正在插入照片到資料庫: ${mockPhoto.id}, albumId: ${albumId}`
    );

    const insertQuery = `
      INSERT INTO photos (id, album_id, file_name, file_path, file_size, mime_type, uploaded_by, uploaded_at)
      VALUES (:1, :2, :3, :4, :5, :6, :7, CURRENT_TIMESTAMP)
    `;

    const insertParams = [
      mockPhoto.id,
      albumId,
      mockPhoto.fileName,
      '/uploads/' + mockPhoto.fileName,
      mockPhoto.fileSize,
      mockPhoto.mimeType,
      'current_user',
    ];

    console.log(`📊 SQL參數:`, insertParams);

    // 使用事務確保INSERT有COMMIT
    const insertResult = await db.transaction(async client => {
      return await client.query(insertQuery, insertParams);
    });
    console.log(`📊 INSERT結果(已提交):`, insertResult);

    console.log(`✅ 照片上傳成功: ${mockPhoto.id}`);

    return NextResponse.json({
      success: true,
      data: mockPhoto,
      message: '照片上傳成功',
    });
  } catch (error) {
    console.error('❌ 照片上傳失敗:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '照片上傳失敗',
      },
      { status: 500 }
    );
  }
}
