'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProjectStore } from '@/store/projectStore'
import { useProjectScopeStore } from '@/store/projectScopeStore'
import { Project } from '@/types/project'
import { 
  StatCard, 
  MilestoneTimeline, 
  KPIProgressBar,
  DataTable,
  Column
} from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Navbar } from '@/components/layout/Navbar'
import { 
  ArrowLeft, 
  Settings, 
  Share2, 
  Download,
  Calendar,
  Users,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'

interface ESHEvent {
  id: number
  type: string
  site: string
  location: string
  person: string
  date: string
}

interface NewsItem {
  id: number
  category: string
  site: string
  title: string
  date: string
}

/**
 * 專案專屬儀表板頁面
 * 
 * 根據選定的專案 ID 顯示該專案的詳細儀表板內容
 */
export default function ProjectDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const { getProject, initialize, initialized } = useProjectStore()
  const { currentProject, selectProject } = useProjectScopeStore()
  
  const [loading, setLoading] = useState(true)

  const projectId = params.projectId as string

  useEffect(() => {
    const loadProject = async () => {
      setLoading(true)
      
      // 確保 store 已初始化
      if (!initialized) {
        await initialize()
      }

      // 檢查目前選中的專案是否符合
      if (currentProject && currentProject.id === projectId) {
        setLoading(false)
        return
      }

      // 從 store 獲取專案
      const project = getProject(projectId)
      if (project) {
        selectProject(project)
      } else {
        // 專案不存在，導向專案選擇頁面
        router.push('/project-selection')
      }
      
      setLoading(false)
    }

    if (projectId) {
      loadProject()
    }
  }, [projectId, getProject, initialize, initialized, router, currentProject, selectProject])

  // 處理返回專案選擇
  const handleBackToSelection = () => {
    router.push('/project-selection')
  }

  // 獲取專案特定的里程碑資料（模擬）
  const getProjectMilestones = (project: Project) => {
    const startDate = new Date(project.startDate)
    const endDate = new Date(project.endDate)
    const duration = endDate.getTime() - startDate.getTime()
    
    return [
      { 
        date: new Date(startDate).toLocaleDateString('zh-TW'), 
        label: '專案開始', 
        status: 'completed' as const 
      },
      { 
        date: new Date(startDate.getTime() + duration * 0.25).toLocaleDateString('zh-TW'), 
        label: 'M1', 
        status: project.progress > 25 ? 'completed' as const : 'current' as const 
      },
      { 
        date: new Date(startDate.getTime() + duration * 0.5).toLocaleDateString('zh-TW'), 
        label: 'M2', 
        status: project.progress > 50 ? 'completed' as const : project.progress > 25 ? 'current' as const : 'upcoming' as const 
      },
      { 
        date: new Date(startDate.getTime() + duration * 0.75).toLocaleDateString('zh-TW'), 
        label: 'M3', 
        status: project.progress > 75 ? 'completed' as const : project.progress > 50 ? 'current' as const : 'upcoming' as const 
      },
      { 
        date: new Date(endDate).toLocaleDateString('zh-TW'), 
        label: '專案完成', 
        status: project.progress === 100 ? 'completed' as const : 'upcoming' as const 
      },
    ]
  }

  // 獲取專案特定的 KPI 資料（模擬）
  const getProjectKPIData = (project: Project) => {
    const baseValue = Math.floor(project.progress * 25)
    return [
      { label: project.code + '-A', value: baseValue + Math.floor(Math.random() * 200), maxValue: 2500 },
      { label: project.code + '-B', value: baseValue + Math.floor(Math.random() * 300), maxValue: 2500 },
      { label: project.code + '-C', value: baseValue + Math.floor(Math.random() * 400), maxValue: 2500 },
      { label: project.code + '-D', value: baseValue + Math.floor(Math.random() * 500), maxValue: 2500 },
    ]
  }

  // 專案特定的 ESH 事件資料（模擬）
  const getProjectESHEvents = (project: Project): ESHEvent[] => [
    {
      id: 1,
      type: '事件',
      site: project.code,
      location: '施工區域A',
      person: `${new Date().toLocaleDateString()} ${project.code}/施工人員 安全檢查作業`,
      date: new Date().toLocaleDateString('zh-TW')
    },
    {
      id: 2,
      type: '檢查',
      site: project.code,
      location: '施工區域B',
      person: `${new Date(Date.now() - 86400000).toLocaleDateString()} ${project.code}/品管人員 品質檢測作業`,
      date: new Date(Date.now() - 86400000).toLocaleDateString('zh-TW')
    }
  ]

  // 專案特定的新聞資料（模擬）
  const getProjectNews = (project: Project): NewsItem[] => [
    {
      id: 1,
      category: 'Progress',
      site: project.code,
      title: `${project.name} 里程碑 M${Math.ceil(project.progress / 25)} 進度更新`,
      date: new Date().toLocaleDateString('zh-TW')
    },
    {
      id: 2,
      category: 'Meeting',
      site: project.code,
      title: `${project.name} 週會會議記錄`,
      date: new Date(Date.now() - 86400000).toLocaleDateString('zh-TW')
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00645A] mx-auto mb-4"></div>
          <p className="text-gray-600">載入專案儀表板中...</p>
        </div>
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            找不到專案
          </h2>
          <p className="text-gray-600 mb-4">
            指定的專案不存在或您沒有存取權限
          </p>
          <Button onClick={handleBackToSelection}>
            返回專案選擇
          </Button>
        </div>
      </div>
    )
  }

  const milestones = getProjectMilestones(currentProject)
  const kpiData = getProjectKPIData(currentProject)
  const eshEvents = getProjectESHEvents(currentProject)
  const newsItems = getProjectNews(currentProject)

  const eshColumns: Column<ESHEvent>[] = [
    {
      key: 'type',
      title: '類型',
      width: '80px',
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
          value === '意外' ? 'bg-red-100 text-red-800' : 
          value === '事件' ? 'bg-yellow-100 text-yellow-800' : 
          'bg-blue-100 text-blue-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'site',
      title: '工地',
      width: '100px',
    },
    {
      key: 'location',
      title: '區域',
      width: '120px',
    },
    {
      key: 'person',
      title: '事件描述',
    },
    {
      key: 'date',
      title: '日期',
      width: '100px',
    },
  ]

  const newsColumns: Column<NewsItem>[] = [
    {
      key: 'category',
      title: '類別',
      width: '80px',
    },
    {
      key: 'site',
      title: '工地',
      width: '80px',
    },
    {
      key: 'title',
      title: '消息內容',
    },
    {
      key: 'date',
      title: '日期',
      width: '100px',
    },
  ]

  // 計算專案統計資料
  const projectStats = {
    actualDays: Math.floor((new Date().getTime() - new Date(currentProject.startDate).getTime()) / (1000 * 60 * 60 * 24)),
    planDays: Math.floor((new Date(currentProject.endDate).getTime() - new Date(currentProject.startDate).getTime()) / (1000 * 60 * 60 * 24)),
    budgetUsedPercentage: Math.floor((currentProject.usedBudget / currentProject.totalBudget) * 100),
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <Navbar showProjectSelector={true} />
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 max-w-none">
      {/* Header */}
      <div className="bg-[#00645A] text-white p-3 sm:p-4 rounded shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToSelection}
              className="text-white hover:bg-white/10 p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0">
              <h1 className="text-xl sm:text-2xl font-bold">{currentProject.name}</h1>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  {currentProject.code}
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  {currentProject.status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs sm:text-sm opacity-90">
              今天是 {new Date().toLocaleDateString('zh-TW')}
            </span>
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 p-2">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 p-2">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 p-2">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout - 響應式布局 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* 左側 - 里程碑和統計卡片 */}
        <div className="xl:col-span-5 space-y-4">
          {/* Milestone Timeline */}
          <MilestoneTimeline 
            milestones={milestones}
            currentDate={new Date().toLocaleDateString('zh-TW')}
          />

          {/* 統計卡片 - 響應式網格 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="專案期程"
              startDate={new Date(currentProject.startDate).toLocaleDateString('zh-TW')}
              endDate={new Date(currentProject.endDate).toLocaleDateString('zh-TW')}
              actualDays={projectStats.actualDays}
              planDays={projectStats.planDays}
              color="green"
            />
            
            <StatCard
              title="專案進度"
              percentage={`${currentProject.progress}%`}
              actual={`${currentProject.progress}%`}
              plan="100%"
              color="blue"
              subItems={[
                { label: '完成里程碑', value: `${currentProject.completedMilestones}/${currentProject.totalMilestones}` },
                { label: '預算使用', value: `${projectStats.budgetUsedPercentage}%` }
              ]}
            />
            
            <StatCard
              title="專案團隊"
              value={currentProject.teamMembers.length}
              unit="人"
              color="yellow"
              subItems={[
                { label: '專案經理', value: currentProject.managerName },
                { label: '團隊規模', value: currentProject.teamMembers.length, unit: '人' }
              ]}
            />
            
            <StatCard
              title="預算狀況"
              value={`${Math.floor(currentProject.usedBudget / 10000)}/${Math.floor(currentProject.totalBudget / 10000)}`}
              unit="萬元"
              color="red"
              subItems={[
                { label: '已使用', value: `${projectStats.budgetUsedPercentage}%` },
                { label: '剩餘', value: `${100 - projectStats.budgetUsedPercentage}%` }
              ]}
            />
          </div>
        </div>

        {/* 右側 - KPI 和表格 */}
        <div className="xl:col-span-7 space-y-4">
          {/* KPI Progress Bars */}
          <div className="bg-white p-4 sm:p-6 rounded shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-1 sm:space-y-0">
              <h3 className="text-base sm:text-lg font-bold text-[#1A1A1A]">
                {currentProject.name} KPI 指標
              </h3>
              <span className="text-xs sm:text-sm text-[#8C8C8C]">千小時</span>
            </div>
            <div className="space-y-3">
              {kpiData.map((kpi, index) => (
                <KPIProgressBar
                  key={index}
                  label={kpi.label}
                  value={kpi.value}
                  maxValue={kpi.maxValue}
                  color={kpi.value > kpi.maxValue * 0.8 ? 'red' : kpi.value > kpi.maxValue * 0.6 ? 'yellow' : 'green'}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 底部表格區域 - 響應式布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 專案 ESH 要覽 */}
        <div>
          <div className="bg-white rounded shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="p-4 border-b border-[#F0F0F0] flex items-center justify-between">
              <h3 className="font-bold text-[#1A1A1A]">{currentProject.code} ESH 要覽</h3>
              <button className="text-sm text-[#00645A] hover:underline font-medium">...more</button>
            </div>
            <div className="overflow-x-auto">
              <DataTable
                columns={eshColumns}
                data={eshEvents}
                className="shadow-none rounded-none"
              />
            </div>
          </div>
        </div>

        {/* 專案消息 */}
        <div>
          <div className="bg-white rounded shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="p-4 border-b border-[#F0F0F0] flex items-center justify-between">
              <h3 className="font-bold text-[#1A1A1A]">{currentProject.name} 專案消息</h3>
              <button className="text-sm text-[#00645A] hover:underline font-medium">...more</button>
            </div>
            <div className="overflow-x-auto">
              <DataTable
                columns={newsColumns}
                data={newsItems}
                className="shadow-none rounded-none"
              />
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}