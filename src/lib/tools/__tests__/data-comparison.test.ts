import {
  DataComparisonTool,
  DatabaseConfig,
  CountComparisonResult,
  ContentComparisonResult,
  ComparisonReport,
  DatabaseConnection,
  TableMetadata,
} from '../data-comparison.types';
import { DataComparisonService } from '../data-comparison.service';

// Mock 資料庫連線
class MockDatabaseConnection implements DatabaseConnection {
  private mockData: Map<string, any[]> = new Map();
  private mockCounts: Map<string, number> = new Map();
  private mockMetadata: Map<string, TableMetadata> = new Map();
  private connected = false;

  constructor() {
    this.setupMockData();
  }

  private setupMockData() {
    // 設定測試用的 mock 資料
    this.mockCounts.set('users', 100);
    this.mockCounts.set('projects', 50);
    this.mockCounts.set('wbs_items', 200);

    this.mockData.set('users', [
      {
        id: '1',
        username: 'user1',
        email: 'user1@test.com',
        created_at: '2024-01-01',
      },
      {
        id: '2',
        username: 'user2',
        email: 'user2@test.com',
        created_at: '2024-01-02',
      },
    ]);

    this.mockMetadata.set('users', {
      name: 'users',
      schema: 'public',
      columns: [
        { name: 'id', dataType: 'varchar', isNullable: false },
        { name: 'username', dataType: 'varchar', isNullable: false },
        { name: 'email', dataType: 'varchar', isNullable: false },
        { name: 'created_at', dataType: 'timestamp', isNullable: false },
      ],
      primaryKeys: ['id'],
      indexes: [
        {
          name: 'users_pkey',
          columns: ['id'],
          isUnique: true,
          isPrimary: true,
        },
      ],
    });

    this.mockMetadata.set('projects', {
      name: 'projects',
      schema: 'public',
      columns: [
        { name: 'id', dataType: 'varchar', isNullable: false },
        { name: 'name', dataType: 'varchar', isNullable: false },
        { name: 'description', dataType: 'text', isNullable: true },
        { name: 'status', dataType: 'varchar', isNullable: false },
        { name: 'created_at', dataType: 'timestamp', isNullable: false },
      ],
      primaryKeys: ['id'],
      indexes: [
        {
          name: 'projects_pkey',
          columns: ['id'],
          isUnique: true,
          isPrimary: true,
        },
      ],
    });

    this.mockMetadata.set('empty_table', {
      name: 'empty_table',
      schema: 'public',
      columns: [{ name: 'id', dataType: 'varchar', isNullable: false }],
      primaryKeys: ['id'],
      indexes: [],
    });
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async executeQuery(query: string, params?: any[]): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    // 模擬計數查詢
    if (query.toLowerCase().includes('count(*)')) {
      const tableName = this.extractTableNameFromQuery(query);
      const count = this.mockCounts.get(tableName) || 0;
      return [{ count }];
    }

    // 模擬取樣查詢
    if (
      query.toLowerCase().includes('limit') ||
      query.toLowerCase().includes('rownum')
    ) {
      const tableName = this.extractTableNameFromQuery(query);
      return this.mockData.get(tableName) || [];
    }

    return [];
  }

