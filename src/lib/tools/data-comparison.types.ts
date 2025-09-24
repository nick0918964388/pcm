// 資料比對工具的類型定義
export type DatabaseType = 'postgresql' | 'oracle';

// 資料庫連線配置
export interface DatabaseConfig {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  schema?: string;
}

// 表格元資料
export interface TableMetadata {
  name: string;
  schema?: string;
  columns: ColumnMetadata[];
  primaryKeys: string[];
  indexes: IndexMetadata[];
}

export interface ColumnMetadata {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue?: any;
  characterMaxLength?: number;
  numericPrecision?: number;
  numericScale?: number;
}

export interface IndexMetadata {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

// 比對配置
export interface ComparisonConfig {
  sourceDb: DatabaseConfig;
  targetDb: DatabaseConfig;
  tables: string[];
  excludeColumns?: string[];
  includeSystemTables?: boolean;
  maxSampleSize?: number;
  batchSize?: number;
}

// 資料計數比對結果
export interface CountComparisonResult {
  tableName: string;
  sourceCount: number;
  targetCount: number;
  countMatch: boolean;
  difference: number;
  percentageDiff: number;
}

// 資料內容比對結果
export interface ContentComparisonResult {
  tableName: string;
  totalRecords: number;
  sampledRecords: number;
  exactMatches: number;
  partialMatches: number;
  missingInTarget: number;
  extraInTarget: number;
  fieldDifferences: FieldDifference[];
}

export interface FieldDifference {
  primaryKey: any;
  fieldName: string;
  sourceValue: any;
  targetValue: any;
  valueType: 'missing' | 'extra' | 'different' | 'type_mismatch';
}

// 結構差異比對
export interface StructureComparisonResult {
  tableName: string;
  structureMatch: boolean;
  missingColumns: ColumnMetadata[];
  extraColumns: ColumnMetadata[];
  columnDifferences: ColumnDifference[];
  missingIndexes: IndexMetadata[];
  extraIndexes: IndexMetadata[];
}

export interface ColumnDifference {
  columnName: string;
  source: ColumnMetadata;
  target: ColumnMetadata;
  differences: string[];
}

// 完整比對報告
export interface ComparisonReport {
  executionId: string;
  timestamp: Date;
  config: ComparisonConfig;
  summary: ComparisonSummary;
  countResults: CountComparisonResult[];
  contentResults: ContentComparisonResult[];
  structureResults: StructureComparisonResult[];
  errors: ComparisonError[];
  executionTime: number;
}

export interface ComparisonSummary {
  totalTables: number;
  tablesWithCountMismatch: number;
  tablesWithContentDifferences: number;
  tablesWithStructureDifferences: number;
  overallDataIntegrity: number; // 0-100%
  criticalIssues: number;
  warnings: number;
}

export interface ComparisonError {
  tableName?: string;
  operation: string;
  errorCode: string;
  message: string;
  timestamp: Date;
  stack?: string;
}

// 差異級別
export type DifferenceLevel = 'critical' | 'warning' | 'info';

export interface ValidationIssue {
  level: DifferenceLevel;
  category: 'count' | 'content' | 'structure' | 'constraint';
  tableName: string;
  description: string;
  impact: string;
  recommendation: string;
}

// 資料比對工具主介面
export interface DataComparisonTool {
  // 比對方法
  compareTableCounts(tables: string[]): Promise<CountComparisonResult[]>;
  compareTableContent(
    tables: string[],
    sampleSize?: number
  ): Promise<ContentComparisonResult[]>;
  compareTableStructure(tables: string[]): Promise<StructureComparisonResult[]>;

  // 完整比對
  performFullComparison(config: ComparisonConfig): Promise<ComparisonReport>;

  // 元資料方法
  getTableList(database: DatabaseConfig): Promise<string[]>;
  getTableMetadata(
    database: DatabaseConfig,
    tableName: string
  ): Promise<TableMetadata>;

  // 資料提取
  extractSampleData(
    database: DatabaseConfig,
    tableName: string,
    sampleSize: number
  ): Promise<any[]>;
  getRowCount(database: DatabaseConfig, tableName: string): Promise<number>;

  // 報告生成
  generateReport(results: ComparisonReport): Promise<string>;
  exportResults(
    results: ComparisonReport,
    format: 'json' | 'csv' | 'html'
  ): Promise<Buffer>;
}

// 查詢建構器介面
export interface QueryBuilder {
  buildCountQuery(tableName: string): string;
  buildSampleQuery(tableName: string, sampleSize: number): string;
  buildMetadataQuery(tableName: string): string;
  buildTableListQuery(schema?: string): string;
}

// 資料庫連線抽象介面
export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  executeQuery(query: string, params?: any[]): Promise<any[]>;
  getMetadata(tableName: string): Promise<TableMetadata>;
  isConnected(): boolean;
}

// 進度回調
export interface ProgressCallback {
  onTableStart(tableName: string): void;
  onTableComplete(tableName: string, result: any): void;
  onProgress(completed: number, total: number): void;
  onError(error: ComparisonError): void;
}

// 比對選項
export interface ComparisonOptions {
  ignoreCase?: boolean;
  trimWhitespace?: boolean;
  ignoreDateFormats?: boolean;
  numericTolerance?: number;
  customComparers?: Map<string, (a: any, b: any) => boolean>;
  onProgress?: ProgressCallback;
}
