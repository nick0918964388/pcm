'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/store/projectStore'
import { useProjectScopeStore, useRecentProjects } from '@/store/projectScopeStore'
import { Project, ViewMode } from '@/types/project'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectGrid } from '@/components/projects/ProjectGrid'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Grid3X3, List, ArrowRight, ChevronRight } from 'lucide-react'

/**
 * 專案選擇頁面
 * 
 * 此頁面提供使用者在登入後選擇要管理的專案，支援：
 * - 專案搜尋與篩選
 * - 專案卡片和列表檢視模式
 * - 專案進度和狀態顯示
 * - 快速專案存取
 * - 最近存取的專案
 */
export default function ProjectSelectionPage() {
  const router = useRouter()
  const { 
    projects, 
    filteredProjects, 
    loading, 
    searchQuery,
    viewMode,
    initialized,
    initialize,
    searchProjects,
    setViewMode 
  } = useProjectStore()

  const { selectProject } = useProjectScopeStore()
  const recentProjects = useRecentProjects(4)

  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [searchInput, setSearchInput] = useState('')

  // 初始化 store
  useEffect(() => {
    if (!initialized) {
      initialize()
    }
  }, [initialized, initialize])

  // 處理搜尋
  const handleSearch = (query: string) => {
    setSearchInput(query)
    searchProjects(query)
  }

  // 選擇專案並導向儀表板
  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project)
    // 使用專案範疇 store 選擇專案
    selectProject(project)
    // 導向專案專屬的儀表板
    router.push(`/dashboard/${project.id}`)
  }

  // 獲取最近存取的專案資料
  const recentProjectsData = recentProjects
    .map(record => projects.find(p => p.id === record.projectId))
    .filter(Boolean) as Project[]

  // 獲取進行中的專案
  const activeProjects = filteredProjects.filter(p => p.status === '進行中')

  // 獲取專案統計
  const projectStats = {
    total: projects.length,
    active: projects.filter(p => p.status === '進行中').length,
    completed: projects.filter(p => p.status === '已完成').length,
    planning: projects.filter(p => p.status === '規劃中').length,
  }

  if (loading && !initialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00645A] mx-auto mb-4"></div>
          <p className="text-gray-600">載入專案資料中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                選擇專案
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                選擇您要管理的專案以存取專案儀表板
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-sm">
                總計 {projectStats.total} 個專案
              </Badge>
              <Badge variant="secondary" className="text-sm">
                進行中 {projectStats.active}
              </Badge>
              <Badge variant="outline" className="text-sm">
                已完成 {projectStats.completed}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 最近存取的專案 */}
        {recentProjectsData.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              最近存取的專案
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentProjectsData.map((project) => (
                <Card
                  key={project.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-[#00645A]"
                  onClick={() => handleProjectSelect(project)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 truncate">
                      {project.name}
                    </h3>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{project.code}</span>
                    <Badge 
                      variant={project.status === '進行中' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>進度</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-[#00645A] h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 搜尋和篩選工具欄 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="搜尋專案名稱、代碼..."
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-[#00645A] focus:border-[#00645A]"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">檢視模式:</span>
              <div className="flex border border-gray-300 rounded-md">
                <button
                  onClick={() => setViewMode(ViewMode.GRID)}
                  className={`p-2 ${
                    viewMode === ViewMode.GRID
                      ? 'bg-[#00645A] text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode(ViewMode.TABLE)}
                  className={`p-2 ${
                    viewMode === ViewMode.TABLE
                      ? 'bg-[#00645A] text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 專案列表 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              所有專案 ({filteredProjects.length})
            </h2>
          </div>

          {loading && initialized && (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00645A] mx-auto mb-4"></div>
              <p className="text-gray-600">載入中...</p>
            </div>
          )}

          {!loading && filteredProjects.length === 0 && (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <Search className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                找不到專案
              </h3>
              <p className="text-gray-600">
                嘗試調整您的搜尋條件或清除篩選器
              </p>
            </div>
          )}

          {!loading && filteredProjects.length > 0 && (
            <ProjectGrid
              projects={filteredProjects}
              viewMode={viewMode}
              onProjectClick={handleProjectSelect}
              showSelectButton={true}
              className="p-4"
            />
          )}
        </div>

        {/* 快速操作區域 */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            快速操作
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Grid3X3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">檢視所有專案</h4>
                  <p className="text-sm text-gray-600">瀏覽完整專案列表</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
              </div>
            </Card>

            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ArrowRight className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">進行中專案</h4>
                  <p className="text-sm text-gray-600">檢視 {activeProjects.length} 個進行中專案</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
              </div>
            </Card>

            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Search className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">進階搜尋</h4>
                  <p className="text-sm text-gray-600">使用更多篩選選項</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}