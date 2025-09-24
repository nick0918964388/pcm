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
import { Search, Filter, X, RotateCcw } from 'lucide-react';
import { VendorFilters, VendorType, VendorStatus } from '@/types/vendor';
import { cn } from '@/lib/utils';

interface VendorSearchFiltersProps {
  filters: VendorFilters;
  onFiltersChange: (filters: VendorFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  loading?: boolean;
  title?: string;
  placeholder?: string;
  className?: string;
}

export function VendorSearchFilters({
  filters,
  onFiltersChange,
  onSearch,
  onReset,
  loading = false,
  title = '廠商通訊錄查詢',
  placeholder = '請輸入廠商代碼或名稱',
  className,
}: VendorSearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleInputChange = (key: keyof VendorFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const handleSelectChange = (key: keyof VendorFilters, value: string) => {
    if (key === 'type') {
      const currentTypes = filters.type || [];
      const newTypes = currentTypes.includes(value as VendorType)
        ? currentTypes.filter(t => t !== value)
        : [...currentTypes, value as VendorType];
      onFiltersChange({
        ...filters,
        type: newTypes.length > 0 ? newTypes : undefined,
      });
    } else if (key === 'status') {
      const currentStatuses = filters.status || [];
      const newStatuses = currentStatuses.includes(value as VendorStatus)
        ? currentStatuses.filter(s => s !== value)
        : [...currentStatuses, value as VendorStatus];
      onFiltersChange({
        ...filters,
        status: newStatuses.length > 0 ? newStatuses : undefined,
      });
    } else {
      onFiltersChange({
        ...filters,
        [key]: value || undefined,
      });
    }
  };

  const removeFilter = (key: keyof VendorFilters, value?: string) => {
    if (key === 'type' && value) {
      const currentTypes = filters.type || [];
      const newTypes = currentTypes.filter(t => t !== value);
      onFiltersChange({
        ...filters,
        type: newTypes.length > 0 ? newTypes : undefined,
      });
    } else if (key === 'status' && value) {
      const currentStatuses = filters.status || [];
      const newStatuses = currentStatuses.filter(s => s !== value);
      onFiltersChange({
        ...filters,
        status: newStatuses.length > 0 ? newStatuses : undefined,
      });
    } else {
      onFiltersChange({
        ...filters,
        [key]: undefined,
      });
    }
  };

  const hasActiveFilters = Object.values(filters).some(
    value =>
      value !== undefined &&
      value !== '' &&
      (Array.isArray(value) ? value.length > 0 : true)
  );

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-lg font-medium flex items-center gap-2'>
            <Search className='h-5 w-5' />
            {title}
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
            {filters.type?.map(type => (
              <Badge key={type} variant='secondary' className='text-xs'>
                類型: {type}
                <button
                  onClick={() => removeFilter('type', type)}
                  className='ml-2 hover:text-red-600'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            ))}
            {filters.status?.map(status => (
              <Badge key={status} variant='secondary' className='text-xs'>
                狀態: {status}
                <button
                  onClick={() => removeFilter('status', status)}
                  className='ml-2 hover:text-red-600'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            ))}
            {filters.contactName && (
              <Badge variant='secondary' className='text-xs'>
                聯絡人: {filters.contactName}
                <button
                  onClick={() => removeFilter('contactName')}
                  className='ml-2 hover:text-red-600'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            )}
            {filters.phone && (
              <Badge variant='secondary' className='text-xs'>
                電話: {filters.phone}
                <button
                  onClick={() => removeFilter('phone')}
                  className='ml-2 hover:text-red-600'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            )}
            {filters.email && (
              <Badge variant='secondary' className='text-xs'>
                Email: {filters.email}
                <button
                  onClick={() => removeFilter('email')}
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
          <Input
            label='基本資料（代碼/名稱）'
            placeholder={placeholder}
            value={filters.search || ''}
            onChange={e => handleInputChange('search', e.target.value)}
            startIcon={<Search />}
          />

          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700'>
              廠商類型
            </label>
            <Select onValueChange={value => handleSelectChange('type', value)}>
              <SelectTrigger>
                <SelectValue placeholder='選擇廠商類型' />
              </SelectTrigger>
              <SelectContent>
                {Object.values(VendorType).map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700'>
              廠商狀態
            </label>
            <Select
              onValueChange={value => handleSelectChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder='選擇廠商狀態' />
              </SelectTrigger>
              <SelectContent>
                {Object.values(VendorStatus).map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 進階篩選欄位 */}
        {isExpanded && (
          <div className='space-y-4 pt-4 border-t'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              <Input
                label='聯絡人姓名'
                placeholder='請輸入聯絡人姓名'
                value={filters.contactName || ''}
                onChange={e => handleInputChange('contactName', e.target.value)}
              />

              <Input
                label='電話號碼'
                placeholder='請輸入電話號碼'
                value={filters.phone || ''}
                onChange={e => handleInputChange('phone', e.target.value)}
              />

              <Input
                label='Email'
                placeholder='請輸入Email'
                value={filters.email || ''}
                onChange={e => handleInputChange('email', e.target.value)}
              />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              <Input
                label='MVPN'
                placeholder='請輸入MVPN號碼'
                value={filters.mvpn || ''}
                onChange={e => handleInputChange('mvpn', e.target.value)}
              />

              <Input
                label='主管'
                placeholder='請輸入主管姓名'
                value={filters.supervisor || ''}
                onChange={e => handleInputChange('supervisor', e.target.value)}
              />

              <Input
                label='職稱'
                placeholder='請輸入職稱'
                value={filters.position || ''}
                onChange={e => handleInputChange('position', e.target.value)}
              />
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
              已套用{' '}
              {
                Object.values(filters).filter(
                  v =>
                    v !== undefined &&
                    v !== '' &&
                    (Array.isArray(v) ? v.length > 0 : true)
                ).length
              }{' '}
              個篩選條件
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
