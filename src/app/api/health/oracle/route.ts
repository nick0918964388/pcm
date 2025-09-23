import { NextRequest, NextResponse } from 'next/server';
import oracledb from 'oracledb';

/**
 * GET /api/health/oracle
 * 檢查Oracle資料庫連接狀態
 */
export async function GET(request: NextRequest) {
  let connection: oracledb.Connection | undefined;

  try {
    console.log('嘗試連接Oracle資料庫...');

    // Oracle連線配置
    const connectionConfig = {
      user: process.env.ORACLE_USER || 'pcm_user',
      password: process.env.ORACLE_PASSWORD || 'pcm_pass123',
      connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XE'
    };

    console.log('Oracle連線配置:', {
      user: connectionConfig.user,
      connectString: connectionConfig.connectString
    });

    // 建立連線
    connection = await oracledb.getConnection(connectionConfig);
    console.log('Oracle連線建立成功');

    // 基本查詢測試
    const testResult = await connection.execute('SELECT 1 as test FROM dual');
    console.log('基本查詢結果:', testResult.rows);

    // 檢查PCM表格
    const tablesResult = await connection.execute(`
      SELECT table_name
      FROM user_tables
      WHERE table_name IN ('PROJECTS', 'WBS_ITEMS', 'TASKS', 'USERS')
      ORDER BY table_name
    `);
    console.log('PCM核心表格:', tablesResult.rows);

    // 檢查系統資訊
    const versionResult = await connection.execute(`
      SELECT key_value
      FROM system_info
      WHERE key_name = 'schema_version'
    `);

    const schemaVersion = versionResult.rows && versionResult.rows.length > 0
      ? (versionResult.rows[0] as any[])[0]
      : '未知';

    // 檢查記錄總數
    const counts: Record<string, number> = {};
    const coreTable = ['PROJECTS', 'WBS_ITEMS', 'TASKS', 'USERS'];

    for (const table of coreTable) {
      try {
        const countResult = await connection.execute(`SELECT COUNT(*) FROM ${table}`);
        counts[table] = countResult.rows ? (countResult.rows[0] as any[])[0] : 0;
      } catch (error) {
        counts[table] = -1; // 表示表格不存在或查詢失敗
      }
    }

    return NextResponse.json({
      status: 'healthy',
      database: 'oracle',
      connection: 'connected',
      config: {
        user: connectionConfig.user,
        connectString: connectionConfig.connectString
      },
      schema: {
        version: schemaVersion,
        tables: tablesResult.rows?.map(row => (row as any[])[0]) || [],
        recordCounts: counts
      },
      testResult: testResult.rows?.[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Oracle資料庫健康檢查失敗:', error);

    let errorDetails = '';
    if (error instanceof Error) {
      errorDetails = error.message;
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }

    const connectionInfo = {
      user: process.env.ORACLE_USER || 'pcm_user',
      connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XE'
    };

    return NextResponse.json({
      status: 'unhealthy',
      database: 'oracle',
      connection: 'error',
      error: errorDetails || 'Oracle連接失敗',
      connectionInfo,
      timestamp: new Date().toISOString()
    }, { status: 503 });

  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('Oracle連線已關閉');
      } catch (error) {
        console.error('關閉Oracle連線時發生錯誤:', error);
      }
    }
  }
}