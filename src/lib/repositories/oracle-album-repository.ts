/**
 * Oracle相簿倉儲實作
 * Task 2.1: 實作 Oracle 相簿倉儲
 *
 * 擴展現有 OracleBaseRepository 建立 OracleAlbumRepository
 * 整合現有 photo_albums Oracle 表格結構和索引
 * 實作相簿 CRUD 操作，利用 Oracle 觸發器自動維護 photo_count
 * 建立相簿軟刪除機制，使用 deleted_at 欄位保留稽核記錄
 * 實作專案級權限驗證，確保使用者只能存取有權限的專案相簿
 */

import { OracleBaseRepository } from '../database/oracle-base-repository'
import { OracleQueryExecutor } from '../database/oracle-query-executor'
import { OracleQueryOptions } from '../database/oracle-repository-types'
import { Album, CreateAlbumRequest, UpdateAlbumRequest, AccessAction, AlbumDeletionInfo, AlbumAuditLog, SafeDeleteOptions } from './types/album.types'

export class OracleAlbumRepository extends OracleBaseRepository<Album> {
  constructor(queryExecutor?: OracleQueryExecutor) {
    super('photo_albums', queryExecutor, {
      primaryKey: 'id',
      enableSoftDelete: true,
      softDeleteColumn: 'deleted_at',
      enableAuditColumns: true,
      auditColumns: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    })
  }

