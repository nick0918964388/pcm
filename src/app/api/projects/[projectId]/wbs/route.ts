import { NextRequest, NextResponse } from 'next/server'

// Mock WBS 資料
const mockWBSItems = [
  {
    id: 'wbs-001',
    code: '1',
    name: 'FAB20 Phase1 專案',
    description: '半導體廠建設專案第一期主體工程',
    type: 'PROJECT',
    level: 0,
    parentId: null,
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    startDate: '2024-01-01',
    endDate: '2025-12-31',
    plannedDuration: 730,
    actualDuration: 456,
    progress: 65,
    budget: 500000000,
    actualCost: 275000000,
    assignedTo: ['user001', 'user002'],
    tags: ['主體工程', '建設專案'],
    children: ['wbs-002', 'wbs-003', 'wbs-004']
  },
  {
    id: 'wbs-002',
    code: '1.1',
    name: '基礎建設',
    description: '地基開挖與基礎結構建設',
    type: 'PHASE',
    level: 1,
    parentId: 'wbs-001',
    status: 'COMPLETED',
    priority: 'HIGH',
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    plannedDuration: 180,
    actualDuration: 175,
    progress: 100,
    budget: 150000000,
    actualCost: 148000000,
    assignedTo: ['user005', 'user007'],
    tags: ['基礎工程', '土木'],
    children: ['wbs-005', 'wbs-006']
  },
  {
    id: 'wbs-003',
    code: '1.2',
    name: '主體結構',
    description: '建築主體結構施工',
    type: 'PHASE',
    level: 1,
    parentId: 'wbs-001',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    startDate: '2024-04-01',
    endDate: '2024-12-31',
    plannedDuration: 270,
    actualDuration: 200,
    progress: 75,
    budget: 200000000,
    actualCost: 125000000,
    assignedTo: ['user002', 'user005'],
    tags: ['結構工程', '鋼結構'],
    children: ['wbs-007', 'wbs-008']
  },
  {
    id: 'wbs-004',
    code: '1.3',
    name: '機電系統',
    description: '機電設備安裝與配置',
    type: 'PHASE',
    level: 1,
    parentId: 'wbs-001',
    status: 'PLANNED',
    priority: 'MEDIUM',
    startDate: '2024-10-01',
    endDate: '2025-08-31',
    plannedDuration: 330,
    actualDuration: 0,
    progress: 0,
    budget: 150000000,
    actualCost: 2000000,
    assignedTo: ['user003', 'user008'],
    tags: ['機電工程', '設備安裝'],
    children: ['wbs-009', 'wbs-010']
  },
  {
    id: 'wbs-005',
    code: '1.1.1',
    name: '地基開挖',
    description: '建築地基開挖作業',
    type: 'WORK_PACKAGE',
    level: 2,
    parentId: 'wbs-002',
    status: 'COMPLETED',
    priority: 'HIGH',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    plannedDuration: 90,
    actualDuration: 88,
    progress: 100,
    budget: 80000000,
    actualCost: 78000000,
    assignedTo: ['user005'],
    tags: ['開挖', '土方工程'],
    children: []
  },
  {
    id: 'wbs-006',
    code: '1.1.2',
    name: '基礎澆置',
    description: '混凝土基礎澆置',
    type: 'WORK_PACKAGE',
    level: 2,
    parentId: 'wbs-002',
    status: 'COMPLETED',
    priority: 'HIGH',
    startDate: '2024-04-01',
    endDate: '2024-06-30',
    plannedDuration: 90,
    actualDuration: 87,
    progress: 100,
    budget: 70000000,
    actualCost: 70000000,
    assignedTo: ['user005', 'user007'],
    tags: ['混凝土', '澆置'],
    children: []
  },
  {
    id: 'wbs-007',
    code: '1.2.1',
    name: '鋼結構安裝',
    description: '主體鋼結構組裝安裝',
    type: 'WORK_PACKAGE',
    level: 2,
    parentId: 'wbs-003',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    startDate: '2024-07-01',
    endDate: '2024-10-31',
    plannedDuration: 120,
    actualDuration: 90,
    progress: 80,
    budget: 120000000,
    actualCost: 75000000,
    assignedTo: ['user002'],
    tags: ['鋼結構', '組裝'],
    children: []
  },
  {
    id: 'wbs-008',
    code: '1.2.2',
    name: '外牆施工',
    description: '建築外牆施工作業',
    type: 'WORK_PACKAGE',
    level: 2,
    parentId: 'wbs-003',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    startDate: '2024-09-01',
    endDate: '2024-12-31',
    plannedDuration: 120,
    actualDuration: 60,
    progress: 60,
    budget: 80000000,
    actualCost: 50000000,
    assignedTo: ['user005'],
    tags: ['外牆', '裝修'],
    children: []
  },
  {
    id: 'wbs-009',
    code: '1.3.1',
    name: '電力系統',
    description: '電力配電系統安裝',
    type: 'WORK_PACKAGE',
    level: 2,
    parentId: 'wbs-004',
    status: 'PLANNED',
    priority: 'MEDIUM',
    startDate: '2024-10-01',
    endDate: '2025-03-31',
    plannedDuration: 180,
    actualDuration: 0,
    progress: 0,
    budget: 80000000,
    actualCost: 1000000,
    assignedTo: ['user008'],
    tags: ['電力', '配電'],
    children: []
  },
  {
    id: 'wbs-010',
    code: '1.3.2',
    name: '空調系統',
    description: '中央空調系統安裝',
    type: 'WORK_PACKAGE',
    level: 2,
    parentId: 'wbs-004',
    status: 'PLANNED',
    priority: 'MEDIUM',
    startDate: '2025-01-01',
    endDate: '2025-08-31',
    plannedDuration: 240,
    actualDuration: 0,
    progress: 0,
    budget: 70000000,
    actualCost: 1000000,
    assignedTo: ['user003'],
    tags: ['空調', 'HVAC'],
    children: []
  }
]

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { searchParams } = new URL(request.url)
  const includeCompleted = searchParams.get('includeCompleted') !== 'false'
  const maxDepth = searchParams.get('maxDepth') ? parseInt(searchParams.get('maxDepth')!) : undefined
  const sortBy = searchParams.get('sortBy') || 'code'
  const sortOrder = searchParams.get('sortOrder') || 'asc'

  let filteredItems = [...mockWBSItems]

  // 過濾已完成項目
  if (!includeCompleted) {
    filteredItems = filteredItems.filter(item => item.status !== 'COMPLETED')
  }

  // 層級限制
  if (maxDepth !== undefined) {
    filteredItems = filteredItems.filter(item => item.level <= maxDepth)
  }

  // 排序
  filteredItems.sort((a, b) => {
    let aValue: any = a[sortBy as keyof typeof a]
    let bValue: any = b[sortBy as keyof typeof b]

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const response = {
    success: true,
    data: filteredItems
  }

  return NextResponse.json(response)
}