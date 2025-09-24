import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';

// Mock fs
vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(),
    readdirSync: vi.fn(() => ['01-create-schema.sql', '02-create-indexes.sql']),
    existsSync: vi.fn(() => true),
  },
  readFileSync: vi.fn(),
  readdirSync: vi.fn(() => ['01-create-schema.sql', '02-create-indexes.sql']),
  existsSync: vi.fn(() => true),
}));

// Mock oracledb
const mockConnection = {
  execute: vi.fn(),
  close: vi.fn(),
  commit: vi.fn(),
};

vi.mock('oracledb', () => ({
  default: {
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
    createPool: vi.fn(),
    executeMany: vi.fn(),
    BIND_OUT: 'BIND_OUT',
    NUMBER: 'NUMBER',
    STRING: 'STRING',
  },
}));

describe('Oracle Migration Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockConnection.execute.mockResolvedValue({ rows: [] });
    vi.mocked(readFileSync).mockReturnValue('CREATE TABLE test (id NUMBER);');
  });

  describe('Schema Migration', () => {
    it('should execute migration scripts in order', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({ rows: [] }); // migration table check
      mockConnection.execute.mockResolvedValueOnce({ rows: [[0]] }); // script not executed check
      mockConnection.execute.mockResolvedValueOnce({ rows: [] }); // execute script
      mockConnection.execute.mockResolvedValueOnce({ rows: [] }); // record execution

      const { OracleMigrationManager } = await import(
        '../oracle-migration-manager'
      );
      const manager = new OracleMigrationManager();

      // When
      const result = await manager.executeMigrationScripts();

      // Then
      expect(result.success).toBe(true);
      expect(result.scriptsExecuted).toBeGreaterThan(0);
    });

    it('should handle migration script failures gracefully', async () => {
      // Given
      const oracledb = await import('oracledb');
      vi.mocked(oracledb.default.getConnection).mockRejectedValueOnce(
        new Error('Connection failed')
      );

      const { OracleMigrationManager } = await import(
        '../oracle-migration-manager'
      );
      const manager = new OracleMigrationManager();

      // When
      const result = await manager.executeMigrationScripts();

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection failed');
    });

    it('should track migration history', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({
        rows: [['script1.sql', new Date(), 1, null]],
      });

      const { OracleMigrationManager } = await import(
        '../oracle-migration-manager'
      );
      const manager = new OracleMigrationManager();

      // When
      const history = await manager.getMigrationHistory();

      // Then
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Version Control', () => {
    it('should check current schema version', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({
        rows: [['1.0.0']],
      });

      const { OracleMigrationManager } = await import(
        '../oracle-migration-manager'
      );
      const manager = new OracleMigrationManager();

      // When
      const version = await manager.getCurrentSchemaVersion();

      // Then
      expect(typeof version).toBe('string');
      expect(version).toMatch(/^\d+\.\d+\.\d+$/); // semver format
    });

    it('should update schema version after migration', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({ rows: [['1.0.0']] }); // getCurrentSchemaVersion
      mockConnection.execute.mockResolvedValueOnce({ rows: [] }); // update

      const { OracleMigrationManager } = await import(
        '../oracle-migration-manager'
      );
      const manager = new OracleMigrationManager();
      const newVersion = '1.1.0';

      // When
      const result = await manager.updateSchemaVersion(newVersion);

      // Then
      expect(result.success).toBe(true);
      expect(result.previousVersion).toBeDefined();
      expect(result.newVersion).toBe(newVersion);
    });
  });

  describe('Test Data Management', () => {
    it('should load test data into database', async () => {
      // Given
      vi.mocked(readFileSync).mockReturnValue(
        'INSERT INTO test VALUES (1);\nINSERT INTO test VALUES (2);'
      );

      const { OracleTestDataManager } = await import(
        '../oracle-migration-manager'
      );
      const manager = new OracleTestDataManager();

      // When
      const result = await manager.loadTestData();

      // Then
      expect(result.success).toBe(true);
      expect(result.tablesPopulated).toBeGreaterThan(0);
    });

    it('should clean test data from database', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({
        rows: [['TEST_TABLE'], ['ANOTHER_TABLE']],
      });

      const { OracleTestDataManager } = await import(
        '../oracle-migration-manager'
      );
      const manager = new OracleTestDataManager();

      // When
      const result = await manager.cleanTestData();

      // Then
      expect(result.success).toBe(true);
      expect(result.tablesCleaned).toBeGreaterThan(0);
    });

    it('should validate test data integrity', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({
        rows: [[5]], // count > 0 for system_info table
      });

      const { OracleTestDataManager } = await import(
        '../oracle-migration-manager'
      );
      const manager = new OracleTestDataManager();

      // When
      const result = await manager.validateTestData();

      // Then
      expect(result.isValid).toBe(true);
      expect(result.validationErrors).toHaveLength(0);
    });
  });

  describe('Database Maintenance Tools', () => {
    it('should analyze table statistics', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({
        rows: [['TEST_TABLE', 100, 5.2, new Date()]],
      });

      const { OracleMaintenanceTools } = await import(
        '../oracle-migration-manager'
      );
      const tools = new OracleMaintenanceTools();

      // When
      const stats = await tools.analyzeTableStatistics();

      // Then
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0]).toHaveProperty('tableName');
      expect(stats[0]).toHaveProperty('rowCount');
      expect(stats[0]).toHaveProperty('sizeInMB');
    });

    it('should update table statistics', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({
        rows: [['TEST_TABLE'], ['ANOTHER_TABLE']],
      });

      const { OracleMaintenanceTools } = await import(
        '../oracle-migration-manager'
      );
      const tools = new OracleMaintenanceTools();

      // When
      const result = await tools.updateTableStatistics();

      // Then
      expect(result.success).toBe(true);
      expect(result.tablesUpdated).toBeGreaterThan(0);
    });

    it('should rebuild indexes if needed', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({
        rows: [['IDX_TEST']], // one index needs rebuilding
      });

      const { OracleMaintenanceTools } = await import(
        '../oracle-migration-manager'
      );
      const tools = new OracleMaintenanceTools();

      // When
      const result = await tools.rebuildIndexes();

      // Then
      expect(result.success).toBe(true);
      expect(result.indexesRebuilt).toBeGreaterThanOrEqual(0);
    });
  });
});
