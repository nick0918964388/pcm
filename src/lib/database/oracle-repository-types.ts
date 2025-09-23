/**
 * Oracle Repository Types
 * Task 3.3: 更新Repository抽象層以支援Oracle
 */

import { QueryOptions, QueryResult } from './oracle-query-types';

// Oracle特有的查詢選項
export interface OracleQueryOptions extends QueryOptions {
  useOracleHints?: boolean;
  optimizerMode?: 'ALL_ROWS' | 'FIRST_ROWS' | 'FIRST_ROWS_1' | 'FIRST_ROWS_10' | 'FIRST_ROWS_100' | 'FIRST_ROWS_1000';
  enableRowid?: boolean;
  useAnalyticFunctions?: boolean;
}

// Oracle分頁選項
export interface OraclePaginationOptions {
  page: number;
  limit: number;
  useRowNumber?: boolean;
  useOffsetFetch?: boolean;
  orderBy?: string;
}

// Oracle分頁結果
export interface OraclePaginationResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
  totalPages: number;
}

// Oracle批次操作選項
export interface OracleBatchOptions {
  batchSize?: number;
  enableArrayDML?: boolean;
  continueOnError?: boolean;
  useForallStatement?: boolean;
  logErrors?: boolean;
}

// Oracle JSON查詢選項
export interface OracleJsonQueryOptions {
  path: string;
  value?: any;
  operator?: 'EXISTS' | 'VALUE' | 'QUERY' | 'TABLE';
  returnType?: 'VARCHAR2' | 'NUMBER' | 'DATE' | 'CLOB';
  onError?: 'ERROR' | 'NULL' | 'DEFAULT';
  onEmpty?: 'ERROR' | 'NULL' | 'DEFAULT';
}

// Oracle排序選項
export interface OracleSortOptions {
  column: string;
  direction: 'ASC' | 'DESC';
  nullsHandling?: 'NULLS FIRST' | 'NULLS LAST';
  collation?: string;
}

// Oracle聚合選項
export interface OracleAggregateOptions {
  groupBy?: string[];
  having?: string;
  useAnalyticFunctions?: boolean;
  partitionBy?: string[];
  orderBy?: OracleSortOptions[];
}

// Oracle事務選項
export interface OracleTransactionOptions {
  isolationLevel?: 'READ_COMMITTED' | 'SERIALIZABLE';
  readOnly?: boolean;
  deferConstraints?: boolean;
  useSavepoints?: boolean;
}

// Oracle查詢建構器
export interface OracleQueryBuilder {
  select(columns: string | string[]): OracleQueryBuilder;
  from(table: string, alias?: string): OracleQueryBuilder;
  where(condition: string, binds?: Record<string, any>): OracleQueryBuilder;
  whereIn(column: string, values: any[]): OracleQueryBuilder;
  whereExists(subquery: string): OracleQueryBuilder;
  whereJson(options: OracleJsonQueryOptions): OracleQueryBuilder;
  join(table: string, condition: string, type?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS'): OracleQueryBuilder;
  orderBy(sorts: OracleSortOptions[]): OracleQueryBuilder;
  groupBy(columns: string[]): OracleQueryBuilder;
  having(condition: string): OracleQueryBuilder;
  limit(count: number, offset?: number): OracleQueryBuilder;
  hint(hints: string[]): OracleQueryBuilder;
  build(): { sql: string; binds: Record<string, any> };
}

// Oracle Repository基礎介面
export interface IOracleBaseRepository<T> {
  // 基本CRUD操作
  findById(id: string | number, options?: OracleQueryOptions): Promise<T | null>;
  findAll(options?: OracleQueryOptions): Promise<T[]>;
  create(entity: Partial<T>, options?: OracleQueryOptions): Promise<T>;
  update(id: string | number, updates: Partial<T>, options?: OracleQueryOptions): Promise<T>;
  delete(id: string | number, options?: OracleQueryOptions): Promise<boolean>;

