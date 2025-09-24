'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Project, ProjectStatus, PROJECT_STATUS_COLORS } from '@/types/project';

/**
 * ProjectTable component props interface
 */
export interface ProjectTableProps {
  /** 專案列表資料 */
  projects: Project[];
  /** 載入中狀態 */
  loading?: boolean;
  /** 點擊進入專案回調函數 */
  onProjectEnter?: (projectId: string) => void | Promise<void>;
  /** 記錄存取回調函數 */
  onAccessRecord?: (projectId: string) => void | Promise<void>;
  /** 自定義樣式類名 */
  className?: string;
  /** 排序欄位 */
  sortBy?: string;
  /** 排序順序 */
  sortOrder?: 'asc' | 'desc';
  /** 排序變更回調函數 */
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  /** 空資料提示文字 */
  emptyText?: string;
}

/**
 * 根據專案狀態獲取對應的 Badge 變體
 * @param status 專案狀態
 * @returns Badge variant
 */
const getStatusBadgeVariant = (
  status: ProjectStatus
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const colorMap = PROJECT_STATUS_COLORS[status];

  switch (colorMap) {
    case 'green':
      return 'default'; // 已完成 - 綠色
    case 'blue':
      return 'default'; // 進行中 - 藍色 (使用 primary)
    case 'yellow':
      return 'secondary'; // 暫停 - 黃色
    case 'red':
      return 'destructive'; // 已取消 - 紅色
    case 'gray':
    default:
      return 'outline'; // 規劃中 - 灰色
  }
};

/**
 * 格式化日期顯示
 * @param date 日期
 * @returns 格式化後的日期字串
 */
const formatDate = (date: Date): string => {
  return format(new Date(date), 'yyyy/MM/dd', { locale: zhTW });
};

/**
 * 計算預算使用率
 * @param usedBudget 已使用預算
 * @param totalBudget 總預算
 * @returns 使用率百分比
 */
const calculateBudgetUtilization = (
  usedBudget: number,
  totalBudget: number
): number => {
  if (totalBudget === 0) return 0;
  return Math.round((usedBudget / totalBudget) * 100);
};

/**
 * ProjectTable 組件
 *
 * 提供專案資料的表格檢視模式，支援排序、載入狀態、空資料處理等功能
 * 整合 DataTable 組件實現統一的表格展示介面
 *
 * 功能特性：
 * - 顯示專案基本資訊（代碼、名稱、狀態、進度）
 * - 顯示專案經理和日期資訊
 * - 支援點擊進入專案功能
 * - 支援存取記錄功能
 * - 響應式設計，支援桌面和行動裝置
 *
 * @param props ProjectTable 組件屬性
 * @returns JSX.Element
 */
