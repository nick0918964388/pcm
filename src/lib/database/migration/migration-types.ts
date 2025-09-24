/**
 * Migration Types for Data Migration System
 * Task 2.3: 實作資料遷移和驗證功能
 */

// 資料遷移選項
export interface DataMigrationOptions {
  batchSize: number;
  parallelTables: number;
  validateEachBatch: boolean;
  continueOnError: boolean;
  compressionEnabled: boolean;
  maxRetryAttempts?: number;
  retryDelayMs?: number;
}

// 資料匯出結果
export interface DataExportResult {
  success: boolean;
  tableName: string;
  totalRecords: number;
  batchCount: number;
  exportedData: any[];
  originalSize: number;
  compressedSize?: number;
  compressionRatio?: number;
  error?: string;
  duration: number;
  timestamp: Date;
}

// 資料匯入結果
export interface DataImportResult {
  success: boolean;
  tableName: string;
  totalRecords: number;
  insertedRecords: number;
  failedRecords: number;
  batchCount: number;
  conversions?: {
    uuid: number;
    jsonb: number;
    boolean: number;
    timestamp: number;
    serial: number;
  };
  errors?: MigrationError[];
  retryAttempts?: number;
  duration: number;
  timestamp: Date;
}

// 資料遷移結果
export interface DataMigrationResult {
  success: boolean;
  totalTables: number;
  completedTables: number;
  failedTables: number;
  totalRecords: number;
  migratedRecords: number;
  errors?: MigrationError[];
  duration: number;
  timestamp: Date;
  summary: {
    tablesProcessed: string[];
    tablesSkipped: string[];
    tablesFailed: string[];
  };
}

// 遷移錯誤
export interface MigrationError {
  tableName: string;
  operation: 'export' | 'import' | 'validate';
  errorMessage: string;
  oracleErrorCode?: string;
  affectedRecord?: any;
  batchNumber?: number;
  isRetryable: boolean;
  suggestedAction: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

// 遷移進度
export interface MigrationProgress {
  currentTable: string;
  tableIndex: number;
  totalTables: number;
  currentBatch: number;
  totalBatches: number;
  recordsProcessed: number;
  totalRecords: number;
  percentComplete: number;
  estimatedTimeRemaining: number;
  currentOperation: 'export' | 'import' | 'validate';
  completed: boolean;
  error?: MigrationError;
}

// 驗證報告
export interface ValidationReport {
  isValid: boolean;
  tableName: string;
  postgresCount: number;
  oracleCount: number;
  issues: string[];
  timestamp: Date;
  validationDetails?: {
    sampleSize?: number;
    matchedRecords?: number;
    mismatchedRecords?: number;
    differences?: RecordDifference[];
  };
}

// 記錄差異
export interface RecordDifference {
  recordId: string;
  field: string;
  postgresValue: any;
  oracleValue: any;
  differenceType: 'value_mismatch' | 'type_mismatch' | 'missing_field';
}

// 數據比對結果
export interface DataComparisonResult {
  totalTables: number;
  matchingTables: number;
  mismatchedTables: number;
  results: TableComparisonResult[];
  summary: {
    totalPostgresRecords: number;
    totalOracleRecords: number;
    overallMatch: boolean;
  };
  timestamp: Date;
}

// 表比對結果
export interface TableComparisonResult {
  tableName: string;
  postgresCount: number;
  oracleCount: number;
  isMatch: boolean;
  difference: number;
  percentageMatch: number;
}

// 缺失記錄分析
export interface MissingRecordsAnalysis {
  tableName: string;
  primaryKey: string;
  missingInOracle: string[];
  missingInPostgres: string[];
  commonRecords: string[];
  summary: {
    totalPostgres: number;
    totalOracle: number;
    missing: number;
    extra: number;
  };
}

// 備份元數據
export interface BackupMetadata {
  version: string;
  createdAt: Date;
  tableCount: number;
  totalRecords: number;
  checksum: string;
  includesData: boolean;
  compressed: boolean;
  oracleVersion: string;
  creator?: string;
  description?: string;
}

// 備份結果
export interface BackupResult {
  success: boolean;
  backupPath: string;
  size: number;
  metadata: BackupMetadata;
  duration: number;
  error?: string;
}

// 備份驗證結果
export interface BackupValidationResult {
  isValid: boolean;
  checksumMatch: boolean;
  structureValid: boolean;
  dataIntegrityCheck: boolean;
  issues: string[];
  recommendations: string[];
}

// 還原結果
export interface RestoreResult {
  success: boolean;
  backupPath: string;
  executedStatements: number;
  restoredTables: number;
  restoredRecords: number;
  duration: number;
  error?: string;
  rollbackInfo?: {
    rollbackAvailable: boolean;
    rollbackPath?: string;
  };
}

// Oracle錯誤處理器
export interface OracleErrorHandler {
  errorCode: string;
  errorMessage: string;
  isRetryable: boolean;
  suggestedAction: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryStrategy?: {
    maxAttempts: number;
    baseDelayMs: number;
    backoffMultiplier: number;
  };
}

// 資料轉換統計
export interface DataConversionStats {
  tableName: string;
  totalRecords: number;
  convertedFields: {
    uuid: number;
    jsonb: number;
    boolean: number;
    serial: number;
    timestamp: number;
    text: number;
  };
  conversionErrors: {
    field: string;
    errorCount: number;
    sampleError: string;
  }[];
  conversionTime: number;
}

// 效能監控
export interface PerformanceMetrics {
  operation: string;
  tableName?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  recordsProcessed: number;
  recordsPerSecond?: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  databaseMetrics?: {
    connectionPoolSize: number;
    activeConnections: number;
    queryTime: number;
  };
}

// 遷移配置
export interface MigrationConfig {
  source: {
    type: 'postgresql';
    connectionString: string;
    schema: string;
  };
  target: {
    type: 'oracle';
    connectionString: string;
    schema: string;
  };
  options: DataMigrationOptions;
  tables: {
    include?: string[];
    exclude?: string[];
    customMapping?: Record<string, string>;
  };
  validation: {
    enabled: boolean;
    sampleSize: number;
    fullValidation: boolean;
  };
  backup: {
    enabled: boolean;
    path: string;
    compression: boolean;
  };
  monitoring: {
    enabled: boolean;
    progressCallback?: (progress: MigrationProgress) => void;
    metricsCallback?: (metrics: PerformanceMetrics) => void;
  };
}

// 遷移計劃
export interface DataMigrationPlan {
  id: string;
  name: string;
  description: string;
  config: MigrationConfig;
  phases: MigrationPhase[];
  estimatedDuration: number;
  prerequisites: string[];
  rollbackPlan: RollbackPlan;
  createdAt: Date;
}

// 遷移階段
export interface MigrationPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  tables: string[];
  dependencies: string[];
  estimatedDuration: number;
  validationRequired: boolean;
  backupRequired: boolean;
}

// 回滾計劃
export interface RollbackPlan {
  phases: RollbackPhase[];
  automaticTriggers: string[];
  manualSteps: string[];
  estimatedDuration: number;
}

// 回滾階段
export interface RollbackPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  actions: string[];
  validationChecks: string[];
}
