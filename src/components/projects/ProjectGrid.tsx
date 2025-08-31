import React from 'react'
import { Project, ViewMode } from '@/types/project'
import { ProjectCard } from './ProjectCard'

interface ProjectGridProps {
  projects: Project[]
  viewMode?: ViewMode
  showSelectButton?: boolean
  onProjectClick?: (project: Project) => void
  className?: string
}

/**
 * 專案網格元件
 * 
 * 根據檢視模式以網格或表格形式展示專案列表
 */
export function ProjectGrid({ 
  projects, 
  viewMode = ViewMode.GRID,
  showSelectButton = false,
  onProjectClick, 
  className = '' 
}: ProjectGridProps) {
  
  if (viewMode === ViewMode.TABLE) {
    return (
      <div className={`bg-white rounded-lg overflow-hidden ${className}`}>
        {/* Table Header */}
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10" /> {/* Space for icon */}
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700">專案名稱</span>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-sm font-medium text-gray-700 w-20 text-center">進度</div>
              <div className="text-sm font-medium text-gray-700 w-20 text-center">經理</div>
              <div className="text-sm font-medium text-gray-700 w-24 text-center">截止日期</div>
              {showSelectButton && (
                <div className="w-16" /> /* Space for button */
              )}
            </div>
          </div>
        </div>
        
        {/* Table Body */}
        <div className="divide-y divide-gray-200">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              viewMode={viewMode}
              showSelectButton={showSelectButton}
              onClick={onProjectClick}
            />
          ))}
        </div>
      </div>
    )
  }

  // 網格模式
  return (
    <div className={`grid gap-6 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            viewMode={viewMode}
            showSelectButton={showSelectButton}
            onClick={onProjectClick}
          />
        ))}
      </div>
    </div>
  )
}