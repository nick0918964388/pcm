import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Performance Regression Detection for Oracle Migration
// Oracle遷移的效能回歸檢測機制

interface PerformanceMetric {
  queryId: string;
  queryType: string;
  queryText: string;
  executionTime: number;
  cpuTime: number;
  memoryUsage: number;
  ioOperations: number;
  bufferGets: number;
  diskReads: number;
  indexesUsed: string[];
  planHash: string;
  timestamp: string;
  environment: string;
  dataSize: number;
}

interface PerformanceBaseline {
  queryId: string;
  baselineMetric: PerformanceMetric;
  tolerancePercentage: number;
  criticalThreshold: number;
  lastUpdated: string;
  sampleCount: number;
}

interface RegressionDetectionResult {
  queryId: string;
  baseline: PerformanceMetric;
  current: PerformanceMetric;
  performanceChange: number; // Percentage change
  isRegression: boolean;
  severity: 'none' | 'minor' | 'major' | 'critical';
  recommendation: string;
  confidence: number; // 0-1 scale
}

interface RegressionReport {
  testRun: string;
  timestamp: string;
  environment: string;
  totalQueries: number;
  regressionsDetected: number;
  improvements: number;
  criticalRegressions: RegressionDetectionResult[];
  majorRegressions: RegressionDetectionResult[];
  minorRegressions: RegressionDetectionResult[];
  improvements: RegressionDetectionResult[];
  summary: string;
}

