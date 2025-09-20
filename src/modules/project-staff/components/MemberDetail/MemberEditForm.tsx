/**
 * @fileoverview MemberEditForm 組件實現
 * @version 1.0
 * @date 2025-08-31
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProjectMemberExtended, WorkStatus, SkillCategory } from '@/types/project'

interface Skill {
  name: string
  category: SkillCategory
  level: number
  years: number
}

interface MemberFormData {
  userName: string
  email: string
  role: string
  workStatus: WorkStatus
  workload: number
  phone?: string
  department?: string
  skills: Skill[]
  permissions: string[]
}

export interface MemberEditFormProps {
  member: ProjectMemberExtended
  onSubmit: (data: MemberFormData) => void
  onCancel: () => void
  loading?: boolean
  error?: string
}

export const MemberEditForm: React.FC<MemberEditFormProps> = ({
  member,
  onSubmit,
  onCancel,
  loading = false,
  error
}) => {
  const [formData, setFormData] = useState<MemberFormData>({
    userName: member.userName,
    email: member.email,
    role: member.role,
    workStatus: member.workStatus,
    workload: member.workload,
    phone: (member as any).phone || '',
    department: (member as any).department || '',
    skills: member.skills || [],
    permissions: member.permissions || []
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isAddingSkill, setIsAddingSkill] = useState(false)
  const [newSkill, setNewSkill] = useState({
    name: '',
    category: SkillCategory.TECHNICAL,
    level: 1,
    years: 1
  })

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.userName.trim()) {
      newErrors.userName = '姓名為必填欄位'
    }

    if (!formData.email.trim()) {
      newErrors.email = '電子郵件為必填欄位'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '請輸入有效的電子郵件格式'
    }

    if (!formData.role.trim()) {
      newErrors.role = '角色為必填欄位'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof MemberFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // 清除對應欄位的錯誤
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleSkillAdd = () => {
    if (newSkill.name.trim()) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, { ...newSkill }]
      }))
      setNewSkill({
        name: '',
        category: SkillCategory.TECHNICAL,
        level: 1,
        years: 1
      })
      setIsAddingSkill(false)
    }
  }

  const handleSkillRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }))
  }

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const handleReset = () => {
    setFormData({
      userName: member.userName,
      email: member.email,
      role: member.role,
      workStatus: member.workStatus,
      workload: member.workload,
      phone: (member as any).phone || '',
      department: (member as any).department || '',
      skills: member.skills || [],
      permissions: member.permissions || []
    })
    setErrors({})
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">編輯人員資訊</h2>
        <div className="flex space-x-2">
          <Button type="button" variant="outline" onClick={handleReset}>
            重設
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? '儲存中...' : '儲存'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      {/* 基本資訊 */}
      <Card>
        <CardHeader>
          <CardTitle>基本資訊</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="userName" className="block text-sm font-medium mb-1">
                姓名 *
              </label>
              <Input
                id="userName"
                value={formData.userName}
                onChange={(e) => handleInputChange('userName', e.target.value)}
                className={cn(errors.userName && 'border-red-500')}
                aria-label="姓名"
              />
              {errors.userName && (
                <p className="text-sm text-red-600 mt-1">{errors.userName}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                電子郵件 *
              </label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={cn(errors.email && 'border-red-500')}
                aria-label="電子郵件"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-1">
                角色 *
              </label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className={cn(errors.role && 'border-red-500')}
                aria-label="角色"
              />
              {errors.role && (
                <p className="text-sm text-red-600 mt-1">{errors.role}</p>
              )}
            </div>

            <div>
              <label htmlFor="workStatus" className="block text-sm font-medium mb-1">
                工作狀態
              </label>
              <Select 
                value={formData.workStatus} 
                onValueChange={(value: WorkStatus) => handleInputChange('workStatus', value)}
              >
                <SelectTrigger aria-label="工作狀態">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={WorkStatus.AVAILABLE}>Available</SelectItem>
                  <SelectItem value={WorkStatus.BUSY}>Busy</SelectItem>
                  <SelectItem value={WorkStatus.UNAVAILABLE}>Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-1">
                電話號碼
              </label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                aria-label="電話號碼"
              />
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-medium mb-1">
                部門
              </label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                aria-label="部門"
              />
            </div>
          </div>

          <div>
            <label htmlFor="workload" className="block text-sm font-medium mb-1">
              工作負荷: {formData.workload}%
            </label>
            <input
              id="workload"
              type="range"
              min="0"
              max="100"
              value={formData.workload}
              onChange={(e) => handleInputChange('workload', parseInt(e.target.value))}
              className="w-full"
              aria-label="工作負荷"
            />
          </div>
        </CardContent>
      </Card>

      {/* 技能管理 */}
      <Card>
        <CardHeader>
          <CardTitle>技能管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {formData.skills.map((skill, index) => (
              <Badge key={index} variant="outline" className="pr-1">
                {skill.name}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => handleSkillRemove(index)}
                  aria-label={`刪除技能 ${skill.name}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>

          {isAddingSkill ? (
            <div className="flex items-center space-x-2">
              <Input
                placeholder="輸入技能名稱"
                value={newSkill.name}
                onChange={(e) => setNewSkill(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSkillAdd()
                  }
                }}
              />
              <Button type="button" size="sm" onClick={handleSkillAdd}>
                確認
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setIsAddingSkill(false)}
              >
                取消
              </Button>
            </div>
          ) : (
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => setIsAddingSkill(true)}
              aria-label="新增技能"
            >
              <Plus className="h-4 w-4 mr-1" />
              新增技能
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 權限設定 */}
      <Card>
        <CardHeader>
          <CardTitle>權限設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="read-permission"
              checked={formData.permissions.includes('read')}
              onCheckedChange={(checked) => handlePermissionChange('read', checked)}
            />
            <label htmlFor="read-permission" className="text-sm font-medium" aria-label="讀取權限">
              讀取權限
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="write-permission"
              checked={formData.permissions.includes('write')}
              onCheckedChange={(checked) => handlePermissionChange('write', checked)}
            />
            <label htmlFor="write-permission" className="text-sm font-medium" aria-label="寫入權限">
              寫入權限
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="admin-permission"
              checked={formData.permissions.includes('admin')}
              onCheckedChange={(checked) => handlePermissionChange('admin', checked)}
            />
            <label htmlFor="admin-permission" className="text-sm font-medium">
              管理員權限
            </label>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}