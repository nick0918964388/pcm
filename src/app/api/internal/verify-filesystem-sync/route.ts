import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { promises as fs } from 'fs'
import { join, resolve } from 'path'
import { OracleRepositoryFactory } from '@/lib/repositories/oracle-repository-factory'

/**
 * 檔案系統同步驗證 API 端點
 *
 * 此端點用於 Task 10.2 系統整合驗證，檢查檔案系統與資料庫記錄的同步狀態
 */

const verifyFilesystemSyncSchema = z.object({
  photoId: z.string().optional(),
  albumId: z.string().optional(),
  projectId: z.string().optional(),
  checkAll: z.boolean().optional().default(false)
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = {
      photoId: searchParams.get('photoId') || undefined,
      albumId: searchParams.get('albumId') || undefined,
      projectId: searchParams.get('projectId') || undefined,
      checkAll: searchParams.get('checkAll') === 'true'
    }

    const validatedParams = verifyFilesystemSyncSchema.parse(params)

    const photoRepository = await OracleRepositoryFactory.getPhotoRepository()
    const albumRepository = await OracleRepositoryFactory.getAlbumRepository()

    const syncReport = {
      timestamp: new Date().toISOString(),
      filesystemAccessible: true,
      uploadPath: process.env.UPLOAD_PATH || 'uploads/photos',
      checks: {
        fileSyncStatus: null as any,
        directorySync: null as any,
        orphanFiles: null as any,
        missingFiles: null as any
      },
      summary: {
        totalFiles: 0,
        syncedFiles: 0,
        orphanFiles: 0,
        missingFiles: 0
      }
    }

    const uploadsPath = resolve(process.cwd(), syncReport.uploadPath)

    // 檢查 uploads 目錄是否可存取
    try {
      await fs.access(uploadsPath)
    } catch (error) {
      syncReport.filesystemAccessible = false
      return NextResponse.json({
        success: false,
        error: 'Filesystem not accessible',
        data: syncReport
      }, { status: 500 })
    }

    // 1. 特定照片檔案同步檢查
    if (validatedParams.photoId) {
      try {
        const photoRecord = await photoRepository.findById(validatedParams.photoId)
        if (photoRecord && photoRecord.file_path) {
          const fullFilePath = join(uploadsPath, photoRecord.file_path)
          let fileExists = false
          let fileStats = null

          try {
            fileStats = await fs.stat(fullFilePath)
            fileExists = fileStats.isFile()
          } catch (error) {
            fileExists = false
          }

          syncReport.checks.fileSyncStatus = {
            photoId: validatedParams.photoId,
            databasePath: photoRecord.file_path,
            fullFilePath,
            fileExists,
            fileSize: fileStats?.size || 0,
            recordedSize: photoRecord.file_size || 0,
            sizeMatches: fileExists && fileStats?.size === photoRecord.file_size,
            lastModified: fileStats?.mtime?.toISOString() || null,
            status: fileExists && fileStats?.size === photoRecord.file_size ? 'synced' : 'unsynced'
          }

          syncReport.summary.totalFiles++
          if (fileExists && fileStats?.size === photoRecord.file_size) {
            syncReport.summary.syncedFiles++
          } else if (!fileExists) {
            syncReport.summary.missingFiles++
          }
        } else {
          syncReport.checks.fileSyncStatus = {
            photoId: validatedParams.photoId,
            error: 'Photo record not found or no file path',
            status: 'error'
          }
        }
      } catch (error) {
        syncReport.checks.fileSyncStatus = {
          photoId: validatedParams.photoId,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'error'
        }
      }
    }

    // 2. 相簿目錄同步檢查
    if (validatedParams.albumId) {
      try {
        const albumRecord = await albumRepository.findById(validatedParams.albumId)
        if (albumRecord) {
          const albumDirPath = join(uploadsPath, albumRecord.project_id, albumRecord.name)
          let dirExists = false

          try {
            const dirStats = await fs.stat(albumDirPath)
            dirExists = dirStats.isDirectory()
          } catch (error) {
            dirExists = false
          }

          if (dirExists) {
            const filesInDir = await fs.readdir(albumDirPath)
            const albumPhotos = await photoRepository.findByAlbumId(validatedParams.albumId)

            syncReport.checks.directorySync = {
              albumId: validatedParams.albumId,
              albumPath: albumDirPath,
              directoryExists: dirExists,
              filesInDirectory: filesInDir.length,
              photosInDatabase: albumPhotos.length,
              filesMatch: filesInDir.length === albumPhotos.length,
              filesList: filesInDir.slice(0, 10), // 只顯示前10個檔案
              status: filesInDir.length === albumPhotos.length ? 'synced' : 'unsynced'
            }
          } else {
            syncReport.checks.directorySync = {
              albumId: validatedParams.albumId,
              albumPath: albumDirPath,
              directoryExists: false,
              status: 'missing_directory'
            }
          }
        }
      } catch (error) {
        syncReport.checks.directorySync = {
          albumId: validatedParams.albumId,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'error'
        }
      }
    }

    // 3. 孤兒檔案檢查（存在檔案但無資料庫記錄）
    if (validatedParams.checkAll || validatedParams.projectId) {
      try {
        const orphanFiles = []
        const projectPath = validatedParams.projectId
          ? join(uploadsPath, validatedParams.projectId)
          : uploadsPath

        // 遞迴掃描目錄
        const scanDirectory = async (dirPath: string, relativePath: string = '') => {
          try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true })

            for (const entry of entries) {
              if (entry.isFile()) {
                const fileRelativePath = join(relativePath, entry.name)
                const photos = await photoRepository.findByFilePath(fileRelativePath)

                if (photos.length === 0) {
                  const fullFilePath = join(dirPath, entry.name)
                  const fileStats = await fs.stat(fullFilePath)

                  orphanFiles.push({
                    filePath: fileRelativePath,
                    fullPath: fullFilePath,
                    fileSize: fileStats.size,
                    lastModified: fileStats.mtime.toISOString()
                  })
                }
              } else if (entry.isDirectory()) {
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

        await scanDirectory(projectPath)

        syncReport.checks.orphanFiles = {
          projectId: validatedParams.projectId,
          scanPath: projectPath,
          orphanFilesCount: orphanFiles.length,
          orphanFiles: orphanFiles.slice(0, 20), // 只顯示前20個
          status: orphanFiles.length === 0 ? 'clean' : 'has_orphans'
        }

        syncReport.summary.orphanFiles = orphanFiles.length
      } catch (error) {
        syncReport.checks.orphanFiles = {
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'error'
        }
      }
    }

    // 4. 遺失檔案檢查（有資料庫記錄但無實體檔案）
    if (validatedParams.checkAll || validatedParams.projectId) {
      try {
        const missingFiles = []
        let photosToCheck = []

        if (validatedParams.projectId) {
          const albums = await albumRepository.findByProjectId(validatedParams.projectId)
          for (const album of albums) {
            const albumPhotos = await photoRepository.findByAlbumId(album.id)
            photosToCheck.push(...albumPhotos)
          }
        } else {
          // 檢查所有照片記錄（限制數量以避免效能問題）
          photosToCheck = await photoRepository.findAll(100) // 限制100筆
        }

        for (const photo of photosToCheck) {
          if (photo.file_path) {
            const fullFilePath = join(uploadsPath, photo.file_path)
            try {
              await fs.access(fullFilePath)
            } catch (error) {
              missingFiles.push({
                photoId: photo.id,
                albumId: photo.album_id,
                filePath: photo.file_path,
                fullPath: fullFilePath,
                recordedSize: photo.file_size || 0
              })
            }
          }
        }

        syncReport.checks.missingFiles = {
          projectId: validatedParams.projectId,
          checkedPhotos: photosToCheck.length,
          missingFilesCount: missingFiles.length,
          missingFiles: missingFiles.slice(0, 20), // 只顯示前20個
          status: missingFiles.length === 0 ? 'complete' : 'has_missing'
        }

        syncReport.summary.missingFiles = missingFiles.length
      } catch (error) {
        syncReport.checks.missingFiles = {
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'error'
        }
      }
    }

    // 計算同步分數
    const totalIssues = syncReport.summary.orphanFiles + syncReport.summary.missingFiles
    const syncScore = syncReport.summary.totalFiles > 0
      ? ((syncReport.summary.syncedFiles - totalIssues) / syncReport.summary.totalFiles) * 100
      : totalIssues === 0 ? 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        ...syncReport,
        syncScore: Math.max(0, Math.round(syncScore * 100) / 100)
      }
    })

  } catch (error) {
    console.error('Filesystem sync check failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Filesystem sync check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}