/**
 * Photo Thumbnail API - 照片縮圖服務端點
 * GET /api/photos/[id]/thumbnail
 * 提供照片縮圖，支援不同尺寸和快取
 */

import { NextRequest, NextResponse } from 'next/server'
import { DatabaseConnection } from '@/lib/database/connection'
import type { ApiResponse } from '@/types/photo.types'
import { promises as fs } from 'fs'
import path from 'path'

type ThumbnailSize = 'small' | 'medium' | 'large'

const THUMBNAIL_SIZES = {
  small: 150,
  medium: 300,
  large: 600
}

/**
 * GET /api/photos/[id]/thumbnail
 * 取得照片縮圖
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection: DatabaseConnection | null = null

  try {
    const photoId = params.id
    const { searchParams } = new URL(request.url)
    const size = (searchParams.get('size') as ThumbnailSize) || 'medium'

    console.log(`🖼️ 取得照片縮圖: ${photoId}, 尺寸: ${size}`)

    // 建立資料庫連接
    connection = new DatabaseConnection()
    await connection.connect()

    // 查詢照片資訊
    const photoQuery = `
      SELECT
        p.id,
        p.thumbnail_path,
        p.mime_type,
        pa.project_id
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
    //     error: '權限不足，無法查看此照片縮圖'
    //   }, { status: 403 })
    // }

    // 取得縮圖檔案路徑
    let thumbnailPath = photo.thumbnail_path

    // 如果需要特定尺寸，檢查是否有對應的版本
    if (size !== 'medium') {
      const versionQuery = `
        SELECT file_path
        FROM photo_versions
        WHERE photo_id = $1 AND version_type = $2
      `

      const versionResult = await connection.query(versionQuery, [photoId, `thumbnail_${size}`])

      if (versionResult.rows.length > 0) {
        thumbnailPath = versionResult.rows[0].file_path
      }
    }

    try {
      // 檢查縮圖檔案是否存在
      await fs.access(thumbnailPath)

      // 讀取縮圖檔案
      const thumbnailBuffer = await fs.readFile(thumbnailPath)

      // 決定 Content-Type
      const mimeType = photo.mime_type || 'image/jpeg'

      // 設置快取標頭
      const headers = new Headers({
        'Content-Type': mimeType,
        'Content-Length': thumbnailBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // 1年快取
        'ETag': `"${photoId}-${size}"`,
        'Last-Modified': new Date().toUTCString()
      })

      console.log(`✅ 成功取得縮圖: ${path.basename(thumbnailPath)}`)

      // 檢查 If-None-Match 標頭（ETag 快取）
      const ifNoneMatch = request.headers.get('If-None-Match')
      if (ifNoneMatch === `"${photoId}-${size}"`) {
        return new NextResponse(null, { status: 304, headers })
      }

      return new NextResponse(thumbnailBuffer, { headers })

    } catch (fileError) {
      console.warn(`縮圖檔案不存在: ${thumbnailPath}，返回預設圖片`)

      // 返回預設的佔位圖片 (SVG)
      const defaultSvg = generatePlaceholderSvg(THUMBNAIL_SIZES[size])

      const headers = new Headers({
        'Content-Type': 'image/svg+xml',
        'Content-Length': defaultSvg.length.toString(),
        'Cache-Control': 'public, max-age=300' // 5分鐘快取
      })

      return new NextResponse(defaultSvg, { headers })
    }

  } catch (error) {
    console.error('❌ 取得縮圖失敗:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '取得縮圖失敗'
    } as ApiResponse<never>, { status: 500 })

  } finally {
    if (connection) {
      await connection.close()
    }
  }
}

/**
 * 生成預設佔位圖片 SVG
 */
function generatePlaceholderSvg(size: number): string {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f0f0f0"/>
    <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#666" font-family="sans-serif" font-size="${size / 8}">
      圖片載入中...
    </text>
  </svg>`
}