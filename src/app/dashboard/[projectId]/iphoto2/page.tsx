/**
 * iPhoto 2.0 Main Page Component
 *
 * Main entry point for the enhanced photo management system under Communication module.
 * Provides modern shadcn/ui interface with responsive design for desktop and mobile devices.
 *
 * Requirements covered:
 * - 4.1: Modern shadcn/ui interface layout under Communication module
 * - 4.2: Responsive design for desktop and mobile devices
 * - 4.5: Navigation and breadcrumb functionality
 *
 * @version 1.0
 * @date 2025-09-24
 */

'use client';

import { useRouter, usePathname, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Camera, Image, FolderOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function IPhoto2Page() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.projectId as string;
  const { user, isAuthenticated } = useAuth();

  const handleNavigateToAlbums = () => {
    router.push(`/dashboard/${projectId}/iphoto2/albums`);
  };

  const handleNavigateToUpload = () => {
    router.push(`/dashboard/${projectId}/iphoto2/upload`);
  };

  const handleNavigateToBrowse = () => {
    router.push(`/dashboard/${projectId}/iphoto2/browse`);
  };

  if (!isAuthenticated) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <h1>請先登入</h1>
      </div>
    );
  }

  return (
    <main aria-label='iPhoto 2.0 主頁面'>
      <div
        className='container mx-auto px-4 py-8'
        data-testid='iphoto2-main-container'
      >
        {/* Breadcrumb Navigation */}
        <Breadcrumb className='mb-6'>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href='/dashboard'>首頁</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/dashboard/${projectId}`}>專案儀表板</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>iPhoto 2.0</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold tracking-tight mb-2'>iPhoto 2.0</h1>
          <p className='text-muted-foreground'>
            現代化照片管理系統 - 專為工程專案設計
          </p>
        </div>

        {/* Desktop Navigation */}
        <div className='hidden md:block' data-testid='desktop-navigation'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {/* Album Management Card */}
            <Card
              data-testid='feature-card'
              className='hover:shadow-lg transition-shadow'
            >
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <FolderOpen className='h-5 w-5' />
                  <h2>相簿管理</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-muted-foreground mb-4'>
                  建立、編輯和管理專案相簿，組織您的照片資料
                </p>
                <Button
                  onClick={handleNavigateToAlbums}
                  className='w-full inline-flex items-center justify-center'
                >
                  相簿管理
                </Button>
              </CardContent>
            </Card>

            {/* Photo Upload Card */}
            <Card
              data-testid='feature-card'
              className='hover:shadow-lg transition-shadow'
            >
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Camera className='h-5 w-5' />
                  <h2>照片上傳</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-muted-foreground mb-4'>
                  支援拖拽批次上傳，自動整理照片資訊
                </p>
                <Button
                  onClick={handleNavigateToUpload}
                  className='w-full inline-flex items-center justify-center'
                >
                  照片上傳
                </Button>
              </CardContent>
            </Card>

            {/* Photo Browse Card */}
            <Card
              data-testid='feature-card'
              className='hover:shadow-lg transition-shadow'
            >
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Image className='h-5 w-5' />
                  <h2>照片瀏覽</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-muted-foreground mb-4'>
                  瀏覽、搜尋和管理已上傳的照片
                </p>
                <Button
                  onClick={handleNavigateToBrowse}
                  className='w-full inline-flex items-center justify-center'
                  variant='outline'
                >
                  照片瀏覽
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className='md:hidden' data-testid='mobile-navigation'>
          <div className='space-y-4'>
            {/* Mobile Album Management */}
            <Card data-testid='feature-card'>
              <CardContent className='pt-6'>
                <div className='flex items-center gap-3 mb-3'>
                  <FolderOpen className='h-6 w-6' />
                  <h2 className='text-lg font-semibold'>相簿管理</h2>
                </div>
                <p className='text-sm text-muted-foreground mb-4'>
                  建立、編輯和管理專案相簿
                </p>
                <Button
                  onClick={handleNavigateToAlbums}
                  className='w-full inline-flex items-center justify-center'
                >
                  相簿管理
                </Button>
              </CardContent>
            </Card>

            {/* Mobile Photo Upload */}
            <Card data-testid='feature-card'>
              <CardContent className='pt-6'>
                <div className='flex items-center gap-3 mb-3'>
                  <Camera className='h-6 w-6' />
                  <h2 className='text-lg font-semibold'>照片上傳</h2>
                </div>
                <p className='text-sm text-muted-foreground mb-4'>
                  支援拖拽批次上傳
                </p>
                <Button
                  onClick={handleNavigateToUpload}
                  className='w-full inline-flex items-center justify-center'
                >
                  照片上傳
                </Button>
              </CardContent>
            </Card>

            {/* Mobile Photo Browse */}
            <Card data-testid='feature-card'>
              <CardContent className='pt-6'>
                <div className='flex items-center gap-3 mb-3'>
                  <Image className='h-6 w-6' />
                  <h2 className='text-lg font-semibold'>照片瀏覽</h2>
                </div>
                <p className='text-sm text-muted-foreground mb-4'>
                  瀏覽和管理已上傳的照片
                </p>
                <Button
                  onClick={handleNavigateToBrowse}
                  className='w-full inline-flex items-center justify-center'
                  variant='outline'
                >
                  照片瀏覽
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
