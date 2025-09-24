import { NextRequest, NextResponse } from 'next/server';

// Mock 專案成員資料
const mockMembers = [
  {
    id: '1',
    userId: 'user001',
    userName: '王建民',
    email: 'wang.builder@example.com',
    role: 'PROJECT_MANAGER',
    roleName: '專案經理',
    department: '工程部',
    position: '資深專案經理',
    joinDate: '2024-01-01',
    status: 'ACTIVE',
    workload: 85,
    skills: ['專案管理', 'BIM', '工程監造'],
    phone: '0912-345-678',
    avatar: null,
    permissions: ['READ', 'WRITE', 'DELETE'],
  },
  {
    id: '2',
    userId: 'user002',
    userName: '李美玲',
    email: 'lee.designer@example.com',
    role: 'SENIOR_ENGINEER',
    roleName: '資深工程師',
    department: '設計部',
    position: '主任工程師',
    joinDate: '2024-01-15',
    status: 'ACTIVE',
    workload: 92,
    skills: ['AutoCAD', '結構設計', '鋼結構'],
    phone: '0923-456-789',
    avatar: null,
    permissions: ['READ', 'WRITE'],
  },
  {
    id: '3',
    userId: 'user003',
    userName: '陳志豪',
    email: 'chen.coordinator@example.com',
    role: 'COORDINATOR',
    roleName: '協調員',
    department: '工務部',
    position: '專案協調員',
    joinDate: '2024-02-01',
    status: 'ACTIVE',
    workload: 76,
    skills: ['溝通協調', '進度管控', 'MS Project'],
    phone: '0934-567-890',
    avatar: null,
    permissions: ['READ', 'WRITE'],
  },
  {
    id: '4',
    userId: 'user004',
    userName: '張淑雯',
    email: 'zhang.admin@example.com',
    role: 'ADMIN_STAFF',
    roleName: '行政人員',
    department: '行政部',
    position: '專案助理',
    joinDate: '2024-02-15',
    status: 'ACTIVE',
    workload: 65,
    skills: ['文件管理', 'Excel', '會議安排'],
    phone: '0945-678-901',
    avatar: null,
    permissions: ['READ'],
  },
  {
    id: '5',
    userId: 'user005',
    userName: '劉建華',
    email: 'liu.supervisor@example.com',
    role: 'SITE_SUPERVISOR',
    roleName: '工地主任',
    department: '施工部',
    position: '工地主任',
    joinDate: '2024-03-01',
    status: 'ACTIVE',
    workload: 88,
    skills: ['施工管理', '品質控制', '安全管理'],
    phone: '0956-789-012',
    avatar: null,
    permissions: ['READ', 'WRITE'],
  },
  {
    id: '6',
    userId: 'user006',
    userName: '吳雅慧',
    email: 'wu.quality@example.com',
    role: 'QA_ENGINEER',
    roleName: '品保工程師',
    department: '品保部',
    position: '品保工程師',
    joinDate: '2024-03-15',
    status: 'ACTIVE',
    workload: 70,
    skills: ['品質檢驗', 'ISO管理', '報告撰寫'],
    phone: '0967-890-123',
    avatar: null,
    permissions: ['READ', 'WRITE'],
  },
  {
    id: '7',
    userId: 'user007',
    userName: '林俊傑',
    email: 'lin.safety@example.com',
    role: 'SAFETY_OFFICER',
    roleName: '安全官',
    department: '安全部',
    position: '安全工程師',
    joinDate: '2024-04-01',
    status: 'ACTIVE',
    workload: 82,
    skills: ['工安管理', '風險評估', '教育訓練'],
    phone: '0978-901-234',
    avatar: null,
    permissions: ['READ', 'WRITE'],
  },
  {
    id: '8',
    userId: 'user008',
    userName: '黃雅芳',
    email: 'huang.env@example.com',
    role: 'ENVIRONMENTAL_ENGINEER',
    roleName: '環保工程師',
    department: '環保部',
    position: '環保工程師',
    joinDate: '2024-04-15',
    status: 'ACTIVE',
    workload: 68,
    skills: ['環境監測', '法規遵循', '廢棄物管理'],
    phone: '0989-012-345',
    avatar: null,
    permissions: ['READ', 'WRITE'],
  },
  {
    id: '9',
    userId: 'user009',
    userName: '周志明',
    email: 'zhou.contractor@example.com',
    role: 'CONTRACTOR',
    roleName: '承包商',
    department: '外包單位',
    position: '工程承包商',
    joinDate: '2024-05-01',
    status: 'ACTIVE',
    workload: 95,
    skills: ['專業施工', '機具操作', '團隊管理'],
    phone: '0990-123-456',
    avatar: null,
    permissions: ['READ'],
  },
  {
    id: '10',
    userId: 'user010',
    userName: '許雅玲',
    email: 'xu.temp@example.com',
    role: 'TEMP_STAFF',
    roleName: '臨時人員',
    department: '臨時部門',
    position: '臨時助理',
    joinDate: '2024-06-01',
    status: 'INACTIVE',
    workload: 0,
    skills: ['基礎作業', '文件整理'],
    phone: '0901-234-567',
    avatar: null,
    permissions: ['READ'],
  },
];

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');
  const search = searchParams.get('search');
  const role = searchParams.get('role');
  const status = searchParams.get('status');
  const department = searchParams.get('department');

  let filteredMembers = [...mockMembers];

  // 搜索篩選
  if (search) {
    filteredMembers = filteredMembers.filter(
      member =>
        member.userName.includes(search) ||
        member.email.includes(search) ||
        member.department.includes(search) ||
        member.position.includes(search)
    );
  }

  // 角色篩選
  if (role) {
    filteredMembers = filteredMembers.filter(member => member.role === role);
  }

  // 狀態篩選
  if (status) {
    filteredMembers = filteredMembers.filter(
      member => member.status === status
    );
  }

  // 部門篩選
  if (department) {
    filteredMembers = filteredMembers.filter(
      member => member.department === department
    );
  }

  // 分頁處理
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

  const response = {
    success: true,
    data: {
      members: paginatedMembers,
      pagination: {
        currentPage: page,
        pageSize,
        totalItems: filteredMembers.length,
        totalPages: Math.ceil(filteredMembers.length / pageSize),
        hasNextPage: endIndex < filteredMembers.length,
        hasPreviousPage: page > 1,
      },
    },
  };

  return NextResponse.json(response);
}
