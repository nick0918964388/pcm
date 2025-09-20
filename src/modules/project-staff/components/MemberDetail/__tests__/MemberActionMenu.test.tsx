/**
 * @fileoverview MemberActionMenu 組件測試
 * @version 1.0
 * @date 2025-08-31
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberActionMenu } from '../MemberActionMenu'
import { ProjectMemberExtended, WorkStatus, SkillCategory } from '@/types/project'

describe('MemberActionMenu', () => {
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
    skills: [],
    workload: 80,
    workStatus: WorkStatus.AVAILABLE,
    lastActiveAt: new Date('2025-08-31')
  }

  const defaultProps = {
    member: mockMember,
    onEdit: vi.fn(),
    onViewDetails: vi.fn(),
    onSendMessage: vi.fn(),
    onDelete: vi.fn()
  }

  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('應該正確渲染操作選單按鈕', () => {
    // Act
    render(<MemberActionMenu {...defaultProps} />)

    // Assert
    expect(screen.getByLabelText('更多操作')).toBeInTheDocument()
  })

  it('應該支援打開選單', async () => {
    // Act
    render(<MemberActionMenu {...defaultProps} />)
    
    const menuButton = screen.getByLabelText('更多操作')
    await user.click(menuButton)

    // Assert
    expect(screen.getByText('檢視詳情')).toBeInTheDocument()
    expect(screen.getByText('編輯資訊')).toBeInTheDocument()
  })

  it('應該支援檢視詳情操作', async () => {
    // Arrange
    const onViewDetails = vi.fn()
    
    render(<MemberActionMenu {...defaultProps} onViewDetails={onViewDetails} />)
    
    const menuButton = screen.getByLabelText('更多操作')
    await user.click(menuButton)

    // Act
    const viewDetailsItem = screen.getByText('檢視詳情')
    await user.click(viewDetailsItem)

    // Assert
    expect(onViewDetails).toHaveBeenCalledWith(mockMember)
  })

  it('應該支援編輯資訊操作', async () => {
    // Arrange
    const onEdit = vi.fn()
    
    render(<MemberActionMenu {...defaultProps} onEdit={onEdit} />)
    
    const menuButton = screen.getByLabelText('更多操作')
    await user.click(menuButton)

    // Act
    const editItem = screen.getByText('編輯資訊')
    await user.click(editItem)

    // Assert
    expect(onEdit).toHaveBeenCalledWith(mockMember)
  })

  it('應該支援發送訊息操作', async () => {
    // Arrange
    const onSendMessage = vi.fn()
    
    render(<MemberActionMenu {...defaultProps} onSendMessage={onSendMessage} />)
    
    const menuButton = screen.getByLabelText('更多操作')
    await user.click(menuButton)

    // Act
    const messageItem = screen.getByText('發送訊息')
    await user.click(messageItem)

    // Assert
    expect(onSendMessage).toHaveBeenCalledWith(mockMember)
  })

  it('應該根據權限顯示不同操作', () => {
    // Act
    render(
      <MemberActionMenu 
        {...defaultProps} 
        permissions={{ canEdit: false, canDelete: false }}
      />
    )

    const menuButton = screen.getByLabelText('更多操作')
    user.click(menuButton)

    // Assert - 沒有編輯和刪除權限時不應顯示這些選項
    expect(screen.queryByText('編輯資訊')).not.toBeInTheDocument()
    expect(screen.queryByText('刪除成員')).not.toBeInTheDocument()
  })

  it('應該支援刪除操作（需要權限）', async () => {
    // Arrange
    const onDelete = vi.fn()
    
    render(
      <MemberActionMenu 
        {...defaultProps} 
        onDelete={onDelete}
        permissions={{ canEdit: true, canDelete: true }}
      />
    )
    
    const menuButton = screen.getByLabelText('更多操作')
    await user.click(menuButton)

    // Act
    const deleteItem = screen.getByText('刪除成員')
    await user.click(deleteItem)

    // Assert
    expect(onDelete).toHaveBeenCalledWith(mockMember)
  })

  it('應該支援鍵盤導航', async () => {
    // Act
    render(<MemberActionMenu {...defaultProps} />)
    
    const menuButton = screen.getByLabelText('更多操作')
    await user.tab() // focus on menu button
    await user.keyboard('{Enter}') // open menu

    // Assert
    expect(screen.getByText('檢視詳情')).toBeInTheDocument()
  })

  it('應該支援 ESC 鍵關閉選單', async () => {
    // Act
    render(<MemberActionMenu {...defaultProps} />)
    
    const menuButton = screen.getByLabelText('更多操作')
    await user.click(menuButton)
    
    // 選單應該打開
    expect(screen.getByText('檢視詳情')).toBeInTheDocument()
    
    // 按 ESC 關閉
    await user.keyboard('{Escape}')

    // Assert - 選單應該關閉
    expect(screen.queryByText('檢視詳情')).not.toBeInTheDocument()
  })

  it('應該支援自訂觸發器', () => {
    // Act
    render(
      <MemberActionMenu 
        {...defaultProps} 
        trigger={<button>自訂按鈕</button>}
      />
    )

    // Assert
    expect(screen.getByText('自訂按鈕')).toBeInTheDocument()
  })

  it('應該支援禁用狀態', () => {
    // Act
    render(<MemberActionMenu {...defaultProps} disabled />)

    // Assert
    const menuButton = screen.getByLabelText('更多操作')
    expect(menuButton).toBeDisabled()
  })

  it('應該支援載入狀態', () => {
    // Act
    render(<MemberActionMenu {...defaultProps} loading />)

    // Assert
    expect(screen.getByTestId('menu-loading')).toBeInTheDocument()
  })

  it('應該支援成員狀態相關操作', async () => {
    // Act
    render(
      <MemberActionMenu 
        {...defaultProps} 
        permissions={{ canEdit: true, canManageStatus: true }}
      />
    )
    
    const menuButton = screen.getByLabelText('更多操作')
    await user.click(menuButton)

    // Assert
    expect(screen.getByText('變更狀態')).toBeInTheDocument()
  })
})