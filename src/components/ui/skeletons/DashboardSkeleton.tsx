import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StatusCardSkeleton,
  KPICardSkeleton,
  MilestoneCardSkeleton,
} from './CardSkeleton';
import { ESHTableSkeleton, NewsTableSkeleton } from './TableSkeleton';
import { cn } from '@/lib/utils';

interface DashboardSkeletonProps {
  className?: string;
}

/**
 * Dashboard 頁面載入骨架
 * 複製 Dashboard 頁面的完整佈局結構
 */
export function DashboardSkeleton({ className = '' }: DashboardSkeletonProps) {
  return (
    <div className={cn('min-h-screen bg-white', className)}>
      {/* 導覽列骨架 */}
      <div className='bg-white border-b border-gray-200 shadow-sm'>
        <div className='w-full px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center h-16'>
            <div className='flex items-center space-x-4 flex-1 min-w-0'>
              <Skeleton className='w-8 h-8 rounded' />
              <Skeleton className='h-6 w-32 hidden xl:block' />
              <div className='hidden md:flex items-center space-x-1'>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className='h-8 w-20 rounded-md' />
                ))}
              </div>
            </div>
            <div className='flex items-center space-x-2'>
              <Skeleton className='h-8 w-24 rounded-md hidden md:block' />
              <Skeleton className='h-8 w-8 rounded p-2' />
              <Skeleton className='h-8 w-8 rounded p-2' />
              <Skeleton className='h-8 w-16 rounded hidden md:block' />
            </div>
          </div>
        </div>
      </div>

      {/* 麵包屑骨架 */}
      <div className='bg-gray-50 border-b border-gray-200'>
        <div className='w-full px-4 sm:px-6 lg:px-8'>
          <div className='py-2'>
            <div className='flex items-center space-x-2'>
              <Skeleton className='h-4 w-12' />
              <Skeleton className='h-4 w-4' />
              <Skeleton className='h-4 w-16' />
            </div>
          </div>
        </div>
      </div>

      <div className='w-full px-4 sm:px-6 lg:px-8'>
        <div className='space-y-4 sm:space-y-6 p-2 sm:p-4 bg-white min-h-screen'>
          {/* Header 區域骨架 */}
          <div className='bg-white border border-gray-100 p-3 sm:p-4 rounded shadow-sm'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0'>
              <div className='flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0'>
                <Skeleton className='h-6 sm:h-8 w-40' />
                <Skeleton className='h-4 w-64 hidden sm:block' />
              </div>
              <Skeleton className='h-4 w-48' />
            </div>
          </div>

          {/* 第一列：Project Status Cards 骨架 */}
          <div className='@container/main'>
            <StatusCardSkeleton />
          </div>

          {/* 第二列：Milestone Timeline 和 KPI Section 骨架 */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            {/* 左側 - Milestone Timeline 骨架 */}
            <div className='space-y-4'>
              <MilestoneCardSkeleton />
            </div>

            {/* 右側 - KPI Progress Bars 骨架 */}
            <div className='space-y-4'>
              <KPICardSkeleton />
            </div>
          </div>

          {/* 底部表格區域骨架 */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            {/* 工地ESH要覽骨架 */}
            <Card>
              <CardHeader className='flex items-center justify-between'>
                <Skeleton className='h-6 w-24' />
                <Skeleton className='h-4 w-12' />
              </CardHeader>
              <CardContent>
                <ESHTableSkeleton />
              </CardContent>
            </Card>

            {/* 最新消息骨架 */}
            <Card>
              <CardHeader className='flex items-center justify-between'>
                <Skeleton className='h-6 w-20' />
                <Skeleton className='h-4 w-12' />
              </CardHeader>
              <CardContent>
                <NewsTableSkeleton />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard 內容區域骨架（不包含導覽列）
 */
export function DashboardContentSkeleton({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div className={cn('space-y-4 sm:space-y-6', className)}>
      {/* Header 區域骨架 */}
      <div className='bg-white border border-gray-100 p-3 sm:p-4 rounded shadow-sm'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0'>
            <Skeleton className='h-6 sm:h-8 w-40' />
            <Skeleton className='h-4 w-64' />
          </div>
          <Skeleton className='h-4 w-48' />
        </div>
      </div>

      {/* Project Status Cards 骨架 */}
      <StatusCardSkeleton />

      {/* Milestone 和 KPI 區域骨架 */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <MilestoneCardSkeleton />
        <KPICardSkeleton />
      </div>

      {/* 表格區域骨架 */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-24' />
          </CardHeader>
          <CardContent>
            <ESHTableSkeleton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-20' />
          </CardHeader>
          <CardContent>
            <NewsTableSkeleton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
