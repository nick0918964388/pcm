import { NextRequest, NextResponse } from 'next/server';
import { vendorService } from '@/lib/services/vendor-service';
import { UpdateStatusSchema } from '@/lib/validations/vendor-schemas';
import { ZodError } from 'zod';

/**
 * PUT /api/vendors/[vendorId]/status
 * 更新廠商狀態
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  try {
    const { vendorId } = params;
    const body = await request.json();
    
    // 驗證輸入資料
    const validatedData = UpdateStatusSchema.parse(body);
    
    // 更新狀態
    await vendorService.updateVendorStatus(vendorId, validatedData);
    
    return NextResponse.json({ message: '狀態已成功更新' });
  } catch (error) {
    console.error('更新廠商狀態失敗:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: '輸入資料驗證失敗', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      if (error.message.includes('找不到')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message.includes('無法變更狀態')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新廠商狀態失敗' },
      { status: 500 }
    );
  }
}