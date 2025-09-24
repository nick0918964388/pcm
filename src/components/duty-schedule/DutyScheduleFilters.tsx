'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  Filter,
  X,
  RotateCcw,
  Calendar as CalendarIcon,
  Clock,
  Users,
  MapPin,
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  DutyScheduleFilters as DutyFilters,
  ShiftType,
  DutyStatus,
  WorkArea,
  UrgencyLevel,
  VendorType,
} from '@/types/dutySchedule';

interface DutyScheduleFiltersProps {
  filters: DutyFilters;
  onFiltersChange: (filters: DutyFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  loading?: boolean;
  className?: string;
}

export function DutyScheduleFilters({
  filters,
  onFiltersChange,
  onSearch,
  onReset,
  loading = false,
  className,
}: DutyScheduleFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>(filters.dateRange || {});

  const handleInputChange = (key: keyof DutyFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const handleArraySelectChange = (
    key: keyof DutyFilters,
    value: string,
    enumObject: Record<string, string>
  ) => {
    const currentValues = (filters[key] as string[]) || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];

    onFiltersChange({
      ...filters,
      [key]: newValues.length > 0 ? newValues : undefined,
    });
  };

  const handleDateRangeChange = (
    range: { from?: Date; to?: Date } | undefined
  ) => {
    if (range) {
      setTempDateRange(range);
      if (range.from && range.to) {
        onFiltersChange({
          ...filters,
          dateRange: range,
          specificDate: undefined, // 清除特定日期
        });
        setDateRangeOpen(false);
      }
    } else {
      setTempDateRange({});
      onFiltersChange({
        ...filters,
        dateRange: undefined,
      });
    }
  };

  const handleSpecificDateChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      specificDate: date,
      dateRange: undefined, // 清除日期範圍
    });
  };

  const removeArrayFilter = (key: keyof DutyFilters, value: string) => {
    const currentValues = (filters[key] as string[]) || [];
    const newValues = currentValues.filter(v => v !== value);
    onFiltersChange({
      ...filters,
      [key]: newValues.length > 0 ? newValues : undefined,
    });
  };

  const removeFilter = (key: keyof DutyFilters) => {
    onFiltersChange({
      ...filters,
      [key]: undefined,
    });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'dateRange' && value) {
      return (value as any).from || (value as any).to;
    }
    return (
      value !== undefined &&
      value !== '' &&
      (Array.isArray(value) ? value.length > 0 : true)
    );
  });

  const getFilterCount = () => {
    let count = 0;
    Object.entries(filters).forEach(([key, value]) => {
      if (
        key === 'dateRange' &&
        value &&
        ((value as any).from || (value as any).to)
      ) {
        count++;
      } else if (value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          count += value.length;
        } else {
          count++;
        }
      }
    });
    return count;
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-lg font-medium flex items-center gap-2'>
            <Search className='h-5 w-5' />
            值班安排查詢
          </CardTitle>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsExpanded(!isExpanded)}
              className='text-xs'
            >
              <Filter className='h-4 w-4 mr-1' />
              {isExpanded ? '簡單搜尋' : '進階篩選'}
            </Button>
          </div>
        </div>

        {/* 活躍篩選器顯示 */}
        {hasActiveFilters && (
          <div className='flex flex-wrap gap-2 pt-2'>
            {filters.search && (
              <Badge variant='secondary' className='text-xs'>
                關鍵字: {filters.search}
                <button
                  onClick={() => removeFilter('search')}
                  className='ml-2 hover:text-red-600'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            )}

            {filters.dateRange &&
              (filters.dateRange.from || filters.dateRange.to) && (
                <Badge variant='secondary' className='text-xs'>
                  日期範圍:{' '}
                  {filters.dateRange.from
                    ? format(filters.dateRange.from, 'MM/dd', { locale: zhTW })
                    : '?'}{' '}
                  -{' '}
                  {filters.dateRange.to
                    ? format(filters.dateRange.to, 'MM/dd', { locale: zhTW })
                    : '?'}
                  <button
                    onClick={() => removeFilter('dateRange')}
                    className='ml-2 hover:text-red-600'
                  >
                    <X className='h-3 w-3' />
                  </button>
                </Badge>
              )}

            {filters.specificDate && (
              <Badge variant='secondary' className='text-xs'>
                特定日期:{' '}
                {format(filters.specificDate, 'MM/dd', { locale: zhTW })}
                <button
                  onClick={() => removeFilter('specificDate')}
                  className='ml-2 hover:text-red-600'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            )}

            {filters.shiftTypes?.map(type => (
              <Badge key={type} variant='secondary' className='text-xs'>
                班別: {type}
                <button
                  onClick={() => removeArrayFilter('shiftTypes', type)}
                  className='ml-2 hover:text-red-600'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            ))}

            {filters.statuses?.map(status => (
              <Badge key={status} variant='secondary' className='text-xs'>
                狀態: {status}
                <button
                  onClick={() => removeArrayFilter('statuses', status)}
                  className='ml-2 hover:text-red-600'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            ))}

            {filters.workAreas?.map(area => (
              <Badge key={area} variant='secondary' className='text-xs'>
                工作區域: {area}
                <button
                  onClick={() => removeArrayFilter('workAreas', area)}
                  className='ml-2 hover:text-red-600'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            ))}

            {filters.vendorTypes?.map(type => (
              <Badge key={type} variant='secondary' className='text-xs'>
                廠商類型: {type}
                <button
                  onClick={() => removeArrayFilter('vendorTypes', type)}
                  className='ml-2 hover:text-red-600'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            ))}

            {filters.currentOnly && (
              <Badge variant='secondary' className='text-xs'>
                僅當前值班
                <button
                  onClick={() => removeFilter('currentOnly')}
                  className='ml-2 hover:text-red-600'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* 基本搜尋欄位 */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {/* 關鍵字搜尋 */}
          <Input
            label='關鍵字搜尋（姓名/廠商）'
            placeholder='請輸入姓名或廠商名稱'
            value={filters.search || ''}
            onChange={e => handleInputChange('search', e.target.value)}
            startIcon={<Search />}
          />

          {/* 日期範圍選擇 */}
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700'>
              查詢日期範圍
            </label>
            <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  className='w-full justify-start text-left font-normal'
                >
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {filters.dateRange?.from ? (
                    filters.dateRange.to ? (
                      <>
                        {format(filters.dateRange.from, 'yyyy/MM/dd', {
                          locale: zhTW,
                        })}{' '}
                        -{' '}
                        {format(filters.dateRange.to, 'yyyy/MM/dd', {
                          locale: zhTW,
                        })}
                      </>
                    ) : (
                      format(filters.dateRange.from, 'yyyy/MM/dd', {
                        locale: zhTW,
                      })
                    )
                  ) : (
                    <span>選擇日期範圍</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  initialFocus
                  mode='range'
                  defaultMonth={tempDateRange.from}
                  selected={tempDateRange}
                  onSelect={handleDateRangeChange}
                  numberOfMonths={2}
                  locale={zhTW}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 班別篩選 */}
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700'>
              班別類型
            </label>
            <Select
              onValueChange={value =>
                handleArraySelectChange('shiftTypes', value, ShiftType)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='選擇班別類型' />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ShiftType).map(type => (
                  <SelectItem key={type} value={type}>
                    <div className='flex items-center'>
                      <Clock className='h-4 w-4 mr-2' />
                      {type}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 進階篩選欄位 */}
        {isExpanded && (
          <div className='space-y-4 pt-4 border-t'>
            {/* 第二行篩選 */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {/* 值班狀態 */}
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-700'>
                  值班狀態
                </label>
                <Select
                  onValueChange={value =>
                    handleArraySelectChange('statuses', value, DutyStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='選擇值班狀態' />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(DutyStatus).map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 工作區域 */}
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-700'>
                  工作區域
                </label>
                <Select
                  onValueChange={value =>
                    handleArraySelectChange('workAreas', value, WorkArea)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='選擇工作區域' />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(WorkArea).map(area => (
                      <SelectItem key={area} value={area}>
                        <div className='flex items-center'>
                          <MapPin className='h-4 w-4 mr-2' />
                          {area}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 廠商類型 */}
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-700'>
                  廠商類型
                </label>
                <Select
                  onValueChange={value =>
                    handleArraySelectChange('vendorTypes', value, VendorType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='選擇廠商類型' />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(VendorType).map(type => (
                      <SelectItem key={type} value={type}>
                        <div className='flex items-center'>
                          <Users className='h-4 w-4 mr-2' />
                          {type}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 第三行篩選 */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {/* 人員姓名 */}
              <Input
                label='值班人員姓名'
                placeholder='請輸入值班人員姓名'
                value={filters.personName || ''}
                onChange={e => handleInputChange('personName', e.target.value)}
              />

              {/* 職位 */}
              <Input
                label='職位'
                placeholder='請輸入職位'
                value={filters.personPosition || ''}
                onChange={e =>
                  handleInputChange('personPosition', e.target.value)
                }
              />

              {/* 緊急程度 */}
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-700'>
                  緊急程度
                </label>
                <Select
                  onValueChange={value =>
                    handleArraySelectChange(
                      'urgencyLevels',
                      value,
                      UrgencyLevel
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='選擇緊急程度' />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(UrgencyLevel).map(level => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 特殊篩選選項 */}
            <div className='flex flex-wrap gap-4'>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='currentOnly'
                  checked={filters.currentOnly || false}
                  onCheckedChange={checked =>
                    onFiltersChange({
                      ...filters,
                      currentOnly: checked ? true : undefined,
                    })
                  }
                />
                <label
                  htmlFor='currentOnly'
                  className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                >
                  僅顯示當前值班
                </label>
              </div>

              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='includeReplacements'
                  checked={filters.includeReplacements !== false}
                  onCheckedChange={checked =>
                    onFiltersChange({
                      ...filters,
                      includeReplacements: checked ? undefined : false,
                    })
                  }
                />
                <label
                  htmlFor='includeReplacements'
                  className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                >
                  包含代班記錄
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className='flex items-center gap-3 pt-4 border-t'>
          <Button onClick={onSearch} disabled={loading} className='px-6'>
            {loading ? (
              <>
                <div className='animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full' />
                查詢中...
              </>
            ) : (
              <>
                <Search className='h-4 w-4 mr-2' />
                查詢
              </>
            )}
          </Button>

          <Button
            variant='outline'
            onClick={onReset}
            disabled={loading}
            className='px-6'
          >
            <RotateCcw className='h-4 w-4 mr-2' />
            清除
          </Button>

          {hasActiveFilters && (
            <div className='text-xs text-gray-500 ml-auto'>
              已套用 {getFilterCount()} 個篩選條件
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
