/**
 * @fileoverview ProjectMemberCard 組件測試
 * @version 1.0
 * @date 2025-08-31
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectMemberCard } from '../ProjectMemberCard'
import { ProjectMemberExtended, WorkStatus, SkillCategory } from '@/types/project'

describe('ProjectMemberCard', () => {
  const mockMember: ProjectMemberExtended = {
    id: 'member-001',
    projectId: 'proj-001',
    userId: 'user-001',
    userName: '張小明',
    email: 'zhang@example.com',
    role: 'developer',
    joinedAt: new Date('2025-01-01'),
    isActive: true,
    permissions: ['read', 'write'],
    skills: [
      {
        name: 'React',
        category: SkillCategory.TECHNICAL,
        level: 5,
        years: 3
      },
      {
        name: 'TypeScript',
        category: SkillCategory.TECHNICAL,
        level: 4,
        years: 2
      }
    ],
    workload: 80,
    workStatus: WorkStatus.AVAILABLE,
    lastActiveAt: new Date('2025-08-31')
  }

  const defaultProps = {
    member: mockMember,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onViewDetails: vi.fn()
  }

  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('應該正確渲染人員基本資訊', () => {
    // Act
    render(<ProjectMemberCard {...defaultProps} />)

    // Assert
    expect(screen.getByText('張小明')).toBeInTheDocument()
    expect(screen.getByText('zhang@example.com')).toBeInTheDocument()
    expect(screen.getByText('developer')).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  it('應該顯示技能標籤', () => {
    // Act
    render(<ProjectMemberCard {...defaultProps} />)

    // Assert
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('應該顯示工作負荷進度條', () => {
    // Act
    render(<ProjectMemberCard {...defaultProps} />)

    // Assert
    expect(screen.getByTestId('workload-progress')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('應該顯示快速操作按鈕', () => {
    // Act
    render(<ProjectMemberCard {...defaultProps} />)

    // Assert
    expect(screen.getByLabelText('檢視詳情')).toBeInTheDocument()
    expect(screen.getByLabelText('編輯')).toBeInTheDocument()
    expect(screen.getByLabelText('刪除')).toBeInTheDocument()
  })

  it('應該支援點擊檢視詳情', async () => {
    // Arrange
    const onViewDetails = vi.fn()
    
    render(
      <ProjectMemberCard 
        {...defaultProps}
        onViewDetails={onViewDetails}
      />
    )

    // Act
    const detailsButton = screen.getByLabelText('檢視詳情')
    await user.click(detailsButton)

    // Assert
    expect(onViewDetails).toHaveBeenCalledWith(mockMember)
  })

  it('應該支援點擊編輯', async () => {
    // Arrange
    const onEdit = vi.fn()
    
    render(
      <ProjectMemberCard 
        {...defaultProps}
        onEdit={onEdit}
      />
    )

    // Act
    const editButton = screen.getByLabelText('編輯')
    await user.click(editButton)

    // Assert
    expect(onEdit).toHaveBeenCalledWith(mockMember)
  })

  it('應該支援點擊刪除', async () => {
    // Arrange
    const onDelete = vi.fn()
    
    render(
      <ProjectMemberCard 
        {...defaultProps}
        onDelete={onDelete}
      />
    )

    // Act
    const deleteButton = screen.getByLabelText('刪除')
    await user.click(deleteButton)

    // Assert
    expect(onDelete).toHaveBeenCalledWith(mockMember)
  })

  it('應該支援選擇模式', async () => {
    // Arrange
    const onSelect = vi.fn()
    
    render(
      <ProjectMemberCard 
        {...defaultProps}
        selectable
        selected={false}
        onSelect={onSelect}
      />
    )

    // Act
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)

    // Assert
    expect(onSelect).toHaveBeenCalledWith(mockMember.id, true)
  })

  it('應該正確顯示活躍狀態', () => {
    // Act - 活躍用戶
    const { rerender } = render(<ProjectMemberCard {...defaultProps} />)
    
    expect(screen.getByTestId('active-indicator')).toHaveClass('bg-green-500')
    
    // Act - 非活躍用戶
    const inactiveMember = { ...mockMember, isActive: false }
    rerender(<ProjectMemberCard {...defaultProps} member={inactiveMember} />)
    
    expect(screen.getByTestId('active-indicator')).toHaveClass('bg-gray-400')
  })

  it('應該根據工作狀態顯示不同顏色', () => {
    // Act - Available 狀態
    const { rerender } = render(<ProjectMemberCard {...defaultProps} />)
    expect(screen.getByTestId('status-badge')).toHaveClass('bg-green-100')
    
    // Act - Busy 狀態
    const busyMember = { ...mockMember, workStatus: WorkStatus.BUSY }
    rerender(<ProjectMemberCard {...defaultProps} member={busyMember} />)
    expect(screen.getByTestId('status-badge')).toHaveClass('bg-yellow-100')
    
    // Act - Unavailable 狀態
    const unavailableMember = { ...mockMember, workStatus: WorkStatus.UNAVAILABLE }
    rerender(<ProjectMemberCard {...defaultProps} member={unavailableMember} />)
    expect(screen.getByTestId('status-badge')).toHaveClass('bg-red-100')
  })

  it('應該支援緊湊模式', () => {
    // Act
    render(<ProjectMemberCard {...defaultProps} compact />)

    // Assert
    const card = screen.getByTestId('member-card')
    expect(card).toHaveClass('compact')
  })

  it('應該支援顯示加入時間', () => {
    // Act
    render(<ProjectMemberCard {...defaultProps} showJoinDate />)

    // Assert
    expect(screen.getByText(/加入時間/)).toBeInTheDocument()
  })

  it('應該支援顯示最後活躍時間', () => {
    // Act
    render(<ProjectMemberCard {...defaultProps} showLastActive />)

    // Assert
    expect(screen.getByText(/最後活躍/)).toBeInTheDocument()
  })

  it('應該支援隱藏操作按鈕', () => {
    // Act
    render(<ProjectMemberCard {...defaultProps} hideActions />)

    // Assert
    expect(screen.queryByLabelText('檢視詳情')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('編輯')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('刪除')).not.toBeInTheDocument()
  })

  it('應該支援拖拽功能', () => {
    // Act
    render(<ProjectMemberCard {...defaultProps} draggable />)

    // Assert
    const card = screen.getByTestId('member-card')
    expect(card).toHaveAttribute('draggable', 'true')
  })
})