  /**
   * 映射 Oracle 行資料為相簿實體
   */
  protected mapFromOracle(row: any): Album {
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      description: row.description,
      photoCount: row.photo_count || 0,
      coverPhotoId: row.cover_photo_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      createdBy: row.created_by
    }
  }

  /**
   * 映射相簿實體為 Oracle 行資料
   */
  protected mapToOracle(entity: Partial<Album>): Record<string, any> {
    const row: Record<string, any> = {}

    if (entity.projectId !== undefined) row.project_id = entity.projectId
    if (entity.name !== undefined) row.name = entity.name
    if (entity.description !== undefined) row.description = entity.description
    if (entity.photoCount !== undefined) row.photo_count = entity.photoCount
    if (entity.coverPhotoId !== undefined) row.cover_photo_id = entity.coverPhotoId
    if (entity.createdBy !== undefined) row.created_by = entity.createdBy

    return row
  }

  /**
   * 建立新相簿
   * Requirements: 1.1, 1.2, 1.3
   */
  async createAlbum(request: CreateAlbumRequest, options: OracleQueryOptions = {}): Promise<Album> {
    try {
      // 使用基類的 create 方法
      return await this.create(request, options)
    } catch (error: any) {
      // 處理唯一約束違反錯誤
      if (error.message?.includes('ORA-00001') || error.message?.includes('unique constraint')) {
        throw new Error('相簿名稱已存在於此專案中')
      }
      throw error
    }
  }

  /**
   * 取得專案的所有相簿
   * Requirements: 1.1
   */
  async getProjectAlbums(projectId: string, userId: string, options: OracleQueryOptions = {}): Promise<Album[]> {
    // 使用 active_photo_albums 檢視表查詢，並檢查使用者權限
    const sql = `
      SELECT apa.*
      FROM active_photo_albums apa
      JOIN user_projects up ON apa.project_id = up.project_id
      WHERE apa.project_id = :projectId
        AND up.user_id = :userId
      ORDER BY apa.updated_at DESC
    `

    const binds = { projectId, userId }
    const result = await this.executeRaw(sql, binds, options)

    return result.rows ? result.rows.map(row => this.mapFromOracle(row)) : []
  }

  /**
   * 驗證相簿存取權限
   * Requirements: 1.1, 1.4
   */
  async validateAlbumAccess(albumId: string, userId: string, action: AccessAction, options: OracleQueryOptions = {}): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count
      FROM photo_albums pa
      JOIN user_projects up ON pa.project_id = up.project_id
      WHERE pa.id = :albumId
        AND up.user_id = :userId
        AND pa.deleted_at IS NULL
    `

    const binds = { albumId, userId }
    const result = await this.executeRaw(sql, binds, options)

    return (result.rows?.[0]?.count || 0) > 0
  }

  /**
   * 更新相簿資訊
   * Requirements: 1.4
   */
  async updateAlbum(albumId: string, updates: UpdateAlbumRequest, options: OracleQueryOptions = {}): Promise<Album> {
    return await this.update(albumId, updates, options)
  }

  /**
   * 軟刪除相簿（需檢查是否包含照片）
   * Requirements: 1.5, 1.6
   */
  async deleteAlbum(albumId: string, userId: string, options: OracleQueryOptions = {}): Promise<boolean> {
    // 首先檢查相簿是否包含照片
    const checkSql = `
      SELECT photo_count
      FROM photo_albums
      WHERE id = :albumId AND deleted_at IS NULL
    `

    const checkResult = await this.executeRaw(checkSql, { albumId }, options)

    if (!checkResult.rows || checkResult.rows.length === 0) {
      throw new Error('相簿不存在或已被刪除')
    }

    const photoCount = checkResult.rows[0].photo_count || 0

    if (photoCount > 0) {
      throw new Error('無法刪除包含照片的相簿，請先刪除相簿內的所有照片')
    }

    // 執行軟刪除
    return await this.softDelete(albumId, options)
  }

  /**
   * 取得相簿詳細資訊（包含權限檢查）
   * Requirements: 1.1
   */
  async getAlbumById(albumId: string, userId: string, options: OracleQueryOptions = {}): Promise<Album | null> {
    // 檢查權限
    const hasAccess = await this.validateAlbumAccess(albumId, userId, 'read', options)
    if (!hasAccess) {
      return null
    }

    return await this.findById(albumId, options)
  }

  /**
   * 搜尋相簿（按名稱或描述）
   * Requirements: 1.1
   */
  async searchAlbums(projectId: string, userId: string, searchTerm: string, options: OracleQueryOptions = {}): Promise<Album[]> {
    const sql = `
      SELECT apa.*
      FROM active_photo_albums apa
      JOIN user_projects up ON apa.project_id = up.project_id
      WHERE apa.project_id = :projectId
        AND up.user_id = :userId
        AND (UPPER(apa.name) LIKE UPPER(:searchTerm) OR UPPER(apa.description) LIKE UPPER(:searchTerm))
      ORDER BY apa.updated_at DESC
    `

    const binds = {
      projectId,
      userId,
      searchTerm: `%${searchTerm}%`
    }

    const result = await this.executeRaw(sql, binds, options)
    return result.rows ? result.rows.map(row => this.mapFromOracle(row)) : []
  }

  /**
   * 取得相簿統計資訊
   * Requirements: 1.1
   */
  async getAlbumStats(albumId: string, options: OracleQueryOptions = {}): Promise<{
    photoCount: number
    totalSize: number
    lastUpload?: Date
  }> {
    const sql = `
      SELECT
        pa.photo_count,
        COALESCE(SUM(p.file_size), 0) as total_size,
        MAX(p.uploaded_at) as last_upload
      FROM photo_albums pa
      LEFT JOIN photos p ON pa.id = p.album_id AND p.deleted_at IS NULL
      WHERE pa.id = :albumId AND pa.deleted_at IS NULL
      GROUP BY pa.photo_count
    `

    const binds = { albumId }
    const result = await this.executeRaw(sql, binds, options)

    if (!result.rows || result.rows.length === 0) {
      return { photoCount: 0, totalSize: 0 }
    }

    const row = result.rows[0]
    return {
      photoCount: row.photo_count || 0,
      totalSize: row.total_size || 0,
      lastUpload: row.last_upload ? new Date(row.last_upload) : undefined
    }
  }

  // ============================================
  // 安全刪除機制功能 (Task 2.2)
  // ============================================

  /**
   * 取得相簿刪除前的資訊供確認
   * Requirements: 1.6
   */
  async getAlbumDeletionInfo(albumId: string, options: OracleQueryOptions = {}): Promise<AlbumDeletionInfo | null> {
    const sql = `
      SELECT
        pa.*
      FROM photo_albums pa
      WHERE pa.id = :albumId AND pa.deleted_at IS NULL
    `

    const binds = { albumId }
    const result = await this.executeRaw(sql, binds, options)

    if (!result.rows || result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    const photoCount = row.photo_count || 0
    const canDelete = photoCount === 0

    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      photoCount,
      createdAt: new Date(row.created_at),
      createdBy: row.created_by,
      canDelete,
      warningMessage: canDelete ? undefined : `此相簿包含 ${photoCount} 張照片，刪除後無法復原`
    }
  }

  /**
   * 強制刪除相簿（包含所有關聯照片）
   * Requirements: 1.6
   */
  async deleteAlbumWithForce(albumId: string, userId: string, force: boolean = false, options: OracleQueryOptions = {}): Promise<boolean> {
    if (!force) {
      // 如果不是強制刪除，使用原有的刪除邏輯
      return await this.deleteAlbum(albumId, userId, options)
    }

    // 檢查相簿是否存在
    const checkSql = `
      SELECT photo_count, project_id, name
      FROM photo_albums
      WHERE id = :albumId AND deleted_at IS NULL
    `

    const checkResult = await this.executeRaw(checkSql, { albumId }, options)

    if (!checkResult.rows || checkResult.rows.length === 0) {
      throw new Error('相簿不存在或已被刪除')
    }

    const albumInfo = checkResult.rows[0]

    // 如果相簿包含照片，先軟刪除所有關聯照片
    if (albumInfo.photo_count > 0) {
      const deletePhotosSql = `
        UPDATE photos
        SET deleted_at = SYSDATE, updated_at = SYSDATE
        WHERE album_id = :albumId AND deleted_at IS NULL
      `

      await this.executeRaw(deletePhotosSql, { albumId }, options)
    }

    // 軟刪除相簿
    return await this.softDelete(albumId, options)
  }

  /**
   * 帶稽核日誌的刪除相簿功能
   * Requirements: 1.6
   */
  async deleteAlbumWithAudit(albumId: string, userId: string, reason?: string, options: OracleQueryOptions = {}): Promise<boolean> {
    // 先執行刪除操作
    const result = await this.deleteAlbum(albumId, userId, options)

    if (result) {
      // 記錄稽核日誌
      await this.createAuditLog({
        albumId,
        userId,
        action: 'DELETE',
        reason
      }, options)
    }

    return result
  }

  /**
   * 檢查刪除權限的刪除功能
   * Requirements: 1.6
   */
  async deleteAlbumWithPermissionCheck(albumId: string, userId: string, options: OracleQueryOptions = {}): Promise<boolean> {
    // 檢查使用者是否有管理權限
    const hasPermission = await this.validateAlbumAccess(albumId, userId, 'delete', options)

    if (!hasPermission) {
      throw new Error('使用者沒有刪除此相簿的權限')
    }

    return await this.deleteAlbum(albumId, userId, options)
  }

  /**
   * 創建稽核日誌記錄
   * Requirements: 1.6
   */
  async createAuditLog(auditData: Omit<AlbumAuditLog, 'id' | 'createdAt'>, options: OracleQueryOptions = {}): Promise<void> {
    const sql = `
      INSERT INTO album_audit_logs (
        id, album_id, user_id, action, reason, created_at, metadata
      ) VALUES (
        SYS_GUID(), :album_id, :user_id, :action, :reason, SYSDATE, :metadata
      )
    `

    const binds = {
      album_id: auditData.albumId,
      user_id: auditData.userId,
      action: auditData.action,
      reason: auditData.reason || null,
      metadata: auditData.metadata ? JSON.stringify(auditData.metadata) : null
    }

    await this.executeRaw(sql, binds, options)
  }

  /**
   * 取得相簿的稽核日誌
   * Requirements: 1.6
   */
  async getAlbumAuditLogs(albumId: string, options: OracleQueryOptions = {}): Promise<AlbumAuditLog[]> {
    const sql = `
      SELECT
        id, album_id, user_id, action, reason, created_at, metadata
      FROM album_audit_logs
      WHERE album_id = :albumId
      ORDER BY created_at DESC
    `

    const binds = { albumId }
    const result = await this.executeRaw(sql, binds, options)

    return result.rows ? result.rows.map(row => ({
      id: row.id,
      albumId: row.album_id,
      userId: row.user_id,
      action: row.action,
      reason: row.reason,
      createdAt: new Date(row.created_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    })) : []
  }

  /**
   * 安全刪除相簿（包含所有安全檢查和選項）
   * Requirements: 1.6
   */
  async safeDeleteAlbum(albumId: string, userId: string, options: SafeDeleteOptions = {}, queryOptions: OracleQueryOptions = {}): Promise<boolean> {
    const {
      force = false,
      reason,
      skipDirectoryCleanup = false,
      skipAuditLog = false
    } = options

    // 1. 檢查權限
    const hasPermission = await this.validateAlbumAccess(albumId, userId, 'delete', queryOptions)
    if (!hasPermission) {
      throw new Error('使用者沒有刪除此相簿的權限')
    }

    // 2. 取得刪除資訊
    const deletionInfo = await this.getAlbumDeletionInfo(albumId, queryOptions)
    if (!deletionInfo) {
      throw new Error('相簿不存在或已被刪除')
    }

    // 3. 檢查是否可以刪除
    if (!deletionInfo.canDelete && !force) {
      throw new Error(deletionInfo.warningMessage || '無法刪除包含照片的相簿')
    }

    let result: boolean

    // 4. 執行刪除操作
    if (force && deletionInfo.photoCount > 0) {
      result = await this.deleteAlbumWithForce(albumId, userId, true, queryOptions)
    } else {
      result = await this.deleteAlbum(albumId, userId, queryOptions)
    }

    // 5. 記錄稽核日誌
    if (result && !skipAuditLog) {
      await this.createAuditLog({
        albumId,
        userId,
        action: 'DELETE',
        reason: reason || (force ? '強制刪除包含照片的相簿' : '刪除空相簿'),
        metadata: {
          photoCount: deletionInfo.photoCount,
          force,
          skipDirectoryCleanup
        }
      }, queryOptions)
    }

    // 6. 清理本地目錄（這裡預留接口，實際實作會在本地檔案服務中）
    if (result && !skipDirectoryCleanup) {
      // TODO: 實作本地目錄清理功能
      // await this.cleanupAlbumDirectory(deletionInfo.projectId, deletionInfo.name)
    }

    return result
  }
}