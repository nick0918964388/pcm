/**
 * Photo Management API - 單一照片管理端點
 * DELETE /api/photos/[id] - 刪除照片
 * GET /api/photos/[id] - 取得照片資訊
 */

import { NextRequest, NextResponse } from 'next/server'
import { DatabaseConnection } from '@/lib/database/connection'
import type { ApiResponse } from '@/types/photo.types'
import { promises as fs } from 'fs'

/**
 * DELETE /api/photos/[id]
 * 刪除照片（軟刪除）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection: DatabaseConnection | null = null

  try {
    const photoId = params.id

    console.log(`🗑️ 刪除照片請求: ${photoId}`)

    // 建立資料庫連接
    connection = new DatabaseConnection()
    await connection.connect()

    // 查詢照片資訊
    const photoQuery = `
      SELECT
        p.*,
        pa.project_id,
        pa.name as album_name
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `

    const photoResult = await connection.query(photoQuery, [photoId])

    if (photoResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '照片不存在或已被刪除'
      } as ApiResponse<never>, { status: 404 })
    }

    const photo = photoResult.rows[0]

    // TODO: 驗證使用者權限
    // const userId = await getUserIdFromRequest(request)
    // const hasPermission = await verifyDeletePermission(photo.project_id, userId, photo.uploaded_by)
    // if (!hasPermission) {
    //   return NextResponse.json({
    //     success: false,
    //     error: '權限不足，無法刪除此照片'
    //   }, { status: 403 })
    // }

    // 軟刪除照片（設置 deleted_at 時間戳）
    const deleteQuery = `
      UPDATE photos
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `

    const deleteResult = await connection.query(deleteQuery, [photoId])

    if (deleteResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '照片刪除失敗'
      } as ApiResponse<never>, { status: 500 })
    }

    // 刪除相關的照片版本記錄
    const deleteVersionsQuery = `
      DELETE FROM photo_versions
      WHERE photo_id = $1
    `
    await connection.query(deleteVersionsQuery, [photoId])

    // 可選：實際刪除檔案（暫時註解，可根據需求決定是否立即刪除）
    /*
    try {
      await fs.access(photo.file_path)
      await fs.unlink(photo.file_path)

      if (photo.thumbnail_path) {
        await fs.access(photo.thumbnail_path)
        await fs.unlink(photo.thumbnail_path)
      }
    } catch (fileError) {
      console.warn(`檔案刪除失敗: ${fileError}`)
      // 檔案刪除失敗不影響資料庫刪除操作
    }
    */

    console.log(`✅ 照片刪除成功: ${photo.file_name}`)

    return NextResponse.json({
      success: true,
      message: '照片刪除成功',
      data: {
        id: photoId,
        fileName: photo.file_name
      }
    } as ApiResponse<{ id: string; fileName: string }>)

  } catch (error) {
    console.error('❌ 照片刪除失敗:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '照片刪除失敗'
    } as ApiResponse<never>, { status: 500 })

  } finally {
    if (connection) {
      await connection.close()
    }
  }
}

/**
 * GET /api/photos/[id]
 * 取得單一照片詳細資訊
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection: DatabaseConnection | null = null

  try {
    const photoId = params.id

    console.log(`📷 取得照片資訊: ${photoId}`)

    // 建立資料庫連接
    connection = new DatabaseConnection()
    await connection.connect()

    // 查詢照片詳細資訊
    const photoQuery = `
      SELECT
        p.id,
        p.album_id,
        p.file_name,
        p.file_size,
        p.mime_type,
        p.width,
        p.height,
        p.thumbnail_path,
        p.uploaded_by,
        p.uploaded_at,
        p.metadata,
        pa.project_id,
        pa.name as album_name
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `

    const photoResult = await connection.query(photoQuery, [photoId])

    if (photoResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '照片不存在'
      } as ApiResponse<never>, { status: 404 })
    }

    const photo = photoResult.rows[0]

    // TODO: 驗證使用者權限
    // const userId = await getUserIdFromRequest(request)
    // const hasPermission = await verifyViewPermission(photo.project_id, userId)
    // if (!hasPermission) {
    //   return NextResponse.json({
    //     success: false,
    //     error: '權限不足，無法查看此照片'
    //   }, { status: 403 })
    // }

    // 轉換為前端格式
    const photoData = {
      id: photo.id,
      projectId: photo.project_id,
      albumId: photo.album_id,
      fileName: photo.file_name,
      fileSize: photo.file_size,
      mimeType: photo.mime_type,
      width: photo.width,
      height: photo.height,
      thumbnailUrl: `/api/photos/${photo.id}/thumbnail`,
      originalUrl: `/api/photos/${photo.id}/download`,
      uploadedBy: photo.uploaded_by,
      uploadedAt: new Date(photo.uploaded_at),
      metadata: photo.metadata || {},
      albumName: photo.album_name
    }

    console.log(`✅ 成功取得照片資訊: ${photo.file_name}`)

    return NextResponse.json({
      success: true,
      data: photoData
    } as ApiResponse<typeof photoData>)

  } catch (error) {
    console.error('❌ 取得照片資訊失敗:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '取得照片資訊失敗'
    } as ApiResponse<never>, { status: 500 })

  } finally {
    if (connection) {
      await connection.close()
    }
  }
}