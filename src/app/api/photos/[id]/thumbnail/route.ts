/**
 * Photo Thumbnail API - 照片縮圖服務端點
 * GET /api/photos/[id]/thumbnail
 * 提供照片縮圖，支援不同尺寸和快取
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import type { ApiResponse } from '@/types/photo.types';
import { promises as fs } from 'fs';
import path from 'path';

type ThumbnailSize = 'small' | 'medium' | 'large';

const THUMBNAIL_SIZES = {
  small: 150,
  medium: 300,
  large: 600,
};

/**
 * GET /api/photos/[id]/thumbnail
 * 取得照片縮圖
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id: photoId } = resolvedParams;
    const { searchParams } = new URL(request.url);
    const size = (searchParams.get('size') as ThumbnailSize) || 'medium';

    console.log(`🖼️ 取得照片縮圖: ${photoId}, 尺寸: ${size}`);

    // 查詢照片資訊
    const photoQuery = `
      SELECT
        p.id,
        p.thumbnail_path,
        p.mime_type,
        pa.project_id
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      WHERE p.id = :1 AND p.deleted_at IS NULL
    `;

    const photoResult = await db.query(photoQuery, [photoId]);

    if (!photoResult || photoResult.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '照片不存在',
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const photo = photoResult[0];

    // 處理Oracle大小寫問題
    let thumbnailPath = photo.THUMBNAIL_PATH || photo.thumbnail_path;

    // TODO: 驗證使用者權限
    // const userId = await getUserIdFromRequest(request)
    // const hasPermission = await verifyViewPermission(photo.project_id, userId)
    // if (!hasPermission) {
    //   return NextResponse.json({
    //     success: false,
    //     error: '權限不足，無法查看此照片縮圖'
    //   }, { status: 403 })
    // }

    // 如果需要特定尺寸，檢查是否有對應的版本
    if (size !== 'medium') {
      const versionQuery = `
        SELECT file_path
        FROM photo_versions
        WHERE photo_id = :1 AND version_type = :2
      `;

      const versionResult = await db.query(versionQuery, [
        photoId,
        `thumbnail_${size}`,
      ]);

      if (versionResult && versionResult.length > 0) {
        thumbnailPath =
          versionResult[0].FILE_PATH || versionResult[0].file_path;
      }
    }

    // 讀取真實的縮圖檔案
    try {
      let thumbnailBuffer: Buffer | null = null;
      let realPath: string | null = null;

      // 如果有縮圖路徑，嘗試讀取
      if (thumbnailPath) {
        // 處理資料庫中的路徑（可能是絕對路徑或相對路徑）
        if (thumbnailPath.startsWith('/uploads/')) {
          // 資料庫儲存的是相對路徑，轉換為實際檔案系統路徑
          realPath = path.join(process.cwd(), 'public', thumbnailPath);
        } else {
          realPath = thumbnailPath;
        }

        try {
          await fs.access(realPath);
          thumbnailBuffer = await fs.readFile(realPath);
          console.log(`✅ 讀取縮圖成功: ${realPath}`);
        } catch (e) {
          console.log(`⚠️ 縮圖檔案不存在: ${realPath}`);
        }
      }

      if (!thumbnailBuffer) {
        // 沒有找到縮圖，抛出錯誤以使用預設圖片
        throw new Error('No thumbnail available');
      }

      // 決定 Content-Type
      const mimeType = photo.mime_type || 'image/jpeg';

      // 設置快取標頭
      const headers = new Headers({
        'Content-Type': mimeType,
        'Content-Length': thumbnailBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // 1年快取
        ETag: `"${photoId}-${size}"`,
        'Last-Modified': new Date().toUTCString(),
      });

      console.log(`✅ 成功取得縮圖: ${path.basename(thumbnailPath)}`);

      // 檢查 If-None-Match 標頭（ETag 快取）
      const ifNoneMatch = request.headers.get('If-None-Match');
      if (ifNoneMatch === `"${photoId}-${size}"`) {
        return new NextResponse(null, { status: 304, headers });
      }

      return new NextResponse(thumbnailBuffer, { headers });
    } catch (fileError) {
      console.warn(`縮圖檔案不存在: ${thumbnailPath}，返回預設圖片`);

      // 返回預設的佔位圖片 (SVG)
      const defaultSvg = generatePlaceholderSvg(THUMBNAIL_SIZES[size]);

      const headers = new Headers({
        'Content-Type': 'image/svg+xml',
        'Content-Length': defaultSvg.length.toString(),
        'Cache-Control': 'public, max-age=300', // 5分鐘快取
      });

      return new NextResponse(defaultSvg, { headers });
    }
  } catch (error) {
    console.error('❌ 取得縮圖失敗:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '取得縮圖失敗',
      } as ApiResponse<never>,
      { status: 500 }
    );
  } finally {
    // db 連接由連接池管理，不需要手動關閉
  }
}

/**
 * 生成預設佔位圖片 SVG
 */
function generatePlaceholderSvg(size: number): string {
  // 生成一個更美觀的測試圖片
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
  ];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${randomColor};stop-opacity:0.8" />
        <stop offset="100%" style="stop-color:${randomColor};stop-opacity:0.3" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad)"/>
    <rect x="10%" y="10%" width="80%" height="80%" fill="white" opacity="0.3" rx="10"/>
    <text x="50%" y="45%" text-anchor="middle" fill="white" font-family="sans-serif" font-size="${size / 10}" font-weight="bold">
      工程照片
    </text>
    <text x="50%" y="55%" text-anchor="middle" fill="white" font-family="sans-serif" font-size="${size / 15}">
      ${new Date().toLocaleDateString('zh-TW')}
    </text>
    <path d="M${size * 0.3} ${size * 0.65} L${size * 0.7} ${size * 0.65} L${size * 0.6} ${size * 0.45} L${size * 0.5} ${size * 0.55} L${size * 0.4} ${size * 0.45} Z"
          fill="white" opacity="0.5"/>
    <circle cx="${size * 0.35}" cy="${size * 0.35}" r="${size * 0.05}" fill="white" opacity="0.5"/>
  </svg>`;
}
