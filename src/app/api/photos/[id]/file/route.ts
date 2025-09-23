/**
 * Photo File Serving API - 照片檔案服務端點
 * GET /api/photos/[id]/file
 * 直接提供照片檔案（原始檔案或指定版本）
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database/connection'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { id: photoId } = resolvedParams
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'original' // original, thumbnail, medium

    console.log(`📷 提供照片檔案: ${photoId}, 類型: ${type}`)

    // 查詢照片資訊
    const photoQuery = `
      SELECT
        p.id,
        p.file_path,
        p.thumbnail_path,
        p.mime_type,
        p.file_name,
        pa.project_id
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      WHERE p.id = :1 AND p.deleted_at IS NULL
    `

    const photoResult = await db.query(photoQuery, [photoId])

    if (!photoResult || photoResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: '照片不存在'
      }, { status: 404 })
    }

    const photo = photoResult[0]

    // 取得檔案路徑
    let filePath: string
    let dbPath: string

    if (type === 'thumbnail') {
      dbPath = photo.THUMBNAIL_PATH || photo.thumbnail_path || photo.FILE_PATH || photo.file_path
    } else if (type === 'medium') {
      // 如果有中型圖片路徑的話
      dbPath = photo.MEDIUM_PATH || photo.medium_path || photo.FILE_PATH || photo.file_path
      // 否則使用原始路徑，但替換目錄
      if (!photo.MEDIUM_PATH && !photo.medium_path) {
        const fileName = path.basename(dbPath)
        dbPath = `/uploads/photos/medium/${fileName}`
      }
    } else {
      dbPath = photo.FILE_PATH || photo.file_path
    }

    // 轉換資料庫路徑為實際檔案系統路徑
    if (dbPath.startsWith('/uploads/')) {
      filePath = path.join(process.cwd(), 'public', dbPath)
    } else {
      filePath = dbPath
    }

    console.log(`📂 讀取檔案: ${filePath}`)

    try {
      // 讀取檔案
      const fileBuffer = await readFile(filePath)

      // 決定 Content-Type
      const mimeType = photo.MIME_TYPE || photo.mime_type || 'image/jpeg'

      // 設置回應標頭
      const headers = new Headers({
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="${photo.FILE_NAME || photo.file_name || 'photo.jpg'}"`,
      })

      console.log(`✅ 成功提供照片: ${path.basename(filePath)}`)

      return new NextResponse(fileBuffer, { headers })

    } catch (fileError) {
      console.error(`❌ 檔案不存在: ${filePath}`)

      // 如果檔案不存在，返回預設圖片
      const size = type === 'thumbnail' ? 150 : 600
      const defaultSvg = generatePlaceholderSvg(size)

      const headers = new Headers({
        'Content-Type': 'image/svg+xml',
        'Content-Length': defaultSvg.length.toString(),
        'Cache-Control': 'public, max-age=300'
      })

      return new NextResponse(defaultSvg, { headers })
    }

  } catch (error) {
    console.error('❌ 取得照片檔案失敗:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '取得照片檔案失敗'
    }, { status: 500 })
  }
}

/**
 * 生成預設佔位圖片 SVG
 */
function generatePlaceholderSvg(size: number): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  const randomColor = colors[Math.floor(Math.random() * colors.length)]

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
    <path d="M${size*0.3} ${size*0.65} L${size*0.7} ${size*0.65} L${size*0.6} ${size*0.45} L${size*0.5} ${size*0.55} L${size*0.4} ${size*0.45} Z"
          fill="white" opacity="0.5"/>
    <circle cx="${size*0.35}" cy="${size*0.35}" r="${size*0.05}" fill="white" opacity="0.5"/>
  </svg>`
}