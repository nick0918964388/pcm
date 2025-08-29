'use client'

import { 
  StatCard, 
  MilestoneTimeline, 
  KPIProgressBar,
  DataTable,
  Column
} from '@/components/shared'

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
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 bg-[#F5F5F5] min-h-screen max-w-none">
      {/* Header */}
      <div className="bg-[#00645A] text-white p-3 sm:p-4 rounded shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0">
            <h1 className="text-xl sm:text-2xl font-bold">FAB20 Phase3</h1>
            <span className="text-xs sm:text-sm opacity-90">PCM Professional Construction Management</span>
          </div>
          <div className="text-xs sm:text-sm">
            今天是 {new Date().toLocaleDateString('zh-TW')} | PCM 平台風險SOP
          </div>
        </div>
      </div>

      {/* Main Grid Layout - 響應式布局 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* 左側 - 里程碑和統計卡片 */}
        <div className="xl:col-span-5 space-y-4">
          {/* Milestone Timeline */}
          <MilestoneTimeline 
            milestones={milestones}
            currentDate="2024/11/01"
          />

          {/* 統計卡片 - 響應式網格 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="專案起算"
              startDate="2025/05/01"
              endDate="2026/11/01"
              actualDays={78}
              planDays={472}
              color="green"
            />
            
            <StatCard
              title="專案進度"
              percentage="-%/-%"
              actual="0%"
              plan="0%"
              color="blue"
              subItems={[
                { label: '勘收比例', value: '0%' },
                { label: '付款比例', value: '0%' }
              ]}
            />
            
            <StatCard
              title="今日出工(含當商人員)"
              value={0}
              unit="MD"
              color="yellow"
              subItems={[
                { label: '最高出工(不含當商人員)', value: 0, unit: 'MD' },
                { label: '智能累積(不含當商人員)', value: 0, unit: 'MD' }
              ]}
            />
            
            <StatCard
              title="送審文件"
              value="53/368"
              unit="pcs compl./total"
              color="red"
              subItems={[
                { label: '退還文件', value: '41/41', unit: 'pcs' },
                { label: '退費狀態', value: '2/3', unit: 'pcs' }
              ]}
            />
          </div>
        </div>

        {/* 右側 - KPI 和表格 */}
        <div className="xl:col-span-7 space-y-4">
          {/* KPI Progress Bars */}
          <div className="bg-white p-4 sm:p-6 rounded shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-1 sm:space-y-0">
              <h3 className="text-base sm:text-lg font-bold text-[#1A1A1A]">實決算工時 KPI</h3>
              <span className="text-xs sm:text-sm text-[#8C8C8C]">千小時</span>
            </div>
            <div className="space-y-3">
              {kpiData.map((kpi, index) => (
                <KPIProgressBar
                  key={index}
                  label={kpi.label}
                  value={kpi.value}
                  maxValue={kpi.label === 'TNZWM' ? 12500 : 2500}
                  color={kpi.value > kpi.maxValue * 0.8 ? 'red' : kpi.value > kpi.maxValue * 0.6 ? 'yellow' : 'green'}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 底部表格區域 - 響應式布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 工地ESH要覽 */}
        <div>
          <div className="bg-white rounded shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="p-4 border-b border-[#F0F0F0] flex items-center justify-between">
              <h3 className="font-bold text-[#1A1A1A]">工地ESH 要覽心</h3>
              <button className="text-sm text-[#00645A] hover:underline font-medium">...more</button>
            </div>
            <div className="overflow-x-auto">
              <DataTable
                columns={eshColumns}
                data={eshEvents}
                className="shadow-none rounded-none"
              />
            </div>
          </div>
        </div>

        {/* 最新消息 */}
        <div>
          <div className="bg-white rounded shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="p-4 border-b border-[#F0F0F0] flex items-center justify-between">
              <h3 className="font-bold text-[#1A1A1A]">最新消息</h3>
              <button className="text-sm text-[#00645A] hover:underline font-medium">...more</button>
            </div>
            <div className="overflow-x-auto">
              <DataTable
                columns={newsColumns}
                data={newsItems}
                className="shadow-none rounded-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}