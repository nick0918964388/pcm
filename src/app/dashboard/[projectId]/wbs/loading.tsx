import { CardSkeleton } from '@/components/ui/skeletons'
import { Skeleton, SkeletonButton } from '@/components/ui/skeleton'
import { NavbarSkeleton, BreadcrumbsSkeleton } from '@/components/ui/skeletons'

/**
 * WBS 工作分解結構載入頁面
 */
export default function WBSLoading() {
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
              <Skeleton className="h-5 w-64" />
            </div>
            <div className="flex gap-2">
              <SkeletonButton className="w-24" />
              <SkeletonButton className="w-20" />
            </div>
          </div>

          {/* WBS 統計卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} showHeader={false} contentLines={2} />
            ))}
          </div>

          {/* WBS 工具列 */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex flex-col lg:flex-row gap-4 justify-between">
              <div className="flex gap-2">
                <SkeletonButton size="sm" className="w-20" />
                <SkeletonButton size="sm" className="w-16" />
                <SkeletonButton size="sm" className="w-18" />
                <Skeleton className="h-8 w-px bg-gray-300" />
                <SkeletonButton size="sm" className="w-16" />
                <SkeletonButton size="sm" className="w-20" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-32" />
                <SkeletonButton size="sm" className="w-16" />
              </div>
            </div>
          </div>

          {/* WBS 樹狀結構 */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-28" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            </div>
            
            <div className="p-4">
              {/* WBS 樹狀節點骨架 */}
              <div className="space-y-2">
                {/* 第一層節點 */}
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center gap-2 p-3 border rounded-lg">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-6 w-6 rounded" />
                      <div className="flex-1 flex items-center gap-4">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-5 w-12 rounded-full" />
                      </div>
                      <div className="flex gap-1">
                        <Skeleton className="h-6 w-6 rounded" />
                        <Skeleton className="h-6 w-6 rounded" />
                        <Skeleton className="h-6 w-6 rounded" />
                      </div>
                    </div>
                    
                    {/* 第二層子節點 */}
                    <div className="ml-8 space-y-2">
                      {Array.from({ length: 2 }).map((_, j) => (
                        <div key={j} className="flex items-center gap-2 p-2 border rounded">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-5 w-5 rounded" />
                          <div className="flex-1 flex items-center gap-4">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-3 w-10" />
                            <Skeleton className="h-4 w-10 rounded-full" />
                          </div>
                          <div className="flex gap-1">
                            <Skeleton className="h-5 w-5 rounded" />
                            <Skeleton className="h-5 w-5 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* WBS 進度概覽 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardSkeleton 
              showHeader 
              showActions 
              contentLines={5} 
              className="h-64"
            />
            <CardSkeleton 
              showHeader 
              showActions 
              contentLines={5} 
              className="h-64"
            />
          </div>
        </div>
      </div>
    </div>
  )
}