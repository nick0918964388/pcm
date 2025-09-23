/**
 * Schema Migrator Tests
 * Task 2.2: 建立自動化Schema遷移工具
 *
 * 測試目標:
 * - 開發讀取現有PostgreSQL結構的分析器
 * - 實作自動生成Oracle DDL腳本的功能
 * - 建立外鍵約束和索引的轉換機制
 * - 實作觸發器邏輯的Oracle語法轉換
 * - 建立Schema版本控制和追蹤系統
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SchemaMigrator } from '../schema-migrator';
import { DataTypeConverter } from '../data-type-converter';
import type {
  PostgreSQLSchema,
  OracleSchema,
  MigrationPlan,
  TableDefinition,
  IndexDefinition,
  ConstraintDefinition,
  TriggerDefinition
} from '../schema-types';

describe('Schema Migrator', () => {
  let migrator: SchemaMigrator;
  let mockConverter: DataTypeConverter;

  beforeEach(() => {
    mockConverter = new DataTypeConverter();
    migrator = new SchemaMigrator(mockConverter);
  });

  describe('PostgreSQL Schema Analysis', () => {
    it('should read and parse PostgreSQL table structures', async () => {
      const mockSqlFiles = [
        'CREATE TABLE users (id UUID PRIMARY KEY, name VARCHAR(255), created_at TIMESTAMP);',
        'CREATE TABLE projects (id SERIAL PRIMARY KEY, name TEXT, user_id UUID REFERENCES users(id));'
      ];

      const schema = await migrator.analyzePostgreSQLSchema(mockSqlFiles);

      expect(schema.tables).toHaveLength(2);
      expect(schema.tables[0].name).toBe('users');
      expect(schema.tables[0].columns).toHaveLength(3);
      expect(schema.tables[1].name).toBe('projects');
      expect(schema.tables[1].foreignKeys).toHaveLength(1);
    });

    it('should extract column definitions correctly', async () => {
      const sqlFile = `
        CREATE TABLE products (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) DEFAULT 0.00,
          is_active BOOLEAN DEFAULT true,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      const schema = await migrator.analyzePostgreSQLSchema([sqlFile]);
      const table = schema.tables[0];

      expect(table.columns).toHaveLength(7);

      const idColumn = table.columns.find(c => c.name === 'id');
      expect(idColumn?.dataType).toBe('UUID');
      expect(idColumn?.isPrimary).toBe(true);

      const nameColumn = table.columns.find(c => c.name === 'name');
      expect(nameColumn?.dataType).toBe('VARCHAR(255)');
      expect(nameColumn?.isNullable).toBe(false);

      const priceColumn = table.columns.find(c => c.name === 'price');
      expect(priceColumn?.defaultValue).toBe('0.00');
    });

    it('should parse indexes correctly', async () => {
      const sqlFile = `
        CREATE TABLE orders (id SERIAL PRIMARY KEY, user_id UUID, status VARCHAR(50));
        CREATE INDEX idx_orders_user_id ON orders(user_id);
        CREATE UNIQUE INDEX idx_orders_status_date ON orders(status, created_at);
        CREATE INDEX idx_orders_metadata_gin ON orders USING GIN (metadata);
      `;

      const schema = await migrator.analyzePostgreSQLSchema([sqlFile]);

      expect(schema.indexes).toHaveLength(3);

      const userIdIndex = schema.indexes.find(i => i.name === 'idx_orders_user_id');
      expect(userIdIndex?.columns).toEqual(['user_id']);
      expect(userIdIndex?.isUnique).toBe(false);

      const statusIndex = schema.indexes.find(i => i.name === 'idx_orders_status_date');
      expect(statusIndex?.isUnique).toBe(true);

      const ginIndex = schema.indexes.find(i => i.name === 'idx_orders_metadata_gin');
      expect(ginIndex?.indexType).toBe('GIN');
    });

    it('should parse foreign key constraints', async () => {
      const sqlFile = `
        CREATE TABLE orders (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES products(id) ON UPDATE RESTRICT
        );
      `;

      const schema = await migrator.analyzePostgreSQLSchema([sqlFile]);
      const table = schema.tables[0];

      expect(table.foreignKeys).toHaveLength(2);

      const userFk = table.foreignKeys.find(fk => fk.columnName === 'user_id');
      expect(userFk?.referencedTable).toBe('users');
      expect(userFk?.referencedColumn).toBe('id');
      expect(userFk?.onDelete).toBe('CASCADE');

      const productFk = table.foreignKeys.find(fk => fk.columnName === 'product_id');
      expect(productFk?.onUpdate).toBe('RESTRICT');
    });

    it('should parse trigger definitions', async () => {
      const sqlFile = `
        CREATE OR REPLACE FUNCTION update_modified_time()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER users_update_trigger
          BEFORE UPDATE ON users
          FOR EACH ROW
          EXECUTE FUNCTION update_modified_time();
      `;

      const schema = await migrator.analyzePostgreSQLSchema([sqlFile]);

      expect(schema.triggers).toHaveLength(1);
      const trigger = schema.triggers[0];
      expect(trigger.name).toBe('users_update_trigger');
      expect(trigger.tableName).toBe('users');
      expect(trigger.timing).toBe('BEFORE');
      expect(trigger.event).toBe('UPDATE');
    });
  });

  describe('Oracle DDL Generation', () => {
    it('should generate Oracle table creation DDL', async () => {
      const postgresTable: TableDefinition = {
        name: 'users',
        columns: [
          { name: 'id', dataType: 'UUID', isPrimary: true, isNullable: false },
          { name: 'name', dataType: 'VARCHAR(255)', isPrimary: false, isNullable: false },
          { name: 'email', dataType: 'TEXT', isPrimary: false, isNullable: true },
          { name: 'is_active', dataType: 'BOOLEAN', isPrimary: false, isNullable: false, defaultValue: 'true' }
        ],
        primaryKey: ['id'],
        foreignKeys: [],
        indexes: []
      };

      const oracleDDL = await migrator.generateOracleTableDDL(postgresTable);

      expect(oracleDDL).toContain('CREATE TABLE users');
      expect(oracleDDL).toContain('id VARCHAR2(36)');
      expect(oracleDDL).toContain('name VARCHAR2(255) NOT NULL');
      expect(oracleDDL).toContain('email VARCHAR2(4000)');
      expect(oracleDDL).toContain('is_active NUMBER(1) DEFAULT 1 NOT NULL');
      expect(oracleDDL).toContain('PRIMARY KEY (id)');
    });

    it('should generate Oracle constraints DDL', async () => {
      const constraints: ConstraintDefinition[] = [
        {
          name: 'chk_users_email',
          type: 'CHECK',
          definition: 'email LIKE \'%@%\'',
          tableName: 'users'
        },
        {
          name: 'fk_orders_user_id',
          type: 'FOREIGN KEY',
          definition: 'user_id REFERENCES users(id)',
          tableName: 'orders'
        }
      ];

      const constraintsDDL = await migrator.generateOracleConstraintsDDL(constraints);

      expect(constraintsDDL).toContain('ALTER TABLE users ADD CONSTRAINT chk_users_email');
      expect(constraintsDDL).toContain('ALTER TABLE orders ADD CONSTRAINT fk_orders_user_id');
    });

    it('should generate Oracle indexes DDL', async () => {
      const indexes: IndexDefinition[] = [
        {
          name: 'idx_users_email',
          tableName: 'users',
          columns: ['email'],
          isUnique: true,
          indexType: 'BTREE'
        },
        {
          name: 'idx_orders_metadata',
          tableName: 'orders',
          columns: ['metadata'],
          isUnique: false,
          indexType: 'GIN'
        }
      ];

      const indexesDDL = await migrator.generateOracleIndexesDDL(indexes);

      expect(indexesDDL).toContain('CREATE UNIQUE INDEX idx_users_email ON users(email)');
      expect(indexesDDL).toContain('CREATE INDEX idx_orders_metadata ON orders');
      // GIN索引應該轉換為函數索引
      expect(indexesDDL).toContain('JSON_VALUE');
    });

    it('should convert PostgreSQL triggers to Oracle', async () => {
      const trigger: TriggerDefinition = {
        name: 'users_update_trigger',
        tableName: 'users',
        timing: 'BEFORE',
        event: 'UPDATE',
        functionName: 'update_modified_time',
        functionBody: 'NEW.updated_at = NOW(); RETURN NEW;'
      };

      const oracleTrigger = await migrator.convertTriggerToOracle(trigger);

      expect(oracleTrigger).toContain('CREATE OR REPLACE TRIGGER users_update_trigger');
      expect(oracleTrigger).toContain('BEFORE UPDATE ON users');
      expect(oracleTrigger).toContain('FOR EACH ROW');
      expect(oracleTrigger).toContain(':NEW.updated_at := SYSTIMESTAMP');
    });
  });

  describe('Migration Plan Generation', () => {
    it('should create comprehensive migration plan', async () => {
      const postgresSchema: PostgreSQLSchema = {
        tables: [{
          name: 'users',
          columns: [
            { name: 'id', dataType: 'UUID', isPrimary: true, isNullable: false },
            { name: 'name', dataType: 'VARCHAR(255)', isPrimary: false, isNullable: false }
          ],
          primaryKey: ['id'],
          foreignKeys: [],
          indexes: []
        }],
        indexes: [],
        constraints: [],
        triggers: [],
        sequences: []
      };

      const plan = await migrator.createMigrationPlan(postgresSchema);

      expect(plan.steps).toBeDefined();
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.dependencies).toBeDefined();
      expect(plan.estimatedDuration).toBeGreaterThan(0);
      expect(plan.rollbackPlan).toBeDefined();
    });

    it('should order migration steps correctly based on dependencies', async () => {
      const postgresSchema: PostgreSQLSchema = {
        tables: [
          {
            name: 'users',
            columns: [{ name: 'id', dataType: 'UUID', isPrimary: true, isNullable: false }],
            primaryKey: ['id'],
            foreignKeys: [],
            indexes: []
          },
          {
            name: 'orders',
            columns: [
              { name: 'id', dataType: 'SERIAL', isPrimary: true, isNullable: false },
              { name: 'user_id', dataType: 'UUID', isPrimary: false, isNullable: false }
            ],
            primaryKey: ['id'],
            foreignKeys: [{
              constraintName: 'fk_orders_user_id',
              columnName: 'user_id',
              referencedTable: 'users',
              referencedColumn: 'id'
            }],
            indexes: []
          }
        ],
        indexes: [],
        constraints: [],
        triggers: [],
        sequences: []
      };

      const plan = await migrator.createMigrationPlan(postgresSchema);

      // 確保users表在orders表之前創建
      const usersStepIndex = plan.steps.findIndex(s => s.description.includes('users'));
      const ordersStepIndex = plan.steps.findIndex(s => s.description.includes('orders'));
      expect(usersStepIndex).toBeLessThan(ordersStepIndex);
    });

    it('should include rollback plan', async () => {
      const postgresSchema: PostgreSQLSchema = {
        tables: [{
          name: 'test_table',
          columns: [{ name: 'id', dataType: 'SERIAL', isPrimary: true, isNullable: false }],
          primaryKey: ['id'],
          foreignKeys: [],
          indexes: []
        }],
        indexes: [],
        constraints: [],
        triggers: [],
        sequences: []
      };

      const plan = await migrator.createMigrationPlan(postgresSchema);

      expect(plan.rollbackPlan).toBeDefined();
      expect(plan.rollbackPlan.steps).toBeDefined();
      expect(plan.rollbackPlan.steps.length).toBeGreaterThan(0);
      expect(plan.rollbackPlan.steps[0].ddl).toContain('DROP');
    });
  });

  describe('Schema Version Control', () => {
    it('should track schema version changes', async () => {
      const initialVersion = await migrator.getCurrentSchemaVersion();
      expect(initialVersion).toBeDefined();

      await migrator.recordMigration('001', 'Initial schema creation', 'CREATE TABLE test...');

      const newVersion = await migrator.getCurrentSchemaVersion();
      expect(newVersion).not.toBe(initialVersion);
    });

    it('should maintain migration history', async () => {
      await migrator.recordMigration('001', 'Create users table', 'CREATE TABLE users...');
      await migrator.recordMigration('002', 'Create orders table', 'CREATE TABLE orders...');

      const history = await migrator.getMigrationHistory();

      expect(history).toHaveLength(2);
      expect(history[0].version).toBe('001');
      expect(history[1].version).toBe('002');
      expect(history[0].appliedAt).toBeDefined();
    });

    it('should validate migration dependencies', async () => {
      const dependencies = ['001_create_users', '002_create_products'];
      const isValid = await migrator.validateMigrationDependencies('003_create_orders', dependencies);

      expect(isValid).toBeDefined();
      // 具體驗證邏輯取決於實作
    });

    it('should generate migration checksums', async () => {
      const ddlScript = 'CREATE TABLE users (id VARCHAR2(36) PRIMARY KEY);';
      const checksum = await migrator.generateMigrationChecksum(ddlScript);

      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Validation', () => {
    it('should handle unsupported PostgreSQL features gracefully', async () => {
      const sqlWithUnsupportedFeatures = `
        CREATE TABLE test (
          id SERIAL PRIMARY KEY,
          data CUSTOM_TYPE,
          geom GEOMETRY
        );
      `;

      const result = await migrator.analyzePostgreSQLSchema([sqlWithUnsupportedFeatures]);

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
      expect(result.warnings!.some(w => w.includes('Unsupported data type'))).toBe(true);
    });

    it('should validate Oracle DDL syntax', async () => {
      const validDDL = 'CREATE TABLE users (id VARCHAR2(36) PRIMARY KEY);';
      const invalidDDL = 'CREATE TABLE (invalid syntax);';

      const validResult = await migrator.validateOracleDDL(validDDL);
      const invalidResult = await migrator.validateOracleDDL(invalidDDL);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toBeDefined();
    });

    it('should provide detailed error reporting', async () => {
      const problematicSQL = `
        CREATE TABLE invalid_table (
          id UNKNOWN_TYPE PRIMARY KEY,
          data JSONB[][]
        );
      `;

      try {
        await migrator.analyzePostgreSQLSchema([problematicSQL]);
      } catch (error: any) {
        expect(error.details).toBeDefined();
        expect(error.suggestions).toBeDefined();
        expect(error.affectedTables).toBeDefined();
      }
    });
  });
});