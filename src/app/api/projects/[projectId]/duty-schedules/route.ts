import { NextRequest, NextResponse } from 'next/server';
import { DutyScheduleService } from '@/lib/services/duty-schedule-service';
import { z } from 'zod';

// 建立排程驗證 schema
const CreateScheduleSchema = z.object({
  personId: z.string().min(1, '值班人員ID為必填'),
  dutyDate: z
    .string()
    .datetime()
    .transform(date => new Date(date)),
  shiftType: z.enum(['day', 'night', 'full_day']),
  workArea: z.string().optional(),
  urgencyLevel: z.enum(['low', 'medium', 'high', 'urgent']),
  notes: z.string().optional(),
});

// 查詢排程驗證 schema
const QueryScheduleSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  status: z.enum(['已排班', '值班中', '已完成', '請假', '取消']).optional(),
  shiftType: z.enum(['day', 'night', 'full_day']).optional(),
  urgencyLevel: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  personId: z.string().optional(),
});

const dutyScheduleService = new DutyScheduleService();

/**
 * GET /api/projects/[projectId]/duty-schedules
 * 取得專案的值班排程列表
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
    const validatedQuery = QueryScheduleSchema.parse(queryParams);

    const {
      page,
      limit,
      dateFrom,
      dateTo,
      status,
      shiftType,
      urgencyLevel,
      personId,
    } = validatedQuery;

    // 使用 repository 取得排程資料
    const result = await dutyScheduleService.getSchedules(projectId, {
      page,
      pageSize: limit,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      status,
      shiftType,
      urgencyLevel,
      personId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('取得值班排程列表失敗:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '查詢參數驗證失敗', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '取得值班排程列表失敗',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/duty-schedules
 * 建立新的值班排程
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const body = await request.json();

    // 驗證輸入資料
    const validatedData = CreateScheduleSchema.parse(body);

    // TODO: 從認證中取得建立者ID
    const createdBy = 'system'; // 暫時使用

    // 建立排程資料
    const scheduleData = {
      ...validatedData,
      projectId,
    };

    // 建立排程
    const schedule = await dutyScheduleService.createSchedule(
      scheduleData,
      createdBy
    );

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error('建立值班排程失敗:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '輸入資料驗證失敗', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // 處理業務邏輯錯誤
      if (
        error.message.includes('不存在') ||
        error.message.includes('找不到')
      ) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      if (
        error.message.includes('已有其他值班安排') ||
        error.message.includes('不能為過去的日期')
      ) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '建立值班排程失敗' },
      { status: 500 }
    );
  }
}
