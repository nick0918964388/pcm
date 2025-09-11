import { NextRequest, NextResponse } from 'next/server';
import { DutyScheduleService } from '@/lib/services/duty-schedule-service';
import { z } from 'zod';

// 統計查詢驗證 schema
const StatsQuerySchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});

const dutyScheduleService = new DutyScheduleService();

/**
 * GET /api/projects/[projectId]/duty-schedules/stats
 * 取得專案的值班排程統計資料
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // 驗證查詢參數
    const validatedQuery = StatsQuerySchema.parse(queryParams);
    
    const dateFrom = validatedQuery.dateFrom ? new Date(validatedQuery.dateFrom) : undefined;
    const dateTo = validatedQuery.dateTo ? new Date(validatedQuery.dateTo) : undefined;
    
    // 取得排程統計
    const stats = await dutyScheduleService.getScheduleStatistics(projectId, dateFrom, dateTo);
    
    // 取得當前值班人員
    const currentDuty = await dutyScheduleService.getCurrentDutyPersonnel(projectId);
    
    // 取得需要代班的記錄
    const replacementNeeded = await dutyScheduleService.getReplacementNeeded(projectId);
    
    // 取得緊急排程
    const urgentSchedules = await dutyScheduleService.getUrgentSchedules(projectId);
    
    return NextResponse.json({
      projectId,
      statistics: stats,
      currentDuty,
      replacementNeeded,
      urgentSchedules,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('取得排程統計失敗:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '查詢參數驗證失敗', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '取得排程統計失敗' },
      { status: 500 }
    );
  }
}