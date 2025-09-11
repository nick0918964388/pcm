/**
 * @fileoverview MemberDetailModal 組件測試
 * @version 1.0
 * @date 2025-08-31
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberDetailModal } from '../MemberDetailModal'
import { ProjectMemberExtended, WorkStatus, SkillCategory } from '@/types/project'

describe('MemberDetailModal', () => {
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
    open: true,
    member: mockMember,
    onClose: vi.fn(),
    onEdit: vi.fn()
  }

  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('應該正確渲染人員詳情模態視窗', () => {
    // Act
    render(<MemberDetailModal {...defaultProps} />)

    // Assert
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('人員詳情')).toBeInTheDocument()
  })

  it('應該顯示人員基本資訊', () => {
    // Act
    render(<MemberDetailModal {...defaultProps} />)

    // Assert
    expect(screen.getByText('張小明')).toBeInTheDocument()
    expect(screen.getByText('zhang@example.com')).toBeInTheDocument()
    expect(screen.getByText('developer')).toBeInTheDocument()
  })

  it('應該顯示人員頭像和狀態', () => {
    // Act
    render(<MemberDetailModal {...defaultProps} />)

    // Assert
    expect(screen.getByTestId('member-avatar')).toBeInTheDocument()
    expect(screen.getByTestId('member-status')).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  it('應該顯示技能標籤和級別', () => {
    // Act
    render(<MemberDetailModal {...defaultProps} />)

    // Assert
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText('Level 5')).toBeInTheDocument()
    expect(screen.getByText('Level 4')).toBeInTheDocument()
  })

  it('應該顯示工作負荷資訊', () => {
    // Act
    render(<MemberDetailModal {...defaultProps} />)

    // Assert
    expect(screen.getByText('工作負荷')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByTestId('workload-chart')).toBeInTheDocument()
  })

  it('應該顯示專案參與歷史', () => {
    // Act
    render(<MemberDetailModal {...defaultProps} />)

    // Assert
    expect(screen.getByText('專案歷史')).toBeInTheDocument()
    expect(screen.getByTestId('project-history')).toBeInTheDocument()
  })

  it('應該顯示工作負荷時間線', () => {
    // Act
    render(<MemberDetailModal {...defaultProps} />)

    // Assert
    expect(screen.getByText('負荷時間線')).toBeInTheDocument()
    expect(screen.getByTestId('workload-timeline')).toBeInTheDocument()
  })

  it('應該支援關閉模態視窗', async () => {
    // Arrange
    const onClose = vi.fn()
    
    render(<MemberDetailModal {...defaultProps} onClose={onClose} />)

    // Act
    const closeButton = screen.getByLabelText('關閉')
    await user.click(closeButton)

    // Assert
    expect(onClose).toHaveBeenCalled()
  })

  it('應該支援按 ESC 鍵關閉', () => {
    // Arrange
    const onClose = vi.fn()
    
    render(<MemberDetailModal {...defaultProps} onClose={onClose} />)

    // Act
    fireEvent.keyDown(document, { key: 'Escape' })

    // Assert
    expect(onClose).toHaveBeenCalled()
  })

  it('應該支援編輯按鈕', async () => {
    // Arrange
    const onEdit = vi.fn()
    
    render(<MemberDetailModal {...defaultProps} onEdit={onEdit} />)

    // Act
    const editButton = screen.getByText('編輯')
    await user.click(editButton)

    // Assert
    expect(onEdit).toHaveBeenCalledWith(mockMember)
  })

  it('應該顯示載入狀態', () => {
    // Act
    render(<MemberDetailModal {...defaultProps} loading />)

    // Assert
    expect(screen.getByTestId('detail-loading')).toBeInTheDocument()
  })

  it('應該顯示錯誤狀態', () => {
    // Act
    render(
      <MemberDetailModal 
        {...defaultProps} 
        error="載入失敗" 
      />
    )

    // Assert
    expect(screen.getByText('載入失敗')).toBeInTheDocument()
  })

  it('應該支援聯絡方式顯示', () => {
    // Arrange
    const memberWithContact = {
      ...mockMember,
      phone: '0912345678',
      department: '技術部門'
    }

    // Act
    render(
      <MemberDetailModal 
        {...defaultProps} 
        member={memberWithContact}
      />
    )

    // Assert
    expect(screen.getByText('0912345678')).toBeInTheDocument()
    expect(screen.getByText('技術部門')).toBeInTheDocument()
  })

  it('應該支援權限顯示', () => {
    // Act
    render(<MemberDetailModal {...defaultProps} />)

    // Assert
    expect(screen.getByText('權限')).toBeInTheDocument()
    expect(screen.getByText('read')).toBeInTheDocument()
    expect(screen.getByText('write')).toBeInTheDocument()
  })

  it('應該支援最後活躍時間顯示', () => {
    // Act
    render(<MemberDetailModal {...defaultProps} />)

    // Assert
    expect(screen.getByText(/最後活躍/)).toBeInTheDocument()
  })

  it('應該支援響應式設計', () => {
    // Act
    render(<MemberDetailModal {...defaultProps} />)

    // Assert
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('responsive-modal')
  })

  it('應該支援發送訊息功能', async () => {
    // Arrange
    const onSendMessage = vi.fn()
    
    render(
      <MemberDetailModal 
        {...defaultProps} 
        onSendMessage={onSendMessage}
      />
    )

    // Act
    const messageButton = screen.getByText('發送訊息')
    await user.click(messageButton)

    // Assert
    expect(onSendMessage).toHaveBeenCalledWith(mockMember)
  })
})