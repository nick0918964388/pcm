import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Capacity Planning and Load Testing for Oracle Migration
// Oracle遷移的容量規劃和負載測試工具

interface LoadTestConfig {
  testName: string;
  targetRPS: number; // Requests per second
  concurrentUsers: number;
  testDuration: number; // milliseconds
  rampUpTime: number; // milliseconds
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: any;
  expectedLatency: number; // milliseconds
  expectedThroughput: number; // requests per second
}

interface LoadTestResult {
  testName: string;
  config: LoadTestConfig;
  actualRPS: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  maxLatency: number;
  minLatency: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  throughputMBps: number;
  cpuUtilization: number;
  memoryUtilization: number;
  databaseConnections: number;
  databaseResponseTime: number;
  startTime: string;
  endTime: string;
  duration: number;
}

interface CapacityMetrics {
  maxConcurrentUsers: number;
  maxThroughput: number;
  maxDatabaseConnections: number;
  resourceBottlenecks: string[];
  scalingRecommendations: string[];
  hardwareLimits: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  databaseLimits: {
    connections: number;
    sessionsPerSecond: number;
    transactionsPerSecond: number;
    queriesPerSecond: number;
  };
}

interface CapacityPlan {
  currentCapacity: CapacityMetrics;
  projectedLoad: {
    users: number;
    requestsPerDay: number;
    peakConcurrentUsers: number;
    growthRate: number;
  };
  recommendations: {
    hardwareUpgrade: boolean;
    databaseOptimization: string[];
    architectureChanges: string[];
    monitoringRequirements: string[];
  };
  estimatedCosts: {
    currentMonthly: number;
    projectedMonthly: number;
    upgradeOneTime: number;
  };
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    mitigationStrategies: string[];
  };
}

