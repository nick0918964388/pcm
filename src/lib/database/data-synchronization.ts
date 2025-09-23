import oracledb from 'oracledb'
import { Pool } from 'pg'

// Types for data synchronization
type SyncDirection = 'postgresql-to-oracle' | 'oracle-to-postgresql' | 'bidirectional'
type ConflictResolution = 'latest_wins' | 'postgresql_wins' | 'oracle_wins' | 'manual' | 'custom_rule'
type ConflictType = 'insert_insert' | 'update_update' | 'update_delete' | 'delete_update'
type SyncInterval = 'manual' | 'real-time' | 'hourly' | 'daily' | 'weekly'

interface SyncResult {
  success: boolean
  recordsSynchronized: number
  conflicts: DataConflict[]
  error?: string
  lastSyncTime: Date
  duration: number
}

interface DataConflict {
  recordId: string
  conflictType: ConflictType
  postgresqlData: any
  oracleData: any
  resolution: ConflictResolution
  resolvedAt?: Date
  resolvedBy?: string
}

interface ConsistencyResult {
  tableName: string
  isConsistent: boolean
  postgresqlCount: number
  oracleCount: number
  discrepancies: Array<{
    type: 'missing_in_oracle' | 'missing_in_postgresql' | 'data_mismatch'
    recordId: string
    details?: any
  }>
  checkedAt: Date
}

interface ValidationReport {
  tableResults: ConsistencyResult[]
  overallConsistency: boolean
  checkedAt: Date
  summary: {
    totalTables: number
    consistentTables: number
    inconsistentTables: number
    totalDiscrepancies: number
  }
  recommendations: string[]
}

interface ConflictResolutionResult {
  success: boolean
  resolvedData: any
  chosenSource: 'postgresql' | 'oracle' | 'merged'
  requiresManualIntervention: boolean
  error?: string
}

interface ScheduleConfig {
  scheduleId?: string
  tables: string[]
  interval: SyncInterval
  direction: SyncDirection
  conflictResolution: ConflictResolution
  enabled: boolean
}

interface ScheduleResult {
  success: boolean
  scheduleId: string
  nextRunTime: Date
  error?: string
}

interface ScheduledSyncResult {
  success: boolean
  scheduleId: string
  executedAt: Date
  syncResults: SyncResult[]
  error?: string
}

interface MissingRecordsResult {
  tableName: string
  missingInOracle: string[]
  missingInPostgresql: string[]
  checkedAt: Date
}

interface RecordComparison {
  isIdentical: boolean
  differences: Array<{
    field: string
    postgresqlValue: any
    oracleValue: any
  }>
}

interface SchemaComparison {
  tableName: string
  isCompatible: boolean
  differences: Array<{
    column: string
    postgresqlType: string
    oracleType: string
    isCompatible: boolean
  }>
}

interface ComparisonReport {
  generatedAt: Date
  tablesCompared: string[]
  summary: {
    totalTables: number
    compatibleTables: number
    incompatibleTables: number
    totalIssues: number
  }
  recommendations: string[]
  tableReports: Array<{
    tableName: string
    schemaCompatibility: SchemaComparison
    dataConsistency: ConsistencyResult
  }>
}

/**
 * 資料同步器
 * 負責PostgreSQL和Oracle之間的資料同步
 */
export class DataSynchronizer {
  private pgPool: Pool
  private oracleConfig: any

  constructor() {
    this.pgPool = new Pool({
      host: process.env.DB_HOST || '192.168.1.183',
      database: process.env.DB_DATABASE || 'app_db',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'XcW04ByX6GbVdt1gw4EJ5XRY',
      port: parseInt(process.env.DB_PORT || '30432')
    })

    this.oracleConfig = {
      user: process.env.ORACLE_USER || 'pcm_user',
      password: process.env.ORACLE_PASSWORD || 'pcm_pass123',
      connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XE'
    }
  }

