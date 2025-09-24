import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { promises as fs } from 'fs'
import { join, resolve } from 'path'
import { OracleRepositoryFactory } from '@/lib/repositories/oracle-repository-factory'

/**
 * 系統一致性報告生成 API 端點
 *
 * 此端點用於 Task 10.2 系統整合驗證，生成完整的系統一致性報告
 */

const consistencyReportSchema = z.object({
  projectId: z.string().optional(),
  includeOrphanFiles: z.boolean().optional().default(true),
  includeOrphanRecords: z.boolean().optional().default(true),
  includePerformanceMetrics: z.boolean().optional().default(false),
  maxOrphanItems: z.number().optional().default(50)
})

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const params = {
      projectId: searchParams.get('projectId') || undefined,
      includeOrphanFiles: searchParams.get('includeOrphanFiles') !== 'false',
      includeOrphanRecords: searchParams.get('includeOrphanRecords') !== 'false',
      includePerformanceMetrics: searchParams.get('includePerformanceMetrics') === 'true',
      maxOrphanItems: parseInt(searchParams.get('maxOrphanItems') || '50')
    }

    const validatedParams = consistencyReportSchema.parse(params)

    const photoRepository = await OracleRepositoryFactory.getPhotoRepository()
    const albumRepository = await OracleRepositoryFactory.getAlbumRepository()
    const uploadsPath = resolve(process.cwd(), process.env.UPLOAD_PATH || 'uploads/photos')

    const consistencyReport = {
      reportId: `consistency-${Date.now()}`,
      timestamp: new Date().toISOString(),
      parameters: validatedParams,
      systemInfo: {
        uploadsPath,
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime()
      },
      databaseConnection: {
        status: 'unknown',
        connectionTime: 0
      },
      filesystemAccess: {
        status: 'unknown',
        accessible: false,
        accessTime: 0
      },
      statistics: {
        totalProjects: 0,
        totalAlbums: 0,
        totalPhotos: 0,
        totalFiles: 0,
        orphanFiles: 0,
        orphanRecords: 0,
        inconsistentRecords: 0
      },
      orphanFiles: [] as any[],
      orphanRecords: [] as any[],
      consistencyIssues: [] as any[],
      performanceMetrics: {} as any,
      recommendations: [] as string[],
      summary: {
        overallScore: 0,
        criticalIssues: 0,
        warnings: 0,
        status: 'unknown'
      }
    }

    // 1. 測試資料庫連線
    const dbTestStart = Date.now()
    try {
      // 簡單的查詢來測試連線
      await albumRepository.findByProjectId('test')
      consistencyReport.databaseConnection.status = 'connected'
      consistencyReport.databaseConnection.connectionTime = Date.now() - dbTestStart
    } catch (error) {
      consistencyReport.databaseConnection.status = 'failed'
      consistencyReport.databaseConnection.connectionTime = Date.now() - dbTestStart
      consistencyReport.summary.criticalIssues++
      consistencyReport.recommendations.push('檢查 Oracle 資料庫連線設定和服務狀態')
    }

    // 2. 測試檔案系統存取
    const fsTestStart = Date.now()
    try {
      await fs.access(uploadsPath)
      consistencyReport.filesystemAccess.status = 'accessible'
      consistencyReport.filesystemAccess.accessible = true
      consistencyReport.filesystemAccess.accessTime = Date.now() - fsTestStart
    } catch (error) {
      consistencyReport.filesystemAccess.status = 'failed'
      consistencyReport.filesystemAccess.accessible = false
      consistencyReport.filesystemAccess.accessTime = Date.now() - fsTestStart
      consistencyReport.summary.criticalIssues++
      consistencyReport.recommendations.push('檢查 uploads/photos 目錄權限和存取性')
    }

    // 如果基本系統無法存取，直接返回報告
    if (consistencyReport.databaseConnection.status === 'failed' ||
        consistencyReport.filesystemAccess.status === 'failed') {
      consistencyReport.summary.status = 'system_unavailable'
      consistencyReport.summary.overallScore = 0
      return NextResponse.json({
        success: false,
        data: consistencyReport,
        error: 'System components unavailable'
      })
    }

    // 3. 收集基本統計資料
    try {
      if (validatedParams.projectId) {
        const albums = await albumRepository.findByProjectId(validatedParams.projectId)
        consistencyReport.statistics.totalAlbums = albums.length

        let totalPhotos = 0
        for (const album of albums) {
          const photoCount = await photoRepository.countByAlbumId(album.id)
          totalPhotos += photoCount
        }
        consistencyReport.statistics.totalPhotos = totalPhotos
        consistencyReport.statistics.totalProjects = 1
      } else {
        // 獲取系統整體統計（限制查詢以避免效能問題）
        const sampleAlbums = await albumRepository.findAll(100)
        consistencyReport.statistics.totalAlbums = sampleAlbums.length

        const samplePhotos = await photoRepository.findAll(500)
        consistencyReport.statistics.totalPhotos = samplePhotos.length

        // 估計專案數量
        const projectIds = new Set(sampleAlbums.map(album => album.project_id))
        consistencyReport.statistics.totalProjects = projectIds.size
      }
    } catch (error) {
      consistencyReport.summary.warnings++
      consistencyReport.recommendations.push('無法收集完整的統計資料，請檢查資料庫查詢權限')
    }

    // 4. 檢查孤兒檔案（如果啟用）
    if (validatedParams.includeOrphanFiles && consistencyReport.filesystemAccess.accessible) {
      try {
        const orphanFiles: any[] = []
        const scanPath = validatedParams.projectId
          ? join(uploadsPath, validatedParams.projectId)
          : uploadsPath

        const scanDirectory = async (dirPath: string, relativePath: string = ''): Promise<void> => {
          try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true })

            for (const entry of entries.slice(0, 200)) { // 限制掃描數量
              if (entry.isFile() && !entry.name.startsWith('.')) {
                const fileRelativePath = join(relativePath, entry.name)
                const photos = await photoRepository.findByFilePath(fileRelativePath)

                if (photos.length === 0) {
                  const fullFilePath = join(dirPath, entry.name)
                  const fileStats = await fs.stat(fullFilePath)

                  orphanFiles.push({
                    filePath: fileRelativePath,
                    fullPath: fullFilePath,
                    fileSize: fileStats.size,
                    lastModified: fileStats.mtime.toISOString(),
                    ageInDays: Math.floor((Date.now() - fileStats.mtime.getTime()) / (1000 * 60 * 60 * 24))
                  })

                  if (orphanFiles.length >= validatedParams.maxOrphanItems) {
                    break
                  }
                }
              } else if (entry.isDirectory() && orphanFiles.length < validatedParams.maxOrphanItems) {
                await scanDirectory(
                  join(dirPath, entry.name),
                  join(relativePath, entry.name)
                )
              }
            }
          } catch (error) {
            // 忽略無法存取的目錄
          }
        }

        await scanDirectory(scanPath)

        consistencyReport.orphanFiles = orphanFiles
        consistencyReport.statistics.orphanFiles = orphanFiles.length

        if (orphanFiles.length > 0) {
          consistencyReport.summary.warnings++
          consistencyReport.recommendations.push(
            `發現 ${orphanFiles.length} 個孤兒檔案，建議執行檔案清理作業`
          )
        }
      } catch (error) {
        consistencyReport.summary.warnings++
        consistencyReport.recommendations.push('無法完成孤兒檔案檢查，請檢查檔案系統權限')
      }
    }

    // 5. 檢查孤兒記錄（如果啟用）
    if (validatedParams.includeOrphanRecords) {
      try {
        const orphanRecords: any[] = []
        let photosToCheck = []

        if (validatedParams.projectId) {
          const albums = await albumRepository.findByProjectId(validatedParams.projectId)
          for (const album of albums) {
            const albumPhotos = await photoRepository.findByAlbumId(album.id)
            photosToCheck.push(...albumPhotos)
          }
        } else {
          photosToCheck = await photoRepository.findAll(validatedParams.maxOrphanItems)
        }

        for (const photo of photosToCheck.slice(0, validatedParams.maxOrphanItems)) {
          if (photo.file_path) {
            const fullFilePath = join(uploadsPath, photo.file_path)
            try {
              await fs.access(fullFilePath)
              // 檔案存在，檢查大小一致性
              const fileStats = await fs.stat(fullFilePath)
              if (fileStats.size !== photo.file_size) {
                consistencyReport.consistencyIssues.push({
                  type: 'size_mismatch',
                  photoId: photo.id,
                  filePath: photo.file_path,
                  recordedSize: photo.file_size,
                  actualSize: fileStats.size,
                  severity: 'warning'
                })
                consistencyReport.statistics.inconsistentRecords++
              }
            } catch (error) {
              orphanRecords.push({
                photoId: photo.id,
                albumId: photo.album_id,
                filePath: photo.file_path,
                fullPath: fullFilePath,
                recordedSize: photo.file_size || 0,
                createdAt: photo.created_at,
                missingReason: 'file_not_found'
              })
            }
          }
        }

        consistencyReport.orphanRecords = orphanRecords
        consistencyReport.statistics.orphanRecords = orphanRecords.length

        if (orphanRecords.length > 0) {
          consistencyReport.summary.criticalIssues++
          consistencyReport.recommendations.push(
            `發現 ${orphanRecords.length} 個孤兒記錄（無對應檔案），需要進行資料清理`
          )
        }
      } catch (error) {
        consistencyReport.summary.warnings++
        consistencyReport.recommendations.push('無法完成孤兒記錄檢查，請檢查資料庫權限')
      }
    }

    // 6. 效能指標收集（如果啟用）
    if (validatedParams.includePerformanceMetrics) {
      const performanceStart = Date.now()

      try {
        // 資料庫查詢效能測試
        const dbQueryStart = Date.now()
        await albumRepository.findAll(10)
        const dbQueryTime = Date.now() - dbQueryStart

        // 檔案系統讀取效能測試
        const fsReadStart = Date.now()
        try {
          const entries = await fs.readdir(uploadsPath)
          const fsReadTime = Date.now() - fsReadStart

          consistencyReport.performanceMetrics = {
            databaseQueryTime: dbQueryTime,
            filesystemReadTime: fsReadTime,
            totalTestTime: Date.now() - performanceStart,
            memoryUsage: process.memoryUsage(),
            systemLoad: process.cpuUsage()
          }
        } catch (error) {
          consistencyReport.performanceMetrics.filesystemError = 'Unable to read directory'
        }
      } catch (error) {
        consistencyReport.performanceMetrics.databaseError = 'Unable to query database'
      }
    }

    // 7. 計算整體分數和狀態
    let scoreDeductions = 0
    scoreDeductions += consistencyReport.summary.criticalIssues * 30 // 嚴重問題扣30分
    scoreDeductions += consistencyReport.summary.warnings * 10      // 警告扣10分
    scoreDeductions += consistencyReport.statistics.orphanFiles * 2 // 每個孤兒檔案扣2分
    scoreDeductions += consistencyReport.statistics.orphanRecords * 5 // 每個孤兒記錄扣5分

    consistencyReport.summary.overallScore = Math.max(0, 100 - scoreDeductions)

    // 設定狀態
    if (consistencyReport.summary.overallScore >= 90) {
      consistencyReport.summary.status = 'excellent'
    } else if (consistencyReport.summary.overallScore >= 70) {
      consistencyReport.summary.status = 'good'
    } else if (consistencyReport.summary.overallScore >= 50) {
      consistencyReport.summary.status = 'fair'
    } else {
      consistencyReport.summary.status = 'poor'
    }

    // 8. 添加一般性建議
    if (consistencyReport.summary.overallScore < 70) {
      consistencyReport.recommendations.push('建議定期執行系統維護和資料清理')
    }

    if (consistencyReport.statistics.orphanFiles > 10) {
      consistencyReport.recommendations.push('考慮實作自動檔案清理機制')
    }

    if (consistencyReport.statistics.orphanRecords > 5) {
      consistencyReport.recommendations.push('建議檢查檔案上傳流程的事務一致性')
    }

    const totalProcessingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        ...consistencyReport,
        processingTime: totalProcessingTime,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Consistency report generation failed:', error)

    const processingTime = Date.now() - startTime

    return NextResponse.json(
      {
        success: false,
        error: 'Consistency report generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}