/**
 * Photo Permissions API - 照片權限驗證端點
 * GET /api/photos/[id]/permissions
 * 驗證使用者對照片的操作權限
 */

import { NextRequest, NextResponse } from 'next/server'
import { DatabaseConnection } from '@/lib/database/connection'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection: DatabaseConnection | null = null

  try {
    const photoId = params.id
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '缺少使用者ID'
      }, { status: 400 })
    }

    console.log(`🔐 檢查照片權限: photoId=${photoId}, userId=${userId}`)

    // 建立資料庫連接
    connection = new DatabaseConnection()
    await connection.connect()

    // 查詢照片所屬專案
    const photoQuery = `
      SELECT
        p.id,
        pa.project_id,
        p.uploaded_by
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `

    const photoResult = await connection.query(photoQuery, [photoId])

    if (photoResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '照片不存在'
      }, { status: 404 })
    }

    const photo = photoResult.rows[0]

    // 檢查使用者對專案的權限
    const permissionQuery = `
      SELECT
        up.role,
        up.permissions
      FROM user_projects up
      WHERE up.user_id = $1 AND up.project_id = $2
    `

    const permissionResult = await connection.query(permissionQuery, [userId, photo.project_id])

    let canView = false
    let canDownload = false
    let canDelete = false

    if (permissionResult.rows.length > 0) {
      const userProject = permissionResult.rows[0]

      // 基於角色的權限檢查
      switch (userProject.role) {
        case 'admin':
        case 'manager':
          canView = true
          canDownload = true
          canDelete = true
          break
        case 'engineer':
          canView = true
          canDownload = true
          canDelete = false
          break
        case 'contractor':
          canView = true
          canDownload = photo.uploaded_by === userId // 只能下載自己上傳的照片
          canDelete = photo.uploaded_by === userId
          break
        default:
          canView = false
          canDownload = false
          canDelete = false
      }

      // 檢查特殊權限設定
      if (userProject.permissions) {
        const permissions = JSON.parse(userProject.permissions)
        if (permissions.photos) {
          canView = permissions.photos.view !== false && canView
          canDownload = permissions.photos.download !== false && canDownload
          canDelete = permissions.photos.delete !== false && canDelete
        }
      }
    }

    console.log(`✅ 權限檢查完成: view=${canView}, download=${canDownload}, delete=${canDelete}`)

    return NextResponse.json({
      success: true,
      permissions: {
        canView,
        canDownload,
        canDelete
      },
      canView,
      canDownload,
      canDelete
    })

  } catch (error) {
    console.error('❌ 權限檢查失敗:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '權限檢查失敗'
    }, { status: 500 })

  } finally {
    if (connection) {
      await connection.close()
    }
  }
}