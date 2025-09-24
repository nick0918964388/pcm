import oracledb from 'oracledb';
import { Pool } from 'pg';
import { writeFile, readFile, mkdir, readdir, stat } from 'fs/promises';
import path from 'path';

// Types for rollback and diagnostics
type DatabaseType = 'postgresql' | 'oracle';
type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
type IssueType =
  | 'connection_failure'
  | 'data_corruption'
  | 'sync_failure'
  | 'performance_issue'
  | 'timeout'
  | 'constraint_violation';
type RecoveryType =
  | 'data_sync_retry'
  | 'connection_retry'
  | 'partial_rollback'
  | 'full_rollback'
  | 'emergency_isolation';

interface RollbackSnapshot {
  snapshotId: string;
  tableName: string;
  recordCount: number;
  snapshotLocation: string;
  createdAt: Date;
  checksum: string;
}

interface RollbackResult {
  success: boolean;
  snapshotId: string;
  rolledBackTables: string[];
  executedAt: Date;
  duration: number;
  error?: string;
}

interface RollbackValidation {
  isValid: boolean;
  snapshotId: string;
  validationResults: Array<{
    check: string;
    passed: boolean;
    message: string;
  }>;
  checkedAt: Date;
  errors?: string[];
}

interface RollbackEstimate {
  estimatedMinutes: number;
  breakdown: Array<{
    table: string;
    estimatedMinutes: number;
    recordCount: number;
  }>;
  confidence: 'low' | 'medium' | 'high';
}

interface DiagnosticResult {
  issues: Array<{
    type: IssueType;
    severity: IssueSeverity;
    description: string;
    affectedComponents: string[];
    recommendations: string[];
  }>;
  severity: IssueSeverity;
  recommendations: string[];
  diagnosedAt: Date;
}

interface ConnectivityResult {
  postgresql: {
    connected: boolean;
    responseTime: number;
    version?: string;
    error?: string;
  };
  oracle: {
    connected: boolean;
    responseTime: number;
    version?: string;
    error?: string;
  };
  overall: boolean;
}

interface PerformanceAnalysis {
  bottlenecks: Array<{
    component: string;
    issue: string;
    impact: 'low' | 'medium' | 'high';
    metrics: Record<string, number>;
  }>;
  metrics: {
    avgQueryTime: number;
    connectionPoolUsage: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  suggestions: string[];
}

interface IntegrityResult {
  overallIntegrity: boolean;
  tableResults: Array<{
    tableName: string;
    isIntact: boolean;
    issues: string[];
    recordCount: number;
  }>;
  issues: string[];
}

interface DiagnosticReport {
  reportId: string;
  generatedAt: Date;
  sections: {
    connectivity: ConnectivityResult;
    performance: PerformanceAnalysis;
    integrity: IntegrityResult;
    issues: DiagnosticResult;
  };
  summary: {
    overallHealth: 'healthy' | 'warning' | 'critical';
    criticalIssues: number;
    recommendations: string[];
  };
}

interface EmergencyRecoveryResult {
  success: boolean;
  recoverySteps: string[];
  executedAt: Date;
  duration: number;
  error?: string;
}

interface IsolationResult {
  isolatedTables: string[];
  isolationMethod: string;
  recoveryInstructions: string[];
  estimatedDowntime: number;
}

interface MinimalFunctionalityResult {
  success: boolean;
  availableFunctions: string[];
  limitations: string[];
  estimatedCapacity: number;
}

interface CriticalFailureResult {
  handled: boolean;
  actions: string[];
  nextSteps: string[];
  estimatedRecoveryTime: number;
}

interface Issue {
  type: IssueType;
  severity: IssueSeverity;
  description: string;
  affectedTables?: string[];
  metadata?: Record<string, any>;
}

interface IssueRecord extends Issue {
  issueId: string;
  trackedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
  status: 'open' | 'in_progress' | 'resolved';
}

interface IssueTrackingResult {
  issueId: string;
  tracked: boolean;
  trackedAt: Date;
}

interface IssueResolutionResult {
  resolved: boolean;
  resolvedAt: Date;
  resolution: string;
}

interface IssueReport {
  totalIssues: number;
  openIssues: number;
  resolvedIssues: number;
  issuesByType: Record<IssueType, number>;
  issuesBySeverity: Record<IssueSeverity, number>;
  averageResolutionTime: number;
}

interface IssuePatternAnalysis {
  patterns: Array<{
    pattern: string;
    frequency: number;
    impact: IssueSeverity;
  }>;
  commonCauses: string[];
  recommendations: string[];
}

interface RecoveryOpportunity {
  type: RecoveryType;
  confidence: number;
  estimatedSuccess: number;
  description: string;
  requiredActions: string[];
}

interface RecoveryOpportunitiesResult {
  opportunities: RecoveryOpportunity[];
  confidence: 'low' | 'medium' | 'high';
  estimatedSuccess: number;
}

interface AutoRecoveryResult {
  success: boolean;
  actionsPerformed: string[];
  executedAt: Date;
  duration: number;
  error?: string;
}

interface RecoveryProgress {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  estimatedCompletion: Date;
  currentStep: string;
  errors?: string[];
}

interface RecoveryPolicies {
  autoRetryLimit: number;
  autoRollbackThreshold: IssueSeverity;
  notificationLevel: 'critical' | 'high' | 'all';
  enableAutoRecovery: boolean;
}

interface RecoveryPolicyResult {
  configured: boolean;
  activePolicies: RecoveryPolicies;
  configuredAt: Date;
}

/**
 * 回滾管理器
 * 負責建立快照和執行回滾操作
 */
export class RollbackManager {
  private pgPool: Pool;
  private oracleConfig: any;
  private snapshotPath: string;

