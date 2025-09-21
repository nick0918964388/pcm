/**
 * Project Navigation Dropdown Component
 * 專案導航下拉選單元件 - 支援專案級路由
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { NavigationItem } from '@/lib/navigation'

interface ProjectNavigationDropdownProps {
  item: NavigationItem
  className?: string
}

export default function ProjectNavigationDropdown({
  item,
  className = ''
}: ProjectNavigationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const params = useParams()
  const projectId = params.projectId as string

  // If no children, render as simple link
  if (!item.children || item.children.length === 0) {
    const href = item.href ? getProjectAwareHref(item.href, projectId) : '#'
    return (
      <Link
        href={href}
        className={`px-3 py-2 text-sm font-medium text-[#595959] hover:text-[#00645A] transition-colors duration-200 ${className}`}
      >
        {item.label}
      </Link>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="flex items-center px-3 py-2 text-sm font-medium text-[#595959] hover:text-[#00645A] transition-colors duration-200"
      >
        {item.label}
        <ChevronDown
          className={`ml-1 h-4 w-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-64 bg-white border border-[#F0F0F0] rounded-md shadow-lg z-50"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="py-2">
            {item.children.map((child) => {
              const href = child.href ? getProjectAwareHref(child.href, projectId) : '#'
              return (
                <Link
                  key={child.id}
                  href={href}
                  className="block px-4 py-2 text-sm text-[#595959] hover:text-[#00645A] hover:bg-[#F5F5F5] transition-colors duration-200"
                  onClick={() => setIsOpen(false)}
                >
                  {child.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 將相對路徑轉換為專案級路徑
 * Convert relative paths to project-aware paths
 */
function getProjectAwareHref(href: string, projectId?: string): string {
  // If it's an absolute path, return as-is
  if (href.startsWith('/')) {
    return href
  }

  // If we have a project ID and it's a relative path, make it project-relative
  if (projectId && !href.startsWith('/')) {
    return `/dashboard/${projectId}/${href}`
  }

  // Fallback to original href
  return href.startsWith('/') ? href : `/${href}`
}