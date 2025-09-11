import { CardSkeleton } from '@/components/ui/skeletons'
import { Skeleton, SkeletonButton } from '@/components/ui/skeleton'
import { NavbarSkeleton, BreadcrumbsSkeleton } from '@/components/ui/skeletons'

/**
 * 專案供應商管理載入頁面
 */
export default function VendorsLoading() {
  return (
    <div className="min-h-screen bg-white">
      <NavbarSkeleton showProjectSelector showProjectNavigation />
      <BreadcrumbsSkeleton />
      
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="py-6 space-y-6">
          {/* 頁面標題區域 */}
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-8 w-28 mb-2" />
              <Skeleton className="h-5 w-52" />
            </div>
            <div className="flex gap-2">
              <SkeletonButton className="w-24" />
              <SkeletonButton className="w-20" />
            </div>
          </div>

          {/* 供應商統計卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} showHeader={false} contentLines={2} />
            ))}
          </div>

          {/* 搜尋和篩選區域 */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 max-w-md">
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-20" />
                <SkeletonButton className="w-16" />
              </div>
            </div>
          </div>

          {/* 供應商表格 */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            </div>
            
            {/* 表格標題列 */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b bg-gray-25 font-medium text-sm">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20 col-span-2" />
              <Skeleton className="h-4 w-16 col-span-2" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16 col-span-2" />
              <Skeleton className="h-4 w-14 col-span-2" />
              <Skeleton className="h-4 w-12" />
            </div>

            {/* 表格內容 */}
            <div className="divide-y">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50">
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 rounded mr-2" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <div className="col-span-2">
                    <Skeleton className="h-5 w-full mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="col-span-2">
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="col-span-2">
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <div className="col-span-2">
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="flex gap-1">
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-6 w-6 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 分頁控制 */}
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-2">
              <SkeletonButton size="sm" className="w-16" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
              <SkeletonButton size="sm" className="w-16" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}