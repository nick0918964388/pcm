import { NextRequest, NextResponse } from 'next/server';
import { DutyScheduleService } from '@/lib/services/duty-schedule-service';
import { z } from 'zod';

// 匯出驗證 schema
const ExportQuerySchema = z.object({
  format: z.enum(['json', 'csv', 'excel', 'pdf']).default('json'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  includeStats: z.coerce.boolean().default(false)
});

const dutyScheduleService = new DutyScheduleService();

/**
 * POST /api/projects/[projectId]/duty-schedules/export
 * 匯出專案的值班排程資料
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // 驗證查詢參數
    const validatedQuery = ExportQuerySchema.parse(queryParams);
    
    const { format, dateFrom, dateTo, includeStats } = validatedQuery;
    
    const dateFromObj = dateFrom ? new Date(dateFrom) : undefined;
    const dateToObj = dateTo ? new Date(dateTo) : undefined;
    
    // 生成排程報表
    const report = await dutyScheduleService.generateScheduleReport(
      projectId,
      dateFromObj,
      dateToObj
    );
    
    // 根據格式返回資料
    switch (format) {
      case 'json':
        return NextResponse.json({
          projectId,
          report,
          exportedAt: new Date().toISOString()
        });
        
      case 'csv':
        // 生成 CSV 格式
        const csvHeaders = [
          '排程ID', '專案ID', '值班人員ID', '值班日期', '班別', 
          '工作區域', '狀態', '緊急程度', '簽到時間', '簽退時間', '備註'
        ];
        
        const csvRows = report.schedules.map(schedule => [
          schedule.id,
          schedule.project_id,
          schedule.person_id,
          schedule.duty_date.toISOString().split('T')[0],
          schedule.shift_type,
          schedule.work_area || '',
          schedule.status,
          schedule.urgency_level,
          schedule.check_in_time ? schedule.check_in_time.toISOString() : '',
          schedule.check_out_time ? schedule.check_out_time.toISOString() : '',
          schedule.notes || ''
        ]);
        
        const csvData = [csvHeaders, ...csvRows]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');
        
        return new NextResponse(csvData, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="duty-schedules-${projectId}-${new Date().toISOString().split('T')[0]}.csv"`
          }
        });
        
      case 'excel':
        // 這裡需要實作 Excel 匯出邏輯
        // 可以使用 xlsx 套件
        return NextResponse.json({
          error: 'Excel 格式匯出尚未實作'
        }, { status: 501 });
        
      case 'pdf':
        // 這裡需要實作 PDF 匯出邏輯
        // 可以使用 puppeteer 或 jspdf
        return NextResponse.json({
          error: 'PDF 格式匯出尚未實作'
        }, { status: 501 });
        
      default:
        return NextResponse.json({
          error: '不支援的匯出格式'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('匯出排程資料失敗:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '查詢參數驗證失敗', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '匯出排程資料失敗' },
      { status: 500 }
    );
  }
}