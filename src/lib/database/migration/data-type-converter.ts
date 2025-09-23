/**
 * Data Type Converter
 * Task 2.1: 開發PostgreSQL到Oracle的資料類型轉換機制
 *
 * 功能:
 * - 實作UUID到VARCHAR2的轉換邏輯
 * - 建立JSONB到Oracle JSON型別的轉換功能
 * - 開發SERIAL到SEQUENCE和TRIGGER的替代機制
 * - 實作TIMESTAMP WITH TIME ZONE的時區處理
 * - 建立TEXT到VARCHAR2/CLOB的智慧轉換
 * - 實作BOOLEAN到NUMBER檢查約束的轉換
 */

import {
  type ConversionRule,
  type ConversionResult,
  type ConversionOptions,
  type ValueConversionResult,
  type MigrationSummary,
  ConversionError,
  ValidationError
} from './types';

export class DataTypeConverter {
  private rules: ConversionRule[] = [];

  constructor() {
    this.initializeConversionRules();
  }

  private initializeConversionRules(): void {
    this.rules = [
      // UUID轉換規則
      {
        postgresqlType: 'UUID',
        oracleType: 'VARCHAR2(36)',
        conversionLogic: (value: any) => this.convertUuidValue(value),
        validationRule: (value: any) => this.validateUuid(value),
        reversible: true,
        constraints: [
          'CHECK (LENGTH(column_name) = 36)',
          'CHECK (REGEXP_LIKE(column_name, \'^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$\'))'
        ],
        notes: 'UUID stored as uppercase VARCHAR2 with format validation'
      },

      // JSONB轉換規則
      {
        postgresqlType: 'JSONB',
        oracleType: 'JSON',
        conversionLogic: (value: any, options) => this.convertJsonValue(value, options),
        validationRule: (value: any) => this.validateJson(value),
        reversible: true,
        constraints: ['CHECK (column_name IS JSON)'],
        notes: 'JSONB converted to Oracle JSON type with validation'
      },

      // SERIAL轉換規則
      {
        postgresqlType: 'SERIAL',
        oracleType: 'NUMBER',
        conversionLogic: (value: any) => ({ success: true, convertedValue: value }),
        reversible: false,
        notes: 'SERIAL converted to NUMBER with SEQUENCE and TRIGGER'
      },

      // BIGSERIAL轉換規則
      {
        postgresqlType: 'BIGSERIAL',
        oracleType: 'NUMBER(19)',
        conversionLogic: (value: any) => ({ success: true, convertedValue: value }),
        reversible: false,
        notes: 'BIGSERIAL converted to NUMBER(19) with SEQUENCE and TRIGGER'
      },

      // TIMESTAMP WITH TIME ZONE轉換規則
      {
        postgresqlType: 'TIMESTAMP WITH TIME ZONE',
        oracleType: 'TIMESTAMP',
        conversionLogic: (value: any) => this.convertTimestampValue(value),
        reversible: false,
        notes: 'Time zone information will be lost'
      },

      // TEXT轉換規則
      {
        postgresqlType: 'TEXT',
        oracleType: 'VARCHAR2(4000)',
        conversionLogic: (value: any) => ({ success: true, convertedValue: value }),
        reversible: true,
        notes: 'TEXT converted to VARCHAR2(4000), consider CLOB for large text'
      },

      // VARCHAR轉換規則
      {
        postgresqlType: 'VARCHAR',
        oracleType: 'VARCHAR2',
        conversionLogic: (value: any) => ({ success: true, convertedValue: value }),
        reversible: true,
        notes: 'VARCHAR converted to VARCHAR2 with same length'
      },

      // BOOLEAN轉換規則
      {
        postgresqlType: 'BOOLEAN',
        oracleType: 'NUMBER(1)',
        conversionLogic: (value: any) => this.convertBooleanValue(value),
        reversible: true,
        constraints: ['CHECK (column_name IN (0, 1))'],
        notes: 'BOOLEAN converted to NUMBER(1) with check constraint'
      }
    ];
  }

