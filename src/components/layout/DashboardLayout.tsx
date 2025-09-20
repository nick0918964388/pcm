'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  
  // 不需要任何導覽的頁面 (登入頁面)
  const noNavPages = ['/login', '/']
  
  // 需要專案選擇器但不需要專案功能導覽的頁面
  const projectSelectionPages = ['/project-selection']
  
  // 需要專案功能導覽的頁面 (所有 /dashboard/[projectId] 相關路由)
  const projectDashboardPages = pathname.match(/^\/dashboard\/[^/]+/)
  
  // 不需要任何導航的頁面
  if (noNavPages.includes(pathname)) {
    return <>{children}</>
  }
  
  // 專案選擇頁面 - 只顯示基本導覽
  if (projectSelectionPages.includes(pathname)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar 
          showProjectSelector={false}
          showProjectNavigation={false}
        />
        <main>
          {children}
        </main>
      </div>
    )
  }
  
  // 專案儀表板頁面 - 顯示完整的專案功能導覽，第二列顯示專案選擇器
  if (projectDashboardPages) {
    const projectId = pathname.split('/')[2] // 從 /dashboard/[projectId] 提取 projectId
    
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar 
          showProjectSelector={false}
          showProjectNavigation={true}
          projectId={projectId}
        />
        <main>
          {children}
        </main>
      </div>
    )
  }
  
  // 其他頁面 - 使用基本導覽，選單禁用直到選擇專案
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        showProjectSelector={true}
        showProjectNavigation={false}
      />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}