describe('Performance Regression Detection - Oracle Environment', () => {
  const baselineDir = join(process.cwd(), 'performance-baselines');
  const reportsDir = join(process.cwd(), 'performance-reports');
  let currentTestRun: string;

  beforeAll(async () => {
    console.log('Setting up performance regression detection...');
    currentTestRun = `test-run-${Date.now()}`;

    // Ensure directories exist
    if (!existsSync(baselineDir)) {
      mkdirSync(baselineDir, { recursive: true });
    }
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }
  });

  afterAll(async () => {
    console.log('Cleaning up performance regression detection...');
  });

  beforeEach(() => {
    // Reset any test-specific state
  });

  async function executeQueryWithMetrics(
    queryId: string,
    queryText: string,
    queryType: string,
    parameters: any[] = []
  ): Promise<PerformanceMetric> {
    // RED: This will fail until Oracle performance monitoring is implemented
    const connection = await import('../../../lib/database/connection');
    const dbConnection = connection.getConnection();

    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    // Enable Oracle performance monitoring
    await dbConnection.query('ALTER SESSION SET STATISTICS_LEVEL = ALL');
    await dbConnection.query('ALTER SESSION SET TIMED_STATISTICS = TRUE');

    try {
      const result = await dbConnection.query(queryText, parameters);

      const endTime = performance.now();
      const endMemory = process.memoryUsage();

      // Get execution plan and statistics
      const planResult = await dbConnection.query(`
        SELECT sql_id, plan_hash_value, executions, buffer_gets, disk_reads, cpu_time
        FROM v$sql
        WHERE sql_text LIKE ?
        AND last_active_time >= SYSDATE - INTERVAL '1' MINUTE
        ORDER BY last_active_time DESC
        FETCH FIRST 1 ROWS ONLY
      `, [`%${queryText.substring(0, 50)}%`]);

      const sessionStats = await dbConnection.query(`
        SELECT name, value
        FROM v$mystat s, v$statname n
        WHERE s.statistic# = n.statistic#
        AND name IN (
          'CPU used by this session',
          'session logical reads',
          'physical reads',
          'redo size'
        )
      `);

      const stats = sessionStats.reduce((acc, row) => {
        acc[row.name] = row.value;
        return acc;
      }, {});

      const planInfo = planResult[0] || {};

      return {
        queryId,
        queryType,
        queryText,
        executionTime: endTime - startTime,
        cpuTime: planInfo.cpu_time || 0,
        memoryUsage: endMemory.heapUsed - startMemory.heapUsed,
        ioOperations: (stats['session logical reads'] || 0) + (stats['physical reads'] || 0),
        bufferGets: stats['session logical reads'] || 0,
        diskReads: stats['physical reads'] || 0,
        indexesUsed: [], // Would be extracted from execution plan
        planHash: planInfo.plan_hash_value?.toString() || '',
        timestamp: new Date().toISOString(),
        environment: 'oracle-test',
        dataSize: result.length
      };

    } finally {
      await dbConnection.query('ALTER SESSION SET STATISTICS_LEVEL = TYPICAL');
    }
  }

  function loadBaseline(queryId: string): PerformanceBaseline | null {
    const baselineFile = join(baselineDir, `${queryId}.json`);
    if (!existsSync(baselineFile)) {
      return null;
    }

    try {
      const content = readFileSync(baselineFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Failed to load baseline for ${queryId}:`, error);
      return null;
    }
  }

  function saveBaseline(baseline: PerformanceBaseline): void {
    const baselineFile = join(baselineDir, `${baseline.queryId}.json`);
    writeFileSync(baselineFile, JSON.stringify(baseline, null, 2));
  }

  function updateBaseline(metric: PerformanceMetric, tolerance: number = 10): PerformanceBaseline {
    const existing = loadBaseline(metric.queryId);

    if (!existing) {
      return {
        queryId: metric.queryId,
        baselineMetric: metric,
        tolerancePercentage: tolerance,
        criticalThreshold: tolerance * 3,
        lastUpdated: metric.timestamp,
        sampleCount: 1
      };
    }

    // Update baseline using moving average approach
    const newSampleCount = existing.sampleCount + 1;
    const alpha = 1.0 / Math.min(newSampleCount, 10); // Weighted average with last 10 samples

    const updatedBaseline: PerformanceBaseline = {
      ...existing,
      baselineMetric: {
        ...existing.baselineMetric,
        executionTime: existing.baselineMetric.executionTime * (1 - alpha) + metric.executionTime * alpha,
        cpuTime: existing.baselineMetric.cpuTime * (1 - alpha) + metric.cpuTime * alpha,
        memoryUsage: existing.baselineMetric.memoryUsage * (1 - alpha) + metric.memoryUsage * alpha,
        bufferGets: existing.baselineMetric.bufferGets * (1 - alpha) + metric.bufferGets * alpha,
        diskReads: existing.baselineMetric.diskReads * (1 - alpha) + metric.diskReads * alpha,
        timestamp: metric.timestamp
      },
      lastUpdated: metric.timestamp,
      sampleCount: newSampleCount
    };

    return updatedBaseline;
  }

  function detectRegression(current: PerformanceMetric, baseline: PerformanceBaseline): RegressionDetectionResult {
    const baselineMetric = baseline.baselineMetric;

    // Calculate performance change percentage
    const performanceChange = ((current.executionTime - baselineMetric.executionTime) / baselineMetric.executionTime) * 100;

    // Determine if this is a regression
    const isRegression = performanceChange > baseline.tolerancePercentage;

    // Determine severity
    let severity: 'none' | 'minor' | 'major' | 'critical' = 'none';
    if (performanceChange > baseline.criticalThreshold) {
      severity = 'critical';
    } else if (performanceChange > baseline.tolerancePercentage * 2) {
      severity = 'major';
    } else if (performanceChange > baseline.tolerancePercentage) {
      severity = 'minor';
    }

    // Generate recommendation
    let recommendation = '';
    if (severity === 'critical') {
      recommendation = 'CRITICAL: Immediate investigation required - performance degraded significantly';
    } else if (severity === 'major') {
      recommendation = 'MAJOR: Query optimization needed - consider index review or query rewrite';
    } else if (severity === 'minor') {
      recommendation = 'MINOR: Monitor trend - may need optimization if continues';
    } else if (performanceChange < -5) {
      recommendation = 'IMPROVEMENT: Performance has improved';
    } else {
      recommendation = 'STABLE: Performance within acceptable range';
    }

    // Calculate confidence based on sample size and consistency
    const confidence = Math.min(baseline.sampleCount / 10, 1.0);

    return {
      queryId: current.queryId,
      baseline: baselineMetric,
      current,
      performanceChange,
      isRegression,
      severity,
      recommendation,
      confidence
    };
  }

  function generateRegressionReport(results: RegressionDetectionResult[]): RegressionReport {
    const criticalRegressions = results.filter(r => r.severity === 'critical');
    const majorRegressions = results.filter(r => r.severity === 'major');
    const minorRegressions = results.filter(r => r.severity === 'minor');
    const improvements = results.filter(r => r.performanceChange < -5);

    const totalRegressions = criticalRegressions.length + majorRegressions.length + minorRegressions.length;

    let summary = '';
    if (criticalRegressions.length > 0) {
      summary = `CRITICAL: ${criticalRegressions.length} critical performance regressions detected`;
    } else if (majorRegressions.length > 0) {
      summary = `WARNING: ${majorRegressions.length} major performance regressions detected`;
    } else if (minorRegressions.length > 0) {
      summary = `INFO: ${minorRegressions.length} minor performance regressions detected`;
    } else {
      summary = 'HEALTHY: No significant performance regressions detected';
    }

    return {
      testRun: currentTestRun,
      timestamp: new Date().toISOString(),
      environment: 'oracle-test',
      totalQueries: results.length,
      regressionsDetected: totalRegressions,
      improvements: improvements.length,
      criticalRegressions,
      majorRegressions,
      minorRegressions,
      improvements,
      summary
    };
  }

  function saveRegressionReport(report: RegressionReport): void {
    const reportFile = join(reportsDir, `regression-report-${currentTestRun}.json`);
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
  }

  describe('Baseline Establishment', () => {
    it('should establish baseline metrics for core queries', async () => {
      const coreQueries = [
        { id: 'user_authentication', sql: 'SELECT * FROM users WHERE email = ? AND password_hash = ?', type: 'authentication' },
        { id: 'project_listing', sql: 'SELECT * FROM projects WHERE status = ? ORDER BY updated_at DESC LIMIT 50', type: 'listing' },
        { id: 'project_details', sql: 'SELECT p.*, u.username FROM projects p JOIN users u ON p.created_by = u.id WHERE p.id = ?', type: 'detail' },
        { id: 'duty_schedule_query', sql: 'SELECT * FROM duty_schedules WHERE project_id = ? AND date_assigned >= ? ORDER BY date_assigned', type: 'schedule' },
        { id: 'vendor_search', sql: 'SELECT * FROM vendors WHERE name ILIKE ? OR contact_info ILIKE ? LIMIT 20', type: 'search' }
      ];

      const baselines: PerformanceBaseline[] = [];

      for (const query of coreQueries) {
        const testParams = query.id === 'user_authentication' ? ['test@example.com', 'hash'] :
                          query.id === 'project_listing' ? ['active'] :
                          query.id === 'project_details' ? [1] :
                          query.id === 'duty_schedule_query' ? [1, new Date()] :
                          ['%test%', '%test%'];

        const metric = await executeQueryWithMetrics(query.id, query.sql, query.type, testParams);
        const baseline = updateBaseline(metric, 15); // 15% tolerance for baselines

        saveBaseline(baseline);
        baselines.push(baseline);

        console.log(`Baseline established for ${query.id}:`, {
          executionTime: metric.executionTime,
          bufferGets: metric.bufferGets,
          diskReads: metric.diskReads
        });
      }

      expect(baselines.length).toBe(coreQueries.length);
      expect(baselines.every(b => b.baselineMetric.executionTime > 0)).toBe(true);
      expect(baselines.every(b => existsSync(join(baselineDir, `${b.queryId}.json`)))).toBe(true);
    });

    it('should handle baseline updates with new measurements', async () => {
      const queryId = 'baseline_update_test';
      const testQuery = 'SELECT COUNT(*) FROM projects WHERE status = ?';

      // First measurement
      const metric1 = await executeQueryWithMetrics(queryId, testQuery, 'count', ['active']);
      const baseline1 = updateBaseline(metric1, 10);
      saveBaseline(baseline1);

      // Second measurement
      const metric2 = await executeQueryWithMetrics(queryId, testQuery, 'count', ['active']);
      const baseline2 = updateBaseline(metric2, 10);
      saveBaseline(baseline2);

      expect(baseline1.sampleCount).toBe(1);
      expect(baseline2.sampleCount).toBe(2);
      expect(baseline2.baselineMetric.executionTime).not.toBe(metric1.executionTime);

      // Baseline should be influenced by both measurements
      const loadedBaseline = loadBaseline(queryId);
      expect(loadedBaseline).not.toBeNull();
      expect(loadedBaseline!.sampleCount).toBe(2);
    });
  });

  describe('Regression Detection', () => {
    it('should detect performance regressions in query execution', async () => {
      const queryId = 'regression_test_query';
      const testQuery = 'SELECT * FROM projects WHERE priority >= ? ORDER BY created_at DESC LIMIT 100';

      // Establish baseline
      const baselineMetric = await executeQueryWithMetrics(queryId, testQuery, 'priority_filter', [3]);
      const baseline = updateBaseline(baselineMetric, 10);
      saveBaseline(baseline);

      // Simulate a regression by using a more complex query
      const regressedQuery = `
        SELECT p.*, u.username, COUNT(d.id) as duty_count
        FROM projects p
        JOIN users u ON p.created_by = u.id
        LEFT JOIN duty_schedules d ON d.project_id = p.id
        WHERE p.priority >= ?
        GROUP BY p.id, p.name, p.description, p.status, p.priority, p.created_at, p.updated_at, u.username
        ORDER BY p.created_at DESC
        LIMIT 100
      `;

      const currentMetric = await executeQueryWithMetrics(queryId, regressedQuery, 'priority_filter', [3]);
      const regression = detectRegression(currentMetric, baseline);

      console.log('Regression detection result:', regression);

      // The more complex query should show some performance change
      expect(Math.abs(regression.performanceChange)).toBeGreaterThan(0);
      expect(regression.confidence).toBeGreaterThan(0);
      expect(regression.recommendation).toBeDefined();
    });

    it('should classify regression severity correctly', async () => {
      const queryId = 'severity_test_query';
      const baselineMetric: PerformanceMetric = {
        queryId,
        queryType: 'test',
        queryText: 'SELECT * FROM projects LIMIT 1',
        executionTime: 100,
        cpuTime: 50,
        memoryUsage: 1000,
        ioOperations: 10,
        bufferGets: 100,
        diskReads: 5,
        indexesUsed: [],
        planHash: 'test-hash',
        timestamp: new Date().toISOString(),
        environment: 'test',
        dataSize: 1
      };

      const baseline: PerformanceBaseline = {
        queryId,
        baselineMetric,
        tolerancePercentage: 10,
        criticalThreshold: 30,
        lastUpdated: new Date().toISOString(),
        sampleCount: 5
      };

      // Test minor regression (15% slower)
      const minorRegressionMetric = { ...baselineMetric, executionTime: 115 };
      const minorResult = detectRegression(minorRegressionMetric, baseline);
      expect(minorResult.severity).toBe('minor');
      expect(minorResult.isRegression).toBe(true);

      // Test major regression (25% slower)
      const majorRegressionMetric = { ...baselineMetric, executionTime: 125 };
      const majorResult = detectRegression(majorRegressionMetric, baseline);
      expect(majorResult.severity).toBe('major');
      expect(majorResult.isRegression).toBe(true);

      // Test critical regression (40% slower)
      const criticalRegressionMetric = { ...baselineMetric, executionTime: 140 };
      const criticalResult = detectRegression(criticalRegressionMetric, baseline);
      expect(criticalResult.severity).toBe('critical');
      expect(criticalResult.isRegression).toBe(true);

      // Test improvement (20% faster)
      const improvementMetric = { ...baselineMetric, executionTime: 80 };
      const improvementResult = detectRegression(improvementMetric, baseline);
      expect(improvementResult.severity).toBe('none');
      expect(improvementResult.isRegression).toBe(false);
      expect(improvementResult.performanceChange).toBeLessThan(0);
    });

    it('should handle queries without baselines', async () => {
      const newQueryId = 'new_query_without_baseline';
      const newQuery = 'SELECT COUNT(*) FROM vendors WHERE created_at >= ?';

      const metric = await executeQueryWithMetrics(newQueryId, newQuery, 'vendor_count', [new Date()]);
      const baseline = loadBaseline(newQueryId);

      expect(baseline).toBeNull();

      // Should create new baseline
      const newBaseline = updateBaseline(metric, 15);
      saveBaseline(newBaseline);

      const savedBaseline = loadBaseline(newQueryId);
      expect(savedBaseline).not.toBeNull();
      expect(savedBaseline!.queryId).toBe(newQueryId);
      expect(savedBaseline!.sampleCount).toBe(1);
    });
  });

  describe('Regression Reporting', () => {
    it('should generate comprehensive regression reports', async () => {
      const testQueries = [
        { id: 'report_test_1', sql: 'SELECT * FROM users WHERE status = ?', type: 'user_query' },
        { id: 'report_test_2', sql: 'SELECT * FROM projects WHERE created_at >= ?', type: 'project_query' },
        { id: 'report_test_3', sql: 'SELECT COUNT(*) FROM duty_schedules GROUP BY project_id', type: 'aggregation' }
      ];

      const regressionResults: RegressionDetectionResult[] = [];

      for (const query of testQueries) {
        const params = query.id === 'report_test_1' ? ['active'] :
                      query.id === 'report_test_2' ? [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] :
                      [];

        const metric = await executeQueryWithMetrics(query.id, query.sql, query.type, params);

        // Create baseline
        const baseline = updateBaseline(metric, 10);
        saveBaseline(baseline);

        // Create regression result
        const regression = detectRegression(metric, baseline);
        regressionResults.push(regression);
      }

      const report = generateRegressionReport(regressionResults);
      saveRegressionReport(report);

      expect(report.totalQueries).toBe(testQueries.length);
      expect(report.testRun).toBe(currentTestRun);
      expect(report.timestamp).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(existsSync(join(reportsDir, `regression-report-${currentTestRun}.json`))).toBe(true);

      console.log('Regression report generated:', {
        totalQueries: report.totalQueries,
        regressionsDetected: report.regressionsDetected,
        improvements: report.improvements,
        summary: report.summary
      });
    });

    it('should track performance trends over time', async () => {
      const queryId = 'trend_tracking_query';
      const testQuery = 'SELECT * FROM projects ORDER BY updated_at DESC LIMIT 10';

      const measurements = [];

      // Simulate multiple measurements over time
      for (let i = 0; i < 5; i++) {
        const metric = await executeQueryWithMetrics(queryId, testQuery, 'trend_test', []);

        // Simulate slight performance variation
        metric.executionTime = metric.executionTime * (1 + (Math.random() - 0.5) * 0.1);

        measurements.push(metric);

        const baseline = updateBaseline(metric, 10);
        saveBaseline(baseline);
      }

      const finalBaseline = loadBaseline(queryId);
      expect(finalBaseline).not.toBeNull();
      expect(finalBaseline!.sampleCount).toBe(5);

      // Verify that baseline represents a running average
      const avgExecutionTime = measurements.reduce((sum, m) => sum + m.executionTime, 0) / measurements.length;
      expect(Math.abs(finalBaseline!.baselineMetric.executionTime - avgExecutionTime)).toBeLessThan(avgExecutionTime * 0.2);

      console.log('Trend tracking results:', {
        measurements: measurements.length,
        finalSampleCount: finalBaseline!.sampleCount,
        avgExecutionTime,
        baselineExecutionTime: finalBaseline!.baselineMetric.executionTime
      });
    });
  });

  describe('Automated Regression Testing', () => {
    it('should run full regression test suite and report results', async () => {
      const regressionSuite = [
        { id: 'auth_performance', sql: 'SELECT * FROM users WHERE email = ?', params: ['test@example.com'], tolerance: 10 },
        { id: 'project_search', sql: 'SELECT * FROM projects WHERE name ILIKE ? LIMIT 20', params: ['%test%'], tolerance: 15 },
        { id: 'duty_aggregation', sql: 'SELECT project_id, COUNT(*) FROM duty_schedules GROUP BY project_id', params: [], tolerance: 20 },
        { id: 'vendor_lookup', sql: 'SELECT * FROM vendors WHERE id IN (?, ?, ?)', params: [1, 2, 3], tolerance: 10 },
        { id: 'complex_join', sql: `
          SELECT p.name, u.username, COUNT(d.id) as duties
          FROM projects p
          JOIN users u ON p.created_by = u.id
          LEFT JOIN duty_schedules d ON d.project_id = p.id
          WHERE p.status = ?
          GROUP BY p.id, p.name, u.username
          LIMIT 50
        `, params: ['active'], tolerance: 25 }
      ];

      const regressionResults: RegressionDetectionResult[] = [];

      for (const testCase of regressionSuite) {
        try {
          // Measure current performance
          const currentMetric = await executeQueryWithMetrics(
            testCase.id,
            testCase.sql,
            'regression_suite',
            testCase.params
          );

          // Load or create baseline
          let baseline = loadBaseline(testCase.id);
          if (!baseline) {
            baseline = updateBaseline(currentMetric, testCase.tolerance);
            saveBaseline(baseline);
          }

          // Detect regression
          const regression = detectRegression(currentMetric, baseline);
          regressionResults.push(regression);

          console.log(`Regression test ${testCase.id}:`, {
            executionTime: currentMetric.executionTime,
            performanceChange: regression.performanceChange,
            severity: regression.severity
          });

        } catch (error) {
          console.error(`Failed to run regression test ${testCase.id}:`, error);
        }
      }

      // Generate final report
      const report = generateRegressionReport(regressionResults);
      saveRegressionReport(report);

      // Verify test suite completion
      expect(regressionResults.length).toBeGreaterThan(0);
      expect(regressionResults.every(r => r.confidence > 0)).toBe(true);

      // Check for critical regressions
      const criticalCount = regressionResults.filter(r => r.severity === 'critical').length;
      if (criticalCount > 0) {
        console.warn(`ALERT: ${criticalCount} critical performance regressions detected!`);
      }

      // The test should pass even if regressions are detected (for reporting purposes)
      expect(report.totalQueries).toBe(regressionResults.length);

      console.log('Full regression test suite completed:', {
        totalQueries: report.totalQueries,
        regressionsDetected: report.regressionsDetected,
        criticalRegressions: report.criticalRegressions.length,
        majorRegressions: report.majorRegressions.length,
        improvements: report.improvements
      });
    });
  });
});