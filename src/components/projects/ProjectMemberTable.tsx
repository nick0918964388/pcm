/**
 * @fileoverview 專案成員表格檢視組件
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Mail,
  Phone,
  Building,
  Calendar,
  MoreHorizontal,
  Edit,
  Eye,
  MessageSquare,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

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

interface ProjectMemberTableProps {
  /** 成員列表資料 */
  members: ProjectMember[];
  /** 載入中狀態 */
  loading?: boolean;
  /** 選中的成員ID列表 */
  selectedMembers?: string[];
  /** 成員選擇變更回調 */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** 排序配置 */
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  /** 排序變更回調 */
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  /** 成員操作回調 */
  onMemberAction?: (action: string, memberId: string) => void;
  /** 是否支援批量選擇 */
  enableBatchSelection?: boolean;
}

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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * 專案成員表格檢視組件
 */
export function ProjectMemberTable({
  members,
  loading = false,
  selectedMembers = [],
  onSelectionChange,
  sortBy = 'joinDate',
  sortOrder = 'desc',
  onSortChange,
  onMemberAction,
  enableBatchSelection = true,
}: ProjectMemberTableProps) {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  // 處理全選
  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(checked ? members.map(m => m.id) : []);
    }
  };

  // 處理單個成員選擇
  const handleSelectMember = (memberId: string, checked: boolean) => {
    if (onSelectionChange) {
      const newSelection = checked
        ? [...selectedMembers, memberId]
        : selectedMembers.filter(id => id !== memberId);
      onSelectionChange(newSelection);
    }
  };

  // 處理排序
  const handleSort = (column: string) => {
    if (onSortChange) {
      const newSortOrder =
        sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
      onSortChange(column, newSortOrder);
    }
  };

  // 排序指示器組件
  const SortIndicator = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className='w-4 h-4 ml-1' />
    ) : (
      <ChevronDown className='w-4 h-4 ml-1' />
    );
  };

  if (loading) {
    return (
      <div className='border rounded-lg'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead colSpan={7} className='text-center py-8'>
                載入成員資料中...
              </TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className='border rounded-lg'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead colSpan={7} className='text-center py-8 text-gray-500'>
                沒有找到符合條件的專案成員
              </TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      </div>
    );
  }

  const isAllSelected = selectedMembers.length === members.length;
  const isIndeterminate =
    selectedMembers.length > 0 && selectedMembers.length < members.length;

  return (
    <div className='border rounded-lg'>
      <Table>
        <TableHeader>
          <TableRow>
            {enableBatchSelection && (
              <TableHead className='w-12'>
                <Checkbox
                  checked={isAllSelected}
                  ref={el => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}

            <TableHead
              className='cursor-pointer hover:bg-gray-50'
              onClick={() => handleSort('userName')}
            >
              <div className='flex items-center'>
                姓名
                <SortIndicator column='userName' />
              </div>
            </TableHead>

            <TableHead
              className='cursor-pointer hover:bg-gray-50'
              onClick={() => handleSort('department')}
            >
              <div className='flex items-center'>
                部門/職位
                <SortIndicator column='department' />
              </div>
            </TableHead>

            <TableHead>聯絡資訊</TableHead>

            <TableHead
              className='cursor-pointer hover:bg-gray-50'
              onClick={() => handleSort('workload')}
            >
              <div className='flex items-center'>
                工作負載
                <SortIndicator column='workload' />
              </div>
            </TableHead>

            <TableHead
              className='cursor-pointer hover:bg-gray-50'
              onClick={() => handleSort('joinDate')}
            >
              <div className='flex items-center'>
                加入時間
                <SortIndicator column='joinDate' />
              </div>
            </TableHead>

            <TableHead>狀態</TableHead>
            <TableHead className='w-16'>操作</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {members.map(member => (
            <React.Fragment key={member.id}>
              <TableRow className='hover:bg-gray-50'>
                {enableBatchSelection && (
                  <TableCell>
                    <Checkbox
                      checked={selectedMembers.includes(member.id)}
                      onCheckedChange={checked =>
                        handleSelectMember(member.id, checked as boolean)
                      }
                    />
                  </TableCell>
                )}

                <TableCell>
                  <div>
                    <div className='font-medium text-gray-900'>
                      {member.userName}
                    </div>
                    <div className='text-sm text-gray-500'>
                      {member.roleName}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div>
                    <div className='flex items-center text-sm text-gray-900'>
                      <Building className='w-4 h-4 mr-1' />
                      {member.department}
                    </div>
                    <div className='text-sm text-gray-500 mt-1'>
                      {member.position}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className='space-y-1'>
                    <div className='flex items-center text-sm text-gray-600'>
                      <Mail className='w-4 h-4 mr-1' />
                      <span className='truncate max-w-48'>{member.email}</span>
                    </div>
                    <div className='flex items-center text-sm text-gray-600'>
                      <Phone className='w-4 h-4 mr-1' />
                      <span>{member.phone}</span>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <span
                        className={`font-medium ${getWorkloadColor(member.workload)}`}
                      >
                        {member.workload}%
                      </span>
                    </div>
                    <div className='w-full bg-gray-200 rounded-full h-2'>
                      <div
                        className={`h-2 rounded-full transition-all ${
                          member.workload >= 90
                            ? 'bg-red-600'
                            : member.workload >= 80
                              ? 'bg-yellow-600'
                              : 'bg-green-600'
                        }`}
                        style={{ width: `${member.workload}%` }}
                      />
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className='flex items-center text-sm text-gray-600'>
                    <Calendar className='w-4 h-4 mr-1' />
                    {formatDate(member.joinDate)}
                  </div>
                </TableCell>

                <TableCell>
                  <Badge
                    variant='outline'
                    className={`${getStatusColor(member.status)} text-xs`}
                  >
                    {member.status === 'ACTIVE' ? '活躍' : '非活躍'}
                  </Badge>
                </TableCell>

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                        <MoreHorizontal className='h-4 w-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuLabel>操作</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => onMemberAction?.('view', member.id)}
                        className='cursor-pointer'
                      >
                        <Eye className='mr-2 h-4 w-4' />
                        查看詳情
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onMemberAction?.('edit', member.id)}
                        className='cursor-pointer'
                      >
                        <Edit className='mr-2 h-4 w-4' />
                        編輯資料
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onMemberAction?.('message', member.id)}
                        className='cursor-pointer'
                      >
                        <MessageSquare className='mr-2 h-4 w-4' />
                        發送訊息
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>

              {/* 擴展行 - 顯示技能標籤 */}
              {expandedMember === member.id && (
                <TableRow>
                  <TableCell
                    colSpan={enableBatchSelection ? 8 : 7}
                    className='bg-gray-50'
                  >
                    <div className='py-2'>
                      <div className='text-sm font-medium text-gray-700 mb-2'>
                        專業技能
                      </div>
                      <div className='flex flex-wrap gap-1'>
                        {member.skills.map((skill, index) => (
                          <Badge
                            key={index}
                            variant='secondary'
                            className='text-xs'
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default ProjectMemberTable;
