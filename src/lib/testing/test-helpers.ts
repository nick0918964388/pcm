// Test Helpers for API Integration Testing
import { NextRequest, NextResponse } from 'next/server';

export interface TestUser {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface TestProject {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  managerId: string;
}

export interface TestVendor {
  id: string;
  name: string;
  type: string;
  status: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

export interface TestEnvironment {
  databaseType: 'oracle' | 'postgresql';
  baseUrl: string;
  testUserId?: string;
  testProjectId?: string;
  testVendorId?: string;
  authToken?: string;
}

// Mock Request Builder
export class MockRequestBuilder {
  private method: string;
  private url: string;
  private headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  private body?: any;

  constructor(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  withAuth(token: string): MockRequestBuilder {
    this.headers['Authorization'] = `Bearer ${token}`;
    return this;
  }

  withHeader(key: string, value: string): MockRequestBuilder {
    this.headers[key] = value;
    return this;
  }

  withBody(body: any): MockRequestBuilder {
    this.body = body;
    return this;
  }

  build(): NextRequest {
    const fullUrl = this.url.startsWith('http')
      ? this.url
      : `http://localhost:3000${this.url}`;

    const requestInit: RequestInit = {
      method: this.method,
      headers: this.headers,
    };

    if (this.body) {
      requestInit.body = JSON.stringify(this.body);
    }

    return new NextRequest(fullUrl, requestInit);
  }
}

// Test Data Generators
export class TestDataGenerator {
  static generateUser(
    overrides?: Partial<TestUser>
  ): Omit<TestUser, 'id'> & { password: string } {
    const timestamp = Date.now();
    return {
      username: `testuser_${timestamp}`,
      email: `test_${timestamp}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      ...overrides,
    };
  }

  static generateProject(
    managerId: string,
    overrides?: Partial<TestProject>
  ): Omit<TestProject, 'id'> {
    const timestamp = Date.now();
    return {
      name: `Test Project ${timestamp}`,
      description: `Test project created at ${new Date().toISOString()}`,
      type: 'internal',
      status: 'planning',
      managerId,
      ...overrides,
    };
  }

  static generateVendor(
    overrides?: Partial<TestVendor>
  ): Omit<TestVendor, 'id'> {
    const timestamp = Date.now();
    return {
      name: `Test Vendor ${timestamp}`,
      type: 'security',
      status: 'active',
      contactPerson: 'John Doe',
      phone: '+1234567890',
      email: `vendor_${timestamp}@example.com`,
      ...overrides,
    };
  }

  static generateDutySchedule(
    projectId: string,
    personId: string,
    overrides?: any
  ): any {
    return {
      projectId,
      personId,
      dutyDate: new Date().toISOString(),
      shiftType: '日班',
      workArea: 'A區',
      status: '已排班',
      urgencyLevel: '一般',
      notes: 'Test duty schedule',
      ...overrides,
    };
  }
}

// Response Validators
export class ResponseValidator {
  static validateSuccessResponse(
    response: Response,
    expectedStatus = 200
  ): void {
    expect(response.status).toBe(expectedStatus);
  }

  static async validateSuccessData(
    response: Response,
    expectedStatus = 200
  ): Promise<any> {
    this.validateSuccessResponse(response, expectedStatus);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    return data;
  }

  static async validateErrorResponse(
    response: Response,
    expectedStatus: number,
    expectedMessage?: string
  ): Promise<any> {
    expect(response.status).toBe(expectedStatus);
    const data = await response.json();
    expect(data.success).toBe(false);
    if (expectedMessage) {
      expect(data.message).toContain(expectedMessage);
    }
    return data;
  }

  static validateOracleSpecific(data: any): void {
    // Validate Oracle-specific features
    if (data.id) {
      // Oracle sequence IDs should be numeric strings
      expect(typeof data.id).toBe('string');
      expect(/^\d+$/.test(data.id)).toBe(true);
    }

    if (data.createdAt || data.created_at) {
      // Oracle date format validation
      const dateField = data.createdAt || data.created_at;
      expect(new Date(dateField).toISOString()).toBe(
        new Date(dateField).toISOString()
      );
    }
  }

  static validatePagination(
    data: any,
    expectedPage?: number,
    expectedPageSize?: number
  ): void {
    expect(data.meta).toBeDefined();
    expect(data.meta.pagination).toBeDefined();

    const pagination = data.meta.pagination;
    expect(typeof pagination.page).toBe('number');
    expect(typeof pagination.pageSize).toBe('number');
    expect(typeof pagination.total).toBe('number');
    expect(typeof pagination.totalPages).toBe('number');
    expect(typeof pagination.hasNext).toBe('boolean');
    expect(typeof pagination.hasPrev).toBe('boolean');

    if (expectedPage !== undefined) {
      expect(pagination.page).toBe(expectedPage);
    }
    if (expectedPageSize !== undefined) {
      expect(pagination.pageSize).toBe(expectedPageSize);
    }
  }
}

// Database Test Utilities
export class DatabaseTestUtils {
  static async ensureOracleConnection(): Promise<boolean> {
    try {
      // This would check Oracle database connectivity
      // Implementation depends on the database connection layer
      return true;
    } catch (error) {
      console.error('Oracle connection test failed:', error);
      return false;
    }
  }

  static async setupTestData(): Promise<TestEnvironment> {
    // Setup test environment with clean Oracle database state
    return {
      databaseType: 'oracle',
      baseUrl: 'http://localhost:3000',
    };
  }

  static async cleanupTestData(environment: TestEnvironment): Promise<void> {
    // Cleanup test data from Oracle database
    // This should remove all test records created during testing
    console.log('Cleaning up test data...', environment);
  }

  static async executeOracleQuery(
    query: string,
    params?: any[]
  ): Promise<any[]> {
    // Execute raw Oracle query for test verification
    // This would use the Oracle connection layer
    console.log('Executing Oracle query:', query, params);
    return [];
  }

  static async verifyDataIntegrity(): Promise<boolean> {
    // Verify Oracle database constraints and data integrity
    const queries = [
      "SELECT COUNT(*) as count FROM user_constraints WHERE status = 'ENABLED'",
      "SELECT COUNT(*) as count FROM user_indexes WHERE status = 'VALID'",
      "SELECT COUNT(*) as count FROM user_triggers WHERE status = 'ENABLED'",
    ];

    try {
      for (const query of queries) {
        const result = await this.executeOracleQuery(query);
        if (!result || result.length === 0) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Data integrity check failed:', error);
      return false;
    }
  }
}

// Performance Test Utilities
export class PerformanceTestUtils {
  static async measureResponseTime(
    testFunction: () => Promise<Response>
  ): Promise<{
    response: Response;
    duration: number;
  }> {
    const startTime = performance.now();
    const response = await testFunction();
    const endTime = performance.now();

    return {
      response,
      duration: endTime - startTime,
    };
  }

  static async runConcurrentTests(
    testFunction: () => Promise<Response>,
    concurrency: number,
    duration: number = 10000
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
  }> {
    const results: number[] = [];
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;

    const endTime = Date.now() + duration;
    const promises: Promise<void>[] = [];

    for (let i = 0; i < concurrency; i++) {
      promises.push(
        (async () => {
          while (Date.now() < endTime) {
            try {
              const startTime = performance.now();
              const response = await testFunction();
              const responseTime = performance.now() - startTime;

              totalRequests++;
              if (response.ok) {
                successfulRequests++;
              } else {
                failedRequests++;
              }
              results.push(responseTime);
            } catch (error) {
              totalRequests++;
              failedRequests++;
            }
          }
        })()
      );
    }

    await Promise.all(promises);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime:
        results.reduce((a, b) => a + b, 0) / results.length || 0,
      minResponseTime: Math.min(...results) || 0,
      maxResponseTime: Math.max(...results) || 0,
    };
  }
}

// Oracle Migration Test Utilities
export class OracleMigrationTestUtils {
  static async compareWithPostgreSQL(
    oracleQuery: string,
    postgresQuery: string,
    params?: any[]
  ): Promise<{
    oracleResults: any[];
    postgresResults: any[];
    isMatch: boolean;
    differences: string[];
  }> {
    // Compare results between Oracle and PostgreSQL for migration validation
    const oracleResults = await DatabaseTestUtils.executeOracleQuery(
      oracleQuery,
      params
    );
    // This would also query PostgreSQL for comparison
    const postgresResults: any[] = []; // Placeholder

    const isMatch =
      JSON.stringify(oracleResults) === JSON.stringify(postgresResults);
    const differences: string[] = [];

    if (!isMatch) {
      differences.push('Result sets do not match');
      if (oracleResults.length !== postgresResults.length) {
        differences.push(
          `Row count differs: Oracle=${oracleResults.length}, PostgreSQL=${postgresResults.length}`
        );
      }
    }

    return {
      oracleResults,
      postgresResults,
      isMatch,
      differences,
    };
  }

  static async validateOracleSchemaMapping(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Check that all required tables exist
    const requiredTables = [
      'users',
      'projects',
      'project_members',
      'wbs_items',
      'vendors',
      'duty_schedules',
      'audit_log',
      'login_log',
    ];

    for (const table of requiredTables) {
      try {
        const result = await DatabaseTestUtils.executeOracleQuery(
          `SELECT COUNT(*) as count FROM user_tables WHERE table_name = UPPER(?)`,
          [table]
        );
        if (!result || result[0]?.count === 0) {
          issues.push(`Table ${table} not found in Oracle schema`);
        }
      } catch (error) {
        issues.push(`Error checking table ${table}: ${error}`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}
