import { NextRequest, NextResponse } from 'next/server';
import { projectMemberRepository } from '@/lib/repositories/project-member-repository';
import { z } from 'zod';

// 更新成員權限驗證 schema
const UpdateMemberSchema = z.object({
  roleId: z.string().uuid().optional(),
  canViewProject: z.boolean().optional(),
  canEditProject: z.boolean().optional(),
  canDeleteProject: z.boolean().optional(),
  canManageMembers: z.boolean().optional(),
  canManageWbs: z.boolean().optional(),
  canManageSchedules: z.boolean().optional(),
  canViewReports: z.boolean().optional(),
  canExportData: z.boolean().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/projects/[projectId]/staff/[staffId]
 * 取得成員詳情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; staffId: string } }
) {
  try {
    const { projectId, staffId } = params;

    // 驗證ID格式
    if (
      !projectId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    ) {
      return NextResponse.json({ error: '專案ID格式無效' }, { status: 400 });
    }

    if (
      !staffId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    ) {
      return NextResponse.json({ error: '成員ID格式無效' }, { status: 400 });
    }

    // 取得成員詳情
    const member = await projectMemberRepository.findById(staffId);

    if (!member || member.projectId !== projectId) {
      return NextResponse.json(
        { error: '找不到指定的專案成員' },
        { status: 404 }
      );
    }

    return NextResponse.json(member);
  } catch (error) {
    console.error('取得成員詳情失敗:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '取得成員詳情失敗' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[projectId]/staff/[staffId]
 * 更新成員資料和權限
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string; staffId: string } }
) {
  try {
    const { projectId, staffId } = params;

    // 驗證ID格式
    if (
      !projectId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    ) {
      return NextResponse.json({ error: '專案ID格式無效' }, { status: 400 });
    }

    if (
      !staffId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    ) {
      return NextResponse.json({ error: '成員ID格式無效' }, { status: 400 });
    }

    const body = await request.json();

    // 驗證輸入資料
    const validatedData = UpdateMemberSchema.parse(body);

    // 檢查成員是否存在
    const existingMember = await projectMemberRepository.findById(staffId);

    if (!existingMember || existingMember.projectId !== projectId) {
      return NextResponse.json(
        { error: '找不到指定的專案成員' },
        { status: 404 }
      );
    }

    // 如果是更新權限
    if (Object.keys(validatedData).some(key => key.startsWith('can'))) {
      const permissionData = Object.fromEntries(
        Object.entries(validatedData).filter(([key]) => key.startsWith('can'))
      );

      await projectMemberRepository.updateMemberPermissions(
        staffId,
        permissionData
      );
    }

    // 更新其他資料
    const otherData = Object.fromEntries(
      Object.entries(validatedData).filter(([key]) => !key.startsWith('can'))
    );

    if (Object.keys(otherData).length > 0) {
      await projectMemberRepository.update(staffId, otherData);
    }

    // 取得更新後的成員資料
    const updatedMember = await projectMemberRepository.findById(staffId);

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error('更新成員資料失敗:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '輸入資料驗證失敗', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (
        error.message.includes('不存在') ||
        error.message.includes('找不到')
      ) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新成員資料失敗' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/staff/[staffId]
 * 移除專案成員
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; staffId: string } }
) {
  try {
    const { projectId, staffId } = params;

    // 驗證ID格式
    if (
      !projectId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    ) {
      return NextResponse.json({ error: '專案ID格式無效' }, { status: 400 });
    }

    if (
      !staffId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    ) {
      return NextResponse.json({ error: '成員ID格式無效' }, { status: 400 });
    }

    // 檢查成員是否存在
    const existingMember = await projectMemberRepository.findById(staffId);

    if (!existingMember || existingMember.projectId !== projectId) {
      return NextResponse.json(
        { error: '找不到指定的專案成員' },
        { status: 404 }
      );
    }

    // TODO: 從認證中取得操作者ID
    const removedBy = 'system'; // 暫時使用

    // 移除成員（軟刪除）
    await projectMemberRepository.removeMember(staffId, removedBy);

    return NextResponse.json({ message: '成員已移除' }, { status: 200 });
  } catch (error) {
    console.error('移除專案成員失敗:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('不存在') ||
        error.message.includes('找不到')
      ) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '移除專案成員失敗' },
      { status: 500 }
    );
  }
}
