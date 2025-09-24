/**
 * Projects Loading Page - Loading State for Project Selection
 *
 * This is a Next.js App Router special loading component that provides immediate
 * visual feedback while project data is being fetched. The component uses
 * skeleton placeholders to match the main projects page layout structure.
 *
 * @module ProjectsLoading
 * @version 1.0
 * @date 2025-08-30
 *
 * Requirements Coverage:
 * - US6 (AC6.1): 即時顯示專案進度更新 - Provides immediate loading feedback
 * - US6 (AC6.2): 顯示專案狀態變更 - Shows loading state transitions
 * - US4 (AC4.1, AC4.2): 響應式桌面和行動裝置體驗 - Responsive skeleton layout
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import {
  RefreshCw,
  FolderOpen,
  TrendingUp,
  Clock,
  Users,
  Settings,
  Search,
  Filter,
  Grid3x3,
  List,
} from 'lucide-react';

/**
 * Projects Loading Component
 *
 * A specialized Next.js loading component that provides skeleton placeholders
 * matching the main projects page structure. This component is automatically
 * rendered by Next.js App Router when the projects page is loading.
 *
 * Features:
 * - Matches the layout structure of the main projects page
 * - Uses existing Skeleton component for consistency
 * - Responsive design for all device sizes
 * - Provides visual hierarchy matching the actual content
 * - Shows loading states for all major sections
 *
 * Layout Sections:
 * - Page header with title and action buttons
 * - Project statistics cards
 * - Search and filter controls
 * - Project grid with multiple card skeletons
 *
 * @returns JSX.Element The projects loading component
 */
