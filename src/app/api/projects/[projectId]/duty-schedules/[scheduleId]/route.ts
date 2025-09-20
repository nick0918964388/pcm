import { NextRequest, NextResponse } from 'next/server';
import { DutyScheduleService } from '@/lib/services/duty-schedule-service';
import { z } from 'zod';

// 更新排程驗證 schema
const UpdateScheduleSchema = z.object({
  dutyDate: z.string().datetime().transform(date => new Date(date)).optional(),
  shiftType: z.enum(['day', 'night', 'full_day']).optional(),
  workArea: z.string().optional(),
  status: z.enum(['已排班', '值班中', '已完成', '請假', '取消']).optional(),
  urgencyLevel: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  notes: z.string().optional()
});

const dutyScheduleService = new DutyScheduleService();

/**
 * GET /api/projects/[projectId]/duty-schedules/[scheduleId]
 * 取得單一排程詳情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; scheduleId: string } }
) {
  try {
    const { scheduleId } = params;
    
    // TODO: 實作 repository 中的 findById 方法
    // 目前先返回基本結構
    return NextResponse.json({
      message: '取得排程詳情功能待實作',
      scheduleId
    });
  } catch (error) {
    console.error('取得排程詳情失敗:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '取得排程詳情失敗' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[projectId]/duty-schedules/[scheduleId]
 * 更新排程
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string; scheduleId: string } }
) {
  try {
    const { scheduleId } = params;
    const body = await request.json();
    
    // 驗證輸入資料
    const validatedData = UpdateScheduleSchema.parse(body);
    
    // TODO: 從認證中取得更新者ID
    const updatedBy = 'system'; // 暫時使用
    
    // 更新排程
    const updatedSchedule = await dutyScheduleService.updateSchedule(
      scheduleId, 
      validatedData, 
      updatedBy
    );
    
    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error('更新排程失敗:', error);
    
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
      
      if (error.message.includes('無法修改') || error.message.includes('已有其他值班安排')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新排程失敗' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/duty-schedules/[scheduleId]
 * 刪除排程
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; scheduleId: string } }
) {
  try {
    const { scheduleId } = params;
    
    // TODO: 從認證中取得刪除者ID
    const deletedBy = 'system'; // 暫時使用
    
    // 刪除排程
    await dutyScheduleService.deleteSchedule(scheduleId, deletedBy);
    
    return NextResponse.json({ message: '排程已成功刪除' });
  } catch (error) {
    console.error('刪除排程失敗:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('不存在') || error.message.includes('找不到')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message.includes('無法刪除')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '刪除排程失敗' },
      { status: 500 }
    );
  }
}