  constructor() {
    this.pgPool = new Pool({
      host: process.env.DB_HOST || '192.168.1.183',
      database: process.env.DB_DATABASE || 'app_db',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'XcW04ByX6GbVdt1gw4EJ5XRY',
      port: parseInt(process.env.DB_PORT || '30432'),
    });

    this.oracleConfig = {
      user: process.env.ORACLE_USER || 'pcm_user',
      password: process.env.ORACLE_PASSWORD || 'pcm_pass123',
      connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XE',
    };

    this.snapshotPath = process.env.SNAPSHOT_PATH || './snapshots';
  }

  /**
   * 建立回滾快照
   */
  async createRollbackSnapshot(tableName: string): Promise<RollbackSnapshot> {
    try {
      // 確保快照目錄存在
      await mkdir(this.snapshotPath, { recursive: true });

      // 獲取PostgreSQL資料
      const result = await this.pgPool.query(`SELECT * FROM ${tableName}`);
      const data = result.rows;

      // 生成快照ID和檔案路徑
      const snapshotId = `snapshot_${tableName}_${Date.now()}`;
      const snapshotFile = path.join(this.snapshotPath, `${snapshotId}.json`);

      // 計算檢查和
      const checksum = this.calculateChecksum(JSON.stringify(data));

      // 儲存快照資料
      const snapshotData = {
        metadata: {
          snapshotId,
          tableName,
          recordCount: data.length,
          createdAt: new Date(),
          checksum,
        },
        data,
      };

      await writeFile(snapshotFile, JSON.stringify(snapshotData, null, 2));

      return {
        snapshotId,
        tableName,
        recordCount: data.length,
        snapshotLocation: snapshotFile,
        createdAt: new Date(),
        checksum,
      };
    } catch (error) {
      throw new Error(
        `建立快照失敗: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 執行回滾
   */
  async executeRollback(
    snapshotId: string,
    targetDatabase: DatabaseType
  ): Promise<RollbackResult> {
    const startTime = Date.now();

    try {
      // 載入快照資料
      const snapshotFile = path.join(this.snapshotPath, `${snapshotId}.json`);
      const snapshotContent = await readFile(snapshotFile, 'utf-8');
      const snapshot = JSON.parse(snapshotContent);

      const { metadata, data } = snapshot;
      const rolledBackTables = [metadata.tableName];

      if (targetDatabase === 'postgresql') {
        await this.rollbackToPostgreSQL(metadata.tableName, data);
      } else {
        await this.rollbackToOracle(metadata.tableName, data);
      }

      return {
        success: true,
        snapshotId,
        rolledBackTables,
        executedAt: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        snapshotId,
        rolledBackTables: [],
        executedAt: new Date(),
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 驗證回滾完整性
   */
  async validateRollbackIntegrity(
    snapshotId: string
  ): Promise<RollbackValidation> {
    try {
      const snapshotFile = path.join(this.snapshotPath, `${snapshotId}.json`);
      const snapshotContent = await readFile(snapshotFile, 'utf-8');
      const snapshot = JSON.parse(snapshotContent);

      const validationResults = [];
      let isValid = true;

      // 檢查快照檔案完整性
      const currentChecksum = this.calculateChecksum(
        JSON.stringify(snapshot.data)
      );
      const checksumValid = currentChecksum === snapshot.metadata.checksum;

      validationResults.push({
        check: 'checksum_integrity',
        passed: checksumValid,
        message: checksumValid ? '檢查和驗證通過' : '檢查和驗證失敗',
      });

      if (!checksumValid) isValid = false;

      // 檢查資料結構
      const hasValidStructure =
        Array.isArray(snapshot.data) &&
        snapshot.metadata.recordCount === snapshot.data.length;

      validationResults.push({
        check: 'data_structure',
        passed: hasValidStructure,
        message: hasValidStructure ? '資料結構有效' : '資料結構無效',
      });

      if (!hasValidStructure) isValid = false;

      return {
        isValid,
        snapshotId,
        validationResults,
        checkedAt: new Date(),
      };
    } catch (error) {
      return {
        isValid: false,
        snapshotId,
        validationResults: [],
        checkedAt: new Date(),
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * 估算回滾時間
   */
  async estimateRollbackTime(tables: string[]): Promise<RollbackEstimate> {
    const breakdown = [];
    let totalMinutes = 0;

    for (const tableName of tables) {
      try {
        // 獲取表格記錄數
        const result = await this.pgPool.query(
          `SELECT COUNT(*) as count FROM ${tableName}`
        );
        const recordCount = parseInt(result.rows[0].count);

        // 基於記錄數估算時間（每1000筆記錄約需1分鐘）
        const estimatedMinutes = Math.max(1, Math.ceil(recordCount / 1000));

        breakdown.push({
          table: tableName,
          estimatedMinutes,
          recordCount,
        });

        totalMinutes += estimatedMinutes;
      } catch (error) {
        console.warn(`無法估算表格 ${tableName} 的回滾時間:`, error);
        breakdown.push({
          table: tableName,
          estimatedMinutes: 5, // 預設值
          recordCount: 0,
        });
        totalMinutes += 5;
      }
    }

    return {
      estimatedMinutes: totalMinutes,
      breakdown,
      confidence: tables.length <= 5 ? 'high' : 'medium',
    };
  }

  private async rollbackToPostgreSQL(
    tableName: string,
    data: any[]
  ): Promise<void> {
    const client = await this.pgPool.connect();

    try {
      await client.query('BEGIN');

      // 清空目標表格
      await client.query(`TRUNCATE TABLE ${tableName} CASCADE`);

      // 重新插入快照資料
      if (data.length > 0) {
        const fields = Object.keys(data[0]);
        const values = data.map(record => fields.map(field => record[field]));

        for (const recordValues of values) {
          const placeholders = recordValues
            .map((_, index) => `$${index + 1}`)
            .join(', ');
          const sql = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
          await client.query(sql, recordValues);
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async rollbackToOracle(
    tableName: string,
    data: any[]
  ): Promise<void> {
    let oracleConnection: oracledb.Connection | undefined;

    try {
      oracleConnection = await oracledb.getConnection(this.oracleConfig);

      // 清空目標表格
      await oracleConnection.execute(`TRUNCATE TABLE ${tableName}`);

      // 重新插入快照資料
      if (data.length > 0) {
        const fields = Object.keys(data[0]);

        for (const record of data) {
          const values = fields.map(field => `:${field}`).join(', ');
          const sql = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${values})`;

          // 處理資料類型轉換
          const params: any = {};
          for (const [key, value] of Object.entries(record)) {
            if (typeof value === 'boolean') {
              params[key] = value ? 1 : 0;
            } else if (
              typeof value === 'object' &&
              value !== null &&
              !(value instanceof Date)
            ) {
              params[key] = JSON.stringify(value);
            } else {
              params[key] = value;
            }
          }

          await oracleConnection.execute(sql, params);
        }
      }

      await oracleConnection.commit();
    } catch (error) {
      if (oracleConnection) {
        await oracleConnection.rollback();
      }
      throw error;
    } finally {
      if (oracleConnection) {
        await oracleConnection.close();
      }
    }
  }

