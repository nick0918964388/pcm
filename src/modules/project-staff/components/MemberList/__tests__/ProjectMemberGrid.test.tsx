/**
 * @fileoverview ProjectMemberGrid 組件測試
 * @version 1.0
 * @date 2025-08-31
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectMemberGrid } from '../ProjectMemberGrid'
import { ProjectMemberExtended, WorkStatus, SkillCategory } from '@/types/project'

describe('ProjectMemberGrid', () => {
  const mockMembers: ProjectMemberExtended[] = [
    {
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
        }
      ],
      workload: 80,
      workStatus: WorkStatus.AVAILABLE,
      lastActiveAt: new Date('2025-08-31')
    },
    {
      id: 'member-002',
      projectId: 'proj-001',
      userId: 'user-002',
      userName: '李小華',
      email: 'li@example.com',
      role: 'designer',
      joinedAt: new Date('2025-01-15'),
      isActive: false,
      permissions: ['read'],
      skills: [
        {
          name: 'Figma',
          category: SkillCategory.DESIGN,
          level: 4,
          years: 2
        }
      ],
      workload: 60,
      workStatus: WorkStatus.BUSY,
      lastActiveAt: new Date('2025-08-30')
    }
  ]

  const defaultProps = {
    members: mockMembers,
    loading: false,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onViewDetails: vi.fn()
  }

  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('應該正確渲染網格佈局', () => {
    // Act
    render(<ProjectMemberGrid {...defaultProps} />)

    // Assert
    expect(screen.getByTestId('member-grid')).toBeInTheDocument()
    expect(screen.getByText('張小明')).toBeInTheDocument()
    expect(screen.getByText('李小華')).toBeInTheDocument()
  })

  it('應該支援響應式網格', () => {
    // Act
    render(<ProjectMemberGrid {...defaultProps} />)

    // Assert
    const grid = screen.getByTestId('member-grid')
    expect(grid).toHaveClass('responsive-grid')
  })

  it('應該支援自訂列數', () => {
    // Act
    render(<ProjectMemberGrid {...defaultProps} columns={4} />)

    // Assert
    const grid = screen.getByTestId('member-grid')
    expect(grid).toHaveStyle('grid-template-columns: repeat(4, 1fr)')
  })

  it('應該支援緊湊模式', () => {
    // Act
    render(<ProjectMemberGrid {...defaultProps} compact />)

    // Assert
    const grid = screen.getByTestId('member-grid')
    expect(grid).toHaveClass('compact')
  })

  it('應該顯示載入狀態', () => {
    // Act
    render(<ProjectMemberGrid {...defaultProps} loading />)

    // Assert
    expect(screen.getByTestId('grid-loading')).toBeInTheDocument()
  })

  it('應該顯示空狀態', () => {
    // Act
    render(<ProjectMemberGrid {...defaultProps} members={[]} />)

    // Assert
    expect(screen.getByText('暫無人員資料')).toBeInTheDocument()
  })

  it('應該支援選擇模式', async () => {
    // Arrange
    const onSelectionChange = vi.fn()
    
    render(
      <ProjectMemberGrid 
        {...defaultProps} 
        selectable
        onSelectionChange={onSelectionChange}
      />
    )

    // Act
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])

    // Assert
    expect(onSelectionChange).toHaveBeenCalled()
  })

  it('應該支援卡片點擊', async () => {
    // Arrange
    const onCardClick = vi.fn()
    
    render(
      <ProjectMemberGrid 
        {...defaultProps} 
        onCardClick={onCardClick}
      />
    )

    // Act
    const firstCard = screen.getByText('張小明').closest('[data-testid="member-card"]')
    if (firstCard) {
      await user.click(firstCard)
    }

    // Assert
    expect(onCardClick).toHaveBeenCalledWith(mockMembers[0])
  })

  it('應該支援拖拽模式', () => {
    // Act
    render(<ProjectMemberGrid {...defaultProps} draggable />)

    // Assert
    const cards = screen.getAllByTestId('member-card')
    cards.forEach(card => {
      expect(card).toHaveAttribute('draggable', 'true')
    })
  })

  it('應該支援虛擬化', () => {
    // Arrange
    const manyMembers = Array.from({ length: 1000 }, (_, i) => ({
      ...mockMembers[0],
      id: `member-${i}`,
      userName: `使用者${i}`
    }))

    // Act
    render(<ProjectMemberGrid {...defaultProps} members={manyMembers} virtualized />)

    // Assert
    expect(screen.getByTestId('virtual-grid')).toBeInTheDocument()
  })

  it('應該支援自訂間隙', () => {
    // Act
    render(<ProjectMemberGrid {...defaultProps} gap={16} />)

    // Assert
    const grid = screen.getByTestId('member-grid')
    expect(grid).toHaveStyle('gap: 16px')
  })
})