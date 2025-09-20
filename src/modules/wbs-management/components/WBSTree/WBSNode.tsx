/**
 * @fileoverview WBS 節點組件
 * @version 1.0
 * @date 2025-09-01
 * 
 * WBS 樹狀結構中的單個節點組件，支援展開/摺疊、選擇、拖拽、編輯等功能
 */

'use client'

import React, { useCallback, useState, useMemo } from 'react'
import { 
  ChevronRight, 
  ChevronDown, 
  MoreHorizontal, 
  User, 
  Calendar, 
  Clock,
  AlertCircle,
  CheckCircle,
  Pause,
  X
} from 'lucide-react'
import { WBSItem, WBSStatus } from '@/types/wbs'
import { WBSNodeContent } from './WBSNodeContent'
import { cn } from '@/lib/utils'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

// ==================== TYPES ====================

export interface WBSNodeProps {
  /** WBS 節點資料 */
  node: WBSItem
  /** 層級深度 */
  level: number
  /** 是否展開 */
  expanded?: boolean
  /** 是否選中 */
  selected?: boolean
  /** 展開/摺疊回調 */
  onToggle?: () => void
  /** 選擇回調 */
  onSelect?: (selected: boolean) => void
  /** 編輯回調 */
  onEdit?: (node: WBSItem) => void
  /** 刪除回調 */
  onDelete?: (node: WBSItem) => void
  /** 新增子節點回調 */
  onAdd?: (parentId?: string) => void
  /** 是否可拖拽 */
  draggable?: boolean
  /** 是否唯讀 */
  readonly?: boolean
  /** 拖拽狀態 */
  dragState?: any
  /** 拖拽開始回調 */
  onDragStart?: (nodeId: string) => void
  /** 拖拽進入回調 */
  onDragEnter?: (nodeId: string) => void
  /** 拖拽懸停回調 */
  onDragOver?: (nodeId: string, position: 'before' | 'after' | 'inside') => void
  /** 拖拽離開回調 */
  onDragLeave?: () => void
  /** 拖放回調 */
  onDrop?: (targetId: string, position: 'before' | 'after' | 'inside') => void
  /** 組件類名 */
  className?: string
}

/**
 * 拖放位置類型
 */
type DropPosition = 'before' | 'after' | 'inside' | null

// ==================== COMPONENT ====================

