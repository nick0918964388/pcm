import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  // Mock 專案成員統計資料
  const mockStats = {
    totalMembers: 10,
    activeMembers: 9,
    inactiveMembers: 1,
    averageWorkload: 75.5,
    skillDistribution: {
      '專案管理': 3,
      'BIM': 2,
      '工程監造': 4,
      'AutoCAD': 3,
      '結構設計': 2,
      '施工管理': 3,
      '品質控制': 2,
      '安全管理': 2,
      '環境監測': 1,
      '溝通協調': 2
    },
    roleDistribution: {
      'PROJECT_MANAGER': 1,
      'SENIOR_ENGINEER': 1,
      'COORDINATOR': 1,
      'ADMIN_STAFF': 1,
      'SITE_SUPERVISOR': 1,
      'QA_ENGINEER': 1,
      'SAFETY_OFFICER': 1,
      'ENVIRONMENTAL_ENGINEER': 1,
      'CONTRACTOR': 1,
      'TEMP_STAFF': 1
    },
    workStatusDistribution: {
      'ACTIVE': 9,
      'INACTIVE': 1
    },
    departmentDistribution: {
      '工程部': 1,
      '設計部': 1,
      '工務部': 1,
      '行政部': 1,
      '施工部': 1,
      '品保部': 1,
      '安全部': 1,
      '環保部': 1,
      '外包單位': 1,
      '臨時部門': 1
    }
  }

  const response = {
    success: true,
    data: mockStats
  }

  return NextResponse.json(response)
}