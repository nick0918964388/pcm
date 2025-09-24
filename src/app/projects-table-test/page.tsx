'use client';

import React, { useState } from 'react';
import { ProjectTable } from '@/app/projects/components/ProjectTable';
import { mockProjects } from '@/mocks/projects';

/**
 * ProjectTable 測試頁面
 *
 * 用於測試 ProjectTable 組件的功能和顯示效果
 */
export default function ProjectTableTestPage() {
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // 使用前 10 個專案進行測試
  const testProjects = mockProjects.slice(0, 10);

  const handleProjectEnter = (projectId: string) => {
    console.log('進入專案:', projectId);
    // 這裡可以導航到專案詳細頁面
    alert(`進入專案: ${projectId}`);
  };

  const handleAccessRecord = (projectId: string) => {
    console.log('記錄專案存取:', projectId);
    // 這裡可以記錄存取日誌
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    console.log('排序:', field, order);
    setSortBy(field);
    setSortOrder(order);
  };

  const toggleLoading = () => {
    setLoading(!loading);
  };

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* 頁面標題 */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900'>
            ProjectTable 組件測試
          </h1>
          <p className='mt-2 text-gray-600'>
            測試專案表格組件的各種功能和顯示效果
          </p>
        </div>

        {/* 控制面板 */}
        <div className='mb-6 bg-white rounded-lg shadow p-6'>
          <h2 className='text-lg font-medium text-gray-900 mb-4'>
            測試控制面板
          </h2>
          <div className='flex flex-wrap gap-4'>
            <button
              onClick={toggleLoading}
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
            >
              {loading ? '停止載入' : '模擬載入中'}
            </button>
            <div className='flex items-center space-x-2'>
              <span className='text-sm text-gray-700'>目前排序:</span>
              <span className='text-sm font-medium text-blue-600'>
                {sortBy || '無'} {sortBy && `(${sortOrder})`}
              </span>
            </div>
          </div>
        </div>

        {/* ProjectTable 組件 */}
        <div className='bg-white rounded-lg shadow'>
          <div className='px-6 py-4 border-b border-gray-200'>
            <h2 className='text-lg font-medium text-gray-900'>
              專案列表 ({testProjects.length} 筆)
            </h2>
          </div>

          <ProjectTable
            projects={testProjects}
            loading={loading}
            onProjectEnter={handleProjectEnter}
            onAccessRecord={handleAccessRecord}
            onSort={handleSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
            emptyText='沒有找到任何專案'
            className='rounded-b-lg'
          />
        </div>

        {/* 功能說明 */}
        <div className='mt-8 bg-white rounded-lg shadow p-6'>
          <h2 className='text-lg font-medium text-gray-900 mb-4'>
            功能測試說明
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <h3 className='font-medium text-gray-900 mb-2'>已實現功能:</h3>
              <ul className='text-sm text-gray-600 space-y-1'>
                <li>✅ 專案資料表格顯示</li>
                <li>✅ 狀態標籤顏色區分</li>
                <li>✅ 進度條顯示</li>
                <li>✅ 排序功能</li>
                <li>✅ 載入狀態</li>
                <li>✅ 空資料處理</li>
                <li>✅ 響應式設計</li>
                <li>✅ 進入專案按鈕</li>
                <li>✅ 存取記錄功能</li>
                <li>✅ 逾期標示</li>
              </ul>
            </div>
            <div>
              <h3 className='font-medium text-gray-900 mb-2'>測試項目:</h3>
              <ul className='text-sm text-gray-600 space-y-1'>
                <li>• 點擊欄位標題進行排序</li>
                <li>• 點擊「進入專案」按鈕</li>
                <li>• 點擊專案名稱記錄存取</li>
                <li>• 切換載入狀態</li>
                <li>• 調整視窗大小測試響應式</li>
                <li>• 檢查不同狀態的顏色</li>
                <li>• 查看進度條顯示</li>
                <li>• 確認逾期專案標示</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
