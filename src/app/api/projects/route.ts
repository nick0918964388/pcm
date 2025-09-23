import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database/connection'
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

// 查詢參數Schema
const QueryParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.string().optional(),
  start_date_from: z.string().datetime().optional(),
  start_date_to: z.string().datetime().optional()
})

// 格式化回傳的日期
function formatResponseDate(oracleDate: any): string | null {
  if (!oracleDate) return null
  if (oracleDate instanceof Date) {
    return oracleDate.toISOString()
  }
  return new Date(oracleDate).toISOString()
}


export async function GET(request: NextRequest) {
  return await getProjectsFromOracle(request)
}

async function getProjectsFromOracle(request: NextRequest) {
  try {
    // 簡單查詢，不使用複雜參數
    const query = 'SELECT id, name, description, status, created_at, updated_at, is_active FROM projects WHERE is_active = 1 ORDER BY updated_at DESC'
    const result = await db.query(query)

    // 格式化資料
    const projects = result.map((row: any) => ({
      id: String(row.ID || row.id || ''),
      name: String(row.NAME || row.name || ''),
      description: String(row.DESCRIPTION || row.description || ''),
      status: String(row.STATUS || row.status || ''),
      created_at: formatResponseDate(row.CREATED_AT || row.created_at),
      updated_at: formatResponseDate(row.UPDATED_AT || row.updated_at)
    }))

    const response = {
      success: true,
      data: projects,
      pagination: {
        page: 1,
        pageSize: projects.length,
        total: projects.length,
        totalPages: 1
      },
      message: '專案資料取得成功'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('GET /api/projects error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      message: 'Failed to retrieve projects'
    }, { status: 500 })
  }
}


export async function POST(request: NextRequest) {
  return await createProjectInOracle(request)
}

async function createProjectInOracle(request: NextRequest) {
  try {
    const body = await request.json()

    // 簡化插入資料
    const insertQuery = `
      INSERT INTO projects (id, name, description, status, created_at, updated_at, is_active)
      VALUES (:1, :2, :3, :4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
    `

    await db.query(insertQuery, [
      body.id,
      body.name,
      body.description || '',
      body.status || 'active'
    ])

    // 查詢新建立的專案
    const result = await db.queryOne('SELECT * FROM projects WHERE id = :1', [body.id])

    if (!result) {
      throw new Error('Failed to retrieve created project')
    }

    const createdProject = {
      id: result.ID || result.id,
      name: result.NAME || result.name,
      description: result.DESCRIPTION || result.description,
      status: result.STATUS || result.status,
      created_at: formatResponseDate(result.CREATED_AT || result.created_at),
      updated_at: formatResponseDate(result.UPDATED_AT || result.updated_at)
    }

    return NextResponse.json({
      success: true,
      data: createdProject,
      message: 'Project created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('POST /api/projects error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      message: 'Failed to create project'
    }, { status: 500 })
  }
}