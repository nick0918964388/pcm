/**
 * Oracle 測試容器和測試環境整合驗證
 * Task 9.2: 建立 Oracle 系統整合測試
 *
 * 遵循 TDD 方法論
 * RED: 撰寫失敗的測試
 * GREEN: 實作最小程式碼讓測試通過
 * REFACTOR: 重構並改善程式碼品質
 * VERIFY: 確保所有測試通過並無回歸問題
 *
 * 測試範圍:
 * - Oracle 容器環境驗證
 * - 資料庫連線池管理
 * - 測試資料初始化與清理
 * - 多測試並行執行
 * - 效能基準測試
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  oracleTestManager,
  setupOracleForTests,
  cleanupOracleAfterTests,
  ensureOracleReady,
} from '@/lib/database/oracle-test-setup';
import { getOracleConnection } from '@/lib/database/oracle-connection';
import { OracleRepositoryFactory } from '@/lib/repositories/oracle-repository-factory';

const execAsync = promisify(exec);

// 測試環境驗證工具
class OracleTestEnvironmentValidator {
  async validateDockerEnvironment(): Promise<{
    dockerAvailable: boolean;
    oracleContainerRunning: boolean;
    containerDetails?: any;
    error?: string;
  }> {
    try {
      // 檢查 Docker 是否可用
      await execAsync('docker --version');

      // 檢查 Oracle 容器狀態
      const { stdout } = await execAsync(
        'docker ps --filter "name=pcm-oracle-dev" --format "json"'
      );

      if (!stdout.trim()) {
        return {
          dockerAvailable: true,
          oracleContainerRunning: false,
          error: 'Oracle container not running',
        };
      }

      const containerInfo = JSON.parse(stdout.trim());

      return {
        dockerAvailable: true,
        oracleContainerRunning: true,
        containerDetails: {
          containerId: containerInfo.ID,
          image: containerInfo.Image,
          status: containerInfo.Status,
          ports: containerInfo.Ports,
          names: containerInfo.Names,
        },
      };
    } catch (error) {
      return {
        dockerAvailable: false,
        oracleContainerRunning: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async validateOracleConnection(): Promise<{
    connectionSuccessful: boolean;
    responseTime: number;
    poolStatus?: any;
    error?: string;
  }> {
    const startTime = process.hrtime.bigint();

    try {
      const oracle = getOracleConnection();
      const healthCheck = await oracle.healthCheck();

      const endTime = process.hrtime.bigint();
      const responseTimeMs = Number(endTime - startTime) / 1_000_000;

      if (!healthCheck.success || !healthCheck.data?.isHealthy) {
        return {
          connectionSuccessful: false,
          responseTime: responseTimeMs,
          error: healthCheck.data?.errorDetails || 'Health check failed',
        };
      }

      return {
        connectionSuccessful: true,
        responseTime: responseTimeMs,
        poolStatus: oracle.getPoolStatus(),
      };
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const responseTimeMs = Number(endTime - startTime) / 1_000_000;

      return {
        connectionSuccessful: false,
        responseTime: responseTimeMs,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async validateDatabaseSchema(): Promise<{
    schemaValid: boolean;
    missingTables: string[];
    missingIndexes: string[];
    missingTriggers: string[];
    error?: string;
  }> {
    try {
      const oracle = getOracleConnection();

      // 預期的表格
      const expectedTables = [
        'PROJECTS',
        'USERS',
        'PHOTO_ALBUMS',
        'PHOTOS',
        'PHOTO_VERSIONS',
        'UPLOAD_SESSIONS',
        'UPLOAD_CHUNKS',
      ];

      // 檢查表格存在性
      const tablesQuery = await oracle.executeQuery(
        `
        SELECT table_name FROM user_tables
        WHERE table_name IN (${expectedTables.map(() => '?').join(',')})
      `,
        expectedTables
      );

      const existingTables = tablesQuery.rows.map((row: any) => row.TABLE_NAME);
      const missingTables = expectedTables.filter(
        table => !existingTables.includes(table)
      );

      // 檢查關鍵索引
      const expectedIndexes = [
        'IDX_ALBUMS_PROJECT_ID',
        'IDX_PHOTOS_ALBUM_ID',
        'IDX_UPLOAD_SESSIONS_USER',
        'IDX_UPLOAD_CHUNKS_SESSION',
      ];

      const indexesQuery = await oracle.executeQuery(
        `
        SELECT index_name FROM user_indexes
        WHERE index_name IN (${expectedIndexes.map(() => '?').join(',')})
      `,
        expectedIndexes
      );

      const existingIndexes = indexesQuery.rows.map(
        (row: any) => row.INDEX_NAME
      );
      const missingIndexes = expectedIndexes.filter(
        index => !existingIndexes.includes(index)
      );

      // 檢查觸發器
      const expectedTriggers = [
        'TRG_PROJECTS_UPDATED_AT',
        'TRG_USERS_UPDATED_AT',
        'TRG_ALBUMS_UPDATED_AT',
        'TRG_PHOTOS_UPDATED_AT',
      ];

      const triggersQuery = await oracle.executeQuery(
        `
        SELECT trigger_name FROM user_triggers
        WHERE trigger_name IN (${expectedTriggers.map(() => '?').join(',')})
      `,
        expectedTriggers
      );

      const existingTriggers = triggersQuery.rows.map(
        (row: any) => row.TRIGGER_NAME
      );
      const missingTriggers = expectedTriggers.filter(
        trigger => !existingTriggers.includes(trigger)
      );

      return {
        schemaValid:
          missingTables.length === 0 &&
          missingIndexes.length === 0 &&
          missingTriggers.length === 0,
        missingTables,
        missingIndexes,
        missingTriggers,
      };
    } catch (error) {
      return {
        schemaValid: false,
        missingTables: [],
        missingIndexes: [],
        missingTriggers: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async performLoadTest(
    concurrency: number = 10,
    operations: number = 100
  ): Promise<{
    success: boolean;
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    errorRate: number;
    throughput: number;
    errors: string[];
  }> {
    const oracle = getOracleConnection();
    const results: {
      success: boolean;
      responseTime: number;
      error?: string;
    }[] = [];
    const startTime = Date.now();

    // 建立並行作業
    const batches = Math.ceil(operations / concurrency);

    for (let batch = 0; batch < batches; batch++) {
      const batchOperations = Math.min(
        concurrency,
        operations - batch * concurrency
      );

      const batchPromises = Array.from(
        { length: batchOperations },
        async () => {
          const opStartTime = process.hrtime.bigint();

          try {
            // 執行簡單的資料庫操作
            await oracle.executeQuery('SELECT SYSDATE FROM DUAL');

            const opEndTime = process.hrtime.bigint();
            const responseTime = Number(opEndTime - opStartTime) / 1_000_000;

            return { success: true, responseTime };
          } catch (error) {
            const opEndTime = process.hrtime.bigint();
            const responseTime = Number(opEndTime - opStartTime) / 1_000_000;

            return {
              success: false,
              responseTime,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        }
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const totalTime = Date.now() - startTime;
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const responseTimes = results.map(r => r.responseTime);

    return {
      success: failed.length === 0,
      averageResponseTime:
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      errorRate: (failed.length / results.length) * 100,
      throughput: (operations / totalTime) * 1000, // operations per second
      errors: failed.map(f => f.error || 'Unknown error'),
    };
  }
}

describe('Oracle 測試容器和測試環境整合驗證', () => {
  let validator: OracleTestEnvironmentValidator;

  // ===== 測試環境設置 =====
  beforeAll(async () => {
    console.log('🔧 設置 Oracle 測試環境驗證...');

    validator = new OracleTestEnvironmentValidator();

    console.log('✅ Oracle 測試環境驗證器準備就緒');
  }, 30000); // 30s timeout

  afterAll(async () => {
    console.log('✅ Oracle 測試環境驗證完成');
  });

  // ===== Docker 環境驗證測試 =====
  describe('Docker 環境驗證', () => {
    it('RED: 應該驗證 Docker 環境可用性', async () => {
      // Act
      const dockerValidation = await validator.validateDockerEnvironment();

      // Assert
      expect(dockerValidation.dockerAvailable).toBe(true);

      if (!dockerValidation.dockerAvailable) {
        console.error('Docker 不可用:', dockerValidation.error);
        throw new Error(
          'Docker environment is not available. Please ensure Docker is installed and running.'
        );
      }

      console.log('✅ Docker 環境驗證成功');
    });

    it('RED: 應該驗證 Oracle 容器運行狀態', async () => {
      // Act
      const dockerValidation = await validator.validateDockerEnvironment();

      // Assert
      expect(dockerValidation.oracleContainerRunning).toBe(true);

      if (!dockerValidation.oracleContainerRunning) {
        console.error('Oracle 容器未運行:', dockerValidation.error);
        throw new Error(
          `Oracle container is not running. Please start it with: npm run docker:oracle:start`
        );
      }

      // 驗證容器詳細資訊
      expect(dockerValidation.containerDetails).toBeDefined();
      expect(dockerValidation.containerDetails!.containerId).toBeDefined();
      expect(dockerValidation.containerDetails!.status).toContain('Up');

      console.log('✅ Oracle 容器運行狀態驗證成功:', {
        containerId: dockerValidation.containerDetails!.containerId.substring(
          0,
          12
        ),
        status: dockerValidation.containerDetails!.status,
        ports: dockerValidation.containerDetails!.ports,
      });
    });
  });

  // ===== Oracle 連線驗證測試 =====
  describe('Oracle 連線驗證', () => {
    it('RED: 應該驗證 Oracle 資料庫連線', async () => {
      // Act
      const connectionValidation = await validator.validateOracleConnection();

      // Assert
      expect(connectionValidation.connectionSuccessful).toBe(true);

      if (!connectionValidation.connectionSuccessful) {
        console.error('Oracle 連線失敗:', connectionValidation.error);
        throw new Error(
          `Oracle connection failed: ${connectionValidation.error}`
        );
      }

      // 驗證連線效能
      expect(connectionValidation.responseTime).toBeLessThan(5000); // 5秒內回應
      expect(connectionValidation.poolStatus).toBeDefined();

      console.log('✅ Oracle 連線驗證成功:', {
        responseTime: `${connectionValidation.responseTime.toFixed(2)}ms`,
        poolStatus: connectionValidation.poolStatus,
      });
    });

    it('RED: 應該驗證連線池狀態和配置', async () => {
      // Arrange
      const oracle = getOracleConnection();

      // Act
      const poolStatus = oracle.getPoolStatus();

      // Assert
      expect(poolStatus).toBeDefined();
      expect(poolStatus.poolMin).toBeGreaterThan(0);
      expect(poolStatus.poolMax).toBeGreaterThan(poolStatus.poolMin);
      expect(poolStatus.connectionsOpen).toBeGreaterThanOrEqual(0);
      expect(poolStatus.connectionsInUse).toBeGreaterThanOrEqual(0);

      console.log('✅ 連線池狀態驗證成功:', poolStatus);
    });
  });

  // ===== 資料庫結構驗證測試 =====
  describe('資料庫結構驗證', () => {
    it('RED: 應該驗證必要的資料庫表格存在', async () => {
      // Act
      const schemaValidation = await validator.validateDatabaseSchema();

      // Assert
      expect(schemaValidation.schemaValid).toBe(true);

      if (!schemaValidation.schemaValid) {
        console.error('資料庫結構驗證失敗:', {
          missingTables: schemaValidation.missingTables,
          missingIndexes: schemaValidation.missingIndexes,
          missingTriggers: schemaValidation.missingTriggers,
          error: schemaValidation.error,
        });

        throw new Error(
          `Database schema validation failed. Missing components: ${[
            ...schemaValidation.missingTables.map(t => `table:${t}`),
            ...schemaValidation.missingIndexes.map(i => `index:${i}`),
            ...schemaValidation.missingTriggers.map(t => `trigger:${t}`),
          ].join(', ')}`
        );
      }

      console.log('✅ 資料庫結構驗證成功');
    });

    it('RED: 應該驗證資料庫外鍵約束', async () => {
      // Arrange
      const oracle = getOracleConnection();

      // Act - 檢查關鍵外鍵約束
      const foreignKeysQuery = await oracle.executeQuery(`
        SELECT
          constraint_name,
          table_name,
          r_constraint_name
        FROM user_constraints
        WHERE constraint_type = 'R'
        AND table_name IN ('PHOTO_ALBUMS', 'PHOTOS', 'PHOTO_VERSIONS', 'UPLOAD_CHUNKS')
      `);

      // Assert
      expect(foreignKeysQuery.rows.length).toBeGreaterThan(0);

      // 驗證關鍵外鍵約束存在
      const constraintNames = foreignKeysQuery.rows.map(
        (row: any) => row.CONSTRAINT_NAME
      );
      const expectedConstraints = [
        'FK_ALBUM_PROJECT',
        'FK_ALBUM_CREATOR',
        'FK_PHOTO_ALBUM',
        'FK_PHOTO_UPLOADER',
      ];

      expectedConstraints.forEach(expectedConstraint => {
        const hasConstraint = constraintNames.some(
          (name: string) =>
            name.includes(expectedConstraint) ||
            name.includes(expectedConstraint.replace('FK_', ''))
        );
        if (!hasConstraint) {
          console.warn(`外鍵約束可能缺失: ${expectedConstraint}`);
        }
      });

      console.log('✅ 資料庫外鍵約束驗證完成');
    });
  });

  // ===== 測試資料管理驗證 =====
  describe('測試資料管理驗證', () => {
    it('RED: 應該能正確初始化測試資料', async () => {
      // Act
      await setupOracleForTests({
        recreateSchema: false,
        loadTestData: true,
      });

      // Assert - 驗證測試使用者存在
      const oracle = getOracleConnection();
      const testUserQuery = await oracle.executeQuery(
        'SELECT * FROM users WHERE username = :username',
        { username: 'test_user_e2e' }
      );

      expect(testUserQuery.rows).toHaveLength(1);
      expect(testUserQuery.rows[0].USERNAME).toBe('test_user_e2e');

      console.log('✅ 測試資料初始化驗證成功');
    });

    it('RED: 應該能正確清理測試資料', async () => {
      // Arrange - 建立一些測試資料
      const oracle = getOracleConnection();

      await oracle.executeQuery(`
        INSERT INTO users (id, username, email, password_hash, role)
        VALUES ('TEST_CLEANUP_USER', 'test_cleanup_user', 'cleanup@test.com', 'hash', 'user')
      `);

      await oracle.executeQuery(`
        INSERT INTO projects (id, name, description, status)
        VALUES ('TEST_CLEANUP_PROJ', 'Cleanup Test Project', 'Test project for cleanup', 'active')
      `);

      // Act - 執行清理
      await cleanupOracleAfterTests();

      // Assert - 驗證測試資料被清理
      const userQuery = await oracle.executeQuery(
        'SELECT * FROM users WHERE username LIKE :pattern',
        { pattern: 'test_%' }
      );

      const projectQuery = await oracle.executeQuery(
        'SELECT * FROM projects WHERE id LIKE :pattern',
        { pattern: 'TEST_%' }
      );

      expect(userQuery.rows).toHaveLength(0);
      expect(projectQuery.rows).toHaveLength(0);

      console.log('✅ 測試資料清理驗證成功');
    });
  });

  // ===== 效能基準測試 =====
  describe('效能基準測試', () => {
    it('RED: 應該滿足基本效能要求', async () => {
      // Act - 執行輕量負載測試
      const loadTestResult = await validator.performLoadTest(5, 50); // 5個並行，50個操作

      // Assert
      expect(loadTestResult.success).toBe(true);
      expect(loadTestResult.averageResponseTime).toBeLessThan(100); // 平均回應時間 < 100ms
      expect(loadTestResult.maxResponseTime).toBeLessThan(1000); // 最大回應時間 < 1s
      expect(loadTestResult.errorRate).toBeLessThan(5); // 錯誤率 < 5%
      expect(loadTestResult.throughput).toBeGreaterThan(10); // 吞吐量 > 10 ops/s

      if (loadTestResult.errors.length > 0) {
        console.warn('負載測試發現錯誤:', loadTestResult.errors);
      }

      console.log('✅ 效能基準測試通過:', {
        averageResponseTime: `${loadTestResult.averageResponseTime.toFixed(2)}ms`,
        maxResponseTime: `${loadTestResult.maxResponseTime.toFixed(2)}ms`,
        errorRate: `${loadTestResult.errorRate.toFixed(2)}%`,
        throughput: `${loadTestResult.throughput.toFixed(2)} ops/s`,
      });
    });

    it('RED: 應該支援適度並行負載', async () => {
      // Act - 執行中等負載測試
      const loadTestResult = await validator.performLoadTest(10, 100); // 10個並行，100個操作

      // Assert
      expect(loadTestResult.success).toBe(true);
      expect(loadTestResult.averageResponseTime).toBeLessThan(200); // 在並行下仍保持合理回應時間
      expect(loadTestResult.errorRate).toBeLessThan(10); // 並行下錯誤率仍可接受

      console.log('✅ 並行負載測試通過:', {
        averageResponseTime: `${loadTestResult.averageResponseTime.toFixed(2)}ms`,
        maxResponseTime: `${loadTestResult.maxResponseTime.toFixed(2)}ms`,
        errorRate: `${loadTestResult.errorRate.toFixed(2)}%`,
        throughput: `${loadTestResult.throughput.toFixed(2)} ops/s`,
      });
    });
  });

  // ===== 整合環境穩定性測試 =====
  describe('整合環境穩定性測試', () => {
    it('RED: 應該支援長時間運行', async () => {
      // Arrange
      const testDuration = 30000; // 30秒
      const checkInterval = 2000; // 2秒檢查一次
      const startTime = Date.now();
      const healthChecks: boolean[] = [];

      // Act - 持續健康檢查
      while (Date.now() - startTime < testDuration) {
        try {
          const oracle = getOracleConnection();
          const healthCheck = await oracle.healthCheck();
          healthChecks.push(
            healthCheck.success && healthCheck.data?.isHealthy === true
          );
        } catch (error) {
          healthChecks.push(false);
          console.warn('健康檢查失敗:', error);
        }

        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      // Assert
      const successRate =
        (healthChecks.filter(Boolean).length / healthChecks.length) * 100;
      expect(successRate).toBeGreaterThan(95); // 成功率 > 95%

      console.log('✅ 長時間運行穩定性測試通過:', {
        totalChecks: healthChecks.length,
        successfulChecks: healthChecks.filter(Boolean).length,
        successRate: `${successRate.toFixed(2)}%`,
        duration: `${testDuration / 1000}s`,
      });
    }, 35000); // 35秒超時

    it('RED: 應該正確處理連線池耗盡情境', async () => {
      // Arrange
      const oracle = getOracleConnection();
      const poolStatus = oracle.getPoolStatus();
      const maxConnections = poolStatus.poolMax;

      // Act - 嘗試建立超過池大小的連線
      const connectionPromises: Promise<any>[] = [];

      for (let i = 0; i < maxConnections + 5; i++) {
        connectionPromises.push(
          oracle
            .executeQuery('SELECT SYSDATE FROM DUAL')
            .catch(error => ({ error: error.message }))
        );
      }

      const results = await Promise.all(connectionPromises);

      // Assert - 系統應該優雅處理連線池耗盡
      const successfulQueries = results.filter(r => !r.error).length;
      const failedQueries = results.filter(r => r.error).length;

      // 大部分查詢應該成功，但可能有一些因為連線池限制而失敗
      expect(successfulQueries).toBeGreaterThan(0);
      expect(successfulQueries + failedQueries).toBe(maxConnections + 5);

      console.log('✅ 連線池耗盡情境處理測試完成:', {
        maxConnections,
        totalQueries: connectionPromises.length,
        successfulQueries,
        failedQueries,
      });
    });
  });

  // ===== 測試環境配置驗證 =====
  describe('測試環境配置驗證', () => {
    it('RED: 應該驗證測試管理器狀態', async () => {
      // Act
      const connectionStatus = oracleTestManager.getConnectionStatus();

      // Assert
      expect(connectionStatus).toBeDefined();
      expect(connectionStatus.isInitialized).toBeDefined();

      if (connectionStatus.isInitialized) {
        expect(connectionStatus.poolStatus).toBeDefined();
      }

      console.log('✅ 測試管理器狀態驗證成功:', connectionStatus);
    });

    it('RED: 應該能檢查容器狀態', async () => {
      // Act
      const containerRunning = await oracleTestManager.checkContainerStatus();

      // Assert
      expect(containerRunning).toBe(true);

      console.log('✅ 容器狀態檢查成功');
    });

    it('RED: 應該能等待資料庫就緒', async () => {
      // Act
      const dbReady = await oracleTestManager.waitForDatabase(10000); // 10秒超時

      // Assert
      expect(dbReady).toBe(true);

      console.log('✅ 資料庫就緒狀態驗證成功');
    });
  });
});
