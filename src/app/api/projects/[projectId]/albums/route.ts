/**
 * 專案相簿管理 API 端點
 * GET /api/projects/[projectId]/albums - 取得專案相簿列表
 * POST /api/projects/[projectId]/albums - 建立新相簿
 */

import { NextRequest, NextResponse } from 'next/server';
import { OracleRepositoryFactory } from '@/lib/repositories/oracle-repository-factory';
import { LocalFileStorageService } from '@/lib/storage/local-file-storage';
import { CreateAlbumRequest } from '@/lib/repositories/types/album.types';
import { z } from 'zod';

// 建立相簿請求驗證 schema
const CreateAlbumSchema = z.object({
  name: z
    .string()
    .min(1, '相簿名稱為必填')
    .max(100, '相簿名稱不能超過100個字符'),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

/**
 * GET /api/projects/[projectId]/albums
 * 取得專案相簿列表
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
      `📋 取得專案相簿列表: ${projectId}, page=${page}, limit=${limit}`
    );

    // 取得專案相簿列表
    const albumRepository = OracleRepositoryFactory.getAlbumRepository();
    const albums = await albumRepository.getProjectAlbums(
      projectId,
      'current_user'
    ); // TODO: 從認證中取得使用者ID

    // 格式化相簿資料
    const formattedAlbums = albums.map(album => ({
      id: album.id,
      projectId: album.projectId,
      name: album.name,
      description: album.description || '',
      photoCount: album.photoCount || 0,
      coverPhotoUrl: album.coverPhotoId
        ? `/api/photos/${album.coverPhotoId}/thumbnail`
        : null,
      tags: [], // TODO: 加入標籤支援
      nfsPath: '', // TODO: 加入 NFS 路徑支援
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
    }));

    console.log(`✅ 成功取得 ${formattedAlbums.length} 個相簿`);

    return NextResponse.json({
      success: true,
      data: formattedAlbums,
      meta: {
        total: formattedAlbums.length,
        page,
        limit,
        totalPages: Math.ceil(formattedAlbums.length / limit),
      },
    });
  } catch (error) {
    console.error('❌ 取得相簿列表失敗:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '取得相簿列表失敗',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/albums
 * 建立新相簿
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { projectId } = resolvedParams;

    // 解析請求資料
    const requestData = await request.json();
    const validatedData = CreateAlbumSchema.parse(requestData);

    console.log(`📤 建立新相簿: ${validatedData.name} 在專案 ${projectId}`);

    // TODO: 驗證專案是否存在
    // const projectRepository = OracleRepositoryFactory.getProjectRepository()
    // const project = await projectRepository.getById(projectId)

    // TODO: 加入名稱重複檢查
    // const albumRepository = factory.getAlbumRepository()
    // const existingAlbum = await albumRepository.findByProjectAndName(projectId, validatedData.name)

    // 建立本地目錄
    const fileStorage = new LocalFileStorageService();
    const directoryResult = await fileStorage.createAlbumDirectory(
      projectId,
      validatedData.name
    );

    if (!directoryResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `建立本地目錄失敗: ${directoryResult.error?.message}`,
        },
        { status: 500 }
      );
    }

    // 取得相簿倉儲
    const albumRepository = OracleRepositoryFactory.getAlbumRepository();

    // 建立相簿記錄
    const createRequest: CreateAlbumRequest = {
      projectId,
      name: validatedData.name,
      description: validatedData.description || '',
      createdBy: 'current_user', // TODO: 從認證中取得使用者ID
    };

    const newAlbum = await albumRepository.createAlbum(createRequest);

    console.log(`✅ 相簿建立成功: ${newAlbum.id}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: newAlbum.id,
          projectId: newAlbum.projectId,
          name: newAlbum.name,
          description: newAlbum.description,
          photoCount: 0,
          tags: [], // TODO: 加入標籤支援
          nfsPath: directoryResult.data!.path,
          createdAt: newAlbum.createdAt,
          updatedAt: newAlbum.updatedAt,
        },
        message: '相簿建立成功',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ 建立相簿失敗:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.errors[0].message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '建立相簿失敗',
      },
      { status: 500 }
    );
  }
}
