/**
 * Schema Migration Types
 * Task 2.2: 自動化Schema遷移工具的類型定義
 */

// 欄位定義
export interface ColumnDefinition {
  name: string;
  dataType: string;
  isPrimary: boolean;
  isNullable: boolean;
  defaultValue?: string;
  comment?: string;
  ordinalPosition?: number;
}

// 外鍵定義
export interface ForeignKeyDefinition {
  constraintName: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete?: 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'NO ACTION';
}

// 索引定義
export interface IndexDefinition {
  name: string;
  tableName: string;
  columns: string[];
  isUnique: boolean;
  indexType: 'BTREE' | 'HASH' | 'GIN' | 'GIST' | 'SPGIST' | 'BRIN';
  condition?: string; // 部分索引條件
  includedColumns?: string[]; // INCLUDE columns
}

// 約束定義
export interface ConstraintDefinition {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'NOT NULL';
  tableName: string;
  columns?: string[];
  definition: string;
  referencedTable?: string;
  referencedColumns?: string[];
}

// 觸發器定義
export interface TriggerDefinition {
  name: string;
  tableName: string;
  timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  event: 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE';
  functionName: string;
  functionBody: string;
  condition?: string;
}

// 序列定義
export interface SequenceDefinition {
  name: string;
  startValue: number;
  increment: number;
  minValue?: number;
  maxValue?: number;
  cache?: number;
  cycle?: boolean;
  ownedBy?: string; // 擁有該序列的欄位
}

// 表格定義
export interface TableDefinition {
  name: string;
  schema?: string;
  columns: ColumnDefinition[];
  primaryKey: string[];
  foreignKeys: ForeignKeyDefinition[];
  indexes: IndexDefinition[];
  comment?: string;
  tablespace?: string;
}

// PostgreSQL Schema結構
export interface PostgreSQLSchema {
  tables: TableDefinition[];
  indexes: IndexDefinition[];
  constraints: ConstraintDefinition[];
  triggers: TriggerDefinition[];
  sequences: SequenceDefinition[];
  functions?: FunctionDefinition[];
  views?: ViewDefinition[];
  warnings?: string[];
}

// Oracle Schema結構
export interface OracleSchema {
  tables: TableDefinition[];
  indexes: IndexDefinition[];
  constraints: ConstraintDefinition[];
  triggers: TriggerDefinition[];
  sequences: SequenceDefinition[];
  warnings?: string[];
  migrationNotes?: string[];
}

// 函數定義
export interface FunctionDefinition {
  name: string;
  parameters: Array<{
    name: string;
    type: string;
    mode: 'IN' | 'OUT' | 'INOUT';
  }>;
  returnType: string;
  body: string;
  language: string;
}

// 視圖定義
export interface ViewDefinition {
  name: string;
  definition: string;
  columns?: string[];
  isMaterialized: boolean;
}

// 遷移步驟
export interface MigrationStep {
  id: string;
  order: number;
  description: string;
  ddl: string;
  dependsOn: string[];
  estimatedDuration: number; // 秒
  rollbackDDL?: string;
  skipOnError?: boolean;
}

// 遷移計畫
export interface MigrationPlan {
  id: string;
  name: string;
  description: string;
  steps: MigrationStep[];
  dependencies: Record<string, string[]>;
  estimatedDuration: number;
  rollbackPlan: {
    steps: MigrationStep[];
    description: string;
  };
  createdAt: Date;
  metadata?: {
    postgresVersion: string;
    oracleVersion: string;
    totalTables: number;
    totalIndexes: number;
    totalConstraints: number;
  };
}

// 遷移歷史記錄
export interface MigrationRecord {
  version: string;
  description: string;
  appliedAt: Date;
  ddlScript: string;
  checksum: string;
  executionTime: number;
  appliedBy: string;
  success: boolean;
  errorMessage?: string;
}

// DDL驗證結果
export interface DDLValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Schema比較結果
export interface SchemaComparisonResult {
  tablesAdded: string[];
  tablesRemoved: string[];
  tablesModified: Array<{
    tableName: string;
    columnsAdded: string[];
    columnsRemoved: string[];
    columnsModified: string[];
  }>;
  indexesAdded: string[];
  indexesRemoved: string[];
  constraintsAdded: string[];
  constraintsRemoved: string[];
}

// 遷移配置
export interface MigrationConfig {
  sourceConnection: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  targetConnection: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  migrationSettings: {
    batchSize: number;
    timeoutSeconds: number;
    continueOnError: boolean;
    generateRollback: boolean;
    validateDDL: boolean;
  };
}

// Schema分析選項
export interface SchemaAnalysisOptions {
  includeTables?: string[];
  excludeTables?: string[];
  includeViews?: boolean;
  includeFunctions?: boolean;
  includeTriggers?: boolean;
  includeIndexes?: boolean;
  includeConstraints?: boolean;
}

// 遷移狀態
export interface MigrationStatus {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  startTime?: Date;
  endTime?: Date;
  currentStep?: number;
  totalSteps: number;
  progress: number; // 0-100
  message?: string;
  lastError?: string;
}

// 錯誤類型
export class SchemaMigrationError extends Error {
  constructor(
    message: string,
    public readonly details?: any,
    public readonly suggestions?: string[],
    public readonly affectedTables?: string[]
  ) {
    super(message);
    this.name = 'SchemaMigrationError';
  }
}

export class DDLValidationError extends Error {
  constructor(
    message: string,
    public readonly ddl: string,
    public readonly line?: number,
    public readonly column?: number
  ) {
    super(message);
    this.name = 'DDLValidationError';
  }
}

export class DependencyError extends Error {
  constructor(
    message: string,
    public readonly missingDependencies: string[],
    public readonly circularDependencies?: string[]
  ) {
    super(message);
    this.name = 'DependencyError';
  }
}
