/**
 * @fileoverview ProjectMemberTable 組件實現
 * @version 1.0
 * @date 2025-08-31
 */

import React, { useState, useMemo } from 'react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/Input'
import { 
  Eye, 
  Edit, 
  Trash2, 
  ArrowUp, 
  ArrowDown,
  ArrowUpDown 
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { ProjectMemberExtended, WorkStatus } from '@/types/project'

export interface ProjectMemberTableProps {
  members: ProjectMemberExtended[]
  loading?: boolean
  onEdit?: (member: ProjectMemberExtended) => void
  onDelete?: (member: ProjectMemberExtended) => void
  onViewDetails?: (member: ProjectMemberExtended) => void
  onSort?: (field: string, direction: 'asc' | 'desc') => void
  selectable?: boolean
  selectedIds?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  editable?: boolean
  virtualized?: boolean
  sortField?: string
  sortDirection?: 'asc' | 'desc'
}

type SortableField = 'userName' | 'role' | 'workStatus' | 'workload' | 'joinedAt'

export const ProjectMemberTable: React.FC<ProjectMemberTableProps> = ({
  members,
  loading = false,
  onEdit,
  onDelete,
  onViewDetails,
  onSort,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  editable = false,
  virtualized = false,
  sortField,
  sortDirection
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')

  const isAllSelected = useMemo(() => {
    return members.length > 0 && selectedIds.length === members.length
  }, [members.length, selectedIds.length])

  const isIndeterminate = useMemo(() => {
    return selectedIds.length > 0 && selectedIds.length < members.length
  }, [selectedIds.length, members.length])

  const handleSort = (field: SortableField) => {
    if (!onSort) return
    
    const newDirection = 
      sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'
    onSort(field, newDirection)
  }

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return
    
    if (checked) {
      onSelectionChange(members.map(member => member.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectRow = (memberId: string, checked: boolean) => {
    if (!onSelectionChange) return
    
    if (checked) {
      onSelectionChange([...selectedIds, memberId])
    } else {
      onSelectionChange(selectedIds.filter(id => id !== memberId))
    }
  }

  const handleStartEdit = (member: ProjectMemberExtended, field: string) => {
    if (!editable) return
    
    setEditingId(member.id)
    setEditingValue(member[field as keyof ProjectMemberExtended] as string)
  }

  const handleSaveEdit = () => {
    // 這裡應該調用編輯API
    setEditingId(null)
    setEditingValue('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingValue('')
  }

  const getSortIcon = (field: SortableField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4 ml-1" /> : 
      <ArrowDown className="h-4 w-4 ml-1" />
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

  if (loading) {
    return (
      <div data-testid="table-loading" className="space-y-4">
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
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

  const TableContent = () => (
    <Table className={cn("responsive-table", virtualized && "virtual-table")}>
      <TableHeader>
        <TableRow>
          {selectable && (
            <TableHead className="w-12">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                indeterminate={isIndeterminate}
                aria-label="全選"
              />
            </TableHead>
          )}
          <TableHead>
            <Button 
              variant="ghost" 
              onClick={() => handleSort('userName')}
              className="font-semibold p-0 h-auto"
            >
              姓名
              {getSortIcon('userName')}
            </Button>
          </TableHead>
          <TableHead>
            <Button 
              variant="ghost" 
              onClick={() => handleSort('role')}
              className="font-semibold p-0 h-auto"
            >
              職位
              {getSortIcon('role')}
            </Button>
          </TableHead>
          <TableHead>
            <Button 
              variant="ghost" 
              onClick={() => handleSort('workStatus')}
              className="font-semibold p-0 h-auto"
            >
              狀態
              {getSortIcon('workStatus')}
            </Button>
          </TableHead>
          <TableHead>
            <Button 
              variant="ghost" 
              onClick={() => handleSort('workload')}
              className="font-semibold p-0 h-auto"
            >
              工作負荷
              {getSortIcon('workload')}
            </Button>
          </TableHead>
          <TableHead>技能</TableHead>
          <TableHead>
            <Button 
              variant="ghost" 
              onClick={() => handleSort('joinedAt')}
              className="font-semibold p-0 h-auto"
            >
              加入時間
              {getSortIcon('joinedAt')}
            </Button>
          </TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id} className="hover:bg-gray-50">
            {selectable && (
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(member.id)}
                  onCheckedChange={(checked) => handleSelectRow(member.id, checked)}
                />
              </TableCell>
            )}
            <TableCell>
              <div>
                <div className="font-medium">
                  {editingId === member.id ? (
                    <Input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={handleSaveEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit()
                        if (e.key === 'Escape') handleCancelEdit()
                      }}
                      className="h-6 text-sm"
                    />
                  ) : (
                    member.userName
                  )}
                </div>
                <div className="text-sm text-gray-500">{member.email}</div>
              </div>
            </TableCell>
            <TableCell>{member.role}</TableCell>
            <TableCell>
              <Badge 
                className={getStatusBadgeClass(member.workStatus)}
                data-testid="status-cell"
              >
                {getStatusText(member.workStatus)}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="w-24">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>{member.workload}%</span>
                </div>
                <Progress 
                  value={member.workload} 
                  className="h-2"
                  data-testid="workload-progress"
                />
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {member.skills?.slice(0, 3).map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill.name}
                  </Badge>
                ))}
                {member.skills && member.skills.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{member.skills.length - 3}
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="text-sm text-gray-500">
              {formatDate(member.joinedAt)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails?.(member)}
                  aria-label="檢視詳情"
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editable ? handleStartEdit(member, 'userName') : onEdit?.(member)}
                  aria-label="編輯"
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete?.(member)}
                  aria-label="刪除"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  if (virtualized) {
    return (
      <div data-testid="virtual-table" className="h-96 overflow-auto">
        <TableContent />
      </div>
    )
  }

  return <TableContent />
}