'use client';

import { useMemo } from 'react';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Eye,
  Edit,
  Phone,
  Mail,
  Clock,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
  DutySchedule,
  DutySchedulePagination,
  DutyScheduleSort,
  ShiftType,
  DutyStatus,
  WorkArea,
  DUTY_STATUS_COLORS,
  SHIFT_TYPE_ICONS,
  WORK_AREA_ICONS,
  formatShiftTime,
} from '@/types/dutySchedule';
import { cn } from '@/lib/utils';

interface DutyScheduleTableProps {
  schedules: DutySchedule[];
  loading?: boolean;
  pagination?: DutySchedulePagination;
  onPaginationChange?: (page: number, pageSize: number) => void;
  onSort?: (sort: DutyScheduleSort) => void;
  onViewSchedule?: (schedule: DutySchedule) => void;
  onCallPerson?: (schedule: DutySchedule) => void;
  onEditSchedule?: (schedule: DutySchedule) => void;
  className?: string;
}

export function DutyScheduleTable({
  schedules,
  loading = false,
  pagination,
  onPaginationChange,
  onSort,
  onViewSchedule,
  onCallPerson,
  onEditSchedule,
  className,
}: DutyScheduleTableProps) {
  const columns: Column<DutySchedule>[] = useMemo(
    () => [
      {
        key: 'id',
        title: 'No',
        width: '60px',
        align: 'center',
        render: (_, __, index) => {
          const baseIndex = pagination
            ? (pagination.page - 1) * pagination.pageSize
            : 0;
          return (
            <span className='font-mono text-xs'>{baseIndex + index + 1}</span>
          );
        },
      },
      {
        key: 'dutyDate',
        title: '值班日期',
        width: '100px',
        sortable: true,
        render: (value: Date) => (
          <div className='text-sm'>
            <div className='font-medium'>
              {format(new Date(value), 'MM/dd', { locale: zhTW })}
            </div>
            <div className='text-xs text-gray-500'>
              {format(new Date(value), 'E', { locale: zhTW })}
            </div>
          </div>
        ),
      },
      {
        key: 'shiftType',
        title: '班別',
        width: '100px',
        sortable: true,
        render: (value: ShiftType, record: DutySchedule) => (
          <div className='flex items-center gap-2'>
            <span className='text-lg'>{SHIFT_TYPE_ICONS[value]}</span>
            <div className='flex flex-col'>
              <span className='text-sm font-medium'>{value}</span>
              <span className='text-xs text-gray-500'>
                {formatShiftTime(record.shiftTime)}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'person.vendorName',
        title: '廠商名稱',
        width: '140px',
        sortable: true,
        render: (_, record: DutySchedule) => (
          <div className='space-y-1'>
            <div className='font-medium text-sm'>
              {record.person.vendorName}
            </div>
            <div className='text-xs text-gray-500'>
              {record.person.vendorType}
            </div>
          </div>
        ),
      },
      {
        key: 'person.name',
        title: '值班人員',
        width: '120px',
        sortable: true,
        render: (_, record: DutySchedule) => (
          <div className='space-y-1'>
            <div className='font-medium text-sm'>{record.person.name}</div>
            <div className='text-xs text-gray-600'>
              {record.person.position}
            </div>
            {record.person.isPrimary && (
              <Badge variant='secondary' className='text-xs'>
                主聯絡人
              </Badge>
            )}
          </div>
        ),
      },
      {
        key: 'person.mobile',
        title: '手機',
        width: '120px',
        render: (_, record: DutySchedule) => (
          <div className='flex items-center gap-1'>
            <Phone className='h-3 w-3 text-gray-400' />
            <span className='font-mono text-sm'>{record.person.mobile}</span>
          </div>
        ),
      },
      {
        key: 'person.extension',
        title: '分機',
        width: '70px',
        render: (_, record: DutySchedule) => {
          if (!record.person.extension) {
            return <span className='text-gray-400 text-sm'>-</span>;
          }
          return (
            <span className='font-mono text-sm'>{record.person.extension}</span>
          );
        },
      },
      {
        key: 'person.mvpn',
        title: 'MVPN',
        width: '100px',
        render: (_, record: DutySchedule) => {
          if (!record.person.mvpn) {
            return <span className='text-gray-400 text-sm'>-</span>;
          }
          return (
            <span className='font-mono text-sm'>{record.person.mvpn}</span>
          );
        },
      },
      {
        key: 'person.email',
        title: 'Email',
        width: '180px',
        render: (_, record: DutySchedule) => (
          <div className='flex items-center gap-1'>
            <Mail className='h-3 w-3 text-gray-400' />
            <a
              href={`mailto:${record.person.email}`}
              className='text-blue-600 hover:text-blue-800 text-sm underline truncate block max-w-[140px]'
              onClick={e => e.stopPropagation()}
              title={record.person.email}
            >
              {record.person.email}
            </a>
          </div>
        ),
      },
      {
        key: 'status',
        title: '狀態',
        width: '90px',
        sortable: true,
        render: (value: DutyStatus) => (
          <Badge
            style={{ backgroundColor: DUTY_STATUS_COLORS[value] }}
            className='text-white text-xs'
          >
            {value}
          </Badge>
        ),
      },
      {
        key: 'workArea',
        title: '工作區域',
        width: '100px',
        sortable: true,
        render: (value: WorkArea, record: DutySchedule) => (
          <div className='space-y-1'>
            <div className='flex items-center gap-1'>
              <span className='text-sm'>{WORK_AREA_ICONS[value]}</span>
              <span className='text-sm'>{value}</span>
            </div>
            {record.workLocation && (
              <div
                className='text-xs text-gray-500 truncate'
                title={record.workLocation}
              >
                {record.workLocation}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'urgencyLevel',
        title: '緊急程度',
        width: '80px',
        render: (_, record: DutySchedule) => {
          if (!record.urgencyLevel) {
            return <span className='text-gray-400 text-sm'>-</span>;
          }

          const urgencyColors = {
            低: 'bg-gray-100 text-gray-800',
            中: 'bg-yellow-100 text-yellow-800',
            高: 'bg-orange-100 text-orange-800',
            緊急: 'bg-red-100 text-red-800',
          };

          return (
            <Badge
              variant='secondary'
              className={cn('text-xs', urgencyColors[record.urgencyLevel])}
            >
              {record.urgencyLevel}
            </Badge>
          );
        },
      },
      {
        key: 'replacement',
        title: '代班',
        width: '80px',
        render: (_, record: DutySchedule) => {
          if (!record.replacement) {
            return <span className='text-gray-400 text-sm'>-</span>;
          }
          return (
            <Badge variant='outline' className='text-xs'>
              代班
            </Badge>
          );
        },
      },
      {
        key: 'notes',
        title: '備註',
        width: '120px',
        render: (_, record: DutySchedule) => {
          const notes = record.notes || record.specialInstructions;
          if (!notes) {
            return <span className='text-gray-400 text-sm'>-</span>;
          }
          return (
            <span className='text-sm truncate block' title={notes}>
              {notes}
            </span>
          );
        },
      },
      {
        key: 'actions',
        title: '操作',
        width: '120px',
        align: 'center',
        render: (_, record: DutySchedule) => (
          <div className='flex items-center justify-center gap-1'>
            <Button
              variant='ghost'
              size='sm'
              onClick={e => {
                e.stopPropagation();
                onCallPerson?.(record);
              }}
              className='h-8 w-8 p-0'
              title='撥號'
            >
              <Phone className='h-3 w-3' />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={e => {
                e.stopPropagation();
                onViewSchedule?.(record);
              }}
              className='h-8 w-8 p-0'
              title='查看詳情'
            >
              <Eye className='h-3 w-3' />
            </Button>
            {onEditSchedule && (
              <Button
                variant='ghost'
                size='sm'
                onClick={e => {
                  e.stopPropagation();
                  onEditSchedule(record);
                }}
                className='h-8 w-8 p-0'
                title='編輯'
              >
                <Edit className='h-3 w-3' />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [pagination, onViewSchedule, onCallPerson, onEditSchedule]
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

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-lg font-medium flex items-center gap-2'>
            <Clock className='h-5 w-5' />
            值班安排列表
            {pagination && (
              <span className='text-sm font-normal text-gray-500'>
                (共 {pagination.total} 筆記錄)
              </span>
            )}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className='p-0'>
        <DataTable
          columns={columns}
          data={schedules}
          loading={loading}
          onSort={handleSort}
          pagination={
            pagination && {
              current: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: handlePagination,
            }
          }
          emptyText='沒有找到符合條件的值班記錄'
          className='rounded-none'
        />
      </CardContent>
    </Card>
  );
}
