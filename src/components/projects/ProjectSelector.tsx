'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/types/project';
import {
  useProjectScopeStore,
  useCurrentProject,
  useRecentProjects,
  useFavoriteProjects,
} from '@/store/projectScopeStore';
import { useProjectStore } from '@/store/projectStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  Search,
  Star,
  Clock,
  Grid3X3,
  ArrowRight,
  Settings,
  Heart,
  X,
} from 'lucide-react';
import { ProjectSelectorSkeleton } from '@/components/ui/skeletons/ProjectGridSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectSelectorProps {
  /** 是否顯示在頂部導覽列 */
  inNavbar?: boolean;
  /** 自訂樣式類名 */
  className?: string;
}

/**
 * 專案選擇器元件
 *
 * 提供快速專案切換功能，包括：
 * - 當前專案顯示
 * - 最近存取專案
 * - 收藏專案
 * - 專案搜尋
 * - 專案選擇
 */
export function ProjectSelector({
  inNavbar = false,
  className = '',
}: ProjectSelectorProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentProject = useCurrentProject();
  const recentProjects = useRecentProjects(8);
  const { favoriteProjectIds, toggleFavorite, isFavorite } =
    useFavoriteProjects();
  const {
    isProjectSelectorOpen,
    toggleProjectSelector,
    selectProject,
    clearCurrentProject,
  } = useProjectScopeStore();

  const {
    projects,
    searchProjects,
    filteredProjects,
    initialized,
    initialize,
  } = useProjectStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recent' | 'favorites' | 'all'>(
    'recent'
  );

  // 初始化專案 store
  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  // 處理點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        if (isProjectSelectorOpen) {
          toggleProjectSelector();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProjectSelectorOpen, toggleProjectSelector]);

  // 處理搜尋
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      searchProjects(query);
      setActiveTab('all');
    }
  };

  // 選擇專案
  const handleSelectProject = (project: Project) => {
    selectProject(project);
    toggleProjectSelector();
    router.push(`/dashboard/${project.id}`);
  };

  // 前往專案選擇頁面
  const handleGoToProjectSelection = () => {
    toggleProjectSelector();
    router.push('/project-selection');
  };

  // 獲取要顯示的專案列表
  const getDisplayProjects = () => {
    switch (activeTab) {
      case 'recent':
        return recentProjects
          .map(record => projects.find(p => p.id === record.projectId))
          .filter(Boolean) as Project[];

      case 'favorites':
        return projects.filter(p => favoriteProjectIds.includes(p.id));

      case 'all':
        return searchQuery.trim() ? filteredProjects : projects.slice(0, 10);

      default:
        return [];
    }
  };

  const displayProjects = getDisplayProjects();

  // 導覽列模式的簡化顯示
  if (inNavbar) {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <Button
          variant='ghost'
          onClick={toggleProjectSelector}
          className='flex items-center space-x-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        >
          <div className='flex items-center space-x-2'>
            {!initialized ? (
              // 載入中骨架
              <>
                <Skeleton className='w-6 h-6 rounded' />
                <Skeleton className='h-4 w-20' />
                <Skeleton className='h-4 w-12 rounded-full' />
              </>
            ) : currentProject ? (
              // 已選擇專案
              <>
                <div className='w-6 h-6 bg-[#00645A] rounded flex items-center justify-center text-white text-xs font-bold'>
                  {(currentProject.code || currentProject.id || 'P').slice(-2)}
                </div>
                <span className='font-medium'>{currentProject.name}</span>
                <Badge
                  variant='secondary'
                  className='bg-gray-100 text-gray-700 text-xs'
                >
                  {currentProject.status}
                </Badge>
              </>
            ) : (
              // 未選擇專案
              <>
                <Grid3X3 className='h-4 w-4' />
                <span>選擇專案</span>
              </>
            )}
          </div>
          <ChevronDown className='h-4 w-4' />
        </Button>

        {isProjectSelectorOpen && (
          <Card className='absolute top-full right-0 mt-2 w-96 max-h-96 overflow-y-auto shadow-lg border border-gray-200 z-[50]'>
            {/* 搜尋區域 */}
            <div className='p-4 border-b border-gray-200'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
                <input
                  type='text'
                  placeholder='搜尋專案...'
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-[#00645A] focus:border-[#00645A] text-sm'
                />
              </div>
            </div>

            {/* 標籤頁 */}
            <div className='flex border-b border-gray-200'>
              <button
                onClick={() => setActiveTab('recent')}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  activeTab === 'recent'
                    ? 'text-[#00645A] border-b-2 border-[#00645A]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className='flex items-center justify-center space-x-1'>
                  <Clock className='h-3 w-3' />
                  <span>最近</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  activeTab === 'favorites'
                    ? 'text-[#00645A] border-b-2 border-[#00645A]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className='flex items-center justify-center space-x-1'>
                  <Heart className='h-3 w-3' />
                  <span>收藏</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  activeTab === 'all'
                    ? 'text-[#00645A] border-b-2 border-[#00645A]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className='flex items-center justify-center space-x-1'>
                  <Grid3X3 className='h-3 w-3' />
                  <span>所有</span>
                </div>
              </button>
            </div>

            {/* 專案列表 */}
            <div className='max-h-64 overflow-y-auto'>
              {displayProjects.length > 0 ? (
                displayProjects.map(project => (
                  <div
                    key={project.id}
                    onClick={() => handleSelectProject(project)}
                    className='flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0'
                  >
                    <div className='flex items-center space-x-3 flex-1 min-w-0'>
                      <div className='w-8 h-8 bg-[#00645A] rounded flex items-center justify-center text-white text-xs font-bold'>
                        {project.code.slice(-2)}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center space-x-2'>
                          <h4 className='text-sm font-medium text-gray-900 truncate'>
                            {project.name}
                          </h4>
                          {currentProject?.id === project.id && (
                            <Badge
                              variant='secondary'
                              className='text-xs bg-green-100 text-green-800'
                            >
                              目前
                            </Badge>
                          )}
                        </div>
                        <p className='text-xs text-gray-500'>{project.code}</p>
                      </div>
                    </div>
                    <div className='flex items-center space-x-1'>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          toggleFavorite(project.id);
                        }}
                        className='p-1 hover:bg-gray-200 rounded'
                      >
                        <Star
                          className={`h-3 w-3 ${
                            isFavorite(project.id)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-400'
                          }`}
                        />
                      </button>
                      <ArrowRight className='h-3 w-3 text-gray-400' />
                    </div>
                  </div>
                ))
              ) : (
                <div className='p-4'>
                  {!initialized ? (
                    // 載入中骨架
                    <div className='space-y-2'>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className='flex items-center space-x-3 p-2'
                        >
                          <Skeleton className='h-8 w-8 rounded-lg' />
                          <div className='flex-1 space-y-1'>
                            <Skeleton className='h-4 w-32' />
                            <Skeleton className='h-3 w-20' />
                          </div>
                          <Skeleton className='h-4 w-4' />
                        </div>
                      ))}
                    </div>
                  ) : (
                    // 空狀態
                    <div className='text-center text-gray-500'>
                      <div className='text-gray-400 mb-2'>
                        <Search className='h-8 w-8 mx-auto' />
                      </div>
                      <p className='text-sm'>
                        {activeTab === 'recent' && '尚無最近存取的專案'}
                        {activeTab === 'favorites' && '尚無收藏的專案'}
                        {activeTab === 'all' &&
                          searchQuery &&
                          '找不到符合的專案'}
                        {activeTab === 'all' && !searchQuery && '尚無專案資料'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 底部操作 */}
            <div className='border-t border-gray-200 p-4'>
              <div className='flex items-center justify-between'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleGoToProjectSelection}
                  className='text-[#00645A] hover:bg-[#00645A]/10'
                >
                  檢視所有專案
                </Button>
                {currentProject && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      clearCurrentProject();
                      toggleProjectSelector();
                      router.push('/project-selection');
                    }}
                    className='text-gray-500 hover:bg-gray-100'
                  >
                    <X className='h-3 w-3 mr-1' />
                    清除選擇
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // 完整版專案選擇器（用於專案選擇頁面等）
  return (
    <div className={`${className}`}>
      <Card className='p-6'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold text-gray-900'>專案選擇器</h3>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => router.push('/project-selection')}
          >
            <Settings className='h-4 w-4 mr-2' />
            管理專案
          </Button>
        </div>

        {currentProject ? (
          <div className='bg-[#00645A]/5 p-4 rounded-lg mb-4 border border-[#00645A]/20'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-3'>
                <div className='w-10 h-10 bg-[#00645A] rounded-lg flex items-center justify-center text-white font-bold text-sm'>
                  {currentProject.code.slice(-2)}
                </div>
                <div>
                  <h4 className='font-medium text-gray-900'>
                    {currentProject.name}
                  </h4>
                  <p className='text-sm text-gray-600'>
                    {currentProject.code} • {currentProject.status}
                  </p>
                </div>
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={() => clearCurrentProject()}
              >
                更換專案
              </Button>
            </div>
          </div>
        ) : (
          <div className='text-center py-8 bg-gray-50 rounded-lg mb-4'>
            <Grid3X3 className='h-12 w-12 text-gray-400 mx-auto mb-3' />
            <h4 className='text-lg font-medium text-gray-900 mb-2'>
              尚未選擇專案
            </h4>
            <p className='text-gray-600 mb-4'>
              請選擇一個專案以開始使用儀表板功能
            </p>
            <Button onClick={handleGoToProjectSelection}>選擇專案</Button>
          </div>
        )}

        {/* 最近專案 */}
        {recentProjects.length > 0 && (
          <div className='mb-4'>
            <h4 className='text-sm font-medium text-gray-700 mb-3 flex items-center'>
              <Clock className='h-4 w-4 mr-2' />
              最近存取的專案
            </h4>
            <div className='space-y-2'>
              {displayProjects.slice(0, 5).map(project => (
                <div
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  className='flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer'
                >
                  <div className='flex items-center space-x-3'>
                    <div className='w-8 h-8 bg-[#00645A] rounded flex items-center justify-center text-white text-xs font-bold'>
                      {project.code.slice(-2)}
                    </div>
                    <div>
                      <h5 className='text-sm font-medium text-gray-900'>
                        {project.name}
                      </h5>
                      <p className='text-xs text-gray-500'>{project.code}</p>
                    </div>
                  </div>
                  <ArrowRight className='h-4 w-4 text-gray-400' />
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