  async getMetadata(tableName: string): Promise<TableMetadata> {
    const metadata = this.mockMetadata.get(tableName);
    if (!metadata) {
      throw new Error(`Table ${tableName} not found`);
    }
    return metadata;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private extractTableNameFromQuery(query: string): string {
    const match = query.match(/from\s+(\w+)/i);
    return match ? match[1] : '';
  }

  // 測試用的輔助方法
  setMockCount(tableName: string, count: number): void {
    this.mockCounts.set(tableName, count);
  }

  setMockData(tableName: string, data: any[]): void {
    this.mockData.set(tableName, data);
  }
}

describe('DataComparisonService', () => {
  let comparisonTool: DataComparisonTool;
  let mockSourceConnection: MockDatabaseConnection;
  let mockTargetConnection: MockDatabaseConnection;

  const sourceConfig: DatabaseConfig = {
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'pcm_source',
    username: 'test',
    password: 'test',
  };

  const targetConfig: DatabaseConfig = {
    type: 'oracle',
    host: 'localhost',
    port: 1521,
    database: 'pcm_target',
    username: 'test',
    password: 'test',
  };

  beforeEach(() => {
    mockSourceConnection = new MockDatabaseConnection();
    mockTargetConnection = new MockDatabaseConnection();
    comparisonTool = new DataComparisonService(
      mockSourceConnection,
      mockTargetConnection
    );
  });

  afterEach(async () => {
    if (mockSourceConnection.isConnected()) {
      await mockSourceConnection.disconnect();
    }
    if (mockTargetConnection.isConnected()) {
      await mockTargetConnection.disconnect();
    }
  });

  describe('資料計數比對', () => {
    it('應該正確比對相同計數的表格', async () => {
      // Arrange
      const tables = ['users', 'projects'];
      mockSourceConnection.setMockCount('users', 100);
      mockTargetConnection.setMockCount('users', 100);
      mockSourceConnection.setMockCount('projects', 50);
      mockTargetConnection.setMockCount('projects', 50);

      await mockSourceConnection.connect();
      await mockTargetConnection.connect();

      // Act
      const results = await comparisonTool.compareTableCounts(tables);

      // Assert
      expect(results).toHaveLength(2);

      const usersResult = results.find(r => r.tableName === 'users');
      expect(usersResult).toBeDefined();
      expect(usersResult!.sourceCount).toBe(100);
      expect(usersResult!.targetCount).toBe(100);
      expect(usersResult!.countMatch).toBe(true);
      expect(usersResult!.difference).toBe(0);
      expect(usersResult!.percentageDiff).toBe(0);

      const projectsResult = results.find(r => r.tableName === 'projects');
      expect(projectsResult).toBeDefined();
      expect(projectsResult!.sourceCount).toBe(50);
      expect(projectsResult!.targetCount).toBe(50);
      expect(projectsResult!.countMatch).toBe(true);
    });

    it('應該正確識別計數不匹配的表格', async () => {
      // Arrange
      const tables = ['users'];
      mockSourceConnection.setMockCount('users', 100);
      mockTargetConnection.setMockCount('users', 95);

      await mockSourceConnection.connect();
      await mockTargetConnection.connect();

      // Act
      const results = await comparisonTool.compareTableCounts(tables);

      // Assert
      expect(results).toHaveLength(1);

      const usersResult = results[0];
      expect(usersResult.tableName).toBe('users');
      expect(usersResult.sourceCount).toBe(100);
      expect(usersResult.targetCount).toBe(95);
      expect(usersResult.countMatch).toBe(false);
      expect(usersResult.difference).toBe(5);
      expect(usersResult.percentageDiff).toBeCloseTo(5.0, 1);
    });

    it('應該處理零計數的情況', async () => {
      // Arrange
      const tables = ['empty_table'];
      mockSourceConnection.setMockCount('empty_table', 0);
      mockTargetConnection.setMockCount('empty_table', 0);

      await mockSourceConnection.connect();
      await mockTargetConnection.connect();

      // Act
      const results = await comparisonTool.compareTableCounts(tables);

      // Assert
      expect(results).toHaveLength(1);

      const result = results[0];
      expect(result.sourceCount).toBe(0);
      expect(result.targetCount).toBe(0);
      expect(result.countMatch).toBe(true);
      expect(result.difference).toBe(0);
      expect(result.percentageDiff).toBe(0);
    });

    it('應該正確計算百分比差異', async () => {
      // Arrange
      const tables = ['test_table'];
      mockSourceConnection.setMockCount('test_table', 200);
      mockTargetConnection.setMockCount('test_table', 150);

      await mockSourceConnection.connect();
      await mockTargetConnection.connect();

      // Act
      const results = await comparisonTool.compareTableCounts(tables);

      // Assert
      const result = results[0];
      expect(result.difference).toBe(50);
      expect(result.percentageDiff).toBeCloseTo(25.0, 1); // (50/200) * 100 = 25%
    });

    it('應該在連線失敗時拋出錯誤', async () => {
      // Arrange
      const tables = ['users'];

      // Act & Assert
      await expect(comparisonTool.compareTableCounts(tables)).rejects.toThrow(
        'Database not connected'
      );
    });
  });

  describe('取得表格列表', () => {
    it('應該回傳可用的表格列表', async () => {
      // Arrange
      await mockSourceConnection.connect();

      // Act
      const tables = await comparisonTool.getTableList(sourceConfig);

      // Assert
      expect(Array.isArray(tables)).toBe(true);
    });
  });

  describe('取得表格元資料', () => {
    it('應該回傳正確的表格元資料', async () => {
      // Arrange
      await mockSourceConnection.connect();

      // Act
      const metadata = await comparisonTool.getTableMetadata(
        sourceConfig,
        'users'
      );

      // Assert
      expect(metadata.name).toBe('users');
      expect(metadata.columns).toHaveLength(4);
      expect(metadata.primaryKeys).toContain('id');
      expect(metadata.columns.find(c => c.name === 'username')).toBeDefined();
    });

    it('應該在表格不存在時拋出錯誤', async () => {
      // Arrange
      await mockSourceConnection.connect();

      // Act & Assert
      await expect(
        comparisonTool.getTableMetadata(sourceConfig, 'nonexistent_table')
      ).rejects.toThrow('Table nonexistent_table not found');
    });
  });

  describe('取得行數', () => {
    it('應該回傳正確的行數', async () => {
      // Arrange
      mockSourceConnection.setMockCount('users', 150);
      await mockSourceConnection.connect();

      // Act
      const count = await comparisonTool.getRowCount(sourceConfig, 'users');

      // Assert
      expect(count).toBe(150);
    });
  });

  describe('資料內容比對', () => {
    beforeEach(async () => {
      await mockSourceConnection.connect();
      await mockTargetConnection.connect();
    });

    it('應該正確比對完全相同的資料內容', async () => {
      // Arrange
      const tables = ['users'];
      const testData = [
        { id: '1', username: 'user1', email: 'user1@test.com' },
        { id: '2', username: 'user2', email: 'user2@test.com' },
      ];

      mockSourceConnection.setMockData('users', testData);
      mockTargetConnection.setMockData('users', testData);

      // Act
      const results = await comparisonTool.compareTableContent(tables, 100);

      // Assert
      expect(results).toHaveLength(1);

      const usersResult = results[0];
      expect(usersResult.tableName).toBe('users');
      expect(usersResult.exactMatches).toBe(2);
      expect(usersResult.partialMatches).toBe(0);
      expect(usersResult.missingInTarget).toBe(0);
      expect(usersResult.extraInTarget).toBe(0);
    });

    it('應該識別資料內容差異', async () => {
      // Arrange
      const tables = ['users'];
      const sourceData = [
        { id: '1', username: 'user1', email: 'user1@test.com' },
        { id: '2', username: 'user2', email: 'user2@test.com' },
      ];
      const targetData = [
        { id: '1', username: 'user1', email: 'user1@test.com' },
        {
          id: '2',
          username: 'user2_modified',
          email: 'user2_modified@test.com',
        },
      ];

      mockSourceConnection.setMockData('users', sourceData);
      mockTargetConnection.setMockData('users', targetData);

      // Act
      const results = await comparisonTool.compareTableContent(tables, 100);

      // Assert
      expect(results).toHaveLength(1);

      const usersResult = results[0];
      expect(usersResult.tableName).toBe('users');
      expect(usersResult.exactMatches).toBe(1);
      expect(usersResult.partialMatches).toBe(1);
      expect(usersResult.missingInTarget).toBe(0);
      expect(usersResult.extraInTarget).toBe(0);
    });

    it('應該識別目標缺少的記錄', async () => {
      // Arrange
      const tables = ['users'];
      const sourceData = [
        { id: '1', username: 'user1', email: 'user1@test.com' },
        { id: '2', username: 'user2', email: 'user2@test.com' },
        { id: '3', username: 'user3', email: 'user3@test.com' },
      ];
      const targetData = [
        { id: '1', username: 'user1', email: 'user1@test.com' },
      ];

      mockSourceConnection.setMockData('users', sourceData);
      mockTargetConnection.setMockData('users', targetData);

      // Act
      const results = await comparisonTool.compareTableContent(tables, 100);

      // Assert
      expect(results).toHaveLength(1);

      const usersResult = results[0];
      expect(usersResult.tableName).toBe('users');
      expect(usersResult.exactMatches).toBe(1);
      expect(usersResult.missingInTarget).toBe(2);
      expect(usersResult.extraInTarget).toBe(0);
    });

    it('應該識別目標多出的記錄', async () => {
      // Arrange
      const tables = ['users'];
      const sourceData = [
        { id: '1', username: 'user1', email: 'user1@test.com' },
      ];
      const targetData = [
        { id: '1', username: 'user1', email: 'user1@test.com' },
        { id: '2', username: 'user2', email: 'user2@test.com' },
        { id: '3', username: 'user3', email: 'user3@test.com' },
      ];

      mockSourceConnection.setMockData('users', sourceData);
      mockTargetConnection.setMockData('users', targetData);

      // Act
      const results = await comparisonTool.compareTableContent(tables, 100);

      // Assert
      expect(results).toHaveLength(1);

      const usersResult = results[0];
      expect(usersResult.tableName).toBe('users');
      expect(usersResult.exactMatches).toBe(1);
      expect(usersResult.missingInTarget).toBe(0);
      expect(usersResult.extraInTarget).toBe(2);
    });

    it('應該處理空表格的比對', async () => {
      // Arrange
      const tables = ['empty_table'];
      mockSourceConnection.setMockData('empty_table', []);
      mockTargetConnection.setMockData('empty_table', []);

      // Act
      const results = await comparisonTool.compareTableContent(tables, 100);

      // Assert
      expect(results).toHaveLength(1);

      const result = results[0];
      expect(result.tableName).toBe('empty_table');
      expect(result.totalRecords).toBe(0);
      expect(result.exactMatches).toBe(0);
      expect(result.missingInTarget).toBe(0);
      expect(result.extraInTarget).toBe(0);
    });
  });

  describe('完整比對功能', () => {
    beforeEach(async () => {
      await mockSourceConnection.connect();
      await mockTargetConnection.connect();
    });

    it('應該執行完整的比對流程', async () => {
      // Arrange
      const config = {
        sourceDb: sourceConfig,
        targetDb: targetConfig,
        tables: ['users', 'projects'],
        maxSampleSize: 100,
        batchSize: 1000,
      };

      // 設定測試資料
      mockSourceConnection.setMockCount('users', 100);
      mockTargetConnection.setMockCount('users', 100);
      mockSourceConnection.setMockCount('projects', 50);
      mockTargetConnection.setMockCount('projects', 45);

      const userData = [{ id: '1', username: 'user1' }];
      mockSourceConnection.setMockData('users', userData);
      mockTargetConnection.setMockData('users', userData);

      const projectData = [{ id: '1', name: 'project1', status: 'active' }];
      mockSourceConnection.setMockData('projects', projectData);
      mockTargetConnection.setMockData('projects', projectData);

      // Act
      const report = await comparisonTool.performFullComparison(config);

      // Assert
      expect(report).toBeDefined();
      expect(report.executionId).toMatch(/^comp_\d+$/);
      expect(report.config).toEqual(config);
      expect(report.summary.totalTables).toBe(2);
      expect(report.countResults).toHaveLength(2);
      expect(report.contentResults).toHaveLength(2);
      expect(report.structureResults).toHaveLength(2);
      expect(report.executionTime).toBeGreaterThan(0);

      // 檢查摘要計算
      expect(report.summary.tablesWithCountMismatch).toBe(1); // projects 計數不匹配
      expect(report.summary.overallDataIntegrity).toBeLessThan(100);
    });
  });

  describe('報告生成', () => {
    it('應該生成文字格式的報告', async () => {
      // Arrange
      const mockReport = {
        executionId: 'test_001',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        config: {
          sourceDb: sourceConfig,
          targetDb: targetConfig,
          tables: ['users'],
        },
        summary: {
          totalTables: 1,
          tablesWithCountMismatch: 0,
          tablesWithContentDifferences: 0,
          tablesWithStructureDifferences: 0,
          overallDataIntegrity: 100,
          criticalIssues: 0,
          warnings: 0,
        },
        countResults: [
          {
            tableName: 'users',
            sourceCount: 100,
            targetCount: 100,
            countMatch: true,
            difference: 0,
            percentageDiff: 0,
          },
        ],
        contentResults: [],
        structureResults: [],
        errors: [],
        executionTime: 1500,
      } as ComparisonReport;

      // Act
      const report = await comparisonTool.generateReport(mockReport);

      // Assert
      expect(report).toContain('資料比對報告');
      expect(report).toContain('test_001');
      expect(report).toContain('總表格數: 1');
      expect(report).toContain('資料完整性: 100.00%');
      expect(report).toContain('✓ users: 100 -> 100');
    });

    it('應該導出 JSON 格式的結果', async () => {
      // Arrange
      const mockReport = {
        executionId: 'test_002',
        timestamp: new Date(),
        summary: { totalTables: 1 },
      } as ComparisonReport;

      // Act
      const buffer = await comparisonTool.exportResults(mockReport, 'json');

      // Assert
      expect(buffer).toBeInstanceOf(Buffer);
      const json = JSON.parse(buffer.toString('utf-8'));
      expect(json.executionId).toBe('test_002');
      expect(json.summary.totalTables).toBe(1);
    });
  });
});
