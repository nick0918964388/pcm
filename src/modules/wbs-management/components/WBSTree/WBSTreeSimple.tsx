/**
 * @fileoverview 簡化版 WBS 樹狀結構組件
 */

'use client'

import React, { useState } from 'react'
import { WBSItem } from '@/types/wbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  ChevronRight, 
  ChevronDown,
  FolderOpen,
  FileText,
  Calendar,
  DollarSign,
  Users,
  BarChart3
} from 'lucide-react'

interface WBSTreeSimpleProps {
  projectId: string
  tree?: WBSItem[]
  loading?: boolean
  error?: string | null
}

interface SimpleWBSNode {
  id: string
  code: string
  name: string
  description?: string
  type: string
  level: number
  parentId?: string | null
  status: string
  progress: number
  budget?: number
  actualCost?: number
  assignedTo?: string[]
  children?: SimpleWBSNode[]
  startDate?: string
  endDate?: string
}

// Mock WBS 資料
const mockWBSTree: SimpleWBSNode[] = [
  {
    id: 'wbs-001',
    code: '1',
    name: 'FAB20 Phase1 專案',
    description: '半導體廠建設專案第一期主體工程',
    type: 'PROJECT',
    level: 0,
    status: 'IN_PROGRESS',
    progress: 65,
    budget: 500000000,
    actualCost: 275000000,
    assignedTo: ['王建民', '李美玲'],
    startDate: '2024-01-01',
    endDate: '2025-12-31',
    children: [
      {
        id: 'wbs-002',
        code: '1.1',
        name: '基礎建設',
        description: '地基開挖與基礎結構建設',
        type: 'PHASE',
        level: 1,
        parentId: 'wbs-001',
        status: 'COMPLETED',
        progress: 100,
        budget: 150000000,
        actualCost: 148000000,
        assignedTo: ['劉建華', '林俊傑'],
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        children: [
          {
            id: 'wbs-005',
            code: '1.1.1',
            name: '地基開挖',
            description: '建築地基開挖作業',
            type: 'WORK_PACKAGE',
            level: 2,
            parentId: 'wbs-002',
            status: 'COMPLETED',
            progress: 100,
            budget: 80000000,
            actualCost: 78000000,
            assignedTo: ['劉建華'],
            startDate: '2024-01-01',
            endDate: '2024-03-31'
          }
        ]
      },
      {
        id: 'wbs-003',
        code: '1.2',
        name: '主體結構',
        description: '建築主體結構施工',
        type: 'PHASE',
        level: 1,
        parentId: 'wbs-001',
        status: 'IN_PROGRESS',
        progress: 75,
        budget: 200000000,
        actualCost: 125000000,
        assignedTo: ['李美玲', '劉建華'],
        startDate: '2024-04-01',
        endDate: '2024-12-31',
        children: [
          {
            id: 'wbs-007',
            code: '1.2.1',
            name: '鋼結構安裝',
            description: '主體鋼結構組裝安裝',
            type: 'WORK_PACKAGE',
            level: 2,
            parentId: 'wbs-003',
            status: 'IN_PROGRESS',
            progress: 80,
            budget: 120000000,
            actualCost: 75000000,
            assignedTo: ['李美玲'],
            startDate: '2024-07-01',
            endDate: '2024-10-31'
          }
        ]
      }
    ]
  }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200'
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'PLANNED': return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'ON_HOLD': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'PROJECT': return <FolderOpen className="w-4 h-4" />
    case 'PHASE': return <FolderOpen className="w-4 h-4" />
    case 'WORK_PACKAGE': return <FileText className="w-4 h-4" />
    default: return <FileText className="w-4 h-4" />
  }
}

const formatCurrency = (amount?: number) => {
  if (!amount) return 'N/A'
  return `$${(amount / 1000000).toLocaleString()}M`
}

const WBSNodeComponent: React.FC<{
  node: SimpleWBSNode
  expandedNodes: Set<string>
  onToggleExpand: (nodeId: string) => void
}> = ({ node, expandedNodes, onToggleExpand }) => {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedNodes.has(node.id)
  const indentLevel = node.level * 24

  return (
    <div className="border border-gray-200 rounded-lg mb-2 bg-white">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => hasChildren && onToggleExpand(node.id)}
      >
        <div className="flex items-start gap-3" style={{ marginLeft: indentLevel }}>
          {/* 展開/摺疊按鈕 */}
          <div className="flex items-center justify-center w-6 h-6 mt-1">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
          </div>

          {/* 類型圖示 */}
          <div className="mt-1">
            {getTypeIcon(node.type)}
          </div>

          {/* 主要內容 */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {node.code}
              </span>
              <h3 className="font-semibold text-gray-900">{node.name}</h3>
              <Badge variant="outline" className={`${getStatusColor(node.status)} text-xs`}>
                {node.status}
              </Badge>
            </div>

            {node.description && (
              <p className="text-sm text-gray-600 mb-3">{node.description}</p>
            )}

            {/* 進度條 */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">進度</span>
                <span className="font-medium">{node.progress}%</span>
              </div>
              <Progress value={node.progress} className="h-2" />
            </div>

            {/* 資訊列 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              {node.budget && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-gray-500">預算</div>
                    <div className="font-medium">{formatCurrency(node.budget)}</div>
                  </div>
                </div>
              )}
              
              {node.actualCost && (
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-gray-500">實際成本</div>
                    <div className="font-medium">{formatCurrency(node.actualCost)}</div>
                  </div>
                </div>
              )}

              {node.startDate && node.endDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-gray-500">期程</div>
                    <div className="font-medium text-xs">
                      {node.startDate} ~ {node.endDate}
                    </div>
                  </div>
                </div>
              )}

              {node.assignedTo && node.assignedTo.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-gray-500">負責人</div>
                    <div className="font-medium">{node.assignedTo.join(', ')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 子節點 */}
      {hasChildren && isExpanded && (
        <div className="border-t border-gray-100">
          {node.children?.map(child => (
            <WBSNodeComponent
              key={child.id}
              node={child}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const WBSTreeSimple: React.FC<WBSTreeSimpleProps> = ({
  projectId,
  tree,
  loading = false,
  error = null
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['wbs-001']))

  const handleToggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  const handleExpandAll = () => {
    const getAllNodeIds = (nodes: SimpleWBSNode[]): string[] => {
      let ids: string[] = []
      for (const node of nodes) {
        ids.push(node.id)
        if (node.children) {
          ids = ids.concat(getAllNodeIds(node.children))
        }
      }
      return ids
    }
    setExpandedNodes(new Set(getAllNodeIds(mockWBSTree)))
  }

  const handleCollapseAll = () => {
    setExpandedNodes(new Set())
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">載入 WBS 資料中...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-red-600">
            <p>載入 WBS 資料時發生錯誤: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* 工具列 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>WBS 項目設定</CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExpandAll}
              >
                全部展開
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCollapseAll}
              >
                全部摺疊
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            專案 ID: {projectId} | 總計 {mockWBSTree.length} 個根節點
          </div>
        </CardContent>
      </Card>

      {/* WBS 樹狀結構 */}
      <div className="space-y-2">
        {mockWBSTree.map(node => (
          <WBSNodeComponent
            key={node.id}
            node={node}
            expandedNodes={expandedNodes}
            onToggleExpand={handleToggleExpand}
          />
        ))}
      </div>

      {mockWBSTree.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center text-gray-500">
              <p>目前沒有 WBS 項目資料</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default WBSTreeSimple