import { NextRequest, NextResponse } from 'next/server';
import { vendorService } from '@/lib/services/vendor-service';
import {
  CreateVendorSchema,
  QueryVendorSchema,
} from '@/lib/validations/vendor-schemas';
import { ZodError } from 'zod';

/**
 * GET /api/vendors
 * 取得廠商列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryParams: any = {};

    // 只處理 schema 中定義的參數
    searchParams.forEach((value, key) => {
      // 處理陣列參數
      if (key === 'types' || key === 'statuses') {
        queryParams[key] = value.split(',').filter(Boolean);
      } else {
        queryParams[key] = value;
      }
    });

    // 驗證查詢參數 - 使用 safeParse 提供更好的錯誤處理
    const validationResult = QueryVendorSchema.safeParse(queryParams);

    if (!validationResult.success) {
      console.error(
        '查詢參數驗證失敗:',
        validationResult.error?.issues || '未知錯誤'
      );
      return NextResponse.json(
        {
          error: '查詢參數驗證失敗',
          details:
            validationResult.error?.issues?.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })) || [],
        },
        { status: 400 }
      );
    }

    // 取得廠商列表
    const result = await vendorService.getVendors(validationResult.data);

    return NextResponse.json(result);
  } catch (error) {
    console.error('取得廠商列表失敗:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '取得廠商列表失敗' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vendors
 * 建立新廠商
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 驗證輸入資料
    const validatedData = CreateVendorSchema.parse(body);

    // 建立廠商
    const vendor = await vendorService.createVendor(validatedData);

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error('建立廠商失敗:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: '輸入資料驗證失敗', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // 處理業務邏輯錯誤
      if (
        error.message.includes('已存在') ||
        error.message.includes('已被使用')
      ) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '建立廠商失敗' },
      { status: 500 }
    );
  }
}
