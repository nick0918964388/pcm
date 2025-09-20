import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';

/**
 * GET /api/health/database
 * 檢查資料庫連接狀態
 */
export async function GET(request: NextRequest) {
  try {
    console.log('嘗試連接資料庫...');
    
    // 測試基本查詢
    const testResult = await db.query('SELECT 1 as test');
    console.log('基本查詢結果:', testResult);
    
    // 取得連接池狀態
    const poolStatus = db.getPoolStatus();
    console.log('連接池狀態:', poolStatus);
    
    // 測試查詢 pcm schema 中的表格
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'pcm'
      ORDER BY table_name
    `);
    console.log('PCM schema 表格:', tables);
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      poolStatus,
      schema: 'pcm',
      tables: tables.map(t => t.table_name),
      testResult: testResult[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('資料庫健康檢查失敗:', error);
    
    // 提供更詳細的錯誤信息
    let errorDetails = '';
    if (error instanceof Error) {
      errorDetails = error.message;
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    
    // 顯示連接配置信息（隱藏敏感資訊）
    const connectionInfo = {
      host: process.env.DB_HOST || process.env.HOSTNAME || '192.168.1.183',
      port: parseInt(process.env.DB_PORT || process.env.PORT || '30432'),
      database: process.env.DB_DATABASE || process.env.DATABASE || 'app_db',
      user: process.env.DB_USER || process.env.USERNAME || 'admin',
      ssl: process.env.NODE_ENV === 'production' ? true : false
    };
    
    return NextResponse.json({
      status: 'unhealthy',
      database: 'error',
      error: errorDetails || '資料庫連接失敗',
      connectionInfo,
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}