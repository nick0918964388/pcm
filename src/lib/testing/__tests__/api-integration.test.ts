import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { NextRequest } from 'next/server';

// API Integration Tests for Oracle Migration
// 測試所有API端點在Oracle環境下的功能性

interface TestContext {
  testUserId?: string;
  testProjectId?: string;
  testVendorId?: string;
  testScheduleId?: string;
  authToken?: string;
}

// Mock Next.js request/response for testing
function createMockRequest(
  method: string,
  url: string,
  body?: any
): NextRequest {
  const fullUrl = new URL(url, 'http://localhost:3000');

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(fullUrl, requestInit);
}

describe('API Integration Tests - Oracle Environment', () => {
  let testContext: TestContext = {};

  beforeAll(async () => {
    // Setup test environment - should use Oracle database
    console.log('Setting up Oracle test environment...');
  });

  afterAll(async () => {
    // Cleanup test environment
    console.log('Cleaning up Oracle test environment...');
  });

  beforeEach(() => {
    // Reset test context for each test
    testContext = {};
  });

  describe('Authentication API (/api/auth)', () => {
    it('should register a new user successfully', async () => {
      // RED: This test will fail initially
      const registerData = {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      // This will fail until we implement Oracle-compatible auth endpoints
      const { POST } = await import('../../../app/api/auth/register/route');
      const request = createMockRequest(
        'POST',
        '/api/auth/register',
        registerData
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.user.id).toBeDefined();
      expect(data.data.user.username).toBe(registerData.username);

      // Store for subsequent tests
      testContext.testUserId = data.data.user.id;
    });

    it('should login with valid credentials', async () => {
      // Requires a registered user from previous test
      const loginData = {
        username: `testuser_${Date.now()}`,
        password: 'TestPassword123!',
      };

      const { POST } = await import('../../../app/api/auth/login/route');
      const request = createMockRequest('POST', '/api/auth/login', loginData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
      expect(data.data.user).toBeDefined();

      testContext.authToken = data.data.token;
    });

    it('should reject invalid credentials', async () => {
      const invalidLoginData = {
        username: 'nonexistent',
        password: 'wrongpassword',
      };

      const { POST } = await import('../../../app/api/auth/login/route');
      const request = createMockRequest(
        'POST',
        '/api/auth/login',
        invalidLoginData
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Invalid credentials');
    });

    it('should refresh authentication token', async () => {
      // Requires valid auth token
      const { POST } = await import('../../../app/api/auth/refresh/route');
      const request = createMockRequest('POST', '/api/auth/refresh');

      // Add authorization header
      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
    });

    it('should get current user profile', async () => {
      const { GET } = await import('../../../app/api/auth/me/route');
      const request = createMockRequest('GET', '/api/auth/me');

      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.user.id).toBe(testContext.testUserId);
    });
  });

  describe('Projects API (/api/projects)', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: `Test Project ${Date.now()}`,
        description: 'A test project for API testing',
        type: 'internal',
        priority: 3,
        status: 'planning',
      };

      const { POST } = await import('../../../app/api/projects/route');
      const request = createMockRequest('POST', '/api/projects', projectData);

      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.project).toBeDefined();
      expect(data.data.project.name).toBe(projectData.name);
      expect(data.data.project.id).toBeDefined();

      testContext.testProjectId = data.data.project.id;
    });

    it('should get all projects', async () => {
      const { GET } = await import('../../../app/api/projects/route');
      const request = createMockRequest('GET', '/api/projects');

      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.projects)).toBe(true);
    });

    it('should get project by ID', async () => {
      const { GET } = await import(
        '../../../app/api/projects/[projectId]/route'
      );
      const request = createMockRequest(
        'GET',
        `/api/projects/${testContext.testProjectId}`
      );

      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await GET(request, {
        params: { projectId: testContext.testProjectId },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.project.id).toBe(testContext.testProjectId);
    });

    it('should update project', async () => {
      const updateData = {
        name: `Updated Test Project ${Date.now()}`,
        status: 'active',
      };

      const { PUT } = await import(
        '../../../app/api/projects/[projectId]/route'
      );
      const request = createMockRequest(
        'PUT',
        `/api/projects/${testContext.testProjectId}`,
        updateData
      );

      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await PUT(request, {
        params: { projectId: testContext.testProjectId },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.project.name).toBe(updateData.name);
      expect(data.data.project.status).toBe(updateData.status);
    });
  });

  describe('Vendors API (/api/vendors)', () => {
    it('should create a new vendor', async () => {
      const vendorData = {
        name: `Test Vendor ${Date.now()}`,
        type: 'security',
        status: 'active',
        contactPerson: 'John Doe',
        phone: '+1234567890',
        email: 'john@testvendor.com',
      };

      const { POST } = await import('../../../app/api/vendors/route');
      const request = createMockRequest('POST', '/api/vendors', vendorData);

      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.vendor).toBeDefined();
      expect(data.data.vendor.name).toBe(vendorData.name);

      testContext.testVendorId = data.data.vendor.id;
    });

    it('should get all vendors', async () => {
      const { GET } = await import('../../../app/api/vendors/route');
      const request = createMockRequest('GET', '/api/vendors');

      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.vendors)).toBe(true);
    });

    it('should get vendor statistics', async () => {
      const { GET } = await import('../../../app/api/vendors/stats/route');
      const request = createMockRequest('GET', '/api/vendors/stats');

      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.stats).toBeDefined();
      expect(typeof data.data.stats.totalVendors).toBe('number');
    });

    it('should update vendor rating', async () => {
      const ratingData = { rating: 4.5 };

      const { PUT } = await import(
        '../../../app/api/vendors/[vendorId]/rating/route'
      );
      const request = createMockRequest(
        'PUT',
        `/api/vendors/${testContext.testVendorId}/rating`,
        ratingData
      );

      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await PUT(request, {
        params: { vendorId: testContext.testVendorId },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.vendor.rating).toBe(ratingData.rating);
    });
  });

  describe('Duty Schedules API (/api/projects/{projectId}/duty-schedules)', () => {
    it('should create a duty schedule', async () => {
      const scheduleData = {
        personId: testContext.testUserId,
        dutyDate: new Date().toISOString(),
        shiftType: '日班',
        workArea: 'A區',
        status: '已排班',
        urgencyLevel: '一般',
      };

      const { POST } = await import(
        '../../../app/api/projects/[projectId]/duty-schedules/route'
      );
      const request = createMockRequest(
        'POST',
        `/api/projects/${testContext.testProjectId}/duty-schedules`,
        scheduleData
      );

      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await POST(request, {
        params: { projectId: testContext.testProjectId },
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.schedule).toBeDefined();
      expect(data.data.schedule.shiftType).toBe(scheduleData.shiftType);

      testContext.testScheduleId = data.data.schedule.id;
    });

    it('should get current duty schedules', async () => {
      const { GET } = await import(
        '../../../app/api/projects/[projectId]/duty-schedules/current/route'
      );
      const request = createMockRequest(
        'GET',
        `/api/projects/${testContext.testProjectId}/duty-schedules/current`
      );

      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await GET(request, {
        params: { projectId: testContext.testProjectId },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.schedules)).toBe(true);
    });

    it('should perform check-in', async () => {
      const checkinData = {
        checkInTime: new Date().toISOString(),
        notes: 'On time arrival',
      };

      const { POST } = await import(
        '../../../app/api/projects/[projectId]/duty-schedules/[scheduleId]/checkin/route'
      );
      const request = createMockRequest(
        'POST',
        `/api/projects/${testContext.testProjectId}/duty-schedules/${testContext.testScheduleId}/checkin`,
        checkinData
      );

      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await POST(request, {
        params: {
          projectId: testContext.testProjectId,
          scheduleId: testContext.testScheduleId,
        },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.schedule.checkInTime).toBeDefined();
    });
  });

  describe('Database Health Check (/api/health/database)', () => {
    it('should return healthy Oracle database status', async () => {
      const { GET } = await import('../../../app/api/health/database/route');
      const request = createMockRequest('GET', '/api/health/database');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.database).toBeDefined();
      expect(data.data.database.type).toBe('oracle');
      expect(data.data.database.status).toBe('healthy');
      expect(data.data.database.connection).toBe('active');
      expect(typeof data.data.database.responseTime).toBe('number');
      expect(data.data.database.responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should provide Oracle-specific metrics', async () => {
      const { GET } = await import('../../../app/api/health/database/route');
      const request = createMockRequest('GET', '/api/health/database');

      const response = await GET(request);
      const data = await response.json();

      expect(data.data.database.version).toBeDefined();
      expect(data.data.database.poolSize).toBeDefined();
      expect(data.data.database.activeConnections).toBeDefined();
      expect(typeof data.data.database.poolSize).toBe('number');
      expect(typeof data.data.database.activeConnections).toBe('number');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid JSON in request body', async () => {
      const { POST } = await import('../../../app/api/projects/route');

      // Create request with malformed JSON
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ invalid json }',
      });

      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Invalid JSON');
    });

    it('should handle unauthorized access', async () => {
      const { GET } = await import('../../../app/api/projects/route');
      const request = createMockRequest('GET', '/api/projects');

      // No authorization header
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Unauthorized');
    });

    it('should handle invalid resource IDs', async () => {
      const { GET } = await import(
        '../../../app/api/projects/[projectId]/route'
      );
      const request = createMockRequest('GET', '/api/projects/invalid-id');

      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await GET(request, {
        params: { projectId: 'invalid-id' },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toContain('not found');
    });

    it('should handle database connection failures gracefully', async () => {
      // This test would require mocking database connection failure
      // Implementation depends on how database connection is handled
      expect(true).toBe(true); // Placeholder - will implement after database layer is ready
    });
  });

  describe('Oracle-Specific Features', () => {
    it('should handle Oracle SEQUENCE generation for IDs', async () => {
      // Test that new records use Oracle SEQUENCE instead of PostgreSQL SERIAL
      const projectData = {
        name: `Oracle Sequence Test ${Date.now()}`,
        description: 'Testing Oracle sequence generation',
        type: 'internal',
      };

      const { POST } = await import('../../../app/api/projects/route');
      const request = createMockRequest('POST', '/api/projects', projectData);

      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.project.id).toBeDefined();
      // Oracle sequence should generate numeric IDs (as strings)
      expect(typeof data.data.project.id).toBe('string');
      expect(/^\d+$/.test(data.data.project.id)).toBe(true);
    });

    it('should handle Oracle JSON operations', async () => {
      // Test Oracle JSON_VALUE and JSON_QUERY functionality
      const projectWithMetadata = {
        name: `JSON Test Project ${Date.now()}`,
        description: 'Testing Oracle JSON functionality',
        type: 'internal',
        metadata: {
          customField1: 'value1',
          customField2: { nested: 'value2' },
          tags: ['tag1', 'tag2'],
        },
      };

      const { POST } = await import('../../../app/api/projects/route');
      const request = createMockRequest(
        'POST',
        '/api/projects',
        projectWithMetadata
      );

      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.project.metadata).toEqual(projectWithMetadata.metadata);
    });

    it('should handle Oracle pagination with OFFSET FETCH', async () => {
      // Test Oracle pagination implementation
      const { GET } = await import('../../../app/api/projects/route');
      const request = createMockRequest(
        'GET',
        '/api/projects?page=1&pageSize=5'
      );

      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.meta).toBeDefined();
      expect(data.data.meta.pagination).toBeDefined();
      expect(data.data.meta.pagination.page).toBe(1);
      expect(data.data.meta.pagination.pageSize).toBe(5);
      expect(Array.isArray(data.data.projects)).toBe(true);
      expect(data.data.projects.length).toBeLessThanOrEqual(5);
    });

    it('should handle Oracle date/time operations correctly', async () => {
      // Test Oracle DATE and TIMESTAMP handling
      const scheduleData = {
        personId: testContext.testUserId,
        dutyDate: '2024-12-31T23:59:59.999Z',
        shiftType: '夜班',
        workArea: 'B區',
        status: '已排班',
        urgencyLevel: '重要',
      };

      const { POST } = await import(
        '../../../app/api/projects/[projectId]/duty-schedules/route'
      );
      const request = createMockRequest(
        'POST',
        `/api/projects/${testContext.testProjectId}/duty-schedules`,
        scheduleData
      );

      request.headers.set('Authorization', `Bearer ${testContext.authToken}`);

      const response = await POST(request, {
        params: { projectId: testContext.testProjectId },
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.schedule.dutyDate).toBeDefined();
      // Verify Oracle correctly handles the date
      const returnedDate = new Date(data.data.schedule.dutyDate);
      const originalDate = new Date(scheduleData.dutyDate);
      expect(returnedDate.toISOString()).toBe(originalDate.toISOString());
    });
  });
});
