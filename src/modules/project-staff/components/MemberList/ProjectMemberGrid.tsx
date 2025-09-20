/**
 * @fileoverview ProjectMemberGrid 組件實現
 * @version 1.0
 * @date 2025-08-31
 */

import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectMemberCard } from './ProjectMemberCard'
import { cn } from '@/lib/utils'
import { ProjectMemberExtended } from '@/types/project'

export interface ProjectMemberGridProps {
  members: ProjectMemberExtended[]
  loading?: boolean
  onEdit?: (member: ProjectMemberExtended) => void
  onDelete?: (member: ProjectMemberExtended) => void
  onViewDetails?: (member: ProjectMemberExtended) => void
  onCardClick?: (member: ProjectMemberExtended) => void
  selectable?: boolean
  selectedIds?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  draggable?: boolean
  virtualized?: boolean
  compact?: boolean
  columns?: number
  gap?: number
  className?: string
}

export const ProjectMemberGrid: React.FC<ProjectMemberGridProps> = ({
  members,
  loading = false,
  onEdit,
  onDelete,
  onViewDetails,
  onCardClick,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  draggable = false,
  virtualized = false,
  compact = false,
  columns = 3,
  gap = 12,
  className
}) => {
  const handleCardClick = (member: ProjectMemberExtended) => {
    onCardClick?.(member)
  }

  const handleSelect = (memberId: string, selected: boolean) => {
    if (!onSelectionChange) return
    
    if (selected) {
      onSelectionChange([...selectedIds, memberId])
    } else {
      onSelectionChange(selectedIds.filter(id => id !== memberId))
    }
  }

  if (loading) {
    return (
      <div data-testid="grid-loading" className="space-y-4">
        <div 
          className={cn(
            "grid responsive-grid",
            compact && "compact"
          )}
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: `${gap}px`
          }}
        >
          {Array.from({ length: columns * 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>暫無人員資料</p>
      </div>
    )
  }

  const GridContent = () => (
    <div
      data-testid={virtualized ? "virtual-grid" : "member-grid"}
      className={cn(
        "grid responsive-grid",
        compact && "compact",
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`
      }}
    >
      {members.map((member) => (
        <div
          key={member.id}
          onClick={() => handleCardClick(member)}
          className={cn(
            "transition-transform hover:scale-105",
            onCardClick && "cursor-pointer"
          )}
        >
          <ProjectMemberCard
            member={member}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewDetails={onViewDetails}
            selectable={selectable}
            selected={selectedIds.includes(member.id)}
            onSelect={handleSelect}
            draggable={draggable}
            compact={compact}
          />
        </div>
      ))}
    </div>
  )

  if (virtualized) {
    return (
      <div className="h-96 overflow-auto">
        <GridContent />
      </div>
    )
  }

  return <GridContent />
}