  convertType(
    postgresqlType: string,
    columnDefault: any,
    options: ConversionOptions
  ): ConversionResult {
    try {
      // 處理帶參數的類型（如 VARCHAR(255)）
      const baseType = this.extractBaseType(postgresqlType);
      const typeParams = this.extractTypeParameters(postgresqlType);

      // 查找轉換規則
      const rule = this.findConversionRule(baseType);
      if (!rule) {
        return {
          success: false,
          oracleType: '',
          error: `Unsupported type: ${postgresqlType}`
        };
      }

      let oracleType = rule.oracleType;
      const constraints: string[] = [];
      const migrationNotes: string[] = [];
      let additionalObjects: ConversionResult['additionalObjects'];

      // 處理特殊情況
      switch (baseType.toUpperCase()) {
        case 'JSONB':
          // 檢查Oracle版本，舊版本使用CLOB
          if (options.oracleVersion === '19c') {
            oracleType = 'CLOB';
          }
          break;

        case 'TEXT':
          if (options.preferClob) {
            oracleType = 'CLOB';
          }
          break;

        case 'VARCHAR':
          if (typeParams && typeParams.length > 0) {
            const length = parseInt(typeParams[0]);
            if (length > 4000) {
              oracleType = 'CLOB';
              migrationNotes.push('Converted to CLOB due to size');
            } else {
              oracleType = `VARCHAR2(${length})`;
            }
          }
          break;

        case 'SERIAL':
        case 'BIGSERIAL':
          if (options.tableName && options.columnName) {
            additionalObjects = this.generateSerialObjects(
              options.tableName,
              options.columnName,
              baseType === 'BIGSERIAL'
            );
          }
          break;

        case 'BOOLEAN':
          if (options.columnName) {
            // 替換約束中的column_name
            constraints.push(`CHECK (${options.columnName} IN (0, 1))`);
          }
          break;
      }

      // 添加基本約束
      if (rule.constraints) {
        rule.constraints.forEach(constraint => {
          if (options.columnName) {
            constraints.push(constraint.replace('column_name', options.columnName));
          } else {
            constraints.push(constraint);
          }
        });
      }

      // 添加遷移註釋
      if (rule.notes) {
        migrationNotes.push(rule.notes);
      }

      return {
        success: true,
        oracleType,
        constraints: constraints.length > 0 ? constraints : undefined,
        additionalObjects,
        migrationNotes: migrationNotes.length > 0 ? migrationNotes : undefined
      };

    } catch (error) {
      return {
        success: false,
        oracleType: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  convertValue(
    value: any,
    postgresqlType: string,
    oracleType: string
  ): ValueConversionResult {
    try {
      if (value === null || value === undefined) {
        return { success: true, convertedValue: null };
      }

      const baseType = this.extractBaseType(postgresqlType);
      const rule = this.findConversionRule(baseType);

      if (!rule) {
        return {
          success: false,
          convertedValue: null,
          error: `No conversion rule for type: ${postgresqlType}`
        };
      }

      return rule.conversionLogic(value);

    } catch (error) {
      return {
        success: false,
        convertedValue: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  getAllConversionRules(): ConversionRule[] {
    return [...this.rules];
  }

  isReversible(postgresqlType: string, oracleType: string): boolean {
    const baseType = this.extractBaseType(postgresqlType);
    const rule = this.findConversionRule(baseType);
    return rule ? rule.reversible : false;
  }

  reverseConvert(
    value: any,
    oracleType: string,
    postgresqlType: string
  ): ValueConversionResult {
    try {
      if (value === null || value === undefined) {
        return { success: true, convertedValue: null };
      }

      const baseType = this.extractBaseType(postgresqlType);

      switch (baseType.toUpperCase()) {
        case 'UUID':
          return {
            success: true,
            convertedValue: value.toString().toLowerCase()
          };

        case 'BOOLEAN':
          return {
            success: true,
            convertedValue: value === 1 ? true : false
          };

        default:
          return { success: true, convertedValue: value };
      }

    } catch (error) {
      return {
        success: false,
        convertedValue: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  generateMigrationSummary(types: string[]): MigrationSummary {
    const details: MigrationSummary['details'] = [];
    let supportedCount = 0;
    let unsupportedCount = 0;

    types.forEach(type => {
      const baseType = this.extractBaseType(type);
      const rule = this.findConversionRule(baseType);

      if (rule) {
        details.push({
          postgresqlType: type,
          oracleType: rule.oracleType,
          status: 'supported',
          notes: rule.notes
        });
        supportedCount++;
      } else {
        details.push({
          postgresqlType: type,
          oracleType: 'N/A',
          status: 'unsupported',
          notes: 'No conversion rule available'
        });
        unsupportedCount++;
      }
    });

    return {
      totalTypes: types.length,
      supportedTypes: supportedCount,
      unsupportedTypes: unsupportedCount,
      details,
      warnings: [],
      recommendations: []
    };
  }

  // 私有方法

  private findConversionRule(postgresqlType: string): ConversionRule | undefined {
    return this.rules.find(rule =>
      rule.postgresqlType.toUpperCase() === postgresqlType.toUpperCase()
    );
  }

  private extractBaseType(typeString: string): string {
    // 提取基本類型名稱，移除參數
    const match = typeString.match(/^([A-Za-z\s]+)/);
    return match ? match[1].trim() : typeString;
  }

  private extractTypeParameters(typeString: string): string[] {
    // 提取類型參數
    const match = typeString.match(/\(([^)]+)\)/);
    if (match) {
      return match[1].split(',').map(param => param.trim());
    }
    return [];
  }

  private convertUuidValue(value: any): ValueConversionResult {
    if (typeof value === 'string') {
      if (this.validateUuid(value)) {
        return {
          success: true,
          convertedValue: value.toUpperCase()
        };
      } else {
        return {
          success: false,
          convertedValue: null,
          error: 'Invalid UUID format'
        };
      }
    }

    return {
      success: false,
      convertedValue: null,
      error: 'UUID value must be a string'
    };
  }

  private validateUuid(value: any): boolean {
    if (typeof value !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  private convertJsonValue(value: any, options?: ConversionOptions): ValueConversionResult {
    try {
      let jsonString: string;

      if (typeof value === 'string') {
        // 驗證JSON格式
        JSON.parse(value);
        jsonString = value;
      } else if (typeof value === 'object') {
        jsonString = JSON.stringify(value);
      } else {
        return {
          success: false,
          convertedValue: null,
          error: 'JSON value must be string or object'
        };
      }

      return {
        success: true,
        convertedValue: jsonString
      };

    } catch (error) {
      return {
        success: false,
        convertedValue: null,
        error: 'Invalid JSON format'
      };
    }
  }

  private validateJson(value: any): boolean {
    try {
      if (typeof value === 'string') {
        JSON.parse(value);
        return true;
      } else if (typeof value === 'object') {
        JSON.stringify(value);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private convertTimestampValue(value: any): ValueConversionResult {
    try {
      if (typeof value === 'string') {
        // 處理特殊函數
        if (value.toUpperCase() === 'NOW()') {
          return {
            success: true,
            convertedValue: 'SYSTIMESTAMP'
          };
        }

        // 解析帶時區的時間戳
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return {
            success: false,
            convertedValue: null,
            error: 'Invalid timestamp format'
          };
        }

        // 轉換為UTC格式
        const utcString = date.toISOString().replace('T', ' ').replace('Z', '');
        return {
          success: true,
          convertedValue: utcString.substring(0, 19) // 移除毫秒部分
        };
      }

      return {
        success: true,
        convertedValue: value
      };

    } catch (error) {
      return {
        success: false,
        convertedValue: null,
        error: 'Error converting timestamp'
      };
    }
  }

  private convertBooleanValue(value: any): ValueConversionResult {
    try {
      if (typeof value === 'boolean') {
        return {
          success: true,
          convertedValue: value ? 1 : 0
        };
      }

      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        if (lowerValue === 'true' || lowerValue === 't' || lowerValue === '1') {
          return { success: true, convertedValue: 1 };
        } else if (lowerValue === 'false' || lowerValue === 'f' || lowerValue === '0') {
          return { success: true, convertedValue: 0 };
        }
      }

      if (typeof value === 'number') {
        return {
          success: true,
          convertedValue: value !== 0 ? 1 : 0
        };
      }

      return {
        success: false,
        convertedValue: null,
        error: 'Invalid boolean value'
      };

    } catch (error) {
      return {
        success: false,
        convertedValue: null,
        error: 'Error converting boolean value'
      };
    }
  }

  private generateSerialObjects(
    tableName: string,
    columnName: string,
    isBigSerial: boolean = false
  ): NonNullable<ConversionResult['additionalObjects']> {
    const sequenceName = `${tableName}_${columnName}_seq`;
    const triggerName = `${tableName}_${columnName}_trg`;

    const sequence = `CREATE SEQUENCE ${sequenceName}
  START WITH 1
  INCREMENT BY 1
  NOCACHE
  ${isBigSerial ? 'MAXVALUE 9223372036854775807' : 'MAXVALUE 2147483647'}`;

    const trigger = `CREATE OR REPLACE TRIGGER ${triggerName}
  BEFORE INSERT ON ${tableName}
  FOR EACH ROW
BEGIN
  IF :NEW.${columnName} IS NULL THEN
    :NEW.${columnName} := ${sequenceName}.NEXTVAL;
  END IF;
END;`;

    return { sequence, trigger };
  }
}