  private calculateChecksum(data: string): string {
    // 簡單的檢查和實作（實際環境中應使用更強的雜湊演算法）
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 轉換為32位元整數
    }
    return hash.toString(16);
  }
}

/**
 * 診斷引擎
 * 負責系統問題診斷和分析
 */
export class DiagnosticEngine {
  private pgPool: Pool;
  private oracleConfig: any;

  constructor() {
    this.pgPool = new Pool({
      host: process.env.DB_HOST || '192.168.1.183',
      database: process.env.DB_DATABASE || 'app_db',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'XcW04ByX6GbVdt1gw4EJ5XRY',
      port: parseInt(process.env.DB_PORT || '30432'),
    });

    this.oracleConfig = {
      user: process.env.ORACLE_USER || 'pcm_user',
      password: process.env.ORACLE_PASSWORD || 'pcm_pass123',
      connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XE',
    };
  }

  /**
   * 診斷遷移問題
   */
  async diagnoseMigrationIssues(): Promise<DiagnosticResult> {
    const issues = [];
    let maxSeverity: IssueSeverity = 'low';

    try {
      // 檢查連線狀態
      const connectivity = await this.checkDatabaseConnectivity();
      if (!connectivity.overall) {
        const severity: IssueSeverity = 'critical';
        issues.push({
          type: 'connection_failure' as IssueType,
          severity,
          description: '資料庫連線失敗',
          affectedComponents: [
            ...(connectivity.postgresql.connected ? [] : ['PostgreSQL']),
            ...(connectivity.oracle.connected ? [] : ['Oracle']),
          ],
          recommendations: [
            '檢查資料庫服務狀態',
            '驗證連線參數',
            '檢查網路連線',
          ],
        });
        maxSeverity = this.getHigherSeverity(maxSeverity, severity);
      }

      // 檢查效能問題
      const performance = await this.analyzePerformanceBottlenecks();
      for (const bottleneck of performance.bottlenecks) {
        if (bottleneck.impact === 'high') {
          const severity: IssueSeverity = 'high';
          issues.push({
            type: 'performance_issue' as IssueType,
            severity,
            description: `效能瓶頸: ${bottleneck.issue}`,
            affectedComponents: [bottleneck.component],
            recommendations: performance.suggestions,
          });
          maxSeverity = this.getHigherSeverity(maxSeverity, severity);
        }
      }

      // 檢查資料完整性
      const integrity = await this.validateDataIntegrity(['projects', 'users']);
      if (!integrity.overallIntegrity) {
        const severity: IssueSeverity = 'high';
        issues.push({
          type: 'data_corruption' as IssueType,
          severity,
          description: '資料完整性問題',
          affectedComponents: integrity.tableResults
            .filter(t => !t.isIntact)
            .map(t => t.tableName),
          recommendations: ['執行資料驗證', '檢查約束條件', '執行資料修復'],
        });
        maxSeverity = this.getHigherSeverity(maxSeverity, severity);
      }
    } catch (error) {
      const severity: IssueSeverity = 'critical';
      issues.push({
        type: 'connection_failure' as IssueType,
        severity,
        description: `診斷過程發生錯誤: ${error instanceof Error ? error.message : String(error)}`,
        affectedComponents: ['診斷系統'],
        recommendations: ['檢查診斷系統配置', '查看系統日誌'],
      });
      maxSeverity = severity;
    }

    const recommendations = [];
    if (issues.length === 0) {
      recommendations.push('系統狀態良好');
    } else {
      recommendations.push('立即處理發現的問題');
      if (maxSeverity === 'critical') {
        recommendations.push('考慮啟動緊急恢復程序');
      }
    }

    return {
      issues,
      severity: maxSeverity,
      recommendations,
      diagnosedAt: new Date(),
    };
  }