export const WBSNode: React.FC<WBSNodeProps> = ({
  node,
  level,
  expanded = false,
  selected = false,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
  onAdd,
  draggable = true,
  readonly = false,
  dragState,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  className
}) => {
  // ===== STATES =====
  const [isHovered, setIsHovered] = useState(false)
  const [dropPosition, setDropPosition] = useState<DropPosition>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // ===== COMPUTED VALUES =====
  const hasChildren = node.children && node.children.length > 0
  const indent = level * 24 // 每層級縮進 24px
  
  // 狀態圖標和顏色
  const statusConfig = useMemo(() => {
    switch (node.status) {
      case WBSStatus.COMPLETED:
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800'
        }
      case WBSStatus.IN_PROGRESS:
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800'
        }
      case WBSStatus.ON_HOLD:
        return {
          icon: Pause,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800'
        }
      case WBSStatus.CANCELLED:
        return {
          icon: X,
          color: 'text-red-600',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800'
        }
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-700'
        }
    }
  }, [node.status])

  const StatusIcon = statusConfig.icon

  // 進度計算
  const progressPercentage = useMemo(() => {
    if (node.actualHours && node.estimatedHours) {
      return Math.min((node.actualHours / node.estimatedHours) * 100, 100)
    }
    return node.progress || 0
  }, [node.actualHours, node.estimatedHours, node.progress])

  // ===== HANDLERS =====
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle?.()
  }, [onToggle])

  const handleSelect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect?.(!selected)
  }, [onSelect, selected])

  const handleEdit = useCallback(() => {
    if (!readonly) {
      onEdit?.(node)
    }
  }, [readonly, onEdit, node])

  const handleDelete = useCallback(() => {
    if (!readonly) {
      onDelete?.(node)
    }
  }, [readonly, onDelete, node])

  const handleAddChild = useCallback(() => {
    if (!readonly) {
      onAdd?.(node.id)
    }
  }, [readonly, onAdd, node.id])

  // 拖拽處理
  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!draggable || readonly) {
      e.preventDefault()
      return
    }
    
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', node.id)
    onDragStart?.(node.id)
  }, [draggable, readonly, node.id, onDragStart])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!draggable || readonly || dragState?.draggedNodeId === node.id) return
    
    setIsDragOver(true)
    onDragEnter?.(node.id)
  }, [draggable, readonly, dragState?.draggedNodeId, node.id, onDragEnter])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!draggable || readonly || dragState?.draggedNodeId === node.id) return

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height
    
    let position: 'before' | 'after' | 'inside'
    
    if (y < height * 0.25) {
      position = 'before'
    } else if (y > height * 0.75) {
      position = 'after'
    } else {
      position = 'inside'
    }
    
    setDropPosition(position)
    onDragOver?.(node.id, position)
  }, [draggable, readonly, dragState?.draggedNodeId, node.id, onDragOver])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    // 只有當滑鼠真的離開元素範圍時才觸發
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false)
      setDropPosition(null)
      onDragLeave?.()
    }
  }, [onDragLeave])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!draggable || readonly || !dropPosition) return
    
    setIsDragOver(false)
    setDropPosition(null)
    onDrop?.(node.id, dropPosition)
  }, [draggable, readonly, dropPosition, node.id, onDrop])

  // ===== RENDER =====
  return (
    <div
      className={cn(
        'group relative transition-colors duration-200',
        selected && 'bg-blue-50 dark:bg-blue-900/20',
        isHovered && !selected && 'bg-gray-50 dark:bg-gray-800/50',
        isDragOver && 'bg-yellow-50 dark:bg-yellow-900/20',
        dragState?.draggedNodeId === node.id && 'opacity-50',
        className
      )}
      style={{ marginLeft: `${indent}px` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragStart={handleDragStart}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      draggable={draggable && !readonly}
      data-testid={`wbs-node-${node.id}`}
    >
      {/* 拖放指示線 */}
      {isDragOver && dropPosition === 'before' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 z-10" />
      )}
      {isDragOver && dropPosition === 'after' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 z-10" />
      )}
      {isDragOver && dropPosition === 'inside' && (
        <div className="absolute inset-0 border-2 border-blue-500 border-dashed rounded bg-blue-500/10 z-10" />
      )}

      {/* 節點內容 */}
      <div 
        className={cn(
          'flex items-center py-2 px-3 border rounded-lg',
          statusConfig.bgColor,
          statusConfig.borderColor,
          selected && 'border-blue-300 dark:border-blue-600',
          'hover:shadow-sm transition-shadow duration-200'
        )}
        onClick={handleSelect}
      >
        {/* 展開/摺疊按鈕 */}
        <div className="flex items-center justify-center w-6 h-6 mr-2">
          {hasChildren ? (
            <button
              onClick={handleToggle}
              className="flex items-center justify-center w-6 h-6 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              aria-label={expanded ? '摺疊' : '展開'}
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        {/* 狀態圖標 */}
        <div className={cn('mr-3', statusConfig.color)}>
          <StatusIcon className="w-4 h-4" />
        </div>

        {/* 主要內容區域 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            {/* WBS 編碼 */}
            {node.code && (
              <Badge variant="outline" className="text-xs font-mono">
                {node.code}
              </Badge>
            )}
            
            {/* 節點名稱 */}
            <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {node.name}
            </h4>
            
            {/* 優先級標誌 */}
            {node.priority && node.priority !== 'medium' && (
              <Badge 
                variant={node.priority === 'high' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {node.priority === 'high' ? '高' : node.priority === 'low' ? '低' : '中'}
              </Badge>
            )}
          </div>

          {/* 描述 */}
          {node.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
              {node.description}
            </p>
          )}

          {/* 詳細資訊 */}
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
            {/* 負責人 */}
            {node.assignee && (
              <div className="flex items-center">
                <User className="w-3 h-3 mr-1" />
                <span>{node.assignee}</span>
              </div>
            )}

            {/* 日期範圍 */}
            {(node.startDate || node.endDate) && (
              <div className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                <span>
                  {node.startDate && new Date(node.startDate).toLocaleDateString('zh-TW')}
                  {node.startDate && node.endDate && ' - '}
                  {node.endDate && new Date(node.endDate).toLocaleDateString('zh-TW')}
                </span>
              </div>
            )}

            {/* 工時 */}
            {(node.estimatedHours || node.actualHours) && (
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                <span>
                  {node.actualHours || 0}h / {node.estimatedHours || 0}h
                </span>
              </div>
            )}
          </div>

          {/* 進度條 */}
          {progressPercentage > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>進度</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-1" />
            </div>
          )}
        </div>

        {/* 操作選單 */}
        {!readonly && (isHovered || selected) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center justify-center w-8 h-8 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                onClick={(e) => e.stopPropagation()}
                aria-label="節點操作"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                編輯節點
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddChild}>
                新增子節點
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-red-600 dark:text-red-400"
              >
                刪除節點
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

export default WBSNode