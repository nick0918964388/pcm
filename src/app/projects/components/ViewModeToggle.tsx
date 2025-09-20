/**
 * ViewModeToggle Component
 * 
 * 允許使用者在網格（卡片）檢視模式和表格檢視模式之間切換的元件
 * 支援 US1 (AC1.3) 的兩種檢視模式需求，以及 US4 (AC4.1, AC4.2) 的響應式設計需求
 * 
 * @module ViewModeToggle
 * @version 1.0
 * @date 2025-08-29
 */

'use client'

import * as React from 'react'
import { LayoutGrid, Table2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ViewMode } from '@/types/project'

// ==================== INTERFACES ====================

/**
 * ViewModeToggle 元件屬性介面
 * 
 * @interface ViewModeToggleProps
 */
export interface ViewModeToggleProps {
  /** 目前的檢視模式 */
  currentMode: ViewMode
  /** 模式變更事件處理函數 */
  onModeChange: (mode: ViewMode) => void
  /** 自定義 CSS 類名 */
  className?: string
  /** 元件大小 */
  size?: 'sm' | 'md' | 'lg'
  /** 是否禁用 */
  disabled?: boolean
}

// ==================== CONSTANTS ====================

/**
 * 檢視模式設定
 */
const VIEW_MODE_CONFIG = {
  [ViewMode.GRID]: {
    icon: LayoutGrid,
    label: '網格檢視',
    ariaLabel: '切換到網格檢視模式',
    description: '以卡片形式顯示專案'
  },
  [ViewMode.TABLE]: {
    icon: Table2,
    label: '表格檢視', 
    ariaLabel: '切換到表格檢視模式',
    description: '以表格形式顯示專案'
  }
} as const

/**
 * 大小變體對應的樣式
 */
const SIZE_VARIANTS = {
  sm: {
    container: 'text-xs',
    button: 'h-7 px-2',
    icon: 'w-3 h-3'
  },
  md: {
    container: 'text-sm',
    button: 'h-8 px-3',
    icon: 'w-4 h-4'
  },
  lg: {
    container: 'text-base',
    button: 'h-10 px-4',
    icon: 'w-5 h-5'
  }
} as const

// ==================== COMPONENT ====================

/**
 * ViewModeToggle 元件
 * 
 * 提供網格檢視和表格檢視之間的切換功能，支援響應式設計和無障礙功能
 * 
 * @param props ViewModeToggleProps
 * @returns JSX.Element
 */
export const ViewModeToggle = React.memo<ViewModeToggleProps>(({
  currentMode,
  onModeChange,
  className,
  size = 'md',
  disabled = false
}) => {
  // ===== Event Handlers =====
  
  /**
   * 處理模式變更
   * 
   * @param mode 要切換到的檢視模式
   */
  const handleModeChange = React.useCallback((mode: ViewMode) => {
    if (!disabled && mode !== currentMode) {
      onModeChange(mode)
    }
  }, [currentMode, onModeChange, disabled])

  /**
   * 處理鍵盤導航
   * 
   * @param event 鍵盤事件
   * @param mode 目標檢視模式
   */
  const handleKeyDown = React.useCallback((
    event: React.KeyboardEvent<HTMLButtonElement>,
    mode: ViewMode
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleModeChange(mode)
    }
  }, [handleModeChange])

  // ===== Styles =====
  
  const sizeConfig = SIZE_VARIANTS[size]
  
  const containerClasses = cn(
    // 基礎樣式
    'inline-flex items-center rounded-md border border-input bg-background p-1',
    // 響應式樣式
    'transition-colors duration-200',
    // 大小樣式
    sizeConfig.container,
    // 禁用狀態
    disabled && 'opacity-50 cursor-not-allowed',
    // 自定義類名
    className
  )

  // ===== Render =====
  
  return (
    <div
      className={containerClasses}
      role="radiogroup"
      aria-label="選擇專案檢視模式"
      data-testid="view-mode-toggle"
    >
      {Object.entries(VIEW_MODE_CONFIG).map(([mode, config]) => {
        const viewMode = mode as ViewMode
        const isActive = currentMode === viewMode
        const Icon = config.icon
        
        return (
          <Button
            key={mode}
            variant={isActive ? 'default' : 'ghost'}
            className={cn(
              // 基礎按鈕樣式
              'flex items-center justify-center gap-2 rounded-sm transition-all duration-200',
              // 大小樣式
              sizeConfig.button,
              // 活動狀態樣式
              isActive ? [
                'bg-primary text-primary-foreground shadow-sm',
                'hover:bg-primary/90'
              ] : [
                'text-muted-foreground',
                'hover:bg-accent hover:text-accent-foreground'
              ],
              // 焦點樣式
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              // 響應式調整
              'sm:gap-2',
              // 觸控優化
              'touch-manipulation'
            )}
            onClick={() => handleModeChange(viewMode)}
            onKeyDown={(e) => handleKeyDown(e, viewMode)}
            disabled={disabled}
            role="radio"
            aria-checked={isActive}
            aria-label={config.ariaLabel}
            title={config.description}
            data-testid={`view-mode-${mode}`}
          >
            <Icon className={cn('shrink-0', sizeConfig.icon)} />
            <span className={cn(
              'hidden font-medium',
              // 響應式文字顯示
              size === 'lg' && 'sm:inline',
              size === 'md' && 'md:inline',
              size === 'sm' && 'lg:inline'
            )}>
              {config.label}
            </span>
          </Button>
        )
      })}
    </div>
  )
})

// ===== Display Name =====
ViewModeToggle.displayName = 'ViewModeToggle'

// ==================== EXPORTS ====================

export default ViewModeToggle

// ViewModeToggleProps is already exported above with the interface declaration

// 導出檢視模式設定供測試使用
export { VIEW_MODE_CONFIG, SIZE_VARIANTS }