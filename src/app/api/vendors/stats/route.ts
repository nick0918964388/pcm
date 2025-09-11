import { NextRequest, NextResponse } from 'next/server';
import { vendorService } from '@/lib/services/vendor-service';

/**
 * GET /api/vendors/stats
 * 取得廠商統計資料
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await vendorService.getVendorStats();
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('取得廠商統計失敗:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '取得廠商統計失敗' },
      { status: 500 }
    );
  }
}