import { NextRequest, NextResponse } from 'next/server';
import { DutyScheduleService } from '@/lib/services/duty-schedule-service';

const dutyScheduleService = new DutyScheduleService();

/**
 * GET /api/projects/[projectId]/duty-schedules/current
 * 取得專案的當前值班人員
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;

    // 取得當前值班人員
    const currentDuty =
      await dutyScheduleService.getCurrentDutyPersonnel(projectId);

    return NextResponse.json({
      projectId,
      currentDuty,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('取得當前值班人員失敗:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '取得當前值班人員失敗',
      },
      { status: 500 }
    );
  }
}
