import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { promises as fs } from 'fs'
import { join, resolve } from 'path'
import { OracleRepositoryFactory } from '@/lib/repositories/oracle-repository-factory'

/**
 * 孤兒檔案檢查 API 端點
 *
 * 此端點用於 Task 10.2 系統整合驗證，專門檢查存在於檔案系統但無資料庫記錄的檔案
 */

const orphanFilesSchema = z.object({
  projectId: z.string().optional(),
  limit: z.number().optional().default(100),
  includeMetadata: z.boolean().optional().default(true),
  olderThanDays: z.number().optional() // 只檢查指定天數之前的檔案
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = {
      projectId: searchParams.get('projectId') || undefined,
      limit: parseInt(searchParams.get('limit') || '100'),
      includeMetadata: searchParams.get('includeMetadata') !== 'false',
      olderThanDays: searchParams.get('olderThanDays') ? parseInt(searchParams.get('olderThanDays')) : undefined
    }

    const validatedParams = orphanFilesSchema.parse(params)

    const photoRepository = await OracleRepositoryFactory.getPhotoRepository()
    const uploadsPath = resolve(process.cwd(), process.env.UPLOAD_PATH || 'uploads/photos')

    const result = {
      timestamp: new Date().toISOString(),
      parameters: validatedParams,
      scanPath: validatedParams.projectId ? join(uploadsPath, validatedParams.projectId) : uploadsPath,
      orphanFiles: [] as any[],
      statistics: {
        totalFilesScanned: 0,
        orphanFilesFound: 0,
        totalSizeBytes: 0,
        averageFileSizeBytes: 0,
        oldestOrphanAge: 0,
        newestOrphanAge: 0
      },
      recommendations: [] as string[]
    }

    // 檢查掃描路徑是否存在
    try {
      await fs.access(result.scanPath)
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Scan path not accessible',
        data: result
      }, { status: 404 })
    }

    // 建立已知檔案路徑的快速查詢映射
    const knownFilePaths = new Set<string>()

    try {
      let allPhotos = []
      if (validatedParams.projectId) {
        // 獲取特定專案的所有照片
        const albumRepository = await OracleRepositoryFactory.getAlbumRepository()
        const albums = await albumRepository.findByProjectId(validatedParams.projectId)
        for (const album of albums) {
          const photos = await photoRepository.findByAlbumId(album.id)
          allPhotos.push(...photos)
        }
      } else {
        // 獲取所有照片記錄（限制數量以避免記憶體問題）
        allPhotos = await photoRepository.findAll(5000)
      }

      allPhotos.forEach(photo => {
        if (photo.file_path) {
          knownFilePaths.add(photo.file_path.replace(/\\/g, '/')) // 正規化路徑分隔符
        }
      })
    } catch (error) {
      console.error('Failed to load known file paths:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to load database records',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

    // 遞迴掃描檔案系統
    const scanDirectory = async (dirPath: string, relativePath: string = ''): Promise<void> => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true })

        for (const entry of entries) {
          if (result.orphanFiles.length >= validatedParams.limit) {
            break // 達到限制數量
          }

          const entryPath = join(dirPath, entry.name)
          const relativeEntryPath = join(relativePath, entry.name).replace(/\\/g, '/')

          if (entry.isFile() && !entry.name.startsWith('.')) {
            result.statistics.totalFilesScanned++

            // 檢查是否為圖片檔案
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
            const isImage = imageExtensions.some(ext =>
              entry.name.toLowerCase().endsWith(ext)
            )

            if (isImage && !knownFilePaths.has(relativeEntryPath)) {
              try {
                const fileStats = await fs.stat(entryPath)
                const ageInDays = Math.floor((Date.now() - fileStats.mtime.getTime()) / (1000 * 60 * 60 * 24))

                // 如果設定了年齡限制，跳過太新的檔案
                if (validatedParams.olderThanDays && ageInDays < validatedParams.olderThanDays) {
                  continue
                }

                const orphanFile: any = {
                  filePath: relativeEntryPath,
                  fullPath: entryPath,
                  fileName: entry.name,
                  fileSize: fileStats.size,
                  lastModified: fileStats.mtime.toISOString(),
                  createdAt: fileStats.birthtime ? fileStats.birthtime.toISOString() : null,
                  ageInDays,
                  isImage
                }

                if (validatedParams.includeMetadata) {
                  orphanFile.metadata = {
                    mode: fileStats.mode,
                    uid: fileStats.uid,
                    gid: fileStats.gid,
                    accessTime: fileStats.atime.toISOString(),
                    changeTime: fileStats.ctime.toISOString()
                  }
                }

                result.orphanFiles.push(orphanFile)
                result.statistics.totalSizeBytes += fileStats.size

                // 更新年齡統計
                if (result.statistics.orphanFilesFound === 0) {
                  result.statistics.oldestOrphanAge = ageInDays
                  result.statistics.newestOrphanAge = ageInDays
                } else {
                  result.statistics.oldestOrphanAge = Math.max(result.statistics.oldestOrphanAge, ageInDays)
                  result.statistics.newestOrphanAge = Math.min(result.statistics.newestOrphanAge, ageInDays)
                }

                result.statistics.orphanFilesFound++
              } catch (statError) {
                // 忽略無法獲取統計資訊的檔案
              }
            }
          } else if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules') {
            // 遞迴掃描子目錄
            await scanDirectory(entryPath, relativeEntryPath)
          }
        }
      } catch (error) {
        // 忽略無法存取的目錄，記錄警告
        console.warn(`Cannot access directory: ${dirPath}`, error)
      }
    }

    // 開始掃描
    await scanDirectory(result.scanPath)

    // 計算統計資料
    if (result.statistics.orphanFilesFound > 0) {
      result.statistics.averageFileSizeBytes = Math.round(
        result.statistics.totalSizeBytes / result.statistics.orphanFilesFound
      )
    }

    // 生成建議
    if (result.statistics.orphanFilesFound === 0) {
      result.recommendations.push('太好了！未發現孤兒檔案，系統檔案管理狀況良好')
    } else {
      if (result.statistics.orphanFilesFound > 50) {
        result.recommendations.push('發現大量孤兒檔案，建議實作自動檔案清理機制')
      }

      if (result.statistics.oldestOrphanAge > 30) {
        result.recommendations.push(`發現超過 30 天的舊孤兒檔案，建議清理 ${result.statistics.oldestOrphanAge} 天前的檔案`)
      }

      if (result.statistics.totalSizeBytes > 100 * 1024 * 1024) { // 100MB
        const sizeMB = Math.round(result.statistics.totalSizeBytes / (1024 * 1024))
        result.recommendations.push(`孤兒檔案佔用 ${sizeMB}MB 空間，建議進行磁碟空間清理`)
      }

      result.recommendations.push('建議在非高峰時間執行檔案清理作業')
      result.recommendations.push('清理前請先備份重要檔案')
    }

    // 按檔案大小排序（大檔案優先）
    result.orphanFiles.sort((a, b) => b.fileSize - a.fileSize)

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Orphan files check failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Orphan files check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}