'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Download, 
  RefreshCw, 
  Calendar,
  Table2,
  Phone,
  Users,
  Clock,
  AlertTriangle,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'

// 導入自定義 hooks 和類型
import { useDutySchedules, useCurrentDuty, useDutyScheduleExport, useDutyContact } from '@/lib/hooks/useDutySchedules'
import { 
  DutySchedule,
  DutyScheduleFilters,
  DutyScheduleSort,
  ShiftType,
  DutyStatus,
  WorkArea,
  DUTY_STATUS_COLORS,
  SHIFT_TYPE_ICONS,
  WORK_AREA_ICONS,
  formatShiftTime
} from '@/types/dutySchedule'

// 組件導入
import { DutyScheduleFilters as FiltersComponent } from '@/components/duty-schedule/DutyScheduleFilters'
import { DutyScheduleTable } from '@/components/duty-schedule/DutyScheduleTable'
import { DutyPersonDetailDialog } from '@/components/duty-schedule/DutyPersonDetailDialog'
// import { DutyScheduleCalendar } from '@/components/duty-schedule/DutyScheduleCalendar'

/**
 * 廠商人員值班查詢頁面
 * 
 * 基於設計文件實現的值班安排管理系統
 * 包含篩選、表格/日曆視圖、統計資訊、詳細資料查看等功能
 */