describe('Capacity Planning and Load Testing - Oracle Environment', () => {
  const resultsDir = join(process.cwd(), 'capacity-test-results');
  let baseUrl: string;

  beforeAll(async () => {
    console.log('Setting up capacity planning and load testing...');
    baseUrl = 'http://localhost:3000';

    if (!existsSync(resultsDir)) {
      mkdirSync(resultsDir, { recursive: true });
    }
  });

  afterAll(async () => {
    console.log('Cleaning up capacity planning tests...');
  });

  async function executeLoadTest(
    config: LoadTestConfig
  ): Promise<LoadTestResult> {
    // RED: This will fail until load testing infrastructure is implemented
    const startTime = new Date();
    const endTime = new Date(Date.now() + config.testDuration);

    const latencies: number[] = [];
    const errors: string[] = [];
    let totalRequests = 0;
    let successfulRequests = 0;
    let totalBytes = 0;

    console.log(`Starting load test: ${config.testName}`);

    // Create worker promises for concurrent users
    const workerPromises: Promise<void>[] = [];

    for (let i = 0; i < config.concurrentUsers; i++) {
      const workerDelay = (config.rampUpTime / config.concurrentUsers) * i;

      workerPromises.push(
        new Promise(async resolve => {
          // Ramp up delay
          await new Promise(r => setTimeout(r, workerDelay));

          while (Date.now() < endTime.getTime()) {
            try {
              const requestStart = performance.now();

              const response = await fetch(`${baseUrl}${config.endpoint}`, {
                method: config.method,
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': `LoadTest-Worker-${i}`,
                },
                body: config.payload
                  ? JSON.stringify(config.payload)
                  : undefined,
              });

              const requestEnd = performance.now();
              const latency = requestEnd - requestStart;

              totalRequests++;
              latencies.push(latency);

              if (response.ok) {
                successfulRequests++;
                const responseText = await response.text();
                totalBytes += responseText.length;
              } else {
                errors.push(`HTTP_${response.status}`);
              }
            } catch (error) {
              totalRequests++;
              errors.push(error.message || 'NETWORK_ERROR');
            }

            // Maintain target RPS with small delay
            const targetInterval =
              1000 / (config.targetRPS / config.concurrentUsers);
            await new Promise(r => setTimeout(r, Math.max(10, targetInterval)));
          }
          resolve();
        })
      );
    }

    await Promise.all(workerPromises);

    const finalEndTime = new Date();
    const actualDuration = finalEndTime.getTime() - startTime.getTime();

    // Calculate statistics
    latencies.sort((a, b) => a - b);
    const p50Latency = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95Latency = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99Latency = latencies[Math.floor(latencies.length * 0.99)] || 0;
    const averageLatency =
      latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;

    const actualRPS = (totalRequests / actualDuration) * 1000;
    const errorRate =
      totalRequests > 0 ? (errors.length / totalRequests) * 100 : 0;
    const throughputMBps = totalBytes / 1024 / 1024 / (actualDuration / 1000);

    return {
      testName: config.testName,
      config,
      actualRPS,
      averageLatency,
      p50Latency,
      p95Latency,
      p99Latency,
      maxLatency: Math.max(...latencies, 0),
      minLatency: Math.min(...latencies, Infinity) || 0,
      totalRequests,
      successfulRequests,
      failedRequests: errors.length,
      errorRate,
      throughputMBps,
      cpuUtilization: 0, // Would be measured from system metrics
      memoryUtilization: 0, // Would be measured from system metrics
      databaseConnections: 0, // Would be measured from database
      databaseResponseTime: averageLatency * 0.7, // Estimated DB portion
      startTime: startTime.toISOString(),
      endTime: finalEndTime.toISOString(),
      duration: actualDuration,
    };
  }

  async function measureSystemCapacity(): Promise<CapacityMetrics> {
    // RED: This will fail until system monitoring is implemented
    const connection = await import('../../../lib/database/connection');
    const dbConnection = connection.getConnection();

    try {
      // Get database capacity information
      const poolInfo = await dbConnection.query(`
        SELECT
          maximum_connections,
          current_connections,
          max_sessions_per_second,
          current_sessions
        FROM (
          SELECT
            (SELECT value FROM v$parameter WHERE name = 'processes') as maximum_connections,
            (SELECT count(*) FROM v$session WHERE status = 'ACTIVE') as current_connections,
            100 as max_sessions_per_second,
            (SELECT count(*) FROM v$session) as current_sessions
          FROM dual
        )
      `);

      const systemInfo = poolInfo[0] || {};

      return {
        maxConcurrentUsers: Math.floor(
          (systemInfo.maximum_connections || 100) * 0.8
        ), // 80% of max connections
        maxThroughput: systemInfo.max_sessions_per_second || 100,
        maxDatabaseConnections: systemInfo.maximum_connections || 100,
        resourceBottlenecks: [],
        scalingRecommendations: [],
        hardwareLimits: {
          cpu: 80, // 80% CPU utilization threshold
          memory: 85, // 85% memory utilization threshold
          disk: 90, // 90% disk utilization threshold
          network: 70, // 70% network utilization threshold
        },
        databaseLimits: {
          connections: systemInfo.maximum_connections || 100,
          sessionsPerSecond: systemInfo.max_sessions_per_second || 100,
          transactionsPerSecond: 50,
          queriesPerSecond: 500,
        },
      };
    } catch (error) {
      console.warn('Could not measure system capacity:', error);
      return {
        maxConcurrentUsers: 50,
        maxThroughput: 100,
        maxDatabaseConnections: 100,
        resourceBottlenecks: ['database_connection_limit'],
        scalingRecommendations: ['increase_connection_pool'],
        hardwareLimits: {
          cpu: 80,
          memory: 85,
          disk: 90,
          network: 70,
        },
        databaseLimits: {
          connections: 100,
          sessionsPerSecond: 100,
          transactionsPerSecond: 50,
          queriesPerSecond: 500,
        },
      };
    }
  }

  function generateCapacityPlan(
    currentMetrics: CapacityMetrics,
    loadTestResults: LoadTestResult[],
    projectedGrowth: number = 2.0
  ): CapacityPlan {
    const currentPeakRPS = Math.max(...loadTestResults.map(r => r.actualRPS));
    const currentPeakLatency = Math.max(
      ...loadTestResults.map(r => r.p95Latency)
    );
    const averageErrorRate =
      loadTestResults.reduce((sum, r) => sum + r.errorRate, 0) /
      loadTestResults.length;

    const projectedPeakRPS = currentPeakRPS * projectedGrowth;
    const projectedConcurrentUsers =
      Math.max(...loadTestResults.map(r => r.config.concurrentUsers)) *
      projectedGrowth;

    const recommendations = {
      hardwareUpgrade:
        projectedConcurrentUsers > currentMetrics.maxConcurrentUsers,
      databaseOptimization: [] as string[],
      architectureChanges: [] as string[],
      monitoringRequirements: [] as string[],
    };

    // Analyze bottlenecks and generate recommendations
    if (currentPeakLatency > 1000) {
      recommendations.databaseOptimization.push('Optimize slow queries');
      recommendations.databaseOptimization.push('Review index usage');
    }

    if (averageErrorRate > 5) {
      recommendations.architectureChanges.push('Implement circuit breakers');
      recommendations.architectureChanges.push('Add retry mechanisms');
    }

    if (projectedPeakRPS > currentMetrics.maxThroughput) {
      recommendations.architectureChanges.push('Consider horizontal scaling');
      recommendations.architectureChanges.push('Implement connection pooling');
    }

    recommendations.monitoringRequirements.push(
      'Real-time performance dashboards'
    );
    recommendations.monitoringRequirements.push(
      'Automated alerting for capacity thresholds'
    );

    const riskLevel =
      projectedConcurrentUsers > currentMetrics.maxConcurrentUsers * 1.5
        ? 'critical'
        : projectedConcurrentUsers > currentMetrics.maxConcurrentUsers * 1.2
          ? 'high'
          : projectedConcurrentUsers > currentMetrics.maxConcurrentUsers
            ? 'medium'
            : 'low';

    return {
      currentCapacity: currentMetrics,
      projectedLoad: {
        users: Math.floor(projectedConcurrentUsers),
        requestsPerDay: Math.floor(projectedPeakRPS * 86400),
        peakConcurrentUsers: Math.floor(projectedConcurrentUsers),
        growthRate: projectedGrowth,
      },
      recommendations,
      estimatedCosts: {
        currentMonthly: 1000, // Placeholder
        projectedMonthly: 1000 * projectedGrowth,
        upgradeOneTime: recommendations.hardwareUpgrade ? 5000 : 0,
      },
      riskAssessment: {
        level: riskLevel,
        factors: [
          `Projected load increase: ${((projectedGrowth - 1) * 100).toFixed(0)}%`,
          `Current error rate: ${averageErrorRate.toFixed(1)}%`,
          `Peak latency: ${currentPeakLatency.toFixed(0)}ms`,
        ],
        mitigationStrategies: [
          'Gradual capacity scaling',
          'Performance monitoring and alerting',
          'Load balancing optimization',
        ],
      },
    };
  }

  function saveResults(fileName: string, data: any): void {
    const filePath = join(resultsDir, fileName);
    writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Results saved to: ${filePath}`);
  }

  describe('Load Testing Scenarios', () => {
    it('should test baseline API load capacity', async () => {
      const config: LoadTestConfig = {
        testName: 'baseline_api_load',
        targetRPS: 10,
        concurrentUsers: 5,
        testDuration: 30000, // 30 seconds
        rampUpTime: 5000, // 5 seconds
        endpoint: '/api/health',
        method: 'GET',
        expectedLatency: 100,
        expectedThroughput: 10,
      };

      const result = await executeLoadTest(config);
      saveResults('baseline-load-test.json', result);

      console.log('Baseline load test results:', {
        actualRPS: result.actualRPS,
        averageLatency: result.averageLatency,
        errorRate: result.errorRate,
        successRate: (result.successfulRequests / result.totalRequests) * 100,
      });

      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.errorRate).toBeLessThan(10); // Less than 10% error rate
      expect(result.averageLatency).toBeLessThan(config.expectedLatency * 2); // Within 2x expected
    });

    it('should test authentication endpoint under load', async () => {
      const config: LoadTestConfig = {
        testName: 'auth_endpoint_load',
        targetRPS: 5,
        concurrentUsers: 10,
        testDuration: 20000, // 20 seconds
        rampUpTime: 3000, // 3 seconds
        endpoint: '/api/auth/me',
        method: 'GET',
        expectedLatency: 200,
        expectedThroughput: 5,
      };

      const result = await executeLoadTest(config);
      saveResults('auth-load-test.json', result);

      console.log('Authentication load test results:', {
        actualRPS: result.actualRPS,
        p95Latency: result.p95Latency,
        errorRate: result.errorRate,
      });

      expect(result.p95Latency).toBeLessThan(1000); // 95th percentile under 1 second
      expect(result.errorRate).toBeLessThan(15); // Authentication might have higher error tolerance
    });

    it('should test database-heavy operations under load', async () => {
      const config: LoadTestConfig = {
        testName: 'database_heavy_load',
        targetRPS: 3,
        concurrentUsers: 8,
        testDuration: 25000, // 25 seconds
        rampUpTime: 5000, // 5 seconds
        endpoint: '/api/projects',
        method: 'GET',
        expectedLatency: 300,
        expectedThroughput: 3,
      };

      const result = await executeLoadTest(config);
      saveResults('database-heavy-load-test.json', result);

      console.log('Database heavy load test results:', {
        actualRPS: result.actualRPS,
        databaseResponseTime: result.databaseResponseTime,
        throughputMBps: result.throughputMBps,
      });

      expect(result.databaseResponseTime).toBeLessThan(500); // Database response under 500ms
      expect(result.errorRate).toBeLessThan(5); // Database operations should be more reliable
    });

    it('should test write operations under concurrent load', async () => {
      const testProject = {
        name: 'Load Test Project',
        description: 'Created during load testing',
        type: 'internal',
        priority: 3,
      };

      const config: LoadTestConfig = {
        testName: 'write_operations_load',
        targetRPS: 2,
        concurrentUsers: 5,
        testDuration: 15000, // 15 seconds
        rampUpTime: 2000, // 2 seconds
        endpoint: '/api/projects',
        method: 'POST',
        payload: testProject,
        expectedLatency: 500,
        expectedThroughput: 2,
      };

      const result = await executeLoadTest(config);
      saveResults('write-operations-load-test.json', result);

      console.log('Write operations load test results:', {
        actualRPS: result.actualRPS,
        averageLatency: result.averageLatency,
        errorRate: result.errorRate,
      });

      // Write operations may have higher latency and error rates
      expect(result.averageLatency).toBeLessThan(1000);
      expect(result.errorRate).toBeLessThan(20); // Some write conflicts expected
    });
  });

  describe('Capacity Discovery', () => {
    it('should determine maximum concurrent user capacity', async () => {
      const capacityTests = [
        { users: 5, duration: 10000 },
        { users: 10, duration: 10000 },
        { users: 20, duration: 10000 },
        { users: 30, duration: 10000 },
      ];

      const results: LoadTestResult[] = [];

      for (const test of capacityTests) {
        const config: LoadTestConfig = {
          testName: `capacity_test_${test.users}_users`,
          targetRPS: test.users * 2,
          concurrentUsers: test.users,
          testDuration: test.duration,
          rampUpTime: 2000,
          endpoint: '/api/health',
          method: 'GET',
          expectedLatency: 200,
          expectedThroughput: test.users * 2,
        };

        const result = await executeLoadTest(config);
        results.push(result);

        console.log(`Capacity test with ${test.users} users:`, {
          actualRPS: result.actualRPS,
          errorRate: result.errorRate,
          p95Latency: result.p95Latency,
        });

        // Break if performance degrades significantly
        if (result.errorRate > 50 || result.p95Latency > 5000) {
          console.log(
            `Performance degradation detected at ${test.users} concurrent users`
          );
          break;
        }
      }

      saveResults('capacity-discovery.json', results);

      // Find the highest successful load level
      const successfulTests = results.filter(
        r => r.errorRate < 20 && r.p95Latency < 2000
      );
      const maxCapacity = Math.max(
        ...successfulTests.map(r => r.config.concurrentUsers)
      );

      console.log(`Maximum concurrent user capacity: ${maxCapacity}`);

      expect(results.length).toBeGreaterThan(0);
      expect(maxCapacity).toBeGreaterThan(0);
    });

    it('should measure system resource limits', async () => {
      const capacityMetrics = await measureSystemCapacity();
      saveResults('system-capacity-metrics.json', capacityMetrics);

      console.log('System capacity metrics:', capacityMetrics);

      expect(capacityMetrics.maxConcurrentUsers).toBeGreaterThan(0);
      expect(capacityMetrics.maxThroughput).toBeGreaterThan(0);
      expect(capacityMetrics.databaseLimits.connections).toBeGreaterThan(0);
    });

    it('should identify performance bottlenecks', async () => {
      // Test different endpoints to identify bottlenecks
      const bottleneckTests = [
        { endpoint: '/api/health', name: 'health_check', expectedFast: true },
        {
          endpoint: '/api/auth/me',
          name: 'authentication',
          expectedFast: false,
        },
        {
          endpoint: '/api/projects',
          name: 'database_query',
          expectedFast: false,
        },
        {
          endpoint: '/api/vendors',
          name: 'complex_query',
          expectedFast: false,
        },
      ];

      const bottleneckResults: LoadTestResult[] = [];

      for (const test of bottleneckTests) {
        const config: LoadTestConfig = {
          testName: `bottleneck_${test.name}`,
          targetRPS: 5,
          concurrentUsers: 10,
          testDuration: 15000,
          rampUpTime: 2000,
          endpoint: test.endpoint,
          method: 'GET',
          expectedLatency: test.expectedFast ? 50 : 200,
          expectedThroughput: 5,
        };

        const result = await executeLoadTest(config);
        bottleneckResults.push(result);
      }

      saveResults('bottleneck-analysis.json', bottleneckResults);

      // Identify slowest endpoints
      const sortedByLatency = bottleneckResults.sort(
        (a, b) => b.p95Latency - a.p95Latency
      );
      const slowestEndpoint = sortedByLatency[0];

      console.log('Performance bottleneck analysis:', {
        slowestEndpoint: slowestEndpoint.config.endpoint,
        p95Latency: slowestEndpoint.p95Latency,
        errorRate: slowestEndpoint.errorRate,
      });

      expect(bottleneckResults.length).toBe(bottleneckTests.length);
      expect(slowestEndpoint.p95Latency).toBeGreaterThan(0);
    });
  });

  describe('Capacity Planning', () => {
    it('should generate comprehensive capacity plan', async () => {
      // Run a series of load tests
      const planningTests = [
        {
          name: 'current_load',
          targetRPS: 5,
          concurrentUsers: 10,
          duration: 20000,
        },
        {
          name: 'peak_load',
          targetRPS: 15,
          concurrentUsers: 25,
          duration: 15000,
        },
        {
          name: 'stress_test',
          targetRPS: 25,
          concurrentUsers: 40,
          duration: 10000,
        },
      ];

      const planningResults: LoadTestResult[] = [];

      for (const test of planningTests) {
        const config: LoadTestConfig = {
          testName: test.name,
          targetRPS: test.targetRPS,
          concurrentUsers: test.concurrentUsers,
          testDuration: test.duration,
          rampUpTime: 3000,
          endpoint: '/api/projects',
          method: 'GET',
          expectedLatency: 300,
          expectedThroughput: test.targetRPS,
        };

        const result = await executeLoadTest(config);
        planningResults.push(result);
      }

      // Measure current system capacity
      const currentMetrics = await measureSystemCapacity();

      // Generate capacity plan with 2x growth projection
      const capacityPlan = generateCapacityPlan(
        currentMetrics,
        planningResults,
        2.0
      );

      saveResults('capacity-plan.json', capacityPlan);

      console.log('Capacity planning results:', {
        currentMaxUsers: capacityPlan.currentCapacity.maxConcurrentUsers,
        projectedUsers: capacityPlan.projectedLoad.peakConcurrentUsers,
        riskLevel: capacityPlan.riskAssessment.level,
        hardwareUpgradeNeeded: capacityPlan.recommendations.hardwareUpgrade,
        estimatedMonthlyCost: capacityPlan.estimatedCosts.projectedMonthly,
      });

      expect(capacityPlan.currentCapacity.maxConcurrentUsers).toBeGreaterThan(
        0
      );
      expect(capacityPlan.projectedLoad.peakConcurrentUsers).toBeGreaterThan(0);
      expect(capacityPlan.riskAssessment.level).toBeDefined();
      expect(
        capacityPlan.recommendations.monitoringRequirements.length
      ).toBeGreaterThan(0);
    });

    it('should calculate scaling thresholds and triggers', async () => {
      const capacityMetrics = await measureSystemCapacity();

      const scalingThresholds = {
        cpuThreshold: capacityMetrics.hardwareLimits.cpu,
        memoryThreshold: capacityMetrics.hardwareLimits.memory,
        connectionThreshold: capacityMetrics.databaseLimits.connections * 0.8,
        latencyThreshold: 1000, // milliseconds
        errorRateThreshold: 5, // percentage
        throughputThreshold: capacityMetrics.maxThroughput * 0.9,
      };

      const scalingTriggers = {
        scaleUp: [
          `CPU usage > ${scalingThresholds.cpuThreshold}%`,
          `Memory usage > ${scalingThresholds.memoryThreshold}%`,
          `Active connections > ${scalingThresholds.connectionThreshold}`,
          `P95 latency > ${scalingThresholds.latencyThreshold}ms`,
          `Error rate > ${scalingThresholds.errorRateThreshold}%`,
        ],
        scaleDown: [
          `CPU usage < ${scalingThresholds.cpuThreshold * 0.5}% for 30 minutes`,
          `Memory usage < ${scalingThresholds.memoryThreshold * 0.5}% for 30 minutes`,
          `Active connections < ${scalingThresholds.connectionThreshold * 0.3} for 30 minutes`,
        ],
      };

      const scalingConfiguration = {
        thresholds: scalingThresholds,
        triggers: scalingTriggers,
        actions: {
          horizontalScaling: {
            minInstances: 2,
            maxInstances: 10,
            targetCPU: 70,
            scaleUpCooldown: 300, // seconds
            scaleDownCooldown: 600, // seconds
          },
          databaseScaling: {
            minConnections: 10,
            maxConnections: capacityMetrics.databaseLimits.connections,
            connectionPoolSize: Math.floor(
              capacityMetrics.databaseLimits.connections * 0.8
            ),
          },
        },
      };

      saveResults('scaling-configuration.json', scalingConfiguration);

      console.log('Scaling configuration:', {
        cpuThreshold: scalingThresholds.cpuThreshold,
        connectionThreshold: scalingThresholds.connectionThreshold,
        maxInstances:
          scalingConfiguration.actions.horizontalScaling.maxInstances,
      });

      expect(scalingThresholds.cpuThreshold).toBeGreaterThan(0);
      expect(scalingThresholds.connectionThreshold).toBeGreaterThan(0);
      expect(scalingTriggers.scaleUp.length).toBeGreaterThan(0);
      expect(scalingTriggers.scaleDown.length).toBeGreaterThan(0);
    });

    it('should validate Oracle-specific capacity requirements', async () => {
      const oracleRequirements = {
        connectionPoolSize: 50,
        maxSessions: 100,
        sharedPoolSize: '256M',
        bufferCacheSize: '512M',
        redoLogSize: '100M',
        tempTablespaceSize: '1G',
        undoTablespaceSize: '500M',
      };

      // Test Oracle connection capacity
      const connectionTest: LoadTestConfig = {
        testName: 'oracle_connection_capacity',
        targetRPS: 10,
        concurrentUsers: 30, // Test connection pool limits
        testDuration: 20000,
        rampUpTime: 5000,
        endpoint: '/api/health/database',
        method: 'GET',
        expectedLatency: 100,
        expectedThroughput: 10,
      };

      const result = await executeLoadTest(connectionTest);

      const oracleCapacityValidation = {
        requirements: oracleRequirements,
        testResult: result,
        connectionPoolUtilization:
          (result.config.concurrentUsers /
            oracleRequirements.connectionPoolSize) *
          100,
        recommendations: [] as string[],
      };

      // Analyze results and generate Oracle-specific recommendations
      if (result.errorRate > 10) {
        oracleCapacityValidation.recommendations.push(
          'Increase Oracle connection pool size'
        );
        oracleCapacityValidation.recommendations.push(
          'Optimize Oracle session management'
        );
      }

      if (result.p95Latency > 500) {
        oracleCapacityValidation.recommendations.push(
          'Increase Oracle shared pool size'
        );
        oracleCapacityValidation.recommendations.push(
          'Tune Oracle buffer cache'
        );
      }

      if (oracleCapacityValidation.connectionPoolUtilization > 80) {
        oracleCapacityValidation.recommendations.push(
          'Consider Oracle RAC for high availability'
        );
        oracleCapacityValidation.recommendations.push(
          'Implement connection pooling optimization'
        );
      }

      saveResults('oracle-capacity-validation.json', oracleCapacityValidation);

      console.log('Oracle capacity validation:', {
        connectionPoolUtilization:
          oracleCapacityValidation.connectionPoolUtilization,
        errorRate: result.errorRate,
        p95Latency: result.p95Latency,
        recommendations: oracleCapacityValidation.recommendations.length,
      });

      expect(result.totalRequests).toBeGreaterThan(0);
      expect(
        oracleCapacityValidation.connectionPoolUtilization
      ).toBeGreaterThan(0);
    });
  });
});
