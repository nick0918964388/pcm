import { NextRequest, NextResponse } from 'next/server'
import { contactService } from '@/lib/services/contact-service'
import { QueryContactSchema, CreateContactSchema } from '@/lib/validations/vendor-schemas'
import { ZodError } from 'zod'

/**
 * GET /api/vendors/contacts - 取得聯絡人列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryParams: any = {}
    
    // 處理查詢參數
    searchParams.forEach((value, key) => {
      if (key === 'is_primary' || key === 'is_active') {
        queryParams[key] = value === 'true'
      } else {
        queryParams[key] = value || undefined
      }
    })

    const validationResult = QueryContactSchema.safeParse(queryParams)
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: '查詢參數驗證失敗',
        details: validationResult.error?.errors?.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })) || []
      }, { status: 400 })
    }

    const result = await contactService.getContacts(validationResult.data)

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      pagination: result.pagination,
      stats: result.stats
    })

  } catch (error) {
    console.error('取得聯絡人列表失敗:', error)
    
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: '資料驗證失敗',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: '取得聯絡人列表失敗',
      message: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

/**
 * POST /api/vendors/contacts - 建立新聯絡人
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const validationResult = CreateContactSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: '資料驗證失敗',
        details: validationResult.error?.errors?.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })) || []
      }, { status: 400 })
    }

    const result = await contactService.createContact(validationResult.data)

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 201 })

  } catch (error) {
    console.error('建立聯絡人失敗:', error)
    
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: '資料驗證失敗',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: '建立聯絡人失敗',
      message: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}