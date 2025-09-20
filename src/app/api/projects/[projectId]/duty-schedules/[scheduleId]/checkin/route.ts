import { NextRequest, NextResponse } from 'next/server';
import { DutyScheduleService } from '@/lib/services/duty-schedule-service';
import { z } from 'zod';

// 簽到驗證 schema
const CheckInSchema = z.object({
  checkInTime: z.string().datetime().transform(date => new Date(date)).optional()
});

const dutyScheduleService = new DutyScheduleService();

/**
 * POST /api/projects/[projectId]/duty-schedules/[scheduleId]/checkin
 * 值班簽到
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; scheduleId: string } }
) {
  try {
    const { scheduleId } = params;
    const body = await request.json().catch(() => ({}));
    
    // 驗證輸入資料
    const validatedData = CheckInSchema.parse(body);
    
    // 執行簽到
    await dutyScheduleService.checkIn(scheduleId, validatedData.checkInTime);
    
    return NextResponse.json({ 
      message: '簽到成功',
      scheduleId,
      checkInTime: validatedData.checkInTime || new Date()
    });
  } catch (error) {
    console.error('簽到失敗:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '輸入資料驗證失敗', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      if (error.message.includes('不存在') || error.message.includes('找不到')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message.includes('只有') || error.message.includes('只能')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '簽到失敗' },
      { status: 500 }
    );
  }
}