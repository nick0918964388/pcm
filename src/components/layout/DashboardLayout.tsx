'use client'

import { usePathname } from 'next/navigation'
import MainNavigation from '@/components/navigation/MainNavigation'
import Breadcrumbs from '@/components/navigation/Breadcrumbs'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  
  // 不需要導覽的頁面
  const noNavPages = ['/login', '/']
  const shouldShowNav = !noNavPages.includes(pathname)

  if (!shouldShowNav) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainNavigation />
      <Breadcrumbs />
      <main className="max-w-7xl mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  )
}