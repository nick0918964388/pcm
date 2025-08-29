'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NavigationItem } from '@/lib/navigation'

interface NavigationDropdownProps {
  item: NavigationItem
}

export default function NavigationDropdown({ item }: NavigationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className="px-4 py-2 text-[#1A1A1A] hover:text-[#00645A] transition-colors duration-200 font-medium relative hover:shadow-[inset_0_-2px_0_0_#00645A]"
        aria-expanded={isOpen}
      >
        {item.label}
      </button>
      
      {isOpen && item.children && (
        <div className="absolute top-full left-0 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-[#F0F0F0] min-w-48 z-50 rounded overflow-hidden">
          {item.children.map((child) => (
            <Link
              key={child.id}
              href={child.href || '#'}
              className="block px-4 py-3 text-[#595959] hover:bg-[#F5F5F5] hover:text-[#00645A] transition-colors duration-150 border-b border-[#F0F0F0] last:border-b-0"
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}