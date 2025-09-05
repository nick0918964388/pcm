/**
 * @fileoverview MemberEditForm 組件測試
 * @version 1.0
 * @date 2025-08-31
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberEditForm } from '../MemberEditForm'
import { ProjectMemberExtended, WorkStatus, SkillCategory } from '@/types/project'

describe('MemberEditForm', () => {
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
      }
    ],
    workload: 80,
    workStatus: WorkStatus.AVAILABLE,
    lastActiveAt: new Date('2025-08-31')
  }

  const defaultProps = {
    member: mockMember,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    loading: false
  }

  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('應該正確渲染編輯表單', () => {
    // Act
    render(<MemberEditForm {...defaultProps} />)

    // Assert
    expect(screen.getByDisplayValue('張小明')).toBeInTheDocument()
    expect(screen.getByDisplayValue('zhang@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('developer')).toBeInTheDocument()
  })

  it('應該顯示表單標題', () => {
    // Act
    render(<MemberEditForm {...defaultProps} />)

    // Assert
    expect(screen.getByText('編輯人員資訊')).toBeInTheDocument()
  })

  it('應該支援編輯基本資訊', async () => {
    // Act
    render(<MemberEditForm {...defaultProps} />)

    const nameInput = screen.getByLabelText('姓名')
    await user.clear(nameInput)
    await user.type(nameInput, '李小華')

    // Assert
    expect(nameInput).toHaveValue('李小華')
  })

  it('應該支援編輯聯絡方式', async () => {
    // Act
    render(<MemberEditForm {...defaultProps} />)

    const emailInput = screen.getByLabelText('電子郵件')
    await user.clear(emailInput)
    await user.type(emailInput, 'li@example.com')

    // Assert
    expect(emailInput).toHaveValue('li@example.com')
  })

  it('應該支援編輯工作狀態', async () => {
    // Act
    render(<MemberEditForm {...defaultProps} />)

    const statusSelect = screen.getByLabelText('工作狀態')
    await user.selectOptions(statusSelect, 'busy')

    // Assert
    expect(statusSelect).toHaveValue('busy')
  })

  it('應該支援技能標籤管理', async () => {
    // Act
    render(<MemberEditForm {...defaultProps} />)

    // Assert
    expect(screen.getByText('技能管理')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByLabelText('新增技能')).toBeInTheDocument()
  })

  it('應該支援新增技能', async () => {
    // Act
    render(<MemberEditForm {...defaultProps} />)

    const addButton = screen.getByText('新增技能')
    await user.click(addButton)

    // Assert
    expect(screen.getByPlaceholderText('輸入技能名稱')).toBeInTheDocument()
  })

  it('應該支援刪除技能', async () => {
    // Act
    render(<MemberEditForm {...defaultProps} />)

    const deleteButton = screen.getByLabelText('刪除技能 React')
    await user.click(deleteButton)

    // Assert
    expect(screen.queryByText('React')).not.toBeInTheDocument()
  })

  it('應該支援表單驗證', async () => {
    // Arrange
    const onSubmit = vi.fn()
    
    render(<MemberEditForm {...defaultProps} onSubmit={onSubmit} />)

    // Act - 清空必填欄位
    const nameInput = screen.getByLabelText('姓名')
    await user.clear(nameInput)
    
    const submitButton = screen.getByText('儲存')
    await user.click(submitButton)

    // Assert
    expect(screen.getByText('姓名為必填欄位')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('應該支援電子郵件格式驗證', async () => {
    // Act
    render(<MemberEditForm {...defaultProps} />)

    const emailInput = screen.getByLabelText('電子郵件')
    await user.clear(emailInput)
    await user.type(emailInput, 'invalid-email')
    await user.tab()

    // Assert
    expect(screen.getByText('請輸入有效的電子郵件格式')).toBeInTheDocument()
  })

  it('應該支援提交表單', async () => {
    // Arrange
    const onSubmit = vi.fn()
    
    render(<MemberEditForm {...defaultProps} onSubmit={onSubmit} />)

    // Act
    const nameInput = screen.getByLabelText('姓名')
    await user.clear(nameInput)
    await user.type(nameInput, '李小華')

    const submitButton = screen.getByText('儲存')
    await user.click(submitButton)

    // Assert
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        userName: '李小華'
      })
    )
  })

  it('應該支援取消編輯', async () => {
    // Arrange
    const onCancel = vi.fn()
    
    render(<MemberEditForm {...defaultProps} onCancel={onCancel} />)

    // Act
    const cancelButton = screen.getByText('取消')
    await user.click(cancelButton)

    // Assert
    expect(onCancel).toHaveBeenCalled()
  })

  it('應該顯示載入狀態', () => {
    // Act
    render(<MemberEditForm {...defaultProps} loading />)

    // Assert
    expect(screen.getByText('儲存中...')).toBeInTheDocument()
    expect(screen.getByText('儲存中...')).toBeDisabled()
  })

  it('應該支援工作負荷調整', async () => {
    // Act
    render(<MemberEditForm {...defaultProps} />)

    const workloadSlider = screen.getByLabelText('工作負荷')
    fireEvent.change(workloadSlider, { target: { value: '60' } })

    // Assert
    expect(workloadSlider).toHaveValue('60')
    expect(screen.getByText('60%')).toBeInTheDocument()
  })

  it('應該支援重設表單', async () => {
    // Act
    render(<MemberEditForm {...defaultProps} />)

    // 修改一些值
    const nameInput = screen.getByLabelText('姓名')
    await user.clear(nameInput)
    await user.type(nameInput, '測試名稱')

    // 重設
    const resetButton = screen.getByText('重設')
    await user.click(resetButton)

    // Assert
    expect(screen.getByDisplayValue('張小明')).toBeInTheDocument()
  })

  it('應該支援顯示錯誤訊息', () => {
    // Act
    render(
      <MemberEditForm 
        {...defaultProps} 
        error="更新失敗，請稍後再試" 
      />
    )

    // Assert
    expect(screen.getByText('更新失敗，請稍後再試')).toBeInTheDocument()
  })

  it('應該支援部門選擇', async () => {
    // Act
    render(<MemberEditForm {...defaultProps} />)

    // Assert
    expect(screen.getByLabelText('部門')).toBeInTheDocument()
  })

  it('應該支援電話號碼輸入', async () => {
    // Act
    render(<MemberEditForm {...defaultProps} />)

    const phoneInput = screen.getByLabelText('電話號碼')
    await user.type(phoneInput, '0912345678')

    // Assert
    expect(phoneInput).toHaveValue('0912345678')
  })

  it('應該支援權限設定', () => {
    // Act
    render(<MemberEditForm {...defaultProps} />)

    // Assert
    expect(screen.getByText('權限設定')).toBeInTheDocument()
    expect(screen.getByLabelText('讀取權限')).toBeInTheDocument()
    expect(screen.getByLabelText('寫入權限')).toBeInTheDocument()
  })
})