"use client"

import React from 'react'
import { ProjectGrid } from '../projects/components'
import { Project, ProjectStatus, ProjectType } from '@/types/project'

// Mock 測試資料
const mockProjects: Project[] = [
  {
    id: '1',
    code: 'F20P1',
    name: '台北市政大樓建設專案',
    description: '位於信義區的現代化政府辦公大樓建設，包含智慧建築系統和節能設計',
    status: ProjectStatus.IN_PROGRESS,
    type: ProjectType.CONSTRUCTION,
    progress: 65,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    actualStartDate: new Date('2024-01-05'),
    managerId: 'manager1',
    managerName: '王小明',
    teamMembers: [],
    totalBudget: 1000000,
    usedBudget: 650000,
    currency: 'TWD',
    totalMilestones: 8,
    completedMilestones: 5,
    permissions: [],
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2024-08-30'),
    tags: ['建築', '政府', '智慧建築'],
    lastAccessDate: new Date('2024-08-29')
  },
  {
    id: '2',
    code: 'F22P4',
    name: '高雄捷運延伸線工程',
    description: '高雄捷運紅線往北延伸至岡山區，提升大高雄地區交通便利性',
    status: ProjectStatus.COMPLETED,
    type: ProjectType.INFRASTRUCTURE,
    progress: 100,
    startDate: new Date('2023-06-01'),
    endDate: new Date('2024-05-31'),
    actualStartDate: new Date('2023-06-05'),
    actualEndDate: new Date('2024-05-28'),
    managerId: 'manager2',
    managerName: '李小華',
    teamMembers: [],
    totalBudget: 2000000,
    usedBudget: 1950000,
    currency: 'TWD',
    totalMilestones: 12,
    completedMilestones: 12,
    permissions: [],
    createdAt: new Date('2023-05-01'),
    updatedAt: new Date('2024-05-28'),
    tags: ['交通', '捷運', '基礎建設'],
    lastAccessDate: new Date('2024-08-25')
  },
  {
    id: '3',
    code: 'F24P2',
    name: '桃園機場第三航廈翻新',
    description: '桃園國際機場第三航廈內部翻新工程，提升旅客服務品質',
    status: ProjectStatus.PLANNING,
    type: ProjectType.RENOVATION,
    progress: 15,
    startDate: new Date('2024-09-01'),
    endDate: new Date('2025-08-31'),
    managerId: 'manager3',
    managerName: '張大偉',
    teamMembers: [],
    totalBudget: 800000,
    usedBudget: 120000,
    currency: 'TWD',
    totalMilestones: 6,
    completedMilestones: 1,
    permissions: [],
    createdAt: new Date('2024-07-15'),
    updatedAt: new Date('2024-08-30'),
    tags: ['翻新', '機場', '服務提升']
  },
  {
    id: '4',
    code: 'F23P7',
    name: '台中綠能園區維護',
    description: '台中市綠能科技園區設施維護與設備更新專案',
    status: ProjectStatus.PAUSED,
    type: ProjectType.MAINTENANCE,
    progress: 45,
    startDate: new Date('2023-03-01'),
    endDate: new Date('2024-02-29'),
    actualStartDate: new Date('2023-03-10'),
    managerId: 'manager4',
    managerName: '陳美玲',
    teamMembers: [],
    totalBudget: 500000,
    usedBudget: 225000,
    currency: 'TWD',
    totalMilestones: 4,
    completedMilestones: 2,
    permissions: [],
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-06-15'),
    tags: ['維護', '綠能', '設備更新'],
    lastAccessDate: new Date('2024-08-20')
  }
]

export default function ProjectsTestPage() {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [compact, setCompact] = React.useState(false)

  const handleProjectEnter = React.useCallback(async (projectId: string) => {
    console.log('進入專案:', projectId)
    // 模擬進入專案的處理
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
  }, [])

  const handleAccessRecord = React.useCallback(async (projectId: string) => {
    console.log('記錄專案存取:', projectId)
    // 模擬記錄存取的處理
  }, [])

  const handleRetry = React.useCallback(() => {
    console.log('重新整理專案列表')
    setError(null)
  }, [])

  const simulateError = () => {
    setError('網路連線失敗，請稍後再試')
  }

  const clearError = () => {
    setError(null)
  }

  const toggleCompact = () => {
    setCompact(!compact)
  }

  const simulateLoading = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            ProjectGrid 元件測試
          </h1>
          <p className="text-muted-foreground mb-6">
            測試 ProjectGrid 元件的各種狀態和功能
          </p>

          {/* 控制按鈕 */}
          <div className="flex flex-wrap gap-4 mb-8">
            <button
              onClick={toggleCompact}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              {compact ? '切換到標準模式' : '切換到緊湊模式'}
            </button>
            <button
              onClick={simulateLoading}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
            >
              模擬載入狀態
            </button>
            <button
              onClick={simulateError}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
            >
              模擬錯誤狀態
            </button>
            <button
              onClick={clearError}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              清除錯誤
            </button>
          </div>
        </div>

        {/* ProjectGrid 測試區域 */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            專案網格顯示 {compact && '(緊湊模式)'}
          </h2>
          
          <ProjectGrid
            projects={mockProjects}
            loading={loading}
            error={error}
            compact={compact}
            onProjectEnter={handleProjectEnter}
            onAccessRecord={handleAccessRecord}
            onRetry={handleRetry}
          />
        </div>

        {/* 空狀態測試 */}
        <div className="bg-card border border-border rounded-lg p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">空狀態測試</h2>
          <ProjectGrid
            projects={[]}
            loading={false}
            error={null}
            onRetry={handleRetry}
          />
        </div>

        {/* 載入狀態測試 */}
        <div className="bg-card border border-border rounded-lg p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">載入狀態測試</h2>
          <ProjectGrid
            projects={[]}
            loading={true}
            error={null}
          />
        </div>
      </div>
    </div>
  )
}