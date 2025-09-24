'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NavigationItem } from '@/lib/navigation';
import { ChevronRight } from 'lucide-react';

interface MultiLevelDropdownProps {
  item: NavigationItem;
  projectId?: string;
  onClose?: () => void;
  onLinkClick?: (e: React.MouseEvent, href?: string) => void;
}

export default function MultiLevelDropdown({
  item,
  projectId,
  onClose,
  onLinkClick,
}: MultiLevelDropdownProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // 處理連結點擊
  const handleLinkClick = (e: React.MouseEvent, href?: string) => {
    if (onLinkClick) {
      onLinkClick(e, href);
    }
    if (onClose) {
      onClose();
    }
  };

  // 生成動態路由
  const generateHref = (href: string) => {
    if (!href || !projectId) return href || '#';
    return `/dashboard/${projectId}${href}`;
  };

  return (
    <div className='absolute top-full left-0 bg-white shadow-lg border border-gray-200 min-w-48 z-[150] rounded-md'>
      {item.children?.map(child => (
        <div
          key={child.id}
          className='relative group'
          onMouseEnter={() => setHoveredItem(child.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          {/* 主選單項目 */}
          <div className='flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0'>
            {child.href ? (
              <Link
                href={generateHref(child.href)}
                className='flex-1 text-gray-700 hover:text-blue-600 transition-colors'
                onClick={e => handleLinkClick(e, child.href)}
              >
                {child.label}
              </Link>
            ) : (
              <span className='flex-1 text-gray-700 font-medium cursor-default'>
                {child.label}
              </span>
            )}

            {/* 如果有子項目，顯示箭頭 */}
            {child.children && child.children.length > 0 && (
              <ChevronRight className='w-4 h-4 text-gray-400 ml-2' />
            )}
          </div>

          {/* 第三層子選單 */}
          {child.children && hoveredItem === child.id && (
            <div
              className='absolute top-0 left-full bg-white shadow-lg border border-gray-200 min-w-48 z-[160] rounded-md ml-1'
              onMouseEnter={() => setHoveredItem(child.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {child.children.map(subChild => (
                <Link
                  key={subChild.id}
                  href={generateHref(subChild.href || '#')}
                  className='block px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors border-b border-gray-100 last:border-b-0'
                  onClick={e => handleLinkClick(e, subChild.href)}
                >
                  {subChild.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
