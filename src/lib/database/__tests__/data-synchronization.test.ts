import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock oracledb and pg
const mockOracleConnection = {
  execute: vi.fn(),
  close: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
};

const mockPgConnection = {
  query: vi.fn(),
  end: vi.fn(),
};

vi.mock('oracledb', () => ({
  default: {
    getConnection: vi.fn(() => Promise.resolve(mockOracleConnection)),
  },
}));

vi.mock('pg', () => ({
  Pool: vi.fn(() => mockPgConnection),
}));

describe('Data Synchronization and Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOracleConnection.execute.mockResolvedValue({ rows: [] });
    mockPgConnection.query.mockResolvedValue({ rows: [] });
  });

  describe('DataSynchronizer', () => {
    it('should synchronize data between PostgreSQL and Oracle', async () => {
      // Given
      mockPgConnection.query.mockResolvedValueOnce({
        rows: [
          { id: 'proj-1', name: 'Project 1', created_at: '2025-01-01' },
          { id: 'proj-2', name: 'Project 2', created_at: '2025-01-02' },
        ],
      });

      const { DataSynchronizer } = await import('../data-synchronization');
      const synchronizer = new DataSynchronizer();

      // When
      const result = await synchronizer.synchronizeTable(
        'projects',
        'postgresql-to-oracle'
      );

      // Then
      expect(result.success).toBe(true);
      expect(result.recordsSynchronized).toBeGreaterThan(0);
      expect(result.conflicts).toBeDefined();
    });

    it('should detect and handle data conflicts', async () => {
      // Given
      mockPgConnection.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'proj-1',
            name: 'Project Updated PG',
            updated_at: '2025-01-23 10:00:00',
          },
        ],
      });
      mockOracleConnection.execute.mockResolvedValueOnce({
        rows: [['proj-1', 'Project Updated Oracle', '2025-01-23 10:30:00']],
      });

      const { DataSynchronizer } = await import('../data-synchronization');
      const synchronizer = new DataSynchronizer();

      // When
      const result = await synchronizer.synchronizeTable(
        'projects',
        'bidirectional'
      );

      // Then
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0]).toHaveProperty('recordId');
      expect(result.conflicts[0]).toHaveProperty('conflictType');
      expect(result.conflicts[0]).toHaveProperty('resolution');
    });

    it('should perform incremental synchronization', async () => {
      // Given
      const lastSyncTime = new Date('2025-01-23 09:00:00');
      mockPgConnection.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'proj-3',
            name: 'New Project',
            created_at: '2025-01-23 10:00:00',
          },
        ],
      });

      const { DataSynchronizer } = await import('../data-synchronization');
      const synchronizer = new DataSynchronizer();

      // When
      const result = await synchronizer.incrementalSync(
        'projects',
        lastSyncTime
      );

      // Then
      expect(result.success).toBe(true);
      expect(result.recordsSynchronized).toBe(1);
      expect(result.lastSyncTime).toBeInstanceOf(Date);
    });

    it('should handle synchronization errors gracefully', async () => {
      // Given
      mockOracleConnection.execute.mockRejectedValueOnce(
        new Error('Oracle connection failed')
      );

      const { DataSynchronizer } = await import('../data-synchronization');
      const synchronizer = new DataSynchronizer();

      // When
      const result = await synchronizer.synchronizeTable(
        'projects',
        'postgresql-to-oracle'
      );

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toContain('Oracle connection failed');
    });
  });

  describe('ConsistencyChecker', () => {
    it('should check data consistency between databases', async () => {
      // Given
      mockPgConnection.query.mockResolvedValueOnce({
        rows: [{ count: '100' }],
      });
      mockOracleConnection.execute.mockResolvedValueOnce({ rows: [[100]] });

      const { ConsistencyChecker } = await import('../data-synchronization');
      const checker = new ConsistencyChecker();

      // When
      const result = await checker.checkTableConsistency('projects');

      // Then
      expect(result.tableName).toBe('projects');
      expect(result.isConsistent).toBe(true);
      expect(result.postgresqlCount).toBe(100);
      expect(result.oracleCount).toBe(100);
    });

    it('should detect data inconsistencies', async () => {
      // Given
      mockPgConnection.query.mockResolvedValueOnce({
        rows: [{ count: '100' }],
      });
      mockOracleConnection.execute.mockResolvedValueOnce({ rows: [[95]] });

      const { ConsistencyChecker } = await import('../data-synchronization');
      const checker = new ConsistencyChecker();

      // When
      const result = await checker.checkTableConsistency('projects');

      // Then
      expect(result.isConsistent).toBe(false);
      expect(result.postgresqlCount).toBe(100);
      expect(result.oracleCount).toBe(95);
      expect(result.discrepancies.length).toBeGreaterThan(0);
    });

    it('should perform comprehensive data validation', async () => {
      // Given
      const { ConsistencyChecker } = await import('../data-synchronization');
      const checker = new ConsistencyChecker();

      // When
      const result = await checker.validateAllTables();

      // Then
      expect(Array.isArray(result.tableResults)).toBe(true);
      expect(result.overallConsistency).toBeDefined();
      expect(result.checkedAt).toBeInstanceOf(Date);
      expect(result.summary).toBeDefined();
    });

    it('should identify missing records', async () => {
      // Given
      mockPgConnection.query.mockResolvedValueOnce({
        rows: [{ id: 'proj-1' }, { id: 'proj-2' }, { id: 'proj-3' }],
      });
      mockOracleConnection.execute.mockResolvedValueOnce({
        rows: [['proj-1'], ['proj-2']],
      });

      const { ConsistencyChecker } = await import('../data-synchronization');
      const checker = new ConsistencyChecker();

      // When
      const result = await checker.findMissingRecords('projects');

      // Then
      expect(result.missingInOracle.length).toBe(1);
      expect(result.missingInOracle[0]).toBe('proj-3');
      expect(result.missingInPostgresql.length).toBe(0);
    });
  });

  describe('ConflictResolver', () => {
    it('should resolve conflicts using timestamp strategy', async () => {
      // Given
      const conflict = {
        recordId: 'proj-1',
        conflictType: 'update_update' as const,
        postgresqlData: {
          id: 'proj-1',
          name: 'Project PG',
          updated_at: '2025-01-23 10:00:00',
        },
        oracleData: {
          id: 'proj-1',
          name: 'Project Oracle',
          updated_at: '2025-01-23 10:30:00',
        },
        resolution: 'latest_wins' as const,
      };

      const { ConflictResolver } = await import('../data-synchronization');
      const resolver = new ConflictResolver();

      // When
      const result = await resolver.resolveConflict(conflict);

      // Then
      expect(result.success).toBe(true);
      expect(result.resolvedData).toBeDefined();
      expect(result.chosenSource).toBe('oracle'); // Oracle has later timestamp
    });

    it('should resolve conflicts using custom rules', async () => {
      // Given
      const conflict = {
        recordId: 'proj-1',
        conflictType: 'update_update' as const,
        postgresqlData: { id: 'proj-1', priority: 'high' },
        oracleData: { id: 'proj-1', priority: 'low' },
        resolution: 'custom_rule' as const,
      };

      const customRule = (pgData: any, oracleData: any) => {
        return pgData.priority === 'high' ? pgData : oracleData;
      };

      const { ConflictResolver } = await import('../data-synchronization');
      const resolver = new ConflictResolver();

      // When
      const result = await resolver.resolveConflict(conflict, customRule);

      // Then
      expect(result.success).toBe(true);
      expect(result.chosenSource).toBe('postgresql');
    });

    it('should handle manual conflict resolution', async () => {
      // Given
      const conflict = {
        recordId: 'proj-1',
        conflictType: 'update_update' as const,
        postgresqlData: { id: 'proj-1', name: 'Project PG' },
        oracleData: { id: 'proj-1', name: 'Project Oracle' },
        resolution: 'manual' as const,
      };

      const { ConflictResolver } = await import('../data-synchronization');
      const resolver = new ConflictResolver();

      // When
      const result = await resolver.resolveConflict(conflict);

      // Then
      expect(result.success).toBe(false);
      expect(result.requiresManualIntervention).toBe(true);
    });
  });

  describe('SyncScheduler', () => {
    it('should schedule automatic synchronization', async () => {
      // Given
      const { SyncScheduler } = await import('../data-synchronization');
      const scheduler = new SyncScheduler();

      const scheduleConfig = {
        tables: ['projects', 'users'],
        interval: 'hourly' as const,
        direction: 'bidirectional' as const,
        conflictResolution: 'latest_wins' as const,
      };

      // When
      const result = await scheduler.scheduleSync(scheduleConfig);

      // Then
      expect(result.success).toBe(true);
      expect(result.scheduleId).toBeDefined();
      expect(result.nextRunTime).toBeInstanceOf(Date);
    });

    it('should execute scheduled synchronization', async () => {
      // Given
      const { SyncScheduler } = await import('../data-synchronization');
      const scheduler = new SyncScheduler();

      // When
      const result = await scheduler.executeScheduledSync('schedule-123');

      // Then
      expect(result.success).toBeDefined();
      expect(result.executedAt).toBeInstanceOf(Date);
      expect(result.syncResults).toBeDefined();
    });

    it('should handle scheduling errors', async () => {
      // Given
      const { SyncScheduler } = await import('../data-synchronization');
      const scheduler = new SyncScheduler();

      const invalidConfig = {
        tables: [],
        interval: 'invalid' as any,
        direction: 'bidirectional' as const,
        conflictResolution: 'latest_wins' as const,
      };

      // When
      const result = await scheduler.scheduleSync(invalidConfig);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('DataComparisonEngine', () => {
    it('should compare record-level data between databases', async () => {
      // Given
      const { DataComparisonEngine } = await import('../data-synchronization');
      const engine = new DataComparisonEngine();

      const postgresRecord = {
        id: 'proj-1',
        name: 'Project 1',
        status: 'active',
      };
      const oracleRecord = {
        id: 'proj-1',
        name: 'Project One',
        status: 'active',
      };

      // When
      const result = await engine.compareRecords(postgresRecord, oracleRecord);

      // Then
      expect(result.isIdentical).toBe(false);
      expect(result.differences.length).toBeGreaterThan(0);
      expect(result.differences[0]).toHaveProperty('field');
      expect(result.differences[0]).toHaveProperty('postgresqlValue');
      expect(result.differences[0]).toHaveProperty('oracleValue');
    });

    it('should identify schema differences', async () => {
      // Given
      mockPgConnection.query.mockResolvedValueOnce({
        rows: [
          { column_name: 'id', data_type: 'uuid' },
          { column_name: 'name', data_type: 'text' },
        ],
      });
      mockOracleConnection.execute.mockResolvedValueOnce({
        rows: [
          ['id', 'VARCHAR2(36)'],
          ['name', 'VARCHAR2(255)'],
        ],
      });

      const { DataComparisonEngine } = await import('../data-synchronization');
      const engine = new DataComparisonEngine();

      // When
      const result = await engine.compareTableSchemas('projects');

      // Then
      expect(result.tableName).toBe('projects');
      expect(result.isCompatible).toBeDefined();
      expect(result.differences).toBeDefined();
    });

    it('should generate detailed comparison reports', async () => {
      // Given
      const { DataComparisonEngine } = await import('../data-synchronization');
      const engine = new DataComparisonEngine();

      // When
      const report = await engine.generateComparisonReport([
        'projects',
        'users',
      ]);

      // Then
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.tablesCompared).toEqual(['projects', 'users']);
      expect(report.summary).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });
  });
});
