/**
 * Oracle Query Types
 * Task 3.2: 開發Oracle特化的查詢執行層
 */

// 查詢選項
export interface QueryOptions {
  convertSyntax?: boolean;
  convertBinds?: boolean;
  useCache?: boolean;
  locale?: string;
  includeExecutionPlan?: boolean;
  timeout?: number;
  fetchSize?: number;
}

// 查詢結果
export interface QueryResult<T = any> {
  success: boolean;
  data?: T[];
  rows?: T[];
  totalRows?: number;
  hasMore?: boolean;
  outBinds?: Record<string, any>;
  executionPlan?: ExecutionPlan;
  executionTime?: number;
  error?: QueryError;
}

// 查詢錯誤
export interface QueryError {
  code: string;
  message: string;
  type: ErrorType;
  severity: ErrorSeverity;
  localizedMessage?: string;
  suggestedAction?: string;
  constraintInfo?: ConstraintInfo;
  affectedQuery?: string;
  bindValues?: Record<string, any>;
}

// 錯誤類型
export type ErrorType =
  | 'CONSTRAINT_VIOLATION'
  | 'AUTHENTICATION_FAILED'
  | 'INVALID_COLUMN'
  | 'TABLE_NOT_EXISTS'
  | 'NO_DATA_FOUND'
  | 'SYNTAX_ERROR'
  | 'PERMISSION_DENIED'
  | 'CONNECTION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR';

// 錯誤嚴重性
export type ErrorSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

// 約束資訊
export interface ConstraintInfo {
  constraintName: string;
  constraintType: 'PRIMARY_KEY' | 'FOREIGN_KEY' | 'UNIQUE' | 'CHECK' | 'NOT_NULL';
  affectedColumns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
  suggestedAction: string;
}

// 執行計畫
export interface ExecutionPlan {
  cost: number;
  cardinality: number;
  operations: string[];
  indexes?: string[];
  warnings?: string[];
  recommendations?: string[];
}

// 預處理語句
export interface PreparedStatement {
  id: string;
  sql: string;
  compiledAt: Date;
  lastUsed: Date;
  useCount: number;
  executionTime: number;
  cached: boolean;
}

// 快取統計
export interface CacheStatistics {
  cacheHits: number;
  cacheMisses: number;
  totalCachedStatements: number;
  cacheEvictions: number;
  hitRate: number;
  memoryUsage: number;
}

// 快取效能指標
export interface CachePerformanceMetrics {
  hitRate: number;
  averageRetrievalTime: number;
  memoryUsage: number;
  evictionRate: number;
  mostUsedStatements: Array<{
    sql: string;
    useCount: number;
    averageExecutionTime: number;
  }>;
}

// 交易上下文
export interface TransactionContext {
  isolationLevel?: IsolationLevel;
  readOnly?: boolean;
  autoCommit?: boolean;
  timeout?: number;
  name?: string;
}

// 隔離級別
export type IsolationLevel =
  | 'READ_UNCOMMITTED'
  | 'READ_COMMITTED'
  | 'REPEATABLE_READ'
  | 'SERIALIZABLE';

// 交易介面
export interface Transaction {
  execute(sql: string, binds?: Record<string, any>): Promise<QueryResult>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  createSavepoint(name: string): Promise<Savepoint>;
  rollbackToSavepoint(savepoint: Savepoint): Promise<void>;
  releaseSavepoint(savepoint: Savepoint): Promise<void>;
}

// 儲存點
export interface Savepoint {
  name: string;
  createdAt: Date;
}

// 批次操作
export interface BatchOperation {
  sql: string;
  binds: Record<string, any>[];
  options?: {
    batchSize?: number;
    enableParallel?: boolean;
    continueOnError?: boolean;
  };
}

// 批次操作結果
export interface BulkOperationResult {
  success: boolean;
  totalProcessed: number;
  successfulRows: number;
  failedRows: number;
  batchCount: number;
  errors?: Array<{
    rowIndex: number;
    error: QueryError;
  }>;
  executionTime: number;
}

