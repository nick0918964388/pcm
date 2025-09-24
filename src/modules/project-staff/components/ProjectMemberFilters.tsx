/**
 * @fileoverview 專案人員篩選組件
 * @version 1.0
 * @date 2025-08-31
 *
 * 提供多維度篩選功能的組件
 */

'use client';

import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, X, Filter } from 'lucide-react';
import {
  ProjectMemberFilters as FilterTypes,
  WorkStatus,
} from '@/types/project';
import { cn } from '@/lib/utils';

// ==================== TYPES ====================

export interface ProjectMemberFiltersProps {
  /** 當前篩選條件 */
  filters: Partial<FilterTypes>;
  /** 篩選條件變更回調 */
  onFiltersChange: (filters: Partial<FilterTypes>) => void;
  /** 可用角色列表 */
  availableRoles: string[];
  /** 可用技能列表 */
  availableSkills: string[];
  /** 部門列表 */
  departments: string[];
  /** 是否可摺疊 */
  collapsible?: boolean;
  /** 默認是否展開 */
  defaultExpanded?: boolean;
  /** 是否顯示清除按鈕 */
  showClearAll?: boolean;
  /** 是否顯示篩選數量 */
  showFilterCount?: boolean;
  /** 響應式設計 */
  responsive?: boolean;
  /** 組件類名 */
  className?: string;
}

// ==================== COMPONENT ====================