export const ProjectTable = React.memo<ProjectTableProps>(
  ({
    projects,
    loading = false,
    onProjectEnter,
    onAccessRecord,
    className,
    sortBy,
    sortOrder,
    onSort,
    emptyText = '暫無專案資料',
  }) => {
    /**
     * 處理進入專案操作
     */
    const handleProjectEnter = React.useCallback(
      async (project: Project) => {
        try {
          // 記錄存取行為
          if (onAccessRecord) {
            await onAccessRecord(project.id);
          }

          // 執行進入專案操作
          if (onProjectEnter) {
            await onProjectEnter(project.id);
          }
        } catch (error) {
          console.error('進入專案時發生錯誤:', error);
        }
      },
      [onProjectEnter, onAccessRecord]
    );

    /**
     * 處理行點擊事件
     */
    const handleRowClick = React.useCallback(
      (project: Project) => {
        if (onAccessRecord) {
          onAccessRecord(project.id);
        }
      },
      [onAccessRecord]
    );

    /**
     * 定義表格欄位配置
     */
    const columns: Column<Project>[] = React.useMemo(
      () => [
        {
          key: 'code',
          title: '專案代碼',
          width: '120px',
          sortable: true,
          render: (value: string) => (
            <div className='font-mono text-sm font-medium text-gray-900'>
              {value}
            </div>
          ),
        },
        {
          key: 'name',
          title: '專案名稱',
          sortable: true,
          render: (value: string, record: Project) => (
            <div className='min-w-0'>
              <div
                className='font-medium text-gray-900 cursor-pointer hover:text-blue-600 truncate'
                onClick={() => handleRowClick(record)}
                title={value}
              >
                {value}
              </div>
              {record.client && (
                <div
                  className='text-sm text-gray-500 truncate'
                  title={record.client}
                >
                  {record.client}
                </div>
              )}
            </div>
          ),
        },
        {
          key: 'status',
          title: '狀態',
          width: '100px',
          align: 'center',
          sortable: true,
          render: (status: ProjectStatus) => (
            <Badge
              variant={getStatusBadgeVariant(status)}
              className={cn(
                'font-medium text-xs',
                status === ProjectStatus.COMPLETED &&
                  'bg-green-100 text-green-800 border-green-200',
                status === ProjectStatus.IN_PROGRESS &&
                  'bg-blue-100 text-blue-800 border-blue-200',
                status === ProjectStatus.PAUSED &&
                  'bg-yellow-100 text-yellow-800 border-yellow-200',
                status === ProjectStatus.CANCELLED &&
                  'bg-red-100 text-red-800 border-red-200',
                status === ProjectStatus.PLANNING &&
                  'bg-gray-100 text-gray-800 border-gray-200'
              )}
            >
              {status}
            </Badge>
          ),
        },
        {
          key: 'progress',
          title: '進度',
          width: '150px',
          align: 'center',
          sortable: true,
          render: (progress: number) => (
            <div className='flex flex-col items-center space-y-1'>
              <Progress value={progress} className='w-full h-2' />
              <span className='text-xs text-gray-600 font-medium'>
                {progress}%
              </span>
            </div>
          ),
        },
        {
          key: 'managerName',
          title: '專案經理',
          width: '120px',
          sortable: true,
          render: (value: string) => (
            <div className='text-sm text-gray-900 font-medium'>{value}</div>
          ),
        },
        {
          key: 'startDate',
          title: '開始日期',
          width: '110px',
          align: 'center',
          sortable: true,
          render: (date: Date) => (
            <div className='text-sm text-gray-700'>{formatDate(date)}</div>
          ),
        },
        {
          key: 'endDate',
          title: '預計完成',
          width: '110px',
          align: 'center',
          sortable: true,
          render: (date: Date, record: Project) => {
            const isOverdue =
              record.status !== ProjectStatus.COMPLETED &&
              record.status !== ProjectStatus.CANCELLED &&
              new Date() > new Date(date);

            return (
              <div
                className={cn(
                  'text-sm',
                  isOverdue ? 'text-red-600 font-medium' : 'text-gray-700'
                )}
              >
                {formatDate(date)}
                {isOverdue && (
                  <div className='text-xs text-red-500 mt-0.5'>已逾期</div>
                )}
              </div>
            );
          },
        },
        {
          key: 'actions',
          title: '操作',
          width: '100px',
          align: 'center',
          render: (_, record: Project) => (
            <Button
              size='sm'
              variant='outline'
              onClick={e => {
                e.stopPropagation();
                handleProjectEnter(record);
              }}
              className='text-xs hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
            >
              進入專案
            </Button>
          ),
        },
      ],
      [handleProjectEnter, handleRowClick]
    );

    return (
      <div className={className}>
        <DataTable<Project>
          columns={columns}
          data={projects}
          loading={loading}
          onSort={onSort}
          emptyText={emptyText}
          className='bg-white shadow-sm border border-gray-200'
        />
      </div>
    );
  }
);

ProjectTable.displayName = 'ProjectTable';

export default ProjectTable;
