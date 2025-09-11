'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NavigationItem } from '@/lib/navigation'
import { useToast } from '@/components/ui/toast'
import MultiLevelDropdown from './MultiLevelDropdown'

interface NavButtonProps {
  item: NavigationItem
  projectId?: string
}

export default function NavButton({ item, projectId }: NavButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { showToast } = useToast()

  // 生成動態路由
  const generateHref = (href: string) => {
    if (!href || !projectId) return href || '#'
    return `/dashboard/${projectId}${href}`
  }

  // 處理需要專案上下文的連結點擊
  const handleLinkClick = (e: React.MouseEvent, href?: string) => {
    if (href && !projectId) {
      e.preventDefault()
      showToast({
        title: '需要選擇專案',
        description: '請先從右上角選擇一個專案，然後就可以使用此功能了',
        variant: 'warning'
      })
    }
  }

  // 如果有直接連結，渲染為連結
  if (item.href && !item.children?.length) {
    return (
      <Link
        href={generateHref(item.href)}
        onClick={(e) => handleLinkClick(e, item.href)}
        className="px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors duration-200 font-medium rounded-md whitespace-nowrap"
      >
        {item.label}
      </Link>
    )
  }

  // 如果有子選單，渲染為下拉選單
  return (
    <div 
      className="relative group"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className="px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors duration-200 font-medium rounded-md whitespace-nowrap"
        aria-expanded={isOpen}
      >
        {item.label}
      </button>
      
      {isOpen && item.children && (
        <MultiLevelDropdown
          item={item}
          projectId={projectId}
          onClose={() => setIsOpen(false)}
          onLinkClick={handleLinkClick}
        />
      )}
    </div>
  )
}