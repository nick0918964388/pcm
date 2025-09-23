import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';

export async function GET(request: NextRequest) {
  try {
    // 簡單的測試查詢
    const result = await db.query('SELECT COUNT(*) as vendor_count FROM vendors');

    return NextResponse.json({
      success: true,
      oracle_connection: 'working',
      vendor_count: result.rows?.[0]?.VENDOR_COUNT || result[0]?.VENDOR_COUNT || 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Oracle test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}