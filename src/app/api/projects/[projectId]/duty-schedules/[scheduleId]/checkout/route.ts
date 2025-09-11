import { NextRequest, NextResponse } from 'next/server';
import { DutyScheduleService } from '@/lib/services/duty-schedule-service';
import { z } from 'zod';

// 簽退驗證 schema
const CheckOutSchema = z.object({
  checkOutTime: z.string().datetime().transform(date => new Date(date)).optional()
});

const dutyScheduleService = new DutyScheduleService();

/**
 * POST /api/projects/[projectId]/duty-schedules/[scheduleId]/checkout
 * 值班簽退
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; scheduleId: string } }
) {
  try {
    const { scheduleId } = params;
    const body = await request.json().catch(() => ({}));
    
    // 驗證輸入資料
    const validatedData = CheckOutSchema.parse(body);
    
    // 執行簽退
    await dutyScheduleService.checkOut(scheduleId, validatedData.checkOutTime);
    
    return NextResponse.json({ 
      message: '簽退成功',
      scheduleId,
      checkOutTime: validatedData.checkOutTime || new Date()
    });
  } catch (error) {
    console.error('簽退失敗:', error);
    
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
      
      if (error.message.includes('只有') || error.message.includes('尚未')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '簽退失敗' },
      { status: 500 }
    );
  }
}