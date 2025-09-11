/**
 * @fileoverview ProjectMemberFilters 組件測試
 * @version 1.0
 * @date 2025-08-31
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectMemberFilters } from '../ProjectMemberFilters'
import { WorkStatus, SkillCategory } from '@/types/project'

describe('ProjectMemberFilters', () => {
  const defaultProps = {
    filters: {},
    onFiltersChange: vi.fn(),
    availableRoles: ['developer', 'designer', 'manager'],
    availableSkills: ['React', 'Vue', 'Angular', 'UI/UX', 'Project Management'],
    departments: ['Engineering', 'Design', 'Product', 'Marketing']
  }

  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('應該正確渲染所有篩選器', () => {
    // Act
    render(<ProjectMemberFilters {...defaultProps} />)

    // Assert
    expect(screen.getByText('角色')).toBeInTheDocument()
    expect(screen.getByText('技能')).toBeInTheDocument()
    expect(screen.getByText('工作狀態')).toBeInTheDocument()
    expect(screen.getByText('部門')).toBeInTheDocument()
    expect(screen.getByText('工作負載範圍')).toBeInTheDocument()
    expect(screen.getByText('加入時間')).toBeInTheDocument()
    expect(screen.getByText('活躍狀態')).toBeInTheDocument()
  })

  it('應該支援角色多選篩選', async () => {
    // Arrange
    const onFiltersChange = vi.fn()
    
    render(
      <ProjectMemberFilters 
        {...defaultProps}
        onFiltersChange={onFiltersChange}
      />
    )

    // Act
    const roleFilter = screen.getByTestId('role-filter')
    await user.click(roleFilter)
    
    const developerOption = screen.getByText('developer')
    await user.click(developerOption)
    
    const designerOption = screen.getByText('designer')
    await user.click(designerOption)

    // Assert
    expect(onFiltersChange).toHaveBeenCalledWith({
      role: ['developer', 'designer']
    })
  })

  it('應該支援技能標籤篩選', async () => {
    // Arrange
    const onFiltersChange = vi.fn()
    
    render(
      <ProjectMemberFilters 
        {...defaultProps}
        onFiltersChange={onFiltersChange}
      />
    )

    // Act
    const skillsFilter = screen.getByTestId('skills-filter')
    await user.click(skillsFilter)
    
    const reactOption = screen.getByText('React')
    await user.click(reactOption)

    // Assert
    expect(onFiltersChange).toHaveBeenCalledWith({
      skills: ['React']
    })
  })

  it('應該支援工作狀態篩選', async () => {
    // Arrange
    const onFiltersChange = vi.fn()
    
    render(
      <ProjectMemberFilters 
        {...defaultProps}
        onFiltersChange={onFiltersChange}
      />
    )

    // Act
    const workStatusFilter = screen.getByTestId('work-status-filter')
    await user.click(workStatusFilter)
    
    const availableOption = screen.getByText('Available')
    await user.click(availableOption)

    // Assert
    expect(onFiltersChange).toHaveBeenCalledWith({
      workStatus: [WorkStatus.AVAILABLE]
    })
  })

  it('應該支援工作負載範圍篩選', async () => {
    // Arrange
    const onFiltersChange = vi.fn()
    
    render(
      <ProjectMemberFilters 
        {...defaultProps}
        onFiltersChange={onFiltersChange}
      />
    )

    // Act
    const minWorkloadInput = screen.getByTestId('min-workload-input')
    const maxWorkloadInput = screen.getByTestId('max-workload-input')
    
    await user.clear(minWorkloadInput)
    await user.type(minWorkloadInput, '50')
    
    await user.clear(maxWorkloadInput)
    await user.type(maxWorkloadInput, '80')

    // Assert
    expect(onFiltersChange).toHaveBeenCalledWith({
      workloadRange: { min: 50, max: 80 }
    })
  })

  it('應該支援加入時間範圍篩選', async () => {
    // Arrange
    const onFiltersChange = vi.fn()
    
    render(
      <ProjectMemberFilters 
        {...defaultProps}
        onFiltersChange={onFiltersChange}
      />
    )

    // Act
    const startDateInput = screen.getByTestId('start-date-input')
    const endDateInput = screen.getByTestId('end-date-input')
    
    await user.type(startDateInput, '2025-01-01')
    await user.type(endDateInput, '2025-12-31')

    // Assert
    expect(onFiltersChange).toHaveBeenCalledWith({
      joinDateRange: { 
        start: new Date('2025-01-01'), 
        end: new Date('2025-12-31') 
      }
    })
  })

  it('應該支援活躍狀態篩選', async () => {
    // Arrange
    const onFiltersChange = vi.fn()
    
    render(
      <ProjectMemberFilters 
        {...defaultProps}
        onFiltersChange={onFiltersChange}
      />
    )

    // Act
    const activeCheckbox = screen.getByTestId('active-status-filter')
    await user.click(activeCheckbox)

    // Assert
    expect(onFiltersChange).toHaveBeenCalledWith({
      isActive: true
    })
  })

  it('應該顯示已選擇的篩選器', () => {
    // Arrange
    const filters = {
      role: ['developer', 'designer'],
      skills: ['React', 'Vue'],
      workStatus: [WorkStatus.AVAILABLE],
      isActive: true,
      workloadRange: { min: 50, max: 80 }
    }

    // Act
    render(
      <ProjectMemberFilters 
        {...defaultProps}
        filters={filters}
      />
    )

    // Assert
    expect(screen.getByDisplayValue('developer, designer')).toBeInTheDocument()
    expect(screen.getByDisplayValue('React, Vue')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Available')).toBeInTheDocument()
    expect(screen.getByDisplayValue('50')).toBeInTheDocument()
    expect(screen.getByDisplayValue('80')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { checked: true })).toBeInTheDocument()
  })

  it('應該支援清除所有篩選器', async () => {
    // Arrange
    const onFiltersChange = vi.fn()
    const filters = {
      role: ['developer'],
      skills: ['React'],
      workStatus: [WorkStatus.AVAILABLE]
    }
    
    render(
      <ProjectMemberFilters 
        {...defaultProps}
        filters={filters}
        onFiltersChange={onFiltersChange}
        showClearAll
      />
    )

    // Act
    const clearAllButton = screen.getByText('清除所有篩選')
    await user.click(clearAllButton)

    // Assert
    expect(onFiltersChange).toHaveBeenCalledWith({})
  })

  it('應該支援摺疊/展開篩選面板', async () => {
    // Arrange
    render(
      <ProjectMemberFilters 
        {...defaultProps}
        collapsible
      />
    )

    // Act
    const toggleButton = screen.getByTestId('collapse-toggle')
    await user.click(toggleButton)

    // Assert - 篩選內容應該隱藏
    expect(screen.queryByText('角色')).not.toBeVisible()
  })

  it('應該正確顯示篩選器數量徽章', () => {
    // Arrange
    const filters = {
      role: ['developer', 'designer'],
      skills: ['React'],
      workStatus: [WorkStatus.AVAILABLE]
    }

    // Act
    render(
      <ProjectMemberFilters 
        {...defaultProps}
        filters={filters}
        showFilterCount
      />
    )

    // Assert
    expect(screen.getByText('4')).toBeInTheDocument() // 2 roles + 1 skill + 1 work status
  })

  it('應該支援響應式設計', () => {
    // Act
    render(
      <ProjectMemberFilters 
        {...defaultProps}
        responsive
      />
    )

    // Assert
    const container = screen.getByTestId('filters-container')
    expect(container).toHaveClass('responsive')
  })
})