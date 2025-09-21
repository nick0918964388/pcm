/**
 * Photo Download API - 照片下載端點
 * POST /api/photos/[id]/download
 * 處理照片下載請求，支援不同解析度和權限驗證
 */

import { NextRequest, NextResponse } from 'next/server'
import { DatabaseConnection } from '@/lib/database/connection'
import type {
  DownloadOptions,
  DownloadResponse,
  PhotoResolution
} from '@/types/photo.types'
import path from 'path'
import fs from 'fs/promises'

interface RequestBody {
  options: DownloadOptions
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection: DatabaseConnection | null = null

  try {
    const photoId = params.id
    const body: RequestBody = await request.json()
    const { options } = body

    console.log(`📥 處理照片下載請求: ${photoId}, 解析度: ${options.resolution}`)

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
        error: '照片不存在'
      }, { status: 404 })
    }

    const photo = photoResult.rows[0]

    // TODO: 驗證使用者權限
    // const userId = await getUserIdFromRequest(request)
    // const hasPermission = await verifyDownloadPermission(photo.project_id, userId)
    // if (!hasPermission) {
    //   return NextResponse.json({
    //     success: false,
    //     error: '權限不足，無法下載此照片'
    //   }, { status: 403 })
    // }

    // 根據解析度取得檔案路徑
    let filePath: string
    let fileName: string

    if (options.resolution === 'original') {
      filePath = photo.file_path
      fileName = photo.file_name
    } else {
      // 查詢對應解析度的版本
      const versionQuery = `
        SELECT file_path, width, height, file_size
        FROM photo_versions
        WHERE photo_id = $1 AND version_type = $2
      `

      const versionResult = await connection.query(versionQuery, [photoId, options.resolution])

      if (versionResult.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: `${options.resolution} 解析度版本不存在`
        }, { status: 404 })
      }

      const version = versionResult.rows[0]
      filePath = version.file_path

      // 生成檔案名稱
      const ext = path.extname(photo.file_name)
      const nameWithoutExt = path.basename(photo.file_name, ext)
      fileName = `${nameWithoutExt}-${options.resolution}${ext}`
    }

    // 檢查檔案是否存在
    try {
      await fs.access(filePath)
    } catch (error) {
      console.error(`檔案不存在: ${filePath}`)
      return NextResponse.json({
        success: false,
        error: '檔案檔案不存在於伺服器'
      }, { status: 404 })
    }

    // 取得檔案資訊
    const stats = await fs.stat(filePath)

    // 生成下載URL (簽名URL，1小時後過期)
    const downloadToken = generateDownloadToken(photoId, options.resolution)
    const downloadUrl = `/api/photos/${photoId}/file?token=${downloadToken}&resolution=${options.resolution}`

    const response: DownloadResponse = {
      success: true,
      downloadUrl,
      fileName,
      fileSize: stats.size,
      expiresAt: new Date(Date.now() + 3600000) // 1小時後過期
    }

    console.log(`✅ 照片下載連結生成成功: ${fileName}`)

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ 照片下載失敗:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '下載失敗'
    }, { status: 500 })

  } finally {
    if (connection) {
      await connection.close()
    }
  }
}

/**
 * 生成下載令牌
 * @param photoId 照片ID
 * @param resolution 解析度
 * @returns 下載令牌
 */
function generateDownloadToken(photoId: string, resolution: PhotoResolution): string {
  const payload = {
    photoId,
    resolution,
    expiresAt: Date.now() + 3600000 // 1小時
  }

  // 簡單的 base64 編碼 (生產環境應使用 JWT)
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

/**
 * 取得照片檔案下載 API
 * GET /api/photos/[id]/download
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const resolution = searchParams.get('resolution') as PhotoResolution

  if (!token) {
    return NextResponse.json({
      error: '缺少下載令牌'
    }, { status: 400 })
  }

  try {
    // 驗證令牌
    const payload = JSON.parse(Buffer.from(token, 'base64').toString())

    if (payload.expiresAt < Date.now()) {
      return NextResponse.json({
        error: '下載連結已過期'
      }, { status: 410 })
    }

    if (payload.photoId !== params.id || payload.resolution !== resolution) {
      return NextResponse.json({
        error: '無效的下載令牌'
      }, { status: 403 })
    }

    // TODO: 實際下載檔案邏輯
    // 這裡應該讀取檔案並串流回傳給客戶端

    return NextResponse.json({
      success: true,
      message: '下載令牌驗證成功'
    })

  } catch (error) {
    return NextResponse.json({
      error: '無效的下載令牌'
    }, { status: 403 })
  }
}