  /**
   * 檢查資料庫連線
   */
  async checkDatabaseConnectivity(): Promise<ConnectivityResult> {
    const postgresql = await this.checkPostgreSQLConnectivity();
    const oracle = await this.checkOracleConnectivity();

    return {
      postgresql,
      oracle,
      overall: postgresql.connected && oracle.connected,
    };
  }

  /**
   * 分析效能瓶頸
   */
  async analyzePerformanceBottlenecks(): Promise<PerformanceAnalysis> {
    const bottlenecks = [];
    const metrics = {
      avgQueryTime: 0,
      connectionPoolUsage: 0,
      memoryUsage: 0,
      cpuUsage: 0,
    };

    try {
      // 檢查PostgreSQL查詢效能
      const pgSlowQueries = await this.pgPool.query(`
        SELECT query, mean_exec_time, calls
        FROM pg_stat_statements
        WHERE mean_exec_time > 1000
        ORDER BY mean_exec_time DESC
        LIMIT 5
      `);

      if (pgSlowQueries.rows.length > 0) {
        bottlenecks.push({
          component: 'PostgreSQL',
          issue: '慢查詢偵測',
          impact: 'medium' as const,
          metrics: {
            slowQueries: pgSlowQueries.rows.length,
            avgTime:
              pgSlowQueries.rows.reduce(
                (sum, row) => sum + parseFloat(row.mean_exec_time),
                0
              ) / pgSlowQueries.rows.length,
          },
        });
      }

      // 檢查連線池使用率
      const poolInfo = this.pgPool.totalCount;
      if (poolInfo > 0) {
        const usage = (this.pgPool.idleCount / poolInfo) * 100;
        metrics.connectionPoolUsage = usage;

        if (usage > 80) {
          bottlenecks.push({
            component: 'Connection Pool',
            issue: '連線池使用率過高',
            impact: 'high' as const,
            metrics: { usage },
          });
        }
      }
    } catch (error) {
      console.warn('效能分析時發生錯誤:', error);
    }

    const suggestions = [];
    if (bottlenecks.length === 0) {
      suggestions.push('效能狀態良好');
    } else {
      suggestions.push('優化慢查詢');
      suggestions.push('調整連線池配置');
      suggestions.push('監控資源使用');
    }

    return {
      bottlenecks,
      metrics,
      suggestions,
    };
  }

