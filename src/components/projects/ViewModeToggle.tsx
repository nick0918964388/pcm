/**
 * @fileoverview 檢視模式切換組件 - 支援卡片檢視和表格檢視的切換
 */

'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Grid, List } from 'lucide-react'

export type ViewMode = 'card' | 'table'

interface ViewModeToggleProps {
  /** 當前檢視模式 */
  currentMode: ViewMode
  /** 模式切換回調函數 */
  onModeChange: (mode: ViewMode) => void
  /** 組件樣式類名 */
  className?: string
  /** 是否顯示標籤文字 */
  showLabels?: boolean
}

/**
 * 檢視模式切換組件
 * 
 * @param props - 組件屬性
 */
export function ViewModeToggle({ 
  currentMode, 
  onModeChange, 
  className = '', 
  showLabels = false 
}: ViewModeToggleProps) {
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* 卡片檢視按鈕 */}
      <Button
        variant={currentMode === 'card' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange('card')}
        className="flex items-center space-x-1.5"
        title="卡片檢視"
      >
        <Grid className="w-4 h-4" />
        {showLabels && <span>卡片</span>}
      </Button>

      {/* 表格檢視按鈕 */}
      <Button
        variant={currentMode === 'table' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange('table')}
        className="flex items-center space-x-1.5"
        title="表格檢視"
      >
        <List className="w-4 h-4" />
        {showLabels && <span>表格</span>}
      </Button>
    </div>
  )
}

export default ViewModeToggle