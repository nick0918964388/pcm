/**
 * Data Type Converter Tests
 * Task 2.1: 開發PostgreSQL到Oracle的資料類型轉換機制
 *
 * 測試目標:
 * - 實作UUID到VARCHAR2的轉換邏輯
 * - 建立JSONB到Oracle JSON型別的轉換功能
 * - 開發SERIAL到SEQUENCE和TRIGGER的替代機制
 * - 實作TIMESTAMP WITH TIME ZONE的時區處理
 * - 建立TEXT到VARCHAR2/CLOB的智慧轉換
 * - 實作BOOLEAN到NUMBER檢查約束的轉換
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataTypeConverter } from '../data-type-converter';
import type {
  ConversionRule,
  ConversionResult,
  PostgreSQLType,
  OracleType,
  ConversionOptions,
} from '../types';

describe('Data Type Converter', () => {
  let converter: DataTypeConverter;

  beforeEach(() => {
    converter = new DataTypeConverter();
  });

  describe('UUID to VARCHAR2 Conversion', () => {
    it('should convert PostgreSQL UUID to Oracle VARCHAR2(36)', () => {
      const result = converter.convertType('UUID', null, {});

      expect(result.success).toBe(true);
      expect(result.oracleType).toBe('VARCHAR2(36)');
      expect(result.constraints).toContain('CHECK (LENGTH(column_name) = 36)');
      expect(result.constraints).toContain(
        "CHECK (REGEXP_LIKE(column_name, '^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$'))"
      );
    });

    it('should convert UUID values correctly', () => {
      const testUuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = converter.convertValue(testUuid, 'UUID', 'VARCHAR2(36)');

      expect(result.success).toBe(true);
      expect(result.convertedValue).toBe(testUuid.toUpperCase());
    });

    it('should validate UUID format', () => {
      const invalidUuid = 'invalid-uuid';
      const result = converter.convertValue(
        invalidUuid,
        'UUID',
        'VARCHAR2(36)'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid UUID format');
    });

    it('should handle null UUID values', () => {
      const result = converter.convertValue(null, 'UUID', 'VARCHAR2(36)');

      expect(result.success).toBe(true);
      expect(result.convertedValue).toBeNull();
    });
  });

  describe('JSONB to Oracle JSON Conversion', () => {
    it('should convert PostgreSQL JSONB to Oracle JSON type', () => {
      const result = converter.convertType('JSONB', null, {});

      expect(result.success).toBe(true);
      expect(result.oracleType).toBe('JSON');
      expect(result.constraints).toContain('CHECK (column_name IS JSON)');
    });

    it('should fallback to CLOB for older Oracle versions', () => {
      const result = converter.convertType('JSONB', null, {
        oracleVersion: '19c',
      });

      expect(result.success).toBe(true);
      expect(result.oracleType).toBe('CLOB');
      expect(result.constraints).toContain('CHECK (column_name IS JSON)');
    });

    it('should convert JSONB values to JSON strings', () => {
      const testJson = { name: 'test', value: 123, nested: { flag: true } };
      const result = converter.convertValue(testJson, 'JSONB', 'JSON');

      expect(result.success).toBe(true);
      expect(typeof result.convertedValue).toBe('string');
      expect(JSON.parse(result.convertedValue as string)).toEqual(testJson);
    });

    it('should handle JSON string inputs', () => {
      const jsonString = '{"name":"test","value":123}';
      const result = converter.convertValue(jsonString, 'JSONB', 'JSON');

      expect(result.success).toBe(true);
      expect(result.convertedValue).toBe(jsonString);
    });

    it('should validate JSON format', () => {
      const invalidJson = '{ invalid json }';
      const result = converter.convertValue(invalidJson, 'JSONB', 'JSON');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON format');
    });
  });

  describe('SERIAL to SEQUENCE and TRIGGER Conversion', () => {
    it('should convert PostgreSQL SERIAL to Oracle NUMBER with SEQUENCE', () => {
      const result = converter.convertType('SERIAL', null, {
        tableName: 'users',
        columnName: 'id',
      });

      expect(result.success).toBe(true);
      expect(result.oracleType).toBe('NUMBER');
      expect(result.additionalObjects).toBeDefined();
      expect(result.additionalObjects?.sequence).toBeDefined();
      expect(result.additionalObjects?.trigger).toBeDefined();
    });

    it('should generate proper sequence DDL', () => {
      const result = converter.convertType('SERIAL', null, {
        tableName: 'users',
        columnName: 'id',
      });

      const sequenceDDL = result.additionalObjects?.sequence;
      expect(sequenceDDL).toContain('CREATE SEQUENCE users_id_seq');
      expect(sequenceDDL).toContain('START WITH 1');
      expect(sequenceDDL).toContain('INCREMENT BY 1');
      expect(sequenceDDL).toContain('NOCACHE');
    });

    it('should generate proper trigger DDL for auto-increment', () => {
      const result = converter.convertType('SERIAL', null, {
        tableName: 'users',
        columnName: 'id',
      });

      const triggerDDL = result.additionalObjects?.trigger;
      expect(triggerDDL).toContain('CREATE OR REPLACE TRIGGER users_id_trg');
      expect(triggerDDL).toContain('BEFORE INSERT ON users');
      expect(triggerDDL).toContain('users_id_seq.NEXTVAL');
    });

    it('should handle BIGSERIAL conversion', () => {
      const result = converter.convertType('BIGSERIAL', null, {
        tableName: 'logs',
        columnName: 'id',
      });

      expect(result.success).toBe(true);
      expect(result.oracleType).toBe('NUMBER(19)');
    });
  });

  describe('TIMESTAMP WITH TIME ZONE Conversion', () => {
    it('should convert PostgreSQL TIMESTAMPTZ to Oracle TIMESTAMP', () => {
      const result = converter.convertType(
        'TIMESTAMP WITH TIME ZONE',
        null,
        {}
      );

      expect(result.success).toBe(true);
      expect(result.oracleType).toBe('TIMESTAMP');
      expect(result.migrationNotes).toContain(
        'Time zone information will be lost'
      );
    });

    it('should convert timestamptz values to UTC', () => {
      const testTimestamp = '2023-12-01 10:30:00+08:00';
      const result = converter.convertValue(
        testTimestamp,
        'TIMESTAMP WITH TIME ZONE',
        'TIMESTAMP'
      );

      expect(result.success).toBe(true);
      // Should convert to UTC
      expect(result.convertedValue).toBe('2023-12-01 02:30:00');
    });

    it('should handle current timestamp functions', () => {
      const result = converter.convertValue(
        'NOW()',
        'TIMESTAMP WITH TIME ZONE',
        'TIMESTAMP'
      );

      expect(result.success).toBe(true);
      expect(result.convertedValue).toBe('SYSTIMESTAMP');
    });
  });

  describe('TEXT to VARCHAR2/CLOB Conversion', () => {
    it('should convert PostgreSQL TEXT to VARCHAR2 by default', () => {
      const result = converter.convertType('TEXT', null, {});

      expect(result.success).toBe(true);
      expect(result.oracleType).toBe('VARCHAR2(4000)');
    });

    it('should convert to CLOB when specified', () => {
      const result = converter.convertType('TEXT', null, { preferClob: true });

      expect(result.success).toBe(true);
      expect(result.oracleType).toBe('CLOB');
    });

    it('should handle VARCHAR with length specifications', () => {
      const result = converter.convertType('VARCHAR(255)', null, {});

      expect(result.success).toBe(true);
      expect(result.oracleType).toBe('VARCHAR2(255)');
    });

    it('should suggest CLOB for large VARCHAR', () => {
      const result = converter.convertType('VARCHAR(10000)', null, {});

      expect(result.success).toBe(true);
      expect(result.oracleType).toBe('CLOB');
      expect(result.migrationNotes).toContain('Converted to CLOB due to size');
    });
  });

  describe('BOOLEAN to NUMBER Conversion', () => {
    it('should convert PostgreSQL BOOLEAN to Oracle NUMBER(1)', () => {
      const result = converter.convertType('BOOLEAN', null, {
        columnName: 'is_active',
      });

      expect(result.success).toBe(true);
      expect(result.oracleType).toBe('NUMBER(1)');
      expect(result.constraints).toContain('CHECK (is_active IN (0, 1))');
    });

    it('should convert boolean values to numbers', () => {
      const trueResult = converter.convertValue(true, 'BOOLEAN', 'NUMBER(1)');
      const falseResult = converter.convertValue(false, 'BOOLEAN', 'NUMBER(1)');

      expect(trueResult.success).toBe(true);
      expect(trueResult.convertedValue).toBe(1);

      expect(falseResult.success).toBe(true);
      expect(falseResult.convertedValue).toBe(0);
    });

    it('should handle string boolean values', () => {
      const trueResult = converter.convertValue('true', 'BOOLEAN', 'NUMBER(1)');
      const falseResult = converter.convertValue(
        'false',
        'BOOLEAN',
        'NUMBER(1)'
      );

      expect(trueResult.success).toBe(true);
      expect(trueResult.convertedValue).toBe(1);

      expect(falseResult.success).toBe(true);
      expect(falseResult.convertedValue).toBe(0);
    });
  });

  describe('Advanced Conversion Features', () => {
    it('should provide conversion rules for all supported types', () => {
      const rules = converter.getAllConversionRules();

      expect(rules).toBeDefined();
      expect(rules.length).toBeGreaterThan(0);

      const uuidRule = rules.find(r => r.postgresqlType === 'UUID');
      expect(uuidRule).toBeDefined();
      expect(uuidRule?.oracleType).toBe('VARCHAR2(36)');
    });

    it('should handle unsupported type conversions gracefully', () => {
      const result = converter.convertType('CUSTOM_TYPE', null, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported type');
    });

    it('should provide reverse conversion capabilities', () => {
      const canReverse = converter.isReversible('UUID', 'VARCHAR2(36)');
      expect(canReverse).toBe(true);

      const reverseResult = converter.reverseConvert(
        '123E4567-E89B-12D3-A456-426614174000',
        'VARCHAR2(36)',
        'UUID'
      );
      expect(reverseResult.success).toBe(true);
    });

    it('should generate migration summary', () => {
      const types = ['UUID', 'JSONB', 'SERIAL', 'BOOLEAN', 'TEXT'];
      const summary = converter.generateMigrationSummary(types);

      expect(summary.totalTypes).toBe(types.length);
      expect(summary.supportedTypes).toBe(types.length);
      expect(summary.unsupportedTypes).toBe(0);
      expect(summary.details).toBeDefined();
    });
  });
});