  // 批次操作
  createMany(entities: Partial<T>[], options?: OracleBatchOptions): Promise<T[]>;
  updateMany(updates: Array<{ id: string | number; data: Partial<T> }>, options?: OracleBatchOptions): Promise<T[]>;
  deleteMany(ids: (string | number)[], options?: OracleBatchOptions): Promise<number>;

  // 查詢操作
  findBy(criteria: Partial<T>, options?: OracleQueryOptions): Promise<T[]>;
  findOne(criteria: Partial<T>, options?: OracleQueryOptions): Promise<T | null>;
  count(criteria?: Partial<T>, options?: OracleQueryOptions): Promise<number>;
  exists(criteria: Partial<T>, options?: OracleQueryOptions): Promise<boolean>;

  // 分頁操作
  paginate(options: OraclePaginationOptions, criteria?: Partial<T>): Promise<OraclePaginationResult<T>>;

  // Oracle特有操作
  findByRowid(rowid: string, options?: OracleQueryOptions): Promise<T | null>;
  merge(entity: Partial<T>, matchColumns: string[], options?: OracleQueryOptions): Promise<T>;

  // JSON操作 (for JSON columns)
  findByJson(jsonOptions: OracleJsonQueryOptions, options?: OracleQueryOptions): Promise<T[]>;
  updateJson(id: string | number, jsonPath: string, value: any, options?: OracleQueryOptions): Promise<T>;

  // 聚合操作
  aggregate(aggregateOptions: OracleAggregateOptions, options?: OracleQueryOptions): Promise<any[]>;

  // 查詢建構器
  query(): OracleQueryBuilder;

  // 原始SQL執行
  executeRaw(sql: string, binds?: Record<string, any>, options?: OracleQueryOptions): Promise<QueryResult>;

  // 事務支援
  withTransaction<R>(callback: (repo: this) => Promise<R>, options?: OracleTransactionOptions): Promise<R>;

  // 測試期望的額外方法
  findMany(ids: (string | number)[], options?: OracleQueryOptions): Promise<T[]>;
  batchCreate(entities: Partial<T>[], options?: OracleBatchOptions): Promise<T[]>;
  batchUpdate(updates: Array<{ id: string | number; data: Partial<T> }>, options?: OracleBatchOptions): Promise<T[]>;
  batchDelete(ids: (string | number)[], options?: OracleBatchOptions): Promise<number>;
  generateSequenceId(sequenceName?: string): Promise<number>;
  bulkInsert(entities: Partial<T>[], options?: OracleBatchOptions): Promise<void>;
  upsert(entity: Partial<T>, matchColumns: string[], options?: OracleQueryOptions): Promise<T>;
  findWithCursor(options: { batchSize: number; cursor?: string }, criteria?: Partial<T>): Promise<{ data: T[]; nextCursor?: string; hasMore: boolean }>;
  softDelete(id: string | number, options?: OracleQueryOptions): Promise<boolean>;
  restore(id: string | number, options?: OracleQueryOptions): Promise<T | null>;
  findDeleted(options?: OracleQueryOptions): Promise<T[]>;
  getMetrics(): OracleRepositoryMetrics;
  resetMetrics(): void;
}

// Oracle Repository配置
export interface OracleRepositoryConfig {
  tableName: string;
  primaryKey: string;
  schema?: string;
  enableAuditColumns?: boolean;
  auditColumns?: {
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    updatedBy?: string;
  };
  enableSoftDelete?: boolean;
  softDeleteColumn?: string;
  jsonColumns?: string[];
  timestampColumns?: string[];
  optimisticLocking?: {
    enabled: boolean;
    versionColumn: string;
  };
}

// Oracle實體對映
export interface OracleEntityMapping {
  columnName: string;
  propertyName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  defaultValue?: any;
  constraints?: string[];
}

// Oracle查詢快取配置
export interface OracleQueryCacheConfig {
  enabled: boolean;
  ttl: number; // seconds
  maxSize: number;
  keyGenerator?: (sql: string, binds: Record<string, any>) => string;
}

// Oracle效能監控
export interface OracleRepositoryMetrics {
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: number;
  cacheHitRate: number;
  errorRate: number;
  lastResetTime: Date;
}