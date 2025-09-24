import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { OracleRepositoryFactory } from '@/lib/repositories/oracle-repository-factory'

/**
 * Oracle 資料庫一致性驗證 API 端點
 *
 * 此端點用於 Task 10.2 系統整合驗證，檢查資料庫記錄的完整性和一致性
 */

const verifyDatabaseConsistencySchema = z.object({
  photoId: z.string().optional(),
  albumId: z.string().optional(),
  projectId: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = {
      photoId: searchParams.get('photoId') || undefined,
      albumId: searchParams.get('albumId') || undefined,
      projectId: searchParams.get('projectId') || undefined
    }

    const validatedParams = verifyDatabaseConsistencySchema.parse(params)

    // 檢查 Oracle 連線
    const photoRepository = await OracleRepositoryFactory.getPhotoRepository()
    const albumRepository = await OracleRepositoryFactory.getAlbumRepository()

    const consistencyReport = {
      timestamp: new Date().toISOString(),
      databaseConnection: 'connected',
      checks: {
        photoConsistency: null as any,
        albumConsistency: null as any,
        referentialIntegrity: null as any
      },
      summary: {
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0
      }
    }

    // 1. 檢查照片記錄一致性
    if (validatedParams.photoId) {
      try {
        const photoRecord = await photoRepository.findById(validatedParams.photoId)
        consistencyReport.checks.photoConsistency = {
          photoId: validatedParams.photoId,
          exists: !!photoRecord,
          hasMetadata: photoRecord ? !!photoRecord.metadata : false,
          hasValidPath: photoRecord ? !!photoRecord.file_path : false,
          status: photoRecord ? 'consistent' : 'missing_record'
        }
        consistencyReport.summary.totalChecks++
        if (photoRecord) {
          consistencyReport.summary.passedChecks++
        } else {
          consistencyReport.summary.failedChecks++
        }
      } catch (error) {
        consistencyReport.checks.photoConsistency = {
          photoId: validatedParams.photoId,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'error'
        }
        consistencyReport.summary.totalChecks++
        consistencyReport.summary.failedChecks++
      }
    }

    // 2. 檢查相簿記錄一致性
    if (validatedParams.albumId) {
      try {
        const albumRecord = await albumRepository.findById(validatedParams.albumId)
        const photoCount = albumRecord ? await photoRepository.countByAlbumId(validatedParams.albumId) : 0

        consistencyReport.checks.albumConsistency = {
          albumId: validatedParams.albumId,
          exists: !!albumRecord,
          photoCount: photoCount,
          recordedPhotoCount: albumRecord?.photo_count || 0,
          countsMatch: photoCount === (albumRecord?.photo_count || 0),
          status: albumRecord && (photoCount === albumRecord.photo_count) ? 'consistent' : 'inconsistent'
        }
        consistencyReport.summary.totalChecks++
        if (albumRecord && photoCount === albumRecord.photo_count) {
          consistencyReport.summary.passedChecks++
        } else {
          consistencyReport.summary.failedChecks++
        }
      } catch (error) {
        consistencyReport.checks.albumConsistency = {
          albumId: validatedParams.albumId,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'error'
        }
        consistencyReport.summary.totalChecks++
        consistencyReport.summary.failedChecks++
      }
    }

    // 3. 檢查參考完整性
    if (validatedParams.projectId) {
      try {
        const albums = await albumRepository.findByProjectId(validatedParams.projectId)
        const orphanedPhotos = []

        for (const album of albums) {
          const albumPhotos = await photoRepository.findByAlbumId(album.id)
          for (const photo of albumPhotos) {
            if (photo.album_id !== album.id) {
              orphanedPhotos.push({
                photoId: photo.id,
                albumId: photo.album_id,
                expectedAlbumId: album.id
              })
            }
          }
        }

        consistencyReport.checks.referentialIntegrity = {
          projectId: validatedParams.projectId,
          albumsCount: albums.length,
          orphanedPhotosCount: orphanedPhotos.length,
          orphanedPhotos: orphanedPhotos.slice(0, 10), // 只顯示前10個
          status: orphanedPhotos.length === 0 ? 'consistent' : 'inconsistent'
        }
        consistencyReport.summary.totalChecks++
        if (orphanedPhotos.length === 0) {
          consistencyReport.summary.passedChecks++
        } else {
          consistencyReport.summary.failedChecks++
        }
      } catch (error) {
        consistencyReport.checks.referentialIntegrity = {
          projectId: validatedParams.projectId,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'error'
        }
        consistencyReport.summary.totalChecks++
        consistencyReport.summary.failedChecks++
      }
    }

    // 計算一致性分數
    const consistencyScore = consistencyReport.summary.totalChecks > 0
      ? (consistencyReport.summary.passedChecks / consistencyReport.summary.totalChecks) * 100
      : 0

    return NextResponse.json({
      success: true,
      data: {
        ...consistencyReport,
        consistencyScore: Math.round(consistencyScore * 100) / 100
      }
    })

  } catch (error) {
    console.error('Database consistency check failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Database consistency check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: {
          timestamp: new Date().toISOString(),
          databaseConnection: 'failed'
        }
      },
      { status: 500 }
    )
  }
}