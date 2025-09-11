'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { ProjectSelector } from '@/components/projects/ProjectSelector'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  BarChart3, 
  FolderOpen, 
  Settings, 
  User,
  LogOut,
  Menu,
  Bell
} from 'lucide-react'
import { navigationConfig } from '@/lib/navigation'
import NavButton from '@/components/navigation/NavButton'
import { useToast } from '@/components/ui/toast'

interface NavbarProps {
  /** 是否顯示專案選擇器 */
  showProjectSelector?: boolean
  /** 是否顯示專案功能導航 */
  showProjectNavigation?: boolean
  /** 當前專案 ID */
  projectId?: string
  /** 自訂樣式類名 */
  className?: string
}

/**
 * 頂部導覽列元件
 * 
 * 提供網站主要導覽功能，包括：
 * - 專案選擇器
 * - 主要功能導覽
 * - 使用者選單
 * - 通知中心
 */
export function Navbar({ showProjectSelector = true, showProjectNavigation = false, projectId, className = '' }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { showToast } = useToast()

  // 處理登出
  const handleLogout = () => {
    // 使用 AuthStore 的登出功能
    const { logout } = useAuthStore.getState()
    logout()
  }

  // 處理未選擇專案時的選單點擊
  const handleDisabledMenuClick = () => {
    showToast({
      title: '需要選擇專案',
      description: '請先選擇一個專案才能使用此功能',
      variant: 'warning'
    })
  }

  return (
    <nav className={`bg-white border-b border-gray-200 shadow-sm ${className}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 左側 - Logo 和導覽 */}
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center space-x-2 flex-shrink-0">
              <div className="w-8 h-8 bg-[#00645A] rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">PCM</span>
              </div>
              <span className="text-gray-900 font-bold text-base hidden xl:block">
                工程關鍵指標平台
              </span>
            </Link>

            {/* 主導航選單 */}
            <div className="hidden md:flex items-center space-x-1">
              {navigationConfig.map((item) => (
                <div key={item.id} className={!showProjectNavigation ? 'opacity-50' : ''}>
                  {!showProjectNavigation ? (
                    <button 
                      onClick={handleDisabledMenuClick}
                      className="px-3 py-2 text-sm text-gray-400 cursor-not-allowed rounded-md"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <NavButton item={item} projectId={projectId} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 右側 - 專案選擇器和使用者選單 */}
          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
            {/* 專案選擇器 */}
            {showProjectSelector && (
              <div className="hidden md:block">
                <ProjectSelector inNavbar />
              </div>
            )}

            {/* 通知 */}
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 p-2"
            >
              <Bell className="h-4 w-4" />
            </Button>

            {/* 設定 */}
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 p-2"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* 使用者選單 */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                <User className="h-4 w-4" />
                <span className="hidden md:block">使用者</span>
              </Button>
              
              {/* 這裡可以加入下拉選單 */}
            </div>

            {/* 登出 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex items-center space-x-1 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:block">登出</span>
            </Button>

            {/* 行動版選單按鈕 */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-gray-600 hover:bg-gray-50 hover:text-gray-900 p-2"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 第二列專案選擇器 - 當選擇專案後顯示 */}
      {showProjectNavigation && projectId && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-t border-green-200">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                  P2
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-semibold text-gray-900">FAB21 Phase2 專案</h3>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">目前</span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-gray-600">
                    <span className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                      規劃中
                    </span>
                    <span>F21P2</span>
                    <span>進度: 25%</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <ProjectSelector inNavbar />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 行動版導覽選單 */}
      <div className="md:hidden border-t border-gray-200">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {/* 行動版階層導航 */}
          {navigationConfig.map((item) => (
            <div key={item.id} className="space-y-1">
              {item.href ? (
                <Link
                  href={item.href}
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <div className="px-3 py-2 text-base font-bold text-gray-900 bg-gray-50">
                  {item.label}
                </div>
              )}
              
              {item.children && (
                <div className="ml-4 space-y-1">
                  {item.children.map((child) => (
                    <div key={child.id} className="space-y-1">
                      {child.href ? (
                        <Link
                          href={projectId ? `/dashboard/${projectId}${child.href}` : child.href}
                          className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                        >
                          {child.label}
                        </Link>
                      ) : (
                        <div className="px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-25">
                          {child.label}
                        </div>
                      )}
                      
                      {child.children && (
                        <div className="ml-4 space-y-1">
                          {child.children.map((subChild) => (
                            <Link
                              key={subChild.id}
                              href={projectId ? `/dashboard/${projectId}${subChild.href}` : subChild.href || '#'}
                              className="block px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                            >
                              {subChild.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {/* 行動版專案選擇器 */}
          {showProjectSelector && (
            <div className="px-3 py-2 border-t border-gray-200 mt-4">
              <ProjectSelector inNavbar />
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}