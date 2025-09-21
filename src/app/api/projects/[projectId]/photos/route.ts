/**
 * Project Photos API - 專案照片管理端點
 * GET /api/projects/[projectId]/photos - 取得專案照片列表
 * POST /api/projects/[projectId]/photos - 上傳照片到專案
 */

import { NextRequest, NextResponse } from 'next/server'
import { DatabaseConnection } from '@/lib/database/connection'
import type { ApiResponse, Photo, UploadResult } from '@/types/photo.types'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'

const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

/**
 * GET /api/projects/[projectId]/photos
 * 取得專案照片列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  let connection: DatabaseConnection | null = null

  try {
    const { searchParams } = new URL(request.url)
    const projectId = params.projectId

    // 分頁參數
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // 篩選參數
    const albumId = searchParams.get('albumId')
    const searchQuery = searchParams.get('search')

    console.log(`📋 取得專案照片列表: ${projectId}, page=${page}, limit=${limit}`)

    // 建立資料庫連接
    connection = new DatabaseConnection()
    await connection.connect()

    // 首先驗證專案是否存在
    const projectQuery = 'SELECT id FROM projects WHERE id = $1'
    const projectResult = await connection.query(projectQuery, [projectId])

    if (projectResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '專案不存在或無權限存取'
      } as ApiResponse<never>, { status: 404 })
    }

    // 建構查詢條件
    let whereConditions = ['pa.project_id = $1', 'p.deleted_at IS NULL']
    let queryParams: any[] = [projectId]
    let paramIndex = 2

    if (albumId) {
      whereConditions.push(`pa.id = $${paramIndex}`)
      queryParams.push(albumId)
      paramIndex++
    }

    if (searchQuery) {
      whereConditions.push(`p.file_name ILIKE $${paramIndex}`)
      queryParams.push(`%${searchQuery}%`)
      paramIndex++
    }

    const whereClause = whereConditions.join(' AND ')

    // 取得總數
    const countQuery = `
      SELECT COUNT(*) as count
      FROM photos p
      JOIN photo_albums pa ON p.album_id = pa.id
      WHERE ${whereClause}
    `

    const countResult = await connection.query(countQuery, queryParams)
    const total = parseInt(countResult.rows[0].count)

    // 取得照片列表
    const photosQuery = `
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
      WHERE ${whereClause}
      ORDER BY p.uploaded_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    queryParams.push(limit, offset)

    const photosResult = await connection.query(photosQuery, queryParams)

    // 轉換為前端格式
    const photos: Photo[] = photosResult.rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      albumId: row.album_id,
      fileName: row.file_name,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      width: row.width,
      height: row.height,
      thumbnailUrl: `/api/photos/${row.id}/thumbnail`,
      originalUrl: `/api/photos/${row.id}/download`,
      uploadedBy: row.uploaded_by,
      uploadedAt: new Date(row.uploaded_at),
      metadata: row.metadata || {}
    }))

    const totalPages = Math.ceil(total / limit)

    console.log(`✅ 成功取得 ${photos.length} 張照片，總共 ${total} 張`)

    return NextResponse.json({
      success: true,
      data: photos,
      meta: {
        total,
        page,
        limit,
        totalPages
      }
    } as ApiResponse<Photo[]>)

  } catch (error) {
    console.error('❌ 取得照片列表失敗:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '取得照片列表失敗'
    } as ApiResponse<never>, { status: 500 })

  } finally {
    if (connection) {
      await connection.close()
    }
  }
}

/**
 * POST /api/projects/[projectId]/photos
 * 上傳照片到專案
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  let connection: DatabaseConnection | null = null

  try {
    const projectId = params.projectId
    const formData = await request.formData()

    const files = formData.getAll('photos') as File[]
    const albumId = formData.get('albumId') as string

    console.log(`📤 上傳照片到專案: ${projectId}, 檔案數: ${files.length}`)

    // 驗證必要欄位
    if (!albumId) {
      return NextResponse.json({
        success: false,
        error: '相簿ID為必要欄位'
      } as ApiResponse<never>, { status: 400 })
    }

    if (!files.length) {
      return NextResponse.json({
        success: false,
        error: '請選擇要上傳的照片'
      } as ApiResponse<never>, { status: 400 })
    }

    // 建立資料庫連接
    connection = new DatabaseConnection()
    await connection.connect()

    // 驗證相簿是否屬於該專案
    const albumQuery = `
      SELECT id, project_id, name
      FROM photo_albums
      WHERE id = $1 AND project_id = $2
    `
    const albumResult = await connection.query(albumQuery, [albumId, projectId])

    if (albumResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '相簿不存在或不屬於該專案'
      } as ApiResponse<never>, { status: 404 })
    }

    const uploadResults: UploadResult[] = []

    for (const file of files) {
      // 驗證檔案
      const validation = await validateFile(file)
      if (!validation.isValid) {
        uploadResults.push({
          success: false,
          photoId: '',
          thumbnailUrl: '',
          originalUrl: '',
          metadata: {},
          errors: validation.errors
        })
        continue
      }

      try {
        // 處理檔案上傳
        const uploadResult = await processFileUpload(file, albumId, connection)
        uploadResults.push(uploadResult)
      } catch (error) {
        uploadResults.push({
          success: false,
          photoId: '',
          thumbnailUrl: '',
          originalUrl: '',
          metadata: {},
          errors: [error instanceof Error ? error.message : '上傳失敗']
        })
      }
    }

    const successCount = uploadResults.filter(r => r.success).length
    console.log(`✅ 上傳完成: ${successCount}/${files.length} 成功`)

    return NextResponse.json({
      success: successCount > 0,
      data: uploadResults,
      message: `成功上傳 ${successCount} 張照片`
    } as ApiResponse<UploadResult[]>, {
      status: successCount > 0 ? 201 : 400
    })

  } catch (error) {
    console.error('❌ 照片上傳失敗:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '照片上傳失敗'
    } as ApiResponse<never>, { status: 500 })

  } finally {
    if (connection) {
      await connection.close()
    }
  }
}

/**
 * 驗證檔案
 */
