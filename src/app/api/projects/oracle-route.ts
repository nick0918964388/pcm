/**
 * Oracle版本的Projects API
 * 支援Task 9.1的端到端整合測試
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOracleConnection } from '@/lib/database/oracle-connection'
import { z } from 'zod'

// 專案資料Schema
const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed', 'cancelled']).default('planning'),
  type: z.enum(['construction', 'infrastructure', 'maintenance']).default('construction'),
  priority: z.number().int().min(1).max(10).default(5),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  budget: z.number().positive().optional(),
  progress: z.number().min(0).max(100).default(0),
  manager_id: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

const ProjectUpdateSchema = ProjectSchema.partial()

// 查詢參數Schema
const QueryParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.string().optional(),
  start_date_from: z.string().datetime().optional(),
  start_date_to: z.string().datetime().optional()
})

// 格式化Oracle日期
function formatOracleDate(dateString?: string): string | null {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

// 格式化回傳的日期
function formatResponseDate(oracleDate: any): string | null {
  if (!oracleDate) return null
  if (oracleDate instanceof Date) {
    return oracleDate.toISOString()
  }
  return new Date(oracleDate).toISOString()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // 解析查詢參數
    const queryParams = QueryParamsSchema.parse({
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10,
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      start_date_from: searchParams.get('start_date_from') || undefined,
      start_date_to: searchParams.get('start_date_to') || undefined
    })

    const oracle = getOracleConnection()

    // 建構基礎查詢
    let baseQuery = `
      SELECT
        id,
        name,
        description,
        status,
        type,
        priority,
        start_date,
        end_date,
        budget,
        progress,
        manager_id,
        metadata,
        created_at,
        updated_at
      FROM projects
      WHERE 1=1
    `

    const binds: Record<string, any> = {}

    // 加入搜尋條件
    if (queryParams.search) {
      baseQuery += ` AND (UPPER(name) LIKE UPPER(:search) OR UPPER(description) LIKE UPPER(:search))`
      binds.search = `%${queryParams.search}%`
    }

    // 加入狀態篩選
    if (queryParams.status) {
      baseQuery += ` AND status = :status`
      binds.status = queryParams.status
    }

    // 加入日期範圍篩選
    if (queryParams.start_date_from) {
      baseQuery += ` AND start_date >= TO_TIMESTAMP(:start_date_from, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`
      binds.start_date_from = queryParams.start_date_from
    }

    if (queryParams.start_date_to) {
      baseQuery += ` AND start_date <= TO_TIMESTAMP(:start_date_to, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`
      binds.start_date_to = queryParams.start_date_to
    }

    // 計算總數
    const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery})`
    const countResult = await oracle.executeOne<{ total: number }>(countQuery, binds)

    if (!countResult.success) {
      throw new Error(countResult.error || 'Failed to count projects')
    }

    const total = countResult.data?.total || 0

    // 加入分頁 (Oracle OFFSET FETCH語法)
    const offset = (queryParams.page - 1) * queryParams.limit
    const paginatedQuery = `
      ${baseQuery}
      ORDER BY updated_at DESC
      OFFSET ${offset} ROWS FETCH NEXT ${queryParams.limit} ROWS ONLY
    `

    // 執行查詢
    const result = await oracle.executeQuery(paginatedQuery, binds)

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch projects')
    }

    // 格式化資料
    const projects = (result.data || []).map((row: any) => ({
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
    }))

    const response = {
      success: true,
      data: projects,
      meta: {
        page: queryParams.page,
        limit: queryParams.limit,
        total,
        totalPages: Math.ceil(total / queryParams.limit)
      },
      message: 'Projects retrieved successfully'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('GET /api/projects error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to retrieve projects'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 驗證資料
    const projectData = ProjectSchema.parse(body)

    const oracle = getOracleConnection()

    // 準備插入資料
    const insertQuery = `
      INSERT INTO projects (
        id, name, description, status, type, priority,
        start_date, end_date, budget, progress, manager_id,
        metadata, created_at, updated_at
      ) VALUES (
        :id, :name, :description, :status, :type, :priority,
        TO_TIMESTAMP(:start_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        TO_TIMESTAMP(:end_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        :budget, :progress, :manager_id,
        :metadata, SYSTIMESTAMP, SYSTIMESTAMP
      )
    `

    const binds = {
      id: projectData.id,
      name: projectData.name,
      description: projectData.description || null,
      status: projectData.status,
      type: projectData.type,
      priority: projectData.priority,
      start_date: projectData.start_date || null,
      end_date: projectData.end_date || null,
      budget: projectData.budget || null,
      progress: projectData.progress,
      manager_id: projectData.manager_id || null,
      metadata: projectData.metadata ? JSON.stringify(projectData.metadata) : null
    }

    // 執行插入
    const result = await oracle.executeQuery(insertQuery, binds)

    if (!result.success) {
      // 處理Oracle特有錯誤
      const errorMessage = result.error || 'Failed to create project'

      if (errorMessage.includes('ORA-00001')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Project with this ID already exists',
            message: 'Duplicate project ID'
          },
          { status: 409 }
        )
      }

      throw new Error(errorMessage)
    }

    // 查詢新建立的專案
    const selectQuery = `
      SELECT
        id, name, description, status, type, priority,
        start_date, end_date, budget, progress, manager_id,
        metadata, created_at, updated_at
      FROM projects
      WHERE id = :id
    `

    const selectResult = await oracle.executeOne(selectQuery, { id: projectData.id })

    if (!selectResult.success || !selectResult.data) {
      throw new Error('Failed to retrieve created project')
    }

    const row = selectResult.data
    const createdProject = {
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

    return NextResponse.json(
      {
        success: true,
        data: createdProject,
        message: 'Project created successfully'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('POST /api/projects error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
          message: 'Invalid project data'
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to create project'
      },
      { status: 500 }
    )
  }
}