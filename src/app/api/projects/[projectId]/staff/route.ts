import { NextRequest, NextResponse } from 'next/server';
import { projectMemberRepository } from '@/lib/repositories/project-member-repository';
import { z } from 'zod';

// 新增成員驗證 schema
const AddMemberSchema = z.object({
  userId: z.string().uuid('用戶ID格式無效'),
  roleId: z.string().uuid('角色ID格式無效'),
  canViewProject: z.boolean().default(true),
  canEditProject: z.boolean().default(false),
  canDeleteProject: z.boolean().default(false),
  canManageMembers: z.boolean().default(false),
  canManageWbs: z.boolean().default(false),
  canManageSchedules: z.boolean().default(false),
  canViewReports: z.boolean().default(true),
  canExportData: z.boolean().default(false),
  notes: z.string().optional()
});

// 查詢參數驗證 schema
const QueryMembersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  roleId: z.string().uuid().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  includeLeft: z.coerce.boolean().default(false),
  permissions: z.string().optional().transform(val => 
    val ? val.split(',').map(p => p.trim()) : undefined
  )
});

/**
 * GET /api/projects/[projectId]/staff
 * 取得專案人員列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    
    // 驗證專案ID格式
    if (!projectId || !projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { error: '專案ID格式無效' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // 驗證查詢參數
    const validatedQuery = QueryMembersSchema.parse(queryParams);
    
    // 查詢專案成員
    const result = await projectMemberRepository.findProjectMembers(projectId, {
      page: validatedQuery.page,
      pageSize: validatedQuery.limit,
      search: validatedQuery.search,
      roleId: validatedQuery.roleId,
      department: validatedQuery.department,
      position: validatedQuery.position,
      includeLeft: validatedQuery.includeLeft,
      permissions: validatedQuery.permissions
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('取得專案人員列表失敗:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '查詢參數驗證失敗', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '取得專案人員列表失敗' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/staff
 * 新增專案成員
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    
    // 驗證專案ID格式
    if (!projectId || !projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { error: '專案ID格式無效' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // 驗證輸入資料
    const validatedData = AddMemberSchema.parse(body);
    
    // 檢查用戶是否已經是專案成員
    const isAlreadyMember = await projectMemberRepository.isProjectMember(projectId, validatedData.userId);
    if (isAlreadyMember) {
      return NextResponse.json(
        { error: '用戶已經是專案成員' },
        { status: 409 }
      );
    }
    
    // 建立成員資料
    const memberData = {
      ...validatedData,
      projectId,
      joinedAt: new Date(),
      isActive: true
    };
    
    // 新增專案成員
    const member = await projectMemberRepository.create(memberData);
    
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('新增專案成員失敗:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '輸入資料驗證失敗', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      // 處理業務邏輯錯誤
      if (error.message.includes('不存在') || error.message.includes('找不到')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message.includes('已存在') || error.message.includes('重複')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '新增專案成員失敗' },
      { status: 500 }
    );
  }
}