async function validateFile(file: File): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = []

  // 檢查檔案類型
  if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
    errors.push('不支援的檔案格式，請上傳 JPG、PNG 或 HEIC 格式')
  }

  // 檢查檔案大小
  if (file.size > MAX_FILE_SIZE) {
    errors.push('檔案大小超過限制 (最大 10MB)')
  }

  // 檢查檔案名稱
  if (!file.name || file.name.trim() === '') {
    errors.push('檔案名稱不能為空')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 處理檔案上傳
 */
async function processFileUpload(
  file: File,
  albumId: string,
  connection: DatabaseConnection
): Promise<UploadResult> {
  // 生成唯一檔案名
  const fileId = generateUniqueId()
  const ext = path.extname(file.name)
  const fileName = `${fileId}${ext}`
  const originalPath = path.join(UPLOAD_DIR, 'originals', fileName)
  const thumbnailPath = path.join(UPLOAD_DIR, 'thumbnails', `${fileId}.jpg`)

  // 確保目錄存在
  await fs.mkdir(path.dirname(originalPath), { recursive: true })
  await fs.mkdir(path.dirname(thumbnailPath), { recursive: true })

  // 讀取檔案緩衝區
  const buffer = Buffer.from(await file.arrayBuffer())

  // 儲存原圖
  await fs.writeFile(originalPath, buffer)

  // 生成縮圖
  const { width, height } = await sharp(buffer)
    .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(thumbnailPath)

  // 取得圖片資訊
  const metadata = await sharp(buffer).metadata()

  // 儲存到資料庫
  const insertQuery = `
    INSERT INTO photos (
      id, album_id, file_name, file_path, file_size,
      mime_type, width, height, thumbnail_path,
      uploaded_by, metadata
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
    ) RETURNING id
  `

  const insertParams = [
    fileId,
    albumId,
    file.name,
    originalPath,
    file.size,
    file.type,
    metadata.width || 0,
    metadata.height || 0,
    thumbnailPath,
    'system', // TODO: 從認證取得真實使用者ID
    JSON.stringify({
      originalName: file.name,
      uploadedAt: new Date().toISOString()
    })
  ]

  await connection.query(insertQuery, insertParams)

  return {
    success: true,
    photoId: fileId,
    thumbnailUrl: `/api/photos/${fileId}/thumbnail`,
    originalUrl: `/api/photos/${fileId}/download`,
    metadata: {
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      width: metadata.width,
      height: metadata.height
    }
  }
}

/**
 * 生成唯一ID
 */
function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}