/**
 * @fileoverview 照片篩選器元件
 *
 * 提供照片庫的多條件篩選功能，包括：
 * - 搜尋關鍵字篩選
 * - 日期範圍篩選
 * - 標籤篩選
 * - 上傳者篩選
 * - 相簿篩選
 * - 篩選條件的視覺化顯示
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Filter,
  X,
  Calendar,
  Search,
  Tag,
  User,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useDebounce } from 'use-debounce';
import type { PhotoFilters as PhotoFiltersType } from '@/types/photo.types';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface PhotoFiltersProps {
  /** 當前篩選參數 */
  filters: PhotoFiltersType;
  /** 篩選變更回調 */
  onFiltersChange: (filters: PhotoFiltersType) => void;
  /** 可用的標籤選項 */
  tagOptions?: FilterOption[];
  /** 可用的上傳者選項 */
  uploaderOptions?: FilterOption[];
  /** 是否顯示結果計數 */
  showCounts?: boolean;
  /** 自訂樣式類名 */
  className?: string;
}

/**
 * 照片篩選器元件
 */
export function PhotoFilters({
  filters,
  onFiltersChange,
  tagOptions = [],
  uploaderOptions = [],
  showCounts = false,
  className,
}: PhotoFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.searchQuery || '');

  // 使用 debounce 減少搜尋 API 呼叫
  const [debouncedSearchQuery] = useDebounce(searchInput, 300);

  // 搜尋關鍵字變更時更新篩選器
  React.useEffect(() => {
    if (debouncedSearchQuery !== filters.searchQuery) {
      updateFilter('searchQuery', debouncedSearchQuery || '');
    }
  }, [debouncedSearchQuery, filters.searchQuery]);

  // 計算已套用篩選器數量
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.dateRange) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    if (filters.uploadedBy) count++;
    if (filters.albumId) count++;
    return count;
  }, [filters]);

  // 更新單個篩選器
  const updateFilter = useCallback(
    (key: keyof PhotoFiltersType, value: any) => {
      onFiltersChange({
        ...filters,
        [key]: value,
      });
    },
    [filters, onFiltersChange]
  );

  // 清除所有篩選器
  const clearAllFilters = useCallback(() => {
    setSearchInput('');
    onFiltersChange({
      searchQuery: '',
      dateRange: undefined,
      tags: [],
      uploadedBy: undefined,
      albumId: undefined,
    });
  }, [onFiltersChange]);

  // 移除特定篩選器
  const removeFilter = useCallback(
    (key: keyof PhotoFiltersType) => {
      const newFilters = { ...filters };

      switch (key) {
        case 'searchQuery':
          setSearchInput('');
          newFilters.searchQuery = '';
          break;
        case 'dateRange':
          newFilters.dateRange = undefined;
          break;
        case 'tags':
          newFilters.tags = [];
          break;
        case 'uploadedBy':
          newFilters.uploadedBy = undefined;
          break;
        case 'albumId':
          newFilters.albumId = undefined;
          break;
      }

      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange]
  );

  // 處理標籤篩選
  const handleTagToggle = useCallback(
    (tagValue: string) => {
      const currentTags = filters.tags || [];
      const newTags = currentTags.includes(tagValue)
        ? currentTags.filter(tag => tag !== tagValue)
        : [...currentTags, tagValue];

      updateFilter('tags', newTags);
    },
    [filters.tags, updateFilter]
  );

  // 處理日期範圍變更
  const handleDateRangeChange = useCallback(
    (field: 'start' | 'end', value: string) => {
      const newDateRange = {
        ...filters.dateRange,
        [field]: value ? new Date(value) : undefined,
      };

      // 如果開始和結束日期都為空，則移除日期範圍篩選
      if (!newDateRange.start && !newDateRange.end) {
        updateFilter('dateRange', undefined);
      } else {
        updateFilter('dateRange', newDateRange);
      }
    },
    [filters.dateRange, updateFilter]
  );

  // 格式化日期為輸入框格式
  const formatDateForInput = (date: Date | undefined) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  // 取得標籤標籤文字
  const getTagLabel = (tagValue: string) => {
    const option = tagOptions.find(opt => opt.value === tagValue);
    return option?.label || tagValue;
  };

  // 取得上傳者標籤文字
  const getUploaderLabel = (uploaderValue: string) => {
    const option = uploaderOptions.find(opt => opt.value === uploaderValue);
    return option?.label || uploaderValue;
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {/* 篩選按鈕 */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            className={cn(
              'flex items-center space-x-2',
              activeFiltersCount > 0 && 'border-primary',
              // 響應式設計：小螢幕時全寬度
              'w-full sm:w-auto'
            )}
            aria-expanded={isOpen}
          >
            <Filter className='w-4 h-4' />
            <span>篩選</span>
            {activeFiltersCount > 0 && (
              <Badge variant='secondary' className='ml-1 text-xs'>
                {activeFiltersCount}
              </Badge>
            )}
            <ChevronDown className='w-4 h-4' />
          </Button>
        </PopoverTrigger>

        <PopoverContent className='w-96 p-0' align='start'>
          <Card>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='text-lg'>篩選條件</CardTitle>
                  <CardDescription>設定多個條件來精確查找照片</CardDescription>
                </div>
                {activeFiltersCount > 0 && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={clearAllFilters}
                    className='text-xs'
                  >
                    清除全部
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className='space-y-4'>
              {/* 搜尋關鍵字 */}
              <div className='space-y-2'>
                <Label className='flex items-center space-x-2'>
                  <Search className='w-4 h-4' />
                  <span>搜尋</span>
                </Label>
                <Input
                  placeholder='搜尋照片...'
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className='w-full'
                />
              </div>

              {/* 日期範圍篩選 */}
              <div className='space-y-2'>
                <Label className='flex items-center space-x-2'>
                  <Calendar className='w-4 h-4' />
                  <span>日期範圍</span>
                </Label>
                <div className='grid grid-cols-2 gap-2'>
                  <div>
                    <Label
                      htmlFor='start-date'
                      className='text-xs text-gray-500'
                    >
                      開始日期
                    </Label>
                    <Input
                      id='start-date'
                      type='date'
                      value={formatDateForInput(filters.dateRange?.start)}
                      onChange={e =>
                        handleDateRangeChange('start', e.target.value)
                      }
                      className='text-sm'
                    />
                  </div>
                  <div>
                    <Label htmlFor='end-date' className='text-xs text-gray-500'>
                      結束日期
                    </Label>
                    <Input
                      id='end-date'
                      type='date'
                      value={formatDateForInput(filters.dateRange?.end)}
                      onChange={e =>
                        handleDateRangeChange('end', e.target.value)
                      }
                      className='text-sm'
                    />
                  </div>
                </div>
              </div>

              {/* 標籤篩選 */}
              {tagOptions.length > 0 && (
                <div className='space-y-2'>
                  <Label className='flex items-center space-x-2'>
                    <Tag className='w-4 h-4' />
                    <span>標籤</span>
                  </Label>
                  <div className='grid grid-cols-2 gap-2 max-h-32 overflow-y-auto'>
                    {tagOptions.map(option => (
                      <div
                        key={option.value}
                        className='flex items-center space-x-2'
                      >
                        <Checkbox
                          id={`tag-${option.value}`}
                          checked={
                            filters.tags?.includes(option.value) || false
                          }
                          onCheckedChange={() => handleTagToggle(option.value)}
                        />
                        <Label
                          htmlFor={`tag-${option.value}`}
                          className='text-sm font-normal cursor-pointer'
                        >
                          {option.label}
                          {showCounts && option.count !== undefined && (
                            <span className='text-xs text-gray-500 ml-1'>
                              ({option.count})
                            </span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 上傳者篩選 */}
              {uploaderOptions.length > 0 && (
                <div className='space-y-2'>
                  <Label className='flex items-center space-x-2'>
                    <User className='w-4 h-4' />
                    <span>上傳者</span>
                  </Label>
                  <Select
                    value={filters.uploadedBy || ''}
                    onValueChange={value =>
                      updateFilter('uploadedBy', value || undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='選擇上傳者' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=''>全部上傳者</SelectItem>
                      {uploaderOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className='flex items-center space-x-2'>
                            <span>{option.label}</span>
                            {showCounts && option.count !== undefined && (
                              <Badge
                                variant='secondary'
                                className='text-xs ml-auto'
                              >
                                {option.count}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>

      {/* 已套用的篩選標籤 */}
      {activeFiltersCount > 0 && (
        <div className='flex items-center space-x-1 flex-wrap'>
          {filters.searchQuery && (
            <Badge variant='secondary' className='flex items-center space-x-1'>
              <span className='text-xs'>搜尋: {filters.searchQuery}</span>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => removeFilter('searchQuery')}
                className='h-auto w-auto p-0.5 hover:bg-gray-200'
                aria-label='移除篩選條件'
              >
                <X className='w-3 h-3' />
              </Button>
            </Badge>
          )}

          {filters.dateRange && (
            <Badge variant='secondary' className='flex items-center space-x-1'>
              <span className='text-xs'>
                日期: {formatDateForInput(filters.dateRange.start)} ~{' '}
                {formatDateForInput(filters.dateRange.end)}
              </span>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => removeFilter('dateRange')}
                className='h-auto w-auto p-0.5 hover:bg-gray-200'
                aria-label='移除篩選條件'
              >
                <X className='w-3 h-3' />
              </Button>
            </Badge>
          )}

          {filters.tags && filters.tags.length > 0 && (
            <Badge variant='secondary' className='flex items-center space-x-1'>
              <span className='text-xs'>標籤: {filters.tags.length}項</span>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => removeFilter('tags')}
                className='h-auto w-auto p-0.5 hover:bg-gray-200'
                aria-label='移除篩選條件'
              >
                <X className='w-3 h-3' />
              </Button>
            </Badge>
          )}

          {filters.uploadedBy && (
            <Badge variant='secondary' className='flex items-center space-x-1'>
              <span className='text-xs'>
                上傳者: {getUploaderLabel(filters.uploadedBy)}
              </span>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => removeFilter('uploadedBy')}
                className='h-auto w-auto p-0.5 hover:bg-gray-200'
                aria-label='移除篩選條件'
              >
                <X className='w-3 h-3' />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export default PhotoFilters;
