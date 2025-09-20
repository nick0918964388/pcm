'use client'

import { useState } from 'react'
import Link from 'next/link'
import { navigationConfig } from '@/lib/navigation'
import NavigationDropdown from './NavigationDropdown'

export default function MainNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <nav className="bg-white border-b border-[#F0F0F0] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="max-w-full mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo 區域 */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2 sm:space-x-3">
              <div className="text-[#00645A] font-bold text-lg sm:text-xl">PCM</div>
              <div className="text-[#595959] text-xs sm:text-sm hidden md:block">
                工程關鍵指標平台
              </div>
            </Link>
          </div>

          {/* 桌面版主導覽選單 */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigationConfig.map((item) => (
              <NavigationDropdown key={item.id} item={item} />
            ))}
          </div>

          {/* 使用者資訊區域 - 桌面版 */}
          <div className="hidden sm:flex items-center space-x-3 sm:space-x-4">
            <div className="text-[#595959] text-xs sm:text-sm">
              歡迎, 使用者
            </div>
            <Link
              href="/login"
              className="text-[#00645A] hover:underline text-xs sm:text-sm font-medium transition-colors duration-200"
            >
              登出
            </Link>
          </div>

          {/* 行動版選單按鈕 */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-md text-[#595959] hover:text-[#00645A] focus:outline-none focus:ring-2 focus:ring-[#00645A]"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* 行動版選單 */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-[#F0F0F0] py-2">
            <div className="space-y-1">
              {navigationConfig.map((item) => (
                <div key={item.id}>
                  <div className="px-3 py-2 text-sm font-medium text-[#1A1A1A]">
                    {item.label}
                  </div>
                  {item.children && (
                    <div className="ml-4 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.id}
                          href={child.href || '#'}
                          className="block px-3 py-1.5 text-sm text-[#595959] hover:text-[#00645A] hover:bg-[#F5F5F5] rounded"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* 行動版使用者資訊 */}
            <div className="border-t border-[#F0F0F0] mt-3 pt-3 px-3">
              <div className="text-[#595959] text-sm mb-2">歡迎, 使用者</div>
              <Link
                href="/login"
                className="text-[#00645A] hover:underline text-sm font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                登出
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}