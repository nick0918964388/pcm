/**
 * Oracle照片倉儲測試
 * Task 3.1: 建立 Oracle 照片倉儲
 *
 * 遵循 TDD 方法論
 * RED: 撰寫失敗的測試
 * GREEN: 實作最小程式碼讓測試通過
 * REFACTOR: 重構並改善程式碼品質
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OraclePhotoRepository } from '../oracle-photo-repository'
import { OracleQueryExecutor } from '../../database/oracle-query-executor'
import { getOracleConnection } from '../../database/oracle-connection'
import { UploadStatus, VersionType } from '../types/photo.types'

// 模擬 Oracle 連線
vi.mock('../../database/oracle-connection')

describe('OraclePhotoRepository', () => {
  let repository: OraclePhotoRepository
  let mockQueryExecutor: OracleQueryExecutor
  let mockOracleConnection: any

  beforeEach(() => {
    // 設定模擬的 Oracle 連線
    mockOracleConnection = {
      execute: vi.fn(),
      healthCheck: vi.fn().mockResolvedValue({ success: true, data: { isHealthy: true } })
    }

    vi.mocked(getOracleConnection).mockReturnValue(mockOracleConnection)

    // 建立模擬的查詢執行器
    mockQueryExecutor = {
      execute: vi.fn(),
      executeBatch: vi.fn(),
      withTransaction: vi.fn()
    } as any

    // 建立倉儲實例
    repository = new OraclePhotoRepository(mockQueryExecutor)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('建立照片記錄 (Create Photo)', () => {
    it('應該成功建立新照片記錄', async () => {
      // Arrange
      const photoData = {
        albumId: 'album001',
        fileName: 'test-photo.jpg',
        filePath: '/uploads/photos/proj001/album001/test-photo.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        uploadedBy: 'user123',
        metadata: {
          exif: {
            camera: 'Canon EOS R5',
            dateTime: new Date('2024-01-01')
          },
          tags: ['施工', '進度']
        }
      }

      const mockCreatedPhoto = {
        id: 'photo001',
        album_id: 'album001',
        file_name: 'test-photo.jpg',
        file_path: '/uploads/photos/proj001/album001/test-photo.jpg',
        file_size: 1024000,
        mime_type: 'image/jpeg',
        width: 1920,
        height: 1080,
        uploaded_by: 'user123',
        uploaded_at: new Date(),
        upload_status: 'completed',
        metadata: JSON.stringify({
          exif: {
            camera: 'Canon EOS R5',
            dateTime: '2024-01-01T00:00:00.000Z'
          },
          tags: ['施工', '進度']
        })
      }

      // 模擬插入操作返回新ID
      mockQueryExecutor.execute
        .mockResolvedValueOnce({
          rows: [],
          outBinds: { newId: 'photo001' }
        })
        // 模擬查詢新建立的照片
        .mockResolvedValueOnce({
          rows: [mockCreatedPhoto]
        })

      // Act
      const result = await repository.createPhoto(photoData)

      // Assert
      expect(result).toEqual({
        id: 'photo001',
        albumId: 'album001',
        fileName: 'test-photo.jpg',
        filePath: '/uploads/photos/proj001/album001/test-photo.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        uploadedBy: 'user123',
        uploadedAt: expect.any(Date),
        uploadStatus: 'completed',
        metadata: {
          exif: {
            camera: 'Canon EOS R5',
            dateTime: expect.any(Date)
          },
          tags: ['施工', '進度']
        }
      })

      // 驗證插入 SQL
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO photos'),
        expect.objectContaining({
          album_id: 'album001',
          file_name: 'test-photo.jpg',
          file_path: '/uploads/photos/proj001/album001/test-photo.jpg'
        }),
        {}
      )
    })
  })

  describe('照片版本管理 (Photo Versions)', () => {
    it('應該建立照片的多個版本', async () => {
      // Arrange
      const photoId = 'photo001'
      const versions = [
        {
          photoId,
          versionType: 'thumbnail' as VersionType,
          filePath: '/uploads/photos/versions/photo001_thumbnail.jpg',
          width: 150,
          height: 150,
          fileSize: 5000
        },
        {
          photoId,
          versionType: 'small' as VersionType,
          filePath: '/uploads/photos/versions/photo001_small.jpg',
          width: 400,
          height: 300,
          fileSize: 25000
        }
      ]

      // 模擬批次插入版本
      mockQueryExecutor.executeBatch.mockResolvedValue({
        rowsAffected: 2
      })

      // Act
      const result = await repository.createPhotoVersions(photoId, versions)

      // Assert
      expect(result).toBe(true)

      // 驗證批次插入 SQL
      expect(mockQueryExecutor.executeBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringContaining('INSERT INTO photo_versions'),
          binds: expect.arrayContaining([
            expect.objectContaining({
              photo_id: photoId,
              version_type: 'thumbnail'
            })
          ])
        }),
        {}
      )
    })

    it('應該取得照片的所有版本', async () => {
      // Arrange
      const photoId = 'photo001'

      const mockVersions = [
        {
          id: 'version001',
          photo_id: 'photo001',
          version_type: 'thumbnail',
          file_path: '/uploads/photos/versions/photo001_thumbnail.jpg',
          width: 150,
          height: 150,
          file_size: 5000,
          created_at: new Date()
        },
        {
          id: 'version002',
          photo_id: 'photo001',
          version_type: 'small',
          file_path: '/uploads/photos/versions/photo001_small.jpg',
          width: 400,
          height: 300,
          file_size: 25000,
          created_at: new Date()
        }
      ]

      mockQueryExecutor.execute.mockResolvedValue({
        rows: mockVersions
      })

      // Act
      const result = await repository.getPhotoVersions(photoId)

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'version001',
        photoId: 'photo001',
        versionType: 'thumbnail',
        filePath: '/uploads/photos/versions/photo001_thumbnail.jpg',
        width: 150,
        height: 150,
        fileSize: 5000,
        createdAt: expect.any(Date)
      })
    })
  })

  describe('相簿照片查詢 (Album Photos)', () => {
    it('應該取得指定相簿的所有照片', async () => {
      // Arrange
      const albumId = 'album001'

      const mockPhotos = [
        {
          id: 'photo001',
          album_id: 'album001',
          file_name: 'photo1.jpg',
          file_path: '/uploads/photos/proj001/album001/photo1.jpg',
          file_size: 1024000,
          mime_type: 'image/jpeg',
          width: 1920,
          height: 1080,
          uploaded_by: 'user123',
          uploaded_at: new Date(),
          upload_status: 'completed',
          metadata: '{}'
        },
        {
          id: 'photo002',
          album_id: 'album001',
          file_name: 'photo2.png',
          file_path: '/uploads/photos/proj001/album001/photo2.png',
          file_size: 2048000,
          mime_type: 'image/png',
          width: 2560,
          height: 1440,
          uploaded_by: 'user456',
          uploaded_at: new Date(),
          upload_status: 'completed',
          metadata: '{}'
        }
      ]

      mockQueryExecutor.execute.mockResolvedValue({
        rows: mockPhotos
      })

      // Act
      const result = await repository.getAlbumPhotos(albumId)

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0].albumId).toBe('album001')
      expect(result[0].fileName).toBe('photo1.jpg')

      // 驗證查詢使用了 active_photos 檢視表
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('FROM active_photos'),
        expect.objectContaining({ albumId }),
        {}
      )
    })
  })

  describe('照片搜尋功能 (Photo Search)', () => {
    it('應該根據搜尋條件篩選照片', async () => {
      // Arrange
      const searchCriteria = {
        albumId: 'album001',
        mimeTypes: ['image/jpeg', 'image/png'],
        tags: ['施工'],
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        }
      }

      const mockSearchResults = [
        {
          id: 'photo001',
          album_id: 'album001',
          file_name: 'construction1.jpg',
          file_path: '/uploads/photos/proj001/album001/construction1.jpg',
          file_size: 1024000,
          mime_type: 'image/jpeg',
          uploaded_by: 'user123',
          uploaded_at: new Date('2024-06-15'),
          upload_status: 'completed',
          metadata: JSON.stringify({ tags: ['施工', '進度'] })
        }
      ]

      mockQueryExecutor.execute.mockResolvedValue({
        rows: mockSearchResults
      })

      // Act
      const result = await repository.searchPhotos(searchCriteria)

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].fileName).toBe('construction1.jpg')

      // 驗證搜尋 SQL 包含篩選條件
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.objectContaining({
          albumId: 'album001'
        }),
        {}
      )
    })
  })

  describe('照片 Metadata 管理 (Photo Metadata)', () => {
    it('應該更新照片的 metadata', async () => {
      // Arrange
      const photoId = 'photo001'
      const metadataUpdates = {
        tags: ['更新標籤', '新標籤'],
        description: '更新後的描述',
        technical: {
          colorSpace: 'sRGB',
          orientation: 1
        }
      }

      const mockUpdatedPhoto = {
        id: 'photo001',
        album_id: 'album001',
        file_name: 'test-photo.jpg',
        metadata: JSON.stringify({
          tags: ['更新標籤', '新標籤'],
          description: '更新後的描述',
          technical: {
            colorSpace: 'sRGB',
            orientation: 1
          }
        }),
        uploaded_at: new Date(),
        upload_status: 'completed'
      }

      // 模擬更新操作
      mockQueryExecutor.execute
        .mockResolvedValueOnce({ rows: [] })
        // 模擬查詢更新後的照片
        .mockResolvedValueOnce({ rows: [mockUpdatedPhoto] })

      // Act
      const result = await repository.updatePhotoMetadata(photoId, metadataUpdates)

      // Assert
      expect(result.metadata.tags).toEqual(['更新標籤', '新標籤'])
      expect(result.metadata.description).toBe('更新後的描述')

      // 驗證使用 JSON_MERGEPATCH 更新 metadata
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('JSON_MERGEPATCH'),
        expect.objectContaining({
          jsonPatch: expect.any(String),
          id: photoId
        }),
        {}
      )
    })
  })

  describe('批次照片操作 (Batch Photo Operations)', () => {
    it('應該批次刪除多張照片', async () => {
      // Arrange
      const photoIds = ['photo001', 'photo002', 'photo003']

      mockQueryExecutor.execute.mockResolvedValue({
        rows: [{}, {}, {}]  // 模擬返回3行
      })

      // Act
      const result = await repository.batchDeletePhotos(photoIds)

      // Assert
      expect(result).toBe(3)

      // 驗證批次軟刪除 SQL
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE photos SET deleted_at = SYSDATE'),
        expect.objectContaining({
          id0: 'photo001',
          id1: 'photo002',
          id2: 'photo003'
        }),
        {}
      )
    })
  })

  describe('照片管理操作 (Photo Management Operations)', () => {
    it('應該重新命名照片檔案', async () => {
      // Arrange
      const photoId = 'photo001'
      const newFileName = 'renamed-photo.jpg'

      const mockUpdatedPhoto = {
        id: 'photo001',
        album_id: 'album001',
        file_name: 'renamed-photo.jpg',
        file_path: '/uploads/photos/proj001/album001/renamed-photo.jpg',
        uploaded_at: new Date(),
        upload_status: 'completed',
        metadata: '{}'
      }

      // 模擬更新操作
      mockQueryExecutor.execute
        .mockResolvedValueOnce({ rows: [] })
        // 模擬查詢更新後的照片
        .mockResolvedValueOnce({ rows: [mockUpdatedPhoto] })

      // Act
      const result = await repository.renamePhoto(photoId, newFileName)

      // Assert
      expect(result.fileName).toBe('renamed-photo.jpg')

      // 驗證更新 SQL
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE photos SET'),
        expect.objectContaining({
          file_name: newFileName,
          id: photoId
        }),
        {}
      )
    })

    it('應該為照片添加標籤', async () => {
      // Arrange
      const photoId = 'photo001'
      const tags = ['新標籤', '測試標籤']

      const mockUpdatedPhoto = {
        id: 'photo001',
        metadata: JSON.stringify({
          tags: ['新標籤', '測試標籤'],
          description: '原有描述'
        }),
        uploaded_at: new Date(),
        upload_status: 'completed'
      }

      // 模擬 JSON 更新操作
      mockQueryExecutor.execute
        .mockResolvedValueOnce({ rows: [] })
        // 模擬查詢更新後的照片
        .mockResolvedValueOnce({ rows: [mockUpdatedPhoto] })

      // Act
      const result = await repository.addPhotoTags(photoId, tags)

      // Assert
      expect(result.metadata.tags).toEqual(['新標籤', '測試標籤'])

      // 驗證使用 JSON_MERGEPATCH 更新標籤
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('JSON_MERGEPATCH'),
        expect.objectContaining({
          jsonPatch: expect.stringContaining('tags'),
          id: photoId
        }),
        {}
      )
    })

    it('應該移除照片標籤', async () => {
      // Arrange
      const photoId = 'photo001'
      const tagToRemove = '要移除的標籤'

      // 模擬當前照片資料
      const currentPhoto = {
        id: 'photo001',
        metadata: JSON.stringify({
          tags: ['保留標籤', '要移除的標籤', '另一個標籤']
        })
      }

      const mockUpdatedPhoto = {
        id: 'photo001',
        metadata: JSON.stringify({
          tags: ['保留標籤', '另一個標籤']
        }),
        uploaded_at: new Date(),
        upload_status: 'completed'
      }

      // 模擬查詢當前照片
      mockQueryExecutor.execute
        .mockResolvedValueOnce({ rows: [currentPhoto] })
        // 模擬更新操作
        .mockResolvedValueOnce({ rows: [] })
        // 模擬查詢更新後的照片
        .mockResolvedValueOnce({ rows: [mockUpdatedPhoto] })

      // Act
      const result = await repository.removePhotoTag(photoId, tagToRemove)

      // Assert
      expect(result.metadata.tags).toEqual(['保留標籤', '另一個標籤'])
      expect(result.metadata.tags).not.toContain('要移除的標籤')
    })

    it('應該更新照片描述', async () => {
      // Arrange
      const photoId = 'photo001'
      const newDescription = '更新後的照片描述'

      const mockUpdatedPhoto = {
        id: 'photo001',
        metadata: JSON.stringify({
          description: '更新後的照片描述',
          tags: ['原有標籤']
        }),
        uploaded_at: new Date(),
        upload_status: 'completed'
      }

      // 模擬更新操作
      mockQueryExecutor.execute
        .mockResolvedValueOnce({ rows: [] })
        // 模擬查詢更新後的照片
        .mockResolvedValueOnce({ rows: [mockUpdatedPhoto] })

      // Act
      const result = await repository.updatePhotoDescription(photoId, newDescription)

      // Assert
      expect(result.metadata.description).toBe('更新後的照片描述')

      // 驗證 JSON 更新
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('JSON_MERGEPATCH'),
        expect.objectContaining({
          jsonPatch: expect.stringContaining('description'),
          id: photoId
        }),
        {}
      )
    })

    it('應該同步刪除照片和本地檔案', async () => {
      // Arrange
      const photoId = 'photo001'
      const filePath = '/uploads/photos/proj001/album001/photo.jpg'

      // 模擬查詢照片資訊
      const mockPhoto = {
        id: 'photo001',
        file_path: filePath,
        album_id: 'album001'
      }

      mockQueryExecutor.execute
        .mockResolvedValueOnce({ rows: [mockPhoto] }) // 查詢照片
        .mockResolvedValueOnce({ rows: [{}] }) // 軟刪除照片
        .mockResolvedValueOnce({ rowsAffected: 2 }) // 刪除版本

      // Act
      const result = await repository.deletePhotoWithFiles(photoId, 'user123')

      // Assert
      expect(result).toEqual({
        success: true,
        deletedPhoto: true,
        deletedVersions: 2,
        filePath: filePath
      })

      // 驗證軟刪除照片
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE photos SET deleted_at = SYSDATE'),
        expect.objectContaining({ id: photoId }),
        {}
      )

      // 驗證刪除版本
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM photo_versions'),
        expect.objectContaining({ photoId }),
        {}
      )
    })

    it('應該批次更新照片標籤', async () => {
      // Arrange
      const photoIds = ['photo001', 'photo002']
      const tagsToAdd = ['批次標籤', '共同標籤']

      // 模擬批次更新成功
      mockQueryExecutor.execute.mockResolvedValue({
        rowsAffected: 2
      })

      // Act
      const result = await repository.batchUpdatePhotoTags(photoIds, tagsToAdd)

      // Assert
      expect(result).toBe(2)

      // 驗證批次更新 SQL
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('JSON_MERGEPATCH'),
        expect.objectContaining({
          id0: 'photo001',
          id1: 'photo002'
        }),
        {}
      )
    })

    it('應該根據標籤搜尋照片', async () => {
      // Arrange
      const tags = ['施工', '進度']

      const mockSearchResults = [
        {
          id: 'photo001',
          album_id: 'album001',
          file_name: 'construction1.jpg',
          metadata: JSON.stringify({ tags: ['施工', '進度', '第一階段'] }),
          uploaded_at: new Date(),
          upload_status: 'completed'
        },
        {
          id: 'photo002',
          album_id: 'album001',
          file_name: 'construction2.jpg',
          metadata: JSON.stringify({ tags: ['施工', '完工'] }),
          uploaded_at: new Date(),
          upload_status: 'completed'
        }
      ]

      mockQueryExecutor.execute.mockResolvedValue({
        rows: mockSearchResults
      })

      // Act
      const result = await repository.findPhotosByTags(tags)

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0].metadata.tags).toContain('施工')
      expect(result[0].metadata.tags).toContain('進度')

      // 驗證使用 JSON 查詢
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('JSON_EXISTS'),
        expect.objectContaining({
          tag0: '施工',
          tag1: '進度'
        }),
        {}
      )
    })
  })

  describe('資料映射 (Data Mapping)', () => {
    it('應該正確將 Oracle 行資料映射為照片實體', () => {
      // Arrange
      const oracleRow = {
        id: 'photo001',
        album_id: 'album001',
        file_name: 'test.jpg',
        file_path: '/uploads/test.jpg',
        file_size: 1024000,
        mime_type: 'image/jpeg',
        width: 1920,
        height: 1080,
        uploaded_by: 'user123',
        uploaded_at: new Date(),
        upload_status: 'completed',
        metadata: JSON.stringify({
          exif: { camera: 'Canon' },
          tags: ['test']
        })
      }

      // Act
      const result = repository['mapFromOracle'](oracleRow)

      // Assert
      expect(result).toEqual({
        id: 'photo001',
        albumId: 'album001',
        fileName: 'test.jpg',
        filePath: '/uploads/test.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        uploadedBy: 'user123',
        uploadedAt: expect.any(Date),
        uploadStatus: 'completed',
        metadata: {
          exif: { camera: 'Canon' },
          tags: ['test']
        }
      })
    })

    it('應該正確將照片實體映射為 Oracle 行資料', () => {
      // Arrange
      const photoEntity = {
        albumId: 'album001',
        fileName: 'test.jpg',
        filePath: '/uploads/test.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        uploadedBy: 'user123',
        metadata: {
          tags: ['test']
        }
      }

      // Act
      const result = repository['mapToOracle'](photoEntity)

      // Assert
      expect(result).toEqual({
        album_id: 'album001',
        file_name: 'test.jpg',
        file_path: '/uploads/test.jpg',
        file_size: 1024000,
        mime_type: 'image/jpeg',
        uploaded_by: 'user123',
        metadata: JSON.stringify({ tags: ['test'] })
      })
    })
  })
})