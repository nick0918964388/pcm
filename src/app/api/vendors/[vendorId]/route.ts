import { NextRequest, NextResponse } from 'next/server';
import { vendorService } from '@/lib/services/vendor-service';
import { UpdateVendorSchema } from '@/lib/validations/vendor-schemas';
import { ZodError } from 'zod';

/**
 * GET /api/vendors/[vendorId]
 * 取得單一廠商詳情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  try {
    const { vendorId } = await params;
    
    // 取得廠商詳情
    const vendor = await vendorService.getVendorById(vendorId);
    
    return NextResponse.json(vendor);
  } catch (error) {
    console.error('取得廠商詳情失敗:', error);
    
    if (error instanceof Error && error.message.includes('找不到')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '取得廠商詳情失敗' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/vendors/[vendorId]
 * 更新廠商資料
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  try {
    const { vendorId } = await params;
    const body = await request.json();
    
    // 驗證輸入資料
    const validatedData = UpdateVendorSchema.parse(body);
    
    // 更新廠商
    const vendor = await vendorService.updateVendor(vendorId, validatedData);
    
    return NextResponse.json(vendor);
  } catch (error) {
    console.error('更新廠商失敗:', error);
    
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
      
      if (error.message.includes('已存在') || error.message.includes('已被使用')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新廠商失敗' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/vendors/[vendorId]
 * 刪除廠商
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  try {
    const { vendorId } = await params;
    
    // 刪除廠商
    await vendorService.deleteVendor(vendorId);
    
    return NextResponse.json({ message: '廠商已成功刪除' });
  } catch (error) {
    console.error('刪除廠商失敗:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('找不到')) {
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
      { error: error instanceof Error ? error.message : '刪除廠商失敗' },
      { status: 500 }
    );
  }
}