  /**
   * 同步表格資料
   */
  async synchronizeTable(tableName: string, direction: SyncDirection): Promise<SyncResult> {
    const startTime = Date.now()

    try {
      let recordsSynchronized = 0
      const conflicts: DataConflict[] = []

      if (direction === 'postgresql-to-oracle' || direction === 'bidirectional') {
        const pgToOracleResult = await this.syncFromPostgresToOracle(tableName)
        recordsSynchronized += pgToOracleResult.recordsSynchronized
        conflicts.push(...pgToOracleResult.conflicts)
      }

      if (direction === 'oracle-to-postgresql' || direction === 'bidirectional') {
        const oracleToPgResult = await this.syncFromOracleToPostgres(tableName)
        recordsSynchronized += oracleToPgResult.recordsSynchronized
        conflicts.push(...oracleToPgResult.conflicts)
      }

      return {
        success: true,
        recordsSynchronized,
        conflicts,
        lastSyncTime: new Date(),
        duration: Date.now() - startTime
      }

    } catch (error) {
      return {
        success: false,
        recordsSynchronized: 0,
        conflicts: [],
        error: error instanceof Error ? error.message : String(error),
        lastSyncTime: new Date(),
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * 增量同步
   */
  async incrementalSync(tableName: string, lastSyncTime: Date): Promise<SyncResult> {
    const startTime = Date.now()

    try {
      // 獲取PostgreSQL中的變更
      const pgChanges = await this.getChangesFromPostgres(tableName, lastSyncTime)

      // 獲取Oracle中的變更
      const oracleChanges = await this.getChangesFromOracle(tableName, lastSyncTime)

      // 同步變更
      const conflicts: DataConflict[] = []
      let recordsSynchronized = 0

      // 處理PostgreSQL變更
      for (const change of pgChanges) {
        const syncResult = await this.applyChangesToOracle(change)
        if (syncResult.conflict) {
          conflicts.push(syncResult.conflict)
        } else {
          recordsSynchronized++
        }
      }

      // 處理Oracle變更
      for (const change of oracleChanges) {
        const syncResult = await this.applyChangesToPostgres(change)
        if (syncResult.conflict) {
          conflicts.push(syncResult.conflict)
        } else {
          recordsSynchronized++
        }
      }

      return {
        success: true,
        recordsSynchronized,
        conflicts,
        lastSyncTime: new Date(),
        duration: Date.now() - startTime
      }

    } catch (error) {
      return {
        success: false,
        recordsSynchronized: 0,
        conflicts: [],
        error: error instanceof Error ? error.message : String(error),
        lastSyncTime: new Date(),
        duration: Date.now() - startTime
      }
    }
  }

  private async syncFromPostgresToOracle(tableName: string): Promise<{ recordsSynchronized: number, conflicts: DataConflict[] }> {
    let oracleConnection: oracledb.Connection | undefined

    try {
      // 獲取PostgreSQL資料
      const pgResult = await this.pgPool.query(`SELECT * FROM ${tableName}`)

      // 連接Oracle
      oracleConnection = await oracledb.getConnection(this.oracleConfig)

      let recordsSynchronized = 0
      const conflicts: DataConflict[] = []

      for (const record of pgResult.rows) {
        try {
          // 檢查Oracle中是否存在該記錄
          const existsResult = await oracleConnection.execute(
            `SELECT COUNT(*) as count FROM ${tableName} WHERE id = :id`,
            { id: record.id }
          )

          const exists = (existsResult.rows?.[0] as any[])?.[0] > 0

          if (exists) {
            // 更新記錄
            await this.updateOracleRecord(oracleConnection, tableName, record)
          } else {
            // 插入新記錄
            await this.insertOracleRecord(oracleConnection, tableName, record)
          }

          recordsSynchronized++

        } catch (error) {
          console.warn(`Failed to sync record ${record.id}:`, error)
        }
      }

      await oracleConnection.commit()
      return { recordsSynchronized, conflicts }

    } catch (error) {
      if (oracleConnection) {
        await oracleConnection.rollback()
      }
      throw error
    } finally {
      if (oracleConnection) {
        await oracleConnection.close()
      }
    }
  }

  private async syncFromOracleToPostgres(tableName: string): Promise<{ recordsSynchronized: number, conflicts: DataConflict[] }> {
    let oracleConnection: oracledb.Connection | undefined

    try {
      oracleConnection = await oracledb.getConnection(this.oracleConfig)

      // 獲取Oracle資料
      const oracleResult = await oracleConnection.execute(`SELECT * FROM ${tableName}`)

      let recordsSynchronized = 0
      const conflicts: DataConflict[] = []

      if (oracleResult.rows) {
        for (const row of oracleResult.rows) {
          const record = this.mapOracleRowToObject(row as any[], tableName)

          try {
            // 檢查PostgreSQL中是否存在該記錄
            const existsResult = await this.pgPool.query(
              `SELECT COUNT(*) as count FROM ${tableName} WHERE id = $1`,
              [record.id]
            )

            const exists = parseInt(existsResult.rows[0].count) > 0

            if (exists) {
              // 更新記錄
              await this.updatePostgresRecord(tableName, record)
            } else {
              // 插入新記錄
              await this.insertPostgresRecord(tableName, record)
            }

            recordsSynchronized++

          } catch (error) {
            console.warn(`Failed to sync record ${record.id}:`, error)
          }
        }
      }

      return { recordsSynchronized, conflicts }

    } finally {
      if (oracleConnection) {
        await oracleConnection.close()
      }
    }
  }

  private async getChangesFromPostgres(tableName: string, since: Date): Promise<any[]> {
    const result = await this.pgPool.query(
      `SELECT * FROM ${tableName} WHERE updated_at > $1`,
      [since]
    )
    return result.rows
  }

  private async getChangesFromOracle(tableName: string, since: Date): Promise<any[]> {
    let oracleConnection: oracledb.Connection | undefined

    try {
      oracleConnection = await oracledb.getConnection(this.oracleConfig)
      const result = await oracleConnection.execute(
        `SELECT * FROM ${tableName} WHERE updated_at > :since`,
        { since }
      )

      return result.rows?.map(row => this.mapOracleRowToObject(row as any[], tableName)) || []

    } finally {
      if (oracleConnection) {
        await oracleConnection.close()
      }
    }
  }

  private async applyChangesToOracle(change: any): Promise<{ conflict?: DataConflict }> {
    let oracleConnection: oracledb.Connection | undefined

    try {
      oracleConnection = await oracledb.getConnection(this.oracleConfig)

      // 檢查Oracle中是否存在該記錄
      const existsResult = await oracleConnection.execute(
        `SELECT COUNT(*) as count FROM ${change.tableName} WHERE id = :id`,
        { id: change.id }
      )

      const exists = (existsResult.rows?.[0] as any[])?.[0] > 0

      if (exists) {
        // 檢查是否有衝突（Oracle記錄是否較新）
        const oracleRecord = await oracleConnection.execute(
          `SELECT * FROM ${change.tableName} WHERE id = :id`,
          { id: change.id }
        )

        if (oracleRecord.rows && oracleRecord.rows.length > 0) {
          const oracleData = this.mapOracleRowToObject(oracleRecord.rows[0] as any[], change.tableName)
          const oracleUpdatedAt = new Date(oracleData.updated_at || oracleData.created_at)
          const pgUpdatedAt = new Date(change.updated_at || change.created_at)

          if (oracleUpdatedAt > pgUpdatedAt) {
            // 發生衝突，Oracle記錄較新
            return {
              conflict: {
                recordId: change.id,
                conflictType: 'update_update',
                postgresqlData: change,
                oracleData,
                resolution: 'latest_wins'
              }
            }
          }
        }

        // 更新Oracle記錄
        await this.updateOracleRecord(oracleConnection, change.tableName, change)
      } else {
        // 插入新記錄到Oracle
        await this.insertOracleRecord(oracleConnection, change.tableName, change)
      }

      await oracleConnection.commit()
      return {}

    } catch (error) {
      if (oracleConnection) {
        await oracleConnection.rollback()
      }
      throw error
    } finally {
      if (oracleConnection) {
        await oracleConnection.close()
      }
    }
  }

  private async applyChangesToPostgres(change: any): Promise<{ conflict?: DataConflict }> {
    try {
      // 檢查PostgreSQL中是否存在該記錄
      const existsResult = await this.pgPool.query(
        `SELECT COUNT(*) as count FROM ${change.tableName} WHERE id = $1`,
        [change.id]
      )

      const exists = parseInt(existsResult.rows[0].count) > 0

      if (exists) {
        // 檢查是否有衝突（PostgreSQL記錄是否較新）
        const pgRecord = await this.pgPool.query(
          `SELECT * FROM ${change.tableName} WHERE id = $1`,
          [change.id]
        )

        if (pgRecord.rows.length > 0) {
          const pgData = pgRecord.rows[0]
          const pgUpdatedAt = new Date(pgData.updated_at || pgData.created_at)
          const oracleUpdatedAt = new Date(change.updated_at || change.created_at)

          if (pgUpdatedAt > oracleUpdatedAt) {
            // 發生衝突，PostgreSQL記錄較新
            return {
              conflict: {
                recordId: change.id,
                conflictType: 'update_update',
                postgresqlData: pgData,
                oracleData: change,
                resolution: 'latest_wins'
              }
            }
          }
        }

        // 更新PostgreSQL記錄
        await this.updatePostgresRecord(change.tableName, change)
      } else {
        // 插入新記錄到PostgreSQL
        await this.insertPostgresRecord(change.tableName, change)
      }

      return {}

    } catch (error) {
      throw error
    }
  }

  private async updateOracleRecord(connection: oracledb.Connection, tableName: string, record: any): Promise<void> {
    // 構建動態UPDATE語句
    const fields = Object.keys(record).filter(key => key !== 'id')
    const setClause = fields.map(field => `${field} = :${field}`).join(', ')
    const sql = `UPDATE ${tableName} SET ${setClause} WHERE id = :id`

    // 準備參數
    const params = { ...record }

    await connection.execute(sql, params)
  }

  private async insertOracleRecord(connection: oracledb.Connection, tableName: string, record: any): Promise<void> {
    // 構建動態INSERT語句
    const fields = Object.keys(record)
    const values = fields.map(field => `:${field}`).join(', ')
    const sql = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${values})`

    // 準備參數，處理資料類型轉換
    const params: any = {}
    for (const [key, value] of Object.entries(record)) {
      if (value instanceof Date) {
        params[key] = value
      } else if (typeof value === 'boolean') {
        params[key] = value ? 1 : 0
      } else if (typeof value === 'object' && value !== null) {
        params[key] = JSON.stringify(value)
      } else {
        params[key] = value
      }
    }

    await connection.execute(sql, params)
  }

  private async updatePostgresRecord(tableName: string, record: any): Promise<void> {
    // 構建動態UPDATE語句
    const fields = Object.keys(record).filter(key => key !== 'id')
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ')
    const sql = `UPDATE ${tableName} SET ${setClause} WHERE id = $1`

    // 準備參數
    const params = [record.id, ...fields.map(field => record[field])]

    await this.pgPool.query(sql, params)
  }

  private async insertPostgresRecord(tableName: string, record: any): Promise<void> {
    // 構建動態INSERT語句
    const fields = Object.keys(record)
    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ')
    const sql = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`

    // 準備參數，處理資料類型轉換
    const params = fields.map(field => {
      const value = record[field]
      if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        return JSON.stringify(value)
      }
      return value
    })

    await this.pgPool.query(sql, params)
  }

  private mapOracleRowToObject(row: any[], tableName: string): any {
    // 根據表格名稱定義欄位映射
    const columnMappings: Record<string, string[]> = {
      projects: ['id', 'name', 'description', 'status', 'created_at', 'updated_at', 'user_id'],
      users: ['id', 'email', 'name', 'password_hash', 'created_at', 'updated_at'],
      photo_albums: ['id', 'name', 'description', 'cover_photo_id', 'project_id', 'created_at', 'updated_at'],
      photos: ['id', 'filename', 'original_name', 'file_size', 'mime_type', 'album_id', 'created_at', 'updated_at']
    }

    const columns = columnMappings[tableName] || ['id']
    const result: any = {}

    columns.forEach((column, index) => {
      if (index < row.length) {
        let value = row[index]

        // 處理Oracle特殊資料類型
        if (value instanceof Date) {
          result[column] = value
        } else if (typeof value === 'string' && (column.includes('_at') || column === 'created' || column === 'updated')) {
          result[column] = new Date(value)
        } else if (column === 'status' && typeof value === 'number') {
          result[column] = value === 1
        } else {
          result[column] = value
        }
      }
    })

    return result
  }
}

/**
 * 一致性檢查器
 * 負責檢查PostgreSQL和Oracle之間的資料一致性
 */
export class ConsistencyChecker {
  private pgPool: Pool
  private oracleConfig: any

