/**
 * 系統健康檢查API
 * 支援Oracle遷移後的系統狀態監控
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOracleConnection } from '@/lib/database/oracle-connection';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  details?: string;
  responseTime?: number;
  timestamp: string;
}

interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  services: HealthCheckResult[];
  timestamp: string;
  uptime: number;
}

const startTime = Date.now();

async function checkOracleHealth(): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    const oracle = getOracleConnection();
    const result = await oracle.healthCheck();

    const responseTime = Date.now() - start;

    if (result.success && result.data?.isHealthy) {
      return {
        service: 'oracle-database',
        status: 'healthy',
        details: 'Database connection successful',
        responseTime,
        timestamp: new Date().toISOString(),
      };
    } else {
      return {
        service: 'oracle-database',
        status: 'unhealthy',
        details: result.data?.errorDetails || 'Database connection failed',
        responseTime,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (error) {
    const responseTime = Date.now() - start;

    return {
      service: 'oracle-database',
      status: 'unhealthy',
      details:
        error instanceof Error ? error.message : 'Unknown database error',
      responseTime,
      timestamp: new Date().toISOString(),
    };
  }
}

async function checkAPIHealth(): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    // 基本API功能檢查
    const responseTime = Date.now() - start;

    return {
      service: 'api-server',
      status: 'healthy',
      details: 'API server running normally',
      responseTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const responseTime = Date.now() - start;

    return {
      service: 'api-server',
      status: 'unhealthy',
      details: error instanceof Error ? error.message : 'Unknown API error',
      responseTime,
      timestamp: new Date().toISOString(),
    };
  }
}

async function checkConnectionPoolHealth(): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    const oracle = getOracleConnection();
    const poolStatus = oracle.getPoolStatus();

    const responseTime = Date.now() - start;

    // 檢查連線池狀態
    const usageRate =
      poolStatus.totalConnections > 0
        ? poolStatus.activeConnections / poolStatus.totalConnections
        : 0;

    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    let details = `Pool: ${poolStatus.activeConnections}/${poolStatus.totalConnections} connections`;

    if (usageRate > 0.9) {
      status = 'degraded';
      details += ' (High usage warning)';
    } else if (usageRate > 0.95) {
      status = 'unhealthy';
      details += ' (Pool exhaustion risk)';
    }

    return {
      service: 'connection-pool',
      status,
      details,
      responseTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const responseTime = Date.now() - start;

    return {
      service: 'connection-pool',
      status: 'unhealthy',
      details:
        error instanceof Error ? error.message : 'Pool status check failed',
      responseTime,
      timestamp: new Date().toISOString(),
    };
  }
}

function determineOverallHealth(
  services: HealthCheckResult[]
): 'healthy' | 'unhealthy' | 'degraded' {
  const hasUnhealthy = services.some(s => s.status === 'unhealthy');
  const hasDegraded = services.some(s => s.status === 'degraded');

  if (hasUnhealthy) return 'unhealthy';
  if (hasDegraded) return 'degraded';
  return 'healthy';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    // 並行執行所有健康檢查
    const [oracleHealth, apiHealth, poolHealth] = await Promise.all([
      checkOracleHealth(),
      checkAPIHealth(),
      checkConnectionPoolHealth(),
    ]);

    const services = [oracleHealth, apiHealth, poolHealth];
    const overall = determineOverallHealth(services);
    const uptime = Date.now() - startTime;

    const healthStatus: SystemHealth = {
      overall,
      services: detailed
        ? services
        : services.map(s => ({
            service: s.service,
            status: s.status,
            timestamp: s.timestamp,
          })),
      timestamp: new Date().toISOString(),
      uptime,
    };

    // 根據整體健康狀態設定HTTP狀態碼
    let httpStatus = 200;
    if (overall === 'degraded') httpStatus = 200; // 降級但仍可用
    if (overall === 'unhealthy') httpStatus = 503; // 服務不可用

    return NextResponse.json(healthStatus, { status: httpStatus });
  } catch (error) {
    console.error('Health check error:', error);

    const errorResponse: SystemHealth = {
      overall: 'unhealthy',
      services: [
        {
          service: 'health-check',
          status: 'unhealthy',
          details:
            error instanceof Error
              ? error.message
              : 'Health check system error',
          timestamp: new Date().toISOString(),
        },
      ],
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}

export async function HEAD(request: NextRequest) {
  // 簡單的健康檢查，僅返回HTTP狀態碼
  try {
    const oracle = getOracleConnection();
    const result = await oracle.healthCheck();

    if (result.success && result.data?.isHealthy) {
      return new NextResponse(null, { status: 200 });
    } else {
      return new NextResponse(null, { status: 503 });
    }
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}
