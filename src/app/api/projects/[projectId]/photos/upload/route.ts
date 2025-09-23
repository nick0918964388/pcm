/**
 * Real Photo Upload API - 真實照片上傳端點
 * POST /api/projects/[projectId]/photos/upload
 * 處理 multipart/form-data 檔案上傳
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database/connection'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import crypto from 'crypto'

// 生成唯一檔案名稱
function generateUniqueFileName(originalName: string): string {
  const ext = path.extname(originalName)
  const timestamp = Date.now()
  const randomStr = crypto.randomBytes(8).toString('hex')
  return `photo_${timestamp}_${randomStr}${ext}`
}

// 確保目錄存在
async function ensureDirectory(dirPath: string) {
  try {
    await mkdir(dirPath, { recursive: true })
  } catch (error) {
    // 目錄可能已存在，忽略錯誤
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params
    const { projectId } = resolvedParams

    console.log(`📤 上傳真實照片到專案: ${projectId}`)

    // 驗證專案是否存在
    const projectQuery = 'SELECT id FROM projects WHERE id = :1 AND is_active = 1'
    const projectResult = await db.query(projectQuery, [projectId])

    if (!projectResult || projectResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: '專案不存在或無權限存取'
      }, { status: 404 })
    }

    // 取得第一個相簿ID
    const albumQuery = 'SELECT id FROM photo_albums WHERE project_id = :1 ORDER BY CREATED_AT ASC'
    const albumResult = await db.query(albumQuery, [projectId])

    if (!albumResult || albumResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: '專案沒有相簿'
      }, { status: 400 })
    }

    const albumId = albumResult[0].ID || albumResult[0].id

    // 處理 multipart/form-data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({
        success: false,
        error: '沒有上傳檔案'
      }, { status: 400 })
    }

    // 驗證檔案類型
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp']
    if (!validImageTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: `不支援的檔案類型: ${file.type}`
      }, { status: 400 })
    }

    // 驗證檔案大小 (最大 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: `檔案大小超過限制 (最大 10MB)`
      }, { status: 400 })
    }

    // 生成唯一檔案名稱
    const fileName = generateUniqueFileName(file.name)
    const photoId = `photo_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`

    // 設定檔案路徑
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'photos')
    const originalDir = path.join(uploadDir, 'original')
    const thumbnailDir = path.join(uploadDir, 'thumbnails')
    const mediumDir = path.join(uploadDir, 'medium')

    // 確保目錄存在
    await ensureDirectory(originalDir)
    await ensureDirectory(thumbnailDir)
    await ensureDirectory(mediumDir)

    const originalPath = path.join(originalDir, fileName)
    const thumbnailPath = path.join(thumbnailDir, fileName)
    const mediumPath = path.join(mediumDir, fileName)

    // 相對路徑（用於資料庫儲存）
    const dbOriginalPath = `/uploads/photos/original/${fileName}`
    const dbThumbnailPath = `/uploads/photos/thumbnails/${fileName}`
    const dbMediumPath = `/uploads/photos/medium/${fileName}`

    // 將檔案轉換為 Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 儲存原始檔案
    await writeFile(originalPath, buffer)
    console.log(`✅ 原始檔案已儲存: ${originalPath}`)

    // 使用 Sharp 處理圖片
    const image = sharp(buffer)
    const metadata = await image.metadata()

    // 生成縮圖 (150x150)
    await image
      .resize(150, 150, {
        fit: 'cover',
        position: 'center'
      })
      .toFile(thumbnailPath)
    console.log(`✅ 縮圖已生成: ${thumbnailPath}`)

    // 生成中型圖片 (600px 寬度，保持比例)
    await sharp(buffer)
      .resize(600, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFile(mediumPath)
    console.log(`✅ 中型圖片已生成: ${mediumPath}`)

    // 插入照片記錄到資料庫
    console.log(`⏳ 正在插入照片到資料庫: ${photoId}`)

    const insertQuery = `
      INSERT INTO photos (
        id, album_id, file_name, file_path, file_size,
        mime_type, width, height, thumbnail_path, uploaded_by, uploaded_at
      )
      VALUES (
        :1, :2, :3, :4, :5,
        :6, :7, :8, :9, :10, CURRENT_TIMESTAMP
      )
    `

    const insertParams = [
      photoId,
      albumId,
      file.name,          // 原始檔名
      dbOriginalPath,     // 原始檔案路徑
      file.size,          // 檔案大小
      file.type,          // MIME 類型
      metadata.width || 0,     // 圖片寬度
      metadata.height || 0,    // 圖片高度
      dbThumbnailPath,    // 縮圖路徑
      'current_user'      // 上傳者
    ]

    console.log(`📊 SQL參數:`, insertParams)

    // 使用事務確保INSERT有COMMIT
    await db.transaction(async (client) => {
      return await client.query(insertQuery, insertParams)
    })

    console.log(`✅ 照片上傳成功: ${photoId}`)

    // 返回成功回應
    const responseData = {
      id: photoId,
      projectId,
      albumId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      width: metadata.width || 0,
      height: metadata.height || 0,
      thumbnailUrl: `/api/photos/${photoId}/thumbnail`,
      mediumUrl: `/api/photos/${photoId}/medium`,
      originalUrl: `/api/photos/${photoId}/download`,
      uploadedBy: 'current_user',
      uploadedAt: new Date().toISOString(),
      paths: {
        original: dbOriginalPath,
        thumbnail: dbThumbnailPath,
        medium: dbMediumPath
      }
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: '照片上傳成功'
    })

  } catch (error) {
    console.error('❌ 照片上傳失敗:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '照片上傳失敗'
    }, { status: 500 })
  }
}