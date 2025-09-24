/**
 * Oracle 相簿 CRUD 操作端到端整合測試
 * Task 9.2: 建立 Oracle 系統整合測試
 *
 * 遵循 TDD 方法論
 * RED: 撰寫失敗的測試
 * GREEN: 實作最小程式碼讓測試通過
 * REFACTOR: 重構並改善程式碼品質
 * VERIFY: 確保所有測試通過並無回歸問題
 *
 * 測試範圍:
 * - 相簿完整 CRUD 操作流程
 * - Oracle 外鍵約束和觸發器
 * - 相簿刪除的級聯處理
 * - 相簿權限驗證
 * - 事務一致性
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
import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import {
  oracleTestManager,
  setupOracleForTests,
  cleanupOracleAfterTests,
  ensureOracleReady,
} from '@/lib/database/oracle-test-setup';
import { OracleRepositoryFactory } from '@/lib/repositories/oracle-repository-factory';
import { getOracleConnection } from '@/lib/database/oracle-connection';
import type {
  Album,
  CreateAlbumData,
  UpdateAlbumData,
} from '@/lib/repositories/types/photo.types';

// 測試常數
const TEST_UPLOADS_PATH = path.join(process.cwd(), 'test-uploads/albums');
const TEST_PROJECT_ID = 'TEST_PROJ_ALBUM';
const TEST_USER_ID = 'TEST_USER_ALBUM';
const TEST_MANAGER_ID = 'TEST_MANAGER_ALBUM';

describe('Oracle 相簿 CRUD 操作端到端整合測試', () => {
  let testProjectId: string;
  let testUserId: string;

  // ===== 測試環境設置 =====
  beforeAll(async () => {
    console.log('🔧 設置 Oracle 相簿整合測試環境...');

    // 確保 Oracle 容器運行
    await ensureOracleReady();

    // 初始化 Oracle 測試資料庫
    await setupOracleForTests({
      recreateSchema: true,
      loadTestData: true,
    });

    // 建立測試上傳目錄
    await fs.mkdir(TEST_UPLOADS_PATH, { recursive: true });

    // 設置測試專案和使用者
    const oracle = getOracleConnection();

    // 建立測試專案
    await oracle.executeQuery(
      `
      INSERT INTO projects (id, name, description, status, manager_id, created_at)
      VALUES (:id, :name, :description, 'active', :managerId, SYSTIMESTAMP)
    `,
      {
        id: TEST_PROJECT_ID,
        name: 'Album Integration Test Project',
        description: 'Test project for album CRUD operations',
        managerId: TEST_MANAGER_ID,
      }
    );

    // 建立測試使用者
    await oracle.executeQuery(
      `
      INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, created_at)
      VALUES (:id, :username, :email, 'test_hash', 'manager', 'Album', 'Tester', SYSTIMESTAMP)
    `,
      {
        id: TEST_USER_ID,
        username: 'album_test_user',
        email: 'album.test@pcm.test',
      }
    );

    testProjectId = TEST_PROJECT_ID;
    testUserId = TEST_USER_ID;

    console.log('✅ Oracle 相簿整合測試環境準備就緒');
  }, 60000); // 60s timeout for Oracle setup

  afterAll(async () => {
    console.log('🧹 清理 Oracle 相簿整合測試環境...');

    // 清理測試檔案
    try {
      await fs.rm(TEST_UPLOADS_PATH, { recursive: true, force: true });
    } catch (error) {
      console.warn('清理測試檔案失敗:', error);
    }

    // 清理 Oracle 測試資料
    await cleanupOracleAfterTests();

    console.log('✅ Oracle 相簿整合測試環境清理完成');
  });

  let createdAlbums: Album[] = [];

  afterEach(async () => {
    // 清理測試建立的相簿
    const albumRepository = await OracleRepositoryFactory.getAlbumRepository();

    for (const album of createdAlbums) {
      try {
        await albumRepository.deleteAlbum(album.id, testUserId, true); // 強制刪除
      } catch (error) {
        console.warn(`清理相簿失敗 ${album.id}:`, error);
      }
    }

    createdAlbums = [];
  });

  // ===== 基礎 CRUD 操作測試 =====
  describe('基礎相簿 CRUD 操作', () => {
    it('RED: 應該成功建立新相簿', async () => {
      // Arrange
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();

      const albumData: CreateAlbumData = {
        projectId: testProjectId,
        name: 'Test Album Creation',
        description: 'Integration test album for creation',
        createdBy: testUserId,
      };

      // Act
      const createdAlbum = await albumRepository.createAlbum(albumData);
      createdAlbums.push(createdAlbum);

      // Assert
      expect(createdAlbum).toBeDefined();
      expect(createdAlbum.id).toBeDefined();
      expect(createdAlbum.projectId).toBe(albumData.projectId);
      expect(createdAlbum.name).toBe(albumData.name);
      expect(createdAlbum.description).toBe(albumData.description);
      expect(createdAlbum.createdBy).toBe(albumData.createdBy);
      expect(createdAlbum.photoCount).toBe(0);
      expect(createdAlbum.createdAt).toBeDefined();

      // 驗證可以從資料庫重新查詢
      const retrievedAlbum = await albumRepository.findById(createdAlbum.id);
      expect(retrievedAlbum).toBeDefined();
      expect(retrievedAlbum!.id).toBe(createdAlbum.id);
    });

    it('RED: 應該成功讀取相簿詳細資訊', async () => {
      // Arrange
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();

      const albumData: CreateAlbumData = {
        projectId: testProjectId,
        name: 'Test Album Read',
        description: 'Integration test album for reading',
        createdBy: testUserId,
      };

      const createdAlbum = await albumRepository.createAlbum(albumData);
      createdAlbums.push(createdAlbum);

      // Act
      const retrievedAlbum = await albumRepository.findById(createdAlbum.id);

      // Assert
      expect(retrievedAlbum).toBeDefined();
      expect(retrievedAlbum!.id).toBe(createdAlbum.id);
      expect(retrievedAlbum!.name).toBe(albumData.name);
      expect(retrievedAlbum!.description).toBe(albumData.description);
      expect(retrievedAlbum!.projectId).toBe(albumData.projectId);
      expect(retrievedAlbum!.createdBy).toBe(albumData.createdBy);
    });

    it('RED: 應該成功更新相簿資訊', async () => {
      // Arrange
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();

      const albumData: CreateAlbumData = {
        projectId: testProjectId,
        name: 'Original Album Name',
        description: 'Original description',
        createdBy: testUserId,
      };

      const createdAlbum = await albumRepository.createAlbum(albumData);
      createdAlbums.push(createdAlbum);

      const updateData: UpdateAlbumData = {
        name: 'Updated Album Name',
        description: 'Updated description',
      };

      // Act
      const updatedAlbum = await albumRepository.updateAlbum(
        createdAlbum.id,
        updateData
      );

      // Assert
      expect(updatedAlbum).toBeDefined();
      expect(updatedAlbum.id).toBe(createdAlbum.id);
      expect(updatedAlbum.name).toBe(updateData.name);
      expect(updatedAlbum.description).toBe(updateData.description);
      expect(updatedAlbum.updatedAt).toBeDefined();

      // 驗證更新時間有變化
      expect(updatedAlbum.updatedAt.getTime()).toBeGreaterThan(
        createdAlbum.createdAt.getTime()
      );

      // 驗證從資料庫重新查詢的資料是否正確
      const retrievedAlbum = await albumRepository.findById(createdAlbum.id);
      expect(retrievedAlbum!.name).toBe(updateData.name);
      expect(retrievedAlbum!.description).toBe(updateData.description);
    });

    it('RED: 應該成功刪除空相簿', async () => {
      // Arrange
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();

      const albumData: CreateAlbumData = {
        projectId: testProjectId,
        name: 'Test Album Delete',
        description: 'Album to be deleted',
        createdBy: testUserId,
      };

      const createdAlbum = await albumRepository.createAlbum(albumData);

      // Act
      await albumRepository.deleteAlbum(createdAlbum.id, testUserId, false);

      // Assert - 驗證軟刪除
      const deletedAlbum = await albumRepository.findById(createdAlbum.id);
      expect(deletedAlbum).toBeNull();

      // 不需要加入 createdAlbums 因為已經被刪除
    });
  });

  // ===== 業務邏輯驗證測試 =====
  describe('業務邏輯驗證', () => {
    it('RED: 應該拒絕建立重複名稱的相簿', async () => {
      // Arrange
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();

      const albumData: CreateAlbumData = {
        projectId: testProjectId,
        name: 'Duplicate Name Album',
        description: 'First album',
        createdBy: testUserId,
      };

      // 建立第一個相簿
      const firstAlbum = await albumRepository.createAlbum(albumData);
      createdAlbums.push(firstAlbum);

      // Act & Assert - 嘗試建立重複名稱的相簿
      const duplicateData: CreateAlbumData = {
        ...albumData,
        description: 'Duplicate album',
      };

      await expect(
        albumRepository.createAlbum(duplicateData)
      ).rejects.toThrow();

      // 驗證只有一個相簿存在
      const projectAlbums =
        await albumRepository.getProjectAlbums(testProjectId);
      const duplicateNameAlbums = projectAlbums.filter(
        album => album.name === albumData.name
      );
      expect(duplicateNameAlbums).toHaveLength(1);
    });

    it('RED: 應該驗證專案存在性', async () => {
      // Arrange
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();

      const albumData: CreateAlbumData = {
        projectId: 'NON_EXISTENT_PROJECT',
        name: 'Invalid Project Album',
        description: 'Album with invalid project',
        createdBy: testUserId,
      };

      // Act & Assert
      await expect(albumRepository.createAlbum(albumData)).rejects.toThrow(); // 外鍵約束失敗
    });

    it('RED: 應該驗證建立者存在性', async () => {
      // Arrange
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();

      const albumData: CreateAlbumData = {
        projectId: testProjectId,
        name: 'Invalid Creator Album',
        description: 'Album with invalid creator',
        createdBy: 'NON_EXISTENT_USER',
      };

      // Act & Assert
      await expect(albumRepository.createAlbum(albumData)).rejects.toThrow(); // 外鍵約束失敗
    });
  });

  // ===== 批次操作測試 =====
  describe('批次相簿操作', () => {
    it('RED: 應該支援批次建立多個相簿', async () => {
      // Arrange
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();
      const batchSize = 5;
      const albums: Album[] = [];

      // Act - 建立多個相簿
      for (let i = 0; i < batchSize; i++) {
        const albumData: CreateAlbumData = {
          projectId: testProjectId,
          name: `Batch Album ${i + 1}`,
          description: `Batch created album number ${i + 1}`,
          createdBy: testUserId,
        };

        const album = await albumRepository.createAlbum(albumData);
        albums.push(album);
      }

      createdAlbums.push(...albums);

      // Assert
      expect(albums).toHaveLength(batchSize);

      // 驗證所有相簿都有唯一 ID
      const albumIds = albums.map(album => album.id);
      const uniqueIds = new Set(albumIds);
      expect(uniqueIds.size).toBe(batchSize);

      // 驗證可以查詢專案的所有相簿
      const projectAlbums =
        await albumRepository.getProjectAlbums(testProjectId);
      expect(projectAlbums.length).toBeGreaterThanOrEqual(batchSize);

      // 驗證每個相簿都能正確查詢
      for (const album of albums) {
        const retrieved = await albumRepository.findById(album.id);
        expect(retrieved).toBeDefined();
        expect(retrieved!.name).toContain('Batch Album');
      }
    });

    it('RED: 應該支援批次更新多個相簿', async () => {
      // Arrange
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();
      const batchSize = 3;
      const albums: Album[] = [];

      // 建立多個相簿
      for (let i = 0; i < batchSize; i++) {
        const albumData: CreateAlbumData = {
          projectId: testProjectId,
          name: `Batch Update Album ${i + 1}`,
          description: `Original description ${i + 1}`,
          createdBy: testUserId,
        };

        const album = await albumRepository.createAlbum(albumData);
        albums.push(album);
      }

      createdAlbums.push(...albums);

      // Act - 批次更新
      const updatePromises = albums.map(album => {
        const updateData: UpdateAlbumData = {
          description: `Updated description for ${album.name}`,
        };
        return albumRepository.updateAlbum(album.id, updateData);
      });

      const updatedAlbums = await Promise.all(updatePromises);

      // Assert
      expect(updatedAlbums).toHaveLength(batchSize);

      // 驗證每個相簿都被正確更新
      for (let i = 0; i < batchSize; i++) {
        expect(updatedAlbums[i].description).toBe(
          `Updated description for Batch Update Album ${i + 1}`
        );
        expect(updatedAlbums[i].updatedAt).toBeDefined();
      }
    });
  });

  // ===== 權限驗證測試 =====
  describe('相簿權限驗證', () => {
    it('RED: 應該驗證相簿存取權限', async () => {
      // Arrange
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();

      const albumData: CreateAlbumData = {
        projectId: testProjectId,
        name: 'Permission Test Album',
        description: 'Album for permission testing',
        createdBy: testUserId,
      };

      const album = await albumRepository.createAlbum(albumData);
      createdAlbums.push(album);

      // Act & Assert - 驗證建立者有權限存取
      const hasAccess = await albumRepository.hasAlbumAccess(
        album.id,
        testUserId
      );
      expect(hasAccess).toBe(true);

      // 驗證非建立者無權限存取（假設有這種檢查）
      const hasAccessOther = await albumRepository.hasAlbumAccess(
        album.id,
        'OTHER_USER'
      );
      expect(hasAccessOther).toBe(false);
    });

    it('RED: 應該驗證相簿刪除權限', async () => {
      // Arrange
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();

      const albumData: CreateAlbumData = {
        projectId: testProjectId,
        name: 'Delete Permission Test',
        description: 'Album for delete permission testing',
        createdBy: testUserId,
      };

      const album = await albumRepository.createAlbum(albumData);

      // Act - 建立者應該能刪除
      await albumRepository.deleteAlbum(album.id, testUserId, false);

      // Assert
      const deletedAlbum = await albumRepository.findById(album.id);
      expect(deletedAlbum).toBeNull();

      // 不需要加入 createdAlbums 因為已經被刪除
    });
  });

  // ===== 事務一致性測試 =====
  describe('事務一致性驗證', () => {
    it('RED: 應該確保相簿操作的原子性', async () => {
      // Arrange
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();
      const oracle = getOracleConnection();

      const albumData: CreateAlbumData = {
        projectId: testProjectId,
        name: 'Transaction Test Album',
        description: 'Album for transaction testing',
        createdBy: testUserId,
      };

      let transactionSuccess = false;

      try {
        // Act - 在事務中建立相簿
        await oracle.withTransaction(async connection => {
          const album = await albumRepository.createAlbum(albumData);
          createdAlbums.push(album);

          // 驗證相簿在事務內可見
          const retrievedInTransaction = await albumRepository.findById(
            album.id
          );
          expect(retrievedInTransaction).toBeDefined();

          transactionSuccess = true;
        });

        // Assert - 事務提交後相簿應該存在
        expect(transactionSuccess).toBe(true);

        const retrievedAfterCommit = await albumRepository.findById(
          createdAlbums[createdAlbums.length - 1].id
        );
        expect(retrievedAfterCommit).toBeDefined();
      } catch (error) {
        // 如果事務失敗，相簿不應該存在
        expect(transactionSuccess).toBe(false);
      }
    });

    it('RED: 應該正確處理事務回滾', async () => {
      // Arrange
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();
      const oracle = getOracleConnection();

      const albumData: CreateAlbumData = {
        projectId: testProjectId,
        name: 'Rollback Test Album',
        description: 'Album for rollback testing',
        createdBy: testUserId,
      };

      let albumId: string;

      try {
        // Act - 在事務中建立相簿然後拋出錯誤
        await oracle.withTransaction(async connection => {
          const album = await albumRepository.createAlbum(albumData);
          albumId = album.id;

          // 驗證相簿在事務內存在
          const retrievedInTransaction =
            await albumRepository.findById(albumId);
          expect(retrievedInTransaction).toBeDefined();

          // 故意拋出錯誤以觸發回滾
          throw new Error('Intentional error to test rollback');
        });
      } catch (error) {
        // Assert - 事務回滾後相簿不應該存在
        expect(error.message).toBe('Intentional error to test rollback');

        const retrievedAfterRollback = await albumRepository.findById(albumId!);
        expect(retrievedAfterRollback).toBeNull();
      }
    });
  });

  // ===== 級聯操作測試 =====
  describe('級聯操作驗證', () => {
    it('RED: 應該正確處理包含照片的相簿刪除', async () => {
      // Arrange
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();

      // 建立相簿
      const albumData: CreateAlbumData = {
        projectId: testProjectId,
        name: 'Album With Photos',
        description: 'Album containing photos for cascade testing',
        createdBy: testUserId,
      };

      const album = await albumRepository.createAlbum(albumData);
      createdAlbums.push(album);

      // 建立測試照片
      const photoData = {
        albumId: album.id,
        fileName: 'cascade-test.jpg',
        filePath: path.join(TEST_UPLOADS_PATH, 'cascade-test.jpg'),
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedBy: testUserId,
        metadata: {},
      };

      // 建立實際檔案
      await fs.writeFile(photoData.filePath, Buffer.from('test-data'));
      const photo = await photoRepository.createPhoto(photoData);

      // 驗證相簿包含照片
      let albumWithPhotos = await albumRepository.findById(album.id);
      expect(albumWithPhotos!.photoCount).toBe(1);

      // Act - 嘗試刪除包含照片的相簿
      await expect(
        albumRepository.deleteAlbum(album.id, testUserId, false)
      ).rejects.toThrow(); // 應該失敗，因為包含照片

      // 驗證相簿仍然存在
      const albumStillExists = await albumRepository.findById(album.id);
      expect(albumStillExists).toBeDefined();

      // 強制刪除應該成功
      await albumRepository.deleteAlbum(album.id, testUserId, true);

      // Assert
      const forcedDeletedAlbum = await albumRepository.findById(album.id);
      expect(forcedDeletedAlbum).toBeNull();

      // 相關照片也應該被級聯刪除
      const orphanedPhoto = await photoRepository.findById(photo.id);
      expect(orphanedPhoto).toBeNull();

      // 清理檔案
      try {
        await fs.unlink(photoData.filePath);
      } catch (error) {
        // 檔案可能已被刪除，忽略錯誤
      }

      // 從追蹤列表移除（已經被刪除）
      createdAlbums = createdAlbums.filter(a => a.id !== album.id);
    });
  });

  // ===== 查詢效能測試 =====
  describe('查詢效能驗證', () => {
    it('RED: 應該高效查詢專案相簿列表', async () => {
      // Arrange
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();
      const albumCount = 10;

      // 建立多個相簿
      for (let i = 0; i < albumCount; i++) {
        const albumData: CreateAlbumData = {
          projectId: testProjectId,
          name: `Performance Test Album ${i + 1}`,
          description: `Performance testing album ${i + 1}`,
          createdBy: testUserId,
        };

        const album = await albumRepository.createAlbum(albumData);
        createdAlbums.push(album);
      }

      // Act - 測量查詢時間
      const startTime = process.hrtime.bigint();
      const projectAlbums =
        await albumRepository.getProjectAlbums(testProjectId);
      const endTime = process.hrtime.bigint();

      const queryTimeMs = Number(endTime - startTime) / 1_000_000;

      // Assert
      expect(projectAlbums.length).toBeGreaterThanOrEqual(albumCount);
      expect(queryTimeMs).toBeLessThan(1000); // 查詢應在 1 秒內完成

      // 驗證返回的相簿資料完整性
      const testAlbums = projectAlbums.filter(album =>
        album.name.includes('Performance Test')
      );
      expect(testAlbums).toHaveLength(albumCount);

      testAlbums.forEach(album => {
        expect(album.id).toBeDefined();
        expect(album.projectId).toBe(testProjectId);
        expect(album.createdBy).toBe(testUserId);
        expect(album.photoCount).toBeDefined();
      });
    });

    it('RED: 應該支援分頁查詢專案相簿', async () => {
      // Arrange
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();
      const totalAlbums = 15;
      const pageSize = 5;

      // 建立更多相簿
      for (let i = 0; i < totalAlbums; i++) {
        const albumData: CreateAlbumData = {
          projectId: testProjectId,
          name: `Pagination Test Album ${i + 1}`,
          description: `Pagination testing album ${i + 1}`,
          createdBy: testUserId,
        };

        const album = await albumRepository.createAlbum(albumData);
        createdAlbums.push(album);
      }

      // Act - 分頁查詢
      const firstPage = await albumRepository.getProjectAlbumsPaginated(
        testProjectId,
        1,
        pageSize
      );
      const secondPage = await albumRepository.getProjectAlbumsPaginated(
        testProjectId,
        2,
        pageSize
      );

      // Assert
      expect(firstPage.albums).toHaveLength(pageSize);
      expect(secondPage.albums).toHaveLength(pageSize);
      expect(firstPage.totalCount).toBeGreaterThanOrEqual(totalAlbums);
      expect(secondPage.totalCount).toBe(firstPage.totalCount);

      // 驗證分頁資料不重複
      const firstPageIds = firstPage.albums.map(album => album.id);
      const secondPageIds = secondPage.albums.map(album => album.id);
      const overlap = firstPageIds.filter(id => secondPageIds.includes(id));
      expect(overlap).toHaveLength(0);
    });
  });
});
