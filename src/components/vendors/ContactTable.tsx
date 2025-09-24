'use client';

import { useMemo } from 'react';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Eye, Edit, Mail, Phone, Star, User, Users } from 'lucide-react';
import {
  Vendor,
  VendorContact,
  ContactStatus,
  ContactPagination,
  ContactSort,
} from '@/types/vendor';
import { cn } from '@/lib/utils';

interface ContactTableProps {
  contacts: VendorContact[];
  vendor?: Vendor | null;
  loading?: boolean;
  pagination?: ContactPagination;
  onPaginationChange?: (page: number, pageSize: number) => void;
  onSort?: (sort: ContactSort) => void;
  onViewContact?: (contact: VendorContact) => void;
  onEditContact?: (contact: VendorContact) => void;
  className?: string;
}

export function ContactTable({
  contacts,
  vendor,
  loading = false,
  pagination,
  onPaginationChange,
  onSort,
  onViewContact,
  onEditContact,
  className,
}: ContactTableProps) {
  const columns: Column<VendorContact>[] = useMemo(
    () => [
      {
        key: 'id',
        title: 'No',
        width: '80px',
        align: 'center',
        render: (_, __, index) => {
          const baseIndex = pagination
            ? (pagination.page - 1) * pagination.pageSize
            : 0;
          return (
            <span className='font-mono text-sm'>{baseIndex + index + 1}</span>
          );
        },
      },
      {
        key: 'photo',
        title: '相片',
        width: '80px',
        align: 'center',
        render: (_, record: VendorContact) => (
          <div className='flex items-center justify-center'>
            <Avatar className='h-10 w-10'>
              <AvatarImage src={record.photoUrl} alt={record.name} />
              <AvatarFallback className='text-xs'>
                {record.name?.substring(0, 2) || 'NA'}
              </AvatarFallback>
            </Avatar>
          </div>
        ),
      },
      {
        key: 'name',
        title: '姓名',
        width: '120px',
        sortable: true,
        render: (value: string, record: VendorContact) => (
          <div className='flex items-center gap-2'>
            <div>
              <div className='font-medium text-sm flex items-center gap-1'>
                {value}
                {record.isPrimary && (
                  <Star
                    className='h-3 w-3 text-yellow-500 fill-current'
                    title='主要聯絡人'
                  />
                )}
              </div>
              {record.position && (
                <div className='text-xs text-gray-500'>{record.position}</div>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'department',
        title: '部門',
        width: '120px',
        sortable: true,
        render: (value: string) =>
          value ? (
            <span className='text-sm'>{value}</span>
          ) : (
            <span className='text-gray-400 text-sm'>-</span>
          ),
      },
      {
        key: 'phone',
        title: '手機',
        width: '130px',
        render: (value: string) => {
          if (!value) {
            return <span className='text-gray-400 text-sm'>-</span>;
          }
          return (
            <div className='flex items-center gap-1'>
              <Phone className='h-3 w-3 text-gray-400' />
              <a
                href={`tel:${value}`}
                className='font-mono text-sm text-blue-600 hover:text-blue-800 hover:underline'
                onClick={e => e.stopPropagation()}
              >
                {value}
              </a>
            </div>
          );
        },
      },
      {
        key: 'extension',
        title: '分機',
        width: '80px',
        render: (value: string) =>
          value ? (
            <span className='font-mono text-sm'>{value}</span>
          ) : (
            <span className='text-gray-400 text-sm'>-</span>
          ),
      },
      {
        key: 'mvpn',
        title: 'MVPN',
        width: '120px',
        render: (value: string) =>
          value ? (
            <span className='font-mono text-sm'>{value}</span>
          ) : (
            <span className='text-gray-400 text-sm'>-</span>
          ),
      },
      {
        key: 'email',
        title: 'Email',
        width: '200px',
        render: (value: string) => {
          if (!value) {
            return <span className='text-gray-400 text-sm'>-</span>;
          }
          return (
            <div className='flex items-center gap-1'>
              <Mail className='h-3 w-3 text-gray-400' />
              <a
                href={`mailto:${value}`}
                className='text-blue-600 hover:text-blue-800 text-sm underline truncate max-w-[160px]'
                onClick={e => e.stopPropagation()}
                title={value}
              >
                {value}
              </a>
            </div>
          );
        },
      },
      {
        key: 'supervisor',
        title: '主管',
        width: '100px',
        render: (value: string) =>
          value ? (
            <span className='text-sm'>{value}</span>
          ) : (
            <span className='text-gray-400 text-sm'>-</span>
          ),
      },
      {
        key: 'workSupervisor',
        title: '上班主管',
        width: '100px',
        render: (value: string) =>
          value ? (
            <span className='text-sm'>{value}</span>
          ) : (
            <span className='text-gray-400 text-sm'>-</span>
          ),
      },
      {
        key: 'status',
        title: '狀態',
        width: '80px',
        sortable: true,
        render: (value: ContactStatus, record: VendorContact) => (
          <div className='flex flex-col items-center gap-1'>
            <Badge
              variant={value === ContactStatus.ACTIVE ? 'default' : 'secondary'}
              className={cn(
                'text-xs',
                value === ContactStatus.ACTIVE && 'bg-green-100 text-green-800',
                value === ContactStatus.INACTIVE && 'bg-gray-100 text-gray-800'
              )}
            >
              {value}
            </Badge>
            {!record.isActive && (
              <Badge variant='destructive' className='text-xs'>
                停用
              </Badge>
            )}
          </div>
        ),
      },
      {
        key: 'isPrimary',
        title: '主要',
        width: '60px',
        align: 'center',
        render: (value: boolean) => (
          <div className='flex items-center justify-center'>
            {value ? (
              <Star
                className='h-4 w-4 text-yellow-500 fill-current'
                title='主要聯絡人'
              />
            ) : (
              <span className='text-gray-400'>-</span>
            )}
          </div>
        ),
      },
      {
        key: 'actions',
        title: '操作',
        width: '120px',
        align: 'center',
        render: (_, record: VendorContact) => (
          <div className='flex items-center justify-center gap-1'>
            <Button
              variant='ghost'
              size='sm'
              onClick={e => {
                e.stopPropagation();
                onViewContact?.(record);
              }}
              className='h-8 w-8 p-0'
              title='查看詳情'
            >
              <Eye className='h-4 w-4' />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={e => {
                e.stopPropagation();
                onEditContact?.(record);
              }}
              className='h-8 w-8 p-0'
              title='編輯'
            >
              <Edit className='h-4 w-4' />
            </Button>
          </div>
        ),
      },
    ],
    [pagination, onViewContact, onEditContact]
  );

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    if (onSort) {
      onSort({
        field: key as any,
        direction,
      });
    }
  };

  const handlePagination = (page: number, pageSize: number) => {
    onPaginationChange?.(page, pageSize);
  };

  const handleRowClick = (contact: VendorContact) => {
    onViewContact?.(contact);
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-lg font-medium flex items-center gap-2'>
            <Users className='h-5 w-5' />
            聯絡人列表
            {vendor && (
              <Badge variant='outline' className='ml-2'>
                {vendor.name}
              </Badge>
            )}
            {pagination && (
              <span className='text-sm font-normal text-gray-500'>
                (共 {pagination.total} 筆資料)
              </span>
            )}
          </CardTitle>
          <div className='text-sm text-gray-500'>點擊聯絡人查看詳細資料</div>
        </div>
      </CardHeader>

      <CardContent className='p-0'>
        <DataTable
          columns={columns}
          data={contacts}
          loading={loading}
          onSort={handleSort}
          onRowClick={handleRowClick}
          pagination={
            pagination && {
              current: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: handlePagination,
            }
          }
          emptyText='沒有找到符合條件的聯絡人資料'
          className='rounded-none'
          rowClassName={record =>
            cn(
              'hover:bg-blue-50 cursor-pointer transition-colors',
              record.isPrimary && 'bg-yellow-50 hover:bg-yellow-100'
            )
          }
        />
      </CardContent>
    </Card>
  );
}
