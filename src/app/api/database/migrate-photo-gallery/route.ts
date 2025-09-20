import { NextRequest, NextResponse } from 'next/server';
import { DatabaseConnection } from '@/lib/database/connection';
import fs from 'fs';
import path from 'path';

/**
 * 照片庫資料庫遷移API
 * POST /api/database/migrate-photo-gallery
 * 執行照片庫架構建立SQL
 */
export async function POST(request: NextRequest) {
  let connection: DatabaseConnection | null = null;

  try {
    console.log('📊 開始照片庫資料庫遷移...');

    // 建立資料庫連接
    connection = new DatabaseConnection();
    await connection.connect();

    // 讀取SQL檔案
    const sqlPath = path.join(process.cwd(), 'database', '06-photo-gallery-schema.sql');

    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL檔案不存在: ${sqlPath}`);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    console.log('📄 已讀取SQL檔案，長度:', sqlContent.length);

    // 執行SQL（分段執行以避免複雜語法問題）
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== '\n');

    let executedCount = 0;
    const results = [];

    for (const statement of statements) {
      try {
        if (statement.trim()) {
          console.log(`執行SQL片段 ${executedCount + 1}/${statements.length}`);
          const result = await connection.query(statement);
          results.push({
            statement: statement.substring(0, 100) + '...',
            success: true,
            rowCount: result.rowCount
          });
          executedCount++;
        }
      } catch (error) {
        console.warn('SQL片段執行失敗:', error);
        results.push({
          statement: statement.substring(0, 100) + '...',
          success: false,
          error: error instanceof Error ? error.message : '未知錯誤'
        });
      }
    }

    // 驗證表格是否建立成功
    const verificationQueries = [
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'pcm' AND table_name = 'photo_albums'",
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'pcm' AND table_name = 'photos'",
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'pcm' AND table_name = 'photo_versions'"
    ];

    const verificationResults = [];
    for (const query of verificationQueries) {
      try {
        const result = await connection.query(query);
        verificationResults.push({
          query: query.match(/table_name = '(\w+)'/)?.[1] || 'unknown',
          exists: result.rows[0]?.count === '1'
        });
      } catch (error) {
        verificationResults.push({
          query: query.match(/table_name = '(\w+)'/)?.[1] || 'unknown',
          exists: false,
          error: error instanceof Error ? error.message : '未知錯誤'
        });
      }
    }

    console.log('✅ 照片庫資料庫遷移完成');

    return NextResponse.json({
      success: true,
      message: '照片庫資料庫架構建立成功',
      executedStatements: executedCount,
      totalStatements: statements.length,
      results: results.slice(-10), // 只回傳最後10個結果
      verification: verificationResults
    });

  } catch (error) {
    console.error('❌ 照片庫資料庫遷移失敗:', error);

    return NextResponse.json({
      success: false,
      message: '照片庫資料庫遷移失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });

  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

/**
 * 檢查照片庫資料庫架構狀態
 * GET /api/database/migrate-photo-gallery
 */
export async function GET(request: NextRequest) {
  let connection: DatabaseConnection | null = null;

  try {
    connection = new DatabaseConnection();
    await connection.connect();

    // 檢查表格存在狀態
    const tableChecks = [
      'photo_albums',
      'photos',
      'photo_versions'
    ];

    const tableStatus = [];

    for (const tableName of tableChecks) {
      try {
        const result = await connection.query(`
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'pcm' AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);

        tableStatus.push({
          table: tableName,
          exists: result.rows.length > 0,
          columns: result.rows.length,
          columnDetails: result.rows
        });
      } catch (error) {
        tableStatus.push({
          table: tableName,
          exists: false,
          error: error instanceof Error ? error.message : '未知錯誤'
        });
      }
    }

    // 檢查索引狀態
    const indexResult = await connection.query(`
      SELECT
        i.relname as index_name,
        t.relname as table_name,
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
      AND t.relname IN ('photo_albums', 'photos', 'photo_versions')
      ORDER BY t.relname, i.relname
    `);

    return NextResponse.json({
      success: true,
      message: '照片庫資料庫架構狀態檢查完成',
      tables: tableStatus,
      indexes: indexResult.rows,
      indexCount: indexResult.rows.length
    });

  } catch (error) {
    console.error('❌ 架構狀態檢查失敗:', error);

    return NextResponse.json({
      success: false,
      message: '架構狀態檢查失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });

  } finally {
    if (connection) {
      await connection.close();
    }
  }
}