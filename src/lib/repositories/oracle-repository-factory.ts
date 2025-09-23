/**
 * Oracle Repository工廠
 *
 * REFACTOR階段：統一Repository實例管理
 */

import { OracleProjectRepository } from './oracle-project-repository'
import { OracleAlbumRepository } from './oracle-album-repository'
import { OraclePhotoRepository } from './oracle-photo-repository'
import { getOracleConnection } from '../database/oracle-connection'

export class OracleRepositoryFactory {
  private static instances = new Map<string, any>()

  /**
   * 獲取Project Repository實例（單例模式）
   */
  static getProjectRepository(): OracleProjectRepository {
    const key = 'project'

    if (!this.instances.has(key)) {
      this.instances.set(key, new OracleProjectRepository())
    }

    return this.instances.get(key)
  }

  /**
   * 獲取Album Repository實例（單例模式）
   */
  static getAlbumRepository(): OracleAlbumRepository {
    const key = 'album'

    if (!this.instances.has(key)) {
      this.instances.set(key, new OracleAlbumRepository())
    }

    return this.instances.get(key)
  }

  /**
   * 獲取Photo Repository實例（單例模式）
   */
  static getPhotoRepository(): OraclePhotoRepository {
    const key = 'photo'

    if (!this.instances.has(key)) {
      this.instances.set(key, new OraclePhotoRepository())
    }

    return this.instances.get(key)
  }

  /**
   * 清除所有Repository實例（主要用於測試）
   */
  static clearInstances(): void {
    this.instances.clear()
  }

  /**
   * 檢查Oracle連線狀態
   */
  static async checkConnection(): Promise<boolean> {
    try {
      const connection = getOracleConnection()
      const healthResult = await connection.healthCheck()
      return healthResult.success && healthResult.data?.isHealthy === true
    } catch (error) {
      console.error('Oracle連線檢查失敗:', error)
      return false
    }
  }

  /**
   * 初始化所有Repository（可選的預載功能）
   */
  static async initializeAll(): Promise<void> {
    // 預載Project Repository
    this.getProjectRepository()

    // 預載Album Repository
    this.getAlbumRepository()

    // 預載Photo Repository
    this.getPhotoRepository()

    // 檢查連線狀態
    const isConnected = await this.checkConnection()
    if (!isConnected) {
      console.warn('Oracle資料庫連線不可用，Repository可能無法正常運作')
    }
  }

  /**
   * 獲取Repository狀態資訊
   */
  static getStatus(): {
    activeRepositories: string[]
    totalInstances: number
    isHealthy: boolean
  } {
    return {
      activeRepositories: Array.from(this.instances.keys()),
      totalInstances: this.instances.size,
      isHealthy: this.instances.size > 0
    }
  }
}