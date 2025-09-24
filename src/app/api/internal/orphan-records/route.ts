import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { promises as fs } from 'fs'
import { join, resolve } from 'path'
import { OracleRepositoryFactory } from '@/lib/repositories/oracle-repository-factory'

/**
 * 孤兒記錄檢查 API 端點
 *
 * 此端點用於 Task 10.2 系統整合驗證，專門檢查存在於資料庫但無對應檔案的照片記錄
 */

const orphanRecordsSchema = z.object({
  projectId: z.string().optional(),
  albumId: z.string().optional(),
  limit: z.number().optional().default(100),
  includeDetails: z.boolean().optional().default(true),
  olderThanDays: z.number().optional(), // 只檢查指定天數之前的記錄
  checkFileIntegrity: z.boolean().optional().default(false) // 是否檢查檔案完整性
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = {
      projectId: searchParams.get('projectId') || undefined,
      albumId: searchParams.get('albumId') || undefined,
      limit: parseInt(searchParams.get('limit') || '100'),
      includeDetails: searchParams.get('includeDetails') !== 'false',
      olderThanDays: searchParams.get('olderThanDays') ? parseInt(searchParams.get('olderThanDays')) : undefined,
      checkFileIntegrity: searchParams.get('checkFileIntegrity') === 'true'
    }

    const validatedParams = orphanRecordsSchema.parse(params)

    const photoRepository = await OracleRepositoryFactory.getPhotoRepository()
    const albumRepository = await OracleRepositoryFactory.getAlbumRepository()
    const uploadsPath = resolve(process.cwd(), process.env.UPLOAD_PATH || 'uploads/photos')

    const result = {
      timestamp: new Date().toISOString(),
      parameters: validatedParams,
      uploadPath: uploadsPath,
      orphanRecords: [] as any[],
      integrityIssues: [] as any[], // 檔案存在但有問題的記錄
      statistics: {
        totalRecordsChecked: 0,
        orphanRecordsFound: 0,
        integrityIssuesFound: 0,
        totalMissingBytes: 0,
        averageRecordAge: 0,
        oldestOrphanAge: 0,
        newestOrphanAge: 0
      },
      recommendations: [] as string[]
    }

    // 獲取需要檢查的照片記錄
    let photosToCheck = []

    try {
      if (validatedParams.albumId) {
        // 檢查特定相簿
        photosToCheck = await photoRepository.findByAlbumId(validatedParams.albumId)
      } else if (validatedParams.projectId) {
        // 檢查特定專案的所有照片
        const albums = await albumRepository.findByProjectId(validatedParams.projectId)
        for (const album of albums) {
          const albumPhotos = await photoRepository.findByAlbumId(album.id)
          photosToCheck.push(...albumPhotos)
        }
      } else {
        // 檢查所有照片記錄（限制數量）
        photosToCheck = await photoRepository.findAll(validatedParams.limit * 2)
      }

      // 如果設定了年齡限制，過濾記錄
      if (validatedParams.olderThanDays) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - validatedParams.olderThanDays)

        photosToCheck = photosToCheck.filter(photo => {
          const createdAt = new Date(photo.created_at)
          return createdAt < cutoffDate
        })
      }

      // 限制檢查數量
      photosToCheck = photosToCheck.slice(0, validatedParams.limit)

    } catch (error) {
      console.error('Failed to load photo records:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to load photo records from database',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

    result.statistics.totalRecordsChecked = photosToCheck.length

    // 檢查每個照片記錄
    for (const photo of photosToCheck) {
      if (!photo.file_path) {
        // 記錄沒有檔案路徑，這本身就是問題
        const ageInDays = Math.floor((Date.now() - new Date(photo.created_at).getTime()) / (1000 * 60 * 60 * 24))

        const orphanRecord: any = {
          photoId: photo.id,
          albumId: photo.album_id,
          fileName: photo.original_filename || 'unknown',
          recordedSize: photo.file_size || 0,
          filePath: null,
          createdAt: photo.created_at,
          updatedAt: photo.updated_at,
          ageInDays,
          missingReason: 'no_file_path',
          severity: 'critical'
        }

        if (validatedParams.includeDetails) {
          orphanRecord.details = {
            metadata: photo.metadata,
            uploader: photo.uploaded_by,
            mimeType: photo.mime_type
          }
        }

        result.orphanRecords.push(orphanRecord)
        result.statistics.orphanRecordsFound++
        result.statistics.totalMissingBytes += photo.file_size || 0

        // 更新年齡統計
        if (result.statistics.orphanRecordsFound === 1) {
          result.statistics.oldestOrphanAge = ageInDays
          result.statistics.newestOrphanAge = ageInDays
        } else {
          result.statistics.oldestOrphanAge = Math.max(result.statistics.oldestOrphanAge, ageInDays)
          result.statistics.newestOrphanAge = Math.min(result.statistics.newestOrphanAge, ageInDays)
        }

        continue
      }

      // 檢查檔案是否存在
      const fullFilePath = join(uploadsPath, photo.file_path)
      let fileExists = false
      let fileStats = null

      try {
        fileStats = await fs.stat(fullFilePath)
        fileExists = fileStats.isFile()
      } catch (error) {
        fileExists = false
      }

      if (!fileExists) {
        // 檔案不存在，這是孤兒記錄
        const ageInDays = Math.floor((Date.now() - new Date(photo.created_at).getTime()) / (1000 * 60 * 60 * 24))

        const orphanRecord: any = {
          photoId: photo.id,
          albumId: photo.album_id,
          fileName: photo.original_filename || 'unknown',
          recordedSize: photo.file_size || 0,
          filePath: photo.file_path,
          fullPath: fullFilePath,
          createdAt: photo.created_at,
          updatedAt: photo.updated_at,
          ageInDays,
          missingReason: 'file_not_found',
          severity: 'high'
        }

        if (validatedParams.includeDetails) {
          orphanRecord.details = {
            metadata: photo.metadata,
            uploader: photo.uploaded_by,
            mimeType: photo.mime_type
          }
        }

        result.orphanRecords.push(orphanRecord)
        result.statistics.orphanRecordsFound++
        result.statistics.totalMissingBytes += photo.file_size || 0

        // 更新年齡統計
        if (result.statistics.orphanRecordsFound === 1) {
          result.statistics.oldestOrphanAge = ageInDays
          result.statistics.newestOrphanAge = ageInDays
        } else {
          result.statistics.oldestOrphanAge = Math.max(result.statistics.oldestOrphanAge, ageInDays)
          result.statistics.newestOrphanAge = Math.min(result.statistics.newestOrphanAge, ageInDays)
        }

      } else if (validatedParams.checkFileIntegrity && fileStats) {
        // 檔案存在，檢查完整性
        const sizeMatches = fileStats.size === (photo.file_size || 0)

        if (!sizeMatches) {
          const integrityIssue = {
            photoId: photo.id,
            albumId: photo.album_id,
            fileName: photo.original_filename || 'unknown',
            filePath: photo.file_path,
            fullPath: fullFilePath,
            recordedSize: photo.file_size || 0,
            actualSize: fileStats.size,
            sizeDifference: fileStats.size - (photo.file_size || 0),
            issueType: 'size_mismatch',
            severity: Math.abs(fileStats.size - (photo.file_size || 0)) > 1024 ? 'medium' : 'low', // 差異超過1KB視為中等嚴重性
            lastModified: fileStats.mtime.toISOString(),
            createdAt: photo.created_at
          }

          if (validatedParams.includeDetails) {
            integrityIssue.details = {
              metadata: photo.metadata,
              uploader: photo.uploaded_by,
              mimeType: photo.mime_type,
              fileStats: {
                mode: fileStats.mode,
                atime: fileStats.atime.toISOString(),
                ctime: fileStats.ctime.toISOString()
              }
            }
          }

          result.integrityIssues.push(integrityIssue)
          result.statistics.integrityIssuesFound++
        }
      }
    }

    // 計算平均記錄年齡
    if (photosToCheck.length > 0) {
      const totalAge = photosToCheck.reduce((sum, photo) => {
        const age = Math.floor((Date.now() - new Date(photo.created_at).getTime()) / (1000 * 60 * 60 * 24))
        return sum + age
      }, 0)
      result.statistics.averageRecordAge = Math.round(totalAge / photosToCheck.length)
    }

    // 生成建議
    if (result.statistics.orphanRecordsFound === 0 && result.statistics.integrityIssuesFound === 0) {
      result.recommendations.push('優秀！所有資料庫記錄都有對應的檔案，資料一致性良好')
    } else {
      if (result.statistics.orphanRecordsFound > 0) {
        result.recommendations.push(`發現 ${result.statistics.orphanRecordsFound} 個孤兒記錄，建議清理無效的資料庫記錄`)

        if (result.statistics.orphanRecordsFound > 20) {
          result.recommendations.push('大量孤兒記錄可能表示檔案上傳或刪除流程存在問題，建議檢查系統邏輯')
        }

        if (result.statistics.oldestOrphanAge > 7) {
          result.recommendations.push(`發現超過 7 天的舊孤兒記錄，建議定期執行資料清理`)
        }

        const sizeMB = Math.round(result.statistics.totalMissingBytes / (1024 * 1024))
        if (sizeMB > 10) {
          result.recommendations.push(`孤兒記錄總計 ${sizeMB}MB，清理後可釋放資料庫空間`)
        }
      }

      if (result.statistics.integrityIssuesFound > 0) {
        result.recommendations.push(`發現 ${result.statistics.integrityIssuesFound} 個檔案完整性問題，建議檢查檔案是否損壞`)
        result.recommendations.push('建議對有完整性問題的檔案執行重新上傳或修復作業')
      }

      result.recommendations.push('執行清理作業前請先備份資料庫')
      result.recommendations.push('建議實作檔案上傳的事務一致性機制，避免產生孤兒記錄')
    }

    // 按嚴重程度和年齡排序
    result.orphanRecords.sort((a, b) => {
      const severityOrder = { critical: 3, high: 2, medium: 1, low: 0 }
      const aSeverity = severityOrder[a.severity] || 0
      const bSeverity = severityOrder[b.severity] || 0

      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity // 嚴重程度高的優先
      }
      return b.ageInDays - a.ageInDays // 年齡大的優先
    })

    result.integrityIssues.sort((a, b) => {
      const severityOrder = { high: 2, medium: 1, low: 0 }
      const aSeverity = severityOrder[a.severity] || 0
      const bSeverity = severityOrder[b.severity] || 0

      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity
      }
      return Math.abs(b.sizeDifference) - Math.abs(a.sizeDifference) // 差異大的優先
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Orphan records check failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Orphan records check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}