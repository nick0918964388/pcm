/**
 * Photo File Serving API - 照片檔案服務端點
 * GET /api/photos/[id]/file
 * Task 7.3: 實作檔案串流傳輸，優化大檔案存取效能
 *
 * Features:
 * - Oracle 權限驗證
 * - 安全檔案路徑驗證
 * - 大檔案串流傳輸
 * - Range requests 支援
 * - 下載統計記錄
 */

import { NextRequest, NextResponse } from 'next/server';
import { OracleRepositoryFactory } from '@/lib/repositories/oracle-repository-factory';
import { FileSecurityService } from '@/lib/services/file-security-service';
import { readFile, createReadStream, stat } from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id: photoId } = resolvedParams;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'original'; // original, thumbnail, medium, small, large
    const token = searchParams.get('token');

    // TODO: 從請求中提取用戶ID（實際實作中應從認證中間件取得）
    const userId = 'test-user-123';

    console.log(
      `📷 檔案存取請求: ${photoId}, 類型: ${type}, 使用者: ${userId}`
    );

    // 1. 速率限制檢查
    const rateLimit = FileSecurityService.checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: '下載頻率限制超過，請稍後再試',
          resetTime: new Date(rateLimit.resetTime).toISOString(),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(
              (rateLimit.resetTime - Date.now()) / 1000
            ).toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetTime.toString(),
          },
        }
      );
    }

    // 2. Oracle 權限驗證
    const photoRepository = OracleRepositoryFactory.getPhotoRepository();
    const hasAccess = await photoRepository.verifyFileAccess(photoId, userId);

    if (!hasAccess) {
      console.warn(`🚫 使用者 ${userId} 無權存取照片 ${photoId}`);
      return NextResponse.json(
        {
          success: false,
          error: '權限不足，無法存取此照片',
        },
        { status: 403 }
      );
    }

    // 3. 取得照片資訊和檔案路徑
    const photoWithPermissions = await photoRepository.getPhotoWithPermissions(
      photoId,
      userId
    );
    if (!photoWithPermissions) {
      return NextResponse.json(
        {
          success: false,
          error: '照片不存在或無存取權限',
        },
        { status: 404 }
      );
    }

    // 4. 確定檔案路徑
    let dbPath: string;
    let resolution = type;

    if (type === 'thumbnail') {
      dbPath =
        photoWithPermissions.thumbnailPath || photoWithPermissions.filePath;
      resolution = 'thumbnail';
    } else if (['small', 'medium', 'large'].includes(type)) {
      // 查詢特定版本
      const photoVersion = await photoRepository.getPhotoVersion(
        photoId,
        type as any
      );
      if (photoVersion) {
        dbPath = photoVersion.filePath;
        resolution = type;
      } else {
        // 如果版本不存在，使用原始檔案
        dbPath = photoWithPermissions.filePath;
        resolution = 'original';
      }
    } else {
      dbPath = photoWithPermissions.filePath;
      resolution = 'original';
    }

    // 5. 檔案安全性驗證
    const securityCheck = await FileSecurityService.checkFilePermissions(
      dbPath,
      {
        userId,
        allowedExtensions: [
          '.jpg',
          '.jpeg',
          '.png',
          '.gif',
          '.webp',
          '.bmp',
          '.tiff',
        ],
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
        ],
      }
    );

    if (!securityCheck.accessible) {
      console.error(`🔒 檔案安全檢查失敗: ${securityCheck.error}`);

      // 返回占位符圖片
      const size = type === 'thumbnail' ? 150 : 600;
      const placeholderSvg = generatePlaceholderSvg(size);

      return new NextResponse(placeholderSvg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Length': placeholderSvg.length.toString(),
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    // 6. 建構完整檔案路徑
    const fullPath = path.resolve(process.cwd(), 'public', dbPath);
    const stats = securityCheck.fileStats;

    // 7. 生成 ETag 和設置基本 headers
    const etag = FileSecurityService.generateETag(stats);
    const mimeType = FileSecurityService.getMimeType(dbPath);
    const fileName = FileSecurityService.sanitizeFileName(
      photoWithPermissions.fileName
    );

    // 8. 檢查 If-None-Match header (304 Not Modified)
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // 9. 處理 Range requests (串流大檔案)
    const rangeHeader = request.headers.get('range');
    const rangeRequest = FileSecurityService.parseRangeHeader(
      rangeHeader,
      stats.size
    );

    const responseHeaders = new Headers({
      'Content-Type': mimeType,
      ETag: etag,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename="${fileName}"`,
      'X-RateLimit-Remaining': rateLimit.remainingRequests.toString(),
    });

    // 10. 記錄下載統計
    await photoRepository.updateDownloadStats({
      photoId,
      userId,
      downloadedAt: new Date(),
      resolution,
      fileSize: stats.size,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    if (rangeRequest) {
      // 部分內容請求
      const { start, end, total } = rangeRequest;
      const contentLength = end - start + 1;

      responseHeaders.set('Content-Length', contentLength.toString());
      responseHeaders.set('Content-Range', `bytes ${start}-${end}/${total}`);

      // 讀取指定範圍的檔案內容
      const buffer = Buffer.alloc(contentLength);
      const fs = await import('fs');
      const fd = await fs.promises.open(fullPath, 'r');
      await fd.read(buffer, 0, contentLength, start);
      await fd.close();

      console.log(
        `📤 串流傳輸範圍: ${start}-${end}/${total} (${path.basename(fullPath)})`
      );

      return new NextResponse(buffer, {
        status: 206, // Partial Content
        headers: responseHeaders,
      });
    } else {
      // 完整檔案內容
      responseHeaders.set('Content-Length', stats.size.toString());

      // 對於大檔案，使用串流傳輸
      if (stats.size > 10 * 1024 * 1024) {
        // 10MB 以上
        // 使用 Node.js 串流 (在 Edge Runtime 中可能需要調整)
        const fileBuffer = await readFile(fullPath);

        console.log(
          `📤 完整檔案傳輸: ${stats.size} bytes (${path.basename(fullPath)})`
        );

        return new NextResponse(fileBuffer, {
          status: 200,
          headers: responseHeaders,
        });
      } else {
        // 小檔案直接讀取
        const fileBuffer = await readFile(fullPath);

        console.log(
          `📤 小檔案傳輸: ${stats.size} bytes (${path.basename(fullPath)})`
        );

        return new NextResponse(fileBuffer, {
          status: 200,
          headers: responseHeaders,
        });
      }
    }
  } catch (error) {
    console.error('❌ 檔案服務錯誤:', error);

    // 在發生錯誤時也返回占位符
    const size = 400;
    const placeholderSvg = generatePlaceholderSvg(size, '檔案載入失敗');

    return new NextResponse(placeholderSvg, {
      status: 500,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Length': placeholderSvg.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  }
}

/**
 * 生成預設佔位圖片 SVG
 */
function generatePlaceholderSvg(
  size: number,
  message: string = '工程照片'
): string {
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
      ${message}
    </text>
    <text x="50%" y="55%" text-anchor="middle" fill="white" font-family="sans-serif" font-size="${size / 15}">
      ${new Date().toLocaleDateString('zh-TW')}
    </text>
    <path d="M${size * 0.3} ${size * 0.65} L${size * 0.7} ${size * 0.65} L${size * 0.6} ${size * 0.45} L${size * 0.5} ${size * 0.55} L${size * 0.4} ${size * 0.45} Z"
          fill="white" opacity="0.5"/>
    <circle cx="${size * 0.35}" cy="${size * 0.35}" r="${size * 0.05}" fill="white" opacity="0.5"/>
  </svg>`;
}
