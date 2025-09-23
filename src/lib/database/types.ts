/**
 * Database Layer Types
 * 資料存取層類型定義 - 支援任務 1.1 和 1.2
 */

// 基礎資料庫連接介面
export interface DatabaseConnection {
  id: string
  type: 'oracle' | 'postgresql'
  query<T = any>(sql: string, params?: any[]): Promise<T[]>
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>
  close(): Promise<void>
  isHealthy(): boolean
}

// 連接池配置
export interface PoolConfig {
  oracle: {
    user: string
    password: string
    connectString: string
    poolMax: number
    poolMin: number
    poolIncrement?: number
    poolTimeout?: number
    queueTimeout?: number
  }
  postgresql: {
    host: string
    port: number
    database: string
    user: string
    password: string
    max: number
    min: number
    idleTimeoutMillis?: number
    connectionTimeoutMillis?: number
    ssl?: boolean | object
  }
}

// 健康檢查狀態
export interface HealthStatus {
  isHealthy: boolean
  responseTime: number
  oracle: {
    status: 'connected' | 'disconnected' | 'unhealthy'
    connectionsOpen?: number
    connectionsInUse?: number
    error?: string
  }
  postgresql: {
    status: 'connected' | 'disconnected' | 'unhealthy'
    totalCount?: number
    idleCount?: number
    waitingCount?: number
    error?: string
  }
}

// 連接池狀態
export interface PoolStatus {
  oracle: {
    isInitialized: boolean
    connectionsOpen: number
    connectionsInUse: number
    status: string
  }
  postgresql: {
    isInitialized: boolean
    totalCount: number
    idleCount: number
    waitingCount: number
  }
}

// Repository 基礎介面
export interface IRepository<T> {
  findById(id: string): Promise<T | null>
  findMany(criteria: SearchCriteria): Promise<PaginatedResult<T>>
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>
  update(id: string, updates: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
}

// Unit of Work 介面
export interface IUnitOfWork {
  begin(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  getRepository<T>(type: RepositoryType<T>): IRepository<T>
}

// 查詢條件
export interface SearchCriteria {
  filters?: Record<string, any>
  sort?: {
    field: string
    order: 'asc' | 'desc'
  }
  pagination?: {
    page: number
    limit: number
  }
}

// 分頁結果
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Repository 類型
export type RepositoryType<T> = string | (new () => T)

// 資料庫錯誤類型
export interface DatabaseError extends Error {
  code: string
  originalError?: Error
  database?: 'oracle' | 'postgresql'
  retryable?: boolean
  retryAfter?: number
}

// 連接池管理器介面
export interface IConnectionPoolManager {
  initialize(): Promise<void>
  getConnection(database: 'oracle' | 'postgresql'): Promise<DatabaseConnection>
  releaseConnection(connection: DatabaseConnection): Promise<void>
  healthCheck(): Promise<HealthStatus>
  getPoolStatus(): PoolStatus
  close(): Promise<void>
}

// 資料庫抽象層介面
export interface IDatabaseAbstraction {
  getConnection(database: 'oracle' | 'postgresql'): Promise<DatabaseConnection>
  releaseConnection(connection: DatabaseConnection): Promise<void>
  query<T = any>(sql: string, params?: any[], database?: 'oracle' | 'postgresql'): Promise<T[]>
  queryOne<T = any>(sql: string, params?: any[], database?: 'oracle' | 'postgresql'): Promise<T | null>
  transaction<T>(callback: (connection: DatabaseConnection) => Promise<T>, database?: 'oracle' | 'postgresql'): Promise<T>
  healthCheck(): Promise<HealthStatus>
  createUnitOfWork(): IUnitOfWork
}

// 查詢建構器介面
export interface IQueryBuilder {
  select(fields: string | string[]): IQueryBuilder
  from(table: string): IQueryBuilder
  where(condition: string, params?: any[]): IQueryBuilder
  join(table: string, condition: string): IQueryBuilder
  orderBy(field: string, direction?: 'ASC' | 'DESC'): IQueryBuilder
  limit(count: number): IQueryBuilder
  offset(count: number): IQueryBuilder
  build(): { sql: string; params: any[] }
}

// 事務選項
export interface TransactionOptions {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE'
  timeout?: number
  readOnly?: boolean
}

// 連接重試配置
export interface RetryConfig {
  maxAttempts: number
  delayMs: number
  backoffMultiplier: number
  maxDelayMs: number
}

// 稽核追蹤欄位
export interface AuditFields {
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  updatedBy?: string
  deletedAt?: Date
  deletedBy?: string
}

// 軟刪除實體基礎介面
export interface SoftDeletableEntity extends AuditFields {
  id: string
  isDeleted: boolean
}

// 資料驗證結果
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

// 資料遷移介面
export interface IMigration {
  version: string
  description: string
  up(connection: DatabaseConnection): Promise<void>
  down(connection: DatabaseConnection): Promise<void>
}

// 資料種子介面
export interface ISeeder {
  run(connection: DatabaseConnection): Promise<void>
  rollback(connection: DatabaseConnection): Promise<void>
}