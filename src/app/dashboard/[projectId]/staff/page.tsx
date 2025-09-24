/**
 * @fileoverview 專案人員管理頁面 (簡化版)
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProjectMemberSearch } from '@/components/projects/ProjectMemberSearch';
import { ProjectMemberFilters } from '@/components/projects/ProjectMemberFilters';
import {
  ViewModeToggle,
  type ViewMode,
} from '@/components/projects/ViewModeToggle';
import { ProjectMemberGrid } from '@/components/projects/ProjectMemberGrid';
import { ProjectMemberTable } from '@/components/projects/ProjectMemberTable';
import { CardSkeleton } from '@/components/ui/skeleton';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Phone,
  Briefcase,
  Building,
  Calendar,
  Activity,
  SortAsc,
  SortDesc,
  TrendingUp,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import type { ProjectMemberSearchParams } from '@/types/project';

interface ProjectMember {
  id: string;
  userName: string;
  email: string;
  role: string;
  roleName: string;
  department: string;
  position: string;
  joinDate: string;
  status: string;
  workload: number;
  skills: string[];
  phone: string;
}

// Mock 專案成員資料
const mockMembers: ProjectMember[] = [
  {
    id: '1',
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
  },
  {
    id: '2',
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
  },
  {
    id: '3',
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
  },
  {
    id: '4',
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
  },
  {
    id: '5',
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
  },
  {
    id: '6',
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
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'INACTIVE':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getWorkloadColor = (workload: number) => {
  if (workload >= 90) return 'text-red-600';
  if (workload >= 80) return 'text-yellow-600';
  return 'text-green-600';
};

export default function ProjectStaffPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;

  // 從 URL 初始化篩選參數
  const initialFilters: ProjectMemberSearchParams = useMemo(
    () => ({
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '12'),
      sortBy: searchParams.get('sortBy') || 'joinDate',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      search: searchParams.get('search') || '',
      role: searchParams.get('role') || undefined,
      department: searchParams.get('department') || undefined,
      workStatus: (searchParams.get('workStatus') as any) || undefined,
    }),
    [searchParams]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] =
    useState<ProjectMemberSearchParams>(initialFilters);
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // 篩選和搜索邏輯
  const filteredMembers = useMemo(() => {
    let result = [...mockMembers];

    // 搜索篩選
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        member =>
          member.userName.toLowerCase().includes(query) ||
          member.email.toLowerCase().includes(query) ||
          member.department.toLowerCase().includes(query) ||
          member.position.toLowerCase().includes(query) ||
          member.skills.some(skill => skill.toLowerCase().includes(query))
      );
    }

    // 角色篩選
    if (filters.role) {
      result = result.filter(member => member.role === filters.role);
    }

    // 部門篩選
    if (filters.department) {
      result = result.filter(
        member => member.department === filters.department
      );
    }

    // 工作狀態篩選
    if (filters.workStatus) {
      result = result.filter(member => member.status === filters.workStatus);
    }

    // 技能篩選
    if (filters.skills && filters.skills.length > 0) {
      result = result.filter(member =>
        filters.skills!.some(skill => member.skills.includes(skill))
      );
    }

    // 工作負載範圍篩選
    if (filters.workloadRange) {
      const { min, max } = filters.workloadRange;
      result = result.filter(member => {
        if (min !== undefined && member.workload < min) return false;
        if (max !== undefined && member.workload > max) return false;
        return true;
      });
    }

    // 加入日期範圍篩選
    if (filters.joinDateRange) {
      const { start, end } = filters.joinDateRange;
      result = result.filter(member => {
        const memberDate = new Date(member.joinDate);
        if (start && memberDate < new Date(start)) return false;
        if (end && memberDate > new Date(end)) return false;
        return true;
      });
    }

    // 排序
    result.sort((a, b) => {
      const sortBy = filters.sortBy || 'joinDate';
      const sortOrder = filters.sortOrder || 'desc';

      let aValue: any = a[sortBy as keyof ProjectMember];
      let bValue: any = b[sortBy as keyof ProjectMember];

      // 日期特殊處理
      if (sortBy === 'joinDate') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [searchQuery, filters]);

  // 分頁處理
  const paginatedMembers = useMemo(() => {
    const startIndex = ((filters.page || 1) - 1) * (filters.pageSize || 12);
    const endIndex = startIndex + (filters.pageSize || 12);
    return filteredMembers.slice(startIndex, endIndex);
  }, [filteredMembers, filters.page, filters.pageSize]);

  // 更新 URL 參數
  const updateUrlParams = (newFilters: ProjectMemberSearchParams) => {
    const params = new URLSearchParams();

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          // 處理範圍物件
          if (key === 'workloadRange' && (value.min || value.max)) {
            params.set(`${key}Min`, String(value.min || ''));
            params.set(`${key}Max`, String(value.max || ''));
          } else if (key === 'joinDateRange' && (value.start || value.end)) {
            params.set(`${key}Start`, value.start || '');
            params.set(`${key}End`, value.end || '');
          }
        } else if (Array.isArray(value) && value.length > 0) {
          params.set(key, value.join(','));
        } else {
          params.set(key, String(value));
        }
      }
    });

    router.push(`?${params.toString()}`, { scroll: false });
  };

  // 處理篩選變更
  const handleFiltersChange = (newFilters: ProjectMemberSearchParams) => {
    const updatedFilters = { ...newFilters, page: 1 }; // 重置到第一頁
    setFilters(updatedFilters);
    updateUrlParams(updatedFilters);
  };

  // 處理搜索變更
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const updatedFilters = { ...filters, search: value, page: 1 };
    setFilters(updatedFilters);
    updateUrlParams(updatedFilters);
  };

  // 處理排序變更
  const handleSortChange = (sortBy: string, sortOrder?: 'asc' | 'desc') => {
    const newSortOrder =
      sortOrder ||
      (filters.sortBy === sortBy && filters.sortOrder === 'asc'
        ? 'desc'
        : 'asc');
    const updatedFilters = { ...filters, sortBy, sortOrder: newSortOrder };
    setFilters(updatedFilters);
    updateUrlParams(updatedFilters);
  };

  // 處理成員操作
  const handleMemberAction = (action: string, memberId: string) => {
    console.log(`Action: ${action} for member: ${memberId}`);
    // TODO: 實現具體的操作邏輯
    switch (action) {
      case 'view':
        // 打開成員詳情模態
        break;
      case 'edit':
        // 打開成員編輯模態
        break;
      case 'message':
        // 發送訊息功能
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    // 簡化載入邏輯
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [projectId]);

  if (loading) {
    return (
      <div className='w-full px-4 sm:px-6 lg:px-8 py-6'>
        <div className='space-y-6'>
          <CardSkeleton />
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='w-full px-4 sm:px-6 lg:px-8 py-6'>
        <div className='text-center text-red-600'>
          載入專案人員資料時發生錯誤: {error}
        </div>
      </div>
    );
  }

  return (
    <div className='w-full px-4 sm:px-6 lg:px-8 py-6'>
      <div className='space-y-6'>
        {/* 頁面標題和操作 */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle className='flex items-center text-xl'>
                  <Users className='w-6 h-6 mr-2' />
                  專案成員管理
                </CardTitle>
                <p className='text-gray-600 mt-1'>
                  專案 ID: {projectId} | 顯示 {paginatedMembers.length} /{' '}
                  {filteredMembers.length} 位成員
                  {filteredMembers.length !== mockMembers.length && (
                    <span className='text-blue-600'>
                      （已篩選，共 {mockMembers.length} 位）
                    </span>
                  )}
                </p>
              </div>
              <Button className='flex items-center space-x-2'>
                <UserPlus className='w-4 h-4' />
                <span>新增成員</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* 搜索和篩選區域 */}
            <div className='flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-4 lg:space-y-0'>
              <div className='flex-1'>
                <ProjectMemberSearch
                  projectId={projectId}
                  value={searchQuery}
                  onValueChange={handleSearchChange}
                  placeholder='搜索成員姓名、信箱、部門或技能...'
                  showSuggestions={true}
                />
              </div>
              <div className='flex items-center space-x-2'>
                <ProjectMemberFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  showCounts={false}
                />

                {/* 檢視模式切換 */}
                <ViewModeToggle
                  currentMode={viewMode}
                  onModeChange={setViewMode}
                  showLabels={false}
                />

                {/* 排序控制 */}
                {viewMode === 'card' && (
                  <Select
                    value={`${filters.sortBy}-${filters.sortOrder}`}
                    onValueChange={value => {
                      const [sortBy, sortOrder] = value.split('-');
                      const updatedFilters = {
                        ...filters,
                        sortBy,
                        sortOrder: sortOrder as 'asc' | 'desc',
                      };
                      setFilters(updatedFilters);
                      updateUrlParams(updatedFilters);
                    }}
                  >
                    <SelectTrigger className='w-48'>
                      <SelectValue placeholder='排序方式' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='joinDate-desc'>
                        <div className='flex items-center space-x-2'>
                          <Calendar className='w-4 h-4' />
                          <span>加入時間（新到舊）</span>
                        </div>
                      </SelectItem>
                      <SelectItem value='joinDate-asc'>
                        <div className='flex items-center space-x-2'>
                          <Calendar className='w-4 h-4' />
                          <span>加入時間（舊到新）</span>
                        </div>
                      </SelectItem>
                      <SelectItem value='userName-asc'>
                        <div className='flex items-center space-x-2'>
                          <SortAsc className='w-4 h-4' />
                          <span>姓名（A-Z）</span>
                        </div>
                      </SelectItem>
                      <SelectItem value='userName-desc'>
                        <div className='flex items-center space-x-2'>
                          <SortDesc className='w-4 h-4' />
                          <span>姓名（Z-A）</span>
                        </div>
                      </SelectItem>
                      <SelectItem value='workload-desc'>
                        <div className='flex items-center space-x-2'>
                          <TrendingUp className='w-4 h-4' />
                          <span>工作負載（高到低）</span>
                        </div>
                      </SelectItem>
                      <SelectItem value='workload-asc'>
                        <div className='flex items-center space-x-2'>
                          <TrendingUp className='w-4 h-4' />
                          <span>工作負載（低到高）</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* 快速篩選標籤和批量操作 */}
            <div className='flex items-center justify-between'>
              <div>
                {filteredMembers.length !== mockMembers.length && (
                  <div className='text-sm text-gray-600'>
                    {Object.entries({
                      角色: filters.role,
                      部門: filters.department,
                      狀態: filters.workStatus,
                      搜索: searchQuery,
                    })
                      .filter(([_, value]) => value)
                      .map(([key, value]) => (
                        <Badge
                          key={key}
                          variant='outline'
                          className='mr-2 mb-1'
                        >
                          {key}: {value}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>

              {/* 批量操作工具列 */}
              {selectedMembers.length > 0 && (
                <div className='flex items-center space-x-2 text-sm'>
                  <span className='text-blue-600'>
                    已選擇 {selectedMembers.length} 位成員
                  </span>
                  <Button variant='outline' size='sm'>
                    批量編輯
                  </Button>
                  <Button variant='outline' size='sm'>
                    匯出選中
                  </Button>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setSelectedMembers([])}
                  >
                    清除選擇
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 統計卡片 */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <Card>
            <CardContent className='p-6'>
              <div className='flex items-center'>
                <Users className='w-8 h-8 text-blue-600' />
                <div className='ml-4'>
                  <p className='text-2xl font-bold text-gray-900'>
                    {mockMembers.length}
                  </p>
                  <p className='text-gray-600'>總人數</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className='p-6'>
              <div className='flex items-center'>
                <Activity className='w-8 h-8 text-green-600' />
                <div className='ml-4'>
                  <p className='text-2xl font-bold text-gray-900'>
                    {mockMembers.filter(m => m.status === 'ACTIVE').length}
                  </p>
                  <p className='text-gray-600'>活躍成員</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className='p-6'>
              <div className='flex items-center'>
                <Building className='w-8 h-8 text-purple-600' />
                <div className='ml-4'>
                  <p className='text-2xl font-bold text-gray-900'>
                    {new Set(mockMembers.map(m => m.department)).size}
                  </p>
                  <p className='text-gray-600'>部門數</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className='p-6'>
              <div className='flex items-center'>
                <Briefcase className='w-8 h-8 text-orange-600' />
                <div className='ml-4'>
                  <p className='text-2xl font-bold text-gray-900'>
                    {Math.round(
                      mockMembers.reduce((sum, m) => sum + m.workload, 0) /
                        mockMembers.length
                    )}
                    %
                  </p>
                  <p className='text-gray-600'>平均工作負載</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 成員列表 - 根據檢視模式顯示 */}
        {viewMode === 'card' ? (
          <ProjectMemberGrid
            members={paginatedMembers}
            loading={loading}
            selectedMembers={selectedMembers}
            onSelectionChange={setSelectedMembers}
            onMemberAction={handleMemberAction}
            enableBatchSelection={true}
            columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
          />
        ) : (
          <ProjectMemberTable
            members={paginatedMembers}
            loading={loading}
            selectedMembers={selectedMembers}
            onSelectionChange={setSelectedMembers}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onSortChange={handleSortChange}
            onMemberAction={handleMemberAction}
            enableBatchSelection={true}
          />
        )}

        {/* 分頁控制 */}
        {filteredMembers.length > (filters.pageSize || 12) && (
          <Card>
            <CardContent className='flex items-center justify-between py-4'>
              <div className='flex items-center space-x-2 text-sm text-gray-600'>
                <span>
                  顯示第{' '}
                  {((filters.page || 1) - 1) * (filters.pageSize || 12) + 1} -{' '}
                  {Math.min(
                    (filters.page || 1) * (filters.pageSize || 12),
                    filteredMembers.length
                  )}{' '}
                  項， 共 {filteredMembers.length} 項結果
                </span>
              </div>
              <div className='flex items-center space-x-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    const updatedFilters = {
                      ...filters,
                      page: Math.max(1, (filters.page || 1) - 1),
                    };
                    setFilters(updatedFilters);
                    updateUrlParams(updatedFilters);
                  }}
                  disabled={(filters.page || 1) <= 1}
                >
                  上一頁
                </Button>

                <div className='flex items-center space-x-1'>
                  {(() => {
                    const totalPages = Math.ceil(
                      filteredMembers.length / (filters.pageSize || 12)
                    );
                    const currentPage = filters.page || 1;
                    const pages: number[] = [];

                    // 計算要顯示的頁碼
                    const startPage = Math.max(1, currentPage - 2);
                    const endPage = Math.min(totalPages, currentPage + 2);

                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(i);
                    }

                    return pages.map(pageNum => (
                      <Button
                        key={pageNum}
                        variant={
                          pageNum === currentPage ? 'default' : 'outline'
                        }
                        size='sm'
                        onClick={() => {
                          const updatedFilters = { ...filters, page: pageNum };
                          setFilters(updatedFilters);
                          updateUrlParams(updatedFilters);
                        }}
                        className='w-8 h-8 p-0'
                      >
                        {pageNum}
                      </Button>
                    ));
                  })()}
                </div>

                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    const totalPages = Math.ceil(
                      filteredMembers.length / (filters.pageSize || 12)
                    );
                    const updatedFilters = {
                      ...filters,
                      page: Math.min(totalPages, (filters.page || 1) + 1),
                    };
                    setFilters(updatedFilters);
                    updateUrlParams(updatedFilters);
                  }}
                  disabled={
                    (filters.page || 1) >=
                    Math.ceil(filteredMembers.length / (filters.pageSize || 12))
                  }
                >
                  下一頁
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {filteredMembers.length === 0 && (
          <Card>
            <CardContent className='flex items-center justify-center py-12'>
              <div className='text-center text-gray-500'>
                <Users className='w-12 h-12 mx-auto mb-4 text-gray-300' />
                <p>沒有找到符合條件的專案成員</p>
                {(searchQuery ||
                  filters.role ||
                  filters.department ||
                  filters.workStatus) && (
                  <p className='text-xs mt-2'>嘗試調整搜索條件或清除篩選器</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
