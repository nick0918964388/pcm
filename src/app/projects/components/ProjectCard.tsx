"use client"

import * as React from 'react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  Project, 
  ProjectStatus, 
  PROJECT_STATUS_COLORS,
  PROJECT_TYPE_ICONS 
} from '@/types/project'
import { 
  CalendarIcon, 
  PersonIcon, 
  CheckCircledIcon,
  ClockIcon,
  EnterIcon,
  EyeOpenIcon 
} from '@radix-ui/react-icons'

/**
 * Props for ProjectCard component
 */
interface ProjectCardProps {
  /** 專案資料 */
  project: Project
  /** 進入專案事件處理 */
  onProjectEnter?: (projectId: string) => void | Promise<void>
  /** 存取記錄事件處理 */
  onAccessRecord?: (projectId: string) => void | Promise<void>
  /** 自定義類別名稱 */
  className?: string
  /** 緊湊模式 */
  compact?: boolean
  /** 載入中狀態 */
  loading?: boolean
}

/**
 * 取得狀態徽章變體
 */
const getStatusBadgeVariant = (status: ProjectStatus) => {
  switch (status) {
    case ProjectStatus.COMPLETED:
      return 'default' // green
    case ProjectStatus.IN_PROGRESS:
      return 'secondary' // blue
    case ProjectStatus.PAUSED:
      return 'outline' // yellow
    case ProjectStatus.CANCELLED:
      return 'destructive' // red
    case ProjectStatus.PLANNING:
    default:
      return 'outline' // gray
  }
}

/**
 * 格式化日期顯示
 */
const formatDate = (date: Date, showYear = false) => {
  const formatString = showYear ? 'yyyy/MM/dd' : 'MM/dd'
  return format(date, formatString, { locale: zhTW })
}

/**
 * 計算專案剩餘天數
 */
const calculateRemainingDays = (endDate: Date) => {
  const today = new Date()
  const diffTime = endDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * ProjectCard 元件
 * 
 * 顯示專案資訊的卡片元件，包含：
 * - 專案基本資訊（代碼、名稱、狀態、進度）
 * - 進度視覺化
 * - 專案經理資訊
 * - 時程資訊
 * - 進入專案按鈕
 */
export const ProjectCard = React.memo<ProjectCardProps>(({
  project,
  onProjectEnter,
  onAccessRecord,
  className,
  compact = false,
  loading = false
}) => {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isEntering, setIsEntering] = React.useState(false)

  // 計算衍生資料
  const statusVariant = getStatusBadgeVariant(project.status)
  const remainingDays = calculateRemainingDays(project.endDate)
  const isOverdue = remainingDays < 0
  const progressPercentage = Math.round(project.progress)
  const milestoneCompletion = `${project.completedMilestones}/${project.totalMilestones}`
  const typeIcon = PROJECT_TYPE_ICONS[project.type] || '📋'

  // 處理進入專案
  const handleProjectEnter = React.useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (loading || isEntering) return
    
    try {
      setIsEntering(true)
      await onProjectEnter?.(project.id)
    } catch (error) {
      console.error('Error entering project:', error)
    } finally {
      setIsEntering(false)
    }
  }, [project.id, onProjectEnter, loading, isEntering])

  // 處理卡片點擊
  const handleCardClick = React.useCallback(async () => {
    if (loading || isEntering) return
    
    // 記錄存取
    try {
      await onAccessRecord?.(project.id)
    } catch (error) {
      console.error('Error recording access:', error)
    }
    
    // 進入專案
    await handleProjectEnter({ 
      preventDefault: () => {}, 
      stopPropagation: () => {} 
    } as React.MouseEvent)
  }, [project.id, onAccessRecord, handleProjectEnter, loading, isEntering])

  // 鍵盤事件處理
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleCardClick()
    }
  }, [handleCardClick])

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200 cursor-pointer",
        "hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isHovered && "shadow-lg shadow-primary/10 -translate-y-1",
        compact && "max-w-sm",
        loading && "opacity-50 pointer-events-none",
        className
      )}
      tabIndex={0}
      role="button"
      aria-label={`進入專案 ${project.name}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      {/* 載入中覆蓋層 */}
      {loading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      <CardHeader className={cn("space-y-3", compact && "p-4")}>
        {/* 第一行：專案代碼 + 狀態 */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="font-mono text-xs">
            {project.code}
          </Badge>
          <Badge variant={statusVariant}>
            {project.status}
          </Badge>
        </div>

        {/* 專案名稱 + 類型圖標 */}
        <div className="flex items-start justify-between gap-3">
          <h3 className={cn(
            "font-semibold leading-tight text-foreground line-clamp-2",
            compact ? "text-sm" : "text-base"
          )}>
            {project.name}
          </h3>
          <span className="text-lg flex-shrink-0" role="img" aria-label={project.type}>
            {typeIcon}
          </span>
        </div>

        {/* 專案描述（非緊湊模式才顯示） */}
        {!compact && project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
        )}
      </CardHeader>

      <CardContent className={cn("space-y-4", compact && "px-4 pb-4")}>
        {/* 進度區塊 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">專案進度</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <Progress 
            value={project.progress} 
            className="h-2"
            aria-label={`專案進度 ${progressPercentage}%`}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircledIcon className="h-3 w-3" />
              <span>里程碑 {milestoneCompletion}</span>
            </div>
            <span>{progressPercentage === 100 ? '已完成' : '進行中'}</span>
          </div>
        </div>

        {/* 專案資訊網格 */}
        <div className="grid grid-cols-1 gap-3 text-sm">
          {/* 專案經理 */}
          <div className="flex items-center gap-2">
            <PersonIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-muted-foreground">專案經理：</span>
              <span className="font-medium ml-1 truncate">{project.managerName}</span>
            </div>
          </div>

          {/* 時程資訊 */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">時程：</span>
                <span className="font-medium text-xs">
                  {formatDate(project.startDate)} ~ {formatDate(project.endDate)}
                </span>
              </div>
            </div>
          </div>

          {/* 剩餘天數 */}
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0 flex justify-between">
              <span className="text-muted-foreground">剩餘：</span>
              <span className={cn(
                "font-medium text-xs",
                isOverdue ? "text-destructive" : remainingDays <= 7 ? "text-orange-600 dark:text-orange-400" : "text-foreground"
              )}>
                {isOverdue ? `逾期 ${Math.abs(remainingDays)} 天` : `${remainingDays} 天`}
              </span>
            </div>
          </div>

          {/* 最後存取時間（如果有的話） */}
          {project.lastAccessDate && (
            <div className="flex items-center gap-2">
              <EyeOpenIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0 flex justify-between">
                <span className="text-muted-foreground">最後存取：</span>
                <span className="font-medium text-xs">
                  {formatDate(project.lastAccessDate, true)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 進入專案按鈕 */}
        <div className="pt-2">
          <Button
            onClick={handleProjectEnter}
            disabled={loading || isEntering}
            className="w-full"
            size={compact ? "sm" : "default"}
          >
            {isEntering ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                進入中...
              </>
            ) : (
              <>
                <EnterIcon className="mr-2 h-4 w-4" />
                進入專案
              </>
            )}
          </Button>
        </div>
      </CardContent>

      {/* Hover 效果光暈 */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
      )} />
    </Card>
  )
})

ProjectCard.displayName = 'ProjectCard'

export default ProjectCard