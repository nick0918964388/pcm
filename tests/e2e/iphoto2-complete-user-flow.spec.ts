/**
 * iPhoto 2.0 Complete User Flow End-to-End Tests
 *
 * TDD implementation of complete user journey from project album creation to photo upload
 * Following Kent Beck's Test-Driven Development methodology:
 * RED -> GREEN -> REFACTOR -> VERIFY
 *
 * Test Coverage:
 * - Complete flow from album creation to photo upload
 * - Multi-user concurrent operations
 * - Photo management functionality verification
 * - Error scenarios and recovery mechanisms
 * - Oracle database state validation for data consistency
 *
 * Requirements: 8.3, 8.5 (Task 10.1)
 * @version 1.0.0
 * @date 2025-01-24
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

// Test Configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  testTimeout: 60000,
  navigationTimeout: 30000,
  uploadTimeout: 45000,
  dbVerificationTimeout: 10000,
  adminCredentials: {
    username: 'admin',
    password: 'password'
  },
  testProject: {
    id: 'proj001',
    name: 'Test Project'
  },
  testAlbum: {
    name: 'E2E Test Album',
    description: 'End-to-end test album for TDD validation'
  },
  testPhoto: {
    filename: 'test-photo.jpg',
    size: 1024 * 1024, // 1MB
    mimetype: 'image/jpeg'
  }
};

// TDD Phase 1: RED - Write failing tests first
test.describe('iPhoto 2.0 Complete User Flow - TDD Implementation', () => {

  test.beforeEach(async ({ page, context }) => {
    // Setup test environment
    await setupTestEnvironment(page, context);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup test data
    await cleanupTestData(page);
  });

  // Test 1: RED - Complete Flow from Album Creation to Photo Upload
  test('should complete full workflow: login -> album creation -> photo upload -> verification', async ({ page }) => {
    // TDD RED Phase: This test should fail initially

    // Step 1: Navigate to iPhoto 2.0 main page
    await test.step('Navigate to iPhoto 2.0', async () => {
      await page.goto(`${TEST_CONFIG.baseUrl}/communication/iphoto2`);
      await page.waitForLoadState('networkidle');

      // Verify main page loaded
      await expect(page.locator('[data-testid="iphoto2-main-container"]')).toBeVisible();
      await expect(page.locator('h1')).toContainText('iPhoto 2.0');
    });

    // Step 2: Navigate to Album Management
    await test.step('Navigate to Album Management', async () => {
      const albumButton = page.locator('button').filter({ hasText: '相簿管理' }).first();
      await expect(albumButton).toBeVisible();
      await albumButton.click();

      // Should navigate to albums page
      await page.waitForURL('**/communication/iphoto2/albums');
      await expect(page.locator('h1')).toContainText('相簿管理');
    });

    // Step 3: Create New Album
    await test.step('Create new album', async () => {
      // Click create album button
      const createButton = page.locator('button').filter({ hasText: '建立相簿' });
      await expect(createButton).toBeVisible();
      await createButton.click();

      // Fill album form
      await page.fill('input[placeholder*="相簿名稱"]', TEST_CONFIG.testAlbum.name);
      await page.fill('textarea[placeholder*="描述"]', TEST_CONFIG.testAlbum.description);

      // Submit form
      const submitButton = page.locator('button').filter({ hasText: '建立' });
      await submitButton.click();

      // Verify album created
      await expect(page.locator('.album-card')).toContainText(TEST_CONFIG.testAlbum.name);
    });

    // Step 4: Navigate to Photo Upload
    await test.step('Navigate to photo upload', async () => {
      await page.goto(`${TEST_CONFIG.baseUrl}/communication/iphoto2/upload`);
      await page.waitForLoadState('networkidle');

      // Verify upload page loaded
      await expect(page.locator('h1')).toContainText('照片上傳');
    });

    // Step 5: Upload Photo to Album
    await test.step('Upload photo to album', async () => {
      // Create test image file
      const testImagePath = await createTestImageFile();

      // Select album
      const albumSelect = page.locator('select[name="albumId"]');
      await albumSelect.selectOption({ label: TEST_CONFIG.testAlbum.name });

      // Upload file using drag and drop
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testImagePath);

      // Wait for upload completion
      await expect(page.locator('.upload-progress')).toBeVisible();
      await expect(page.locator('.upload-success')).toBeVisible({ timeout: TEST_CONFIG.uploadTimeout });

      // Cleanup test file
      await fs.unlink(testImagePath);
    });

    // Step 6: Verify Photo in Album
    await test.step('Verify photo in album', async () => {
      await page.goto(`${TEST_CONFIG.baseUrl}/communication/iphoto2/browse`);
      await page.waitForLoadState('networkidle');

      // Select test album
      await page.selectOption('select[name="albumFilter"]', TEST_CONFIG.testAlbum.name);

      // Verify photo appears in album
      await expect(page.locator('.photo-thumbnail')).toHaveCount(1);
      await expect(page.locator('.photo-info')).toContainText(TEST_CONFIG.testPhoto.filename);
    });

    // Step 7: Verify Oracle Database State
    await test.step('Verify database consistency', async () => {
      // API call to verify album exists in database
      const albumResponse = await page.request.get(`${TEST_CONFIG.baseUrl}/api/projects/${TEST_CONFIG.testProject.id}/albums`);
      expect(albumResponse.ok()).toBeTruthy();

      const albumData = await albumResponse.json();
      expect(albumData.data).toContainEqual(
        expect.objectContaining({
          name: TEST_CONFIG.testAlbum.name,
          description: TEST_CONFIG.testAlbum.description
        })
      );

      // API call to verify photo exists in database
      const photoResponse = await page.request.get(`${TEST_CONFIG.baseUrl}/api/photos/search`, {
        params: { albumName: TEST_CONFIG.testAlbum.name }
      });
      expect(photoResponse.ok()).toBeTruthy();

      const photoData = await photoResponse.json();
      expect(photoData.data.length).toBe(1);
      expect(photoData.data[0].filename).toBe(TEST_CONFIG.testPhoto.filename);
    });
  });

  // Test 2: RED - Multi-user Concurrent Operations
  test('should handle multi-user concurrent operations without conflicts', async ({ context }) => {
    // TDD RED Phase: This test should fail initially

    // Create multiple browser contexts for different users
    const user1Context = await context.browser()?.newContext();
    const user2Context = await context.browser()?.newContext();

    if (!user1Context || !user2Context) {
      throw new Error('Failed to create browser contexts for multi-user test');
    }

    const user1Page = await user1Context.newPage();
    const user2Page = await user2Context.newPage();

    try {
      // Setup both users
      await Promise.all([
        setupTestEnvironment(user1Page, user1Context),
        setupTestEnvironment(user2Page, user2Context)
      ]);

      await test.step('Concurrent album creation', async () => {
        // Both users navigate to album management simultaneously
        await Promise.all([
          user1Page.goto(`${TEST_CONFIG.baseUrl}/communication/iphoto2/albums`),
          user2Page.goto(`${TEST_CONFIG.baseUrl}/communication/iphoto2/albums`)
        ]);

        // Both users create albums with different names simultaneously
        await Promise.all([
          createAlbum(user1Page, 'User1 Album', 'Created by user 1'),
          createAlbum(user2Page, 'User2 Album', 'Created by user 2')
        ]);

        // Verify both albums exist without conflicts
        await user1Page.reload();
        await user2Page.reload();

        await expect(user1Page.locator('.album-card').filter({ hasText: 'User1 Album' })).toBeVisible();
        await expect(user1Page.locator('.album-card').filter({ hasText: 'User2 Album' })).toBeVisible();
        await expect(user2Page.locator('.album-card').filter({ hasText: 'User1 Album' })).toBeVisible();
        await expect(user2Page.locator('.album-card').filter({ hasText: 'User2 Album' })).toBeVisible();
      });

      await test.step('Concurrent photo uploads to same album', async () => {
        // Create shared album
        await createAlbum(user1Page, 'Shared Album', 'Album for concurrent uploads');

        // Both users upload photos to same album simultaneously
        const [testImage1, testImage2] = await Promise.all([
          createTestImageFile('user1-photo.jpg'),
          createTestImageFile('user2-photo.jpg')
        ]);

        await Promise.all([
          uploadPhotoToAlbum(user1Page, 'Shared Album', testImage1),
          uploadPhotoToAlbum(user2Page, 'Shared Album', testImage2)
        ]);

        // Cleanup test files
        await Promise.all([
          fs.unlink(testImage1),
          fs.unlink(testImage2)
        ]);

        // Verify both photos uploaded successfully
        await user1Page.goto(`${TEST_CONFIG.baseUrl}/communication/iphoto2/browse`);
        await user1Page.selectOption('select[name="albumFilter"]', 'Shared Album');
        await expect(user1Page.locator('.photo-thumbnail')).toHaveCount(2);
      });

    } finally {
      // Cleanup contexts
      await user1Context.close();
      await user2Context.close();
    }
  });

  // Test 3: RED - Photo Management Functionality Verification
  test('should verify complete photo management operations', async ({ page }) => {
    // TDD RED Phase: This test should fail initially

    // Setup: Create album and upload photo
    await setupAlbumWithPhoto(page);

    await test.step('Photo editing operations', async () => {
      await page.goto(`${TEST_CONFIG.baseUrl}/communication/iphoto2/browse`);

      // Select test album
      await page.selectOption('select[name="albumFilter"]', TEST_CONFIG.testAlbum.name);

      // Click edit photo
      await page.locator('.photo-thumbnail').first().click();
      await page.locator('button').filter({ hasText: '編輯' }).click();

      // Edit photo metadata
      const newName = 'Edited Photo Name';
      const newDescription = 'Updated photo description';

      await page.fill('input[name="photoName"]', newName);
      await page.fill('textarea[name="photoDescription"]', newDescription);
      await page.click('button:has-text("儲存")');

      // Verify changes saved
      await expect(page.locator('.photo-info')).toContainText(newName);
      await expect(page.locator('.photo-description')).toContainText(newDescription);
    });

    await test.step('Photo tagging operations', async () => {
      // Add tags to photo
      const tags = ['工程', '進度', '完成'];

      await page.locator('.photo-thumbnail').first().click();
      await page.locator('button').filter({ hasText: '標籤' }).click();

      for (const tag of tags) {
        await page.fill('input[name="newTag"]', tag);
        await page.click('button:has-text("新增標籤")');
      }

      // Verify tags added
      for (const tag of tags) {
        await expect(page.locator('.tag')).toContainText(tag);
      }
    });

    await test.step('Photo search and filter operations', async () => {
      // Search by tag
      await page.fill('input[name="searchQuery"]', '工程');
      await page.click('button:has-text("搜尋")');

      // Verify search results
      await expect(page.locator('.photo-thumbnail')).toHaveCount(1);

      // Filter by date range
      const today = new Date().toISOString().split('T')[0];
      await page.fill('input[name="dateFrom"]', today);
      await page.fill('input[name="dateTo"]', today);
      await page.click('button:has-text("套用篩選")');

      // Verify filtered results
      await expect(page.locator('.photo-thumbnail')).toHaveCount(1);
    });

    await test.step('Photo download operations', async () => {
      // Download single photo
      const downloadPromise = page.waitForEvent('download');
      await page.locator('.photo-thumbnail').first().click();
      await page.locator('button').filter({ hasText: '下載' }).click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.jpg');

      // Batch download
      await page.locator('button').filter({ hasText: '批次選擇' }).click();
      await page.locator('.photo-checkbox').first().check();

      const batchDownloadPromise = page.waitForEvent('download');
      await page.locator('button').filter({ hasText: '批次下載' }).click();

      const batchDownload = await batchDownloadPromise;
      expect(batchDownload.suggestedFilename()).toContain('.zip');
    });
  });

  // Test 4: RED - Error Scenarios and Recovery Mechanisms
  test('should handle error scenarios and recovery mechanisms', async ({ page }) => {
    // TDD RED Phase: This test should fail initially

    await test.step('Handle network interruption during upload', async () => {
      await page.goto(`${TEST_CONFIG.baseUrl}/communication/iphoto2/upload`);

      // Create large test file for slower upload
      const largeTestFile = await createTestImageFile('large-photo.jpg', 10 * 1024 * 1024); // 10MB

      // Start upload
      await page.locator('input[type="file"]').setInputFiles(largeTestFile);

      // Simulate network interruption
      await page.setOfflineMode(true);

      // Wait for error handling
      await expect(page.locator('.upload-error')).toBeVisible({ timeout: 15000 });

      // Restore network
      await page.setOfflineMode(false);

      // Retry upload
      await page.click('button:has-text("重試")');

      // Verify successful recovery
      await expect(page.locator('.upload-success')).toBeVisible({ timeout: TEST_CONFIG.uploadTimeout });

      // Cleanup
      await fs.unlink(largeTestFile);
    });

    await test.step('Handle invalid file upload', async () => {
      await page.goto(`${TEST_CONFIG.baseUrl}/communication/iphoto2/upload`);

      // Create invalid file (text file with image extension)
      const invalidFile = await createInvalidImageFile('invalid.jpg');

      // Attempt upload
      await page.locator('input[type="file"]').setInputFiles(invalidFile);

      // Verify error handling
      await expect(page.locator('.file-validation-error')).toBeVisible();
      await expect(page.locator('.error-message')).toContainText('檔案格式不支援');

      // Cleanup
      await fs.unlink(invalidFile);
    });

    await test.step('Handle storage quota exceeded', async () => {
      // This would require mocking storage quota API
      // For now, verify the error handling UI exists
      await page.goto(`${TEST_CONFIG.baseUrl}/communication/iphoto2/upload`);

      // Simulate quota exceeded by injecting script
      await page.addInitScript(() => {
        window.localStorage.setItem('mock_quota_exceeded', 'true');
      });

      await page.reload();

      // Create test file
      const testFile = await createTestImageFile();
      await page.locator('input[type="file"]').setInputFiles(testFile);

      // Verify quota error handling
      await expect(page.locator('.quota-error')).toBeVisible();

      // Cleanup
      await fs.unlink(testFile);
    });

    await test.step('Handle database connection failure', async () => {
      // Test database error recovery
      await page.goto(`${TEST_CONFIG.baseUrl}/communication/iphoto2/albums`);

      // Simulate database error by intercepting API calls
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Database connection failed' })
        });
      });

      // Try to create album
      await page.click('button:has-text("建立相簿")');
      await page.fill('input[placeholder*="相簿名稱"]', 'Test Album');
      await page.click('button:has-text("建立")');

      // Verify error handling
      await expect(page.locator('.database-error')).toBeVisible();
      await expect(page.locator('.retry-button')).toBeVisible();

      // Clear route interception
      await page.unroute('**/api/**');

      // Retry operation
      await page.click('.retry-button');

      // Verify successful recovery
      await expect(page.locator('.album-card')).toContainText('Test Album');
    });
  });

  // Test 5: RED - Oracle Database State Validation
  test('should validate Oracle database state consistency', async ({ page, request }) => {
    // TDD RED Phase: This test should fail initially

    await test.step('Verify album-photo relationship consistency', async () => {
      // Create album and upload photo
      await setupAlbumWithPhoto(page);

      // Get album ID from API
      const albumResponse = await request.get(`${TEST_CONFIG.baseUrl}/api/projects/${TEST_CONFIG.testProject.id}/albums`);
      const albumData = await albumResponse.json();
      const testAlbumId = albumData.data.find((album: any) => album.name === TEST_CONFIG.testAlbum.name)?.id;

      expect(testAlbumId).toBeDefined();

      // Verify photo belongs to album
      const photoResponse = await request.get(`${TEST_CONFIG.baseUrl}/api/albums/${testAlbumId}/photos`);
      const photoData = await photoResponse.json();

      expect(photoData.data.length).toBe(1);
      expect(photoData.data[0].albumId).toBe(testAlbumId);
    });

    await test.step('Verify file system synchronization', async () => {
      // Check if physical file exists on server
      const fileCheckResponse = await request.post(`${TEST_CONFIG.baseUrl}/api/internal/verify-file-sync`, {
        data: {
          albumName: TEST_CONFIG.testAlbum.name,
          filename: TEST_CONFIG.testPhoto.filename,
          projectId: TEST_CONFIG.testProject.id
        }
      });

      expect(fileCheckResponse.ok()).toBeTruthy();

      const syncData = await fileCheckResponse.json();
      expect(syncData.fileExists).toBe(true);
      expect(syncData.databaseRecordExists).toBe(true);
      expect(syncData.consistent).toBe(true);
    });

    await test.step('Verify referential integrity', async () => {
      // Delete album and verify orphan photo handling
      const albumResponse = await request.get(`${TEST_CONFIG.baseUrl}/api/projects/${TEST_CONFIG.testProject.id}/albums`);
      const albumData = await albumResponse.json();
      const testAlbumId = albumData.data.find((album: any) => album.name === TEST_CONFIG.testAlbum.name)?.id;

      // Delete album
      const deleteResponse = await request.delete(`${TEST_CONFIG.baseUrl}/api/albums/${testAlbumId}`);
      expect(deleteResponse.ok()).toBeTruthy();

      // Verify photos are soft-deleted (not orphaned)
      const orphanCheckResponse = await request.get(`${TEST_CONFIG.baseUrl}/api/internal/check-orphan-photos`);
      const orphanData = await orphanCheckResponse.json();

      expect(orphanData.orphanCount).toBe(0);
    });

    await test.step('Verify transaction consistency', async () => {
      // Test atomic operations - album creation with initial photo
      const transactionData = {
        albumName: 'Transaction Test Album',
        albumDescription: 'Testing atomic operations',
        projectId: TEST_CONFIG.testProject.id,
        initialPhotos: [
          {
            filename: 'transaction-photo.jpg',
            data: await createBase64TestImage()
          }
        ]
      };

      const transactionResponse = await request.post(`${TEST_CONFIG.baseUrl}/api/albums/create-with-photos`, {
        data: transactionData
      });

      if (transactionResponse.ok()) {
        // Verify both album and photo were created
        const result = await transactionResponse.json();
        expect(result.album).toBeDefined();
        expect(result.photos.length).toBe(1);
      } else {
        // If transaction failed, verify nothing was created
        const albumCheck = await request.get(`${TEST_CONFIG.baseUrl}/api/projects/${TEST_CONFIG.testProject.id}/albums`);
        const albums = await albumCheck.json();
        const createdAlbum = albums.data.find((album: any) => album.name === 'Transaction Test Album');
        expect(createdAlbum).toBeUndefined();
      }
    });
  });
});