export default function VendorDutySchedulePage() {
  const params = useParams()
  const projectId = params.projectId as string
  
  // 主要數據 hooks
  const {
    schedules,
    stats,
    pagination,
    loading,
    error,
    filters,
    sort,
    updateFilters,
    updatePagination,
    updateSort,
    resetFilters,
    quickFilter,
    refresh,
    hasData,
    isEmpty,
    isFiltered
  } = useDutySchedules(projectId)

  const {
    currentShifts,
    nextShifts,
    emergencyContacts,
    summary,
    loading: currentDutyLoading,
    error: currentDutyError,
    refresh: refreshCurrentDuty,
    totalOnDuty,
    hasEmergencyContacts
  } = useCurrentDuty(projectId)

  // 功能 hooks
  const { exportData, exporting, error: exportError } = useDutyScheduleExport()
  const { call, email, sms } = useDutyContact()
  
  // 本地狀態
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table')
  const [selectedSchedule, setSelectedSchedule] = useState<DutySchedule | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  
  // 事件處理函數
  const handleRefresh = () => {
    refresh()
    refreshCurrentDuty()
    toast.info('已刷新資料')
  }

  const handleExport = async () => {
    try {
      await exportData(projectId, filters, 'excel')
      toast.success('匯出成功')
    } catch (error) {
      toast.error('匯出失敗，請稍後再試')
    }
  }

  const handleViewSchedule = (schedule: DutySchedule) => {
    setSelectedSchedule(schedule)
    setShowDetailDialog(true)
  }

  const handleCallPerson = (schedule: DutySchedule) => {
    if (call(schedule.person.mobile, schedule.person.name)) {
      toast.success(`正在撥號給 ${schedule.person.name}`)
    } else {
      toast.error('撥號失敗')
    }
  }

  const handleQuickFilter = (filterType: 'today' | 'tomorrow' | 'thisWeek' | 'currentOnly') => {
    quickFilter[filterType]()
    toast.info(`已套用 ${getQuickFilterText(filterType)} 篩選`)
  }

  const getQuickFilterText = (filterType: string) => {
    const texts = {
      today: '今日',
      tomorrow: '明日',
      thisWeek: '本週',
      currentOnly: '當前值班'
    }
    return texts[filterType as keyof typeof texts] || filterType
  }

  const handleCloseDetailDialog = () => {
    setShowDetailDialog(false)
    setSelectedSchedule(null)
  }

  // 統計卡片數據
  const statsCards = [
    {
      title: '今日值班人數',
      value: stats?.currentOnDutyCount || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: '目前值班中',
      value: currentShifts.length,
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: '緊急聯絡人',
      value: emergencyContacts.length,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: '異常提醒',
      value: stats?.alertsCount || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頁面標題 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="w-full">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">廠商人員值班查詢</h1>
              <p className="mt-1 text-sm text-gray-600">
                查詢和管理廠商人員值班安排與聯絡資訊
                {hasData && (
                  <span className="ml-2">
                    • 共 {pagination.total} 筆排班記錄
                    • {totalOnDuty} 人值班中
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading || currentDutyLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={loading || exporting}
              >
                <Download className="h-4 w-4 mr-2" />
                匯出
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="w-full px-6 py-6 space-y-6">
        {/* 快速篩選按鈕 */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter('today')}
            disabled={loading}
          >
            今日值班
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter('tomorrow')}
            disabled={loading}
          >
            明日值班
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter('thisWeek')}
            disabled={loading}
          >
            本週值班
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter('currentOnly')}
            disabled={loading}
          >
            僅顯示值班中
          </Button>
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              disabled={loading}
            >
              清除篩選
            </Button>
          )}
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index} className="p-4">
                <div className="flex items-center">
                  <div className={`${stat.bgColor} p-3 rounded-lg mr-4`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className={`text-2xl font-bold ${stat.color}`}>
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600">{stat.title}</div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* 當前值班資訊 */}
        {currentShifts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                當前值班人員
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentShifts.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold">{schedule.person.name}</div>
                        <div className="text-sm text-gray-600">{schedule.person.position}</div>
                        <div className="text-sm text-gray-500">{schedule.person.vendorName}</div>
                        <div className="flex items-center mt-2">
                          <Badge
                            style={{ backgroundColor: DUTY_STATUS_COLORS[schedule.status] }}
                            className="text-white text-xs"
                          >
                            {SHIFT_TYPE_ICONS[schedule.shiftType]} {schedule.shiftType}
                          </Badge>
                          <span className="ml-2 text-xs text-gray-500">
                            {WORK_AREA_ICONS[schedule.workArea]} {schedule.workArea}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCallPerson(schedule)}
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewSchedule(schedule)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      聯絡電話: {schedule.person.mobile}
                      {schedule.person.extension && ` 分機: ${schedule.person.extension}`}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 搜尋篩選器 */}
        <FiltersComponent
          filters={filters}
          onFiltersChange={updateFilters}
          onSearch={() => refresh()}
          onReset={() => {
            resetFilters()
            toast.info('已清除所有篩選條件')
          }}
          loading={loading}
        />

        {/* 視圖切換和資料展示 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>值班安排</CardTitle>
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'calendar')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="table">
                    <Table2 className="h-4 w-4 mr-2" />
                    表格檢視
                  </TabsTrigger>
                  <TabsTrigger value="calendar">
                    <Calendar className="h-4 w-4 mr-2" />
                    日曆檢視
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={viewMode} className="w-full">
              <TabsContent value="table" className="space-y-4">
                <DutyScheduleTable
                  schedules={schedules}
                  loading={loading}
                  pagination={pagination}
                  onPaginationChange={updatePagination}
                  onSort={updateSort}
                  onViewSchedule={handleViewSchedule}
                  onCallPerson={handleCallPerson}
                />
              </TabsContent>
              <TabsContent value="calendar" className="space-y-4">
                <div className="text-center py-8">
                  <div className="text-gray-500">
                    日曆組件將在下一個階段實作
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 詳情對話框 */}
        <DutyPersonDetailDialog
          schedule={selectedSchedule}
          open={showDetailDialog}
          onClose={handleCloseDetailDialog}
          onCall={(number) => {
            if (call(number)) {
              toast.success(`正在撥號給 ${number}`)
            } else {
              toast.error('撥號失敗')
            }
          }}
          onEmail={(email) => {
            if (email(email, '值班相關事宜')) {
              toast.success(`正在開啟郵件程式`)
            } else {
              toast.error('開啟郵件失敗')
            }
          }}
        />
      </div>
    </div>
  )
}