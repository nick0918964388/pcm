import React from 'react'
import { Project, ViewMode } from '@/types/project'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar, 
  User, 
  MapPin, 
  TrendingUp, 
  Clock,
  ArrowRight,
  DollarSign 
} from 'lucide-react'

interface ProjectCardProps {
  project: Project
  viewMode?: ViewMode
  showSelectButton?: boolean
  onClick?: (project: Project) => void
  className?: string
}

/**
 * 專案卡片元件
 * 
 * 支援網格和表格兩種檢視模式，顯示專案基本資訊、進度、狀態等
 */
export function ProjectCard({ 
  project, 
  viewMode = ViewMode.GRID,
  showSelectButton = false,
  onClick, 
  className = '' 
}: ProjectCardProps) {
  
  // 狀態顏色對應
  const getStatusColor = (status: string) => {
    switch (status) {
      case '進行中': return 'bg-blue-100 text-blue-800 border-blue-200'
      case '已完成': return 'bg-green-100 text-green-800 border-green-200'
      case '規劃中': return 'bg-gray-100 text-gray-800 border-gray-200'
      case '暫停': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case '已取消': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // 進度條顏色
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 60) return 'bg-blue-500'
    if (progress >= 40) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  // 計算剩餘天數
  const getDaysRemaining = () => {
    const today = new Date()
    const endDate = new Date(project.endDate)
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // 格式化金額
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: project.currency || 'TWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // 格式化日期
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('zh-TW')
  }

  const daysRemaining = getDaysRemaining()

  if (viewMode === ViewMode.TABLE) {
    return (
      <div 
        className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${className}`}
        onClick={() => onClick?.(project)}
      >
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-[#00645A] rounded-lg flex items-center justify-center text-white font-bold text-sm">
                {project.code.slice(-2)}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {project.name}
                </h3>
                <Badge className={`px-2 py-1 text-xs border ${getStatusColor(project.status)}`}>
                  {project.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">{project.code}</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-sm text-gray-500">進度</div>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getProgressColor(project.progress)}`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{project.progress}%</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-500">經理</div>
              <div className="text-sm font-medium">{project.managerName}</div>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-500">截止日期</div>
              <div className={`text-sm font-medium ${
                daysRemaining < 30 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {formatDate(project.endDate)}
              </div>
            </div>

            {showSelectButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onClick?.(project)
                }}
                className="flex items-center space-x-1"
              >
                <span>選擇</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 網格模式
  return (
    <Card 
      className={`p-6 hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-[#00645A] ${className}`}
      onClick={() => onClick?.(project)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {project.name}
            </h3>
            <Badge className={`px-2 py-1 text-xs border ${getStatusColor(project.status)}`}>
              {project.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">{project.code}</p>
        </div>
        
        {showSelectButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onClick?.(project)
            }}
            className="flex items-center space-x-1 ml-2"
          >
            <span>選擇</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* 描述 */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {project.description}
      </p>

      {/* 進度條 */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">專案進度</span>
          <span className="text-sm font-bold text-gray-900">{project.progress}%</span>
        </div>
        <Progress value={project.progress} className="h-2" />
      </div>

      {/* 專案資訊 */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <User className="h-4 w-4 mr-2" />
          <span>{project.managerName}</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="h-4 w-4 mr-2" />
          <span>{formatDate(project.startDate)} - {formatDate(project.endDate)}</span>
        </div>
        
        {project.location && (
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{project.location}</span>
          </div>
        )}
      </div>

      {/* 統計資訊 */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <DollarSign className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-xs text-gray-500">預算</div>
          <div className="text-sm font-semibold">
            {formatCurrency(project.totalBudget)}
          </div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xs text-gray-500">里程碑</div>
          <div className="text-sm font-semibold">
            {project.completedMilestones}/{project.totalMilestones}
          </div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Clock className={`h-4 w-4 ${daysRemaining < 30 ? 'text-red-600' : 'text-gray-600'}`} />
          </div>
          <div className="text-xs text-gray-500">剩餘天數</div>
          <div className={`text-sm font-semibold ${
            daysRemaining < 30 ? 'text-red-600' : 'text-gray-900'
          }`}>
            {daysRemaining > 0 ? `${daysRemaining} 天` : '已逾期'}
          </div>
        </div>
      </div>
    </Card>
  )
}