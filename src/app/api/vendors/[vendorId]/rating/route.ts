import { NextRequest, NextResponse } from 'next/server';
import { vendorService } from '@/lib/services/vendor-service';
import { UpdateRatingSchema } from '@/lib/validations/vendor-schemas';
import { ZodError } from 'zod';

/**
 * PUT /api/vendors/[vendorId]/rating
 * 更新廠商評分
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  try {
    const { vendorId } = params;
    const body = await request.json();

    // 驗證輸入資料
    const validatedData = UpdateRatingSchema.parse(body);

    // 更新評分
    await vendorService.updateVendorRating(vendorId, validatedData);

    return NextResponse.json({ message: '評分已成功更新' });
  } catch (error) {
    console.error('更新廠商評分失敗:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: '輸入資料驗證失敗', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('找不到')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新廠商評分失敗' },
      { status: 500 }
    );
  }
}
