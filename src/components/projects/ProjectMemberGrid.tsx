/**
 * @fileoverview 專案成員卡片網格檢視組件
 */

'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Mail, 
  Phone, 
  Building, 
  Calendar, 
  MoreHorizontal,
  Edit,
  Eye,
  MessageSquare
} from 'lucide-react'

interface ProjectMember {
  id: string
  userName: string
  email: string
  role: string
  roleName: string
  department: string
  position: string
  joinDate: string
  status: string
  workload: number
  skills: string[]
  phone: string
}

interface ProjectMemberGridProps {
  /** 成員列表資料 */
  members: ProjectMember[]
  /** 載入中狀態 */
  loading?: boolean
  /** 選中的成員ID列表 */
  selectedMembers?: string[]
  /** 成員選擇變更回調 */
  onSelectionChange?: (selectedIds: string[]) => void
  /** 成員操作回調 */
  onMemberAction?: (action: string, memberId: string) => void
  /** 是否支援批量選擇 */
  enableBatchSelection?: boolean
  /** 網格列數配置 */
  columns?: {
    base: number      // 基本螢幕大小
    md: number        // 中等螢幕大小
    lg: number        // 大螢幕大小
    xl?: number       // 超大螢幕大小
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-200'
    case 'INACTIVE': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getWorkloadColor = (workload: number) => {
  if (workload >= 90) return 'text-red-600'
  if (workload >= 80) return 'text-yellow-600'
  return 'text-green-600'
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * 專案成員卡片網格檢視組件
 */
export function ProjectMemberGrid({
  members,
  loading = false,
  selectedMembers = [],
  onSelectionChange,
  onMemberAction,
  enableBatchSelection = true,
  columns = { base: 1, md: 2, lg: 3, xl: 4 }
}: ProjectMemberGridProps) {
  
  // 處理單個成員選擇
  const handleSelectMember = (memberId: string, checked: boolean) => {
    if (onSelectionChange) {
      const newSelection = checked
        ? [...selectedMembers, memberId]
        : selectedMembers.filter(id => id !== memberId)
      onSelectionChange(newSelection)
    }
  }

  // 生成網格 CSS 類名
  const getGridClassName = () => {
    const { base, md, lg, xl } = columns
    let className = `grid gap-6 grid-cols-${base}`
    if (md) className += ` md:grid-cols-${md}`
    if (lg) className += ` lg:grid-cols-${lg}`
    if (xl) className += ` xl:grid-cols-${xl}`
    return className
  }

  if (loading) {
    return (
      <div className={getGridClassName()}>
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="h-5 w-24 bg-gray-200 rounded"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-6 w-16 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-4 w-28 bg-gray-200 rounded"></div>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded"></div>
                <div className="flex flex-wrap gap-1">
                  <div className="h-6 w-16 bg-gray-200 rounded"></div>
                  <div className="h-6 w-20 bg-gray-200 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Building className="w-12 h-12 text-gray-300" />
        </div>
        <p className="text-lg font-medium">沒有找到符合條件的專案成員</p>
        <p className="text-sm mt-1">嘗試調整搜索條件或清除篩選器</p>
      </div>
    )
  }

  return (
    <div className={getGridClassName()}>
      {members.map((member) => (
        <Card 
          key={member.id} 
          className={`hover:shadow-lg transition-all duration-200 relative ${
            selectedMembers.includes(member.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          }`}
        >
          {/* 頂部操作列 */}
          <div className={`absolute top-3 left-3 right-3 flex items-center z-10 ${
            enableBatchSelection ? 'justify-between' : 'justify-end'
          }`}>
            {/* 批量選擇 checkbox */}
            {enableBatchSelection && (
              <Checkbox
                checked={selectedMembers.includes(member.id)}
                onCheckedChange={(checked) => 
                  handleSelectMember(member.id, checked as boolean)
                }
                className="bg-white border-2"
              />
            )}
            
            {/* 操作選單 */}
            <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>操作</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => onMemberAction?.('view', member.id)}
                  className="cursor-pointer"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  查看詳情
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onMemberAction?.('edit', member.id)}
                  className="cursor-pointer"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  編輯資料
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onMemberAction?.('message', member.id)}
                  className="cursor-pointer"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  發送訊息
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>

          <CardContent className="p-6 pt-12">
            <div className="space-y-4">
              {/* 基本資訊 */}
              <div className="flex items-start justify-between pr-8">
                <div className="flex-1 mr-8">
                  <h3 className="font-semibold text-lg text-gray-900 truncate">
                    {member.userName}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">{member.position}</p>
                  <p className="text-xs text-blue-600 mt-1">{member.roleName}</p>
                </div>
                <Badge variant="outline" className={`${getStatusColor(member.status)} text-xs shrink-0`}>
                  {member.status === 'ACTIVE' ? '活躍' : '非活躍'}
                </Badge>
              </div>

              {/* 聯絡資訊 */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{member.email}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2 shrink-0" />
                  <span>{member.phone}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Building className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{member.department}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2 shrink-0" />
                  <span>加入: {formatDate(member.joinDate)}</span>
                </div>
              </div>

              {/* 工作負載 */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">工作負載</span>
                  <span className={`font-medium ${getWorkloadColor(member.workload)}`}>
                    {member.workload}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      member.workload >= 90 ? 'bg-red-500' :
                      member.workload >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${member.workload}%` }}
                  />
                </div>
              </div>

              {/* 技能標籤 */}
              <div>
                <p className="text-sm text-gray-600 mb-2">專業技能</p>
                <div className="flex flex-wrap gap-1">
                  {member.skills.slice(0, 3).map((skill, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {member.skills.length > 3 && (
                    <Badge variant="outline" className="text-xs text-gray-500">
                      +{member.skills.length - 3}
                    </Badge>
                  )}
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="flex space-x-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onMemberAction?.('view', member.id)}
                >
                  查看詳情
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onMemberAction?.('edit', member.id)}
                >
                  編輯
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default ProjectMemberGrid