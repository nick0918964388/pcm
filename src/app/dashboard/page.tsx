'use client'

import { 
  StatCard, 
  MilestoneTimeline, 
  KPIProgressBar,
  DataTable,
  Column
} from '@/components/shared'
import MainNavigation from '@/components/navigation/MainNavigation'
import Breadcrumbs from '@/components/navigation/Breadcrumbs'
import { ProjectStatusCards } from '@/components/dashboard/ProjectStatusCards'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface ESHEvent {
  id: number
  type: string
  site: string
  location: string
  person: string
  date: string
}

interface NewsItem {
  id: number
  category: string
  site: string
  title: string
  date: string
}

export default function DashboardPage() {
  // 里程碑數據
  const milestones = [
    { date: '2024/11/01', label: '開工', status: 'completed' as const },
    { date: '2025/01/15', label: 'M1', status: 'completed' as const },
    { date: '2025/05/01', label: 'M2', status: 'current' as const },
    { date: '2025/08/01', label: 'M3', status: 'upcoming' as const },
    { date: '2026/11/01', label: '完工', status: 'upcoming' as const },
  ]

  // KPI數據
  const kpiData = [
    { label: 'AP2C', value: 500, maxValue: 2500 },
    { label: 'AP5B', value: 1800, maxValue: 2500 },
    { label: 'AP6B', value: 2200, maxValue: 2500 },
    { label: 'AP7P1', value: 1500, maxValue: 2500 },
    { label: 'AP8P1', value: 1200, maxValue: 2500 },
    { label: 'F18P1', value: 800, maxValue: 2500 },
    { label: 'F20P1', value: 1600, maxValue: 2500 },
    { label: 'FWH', value: 2400, maxValue: 2500 },
    { label: 'RDA1', value: 600, maxValue: 2500 },
    { label: 'TNZWM', value: 2500, maxValue: 12500 },
  ]

  // 工地ESH要覽數據
  const eshEvents: ESHEvent[] = [
    {
      id: 1,
      type: '事件',
      site: 'F22P1',
      location: '廠欣(F22P3)',
      person: '20250715 廠欣/黃昱 人員過度架高場',
      date: '2025/07/15'
    },
    {
      id: 2,
      type: '意外',
      site: 'AP8P1',
      location: '廠欣',
      person: '20250713 AP8 廠欣/維安TK廠孔網阻可動火 花灑落至鐵板造成燒熔破損',
      date: '2025/07/13'
    },
    {
      id: 3,
      type: '事件',
      site: 'F22P1',
      location: '賴明(F22P3O)',
      person: '20250630 F22P3 賴明/金球 人員從獨工無上背帶',
      date: '2025/06/30'
    },
  ]

  // 最新消息數據
  const newsItems: NewsItem[] = [
    {
      id: 1,
      category: 'Others',
      site: 'F21P2',
      title: 'F21 share folder',
      date: '2024/10/22'
    },
    {
      id: 2,
      category: 'Arch',
      site: 'F20P2',
      title: 'F20P2純水管行動架&吊重場重疊資訊編號J63A4921之場工地安定性復水供應量',
      date: '2023/08/16'
    },
  ]

  const eshColumns: Column<ESHEvent>[] = [
    {
      key: 'type',
      title: '類型',
      width: '80px',
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
          value === '意外' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'site',
      title: '工地',
      width: '100px',
    },
    {
      key: 'location',
      title: '廠欣',
      width: '120px',
    },
    {
      key: 'person',
      title: '事件描述',
    },
    {
      key: 'date',
      title: '日期',
      width: '100px',
    },
  ]

  const newsColumns: Column<NewsItem>[] = [
    {
      key: 'category',
      title: '類別',
      width: '80px',
    },
    {
      key: 'site',
      title: '工地',
      width: '80px',
    },
    {
      key: 'title',
      title: '消息內容',
    },
    {
      key: 'date',
      title: '日期',
      width: '100px',
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      <MainNavigation />
      <Breadcrumbs />
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 bg-white min-h-screen">
          {/* Header */}
          <div className="bg-[#FFFFFF] border border-[#F0F0F0] p-3 sm:p-4 rounded shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0">
                <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">FAB20 Phase3</h1>
                <span className="text-xs sm:text-sm text-[#595959]">PCM Professional Construction Management</span>
              </div>
              <div className="text-xs sm:text-sm text-[#595959]">
                今天是 {new Date().toLocaleDateString('zh-TW')} | PCM 平台風險SOP
              </div>
            </div>
          </div>

          {/* 第一列：Project Status Cards - 專案狀態卡片 */}
          <div className="@container/main">
            <ProjectStatusCards />
          </div>

          {/* 第二列：Milestone Timeline 和 KPI Section - 並排布局 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 左側 - Milestone Timeline */}
            <div className="space-y-4">
              <MilestoneTimeline 
                milestones={milestones}
                currentDate="2024/11/01"
              />
            </div>

            {/* 右側 - KPI Progress Bars */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                  <CardTitle className="text-base sm:text-lg text-[#1A1A1A]">實決算工時 KPI</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-[#8C8C8C]">千小時</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {kpiData.map((kpi, index) => {
                    const maxValue = kpi.label === 'TNZWM' ? 12500 : 2500;
                    const percentage = Math.round((kpi.value / maxValue) * 100);
                    
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-[#1A1A1A]">{kpi.label}</span>
                          <span className="text-sm text-[#595959]">
                            {kpi.value.toLocaleString()} / {maxValue.toLocaleString()}
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 底部表格區域 - 響應式布局 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 工地ESH要覽 */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-[#1A1A1A]">工地ESH 要覽</CardTitle>
                <button className="text-sm text-[#00645A] hover:underline font-medium">...more</button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">類型</TableHead>
                      <TableHead className="w-24">工地</TableHead>
                      <TableHead className="w-32">廠欣</TableHead>
                      <TableHead>事件描述</TableHead>
                      <TableHead className="w-24">日期</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eshEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <Badge variant={event.type === '意外' ? 'destructive' : 'secondary'}>
                            {event.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{event.site}</TableCell>
                        <TableCell>{event.location}</TableCell>
                        <TableCell className="text-sm text-[#595959]">{event.person}</TableCell>
                        <TableCell className="text-sm">{event.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* 最新消息 */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-[#1A1A1A]">最新消息</CardTitle>
                <button className="text-sm text-[#00645A] hover:underline font-medium">...more</button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">類別</TableHead>
                      <TableHead className="w-20">工地</TableHead>
                      <TableHead>消息內容</TableHead>
                      <TableHead className="w-24">日期</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newsItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.site}</TableCell>
                        <TableCell className="text-sm text-[#595959]">{item.title}</TableCell>
                        <TableCell className="text-sm">{item.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}