export default function Loading() {
  // ===== Render Helpers =====

  /**
   * Render skeleton for project statistics cards
   */
  const renderStatsSkeletons = () => (
    <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
      {/* Total Projects Card */}
      <Card className='p-4'>
        <div className='flex items-center justify-between'>
          <div className='space-y-2'>
            <Skeleton className='h-4 w-12' />
            <Skeleton className='h-8 w-8' />
          </div>
          <FolderOpen className='h-8 w-8 text-muted-foreground opacity-50' />
        </div>
      </Card>

      {/* Active Projects Card */}
      <Card className='p-4'>
        <div className='flex items-center justify-between'>
          <div className='space-y-2'>
            <Skeleton className='h-4 w-12' />
            <Skeleton className='h-8 w-8' />
          </div>
          <TrendingUp className='h-8 w-8 text-blue-600 opacity-50' />
        </div>
      </Card>

      {/* Completed Projects Card */}
      <Card className='p-4'>
        <div className='flex items-center justify-between'>
          <div className='space-y-2'>
            <Skeleton className='h-4 w-12' />
            <Skeleton className='h-8 w-8' />
          </div>
          <Users className='h-8 w-8 text-green-600 opacity-50' />
        </div>
      </Card>

      {/* Overdue Projects Card */}
      <Card className='p-4'>
        <div className='flex items-center justify-between'>
          <div className='space-y-2'>
            <Skeleton className='h-4 w-12' />
            <Skeleton className='h-8 w-8' />
          </div>
          <Clock className='h-8 w-8 text-red-600 opacity-50' />
        </div>
      </Card>
    </div>
  );

  /**
   * Render skeleton for page header
   */
  const renderHeaderSkeleton = () => (
    <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6'>
      {/* Page Title Section */}
      <div className='space-y-2'>
        <Skeleton className='h-8 w-24' />
        <Skeleton className='h-5 w-48' />
      </div>

      {/* Action Buttons Section */}
      <div className='flex items-center gap-3'>
        <div className='flex items-center gap-2 px-3 py-2 border border-input rounded-md bg-background'>
          <RefreshCw className='h-4 w-4 text-muted-foreground opacity-50' />
          <Skeleton className='h-4 w-12 hidden sm:block' />
        </div>

        <div className='flex items-center gap-2 px-3 py-2 border border-input rounded-md bg-background'>
          <Settings className='h-4 w-4 text-muted-foreground opacity-50' />
          <Skeleton className='h-4 w-8 hidden sm:block' />
        </div>
      </div>
    </div>
  );

  /**
   * Render skeleton for search and filter controls
   */
  const renderFilterControlsSkeleton = () => (
    <div className='space-y-4 mb-6'>
      {/* Search and View Toggle Row */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        {/* Search Input Skeleton */}
        <div className='flex-1 w-full sm:max-w-md'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-50' />
            <Skeleton className='h-10 w-full pl-10 rounded-md' />
          </div>
        </div>

        {/* View Mode Toggle Skeleton */}
        <div className='flex items-center gap-3'>
          <div className='flex items-center border border-input rounded-md bg-background'>
            <div className='flex items-center gap-1 px-2 py-2'>
              <Grid3x3 className='h-4 w-4 text-muted-foreground opacity-50' />
              <List className='h-4 w-4 text-muted-foreground opacity-50' />
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters Skeleton */}
      <Card className='p-4'>
        <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4'>
          {/* Status Filter */}
          <div className='space-y-2'>
            <Skeleton className='h-4 w-12' />
            <Skeleton className='h-9 w-full' />
          </div>

          {/* Type Filter */}
          <div className='space-y-2'>
            <Skeleton className='h-4 w-12' />
            <Skeleton className='h-9 w-full' />
          </div>

          {/* Manager Filter */}
          <div className='space-y-2'>
            <Skeleton className='h-4 w-16' />
            <Skeleton className='h-9 w-full' />
          </div>

          {/* Action Buttons */}
          <div className='flex items-end gap-2'>
            <Skeleton className='h-9 w-16' />
            <Skeleton className='h-9 w-12' />
          </div>
        </div>
      </Card>

      {/* Filter Summary Skeleton */}
      <div className='flex items-center gap-2'>
        <Filter className='h-4 w-4 text-muted-foreground opacity-50' />
        <Skeleton className='h-4 w-48' />
      </div>
    </div>
  );

  /**
   * Render skeleton for project grid content
   */
  const renderProjectGridSkeleton = () => (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
      {Array.from({ length: 8 }, (_, index) => (
        <Card key={index} className='p-6 space-y-4'>
          {/* Card Header */}
          <div className='flex items-center justify-between'>
            <Skeleton className='h-5 w-16' />
            <Skeleton className='h-5 w-12 rounded-full' />
          </div>

          {/* Project Info */}
          <div className='space-y-3'>
            <Skeleton className='h-6 w-3/4' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-2/3' />
          </div>

          {/* Progress Section */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Skeleton className='h-4 w-12' />
              <Skeleton className='h-4 w-8' />
            </div>
            <Skeleton className='h-2 w-full' />
          </div>

          {/* Tags */}
          <div className='flex gap-2 flex-wrap'>
            <Skeleton className='h-5 w-12 rounded-full' />
            <Skeleton className='h-5 w-16 rounded-full' />
          </div>

          {/* Team Members */}
          <div className='flex items-center gap-2'>
            <Skeleton className='h-6 w-6 rounded-full' />
            <Skeleton className='h-6 w-6 rounded-full' />
            <Skeleton className='h-6 w-6 rounded-full' />
            <Skeleton className='h-4 w-8' />
          </div>

          {/* Dates */}
          <div className='flex items-center justify-between text-sm'>
            <div className='flex items-center gap-1'>
              <Skeleton className='h-4 w-4' />
              <Skeleton className='h-4 w-16' />
            </div>
            <Skeleton className='h-4 w-16' />
          </div>

          {/* Action Button */}
          <Skeleton className='h-10 w-full' />
        </Card>
      ))}
    </div>
  );

  // ===== Main Render =====

  return (
    <div className='min-h-screen bg-background'>
      {/* Page Container */}
      <div className='container mx-auto px-4 py-6 lg:px-8 lg:py-8'>
        {/* Page Header Skeleton */}
        {renderHeaderSkeleton()}

        {/* Project Statistics Skeleton */}
        {renderStatsSkeletons()}

        {/* Search and Filter Controls Skeleton */}
        {renderFilterControlsSkeleton()}

        {/* Main Content Area */}
        <div className='space-y-6'>
          {/* Project Grid Skeleton */}
          {renderProjectGridSkeleton()}
        </div>
      </div>

      {/* Loading Overlay for Visual Feedback */}
      <div className='fixed top-4 right-4 z-50'>
        <Card className='p-3 shadow-lg'>
          <div className='flex items-center gap-2 text-sm text-muted-foreground'>
            <RefreshCw className='h-4 w-4 animate-spin' />
            <span>正在載入專案資料...</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
