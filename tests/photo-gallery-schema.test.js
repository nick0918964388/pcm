/**
 * 照片庫資料庫架構測試
 * 任務: 1-1 建立資料庫架構與表格
 *
 * 測試內容:
 * - 相簿資料表結構
 * - 照片資料表結構
 * - 照片版本表結構
 * - 索引效能
 * - 軟刪除機制
 */

import { test, expect } from '@playwright/test';
import pkg from 'pg';
const { Pool } = pkg;

test.describe('照片庫資料庫架構測試', () => {
  let pool;

  test.beforeAll(async () => {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'app_db',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'Admin123!',
      port: process.env.DB_PORT || 5432,
    });
  });

  test.afterAll(async () => {
    await pool.end();
  });

  test.describe('相簿表 (photo_albums)', () => {
    test('相簿表應該存在並具有正確的欄位', async () => {
      const query = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'pcm' AND table_name = 'photo_albums'
        ORDER BY ordinal_position;
      `;

      const result = await pool.query(query);
      const columns = result.rows;

      // 檢查必要欄位是否存在
      const columnNames = columns.map(col => col.column_name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('project_id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('description');
      expect(columnNames).toContain('cover_photo_id');
      expect(columnNames).toContain('photo_count');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');
      expect(columnNames).toContain('deleted_at');
    });

    test('相簿表應該有正確的約束和索引', async () => {
      // 檢查主鍵約束
      const pkQuery = `
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_schema = 'pcm'
        AND table_name = 'photo_albums'
        AND constraint_type = 'PRIMARY KEY';
      `;

      const pkResult = await pool.query(pkQuery);
      expect(pkResult.rows.length).toBe(1);

      // 檢查外鍵約束 (project_id)
      const fkQuery = `
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_schema = 'pcm'
        AND table_name = 'photo_albums'
        AND constraint_type = 'FOREIGN KEY';
      `;

      const fkResult = await pool.query(fkQuery);
      expect(fkResult.rows.length).toBeGreaterThan(0);
    });

    test('相簿表應該支援軟刪除', async () => {
      // 檢查 deleted_at 欄位存在
      const query = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'pcm'
        AND table_name = 'photo_albums'
        AND column_name = 'deleted_at';
      `;

      const result = await pool.query(query);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].is_nullable).toBe('YES');
    });
  });

  test.describe('照片表 (photos)', () => {
    test('照片表應該存在並具有正確的欄位', async () => {
      const query = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'pcm' AND table_name = 'photos'
        ORDER BY ordinal_position;
      `;

      const result = await pool.query(query);
      const columns = result.rows;
      const columnNames = columns.map(col => col.column_name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('album_id');
      expect(columnNames).toContain('file_name');
      expect(columnNames).toContain('file_path');
      expect(columnNames).toContain('file_size');
      expect(columnNames).toContain('mime_type');
      expect(columnNames).toContain('width');
      expect(columnNames).toContain('height');
      expect(columnNames).toContain('thumbnail_path');
      expect(columnNames).toContain('uploaded_by');
      expect(columnNames).toContain('uploaded_at');
      expect(columnNames).toContain('metadata');
      expect(columnNames).toContain('deleted_at');
    });

    test('照片表metadata欄位應該是JSONB類型', async () => {
      const query = `
        SELECT data_type
        FROM information_schema.columns
        WHERE table_schema = 'pcm'
        AND table_name = 'photos'
        AND column_name = 'metadata';
      `;

      const result = await pool.query(query);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].data_type).toBe('jsonb');
    });

    test('照片表應該有正確的外鍵約束', async () => {
      const fkQuery = `
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'pcm'
        AND tc.table_name = 'photos';
      `;

      const result = await pool.query(fkQuery);
      const foreignKeys = result.rows;

      // 應該有 album_id 和 uploaded_by 的外鍵
      const columns = foreignKeys.map(fk => fk.column_name);
      expect(columns).toContain('album_id');
      expect(columns).toContain('uploaded_by');
    });
  });

  test.describe('照片版本表 (photo_versions)', () => {
    test('照片版本表應該存在並具有正確的欄位', async () => {
      const query = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'pcm' AND table_name = 'photo_versions'
        ORDER BY ordinal_position;
      `;

      const result = await pool.query(query);
      const columnNames = result.rows.map(col => col.column_name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('photo_id');
      expect(columnNames).toContain('version_type');
      expect(columnNames).toContain('file_path');
      expect(columnNames).toContain('width');
      expect(columnNames).toContain('height');
      expect(columnNames).toContain('file_size');
    });

    test('照片版本表應該有唯一索引 (photo_id, version_type)', async () => {
      const indexQuery = `
        SELECT
          i.relname as index_name,
          a.attname as column_name,
          ix.indisunique as is_unique
        FROM pg_class t,
             pg_class i,
             pg_index ix,
             pg_attribute a,
             pg_namespace n
        WHERE t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND a.attrelid = t.oid
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND n.oid = t.relnamespace
        AND n.nspname = 'pcm'
        AND t.relname = 'photo_versions'
        AND ix.indisunique = true;
      `;

      const result = await pool.query(indexQuery);
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  test.describe('效能索引測試', () => {
    test('相簿表應該有project_id索引', async () => {
      const indexQuery = `
        SELECT
          i.relname as index_name,
          a.attname as column_name
        FROM pg_class t,
             pg_class i,
             pg_index ix,
             pg_attribute a,
             pg_namespace n
        WHERE t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND a.attrelid = t.oid
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND n.oid = t.relnamespace
        AND n.nspname = 'pcm'
        AND t.relname = 'photo_albums'
        AND a.attname = 'project_id';
      `;

      const result = await pool.query(indexQuery);
      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('照片表應該有album_id和uploaded_at索引', async () => {
      const indexQuery = `
        SELECT
          i.relname as index_name,
          a.attname as column_name
        FROM pg_class t,
             pg_class i,
             pg_index ix,
             pg_attribute a,
             pg_namespace n
        WHERE t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND a.attrelid = t.oid
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND n.oid = t.relnamespace
        AND n.nspname = 'pcm'
        AND t.relname = 'photos'
        AND a.attname IN ('album_id', 'uploaded_at');
      `;

      const result = await pool.query(indexQuery);
      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('照片表應該有metadata JSONB索引 (GIN)', async () => {
      const ginIndexQuery = `
        SELECT
          i.relname as index_name,
          am.amname as index_method
        FROM pg_class t,
             pg_class i,
             pg_index ix,
             pg_am am,
             pg_attribute a,
             pg_namespace n
        WHERE t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND i.relam = am.oid
        AND a.attrelid = t.oid
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND n.oid = t.relnamespace
        AND n.nspname = 'pcm'
        AND t.relname = 'photos'
        AND a.attname = 'metadata'
        AND am.amname = 'gin';
      `;

      const result = await pool.query(ginIndexQuery);
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  test.describe('軟刪除機制測試', () => {
    test('軟刪除應該有部分索引 (deleted_at IS NULL)', async () => {
      const partialIndexQuery = `
        SELECT
          i.relname as index_name,
          pg_get_expr(ix.indpred, ix.indrelid) as index_predicate
        FROM pg_class t,
             pg_class i,
             pg_index ix,
             pg_namespace n
        WHERE t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND t.relkind = 'r'
        AND n.oid = t.relnamespace
        AND n.nspname = 'pcm'
        AND t.relname IN ('photo_albums', 'photos')
        AND ix.indpred IS NOT NULL
        AND pg_get_expr(ix.indpred, ix.indrelid) LIKE '%deleted_at IS NULL%';
      `;

      const result = await pool.query(partialIndexQuery);
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  test.describe('資料表關聯測試', () => {
    test('照片表應該正確關聯到相簿表', async () => {
      const relationQuery = `
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'pcm'
        AND tc.table_name = 'photos'
        AND kcu.column_name = 'album_id'
        AND ccu.table_name = 'photo_albums';
      `;

      const result = await pool.query(relationQuery);
      expect(result.rows.length).toBe(1);
    });

    test('相簿表應該正確關聯到專案表', async () => {
      const relationQuery = `
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'pcm'
        AND tc.table_name = 'photo_albums'
        AND kcu.column_name = 'project_id'
        AND ccu.table_name = 'projects';
      `;

      const result = await pool.query(relationQuery);
      expect(result.rows.length).toBe(1);
    });
  });
});