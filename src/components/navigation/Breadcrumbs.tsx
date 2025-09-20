'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navigationConfig, NavigationItem } from '@/lib/navigation'

interface BreadcrumbItem {
  label: string
  href: string
  isCurrentPage: boolean
}

// 遞迴搜尋導覽項目
function findNavigationPath(items: NavigationItem[], targetHref: string): NavigationItem[] {
  for (const item of items) {
    if (item.href === targetHref) {
      return [item]
    }
    
    if (item.children) {
      const childPath = findNavigationPath(item.children, targetHref)
      if (childPath.length > 0) {
        return [item, ...childPath]
      }
    }
  }
  return []
}

export default function Breadcrumbs() {
  const pathname = usePathname()
  
  // 特殊頁面處理
  if (pathname === '/login' || pathname === '/') {
    return null
  }

  // 手動定義首頁麵包屑
  if (pathname === '/dashboard') {
    return (
      <nav className="bg-[#F5F5F5] px-6 py-3 border-b border-[#F0F0F0]">
        <div className="w-full">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <span className="text-[#00645A] font-medium">專案儀表板</span>
            </li>
          </ol>
        </div>
      </nav>
    )
  }

  // 尋找當前路徑對應的導覽項目
  const navigationPath = findNavigationPath(navigationConfig, pathname)
  
  if (navigationPath.length === 0) {
    return null
  }

  const breadcrumbItems: BreadcrumbItem[] = [
    {
      label: '專案儀表板',
      href: '/dashboard',
      isCurrentPage: false
    },
    ...navigationPath.map((item, index) => ({
      label: item.label,
      href: item.href || '#',
      isCurrentPage: index === navigationPath.length - 1
    }))
  ]

  return (
    <nav className="bg-[#F5F5F5] px-6 py-3 border-b border-[#F0F0F0]">
      <div className="w-full">
        <ol className="flex items-center space-x-2 text-sm">
          {breadcrumbItems.map((item, index) => (
            <li key={item.href} className="flex items-center">
              {index > 0 && (
                <svg
                  className="w-4 h-4 mx-2 text-[#8C8C8C]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {item.isCurrentPage ? (
                <span className="text-[#00645A] font-medium">{item.label}</span>
              ) : (
                <Link
                  href={item.href}
                  className="text-[#595959] hover:text-[#00645A] transition-colors duration-200"
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}