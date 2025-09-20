/**
 * @fileoverview WBS 節點內容組件
 * @version 1.0
 * @date 2025-09-01
 * 
 * WBS 節點的內容顯示組件，用於自定義節點的顯示內容
 */

'use client'

import React from 'react'
import { WBSItem, WBSStatus } from '@/types/wbs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  User, 
  Calendar, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Pause,
  X,
  Target,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ==================== TYPES ====================

export interface WBSNodeContentProps {
  /** WBS 節點資料 */
  node: WBSItem
  /** 顯示模式 */
  displayMode?: 'compact' | 'detailed' | 'card'
  /** 是否顯示進度 */
  showProgress?: boolean
  /** 是否顯示統計 */
  showStatistics?: boolean
  /** 是否顯示描述 */
  showDescription?: boolean
  /** 是否顯示日期 */
  showDates?: boolean
  /** 是否顯示負責人 */
  showAssignee?: boolean
  /** 組件類名 */
  className?: string
}

// ==================== COMPONENT ====================

export const WBSNodeContent: React.FC<WBSNodeContentProps> = ({
  node,
  displayMode = 'detailed',
  showProgress = true,
  showStatistics = true,
  showDescription = true,
  showDates = true,
  showAssignee = true,
  className
}) => {
  // ===== COMPUTED VALUES =====
  
  // 狀態配置
  const getStatusConfig = (status: string) => {
    switch (status) {
      case WBSStatus.COMPLETED:
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          label: '已完成'
        }
      case WBSStatus.IN_PROGRESS:
        return {
          icon: TrendingUp,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          label: '進行中'
        }
      case WBSStatus.ON_HOLD:
        return {
          icon: Pause,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
          label: '暫停'
        }
      case WBSStatus.CANCELLED:
        return {
          icon: X,
          color: 'text-red-600',
          bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          label: '已取消'
        }
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
          label: '未開始'
        }
    }
  }

  const statusConfig = getStatusConfig(node.status)
  const StatusIcon = statusConfig.icon

  // 優先級配置
  const getPriorityConfig = (priority?: string) => {
    switch (priority) {
      case 'high':
        return {
          color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          label: '高優先級'
        }
      case 'low':
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
          label: '低優先級'
        }
      default:
        return {
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          label: '中等優先級'
        }
    }
  }

  const priorityConfig = getPriorityConfig(node.priority)

  // 進度計算
  const progressPercentage = React.useMemo(() => {
    if (node.actualHours && node.estimatedHours) {
      return Math.min((node.actualHours / node.estimatedHours) * 100, 100)
    }
    return node.progress || 0
  }, [node.actualHours, node.estimatedHours, node.progress])

  // 格式化日期
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  // 計算剩餘工時
  const remainingHours = React.useMemo(() => {
    if (node.estimatedHours && node.actualHours) {
      return Math.max(node.estimatedHours - node.actualHours, 0)
    }
    return node.estimatedHours || 0
  }, [node.estimatedHours, node.actualHours])

  // ===== RENDER MODES =====

  if (displayMode === 'compact') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        {/* 狀態圖標 */}
        <StatusIcon className={cn('w-4 h-4', statusConfig.color)} />
        
        {/* WBS 編碼 */}
        {node.code && (
          <Badge variant="outline" className="text-xs font-mono">
            {node.code}
          </Badge>
        )}
        
        {/* 節點名稱 */}
        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
          {node.name}
        </span>
        
        {/* 負責人 */}
        {showAssignee && node.assignee && (
          <Badge variant="secondary" className="text-xs">
            {node.assignee}
          </Badge>
        )}
      </div>
    )
  }

  if (displayMode === 'card') {
    return (
      <div className={cn('p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm', className)}>
        {/* 卡片頭部 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            {/* WBS 編碼 */}
            {node.code && (
              <Badge variant="outline" className="text-xs font-mono">
                {node.code}
              </Badge>
            )}
            
            {/* 狀態 */}
            <Badge className={statusConfig.bgColor}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
            
            {/* 優先級 */}
            {node.priority && node.priority !== 'medium' && (
              <Badge className={priorityConfig.color}>
                <Target className="w-3 h-3 mr-1" />
                {priorityConfig.label}
              </Badge>
            )}
          </div>
        </div>

        {/* 節點名稱 */}
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {node.name}
        </h3>

        {/* 描述 */}
        {showDescription && node.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {node.description}
          </p>
        )}

        {/* 詳細資訊 */}
        <div className="space-y-2">
          {/* 負責人和日期 */}
          <div className="flex items-center justify-between text-sm">
            {showAssignee && node.assignee && (
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4 mr-1" />
                <span>{node.assignee}</span>
              </div>
            )}
            
            {showDates && (node.startDate || node.endDate) && (
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4 mr-1" />
                <span>
                  {node.startDate && formatDate(node.startDate)}
                  {node.startDate && node.endDate && ' - '}
                  {node.endDate && formatDate(node.endDate)}
                </span>
              </div>
            )}
          </div>

          {/* 工時資訊 */}
          {showStatistics && (node.estimatedHours || node.actualHours) && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4 mr-1" />
                <span>
                  實際: {node.actualHours || 0}h / 預估: {node.estimatedHours || 0}h
                </span>
              </div>
              
              <div className="text-xs text-gray-500">
                剩餘: {remainingHours}h
              </div>
            </div>
          )}

          {/* 進度條 */}
          {showProgress && progressPercentage > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>完成進度</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}
        </div>
      </div>
    )
  }

  // 預設詳細模式
  return (
    <div className={cn('space-y-2', className)}>
      {/* 主標題行 */}
      <div className="flex items-center space-x-2">
        {/* 狀態圖標 */}
        <StatusIcon className={cn('w-4 h-4', statusConfig.color)} />
        
        {/* WBS 編碼 */}
        {node.code && (
          <Badge variant="outline" className="text-xs font-mono">
            {node.code}
          </Badge>
        )}
        
        {/* 節點名稱 */}
        <h4 className="font-medium text-gray-900 dark:text-gray-100">
          {node.name}
        </h4>
        
        {/* 狀態標籤 */}
        <Badge className={statusConfig.bgColor}>
          {statusConfig.label}
        </Badge>
        
        {/* 優先級 */}
        {node.priority && node.priority !== 'medium' && (
          <Badge className={priorityConfig.color}>
            {priorityConfig.label}
          </Badge>
        )}
      </div>

      {/* 描述 */}
      {showDescription && node.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 pl-6">
          {node.description}
        </p>
      )}

      {/* 詳細資訊 */}
      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 pl-6">
        {/* 負責人 */}
        {showAssignee && node.assignee && (
          <div className="flex items-center">
            <User className="w-3 h-3 mr-1" />
            <span>{node.assignee}</span>
          </div>
        )}

        {/* 日期範圍 */}
        {showDates && (node.startDate || node.endDate) && (
          <div className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            <span>
              {node.startDate && formatDate(node.startDate)}
              {node.startDate && node.endDate && ' - '}
              {node.endDate && formatDate(node.endDate)}
            </span>
          </div>
        )}

        {/* 工時 */}
        {showStatistics && (node.estimatedHours || node.actualHours) && (
          <div className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            <span>
              {node.actualHours || 0}h / {node.estimatedHours || 0}h
            </span>
          </div>
        )}
      </div>

      {/* 進度條 */}
      {showProgress && progressPercentage > 0 && (
        <div className="pl-6">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>完成進度</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-1" />
        </div>
      )}
    </div>
  )
}

export default WBSNodeContent