export const ProjectMemberFilters: React.FC<ProjectMemberFiltersProps> = ({
  filters,
  onFiltersChange,
  availableRoles,
  availableSkills,
  departments,
  collapsible = false,
  defaultExpanded = true,
  showClearAll = true,
  showFilterCount = true,
  responsive = true,
  className,
}) => {
  // ===== STATES =====
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // ===== COMPUTED VALUES =====
  const activeFilterCount = Object.values(filters).reduce((count, value) => {
    if (Array.isArray(value)) {
      return count + value.length;
    }
    if (value && typeof value === 'object') {
      return count + Object.keys(value).length;
    }
    return value !== undefined ? count + 1 : count;
  }, 0);

  // ===== HANDLERS =====
  const handleRoleChange = useCallback(
    (selectedRoles: string[]) => {
      onFiltersChange({
        ...filters,
        role: selectedRoles.length > 0 ? selectedRoles : undefined,
      });
    },
    [filters, onFiltersChange]
  );

  const handleSkillsChange = useCallback(
    (selectedSkills: string[]) => {
      onFiltersChange({
        ...filters,
        skills: selectedSkills.length > 0 ? selectedSkills : undefined,
      });
    },
    [filters, onFiltersChange]
  );

  const handleWorkStatusChange = useCallback(
    (selectedStatuses: WorkStatus[]) => {
      onFiltersChange({
        ...filters,
        workStatus: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      });
    },
    [filters, onFiltersChange]
  );

  const handleDepartmentChange = useCallback(
    (selectedDepartments: string[]) => {
      onFiltersChange({
        ...filters,
        department:
          selectedDepartments.length > 0 ? selectedDepartments : undefined,
      });
    },
    [filters, onFiltersChange]
  );

  const handleWorkloadRangeChange = useCallback(
    (min?: number, max?: number) => {
      if (min !== undefined || max !== undefined) {
        onFiltersChange({
          ...filters,
          workloadRange: { min, max },
        });
      } else {
        const { workloadRange, ...rest } = filters;
        onFiltersChange(rest);
      }
    },
    [filters, onFiltersChange]
  );

  const handleJoinDateRangeChange = useCallback(
    (start?: Date, end?: Date) => {
      if (start || end) {
        onFiltersChange({
          ...filters,
          joinDateRange: { start, end },
        });
      } else {
        const { joinDateRange, ...rest } = filters;
        onFiltersChange(rest);
      }
    },
    [filters, onFiltersChange]
  );

  const handleActiveStatusChange = useCallback(
    (isActive?: boolean) => {
      onFiltersChange({
        ...filters,
        isActive,
      });
    },
    [filters, onFiltersChange]
  );

  const handleClearAll = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  // ===== RENDER HELPERS =====
  const renderMultiSelect = (
    testId: string,
    label: string,
    options: string[],
    selectedValues: string[] = [],
    onChange: (values: string[]) => void,
    placeholder = '請選擇...'
  ) => (
    <div className='space-y-2'>
      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
        {label}
      </label>
      <div className='relative'>
        <select
          data-testid={testId}
          multiple
          value={selectedValues}
          onChange={e => {
            const values = Array.from(
              e.target.selectedOptions,
              option => option.value
            );
            onChange(values);
          }}
          className='w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white'
        >
          {options.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {selectedValues.length > 0 && (
          <input
            type='text'
            readOnly
            value={selectedValues.join(', ')}
            className='absolute inset-0 w-full border border-gray-300 rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white pointer-events-none'
          />
        )}
      </div>
    </div>
  );

  const renderWorkStatusSelect = () => (
    <div className='space-y-2'>
      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
        工作狀態
      </label>
      <select
        data-testid='work-status-filter'
        multiple
        value={filters.workStatus || []}
        onChange={e => {
          const values = Array.from(
            e.target.selectedOptions,
            option => option.value as WorkStatus
          );
          handleWorkStatusChange(values);
        }}
        className='w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white'
      >
        {Object.values(WorkStatus).map(status => (
          <option key={status} value={status}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </option>
        ))}
      </select>
      {filters.workStatus && filters.workStatus.length > 0 && (
        <input
          type='text'
          readOnly
          value={filters.workStatus
            .map(s => s.charAt(0).toUpperCase() + s.slice(1))
            .join(', ')}
          className='w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
        />
      )}
    </div>
  );

  const renderRangeInputs = (
    testIdPrefix: string,
    label: string,
    minValue?: number,
    maxValue?: number,
    onChange: (min?: number, max?: number) => void,
    placeholder = { min: '最小值', max: '最大值' }
  ) => (
    <div className='space-y-2'>
      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
        {label}
      </label>
      <div className='grid grid-cols-2 gap-2'>
        <input
          data-testid={`${testIdPrefix}-input`}
          type='number'
          value={minValue || ''}
          onChange={e => {
            const min = e.target.value ? parseInt(e.target.value) : undefined;
            onChange(min, maxValue);
          }}
          placeholder={placeholder.min}
          className='w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white'
        />
        <input
          data-testid={`${testIdPrefix.replace('min', 'max')}-input`}
          type='number'
          value={maxValue || ''}
          onChange={e => {
            const max = e.target.value ? parseInt(e.target.value) : undefined;
            onChange(minValue, max);
          }}
          placeholder={placeholder.max}
          className='w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white'
        />
      </div>
    </div>
  );

  const renderDateRangeInputs = () => (
    <div className='space-y-2'>
      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
        加入時間
      </label>
      <div className='grid grid-cols-2 gap-2'>
        <input
          data-testid='start-date-input'
          type='date'
          value={
            filters.joinDateRange?.start?.toISOString().split('T')[0] || ''
          }
          onChange={e => {
            const start = e.target.value ? new Date(e.target.value) : undefined;
            handleJoinDateRangeChange(start, filters.joinDateRange?.end);
          }}
          className='w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white'
        />
        <input
          data-testid='end-date-input'
          type='date'
          value={filters.joinDateRange?.end?.toISOString().split('T')[0] || ''}
          onChange={e => {
            const end = e.target.value ? new Date(e.target.value) : undefined;
            handleJoinDateRangeChange(filters.joinDateRange?.start, end);
          }}
          className='w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white'
        />
      </div>
    </div>
  );

  // ===== RENDER =====
  return (
    <div
      className={cn(
        'border border-gray-200 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700',
        responsive && 'responsive',
        className
      )}
      data-testid='filters-container'
    >
      {/* 標題欄 */}
      <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center space-x-2'>
          <Filter className='w-5 h-5 text-gray-500' />
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
            篩選條件
          </h3>
          {showFilterCount && activeFilterCount > 0 && (
            <span className='inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full'>
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className='flex items-center space-x-2'>
          {showClearAll && activeFilterCount > 0 && (
            <button
              type='button'
              onClick={handleClearAll}
              className='text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            >
              清除所有篩選
            </button>
          )}

          {collapsible && (
            <button
              type='button'
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid='collapse-toggle'
              className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            >
              {isExpanded ? (
                <ChevronUp className='w-4 h-4' />
              ) : (
                <ChevronDown className='w-4 h-4' />
              )}
            </button>
          )}
        </div>
      </div>

      {/* 篩選內容 */}
      {(!collapsible || isExpanded) && (
        <div className='p-4'>
          <div
            className={cn(
              'grid gap-4',
              responsive
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-3'
            )}
          >
            {/* 角色篩選 */}
            {renderMultiSelect(
              'role-filter',
              '角色',
              availableRoles,
              filters.role,
              handleRoleChange,
              '選擇角色...'
            )}

            {/* 技能篩選 */}
            {renderMultiSelect(
              'skills-filter',
              '技能',
              availableSkills,
              filters.skills,
              handleSkillsChange,
              '選擇技能...'
            )}

            {/* 工作狀態篩選 */}
            {renderWorkStatusSelect()}

            {/* 部門篩選 */}
            {renderMultiSelect(
              'department-filter',
              '部門',
              departments,
              filters.department,
              handleDepartmentChange,
              '選擇部門...'
            )}

            {/* 工作負載範圍 */}
            {renderRangeInputs(
              'min-workload',
              '工作負載範圍',
              filters.workloadRange?.min,
              filters.workloadRange?.max,
              handleWorkloadRangeChange,
              { min: '最小負載%', max: '最大負載%' }
            )}

            {/* 加入時間範圍 */}
            {renderDateRangeInputs()}

            {/* 活躍狀態 */}
            <div className='space-y-2'>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                活躍狀態
              </label>
              <div className='flex items-center'>
                <input
                  data-testid='active-status-filter'
                  type='checkbox'
                  checked={filters.isActive === true}
                  onChange={e => {
                    handleActiveStatusChange(
                      e.target.checked ? true : undefined
                    );
                  }}
                  className='w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600'
                />
                <label className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
                  僅顯示活躍成員
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectMemberFilters;
