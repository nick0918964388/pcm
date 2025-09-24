import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface NavbarSkeletonProps {
  showProjectSelector?: boolean;
  showProjectNavigation?: boolean;
  className?: string;
}

/**
 * 導覽列載入骨架
 */
export function NavbarSkeleton({
  showProjectSelector = true,
  showProjectNavigation = false,
  className = '',
}: NavbarSkeletonProps) {
  return (
    <nav
      className={cn('bg-white border-b border-gray-200 shadow-sm', className)}
    >
      <div className='w-full px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center h-16'>
          {/* 左側 - Logo 和導覽骨架 */}
          <div className='flex items-center space-x-4 flex-1 min-w-0'>
            {/* Logo 骨架 */}
            <div className='flex items-center space-x-2 flex-shrink-0'>
              <Skeleton className='w-8 h-8 rounded' />
              <Skeleton className='h-6 w-32 hidden xl:block' />
            </div>

            {/* 主導航選單骨架 */}
            <div className='hidden md:flex items-center space-x-1'>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className={cn(
                    'h-8 rounded-md',
                    !showProjectNavigation ? 'w-16 opacity-50' : 'w-20'
                  )}
                />
              ))}
            </div>
          </div>

          {/* 右側 - 專案選擇器和使用者選單骨架 */}
          <div className='flex items-center space-x-2 flex-shrink-0 ml-2'>
            {/* 專案選擇器骨架 */}
            {showProjectSelector && (
              <div className='hidden md:block'>
                <Skeleton className='h-8 w-24 rounded-md' />
              </div>
            )}

            {/* 通知、設定、使用者選單骨架 */}
            <Skeleton className='h-8 w-8 rounded p-2' />
            <Skeleton className='h-8 w-8 rounded p-2' />
            <Skeleton className='h-8 w-16 rounded hidden md:block' />
            <Skeleton className='h-8 w-16 rounded hidden md:block' />

            {/* 行動版選單按鈕骨架 */}
            <Skeleton className='md:hidden h-8 w-8 rounded p-2' />
          </div>
        </div>
      </div>

      {/* 第二列專案選擇器骨架 */}
      {showProjectNavigation && (
        <div className='bg-gradient-to-r from-green-50 to-blue-50 border-t border-green-200'>
          <div className='w-full px-4 sm:px-6 lg:px-8'>
            <div className='flex items-center justify-between py-3'>
              <div className='flex items-center space-x-4'>
                <Skeleton className='w-10 h-10 rounded-lg' />
                <div className='flex flex-col space-y-1'>
                  <div className='flex items-center space-x-2'>
                    <Skeleton className='h-4 w-32' />
                    <Skeleton className='h-4 w-12 rounded-full' />
                  </div>
                  <div className='flex items-center space-x-3'>
                    <Skeleton className='h-3 w-12' />
                    <Skeleton className='h-3 w-10' />
                    <Skeleton className='h-3 w-16' />
                  </div>
                </div>
              </div>
              <div className='flex items-center space-x-2'>
                <Skeleton className='h-8 w-24 rounded-md' />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 行動版導覽選單骨架 */}
      <div className='md:hidden border-t border-gray-200'>
        <div className='px-2 pt-2 pb-3 space-y-1'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='space-y-1'>
              <Skeleton className='h-8 w-24 rounded ml-3' />
              <div className='ml-7 space-y-1'>
                <Skeleton className='h-6 w-20 rounded' />
                <Skeleton className='h-6 w-28 rounded' />
              </div>
            </div>
          ))}

          {/* 行動版專案選擇器骨架 */}
          {showProjectSelector && (
            <div className='px-3 py-2 border-t border-gray-200 mt-4'>
              <Skeleton className='h-8 w-full rounded-md' />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

/**
 * 麵包屑載入骨架
 */
export function BreadcrumbsSkeleton({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div className={cn('bg-gray-50 border-b border-gray-200', className)}>
      <div className='w-full px-4 sm:px-6 lg:px-8'>
        <div className='py-2'>
          <div className='flex items-center space-x-2'>
            <Skeleton className='h-4 w-12' />
            <Skeleton className='h-4 w-4' />
            <Skeleton className='h-4 w-16' />
            <Skeleton className='h-4 w-4' />
            <Skeleton className='h-4 w-20' />
          </div>
        </div>
      </div>
    </div>
  );
}
