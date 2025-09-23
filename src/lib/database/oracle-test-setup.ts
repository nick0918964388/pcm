/**
 * Oracle Test Setup Utilities
 * 用於端到端測試的資料庫初始化和清理
 */

import { getOracleConnection, OracleConfig } from './oracle-connection'
import { getDefaultOracleConfig } from './oracle-connection'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface TestDatabaseConfig {
  skipInitialization?: boolean
  recreateSchema?: boolean
  loadTestData?: boolean
}

export class OracleTestManager {
  private oracle = getOracleConnection()
  private isInitialized = false

  async initialize(config: TestDatabaseConfig = {}): Promise<void> {
    if (this.isInitialized && !config.recreateSchema) {
      return
    }

    try {
      // 初始化Oracle連線
      const oracleConfig: OracleConfig = {
        ...getDefaultOracleConfig(),
        poolMin: 2,
        poolMax: 5, // 測試環境使用較小的連線池
        poolIncrement: 1,
        poolTimeout: 30
      }

      const initResult = await this.oracle.initialize(oracleConfig)
      if (!initResult.success) {
        throw new Error(`Failed to initialize Oracle connection: ${initResult.error?.message}`)
      }

      // 檢查資料庫連線
      const healthCheck = await this.oracle.healthCheck()
      if (!healthCheck.success || !healthCheck.data?.isHealthy) {
        throw new Error(`Oracle database is not healthy: ${healthCheck.data?.errorDetails}`)
      }

      if (config.recreateSchema) {
        await this.recreateSchema()
      }

      if (config.loadTestData && !this.isInitialized) {
        await this.loadTestData()
      }

      this.isInitialized = true

    } catch (error) {
      throw new Error(`Oracle test setup failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async cleanup(): Promise<void> {
    try {
      // 清理測試資料
      await this.cleanupTestData()

      // 關閉連線池
      await this.oracle.shutdown()
      this.isInitialized = false

    } catch (error) {
      console.error('Oracle test cleanup failed:', error)
    }
  }

  async recreateSchema(): Promise<void> {
    const dropTables = [
      'photos',
      'photo_albums',
      'users',
      'projects'
    ]

    // 刪除現有表格
    for (const table of dropTables) {
      try {
        await this.oracle.executeQuery(`DROP TABLE ${table} CASCADE CONSTRAINTS`)
      } catch (error) {
        // 忽略表格不存在的錯誤
        console.log(`Table ${table} does not exist, skipping drop`)
      }
    }

    // 重新建立Schema
    await this.createTables()
  }

  async createTables(): Promise<void> {
    // 建立專案表
    await this.oracle.executeQuery(`
      CREATE TABLE projects (
        id VARCHAR2(20) PRIMARY KEY,
        name VARCHAR2(255) NOT NULL,
        description CLOB,
        status VARCHAR2(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
        type VARCHAR2(20) DEFAULT 'construction' CHECK (type IN ('construction', 'infrastructure', 'maintenance')),
        priority NUMBER(2) DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        budget NUMBER(15,2),
        progress NUMBER(5,2) DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
        manager_id VARCHAR2(36),
        metadata CLOB CHECK (metadata IS JSON),
        created_at TIMESTAMP DEFAULT SYSTIMESTAMP,
        updated_at TIMESTAMP DEFAULT SYSTIMESTAMP,
        deleted_at TIMESTAMP
      )
    `)

    // 建立使用者表
    await this.oracle.executeQuery(`
      CREATE TABLE users (
        id VARCHAR2(36) PRIMARY KEY,
        username VARCHAR2(100) UNIQUE NOT NULL,
        email VARCHAR2(255) UNIQUE NOT NULL,
        password_hash VARCHAR2(255) NOT NULL,
        role VARCHAR2(20) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'engineer', 'contractor', 'user')),
        first_name VARCHAR2(100),
        last_name VARCHAR2(100),
        created_at TIMESTAMP DEFAULT SYSTIMESTAMP,
        updated_at TIMESTAMP DEFAULT SYSTIMESTAMP,
        deleted_at TIMESTAMP
      )
    `)

    // 建立相簿表
    await this.oracle.executeQuery(`
      CREATE TABLE photo_albums (
        id VARCHAR2(36) PRIMARY KEY,
        project_id VARCHAR2(20) NOT NULL,
        name VARCHAR2(255) NOT NULL,
        description CLOB,
        cover_photo_id VARCHAR2(36),
        photo_count NUMBER(10) DEFAULT 0,
        created_at TIMESTAMP DEFAULT SYSTIMESTAMP,
        updated_at TIMESTAMP DEFAULT SYSTIMESTAMP,
        deleted_at TIMESTAMP,
        created_by VARCHAR2(36),
        CONSTRAINT fk_album_project FOREIGN KEY (project_id) REFERENCES projects(id),
        CONSTRAINT fk_album_creator FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `)

    // 建立更新觸發器
    await this.oracle.executeQuery(`
      CREATE OR REPLACE TRIGGER trg_projects_updated_at
        BEFORE UPDATE ON projects
        FOR EACH ROW
      BEGIN
        :NEW.updated_at := SYSTIMESTAMP;
      END
    `)

    await this.oracle.executeQuery(`
      CREATE OR REPLACE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
      BEGIN
        :NEW.updated_at := SYSTIMESTAMP;
      END
    `)
  }

  async loadTestData(): Promise<void> {
    // 插入測試使用者
    await this.oracle.executeQuery(`
      INSERT INTO users (id, username, email, password_hash, role, first_name, last_name)
      VALUES ('TEST_USER_001', 'test_user_e2e', 'test@pcm.test', 'test_hash', 'manager', 'Test', 'User')
    `)

    console.log('Test data loaded successfully')
  }

  async cleanupTestData(): Promise<void> {
    const cleanupQueries = [
      "DELETE FROM photo_albums WHERE project_id LIKE 'TEST_%'",
      "DELETE FROM projects WHERE id LIKE 'TEST_%'",
      "DELETE FROM users WHERE username LIKE 'test_%'"
    ]

    for (const query of cleanupQueries) {
      try {
        await this.oracle.executeQuery(query)
      } catch (error) {
        console.warn(`Cleanup query failed: ${query}`, error)
      }
    }

    console.log('Test data cleaned up')
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const result = await this.oracle.healthCheck()
      return result.success && result.data?.isHealthy === true
    } catch (error) {
      return false
    }
  }

  async checkContainerStatus(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('docker ps --filter "name=pcm-oracle-dev" --format "{{.Status}}"')
      return stdout.includes('Up')
    } catch (error) {
      return false
    }
  }

  async waitForDatabase(timeoutMs = 30000): Promise<boolean> {
    const startTime = Date.now()
    const pollInterval = 2000

    while (Date.now() - startTime < timeoutMs) {
      if (await this.verifyConnection()) {
        return true
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    return false
  }

  getConnectionStatus() {
    return {
      isInitialized: this.isInitialized,
      poolStatus: this.isInitialized ? this.oracle.getPoolStatus() : null
    }
  }
}

// 導出單例實例
export const oracleTestManager = new OracleTestManager()

// 測試輔助函數
export async function setupOracleForTests(config?: TestDatabaseConfig): Promise<void> {
  await oracleTestManager.initialize(config)
}

export async function cleanupOracleAfterTests(): Promise<void> {
  await oracleTestManager.cleanup()
}

export async function ensureOracleReady(): Promise<void> {
  const containerRunning = await oracleTestManager.checkContainerStatus()
  if (!containerRunning) {
    throw new Error('Oracle container is not running. Please start it with: npm run docker:oracle:start')
  }

  const dbReady = await oracleTestManager.waitForDatabase(30000)
  if (!dbReady) {
    throw new Error('Oracle database is not ready within timeout')
  }
}