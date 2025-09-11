import { CardSkeleton } from '@/components/ui/skeletons'
import { Skeleton, SkeletonButton } from '@/components/ui/skeleton'
import { NavbarSkeleton, BreadcrumbsSkeleton } from '@/components/ui/skeletons'

/**
 * 專案團隊成員管理載入頁面
 */
export default function StaffLoading() {
  return (
    <div className="min-h-screen bg-white">
      <NavbarSkeleton showProjectSelector showProjectNavigation />
      <BreadcrumbsSkeleton />
      
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="py-6 space-y-6">
          {/* 頁面標題區域 */}
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-5 w-48" />
            </div>
            <SkeletonButton className="w-24" />
          </div>

          {/* 統計卡片區域 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} showHeader={false} contentLines={2} />
            ))}
          </div>

          {/* 搜尋和篩選區域 */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex flex-col lg:flex-row gap-4 justify-between">
              <div className="flex-1 max-w-md">
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-20" />
                <SkeletonButton className="w-16" />
              </div>
            </div>
          </div>

          {/* 團隊成員表格/網格 */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                        <div className="flex gap-1 mt-2">
                          <Skeleton className="h-5 w-12 rounded-full" />
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 分頁 */}
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2">
              <SkeletonButton size="sm" className="w-16" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <SkeletonButton size="sm" className="w-16" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}