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
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, RotateCcw, Users } from 'lucide-react';
import { ContactFilters, ContactStatus } from '@/types/vendor';
import { cn } from '@/lib/utils';

interface ContactSearchFiltersProps {
  filters: ContactFilters;
  onFiltersChange: (filters: ContactFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  loading?: boolean;
  vendorName?: string;
  className?: string;
}

export function ContactSearchFilters({
  filters,
  onFiltersChange,
  onSearch,
  onReset,
  loading = false,
  vendorName,
  className,
}: ContactSearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleInputChange = (key: keyof ContactFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const handleSelectChange = (key: keyof ContactFilters, value: string) => {
    if (key === 'status') {
      const currentStatuses = filters.status || [];
      const newStatuses = currentStatuses.includes(value as ContactStatus)
        ? currentStatuses.filter(s => s !== value)
        : [...currentStatuses, value as ContactStatus];
      onFiltersChange({
        ...filters,
        status: newStatuses.length > 0 ? newStatuses : undefined,
      });
    } else if (key === 'isPrimary' || key === 'isActive') {
      onFiltersChange({
        ...filters,
        [key]: value === 'true' ? true : value === 'false' ? false : undefined,
      });
    } else {
      onFiltersChange({
        ...filters,
        [key]: value || undefined,
      });
    }
  };

  const removeFilter = (key: keyof ContactFilters, value?: string) => {
    if (key === 'status' && value) {
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

  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) =>
      key !== 'vendorId' &&
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
            聯絡人查詢
            {vendorName && (
              <Badge variant='outline' className='ml-2'>
                {vendorName}
              </Badge>
            )}
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
            {filters.name && (
              <Badge variant='secondary' className='text-xs'>
                姓名: {filters.name}
                <button
                  onClick={() => removeFilter('name')}
                  className='ml-2 hover:text-red-600'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            )}
            {filters.position && (
              <Badge variant='secondary' className='text-xs'>
                職稱: {filters.position}
                <button
                  onClick={() => removeFilter('position')}
                  className='ml-2 hover:text-red-600'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            )}
            {filters.department && (
              <Badge variant='secondary' className='text-xs'>
                部門: {filters.department}
                <button
                  onClick={() => removeFilter('department')}
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
            {filters.isPrimary !== undefined && (
              <Badge variant='secondary' className='text-xs'>
                主要聯絡人: {filters.isPrimary ? '是' : '否'}
                <button
                  onClick={() => removeFilter('isPrimary')}
                  className='ml-2 hover:text-red-600'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            )}
            {filters.isActive !== undefined && (
              <Badge variant='secondary' className='text-xs'>
                啟用狀態: {filters.isActive ? '啟用' : '停用'}
                <button
                  onClick={() => removeFilter('isActive')}
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
            label='基本資料（姓名/職稱）'
            placeholder='請輸入姓名或職稱'
            value={filters.search || ''}
            onChange={e => handleInputChange('search', e.target.value)}
            startIcon={<Search />}
          />

          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700'>
              主要聯絡人
            </label>
            <Select
              onValueChange={value => handleSelectChange('isPrimary', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder='選擇主要聯絡人' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='true'>是</SelectItem>
                <SelectItem value='false'>否</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700'>
              啟用狀態
            </label>
            <Select
              onValueChange={value => handleSelectChange('isActive', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder='選擇啟用狀態' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='true'>啟用</SelectItem>
                <SelectItem value='false'>停用</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 進階篩選欄位 */}
        {isExpanded && (
          <div className='space-y-4 pt-4 border-t'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              <Input
                label='姓名'
                placeholder='請輸入聯絡人姓名'
                value={filters.name || ''}
                onChange={e => handleInputChange('name', e.target.value)}
              />

              <Input
                label='職稱'
                placeholder='請輸入職稱'
                value={filters.position || ''}
                onChange={e => handleInputChange('position', e.target.value)}
              />

              <Input
                label='部門'
                placeholder='請輸入部門'
                value={filters.department || ''}
                onChange={e => handleInputChange('department', e.target.value)}
              />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
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

              <Input
                label='MVPN'
                placeholder='請輸入MVPN號碼'
                value={filters.mvpn || ''}
                onChange={e => handleInputChange('mvpn', e.target.value)}
              />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <Input
                label='主管'
                placeholder='請輸入主管姓名'
                value={filters.supervisor || ''}
                onChange={e => handleInputChange('supervisor', e.target.value)}
              />

              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-700'>
                  聯絡人狀態
                </label>
                <Select
                  onValueChange={value => handleSelectChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='選擇聯絡人狀態' />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ContactStatus).map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              已套用{' '}
              {
                Object.entries(filters).filter(
                  ([key, v]) =>
                    key !== 'vendorId' &&
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