  constructor() {
    this.pgPool = new Pool({
      host: process.env.DB_HOST || '192.168.1.183',
      database: process.env.DB_DATABASE || 'app_db',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'XcW04ByX6GbVdt1gw4EJ5XRY',
      port: parseInt(process.env.DB_PORT || '30432')
    })

    this.oracleConfig = {
      user: process.env.ORACLE_USER || 'pcm_user',
      password: process.env.ORACLE_PASSWORD || 'pcm_pass123',
      connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XE'
    }
  }

  /**
   * 檢查表格一致性
   */
  async checkTableConsistency(tableName: string): Promise<ConsistencyResult> {
    let oracleConnection: oracledb.Connection | undefined

    try {
      // 獲取PostgreSQL記錄數
      const pgCountResult = await this.pgPool.query(`SELECT COUNT(*) as count FROM ${tableName}`)
      const postgresqlCount = parseInt(pgCountResult.rows[0].count)

      // 獲取Oracle記錄數
      oracleConnection = await oracledb.getConnection(this.oracleConfig)
      const oracleCountResult = await oracleConnection.execute(`SELECT COUNT(*) FROM ${tableName}`)
      const oracleCount = (oracleCountResult.rows?.[0] as any[])?.[0] || 0

      const isConsistent = postgresqlCount === oracleCount
      const discrepancies = []

      // 如果計數不一致，找出差異
      if (!isConsistent) {
        const missingRecords = await this.findMissingRecords(tableName)

        missingRecords.missingInOracle.forEach(id => {
          discrepancies.push({
            type: 'missing_in_oracle' as const,
            recordId: id
          })
        })

        missingRecords.missingInPostgresql.forEach(id => {
          discrepancies.push({
            type: 'missing_in_postgresql' as const,
            recordId: id
          })
        })
      }

      return {
        tableName,
        isConsistent,
        postgresqlCount,
        oracleCount,
        discrepancies,
        checkedAt: new Date()
      }

    } finally {
      if (oracleConnection) {
        await oracleConnection.close()
      }
    }
  }

