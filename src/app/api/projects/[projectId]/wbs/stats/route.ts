import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  // Mock WBS 統計資料
  const mockStats = {
    totalNodes: 10,
    completedNodes: 3,
    inProgressNodes: 4,
    plannedNodes: 3,
    totalBudget: 500000000,
    actualCost: 275000000,
    budgetUtilization: 55,
    overallProgress: 65,
    criticalPath: ['wbs-001', 'wbs-003', 'wbs-007'],
    milestoneCount: 5,
    delayedTasks: 1,
    onTrackTasks: 6,
    statusDistribution: {
      'COMPLETED': 3,
      'IN_PROGRESS': 4,
      'PLANNED': 3,
      'ON_HOLD': 0,
      'CANCELLED': 0
    },
    priorityDistribution: {
      'HIGH': 5,
      'MEDIUM': 4,
      'LOW': 1
    },
    typeDistribution: {
      'PROJECT': 1,
      'PHASE': 3,
      'WORK_PACKAGE': 6,
      'MILESTONE': 0
    },
    levelDistribution: {
      0: 1,
      1: 3,
      2: 6,
      3: 0
    },
    progressByLevel: {
      0: 65,
      1: 58.3,
      2: 46.7
    },
    budgetByStatus: {
      'COMPLETED': 150000000,
      'IN_PROGRESS': 200000000,
      'PLANNED': 150000000
    },
    actualCostByStatus: {
      'COMPLETED': 148000000,
      'IN_PROGRESS': 125000000,
      'PLANNED': 2000000
    }
  }

  const response = {
    success: true,
    data: mockStats
  }

  return NextResponse.json(response)
}