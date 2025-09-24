/**
 * @fileoverview WBS 工具列組件
 * @version 1.0
 * @date 2025-09-01
 *
 * WBS 樹狀結構的工具列，包含新增、展開/摺疊、檢視選項等功能
 */

'use client';

import React, { useCallback } from 'react';
import {
  Plus,
  Expand,
  Collapse,
  Eye,
  EyeOff,
  Filter,
  MoreHorizontal,
  Download,
  Upload,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

// ==================== TYPES ====================

export interface WBSToolbarProps {
  /** 新增根節點回調 */
  onAddRoot?: () => void;
  /** 展開所有節點回調 */
  onExpandAll?: () => void;
  /** 摺疊所有節點回調 */
  onCollapseAll?: () => void;
  /** 切換完成項目顯示回調 */
  onToggleCompleted?: () => void;
  /** 切換篩選器面板回調 */
  onToggleFilters?: () => void;
  /** 導入回調 */
  onImport?: () => void;
  /** 導出回調 */
  onExport?: () => void;
  /** 設定回調 */
  onSettings?: () => void;
  /** 是否顯示完成的項目 */
  showCompleted?: boolean;
  /** 篩選器是否開啟 */
  filtersOpen?: boolean;
  /** 是否唯讀 */
  readonly?: boolean;
  /** 統計資訊 */
  statistics?: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  /** 組件類名 */
  className?: string;
}

// ==================== COMPONENT ====================

export const WBSToolbar: React.FC<WBSToolbarProps> = ({
  onAddRoot,
  onExpandAll,
  onCollapseAll,
  onToggleCompleted,
  onToggleFilters,
  onImport,
  onExport,
  onSettings,
  showCompleted = true,
  filtersOpen = false,
  readonly = false,
  statistics,
  className,
}) => {
  // ===== HANDLERS =====
  const handleAddRoot = useCallback(() => {
    if (!readonly) {
      onAddRoot?.();
    }
  }, [readonly, onAddRoot]);

  const handleExpandAll = useCallback(() => {
    onExpandAll?.();
  }, [onExpandAll]);

  const handleCollapseAll = useCallback(() => {
    onCollapseAll?.();
  }, [onCollapseAll]);

  const handleToggleCompleted = useCallback(() => {
    onToggleCompleted?.();
  }, [onToggleCompleted]);

  const handleToggleFilters = useCallback(() => {
    onToggleFilters?.();
  }, [onToggleFilters]);

  const handleImport = useCallback(() => {
    if (!readonly) {
      onImport?.();
    }
  }, [readonly, onImport]);

  const handleExport = useCallback(() => {
    onExport?.();
  }, [onExport]);

  const handleSettings = useCallback(() => {
    onSettings?.();
  }, [onSettings]);

  // ===== RENDER =====
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700',
        className
      )}
      data-testid='wbs-toolbar'
    >
      {/* 左側 - 主要操作按鈕 */}
      <div className='flex items-center space-x-2'>
        {/* 新增根節點 */}
        {!readonly && (
          <Button
            variant='default'
            size='sm'
            onClick={handleAddRoot}
            className='flex items-center space-x-1'
            data-testid='add-root-button'
          >
            <Plus className='w-4 h-4' />
            <span>新增根節點</span>
          </Button>
        )}

        {/* 展開/摺疊控制 */}
        <div className='flex items-center space-x-1'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleExpandAll}
            className='flex items-center space-x-1'
            data-testid='expand-all-button'
          >
            <Expand className='w-4 h-4' />
            <span className='hidden sm:inline'>展開全部</span>
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={handleCollapseAll}
            className='flex items-center space-x-1'
            data-testid='collapse-all-button'
          >
            <Collapse className='w-4 h-4' />
            <span className='hidden sm:inline'>摺疊全部</span>
          </Button>
        </div>

        {/* 檢視選項 */}
        <div className='flex items-center space-x-1'>
          <Button
            variant={showCompleted ? 'default' : 'outline'}
            size='sm'
            onClick={handleToggleCompleted}
            className='flex items-center space-x-1'
            data-testid='toggle-completed-button'
          >
            {showCompleted ? (
              <Eye className='w-4 h-4' />
            ) : (
              <EyeOff className='w-4 h-4' />
            )}
            <span className='hidden sm:inline'>
              {showCompleted ? '顯示完成' : '隱藏完成'}
            </span>
          </Button>

          <Button
            variant={filtersOpen ? 'default' : 'outline'}
            size='sm'
            onClick={handleToggleFilters}
            className='flex items-center space-x-1'
            data-testid='toggle-filters-button'
          >
            <Filter className='w-4 h-4' />
            <span className='hidden sm:inline'>篩選器</span>
          </Button>
        </div>
      </div>

      {/* 中間 - 統計資訊 */}
      {statistics && (
        <div className='flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400'>
          <div className='flex items-center space-x-2'>
            <span>總計:</span>
            <Badge variant='secondary'>{statistics.total}</Badge>
          </div>

          <div className='flex items-center space-x-2'>
            <span>進行中:</span>
            <Badge
              variant='default'
              className='bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            >
              {statistics.inProgress}
            </Badge>
          </div>

          <div className='flex items-center space-x-2'>
            <span>已完成:</span>
            <Badge
              variant='default'
              className='bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            >
              {statistics.completed}
            </Badge>
          </div>

          <div className='flex items-center space-x-2'>
            <span>未開始:</span>
            <Badge variant='outline'>{statistics.notStarted}</Badge>
          </div>
        </div>
      )}

      {/* 右側 - 更多操作 */}
      <div className='flex items-center space-x-2'>
        {/* 導入導出按鈕 */}
        <div className='flex items-center space-x-1'>
          {!readonly && (
            <Button
              variant='outline'
              size='sm'
              onClick={handleImport}
              className='flex items-center space-x-1'
              data-testid='import-button'
            >
              <Upload className='w-4 h-4' />
              <span className='hidden md:inline'>導入</span>
            </Button>
          )}

          <Button
            variant='outline'
            size='sm'
            onClick={handleExport}
            className='flex items-center space-x-1'
            data-testid='export-button'
          >
            <Download className='w-4 h-4' />
            <span className='hidden md:inline'>導出</span>
          </Button>
        </div>

        {/* 更多操作選單 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='outline'
              size='sm'
              className='flex items-center space-x-1'
              data-testid='more-actions-button'
            >
              <MoreHorizontal className='w-4 h-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={handleSettings}>
              <Settings className='w-4 h-4 mr-2' />
              設定
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuCheckboxItem
              checked={showCompleted}
              onCheckedChange={handleToggleCompleted}
            >
              顯示已完成項目
            </DropdownMenuCheckboxItem>

            <DropdownMenuCheckboxItem
              checked={filtersOpen}
              onCheckedChange={handleToggleFilters}
            >
              顯示篩選器面板
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />

            {!readonly && (
              <>
                <DropdownMenuItem onClick={handleImport}>
                  <Upload className='w-4 h-4 mr-2' />
                  導入 WBS
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleExport}>
                  <Download className='w-4 h-4 mr-2' />
                  導出 WBS
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default WBSToolbar;
