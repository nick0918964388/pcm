/**
 * @fileoverview ProjectMemberCard 組件實現
 * @version 1.0
 * @date 2025-08-31
 */

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Eye, Edit, Trash2 } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { ProjectMemberExtended, WorkStatus } from '@/types/project'

export interface ProjectMemberCardProps {
  member: ProjectMemberExtended
  onEdit?: (member: ProjectMemberExtended) => void
  onDelete?: (member: ProjectMemberExtended) => void
  onViewDetails?: (member: ProjectMemberExtended) => void
  selectable?: boolean
  selected?: boolean
  onSelect?: (memberId: string, selected: boolean) => void
  compact?: boolean
  showJoinDate?: boolean
  showLastActive?: boolean
  hideActions?: boolean
  draggable?: boolean
}

export const ProjectMemberCard: React.FC<ProjectMemberCardProps> = ({
  member,
  onEdit,
  onDelete,
  onViewDetails,
  selectable = false,
  selected = false,
  onSelect,
  compact = false,
  showJoinDate = false,
  showLastActive = false,
  hideActions = false,
  draggable = false
}) => {
  const handleEdit = () => {
    onEdit?.(member)
  }

  const handleDelete = () => {
    onDelete?.(member)
  }

  const handleViewDetails = () => {
    onViewDetails?.(member)
  }

  const handleSelect = (checked: boolean) => {
    onSelect?.(member.id, checked)
  }

  const getStatusBadgeClass = (status: WorkStatus) => {
    switch (status) {
      case WorkStatus.AVAILABLE:
        return 'bg-green-100 text-green-800'
      case WorkStatus.BUSY:
        return 'bg-yellow-100 text-yellow-800'
      case WorkStatus.UNAVAILABLE:
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: WorkStatus) => {
    switch (status) {
      case WorkStatus.AVAILABLE:
        return 'Available'
      case WorkStatus.BUSY:
        return 'Busy'
      case WorkStatus.UNAVAILABLE:
        return 'Unavailable'
      default:
        return 'Unknown'
    }
  }

  return (
    <Card 
      className={cn(
        "relative",
        compact && "compact"
      )}
      data-testid="member-card"
      draggable={draggable}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {selectable && (
              <Checkbox
                checked={selected}
                onCheckedChange={handleSelect}
                className="mt-1"
              />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    member.isActive ? "bg-green-500" : "bg-gray-400"
                  )}
                  data-testid="active-indicator"
                />
                <h3 className="font-medium text-gray-900 truncate">
                  {member.userName}
                </h3>
              </div>
              
              <p className="text-sm text-gray-500 mt-1">
                {member.email}
              </p>
              
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-sm text-gray-600">{member.role}</span>
                <Badge 
                  className={cn(
                    "text-xs",
                    getStatusBadgeClass(member.workStatus)
                  )}
                  data-testid="status-badge"
                >
                  {getStatusText(member.workStatus)}
                </Badge>
              </div>
              
              {member.skills && member.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {member.skills.map((skill, index) => (
                    <Badge 
                      key={index}
                      variant="outline" 
                      className="text-xs"
                    >
                      {skill.name}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>工作負荷</span>
                  <span>{member.workload}%</span>
                </div>
                <Progress 
                  value={member.workload} 
                  className="h-2"
                  data-testid="workload-progress"
                />
              </div>
              
              {showJoinDate && (
                <p className="text-xs text-gray-500 mt-2">
                  加入時間: {formatDate(member.joinedAt)}
                </p>
              )}
              
              {showLastActive && member.lastActiveAt && (
                <p className="text-xs text-gray-500 mt-1">
                  最後活躍: {formatDate(member.lastActiveAt)}
                </p>
              )}
            </div>
          </div>
          
          {!hideActions && (
            <div className="flex items-center space-x-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewDetails}
                aria-label="檢視詳情"
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                aria-label="編輯"
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                aria-label="刪除"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}