  /**
   * 驗證所有表格
   */
  async validateAllTables(): Promise<ValidationReport> {
    const tables = ['projects', 'users', 'photo_albums', 'photos'] // 主要表格列表
    const tableResults: ConsistencyResult[] = []

    for (const tableName of tables) {
      try {
        const result = await this.checkTableConsistency(tableName)
        tableResults.push(result)
      } catch (error) {
        console.error(`Failed to check table ${tableName}:`, error)
      }
    }

    const consistentTables = tableResults.filter(r => r.isConsistent).length
    const inconsistentTables = tableResults.length - consistentTables
    const totalDiscrepancies = tableResults.reduce((sum, r) => sum + r.discrepancies.length, 0)

    const recommendations = []
    if (inconsistentTables > 0) {
      recommendations.push('執行資料同步以解決不一致問題')
      recommendations.push('檢查資料遷移腳本的完整性')
    }
    if (totalDiscrepancies > 10) {
      recommendations.push('考慮重新執行完整的資料遷移')
    }

    return {
      tableResults,
      overallConsistency: inconsistentTables === 0,
      checkedAt: new Date(),
      summary: {
        totalTables: tableResults.length,
        consistentTables,
        inconsistentTables,
        totalDiscrepancies
      },
      recommendations
    }
  }