// 遊標結果
export interface CursorResult<T = any> {
  success: boolean;
  rows: T[];
  hasMore: boolean;
  cursor?: string;
  totalFetched: number;
  error?: QueryError;
}

// 串流選項
export interface StreamOptions {
  batchSize: number;
  onBatch?: (rows: any[]) => void;
  onError?: (error: QueryError) => void;
  onComplete?: () => void;
  transform?: (row: any) => any;
}

// 串流結果
export interface StreamResult {
  success: boolean;
  totalProcessed: number;
  batchCount: number;
  error?: QueryError;
}

// 語法轉換規則
export interface SyntaxConversionRule {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
  description: string;
  category: 'pagination' | 'json' | 'date' | 'string' | 'aggregate' | 'join';
}

// 綁定變數轉換選項
export interface BindConversionOptions {
  convertBoolean?: boolean;
  convertJson?: boolean;
  convertDate?: boolean;
  convertUuid?: boolean;
  dateFormat?: string;
}

// 查詢統計
export interface QueryStatistics {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageExecutionTime: number;
  slowQueries: Array<{
    sql: string;
    executionTime: number;
    timestamp: Date;
  }>;
  errorsByType: Record<ErrorType, number>;
  queryCountByHour: Record<string, number>;
}

// 效能監控資料
export interface PerformanceMonitoring {
  cpuUsage: number;
  memoryUsage: number;
  diskIO: number;
  networkIO: number;
  activeConnections: number;
  queuedRequests: number;
  responseTimeP95: number;
  responseTimeP99: number;
}

// Oracle特有的查詢提示
export interface OracleHints {
  optimizer?: 'ALL_ROWS' | 'FIRST_ROWS' | 'FIRST_ROWS(n)' | 'CHOOSE';
  access?: string[]; // e.g., ['USE_INDEX(table index)', 'FULL(table)']
  join?: string[]; // e.g., ['USE_NL(table1 table2)', 'USE_HASH(table1 table2)']
  parallel?: string | number;
  other?: string[];
}

// 連線配置
export interface ConnectionConfig {
  maxRetries?: number;
  retryDelay?: number;
  queryTimeout?: number;
  statementCacheSize?: number;
  lobPrefetchSize?: number;
  arrayDMLRowCounts?: boolean;
}

// 資料類型映射
export interface DataTypeMapping {
  postgresType: string;
  oracleType: string;
  conversionFunction?: (value: any) => any;
  validationRule?: (value: any) => boolean;
  sizeMapping?: (size?: number) => string;
}

// 查詢建構器介面
export interface QueryBuilder {
  select(columns: string | string[]): QueryBuilder;
  from(table: string): QueryBuilder;
  where(condition: string, binds?: Record<string, any>): QueryBuilder;
  join(table: string, condition: string, type?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'): QueryBuilder;
  orderBy(column: string, direction?: 'ASC' | 'DESC'): QueryBuilder;
  groupBy(columns: string | string[]): QueryBuilder;
  having(condition: string): QueryBuilder;
  limit(count: number, offset?: number): QueryBuilder;
  build(): { sql: string; binds: Record<string, any> };
}

// 查詢計畫分析
export interface QueryPlanAnalysis {
  estimatedCost: number;
  estimatedRows: number;
  accessMethods: string[];
  joinMethods: string[];
  indexUsage: Array<{
    tableName: string;
    indexName: string;
    columns: string[];
    selectivity: number;
  }>;
  recommendations: string[];
  warnings: string[];
}

// 資料庫物件資訊
export interface DatabaseObjectInfo {
  tables: Array<{
    name: string;
    rowCount: number;
    sizeBytes: number;
    lastAnalyzed: Date;
  }>;
  indexes: Array<{
    name: string;
    tableName: string;
    columns: string[];
    uniqueness: boolean;
    status: string;
  }>;
  constraints: Array<{
    name: string;
    tableName: string;
    type: string;
    columns: string[];
    status: string;
  }>;
}