/**
 * Data Type Migration Types
 * Task 2.1: PostgreSQL到Oracle資料類型轉換機制
 */

// PostgreSQL資料類型
export type PostgreSQLType =
  | 'UUID'
  | 'JSONB'
  | 'JSON'
  | 'SERIAL'
  | 'BIGSERIAL'
  | 'SMALLSERIAL'
  | 'TIMESTAMP WITH TIME ZONE'
  | 'TIMESTAMP WITHOUT TIME ZONE'
  | 'TIME WITH TIME ZONE'
  | 'TIME WITHOUT TIME ZONE'
  | 'TEXT'
  | 'VARCHAR'
  | 'CHAR'
  | 'BOOLEAN'
  | 'INTEGER'
  | 'BIGINT'
  | 'SMALLINT'
  | 'DECIMAL'
  | 'NUMERIC'
  | 'REAL'
  | 'DOUBLE PRECISION'
  | 'BYTEA'
  | 'ARRAY'
  | string; // 支援自定義類型和帶參數的類型 如 VARCHAR(255)

// Oracle資料類型
export type OracleType =
  | 'VARCHAR2'
  | 'NVARCHAR2'
  | 'CHAR'
  | 'NCHAR'
  | 'CLOB'
  | 'NCLOB'
  | 'NUMBER'
  | 'BINARY_FLOAT'
  | 'BINARY_DOUBLE'
  | 'DATE'
  | 'TIMESTAMP'
  | 'TIMESTAMP WITH TIME ZONE'
  | 'TIMESTAMP WITH LOCAL TIME ZONE'
  | 'INTERVAL YEAR TO MONTH'
  | 'INTERVAL DAY TO SECOND'
  | 'RAW'
  | 'LONG RAW'
  | 'BLOB'
  | 'BFILE'
  | 'JSON'
  | 'XMLTYPE'
  | string; // 支援帶參數的類型

// 轉換選項
export interface ConversionOptions {
  tableName?: string;
  columnName?: string;
  oracleVersion?: string;
  preferClob?: boolean;
  preserveTimezone?: boolean;
  customMapping?: Record<string, string>;
}

// 轉換結果
export interface ConversionResult {
  success: boolean;
  oracleType: string;
  constraints?: string[];
  additionalObjects?: {
    sequence?: string;
    trigger?: string;
    index?: string;
    function?: string;
  };
  migrationNotes?: string[];
  error?: string;
}

// 值轉換結果
export interface ValueConversionResult {
  success: boolean;
  convertedValue: any;
  error?: string;
  warnings?: string[];
}

// 轉換規則
export interface ConversionRule {
  postgresqlType: PostgreSQLType;
  oracleType: OracleType;
  conversionLogic: (value: any, options?: ConversionOptions) => ValueConversionResult;
  validationRule?: (value: any) => boolean;
  reversible: boolean;
  constraints?: string[];
  notes?: string;
}

// 遷移摘要
export interface MigrationSummary {
  totalTypes: number;
  supportedTypes: number;
  unsupportedTypes: number;
  details: Array<{
    postgresqlType: string;
    oracleType: string;
    status: 'supported' | 'unsupported' | 'partial';
    notes?: string;
  }>;
  warnings: string[];
  recommendations: string[];
}

// 類型映射配置
export interface TypeMapping {
  postgresql: PostgreSQLType;
  oracle: OracleType;
  defaultConstraints?: string[];
  requiresAdditionalObjects?: boolean;
  migrationComplexity: 'simple' | 'medium' | 'complex';
}

// 轉換上下文
export interface ConversionContext {
  sourceSchema: string;
  targetSchema: string;
  tableName: string;
  columnName: string;
  columnDefault?: any;
  isNullable: boolean;
  ordinalPosition: number;
}

// 資料庫版本資訊
export interface DatabaseVersion {
  postgresql: {
    major: number;
    minor: number;
    patch: number;
    full: string;
  };
  oracle: {
    major: number;
    minor: number;
    patch: number;
    edition: 'Standard' | 'Enterprise' | 'Express';
    full: string;
  };
}

// 轉換器配置
export interface ConverterConfig {
  strictMode: boolean;
  preserveComments: boolean;
  generateConstraints: boolean;
  validateValues: boolean;
  databaseVersions?: DatabaseVersion;
}

// 錯誤類型
export class ConversionError extends Error {
  constructor(
    message: string,
    public readonly postgresqlType: string,
    public readonly context?: ConversionContext
  ) {
    super(message);
    this.name = 'ConversionError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly value: any,
    public readonly expectedType: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}