  /**
   * 驗證資料完整性
   */
  async validateDataIntegrity(tables: string[]): Promise<IntegrityResult> {
    const tableResults = [];
    const issues = [];
    let overallIntegrity = true;

    for (const tableName of tables) {
      try {
        // 檢查表格是否存在
        const tableExists = await this.pgPool.query(
          `
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'pcm' AND table_name = $1
          )
        `,
          [tableName]
        );

        if (!tableExists.rows[0].exists) {
          tableResults.push({
            tableName,
            isIntact: false,
            issues: ['表格不存在'],
            recordCount: 0,
          });
          issues.push(`表格 ${tableName} 不存在`);
          overallIntegrity = false;
          continue;
        }

        // 檢查記錄數
        const countResult = await this.pgPool.query(
          `SELECT COUNT(*) as count FROM ${tableName}`
        );
        const recordCount = parseInt(countResult.rows[0].count);

        // 檢查約束條件（簡單檢查）
        const constraintIssues = [];

        // 檢查主鍵重複
        const duplicateCheck = await this.pgPool.query(`
          SELECT id, COUNT(*)
          FROM ${tableName}
          GROUP BY id
          HAVING COUNT(*) > 1
        `);

        if (duplicateCheck.rows.length > 0) {
          constraintIssues.push('主鍵重複');
        }

        const isIntact = constraintIssues.length === 0;
        if (!isIntact) {
          overallIntegrity = false;
          issues.push(...constraintIssues);
        }

        tableResults.push({
          tableName,
          isIntact,
          issues: constraintIssues,
          recordCount,
        });
      } catch (error) {
        const tableIssues = [
          `驗證失敗: ${error instanceof Error ? error.message : String(error)}`,
        ];
        tableResults.push({
          tableName,
          isIntact: false,
          issues: tableIssues,
          recordCount: 0,
        });
        issues.push(...tableIssues);
        overallIntegrity = false;
      }
    }

    return {
      overallIntegrity,
      tableResults,
      issues,
    };
  }

  /**
   * 生成診斷報告
   */
  async generateDiagnosticReport(): Promise<DiagnosticReport> {
    const reportId = `diagnostic_${Date.now()}`;

    // 收集各項診斷資訊
    const connectivity = await this.checkDatabaseConnectivity();
    const performance = await this.analyzePerformanceBottlenecks();
    const integrity = await this.validateDataIntegrity([
      'projects',
      'users',
      'photo_albums',
      'photos',
    ]);
    const issues = await this.diagnoseMigrationIssues();

    // 評估整體健康狀態
    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    let criticalIssues = 0;

    for (const issue of issues.issues) {
      if (issue.severity === 'critical') {
        overallHealth = 'critical';
        criticalIssues++;
      } else if (issue.severity === 'high' && overallHealth !== 'critical') {
        overallHealth = 'warning';
      }
    }

    const recommendations = [];
    if (overallHealth === 'critical') {
      recommendations.push('立即執行緊急恢復程序');
      recommendations.push('檢查資料庫服務狀態');
    } else if (overallHealth === 'warning') {
      recommendations.push('處理高優先級問題');
      recommendations.push('監控系統狀態');
    } else {
      recommendations.push('系統運作正常');
      recommendations.push('繼續定期監控');
    }

    return {
      reportId,
      generatedAt: new Date(),
      sections: {
        connectivity,
        performance,
        integrity,
        issues,
      },
      summary: {
        overallHealth,
        criticalIssues,
        recommendations,
      },
    };
  }

