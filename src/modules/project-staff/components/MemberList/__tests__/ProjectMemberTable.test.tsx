/**
 * @fileoverview ProjectMemberTable 組件測試
 * @version 1.0
 * @date 2025-08-31
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectMemberTable } from '../ProjectMemberTable'
import { ProjectMemberExtended, WorkStatus, SkillCategory } from '@/types/project'

describe('ProjectMemberTable', () => {
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
    onViewDetails: vi.fn(),
    onSort: vi.fn()
  }

  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('應該正確渲染表格頭部', () => {
    // Act
    render(<ProjectMemberTable {...defaultProps} />)

    // Assert
    expect(screen.getByText('姓名')).toBeInTheDocument()
    expect(screen.getByText('職位')).toBeInTheDocument()
    expect(screen.getByText('狀態')).toBeInTheDocument()
    expect(screen.getByText('工作負荷')).toBeInTheDocument()
    expect(screen.getByText('技能')).toBeInTheDocument()
    expect(screen.getByText('操作')).toBeInTheDocument()
  })

  it('應該正確渲染成員資料行', () => {
    // Act
    render(<ProjectMemberTable {...defaultProps} />)

    // Assert
    expect(screen.getByText('張小明')).toBeInTheDocument()
    expect(screen.getByText('zhang@example.com')).toBeInTheDocument()
    expect(screen.getByText('developer')).toBeInTheDocument()
    expect(screen.getByText('李小華')).toBeInTheDocument()
    expect(screen.getByText('li@example.com')).toBeInTheDocument()
    expect(screen.getByText('designer')).toBeInTheDocument()
  })

  it('應該支援列排序', async () => {
    // Arrange
    const onSort = vi.fn()
    
    render(<ProjectMemberTable {...defaultProps} onSort={onSort} />)

    // Act
    const nameHeader = screen.getByText('姓名')
    await user.click(nameHeader)

    // Assert
    expect(onSort).toHaveBeenCalledWith('userName', 'asc')
  })

  it('應該正確顯示工作狀態', () => {
    // Act
    render(<ProjectMemberTable {...defaultProps} />)

    // Assert
    const statusCells = screen.getAllByTestId('status-cell')
    expect(statusCells[0]).toHaveTextContent('Available')
    expect(statusCells[1]).toHaveTextContent('Busy')
  })

  it('應該顯示工作負荷進度條', () => {
    // Act
    render(<ProjectMemberTable {...defaultProps} />)

    // Assert
    expect(screen.getAllByTestId('workload-progress')).toHaveLength(2)
  })

  it('應該顯示技能標籤', () => {
    // Act
    render(<ProjectMemberTable {...defaultProps} />)

    // Assert
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Figma')).toBeInTheDocument()
  })

  it('應該支援行內編輯', async () => {
    // Arrange
    render(<ProjectMemberTable {...defaultProps} editable />)

    // Act
    const editButton = screen.getAllByLabelText('編輯')[0]
    await user.click(editButton)

    // Assert
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('應該支援批量選擇', async () => {
    // Arrange
    const onSelectionChange = vi.fn()
    
    render(
      <ProjectMemberTable 
        {...defaultProps} 
        selectable
        onSelectionChange={onSelectionChange}
      />
    )

    // Act
    const selectAllCheckbox = screen.getByLabelText('全選')
    await user.click(selectAllCheckbox)

    // Assert
    expect(onSelectionChange).toHaveBeenCalledWith(['member-001', 'member-002'])
  })

  it('應該支援個別行選擇', async () => {
    // Arrange
    const onSelectionChange = vi.fn()
    
    render(
      <ProjectMemberTable 
        {...defaultProps} 
        selectable
        onSelectionChange={onSelectionChange}
      />
    )

    // Act
    const rowCheckboxes = screen.getAllByRole('checkbox')
    await user.click(rowCheckboxes[1]) // 第一個是全選，第二個是第一行

    // Assert
    expect(onSelectionChange).toHaveBeenCalledWith(['member-001'])
  })

  it('應該顯示載入狀態', () => {
    // Act
    render(<ProjectMemberTable {...defaultProps} loading />)

    // Assert
    expect(screen.getByTestId('table-loading')).toBeInTheDocument()
  })

  it('應該顯示空狀態', () => {
    // Act
    render(<ProjectMemberTable {...defaultProps} members={[]} />)

    // Assert
    expect(screen.getByText('暫無人員資料')).toBeInTheDocument()
  })

  it('應該支援虛擬化渲染', () => {
    // Arrange
    const manyMembers = Array.from({ length: 1000 }, (_, i) => ({
      ...mockMembers[0],
      id: `member-${i}`,
      userName: `使用者${i}`
    }))

    // Act
    render(<ProjectMemberTable {...defaultProps} members={manyMembers} virtualized />)

    // Assert
    const virtualContainer = screen.getByTestId('virtual-table')
    expect(virtualContainer).toBeInTheDocument()
  })

  it('應該支援快速操作按鈕', async () => {
    // Arrange
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const onViewDetails = vi.fn()
    
    render(
      <ProjectMemberTable 
        {...defaultProps}
        onEdit={onEdit}
        onDelete={onDelete}
        onViewDetails={onViewDetails}
      />
    )

    // Act
    const viewButtons = screen.getAllByLabelText('檢視詳情')
    const editButtons = screen.getAllByLabelText('編輯')
    const deleteButtons = screen.getAllByLabelText('刪除')
    
    await user.click(viewButtons[0])
    await user.click(editButtons[0])
    await user.click(deleteButtons[0])

    // Assert
    expect(onViewDetails).toHaveBeenCalledWith(mockMembers[0])
    expect(onEdit).toHaveBeenCalledWith(mockMembers[0])
    expect(onDelete).toHaveBeenCalledWith(mockMembers[0])
  })

  it('應該支援響應式設計', () => {
    // Act
    render(<ProjectMemberTable {...defaultProps} />)

    // Assert
    const table = screen.getByRole('table')
    expect(table).toHaveClass('responsive-table')
  })
})