  /**
   * 找出缺失的記錄
   */
  async findMissingRecords(tableName: string): Promise<MissingRecordsResult> {
    let oracleConnection: oracledb.Connection | undefined

    try {
      // 獲取PostgreSQL的所有ID
      const pgIdsResult = await this.pgPool.query(`SELECT id FROM ${tableName}`)
      const pgIds = pgIdsResult.rows.map(row => row.id)

      // 獲取Oracle的所有ID
      oracleConnection = await oracledb.getConnection(this.oracleConfig)
      const oracleIdsResult = await oracleConnection.execute(`SELECT id FROM ${tableName}`)
      const oracleIds = (oracleIdsResult.rows || []).map(row => (row as any[])[0])

      // 找出差異
      const missingInOracle = pgIds.filter(id => !oracleIds.includes(id))
      const missingInPostgresql = oracleIds.filter(id => !pgIds.includes(id))

      return {
        tableName,
        missingInOracle,
        missingInPostgresql,
        checkedAt: new Date()
      }

    } finally {
      if (oracleConnection) {
        await oracleConnection.close()
      }
    }
  }
}

/**
 * 衝突解決器
 * 負責處理資料同步過程中的衝突
 */
export class ConflictResolver {
  /**
   * 解決衝突
   */
  async resolveConflict(
    conflict: DataConflict,
    customRule?: (pgData: any, oracleData: any) => any
  ): Promise<ConflictResolutionResult> {
    try {
      switch (conflict.resolution) {
        case 'latest_wins':
          return this.resolveByTimestamp(conflict)
        case 'postgresql_wins':
          return this.resolveBySource(conflict, 'postgresql')
        case 'oracle_wins':
          return this.resolveBySource(conflict, 'oracle')
        case 'custom_rule':
          if (customRule) {
            return this.resolveByCustomRule(conflict, customRule)
          }
          throw new Error('Custom rule not provided')
        case 'manual':
          return {
            success: false,
            resolvedData: null,
            chosenSource: 'postgresql',
            requiresManualIntervention: true
          }
        default:
          throw new Error(`Unknown resolution strategy: ${conflict.resolution}`)
      }
    } catch (error) {
      return {
        success: false,
        resolvedData: null,
        chosenSource: 'postgresql',
        requiresManualIntervention: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private resolveByTimestamp(conflict: DataConflict): ConflictResolutionResult {
    const pgTimestamp = new Date(conflict.postgresqlData.updated_at || conflict.postgresqlData.created_at)
    const oracleTimestamp = new Date(conflict.oracleData.updated_at || conflict.oracleData.created_at)

    const chosenSource = oracleTimestamp > pgTimestamp ? 'oracle' : 'postgresql'
    const resolvedData = chosenSource === 'oracle' ? conflict.oracleData : conflict.postgresqlData

    return {
      success: true,
      resolvedData,
      chosenSource,
      requiresManualIntervention: false
    }
  }

  private resolveBySource(conflict: DataConflict, source: 'postgresql' | 'oracle'): ConflictResolutionResult {
    const resolvedData = source === 'postgresql' ? conflict.postgresqlData : conflict.oracleData

    return {
      success: true,
      resolvedData,
      chosenSource: source,
      requiresManualIntervention: false
    }
  }

  private resolveByCustomRule(
    conflict: DataConflict,
    customRule: (pgData: any, oracleData: any) => any
  ): ConflictResolutionResult {
    const resolvedData = customRule(conflict.postgresqlData, conflict.oracleData)

    // 判斷選擇的來源
    let chosenSource: 'postgresql' | 'oracle' | 'merged' = 'merged'
    if (JSON.stringify(resolvedData) === JSON.stringify(conflict.postgresqlData)) {
      chosenSource = 'postgresql'
    } else if (JSON.stringify(resolvedData) === JSON.stringify(conflict.oracleData)) {
      chosenSource = 'oracle'
    }

    return {
      success: true,
      resolvedData,
      chosenSource,
      requiresManualIntervention: false
    }
  }
}

/**
 * 同步排程器
 * 負責管理自動同步排程
 */
export class SyncScheduler {
  private schedules: Map<string, ScheduleConfig> = new Map()

  /**
   * 排程同步
   */
  async scheduleSync(config: ScheduleConfig): Promise<ScheduleResult> {
    try {
      // 驗證配置
      if (!config.tables || config.tables.length === 0) {
        throw new Error('At least one table must be specified')
      }

      if (!['manual', 'real-time', 'hourly', 'daily', 'weekly'].includes(config.interval)) {
        throw new Error('Invalid sync interval')
      }

      const scheduleId = config.scheduleId || this.generateScheduleId()
      const nextRunTime = this.calculateNextRunTime(config.interval)

      const scheduleConfig = {
        ...config,
        scheduleId,
        enabled: config.enabled !== false
      }

      this.schedules.set(scheduleId, scheduleConfig)

      return {
        success: true,
        scheduleId,
        nextRunTime
      }

    } catch (error) {
      return {
        success: false,
        scheduleId: '',
        nextRunTime: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 執行排程同步
   */
  async executeScheduledSync(scheduleId: string): Promise<ScheduledSyncResult> {
    try {
      const config = this.schedules.get(scheduleId)
      if (!config) {
        throw new Error(`Schedule ${scheduleId} not found`)
      }

      if (!config.enabled) {
        throw new Error(`Schedule ${scheduleId} is disabled`)
      }

      const synchronizer = new DataSynchronizer()
      const syncResults: SyncResult[] = []

      for (const tableName of config.tables) {
        const result = await synchronizer.synchronizeTable(tableName, config.direction)
        syncResults.push(result)
      }

      return {
        success: true,
        scheduleId,
        executedAt: new Date(),
        syncResults
      }

    } catch (error) {
      return {
        success: false,
        scheduleId,
        executedAt: new Date(),
        syncResults: [],
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private generateScheduleId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private calculateNextRunTime(interval: SyncInterval): Date {
    const now = new Date()

    switch (interval) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000)
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000)
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      default:
        return now
    }
  }
}

/**
 * 資料比較引擎
 * 負責詳細的資料比較和分析
 */
export class DataComparisonEngine {
  private pgPool: Pool
  private oracleConfig: any

  constructor() {
    this.pgPool = new Pool({
      host: process.env.DB_HOST || '192.168.1.183',
      database: process.env.DB_DATABASE || 'app_db',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'XcW04ByX6GbVdt1gw4EJ5XRY',
      port: parseInt(process.env.DB_PORT || '30432')
    })

    this.oracleConfig = {
      user: process.env.ORACLE_USER || 'pcm_user',
      password: process.env.ORACLE_PASSWORD || 'pcm_pass123',
      connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XE'
    }
  }

  /**
   * 比較記錄
   */
  async compareRecords(postgresRecord: any, oracleRecord: any): Promise<RecordComparison> {
    const differences = []

    // 比較每個欄位
    const allFields = new Set([...Object.keys(postgresRecord), ...Object.keys(oracleRecord)])

    for (const field of allFields) {
      const pgValue = postgresRecord[field]
      const oracleValue = oracleRecord[field]

      if (JSON.stringify(pgValue) !== JSON.stringify(oracleValue)) {
        differences.push({
          field,
          postgresqlValue: pgValue,
          oracleValue: oracleValue
        })
      }
    }

    return {
      isIdentical: differences.length === 0,
      differences
    }
  }

  /**
   * 比較表格結構
   */
  async compareTableSchemas(tableName: string): Promise<SchemaComparison> {
    let oracleConnection: oracledb.Connection | undefined

    try {
      // 獲取PostgreSQL欄位資訊
      const pgSchemaResult = await this.pgPool.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'pcm'
        ORDER BY ordinal_position
      `, [tableName])

      // 獲取Oracle欄位資訊
      oracleConnection = await oracledb.getConnection(this.oracleConfig)
      const oracleSchemaResult = await oracleConnection.execute(`
        SELECT column_name, data_type, data_length, nullable
        FROM user_tab_columns
        WHERE table_name = UPPER(:tableName)
        ORDER BY column_id
      `, { tableName })

      const differences = []
      const pgColumns = new Map(pgSchemaResult.rows.map(row => [row.column_name, row]))
      const oracleColumns = new Map(
        (oracleSchemaResult.rows || []).map(row => {
          const [colName, dataType, dataLength, nullable] = row as any[]
          return [colName.toLowerCase(), { column_name: colName, data_type: dataType, data_length: dataLength, nullable }]
        })
      )

      // 比較欄位
      const allColumns = new Set([...pgColumns.keys(), ...oracleColumns.keys()])

      for (const columnName of allColumns) {
        const pgColumn = pgColumns.get(columnName)
        const oracleColumn = oracleColumns.get(columnName)

        if (!pgColumn || !oracleColumn) {
          differences.push({
            column: columnName,
            postgresqlType: pgColumn?.data_type || 'MISSING',
            oracleType: oracleColumn?.data_type || 'MISSING',
            isCompatible: false
          })
        } else {
          const isCompatible = this.areTypesCompatible(pgColumn.data_type, oracleColumn.data_type)
          if (!isCompatible) {
            differences.push({
              column: columnName,
              postgresqlType: pgColumn.data_type,
              oracleType: oracleColumn.data_type,
              isCompatible: false
            })
          }
        }
      }

      return {
        tableName,
        isCompatible: differences.length === 0,
        differences
      }

    } finally {
      if (oracleConnection) {
        await oracleConnection.close()
      }
    }
  }

  /**
   * 生成比較報告
   */
  async generateComparisonReport(tableNames: string[]): Promise<ComparisonReport> {
    const tableReports = []
    let compatibleTables = 0
    let totalIssues = 0

    for (const tableName of tableNames) {
      try {
        const schemaCompatibility = await this.compareTableSchemas(tableName)
        const consistencyChecker = new ConsistencyChecker()
        const dataConsistency = await consistencyChecker.checkTableConsistency(tableName)

        if (schemaCompatibility.isCompatible && dataConsistency.isConsistent) {
          compatibleTables++
        }

        totalIssues += schemaCompatibility.differences.length + dataConsistency.discrepancies.length

        tableReports.push({
          tableName,
          schemaCompatibility,
          dataConsistency
        })

      } catch (error) {
        console.error(`Failed to analyze table ${tableName}:`, error)
      }
    }

    const recommendations = []
    if (compatibleTables < tableNames.length) {
      recommendations.push('部分表格存在結構或資料不一致問題')
      recommendations.push('建議執行資料同步和結構調整')
    }
    if (totalIssues > 0) {
      recommendations.push('發現資料不一致問題，建議檢查遷移腳本')
    }

    return {
      generatedAt: new Date(),
      tablesCompared: tableNames,
      summary: {
        totalTables: tableNames.length,
        compatibleTables,
        incompatibleTables: tableNames.length - compatibleTables,
        totalIssues
      },
      recommendations,
      tableReports
    }
  }

  private areTypesCompatible(pgType: string, oracleType: string): boolean {
    const compatibilityMap: Record<string, string[]> = {
      'uuid': ['VARCHAR2'],
      'text': ['VARCHAR2', 'CLOB'],
      'integer': ['NUMBER'],
      'bigint': ['NUMBER'],
      'boolean': ['NUMBER'],
      'timestamp': ['TIMESTAMP'],
      'date': ['DATE'],
      'jsonb': ['JSON', 'CLOB']
    }

    const compatibleOracleTypes = compatibilityMap[pgType.toLowerCase()] || []
    return compatibleOracleTypes.some(type => oracleType.toUpperCase().includes(type))
  }
}