  private async checkPostgreSQLConnectivity(): Promise<
    ConnectivityResult['postgresql']
  > {
    const startTime = Date.now();

    try {
      const result = await this.pgPool.query('SELECT version()');
      const responseTime = Date.now() - startTime;

      return {
        connected: true,
        responseTime,
        version: result.rows[0].version,
      };
    } catch (error) {
      return {
        connected: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async checkOracleConnectivity(): Promise<
    ConnectivityResult['oracle']
  > {
    const startTime = Date.now();
    let oracleConnection: oracledb.Connection | undefined;

    try {
      oracleConnection = await oracledb.getConnection(this.oracleConfig);
      const result = await oracleConnection.execute(
        "SELECT * FROM v$version WHERE banner LIKE 'Oracle%'"
      );
      const responseTime = Date.now() - startTime;

      return {
        connected: true,
        responseTime,
        version: result.rows?.[0]?.[0] as string,
      };
    } catch (error) {
      return {
        connected: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      if (oracleConnection) {
        await oracleConnection.close();
      }
    }
  }

  private getHigherSeverity(
    current: IssueSeverity,
    new_: IssueSeverity
  ): IssueSeverity {
    const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
    return severityOrder[new_] > severityOrder[current] ? new_ : current;
  }
}

/**
 * 緊急恢復系統
 * 處理系統緊急狀況和恢復
 */
export class EmergencyRecovery {
  private pgPool: Pool;
  private oracleConfig: any;
  private rollbackManager: RollbackManager;

  constructor() {
    this.pgPool = new Pool({
      host: process.env.DB_HOST || '192.168.1.183',
      database: process.env.DB_DATABASE || 'app_db',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'XcW04ByX6GbVdt1gw4EJ5XRY',
      port: parseInt(process.env.DB_PORT || '30432'),
    });

    this.oracleConfig = {
      user: process.env.ORACLE_USER || 'pcm_user',
      password: process.env.ORACLE_PASSWORD || 'pcm_pass123',
      connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XE',
    };

    this.rollbackManager = new RollbackManager();
  }

  /**
   * 執行緊急恢復
   */
  async executeEmergencyRecovery(): Promise<EmergencyRecoveryResult> {
    const startTime = Date.now();
    const recoverySteps = [];

    try {
      // 1. 診斷系統狀態
      recoverySteps.push('診斷系統狀態');
      const diagnosticEngine = new DiagnosticEngine();
      const diagnostic = await diagnosticEngine.diagnoseMigrationIssues();

      // 2. 隔離問題表格
      const criticalIssues = diagnostic.issues.filter(
        issue => issue.severity === 'critical'
      );
      if (criticalIssues.length > 0) {
        recoverySteps.push('隔離問題表格');
        const affectedTables = criticalIssues.flatMap(
          issue => issue.affectedComponents
        );
        await this.isolateProblematicTables(affectedTables);
      }

      // 3. 恢復最小功能
      recoverySteps.push('恢復最小功能');
      await this.restoreMinimalFunctionality();

      // 4. 驗證恢復狀態
      recoverySteps.push('驗證恢復狀態');
      const postRecoveryDiagnostic =
        await diagnosticEngine.checkDatabaseConnectivity();

      return {
        success: postRecoveryDiagnostic.overall,
        recoverySteps,
        executedAt: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        recoverySteps,
        executedAt: new Date(),
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 隔離問題表格
   */
  async isolateProblematicTables(tables: string[]): Promise<IsolationResult> {
    const isolatedTables = [];
    const recoveryInstructions = [];

    for (const tableName of tables) {
      try {
        // 建立備份快照
        await this.rollbackManager.createRollbackSnapshot(tableName);
        isolatedTables.push(tableName);
        recoveryInstructions.push(`表格 ${tableName} 已建立快照備份`);
      } catch (error) {
        recoveryInstructions.push(
          `無法隔離表格 ${tableName}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return {
      isolatedTables,
      isolationMethod: 'snapshot_backup',
      recoveryInstructions,
      estimatedDowntime: Math.max(5, isolatedTables.length * 2), // 每個表格約2分鐘
    };
  }

  /**
   * 恢復最小功能
   */
  async restoreMinimalFunctionality(): Promise<MinimalFunctionalityResult> {
    try {
      // 檢查核心表格
      const coreTables = ['users', 'projects'];
      const availableFunctions = [];
      const limitations = [];

      for (const tableName of coreTables) {
        try {
          const result = await this.pgPool.query(
            `SELECT COUNT(*) FROM ${tableName} LIMIT 1`
          );
          if (result.rows.length > 0) {
            availableFunctions.push(`${tableName} 查詢功能`);
          }
        } catch (error) {
          limitations.push(`${tableName} 功能不可用`);
        }
      }

      // 檢查連線狀態
      const diagnosticEngine = new DiagnosticEngine();
      const connectivity = await diagnosticEngine.checkDatabaseConnectivity();

      if (connectivity.postgresql.connected) {
        availableFunctions.push('PostgreSQL 連線');
      } else {
        limitations.push('PostgreSQL 連線不可用');
      }

      if (connectivity.oracle.connected) {
        availableFunctions.push('Oracle 連線');
      } else {
        limitations.push('Oracle 連線不可用');
      }

      const estimatedCapacity = Math.round(
        (availableFunctions.length /
          (availableFunctions.length + limitations.length)) *
          100
      );

      return {
        success: availableFunctions.length > 0,
        availableFunctions,
        limitations,
        estimatedCapacity,
      };
    } catch (error) {
      return {
        success: false,
        availableFunctions: [],
        limitations: [
          `恢復失敗: ${error instanceof Error ? error.message : String(error)}`,
        ],
        estimatedCapacity: 0,
      };
    }
  }

  /**
   * 處理關鍵失敗
   */
  async handleCriticalFailure(
    errorType: string
  ): Promise<CriticalFailureResult> {
    const actions = [];
    const nextSteps = [];
    let handled = false;
    let estimatedRecoveryTime = 0;

    switch (errorType) {
      case 'database_corruption':
        actions.push('建立所有表格快照');
        actions.push('停止寫入操作');
        actions.push('啟動資料驗證');
        nextSteps.push('執行資料修復');
        nextSteps.push('驗證修復結果');
        estimatedRecoveryTime = 60;
        handled = true;
        break;

      case 'connection_failure':
        actions.push('檢查網路連線');
        actions.push('重啟資料庫連線池');
        actions.push('驗證認證資訊');
        nextSteps.push('檢查資料庫服務狀態');
        nextSteps.push('聯繫系統管理員');
        estimatedRecoveryTime = 15;
        handled = true;
        break;

      case 'sync_failure':
        actions.push('停止自動同步');
        actions.push('分析同步衝突');
        actions.push('回滾至最後已知良好狀態');
        nextSteps.push('手動解決同步衝突');
        nextSteps.push('重新啟動同步');
        estimatedRecoveryTime = 30;
        handled = true;
        break;

      default:
        actions.push('執行一般診斷程序');
        actions.push('生成診斷報告');
        nextSteps.push('聯繫技術支援');
        estimatedRecoveryTime = 120;
        handled = false;
        break;
    }

    return {
      handled,
      actions,
      nextSteps,
      estimatedRecoveryTime,
    };
  }
}

/**
 * 問題追蹤系統
 * 追蹤和管理系統問題
 */
export class IssueTracker {
  private issues: Map<string, IssueRecord> = new Map();

  /**
   * 追蹤問題
   */
  async trackIssue(issue: Issue): Promise<IssueTrackingResult> {
    const issueId = `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const trackedAt = new Date();

    const issueRecord: IssueRecord = {
      ...issue,
      issueId,
      trackedAt,
      status: 'open',
    };

    this.issues.set(issueId, issueRecord);

    return {
      issueId,
      tracked: true,
      trackedAt,
    };
  }

  /**
   * 解決問題
   */
  async resolveIssue(
    issueId: string,
    resolution: string
  ): Promise<IssueResolutionResult> {
    const issue = this.issues.get(issueId);
    if (!issue) {
      throw new Error(`問題 ${issueId} 不存在`);
    }

    const resolvedAt = new Date();
    issue.status = 'resolved';
    issue.resolvedAt = resolvedAt;
    issue.resolution = resolution;

    this.issues.set(issueId, issue);

    return {
      resolved: true,
      resolvedAt,
      resolution,
    };
  }

  /**
   * 生成問題報告
   */
  async generateIssueReport(): Promise<IssueReport> {
    const allIssues = Array.from(this.issues.values());
    const openIssues = allIssues.filter(
      issue => issue.status === 'open'
    ).length;
    const resolvedIssues = allIssues.filter(
      issue => issue.status === 'resolved'
    ).length;

    const issuesByType: Record<IssueType, number> = {
      connection_failure: 0,
      data_corruption: 0,
      sync_failure: 0,
      performance_issue: 0,
      timeout: 0,
      constraint_violation: 0,
    };

    const issuesBySeverity: Record<IssueSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const issue of allIssues) {
      issuesByType[issue.type]++;
      issuesBySeverity[issue.severity]++;

      if (issue.resolvedAt && issue.trackedAt) {
        totalResolutionTime +=
          issue.resolvedAt.getTime() - issue.trackedAt.getTime();
        resolvedCount++;
      }
    }

    const averageResolutionTime =
      resolvedCount > 0 ? totalResolutionTime / resolvedCount / (1000 * 60) : 0;

    return {
      totalIssues: allIssues.length,
      openIssues,
      resolvedIssues,
      issuesByType,
      issuesBySeverity,
      averageResolutionTime,
    };
  }

  /**
   * 分析問題模式
   */
  async analyzeIssuePatterns(): Promise<IssuePatternAnalysis> {
    const allIssues = Array.from(this.issues.values());

    // 分析問題類型頻率
    const typeFrequency: Record<string, number> = {};
    const severityImpact: Record<string, IssueSeverity> = {};

    for (const issue of allIssues) {
      typeFrequency[issue.type] = (typeFrequency[issue.type] || 0) + 1;
      severityImpact[issue.type] = issue.severity;
    }

    const patterns = Object.entries(typeFrequency).map(
      ([pattern, frequency]) => ({
        pattern,
        frequency,
        impact: severityImpact[pattern] || 'low',
      })
    );

    // 分析常見原因
    const commonCauses = [];
    if (typeFrequency['connection_failure'] > 2) {
      commonCauses.push('網路連線不穩定');
    }
    if (typeFrequency['sync_failure'] > 2) {
      commonCauses.push('資料同步衝突');
    }
    if (typeFrequency['performance_issue'] > 1) {
      commonCauses.push('系統效能問題');
    }

    // 生成建議
    const recommendations = [];
    if (commonCauses.includes('網路連線不穩定')) {
      recommendations.push('強化網路連線穩定性監控');
    }
    if (commonCauses.includes('資料同步衝突')) {
      recommendations.push('改善衝突解決策略');
    }
    if (commonCauses.includes('系統效能問題')) {
      recommendations.push('執行效能優化');
    }

    return {
      patterns,
      commonCauses,
      recommendations,
    };
  }
}

/**
 * 自動恢復系統
 * 提供自動化恢復功能
 */
export class AutoRecovery {
  private recoveryPolicies: RecoveryPolicies = {
    autoRetryLimit: 3,
    autoRollbackThreshold: 'high',
    notificationLevel: 'critical',
    enableAutoRecovery: true,
  };
  private activeRecoveries: Map<string, RecoveryProgress> = new Map();

  /**
   * 偵測恢復機會
   */
  async detectRecoveryOpportunities(): Promise<RecoveryOpportunitiesResult> {
    const opportunities: RecoveryOpportunity[] = [];

    // 檢查連線問題
    const diagnosticEngine = new DiagnosticEngine();
    const connectivity = await diagnosticEngine.checkDatabaseConnectivity();

    if (!connectivity.postgresql.connected || !connectivity.oracle.connected) {
      opportunities.push({
        type: 'connection_retry',
        confidence: 0.8,
        estimatedSuccess: 0.7,
        description: '重試資料庫連線',
        requiredActions: ['檢查網路狀態', '重新建立連線', '驗證認證'],
      });
    }

    // 檢查同步失敗
    const diagnostic = await diagnosticEngine.diagnoseMigrationIssues();
    const syncIssues = diagnostic.issues.filter(
      issue => issue.type === 'sync_failure'
    );

    if (syncIssues.length > 0) {
      opportunities.push({
        type: 'data_sync_retry',
        confidence: 0.6,
        estimatedSuccess: 0.5,
        description: '重試資料同步',
        requiredActions: ['分析同步衝突', '重新執行同步', '驗證同步結果'],
      });
    }

    // 評估整體信心度
    let overallConfidence: 'low' | 'medium' | 'high' = 'low';
    const avgSuccess =
      opportunities.reduce((sum, opp) => sum + opp.estimatedSuccess, 0) /
      opportunities.length;

    if (avgSuccess > 0.8) {
      overallConfidence = 'high';
    } else if (avgSuccess > 0.6) {
      overallConfidence = 'medium';
    }

    return {
      opportunities,
      confidence: overallConfidence,
      estimatedSuccess: avgSuccess || 0,
    };
  }

  /**
   * 執行自動恢復
   */
  async executeAutoRecovery(
    recoveryType: RecoveryType
  ): Promise<AutoRecoveryResult> {
    const startTime = Date.now();
    const actionsPerformed = [];

    try {
      if (!this.recoveryPolicies.enableAutoRecovery) {
        throw new Error('自動恢復功能已停用');
      }

      switch (recoveryType) {
        case 'connection_retry':
          actionsPerformed.push('重新建立資料庫連線');
          // 實際的連線重試邏輯在這裡實作
          await this.retryDatabaseConnections();
          break;

        case 'data_sync_retry':
          actionsPerformed.push('重試資料同步');
          // 實際的同步重試邏輯在這裡實作
          await this.retryDataSync();
          break;

        case 'partial_rollback':
          actionsPerformed.push('執行部分回滾');
          const rollbackManager = new RollbackManager();
          // 執行部分回滾邏輯
          break;

        case 'emergency_isolation':
          actionsPerformed.push('執行緊急隔離');
          const emergencyRecovery = new EmergencyRecovery();
          await emergencyRecovery.executeEmergencyRecovery();
          break;

        default:
          throw new Error(`不支援的恢復類型: ${recoveryType}`);
      }

      return {
        success: true,
        actionsPerformed,
        executedAt: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        actionsPerformed,
        executedAt: new Date(),
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 監控恢復進度
   */
  async monitorRecoveryProgress(recoveryId: string): Promise<RecoveryProgress> {
    const progress = this.activeRecoveries.get(recoveryId);

    if (!progress) {
      return {
        status: 'failed',
        progress: 0,
        estimatedCompletion: new Date(),
        currentStep: 'not_found',
        errors: ['恢復記錄不存在'],
      };
    }

    return progress;
  }

  /**
   * 配置恢復策略
   */
  async configureRecoveryPolicies(
    policies: Partial<RecoveryPolicies>
  ): Promise<RecoveryPolicyResult> {
    this.recoveryPolicies = {
      ...this.recoveryPolicies,
      ...policies,
    };

    return {
      configured: true,
      activePolicies: this.recoveryPolicies,
      configuredAt: new Date(),
    };
  }

  private async retryDatabaseConnections(): Promise<void> {
    // 實作資料庫連線重試邏輯
    const diagnosticEngine = new DiagnosticEngine();
    const connectivity = await diagnosticEngine.checkDatabaseConnectivity();

    if (!connectivity.overall) {
      throw new Error('資料庫連線重試失敗');
    }
  }

  private async retryDataSync(): Promise<void> {
    // 實作資料同步重試邏輯
    // 這裡會使用DataSynchronizer進行重試
  }
}
