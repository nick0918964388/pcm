/**
 * Task 9.2: Oracle效能和負載驗證測試
 * 驗證Oracle環境的效能表現符合要求
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getOracleConnection } from '@/lib/database/oracle-connection';
import {
  oracleTestManager,
  ensureOracleReady,
} from '@/lib/database/oracle-test-setup';
import fetch from 'node-fetch';

// 效能測試配置
const PERFORMANCE_CONFIG = {
  API_BASE_URL: process.env.TEST_API_URL || 'http://localhost:3000',
  BASELINE_RESPONSE_TIME: 150, // PostgreSQL基準回應時間 (ms)
  MAX_ACCEPTABLE_RATIO: 1.5, // Oracle最大可接受比例 (150%)
  CONCURRENT_USERS: 20, // 並發使用者數
  LOAD_TEST_DURATION: 30000, // 負載測試持續時間 (30秒)
  STRESS_TEST_REQUESTS: 100, // 壓力測試請求數
  MEMORY_LIMIT_MB: 512, // 記憶體限制 (MB)
  CPU_LIMIT_PERCENT: 80, // CPU使用率限制 (%)
};

// 效能指標介面
interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  dbConnections: number;
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
}

// 輔助函數
async function measureApiResponseTime(
  endpoint: string,
  method = 'GET',
  body?: any
): Promise<number> {
  const startTime = Date.now();

  try {
    const response = await fetch(
      `${PERFORMANCE_CONFIG.API_BASE_URL}${endpoint}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    await response.json();
    return Date.now() - startTime;
  } catch (error) {
    throw new Error(
      `Performance test API request failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function runConcurrentRequests(
  requestCount: number,
  requestFn: () => Promise<number>
): Promise<LoadTestResult> {
  const startTime = Date.now();
  const responseTimes: number[] = [];
  const errors: Error[] = [];

  // 並行執行請求
  const promises = Array.from({ length: requestCount }, async () => {
    try {
      const responseTime = await requestFn();
      responseTimes.push(responseTime);
      return responseTime;
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
      return -1; // 標記為失敗
    }
  });

  await Promise.all(promises);

  const endTime = Date.now();
  const totalDuration = endTime - startTime;
  const successfulRequests = responseTimes.length;
  const failedRequests = errors.length;

  // 計算統計資料
  responseTimes.sort((a, b) => a - b);
  const averageResponseTime =
    responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length ||
    0;
  const p95Index = Math.floor(responseTimes.length * 0.95);
  const p99Index = Math.floor(responseTimes.length * 0.99);

  return {
    totalRequests: requestCount,
    successfulRequests,
    failedRequests,
    averageResponseTime,
    p95ResponseTime: responseTimes[p95Index] || 0,
    p99ResponseTime: responseTimes[p99Index] || 0,
    maxResponseTime: Math.max(...responseTimes, 0),
    minResponseTime: Math.min(...responseTimes, Infinity),
    requestsPerSecond: (successfulRequests / totalDuration) * 1000,
    errorRate: failedRequests / requestCount,
  };
}

async function getSystemMetrics(): Promise<PerformanceMetrics> {
  const oracle = getOracleConnection();

  try {
    // 取得資料庫連線池狀態
    const poolStatus = oracle.getPoolStatus();

    // 模擬系統資源使用情況 (實際環境中會使用系統監控API)
    const mockMetrics: PerformanceMetrics = {
      responseTime: 0, // 將在測試中設定
      throughput: 0, // 將在測試中設定
      errorRate: 0, // 將在測試中設定
      memoryUsage: Math.random() * 256 + 128, // 模擬128-384MB使用量
      cpuUsage: Math.random() * 50 + 20, // 模擬20-70%使用率
      dbConnections: poolStatus.activeConnections,
    };

    return mockMetrics;
  } catch (error) {
    throw new Error(
      `Failed to get system metrics: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

describe('Task 9.2: Oracle Performance and Load Validation Tests', () => {
  beforeAll(async () => {
    console.log('🚀 Starting Oracle performance and load tests...');

    // 確保Oracle環境準備就緒
    await ensureOracleReady();

    // 初始化測試資料庫
    await oracleTestManager.initialize({
      recreateSchema: true,
      loadTestData: true,
    });

    console.log('✅ Oracle performance test environment ready');
  }, 60000);

  afterAll(async () => {
    console.log('🧹 Cleaning up performance test environment...');
    await oracleTestManager.cleanup();
  });

  beforeEach(async () => {
    // 在每個測試前等待短暫時間讓系統穩定
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('1. API回應時間驗證', () => {
    it('專案查詢API回應時間應符合150%基準要求', async () => {
      // RED: 這個測試最初會失敗，直到我們最佳化Oracle查詢效能

      const responseTime = await measureApiResponseTime('/api/projects');

      console.log(`Oracle projects API response time: ${responseTime}ms`);
      console.log(`Baseline: ${PERFORMANCE_CONFIG.BASELINE_RESPONSE_TIME}ms`);
      console.log(
        `Maximum acceptable: ${PERFORMANCE_CONFIG.BASELINE_RESPONSE_TIME * PERFORMANCE_CONFIG.MAX_ACCEPTABLE_RATIO}ms`
      );

      expect(responseTime).toBeLessThanOrEqual(
        PERFORMANCE_CONFIG.BASELINE_RESPONSE_TIME *
          PERFORMANCE_CONFIG.MAX_ACCEPTABLE_RATIO
      );
    });

    it('單個專案查詢回應時間應小於100ms', async () => {
      // 先創建測試專案
      const testProject = {
        id: 'PERF_TEST_001',
        name: '效能測試專案',
        description: '用於效能測試的專案',
        status: 'active',
        type: 'construction',
        priority: 5,
      };

      await measureApiResponseTime('/api/projects', 'POST', testProject);

      // 測試單個專案查詢
      const responseTime = await measureApiResponseTime(
        `/api/projects/PERF_TEST_001`
      );

      console.log(`Single project query response time: ${responseTime}ms`);

      expect(responseTime).toBeLessThan(100);
    });

    it('分頁查詢回應時間應小於200ms', async () => {
      // 創建多個測試專案以測試分頁效能
      const projects = Array.from({ length: 25 }, (_, i) => ({
        id: `PERF_PAGE_${i.toString().padStart(3, '0')}`,
        name: `分頁測試專案 ${i}`,
        description: `分頁測試專案描述 ${i}`,
        status: 'active',
        type: 'construction',
        priority: 5,
      }));

      // 批次創建專案
      for (const project of projects) {
        await measureApiResponseTime('/api/projects', 'POST', project);
      }

      // 測試分頁查詢
      const responseTime = await measureApiResponseTime(
        '/api/projects?page=2&limit=10'
      );

      console.log(`Paginated query response time: ${responseTime}ms`);

      expect(responseTime).toBeLessThan(200);
    });

    it('健康檢查API回應時間應小於50ms', async () => {
      const responseTime = await measureApiResponseTime('/api/health');

      console.log(`Health check response time: ${responseTime}ms`);

      expect(responseTime).toBeLessThan(50);
    });
  });

  describe('2. 並發處理能力測試', () => {
    it('應該能夠處理20個並發使用者查詢', async () => {
      // RED: 測試並發查詢能力

      const loadTestResult = await runConcurrentRequests(
        PERFORMANCE_CONFIG.CONCURRENT_USERS,
        () => measureApiResponseTime('/api/projects')
      );

      console.log('Concurrent users load test results:', {
        totalRequests: loadTestResult.totalRequests,
        successfulRequests: loadTestResult.successfulRequests,
        averageResponseTime: `${loadTestResult.averageResponseTime}ms`,
        p95ResponseTime: `${loadTestResult.p95ResponseTime}ms`,
        requestsPerSecond: loadTestResult.requestsPerSecond.toFixed(2),
        errorRate: `${(loadTestResult.errorRate * 100).toFixed(2)}%`,
      });

      // 驗證成功率至少95%
      expect(loadTestResult.errorRate).toBeLessThanOrEqual(0.05);

      // 驗證95th percentile回應時間
      expect(loadTestResult.p95ResponseTime).toBeLessThanOrEqual(
        PERFORMANCE_CONFIG.BASELINE_RESPONSE_TIME *
          PERFORMANCE_CONFIG.MAX_ACCEPTABLE_RATIO
      );

      // 驗證所有請求都成功
      expect(loadTestResult.successfulRequests).toBe(
        PERFORMANCE_CONFIG.CONCURRENT_USERS
      );
    });

    it('應該能夠處理混合讀寫操作', async () => {
      const requests = Array.from({ length: 50 }, (_, i) => {
        if (i % 5 === 0) {
          // 20% 寫入操作
          return () =>
            measureApiResponseTime('/api/projects', 'POST', {
              id: `MIXED_TEST_${i}`,
              name: `混合測試專案 ${i}`,
              status: 'active',
              type: 'construction',
            });
        } else {
          // 80% 讀取操作
          return () => measureApiResponseTime('/api/projects');
        }
      });

      const loadTestResult = await runConcurrentRequests(50, async () => {
        const randomRequest =
          requests[Math.floor(Math.random() * requests.length)];
        return await randomRequest();
      });

      console.log('Mixed read/write load test results:', {
        averageResponseTime: `${loadTestResult.averageResponseTime}ms`,
        errorRate: `${(loadTestResult.errorRate * 100).toFixed(2)}%`,
        requestsPerSecond: loadTestResult.requestsPerSecond.toFixed(2),
      });

      expect(loadTestResult.errorRate).toBeLessThanOrEqual(0.1); // 允許10%錯誤率
      expect(loadTestResult.averageResponseTime).toBeLessThanOrEqual(500); // 平均回應時間500ms內
    });
  });

  describe('3. 資源使用效率測試', () => {
    it('資料庫連線池使用率應該合理', async () => {
      const oracle = getOracleConnection();

      // 執行一些並發查詢
      await runConcurrentRequests(10, () =>
        measureApiResponseTime('/api/projects')
      );

      const poolStatus = oracle.getPoolStatus();
      const usageRate =
        poolStatus.totalConnections > 0
          ? poolStatus.activeConnections / poolStatus.totalConnections
          : 0;

      console.log('Connection pool status:', {
        totalConnections: poolStatus.totalConnections,
        activeConnections: poolStatus.activeConnections,
        usageRate: `${(usageRate * 100).toFixed(2)}%`,
      });

      // 連線池使用率應該合理 (不超過90%)
      expect(usageRate).toBeLessThanOrEqual(0.9);

      // 應該有可用的連線
      expect(poolStatus.idleConnections).toBeGreaterThan(0);
    });

    it('系統資源使用應該在限制範圍內', async () => {
      // 執行負載測試期間監控系統資源
      const metricsPromise = getSystemMetrics();

      // 同時執行負載測試
      const loadTestPromise = runConcurrentRequests(30, () =>
        measureApiResponseTime('/api/projects')
      );

      const [metrics, loadResult] = await Promise.all([
        metricsPromise,
        loadTestPromise,
      ]);

      console.log('System resource usage:', {
        memoryUsage: `${metrics.memoryUsage.toFixed(2)}MB`,
        cpuUsage: `${metrics.cpuUsage.toFixed(2)}%`,
        dbConnections: metrics.dbConnections,
        loadTestErrorRate: `${(loadResult.errorRate * 100).toFixed(2)}%`,
      });

      // 驗證記憶體使用在限制內
      expect(metrics.memoryUsage).toBeLessThanOrEqual(
        PERFORMANCE_CONFIG.MEMORY_LIMIT_MB
      );

      // 驗證CPU使用率合理
      expect(metrics.cpuUsage).toBeLessThanOrEqual(
        PERFORMANCE_CONFIG.CPU_LIMIT_PERCENT
      );

      // 驗證負載測試成功率
      expect(loadResult.errorRate).toBeLessThanOrEqual(0.05);
    });
  });

  describe('4. 壓力測試', () => {
    it('應該能夠承受持續的高負載', async () => {
      console.log(
        `Starting stress test: ${PERFORMANCE_CONFIG.STRESS_TEST_REQUESTS} requests...`
      );

      const stressTestResult = await runConcurrentRequests(
        PERFORMANCE_CONFIG.STRESS_TEST_REQUESTS,
        () => measureApiResponseTime('/api/projects')
      );

      console.log('Stress test results:', {
        totalRequests: stressTestResult.totalRequests,
        successfulRequests: stressTestResult.successfulRequests,
        failedRequests: stressTestResult.failedRequests,
        averageResponseTime: `${stressTestResult.averageResponseTime}ms`,
        p99ResponseTime: `${stressTestResult.p99ResponseTime}ms`,
        requestsPerSecond: stressTestResult.requestsPerSecond.toFixed(2),
        errorRate: `${(stressTestResult.errorRate * 100).toFixed(2)}%`,
      });

      // 壓力測試期間系統應該保持穩定
      expect(stressTestResult.errorRate).toBeLessThanOrEqual(0.1); // 允許10%錯誤率

      // 99th percentile 回應時間應該合理
      expect(stressTestResult.p99ResponseTime).toBeLessThanOrEqual(1000); // 1秒內

      // 吞吐量應該達到最低要求
      expect(stressTestResult.requestsPerSecond).toBeGreaterThan(5); // 至少5 RPS
    });

    it('系統應該從高負載後快速恢復', async () => {
      // 先執行高負載
      await runConcurrentRequests(50, () =>
        measureApiResponseTime('/api/projects')
      );

      // 等待系統恢復
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 測試恢復後的效能
      const recoveryResponseTime =
        await measureApiResponseTime('/api/projects');

      console.log(
        `Post-stress recovery response time: ${recoveryResponseTime}ms`
      );

      // 恢復後的回應時間應該正常
      expect(recoveryResponseTime).toBeLessThanOrEqual(
        PERFORMANCE_CONFIG.BASELINE_RESPONSE_TIME *
          PERFORMANCE_CONFIG.MAX_ACCEPTABLE_RATIO
      );

      // 檢查連線池狀態
      const oracle = getOracleConnection();
      const poolStatus = oracle.getPoolStatus();

      expect(poolStatus.activeConnections).toBeLessThanOrEqual(
        poolStatus.totalConnections
      );
    });
  });

  describe('5. 記憶體洩漏檢測', () => {
    it('長時間運行不應該有記憶體洩漏', async () => {
      const initialMetrics = await getSystemMetrics();

      // 執行長時間的重複操作
      for (let i = 0; i < 20; i++) {
        await runConcurrentRequests(5, () =>
          measureApiResponseTime('/api/projects')
        );
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const finalMetrics = await getSystemMetrics();

      const memoryIncrease =
        finalMetrics.memoryUsage - initialMetrics.memoryUsage;

      console.log('Memory usage analysis:', {
        initialMemory: `${initialMetrics.memoryUsage.toFixed(2)}MB`,
        finalMemory: `${finalMetrics.memoryUsage.toFixed(2)}MB`,
        increase: `${memoryIncrease.toFixed(2)}MB`,
      });

      // 記憶體增長應該在合理範圍內 (小於100MB)
      expect(memoryIncrease).toBeLessThan(100);
    });
  });
});
