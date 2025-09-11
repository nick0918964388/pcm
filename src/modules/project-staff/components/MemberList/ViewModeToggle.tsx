/**
 * @fileoverview ViewModeToggle 組件實現
 * @version 1.0
 * @date 2025-08-31
 */

import React from 'react'
import { Button } from '@/components/ui/button'
import { LayoutGrid, List, Table } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ViewMode = 'card' | 'table' | 'grid'

export interface ViewModeToggleProps {
  currentMode: ViewMode
  onModeChange: (mode: ViewMode) => void
  disabledModes?: ViewMode[]
  showIcons?: boolean
  showLabels?: boolean
  compact?: boolean
  className?: string
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  currentMode,
  onModeChange,
  disabledModes = [],
  showIcons = true,
  showLabels = false,
  compact = false,
  className
}) => {
  const modes: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
    {
      value: 'card',
      label: '卡片',
      icon: <LayoutGrid className="h-4 w-4" data-testid="card-icon" />
    },
    {
      value: 'table',
      label: '表格',
      icon: <Table className="h-4 w-4" data-testid="table-icon" />
    },
    {
      value: 'grid',
      label: '網格',
      icon: <List className="h-4 w-4" data-testid="grid-icon" />
    }
  ]

  const handleModeChange = (mode: ViewMode) => {
    if (disabledModes.includes(mode)) return
    onModeChange(mode)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, mode: ViewMode) => {
    const currentIndex = modes.findIndex(m => m.value === mode)
    let newIndex = currentIndex
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        newIndex = currentIndex > 0 ? currentIndex - 1 : modes.length - 1
        break
      case 'ArrowRight':
        e.preventDefault()
        newIndex = currentIndex < modes.length - 1 ? currentIndex + 1 : 0
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        handleModeChange(mode)
        return
      default:
        return
    }

    // Focus next button
    const container = e.currentTarget.parentElement
    const buttons = container?.querySelectorAll('button')
    buttons?.[newIndex]?.focus()
  }

  return (
    <div 
      role="group"
      aria-label="檢視模式選擇"
      className={cn(
        "inline-flex rounded-md shadow-sm",
        compact && "compact",
        className
      )}
    >
      {modes.map((mode, index) => {
        const isActive = currentMode === mode.value
        const isDisabled = disabledModes.includes(mode.value)
        
        return (
          <Button
            key={mode.value}
            variant={isActive ? "default" : "outline"}
            size={compact ? "sm" : "default"}
            disabled={isDisabled}
            onClick={() => handleModeChange(mode.value)}
            onKeyDown={(e) => handleKeyDown(e, mode.value)}
            aria-label={`${mode.label}檢視`}
            aria-pressed={isActive}
            className={cn(
              "relative",
              index === 0 && "rounded-r-none",
              index === modes.length - 1 && "rounded-l-none",
              index !== 0 && index !== modes.length - 1 && "rounded-none",
              index !== 0 && "-ml-px",
              isActive && "z-10"
            )}
          >
            <div className="flex items-center space-x-1">
              {showIcons && mode.icon}
              {showLabels && (
                <span className={cn(showIcons && "ml-1")}>
                  {mode.label}
                </span>
              )}
            </div>
          </Button>
        )
      })}
    </div>
  )
}