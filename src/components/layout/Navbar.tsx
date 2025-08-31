'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { ProjectSelector } from '@/components/projects/ProjectSelector'
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

interface NavbarProps {
  /** 是否顯示專案選擇器 */
  showProjectSelector?: boolean
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
export function Navbar({ showProjectSelector = true, className = '' }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()

  // 導覽選項
  const navigationItems = [
    {
      name: '首頁',
      href: '/dashboard',
      icon: Home,
      active: pathname.includes('/dashboard'),
    },
    {
      name: '專案',
      href: '/projects',
      icon: FolderOpen,
      active: pathname.includes('/projects'),
    },
    {
      name: '報表',
      href: '/reports',
      icon: BarChart3,
      active: pathname.includes('/reports'),
    },
  ]

  // 處理登出
  const handleLogout = () => {
    // 清除所有儲存的狀態
    sessionStorage.clear()
    localStorage.clear()
    
    // 導向登入頁面
    router.push('/login')
  }

  return (
    <nav className={`bg-[#00645A] shadow-lg ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 左側 - Logo 和導覽 */}
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                <span className="text-[#00645A] font-bold text-sm">PCM</span>
              </div>
              <span className="text-white font-bold text-lg hidden md:block">
                工程關鍵指標平台
              </span>
            </Link>

            {/* 主要導覽 */}
            <div className="hidden md:flex items-center space-x-4">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    item.active
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* 中間 - 專案選擇器 */}
          {showProjectSelector && (
            <div className="flex-1 max-w-md mx-4">
              <ProjectSelector inNavbar />
            </div>
          )}

          {/* 右側 - 使用者選單 */}
          <div className="flex items-center space-x-4">
            {/* 通知 */}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 p-2"
            >
              <Bell className="h-4 w-4" />
            </Button>

            {/* 設定 */}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 p-2"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* 使用者選單 */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 text-white hover:bg-white/10"
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
              className="flex items-center space-x-1 text-white hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:block">登出</span>
            </Button>

            {/* 行動版選單按鈕 */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-white hover:bg-white/10 p-2"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 行動版導覽選單 */}
      <div className="md:hidden border-t border-white/20">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                item.active
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}