'use client';

import React, { useState, useEffect } from 'react';
import {
  LoadingBoundary,
  DashboardLoadingBoundary,
  ProjectGridLoadingBoundary,
  CardLoadingBoundary,
} from '@/components/common/LoadingBoundary';
import {
  useLoadingState,
  useMultipleLoadingState,
} from '@/hooks/useLoadingState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

/**
 * Skeleton Loading 功能示例組件
 *
 * 展示如何使用各種載入狀態和骨架組件
 */
export function SkeletonLoadingExample() {
  // 基礎載入狀態
  const dashboardLoading = useLoadingState({ minDuration: 500 });
  const projectLoading = useLoadingState({ minDuration: 300 });

  // 多重載入狀態
  const multipleLoading = useMultipleLoadingState();

  // 模擬異步數據載入
  const simulateDataLoad = async (duration: number = 2000) => {
    return new Promise(resolve => setTimeout(resolve, duration));
  };

  return (
    <div className='p-6 space-y-8'>
      <div className='text-center mb-8'>
        <h1 className='text-2xl font-bold mb-2'>Skeleton Loading 功能示例</h1>
        <p className='text-gray-600'>展示各種載入狀態和骨架組件的使用方式</p>
      </div>

      {/* 基礎載入狀態示例 */}
      <section className='space-y-4'>
        <h2 className='text-xl font-semibold'>基礎載入狀態</h2>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {/* Dashboard 載入示例 */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center justify-between'>
                Dashboard 載入
                <Button
                  size='sm'
                  onClick={() =>
                    dashboardLoading.withLoading(() => simulateDataLoad())
                  }
                  disabled={dashboardLoading.isLoading}
                >
                  {dashboardLoading.isLoading && (
                    <RefreshCw className='h-4 w-4 animate-spin mr-2' />
                  )}
                  載入 Dashboard
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardLoading.isLoading ? (
                <DashboardLoadingBoundary>
                  <div>Dashboard 內容</div>
                </DashboardLoadingBoundary>
              ) : (
                <div className='p-4 bg-green-50 rounded-lg'>
                  <p className='text-green-800'>Dashboard 載入完成！</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 專案網格載入示例 */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center justify-between'>
                專案網格載入
                <Button
                  size='sm'
                  onClick={() =>
                    projectLoading.withLoading(() => simulateDataLoad(1500))
                  }
                  disabled={projectLoading.isLoading}
                >
                  {projectLoading.isLoading && (
                    <RefreshCw className='h-4 w-4 animate-spin mr-2' />
                  )}
                  載入專案
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projectLoading.isLoading ? (
                <ProjectGridLoadingBoundary>
                  <div>專案網格內容</div>
                </ProjectGridLoadingBoundary>
              ) : (
                <div className='p-4 bg-blue-50 rounded-lg'>
                  <p className='text-blue-800'>專案資料載入完成！</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 多重載入狀態示例 */}
      <section className='space-y-4'>
        <h2 className='text-xl font-semibold'>多重載入狀態</h2>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {['用戶資料', '專案統計', '通知訊息'].map((item, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className='flex items-center justify-between text-base'>
                  {item}
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() =>
                      multipleLoading.withLoading(`item-${index}`, () =>
                        simulateDataLoad(1000 + index * 500)
                      )
                    }
                    disabled={multipleLoading.isLoading(`item-${index}`)}
                  >
                    {multipleLoading.isLoading(`item-${index}`) && (
                      <RefreshCw className='h-4 w-4 animate-spin mr-2' />
                    )}
                    載入
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {multipleLoading.isLoading(`item-${index}`) ? (
                  <CardLoadingBoundary>
                    <div>{item}內容</div>
                  </CardLoadingBoundary>
                ) : (
                  <div className='p-3 bg-gray-50 rounded'>
                    <p className='text-sm'>{item}載入完成</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className='text-center'>
          <p className='text-sm text-gray-600 mb-2'>
            {multipleLoading.isAnyLoading()
              ? '有資料正在載入中...'
              : '所有資料載入完成'}
          </p>
          <Button
            onClick={() => {
              [0, 1, 2].forEach(index =>
                multipleLoading.withLoading(`item-${index}`, () =>
                  simulateDataLoad(1000 + index * 200)
                )
              );
            }}
            disabled={multipleLoading.isAnyLoading()}
          >
            載入所有資料
          </Button>
        </div>
      </section>

      {/* 錯誤處理示例 */}
      <section className='space-y-4'>
        <h2 className='text-xl font-semibold'>錯誤處理示例</h2>

        <LoadingBoundary
          fallbackType='card'
          withErrorBoundary
          loadingMessage='載入中，可能會發生錯誤...'
        >
          <ErrorProneComponent />
        </LoadingBoundary>
      </section>
    </div>
  );
}

/**
 * 容易出錯的示例組件
 */
function ErrorProneComponent() {
  const [shouldError, setShouldError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShouldError(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (shouldError) {
    throw new Error('這是一個示例錯誤，用於展示錯誤邊界功能');
  }

  return (
    <Card>
      <CardContent className='p-6'>
        <p className='text-green-600'>
          組件載入成功！3秒後會拋出錯誤來示範錯誤處理。
        </p>
      </CardContent>
    </Card>
  );
}
