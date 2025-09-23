/**
 * Oracle版本的單個Project API
 * 支援GET, PUT, DELETE操作
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOracleConnection } from '@/lib/database/oracle-connection'
import { z } from 'zod'

// 專案更新Schema
const ProjectUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed', 'cancelled']).optional(),
  type: z.enum(['construction', 'infrastructure', 'maintenance']).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  budget: z.number().positive().optional(),
  progress: z.number().min(0).max(100).optional(),
  manager_id: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

// 格式化回傳的日期
function formatResponseDate(oracleDate: any): string | null {
  if (!oracleDate) return null
  if (oracleDate instanceof Date) {
    return oracleDate.toISOString()
  }
  return new Date(oracleDate).toISOString()
}

interface RouteParams {
  params: {
    projectId: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId } = params

    const oracle = getOracleConnection()

    const query = `
      SELECT
        id, name, description, status, type, priority,
        start_date, end_date, budget, progress, manager_id,
        metadata, created_at, updated_at
      FROM projects
      WHERE id = :projectId
    `

    const result = await oracle.executeOne(query, { projectId })

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch project')
    }

    if (!result.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
          message: `Project with ID ${projectId} does not exist`
        },
        { status: 404 }
      )
    }

    const row = result.data
    const project = {
      id: row.ID,
      name: row.NAME,
      description: row.DESCRIPTION,
      status: row.STATUS,
      type: row.TYPE,
      priority: row.PRIORITY,
      start_date: formatResponseDate(row.START_DATE),
      end_date: formatResponseDate(row.END_DATE),
      budget: row.BUDGET,
      progress: row.PROGRESS,
      manager_id: row.MANAGER_ID,
      metadata: row.METADATA ? JSON.parse(row.METADATA) : null,
      created_at: formatResponseDate(row.CREATED_AT),
      updated_at: formatResponseDate(row.UPDATED_AT)
    }

    return NextResponse.json({
      success: true,
      data: project,
      message: 'Project retrieved successfully'
    })

  } catch (error) {
    console.error(`GET /api/projects/${params.projectId} error:`, error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to retrieve project'
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId } = params
    const body = await request.json()

    // 驗證更新資料
    const updateData = ProjectUpdateSchema.parse(body)

    const oracle = getOracleConnection()

    // 檢查專案是否存在
    const checkQuery = `SELECT id FROM projects WHERE id = :projectId`
    const checkResult = await oracle.executeOne(checkQuery, { projectId })

    if (!checkResult.success) {
      throw new Error(checkResult.error || 'Failed to check project existence')
    }

    if (!checkResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
          message: `Project with ID ${projectId} does not exist`
        },
        { status: 404 }
      )
    }

    // 建構更新查詢
    const setClauses: string[] = []
    const binds: Record<string, any> = { projectId }

    if (updateData.name !== undefined) {
      setClauses.push('name = :name')
      binds.name = updateData.name
    }

    if (updateData.description !== undefined) {
      setClauses.push('description = :description')
      binds.description = updateData.description
    }

    if (updateData.status !== undefined) {
      setClauses.push('status = :status')
      binds.status = updateData.status
    }

    if (updateData.type !== undefined) {
      setClauses.push('type = :type')
      binds.type = updateData.type
    }

    if (updateData.priority !== undefined) {
      setClauses.push('priority = :priority')
      binds.priority = updateData.priority
    }

    if (updateData.start_date !== undefined) {
      setClauses.push(`start_date = TO_TIMESTAMP(:start_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`)
      binds.start_date = updateData.start_date
    }

    if (updateData.end_date !== undefined) {
      setClauses.push(`end_date = TO_TIMESTAMP(:end_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`)
      binds.end_date = updateData.end_date
    }

    if (updateData.budget !== undefined) {
      setClauses.push('budget = :budget')
      binds.budget = updateData.budget
    }

    if (updateData.progress !== undefined) {
      setClauses.push('progress = :progress')
      binds.progress = updateData.progress
    }

    if (updateData.manager_id !== undefined) {
      setClauses.push('manager_id = :manager_id')
      binds.manager_id = updateData.manager_id
    }

    if (updateData.metadata !== undefined) {
      setClauses.push('metadata = :metadata')
      binds.metadata = updateData.metadata ? JSON.stringify(updateData.metadata) : null
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No update data provided',
          message: 'At least one field must be provided for update'
        },
        { status: 400 }
      )
    }

    // 總是更新 updated_at
    setClauses.push('updated_at = SYSTIMESTAMP')

    const updateQuery = `
      UPDATE projects
      SET ${setClauses.join(', ')}
      WHERE id = :projectId
    `

    const updateResult = await oracle.executeQuery(updateQuery, binds)

    if (!updateResult.success) {
      throw new Error(updateResult.error || 'Failed to update project')
    }

    // 查詢更新後的專案
    const selectQuery = `
      SELECT
        id, name, description, status, type, priority,
        start_date, end_date, budget, progress, manager_id,
        metadata, created_at, updated_at
      FROM projects
      WHERE id = :projectId
    `

    const selectResult = await oracle.executeOne(selectQuery, { projectId })

    if (!selectResult.success || !selectResult.data) {
      throw new Error('Failed to retrieve updated project')
    }

    const row = selectResult.data
    const updatedProject = {
      id: row.ID,
      name: row.NAME,
      description: row.DESCRIPTION,
      status: row.STATUS,
      type: row.TYPE,
      priority: row.PRIORITY,
      start_date: formatResponseDate(row.START_DATE),
      end_date: formatResponseDate(row.END_DATE),
      budget: row.BUDGET,
      progress: row.PROGRESS,
      manager_id: row.MANAGER_ID,
      metadata: row.METADATA ? JSON.parse(row.METADATA) : null,
      created_at: formatResponseDate(row.CREATED_AT),
      updated_at: formatResponseDate(row.UPDATED_AT)
    }

    return NextResponse.json({
      success: true,
      data: updatedProject,
      message: 'Project updated successfully'
    })

  } catch (error) {
    console.error(`PUT /api/projects/${params.projectId} error:`, error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
          message: 'Invalid update data'
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to update project'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId } = params

    const oracle = getOracleConnection()

    // 檢查專案是否存在
    const checkQuery = `SELECT id FROM projects WHERE id = :projectId`
    const checkResult = await oracle.executeOne(checkQuery, { projectId })

    if (!checkResult.success) {
      throw new Error(checkResult.error || 'Failed to check project existence')
    }

    if (!checkResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
          message: `Project with ID ${projectId} does not exist`
        },
        { status: 404 }
      )
    }

    // 軟刪除專案（更新deleted_at欄位）
    const deleteQuery = `
      UPDATE projects
      SET deleted_at = SYSTIMESTAMP
      WHERE id = :projectId AND deleted_at IS NULL
    `

    const deleteResult = await oracle.executeQuery(deleteQuery, { projectId })

    if (!deleteResult.success) {
      throw new Error(deleteResult.error || 'Failed to delete project')
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    })

  } catch (error) {
    console.error(`DELETE /api/projects/${params.projectId} error:`, error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to delete project'
      },
      { status: 500 }
    )
  }
}