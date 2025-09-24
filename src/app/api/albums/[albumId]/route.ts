/**
 * 單一相簿管理 API 端點
 * GET /api/albums/[albumId] - 取得相簿詳細資訊
 * PUT /api/albums/[albumId] - 更新相簿資訊
 * DELETE /api/albums/[albumId] - 刪除相簿
 */

import { NextRequest, NextResponse } from 'next/server';
import { OracleRepositoryFactory } from '@/lib/repositories/oracle-repository-factory';
import { UpdateAlbumRequest } from '@/lib/repositories/types/album.types';
import { z } from 'zod';

// 更新相簿請求驗證 schema
const UpdateAlbumSchema = z.object({
  name: z
    .string()
    .min(1, '相簿名稱為必填')
    .max(100, '相簿名稱不能超過100個字符')
    .optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/albums/[albumId]
 * 取得相簿詳細資訊
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { albumId } = resolvedParams;

    console.log(`📋 取得相簿詳細資訊: ${albumId}`);

    // 取得相簿資訊
    const albumRepository = OracleRepositoryFactory.getAlbumRepository();
    const album = await albumRepository.getAlbumById(albumId, 'current_user'); // TODO: 從認證中取得使用者ID

    if (!album) {
      return NextResponse.json(
        {
          success: false,
          error: '相簿不存在或已刪除',
        },
        { status: 404 }
      );
    }

    console.log(`✅ 成功取得相簿: ${album.name}`);

    return NextResponse.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    console.error('❌ 取得相簿失敗:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '取得相簿失敗',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/albums/[albumId]
 * 更新相簿資訊
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { albumId } = resolvedParams;

    // 解析請求資料
    const requestData = await request.json();
    const validatedData = UpdateAlbumSchema.parse(requestData);

    console.log(`📝 更新相簿: ${albumId}`);

    // 檢查相簿是否存在
    const albumRepository = OracleRepositoryFactory.getAlbumRepository();
    const existingAlbum = await albumRepository.getAlbumById(
      albumId,
      'current_user'
    ); // TODO: 從認證中取得使用者ID
    if (!existingAlbum) {
      return NextResponse.json(
        {
          success: false,
          error: '相簿不存在或已刪除',
        },
        { status: 404 }
      );
    }

    // TODO: 驗證使用者權限
    // const hasPermission = await checkUserPermission(userId, albumId, 'update')
    // if (!hasPermission) {
    //   return NextResponse.json({
    //     success: false,
    //     error: '無權限更新此相簿'
    //   }, { status: 403 })
    // }

    // TODO: 如果更新名稱，檢查是否重複
    // if (validatedData.name && validatedData.name !== existingAlbum.name) {
    //   const duplicateAlbum = await albumRepository.findByProjectAndName(
    //     existingAlbum.projectId,
    //     validatedData.name
    //   )
    //   if (duplicateAlbum && duplicateAlbum.id !== albumId) {
    //     return NextResponse.json({
    //       success: false,
    //       error: '相簿名稱已存在於此專案中'
    //     }, { status: 409 })
    //   }
    // }

    // 更新相簿
    const updateRequest: UpdateAlbumRequest = {
      name: validatedData.name,
      description: validatedData.description,
    };

    const updatedAlbum = await albumRepository.updateAlbum(
      albumId,
      updateRequest
    );

    console.log(`✅ 相簿更新成功: ${updatedAlbum.name}`);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedAlbum.id,
        projectId: updatedAlbum.projectId,
        name: updatedAlbum.name,
        description: updatedAlbum.description,
        photoCount: updatedAlbum.photoCount,
        tags: [], // TODO: 加入標籤支援
        nfsPath: '', // TODO: 加入 NFS 路徑支援
        updatedAt: updatedAlbum.updatedAt,
      },
      message: '相簿更新成功',
    });
  } catch (error) {
    console.error('❌ 更新相簿失敗:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.errors[0].message,
        },
        { status: 400 }
      );
    }

    // 處理 Oracle 約束錯誤
    if (error instanceof Error && error.message.includes('ORA-')) {
      return NextResponse.json(
        {
          success: false,
          error: '資料庫約束錯誤，請檢查輸入資料',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '更新相簿失敗',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/albums/[albumId]
 * 刪除相簿（軟刪除）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const resolvedParams = await params;
    const { albumId } = resolvedParams;
    const force = searchParams.get('force') === 'true';

    console.log(`🗑️ 刪除相簿: ${albumId}, force=${force}`);

    // 檢查相簿是否存在
    const albumRepository = OracleRepositoryFactory.getAlbumRepository();
    const album = await albumRepository.getAlbumById(albumId, 'current_user'); // TODO: 從認證中取得使用者ID
    if (!album) {
      return NextResponse.json(
        {
          success: false,
          error: '相簿不存在或已刪除',
        },
        { status: 404 }
      );
    }

    // TODO: 驗證使用者權限
    // const hasPermission = await checkUserPermission(userId, albumId, 'delete')
    // if (!hasPermission) {
    //   return NextResponse.json({
    //     success: false,
    //     error: '無權限刪除此相簿'
    //   }, { status: 403 })
    // }

    // 檢查相簿是否包含照片
    if (album.photoCount && album.photoCount > 0 && !force) {
      return NextResponse.json(
        {
          success: false,
          error: `相簿包含 ${album.photoCount} 張照片，請先清空相簿或使用強制刪除`,
          requireConfirmation: true,
          photoCount: album.photoCount,
        },
        { status: 409 }
      );
    }

    // 執行軟刪除
    const deleteResult = await albumRepository.safeDeleteAlbum(
      albumId,
      'current_user',
      {
        force,
        reason: force ? '強制刪除包含照片的相簿' : '刪除空相簿',
      }
    );

    const message = force
      ? '強制刪除成功，相簿及所有照片已移除'
      : '成功刪除相簿';

    console.log(`✅ ${message}: ${albumId}`);

    return NextResponse.json({
      success: true,
      data: {
        id: albumId,
        deleted_at: new Date(),
        photo_count: album.photoCount,
      },
      message,
    });
  } catch (error) {
    console.error('❌ 刪除相簿失敗:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '刪除相簿失敗',
      },
      { status: 500 }
    );
  }
}
