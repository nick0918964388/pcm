import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database/connection'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params
    const { projectId } = resolvedParams

    // 直接查詢Oracle資料庫
    const query = 'SELECT id, name, description, status, created_at, updated_at, is_active FROM projects WHERE id = :1 AND is_active = 1'
    const result = await db.query(query, [projectId])

    if (!result || result.length === 0) {
      return NextResponse.json({
        success: false,
        message: '專案不存在'
      }, { status: 404 })
    }

    const project = result[0]

    // 格式化回傳資料（只包含純數據）
    const formattedProject = {
      id: String(project.ID || project.id || ''),
      name: String(project.NAME || project.name || ''),
      description: String(project.DESCRIPTION || project.description || ''),
      status: String(project.STATUS || project.status || ''),
      created_at: project.CREATED_AT || project.created_at,
      updated_at: project.UPDATED_AT || project.updated_at,
      is_active: project.IS_ACTIVE || project.is_active
    }

    return NextResponse.json({
      success: true,
      data: formattedProject,
      message: '專案資料取得成功'
    })

  } catch (error) {
    console.error('GET /api/projects/[projectId] error:', error)
    return NextResponse.json({
      success: false,
      message: '資料庫操作失敗',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