// Helper Functions

async function setupTestEnvironment(page: Page, context: BrowserContext): Promise<void> {
  // Navigate to login page
  await page.goto(`${TEST_CONFIG.baseUrl}/login`);
  await page.waitForLoadState('networkidle');

  // Login with admin credentials
  await page.fill('input[name="username"], input[placeholder*="使用者名稱"]', TEST_CONFIG.adminCredentials.username);
  await page.fill('input[name="password"], input[placeholder*="密碼"]', TEST_CONFIG.adminCredentials.password);
  await page.click('button:has-text("登入")');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard/**', { timeout: TEST_CONFIG.navigationTimeout });
}

async function cleanupTestData(page: Page): Promise<void> {
  try {
    // Clean up test albums and photos via API
    const response = await page.request.delete(`${TEST_CONFIG.baseUrl}/api/internal/cleanup-test-data`, {
      data: {
        albumName: TEST_CONFIG.testAlbum.name,
        projectId: TEST_CONFIG.testProject.id
      }
    });
    console.log('Cleanup response:', response.status());
  } catch (error) {
    console.warn('Cleanup failed:', error);
  }
}

async function createTestImageFile(filename: string = TEST_CONFIG.testPhoto.filename, size: number = TEST_CONFIG.testPhoto.size): Promise<string> {
  const testDir = path.join(process.cwd(), 'test-temp');
  await fs.mkdir(testDir, { recursive: true });

  const filePath = path.join(testDir, filename);

  // Create a simple test image buffer (minimal JPEG header + data)
  const jpegHeader = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43
  ]);

  const remainingSize = Math.max(0, size - jpegHeader.length - 2);
  const dataBuffer = Buffer.alloc(remainingSize, 0xFF);
  const jpegEnd = Buffer.from([0xFF, 0xD9]);

  const imageBuffer = Buffer.concat([jpegHeader, dataBuffer, jpegEnd]);

  await fs.writeFile(filePath, imageBuffer);
  return filePath;
}

async function createInvalidImageFile(filename: string): Promise<string> {
  const testDir = path.join(process.cwd(), 'test-temp');
  await fs.mkdir(testDir, { recursive: true });

  const filePath = path.join(testDir, filename);
  const invalidContent = 'This is not an image file';

  await fs.writeFile(filePath, invalidContent);
  return filePath;
}

async function createBase64TestImage(): Promise<string> {
  const imagePath = await createTestImageFile();
  const imageBuffer = await fs.readFile(imagePath);
  await fs.unlink(imagePath);

  return `data:${TEST_CONFIG.testPhoto.mimetype};base64,${imageBuffer.toString('base64')}`;
}

async function createAlbum(page: Page, name: string, description: string): Promise<void> {
  await page.click('button:has-text("建立相簿")');
  await page.fill('input[placeholder*="相簿名稱"]', name);
  await page.fill('textarea[placeholder*="描述"]', description);
  await page.click('button:has-text("建立")');
  await expect(page.locator('.album-card')).toContainText(name);
}

async function uploadPhotoToAlbum(page: Page, albumName: string, imagePath: string): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseUrl}/communication/iphoto2/upload`);
  await page.selectOption('select[name="albumId"]', albumName);
  await page.setInputFiles('input[type="file"]', imagePath);
  await expect(page.locator('.upload-success')).toBeVisible({ timeout: TEST_CONFIG.uploadTimeout });
}

async function setupAlbumWithPhoto(page: Page): Promise<void> {
  // Navigate to albums and create test album
  await page.goto(`${TEST_CONFIG.baseUrl}/communication/iphoto2/albums`);
  await createAlbum(page, TEST_CONFIG.testAlbum.name, TEST_CONFIG.testAlbum.description);

  // Upload photo to album
  const testImagePath = await createTestImageFile();
  await uploadPhotoToAlbum(page, TEST_CONFIG.testAlbum.name, testImagePath);
  await fs.unlink(testImagePath);
}