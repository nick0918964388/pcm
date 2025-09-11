import { NextRequest, NextResponse } from 'next/server'

// 模擬專案資料
const mockProjects = [
  {
    id: 'proj001',
    code: 'F20P1',
    name: 'FAB20 Phase1 專案',
    description: '半導體廠建設專案第一期，包含主體建築及基礎設施',
    status: '進行中',
    type: '建築工程',
    progress: 65,
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2025-12-31T00:00:00Z',
    actualStartDate: '2024-01-01T00:00:00Z',
    managerId: 'mgr001',
    managerName: '王建民',
    teamMembers: [],
    totalBudget: 500000000,
    usedBudget: 325000000,
    currency: 'TWD',
    totalMilestones: 5,
    completedMilestones: 3,
    permissions: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-08-31T00:00:00Z',
    tags: ['建築', '半導體'],
    location: '台南科學園區',
    lastAccessDate: '2024-08-30T10:00:00Z',
  },
  {
    id: 'proj002',
    code: 'F21P2',
    name: 'FAB21 Phase2 專案',
    description: '廠房擴建專案，增加生產線設備及配套設施',
    status: '規劃中',
    type: '基礎設施',
    progress: 25,
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2026-05-31T00:00:00Z',
    managerId: 'mgr002',
    managerName: '李美玲',
    teamMembers: [],
    totalBudget: 750000000,
    usedBudget: 187500000,
    currency: 'TWD',
    totalMilestones: 8,
    completedMilestones: 2,
    permissions: [],
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-08-31T00:00:00Z',
    tags: ['擴建', '半導體'],
    location: '新竹科學園區',
    lastAccessDate: '2024-08-29T14:30:00Z',
  },
  {
    id: 'proj003',
    code: 'F22P3',
    name: 'FAB22 Phase3 專案',
    description: '智慧工廠建設專案，整合IoT和AI技術',
    status: '已完成',
    type: '建築工程',
    progress: 100,
    startDate: '2023-03-01T00:00:00Z',
    endDate: '2024-02-29T00:00:00Z',
    actualStartDate: '2023-03-01T00:00:00Z',
    actualEndDate: '2024-02-28T00:00:00Z',
    managerId: 'mgr003',
    managerName: '陳志豪',
    teamMembers: [],
    totalBudget: 300000000,
    usedBudget: 290000000,
    currency: 'TWD',
    totalMilestones: 4,
    completedMilestones: 4,
    permissions: [],
    createdAt: '2023-03-01T00:00:00Z',
    updatedAt: '2024-02-28T00:00:00Z',
    tags: ['智慧工廠', 'IoT', 'AI'],
    location: '高雄科學園區',
    lastAccessDate: '2024-08-28T09:15:00Z',
  }
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // 取得查詢參數
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const sortBy = searchParams.get('sortBy') || 'updatedAt'
  const sortOrder = searchParams.get('sortOrder') || 'desc'
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status')
  
  let filteredProjects = [...mockProjects]
  
  // 搜尋過濾
  if (search) {
    filteredProjects = filteredProjects.filter(project => 
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.code.toLowerCase().includes(search.toLowerCase()) ||
      project.description.toLowerCase().includes(search.toLowerCase())
    )
  }
  
  // 狀態過濾
  if (status) {
    filteredProjects = filteredProjects.filter(project => project.status === status)
  }
  
  // 排序
  filteredProjects.sort((a, b) => {
    let aValue: any = a[sortBy as keyof typeof a]
    let bValue: any = b[sortBy as keyof typeof b]
    
    if (sortBy === 'updatedAt' || sortBy === 'createdAt') {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    }
    
    if (sortOrder === 'desc') {
      return bValue > aValue ? 1 : -1
    } else {
      return aValue > bValue ? 1 : -1
    }
  })
  
  // 分頁
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex)
  
  const response = {
    success: true,
    data: paginatedProjects,
    pagination: {
      page,
      pageSize: limit,
      total: filteredProjects.length,
      totalPages: Math.ceil(filteredProjects.length / limit),
    },
    message: '專案資料取得成功',
    timestamp: new Date().toISOString(),
  }
  
  // 模擬網路延遲
  await new Promise(resolve => setTimeout(resolve, 200))
  
  return NextResponse.json(response)
}