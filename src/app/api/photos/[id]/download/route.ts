/**
 * Photo Download API - 照片下載端點
 * Task 7.3: 建立照片下載功能，支援單一和批次下載
 *
 * POST /api/photos/[id]/download - 生成安全下載連結
 * GET /api/photos/[id]/download - 驗證令牌並下載檔案
 */

import { NextRequest, NextResponse } from 'next/server';
import { OracleRepositoryFactory } from '@/lib/repositories/oracle-repository-factory';
import { FileSecurityService } from '@/lib/services/file-security-service';
import type {
  DownloadOptions,
  DownloadResponse,
  PhotoResolution,
} from '@/types/photo.types';
import path from 'path';
import { readFile } from 'fs/promises';

interface RequestBody {
  options: DownloadOptions;
}

interface BatchDownloadRequest {
  photoIds: string[];
  options: {
    resolution: PhotoResolution;
    format?: 'zip' | 'individual';
    compression?: boolean;
  };
}

/**
 * POST /api/photos/[id]/download
 * 生成安全的下載連結
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const photoId = params.id;
    const body: RequestBody = await request.json();
    const { options } = body;

    // TODO: 從認證中間件取得用戶ID
    const userId = 'test-user-123';

    console.log(
      `📥 生成下載連結請求: ${photoId}, 解析度: ${options.resolution}, 使用者: ${userId}`
    );

    // 1. 速率限制檢查
    const rateLimit = FileSecurityService.checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: '下載頻率限制超過，請稍後再試',
          resetTime: new Date(rateLimit.resetTime).toISOString(),
        },
        { status: 429 }
      );
    }

    // 2. Oracle 權限驗證
    const photoRepository = OracleRepositoryFactory.getPhotoRepository();
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

    // 3. 取得檔案路徑和資訊
    const filePaths = await photoRepository.getPhotoFilePaths(photoId);
    let targetPath: string;
    let fileName: string;
    let fileSize = 0;

    if (options.resolution === 'original') {
      targetPath = filePaths.original || photoWithPermissions.filePath;
      fileName = photoWithPermissions.fileName;
      fileSize = photoWithPermissions.fileSize;
    } else if (options.resolution === 'thumbnail') {
      targetPath =
        filePaths.thumbnail ||
        filePaths.original ||
        photoWithPermissions.filePath;
      const ext = path.extname(photoWithPermissions.fileName);
      const nameWithoutExt = path.basename(photoWithPermissions.fileName, ext);
      fileName = `${nameWithoutExt}-thumbnail${ext}`;
    } else {
      // 查找特定版本
      const version = filePaths.versions.find(
        v => v.type === options.resolution
      );
      if (version) {
        targetPath = version.path;
        fileSize = version.size;
        const ext = path.extname(photoWithPermissions.fileName);
        const nameWithoutExt = path.basename(
          photoWithPermissions.fileName,
          ext
        );
        fileName = `${nameWithoutExt}-${options.resolution}${ext}`;
      } else {
        // 如果版本不存在，使用原始檔案
        targetPath = filePaths.original || photoWithPermissions.filePath;
        fileName = photoWithPermissions.fileName;
        fileSize = photoWithPermissions.fileSize;
      }
    }

    // 4. 檢查檔案可存取性
    const securityCheck = await FileSecurityService.checkFilePermissions(
      targetPath,
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
          '.pdf',
        ],
        maxFileSize: 100 * 1024 * 1024, // 100MB
      }
    );

    if (!securityCheck.accessible) {
      return NextResponse.json(
        {
          success: false,
          error: `檔案無法存取: ${securityCheck.error}`,
        },
        { status: 404 }
      );
    }

    // 5. 生成安全下載令牌
    const secureToken = FileSecurityService.generateSecureToken(
      photoId,
      userId,
      options.resolution
    );

    // 6. 構建下載URL
    const downloadUrl = `/api/photos/${photoId}/download?token=${secureToken.token}&resolution=${options.resolution}&type=file`;

    const response: DownloadResponse = {
      success: true,
      downloadUrl,
      fileName: FileSecurityService.sanitizeFileName(fileName),
      fileSize: securityCheck.fileStats?.size || fileSize,
      expiresAt: new Date(secureToken.expiresAt),
    };

    console.log(
      `✅ 下載連結生成成功: ${fileName} (${response.fileSize} bytes)`
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ 生成下載連結失敗:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '生成下載連結失敗',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/photos/[id]/download
 * 驗證令牌並提供檔案下載
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const resolution = searchParams.get('resolution') as PhotoResolution;
    const type = searchParams.get('type') || 'file';
    const photoId = params.id;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少下載令牌',
        },
        { status: 400 }
      );
    }

    console.log(`📤 驗證下載令牌: ${photoId}, 解析度: ${resolution}`);

    // 1. 驗證下載令牌
    const tokenValidation = FileSecurityService.validateToken(token);
    if (!tokenValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: tokenValidation.error,
        },
        {
          status: tokenValidation.error?.includes('過期') ? 410 : 403,
        }
      );
    }

    const tokenPayload = tokenValidation.payload!;

    // 2. 驗證令牌參數匹配
    if (
      tokenPayload.photoId !== photoId ||
      tokenPayload.resolution !== resolution
    ) {
      return NextResponse.json(
        {
          success: false,
          error: '下載令牌參數不匹配',
        },
        { status: 403 }
      );
    }

    // 3. 再次驗證 Oracle 權限
    const photoRepository = OracleRepositoryFactory.getPhotoRepository();
    const hasAccess = await photoRepository.verifyFileAccess(
      photoId,
      tokenPayload.userId
    );

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: '權限已變更，無法下載',
        },
        { status: 403 }
      );
    }

    // 4. 取得照片和檔案路徑資訊
    const photoWithPermissions = await photoRepository.getPhotoWithPermissions(
      photoId,
      tokenPayload.userId
    );
    if (!photoWithPermissions) {
      return NextResponse.json(
        {
          success: false,
          error: '照片不存在或已被刪除',
        },
        { status: 404 }
      );
    }

    const filePaths = await photoRepository.getPhotoFilePaths(photoId);
    let targetPath: string;
    let fileName: string;

    if (resolution === 'original') {
      targetPath = filePaths.original || photoWithPermissions.filePath;
      fileName = photoWithPermissions.fileName;
    } else if (resolution === 'thumbnail') {
      targetPath =
        filePaths.thumbnail ||
        filePaths.original ||
        photoWithPermissions.filePath;
      const ext = path.extname(photoWithPermissions.fileName);
      const nameWithoutExt = path.basename(photoWithPermissions.fileName, ext);
      fileName = `${nameWithoutExt}-thumbnail${ext}`;
    } else {
      const version = filePaths.versions.find(v => v.type === resolution);
      if (version) {
        targetPath = version.path;
        const ext = path.extname(photoWithPermissions.fileName);
        const nameWithoutExt = path.basename(
          photoWithPermissions.fileName,
          ext
        );
        fileName = `${nameWithoutExt}-${resolution}${ext}`;
      } else {
        targetPath = filePaths.original || photoWithPermissions.filePath;
        fileName = photoWithPermissions.fileName;
      }
    }

    // 5. 最終安全檢查
    const securityCheck = await FileSecurityService.checkFilePermissions(
      targetPath,
      {
        userId: tokenPayload.userId,
      }
    );

    if (!securityCheck.accessible) {
      return NextResponse.json(
        {
          success: false,
          error: '檔案當前無法存取',
        },
        { status: 404 }
      );
    }

    // 6. 讀取檔案並返回
    const fullPath = path.resolve(process.cwd(), 'public', targetPath);
    const fileBuffer = await readFile(fullPath);
    const mimeType = FileSecurityService.getMimeType(targetPath);
    const safeFileName = FileSecurityService.sanitizeFileName(fileName);

    // 7. 記錄下載統計
    await photoRepository.updateDownloadStats({
      photoId,
      userId: tokenPayload.userId,
      downloadedAt: new Date(),
      resolution,
      fileSize: fileBuffer.length,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    const headers = new Headers({
      'Content-Type': mimeType,
      'Content-Length': fileBuffer.length.toString(),
      'Content-Disposition': `attachment; filename="${safeFileName}"`,
      'Cache-Control': 'private, no-cache',
      'X-Download-Stats': 'recorded',
    });

    console.log(
      `✅ 檔案下載成功: ${safeFileName} (${fileBuffer.length} bytes)`
    );

    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error('❌ 檔案下載失敗:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '檔案下載失敗',
      },
      { status: 500 }
    );
  }
}
