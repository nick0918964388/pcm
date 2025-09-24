'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
// import { useProjectStore } from '@/store/projectStore'
// import { useProjectScopeStore } from '@/store/projectScopeStore'
// import { Project } from '@/types/project'
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Navbar } from '@/components/layout/Navbar';
import { ProjectSelector } from '@/components/projects/ProjectSelector';
import { ProjectStatusCards } from '@/components/dashboard/ProjectStatusCards';
import { MilestoneTimeline } from '@/components/shared/MilestoneTimeline';
import {
  ArrowLeft,
  Settings,
  Share2,
  Download,
  Calendar,
  Users,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

interface ESHEvent {
  id: number;
  type: string;
  site: string;
  location: string;
  person: string;
  date: string;
}

interface NewsItem {
  id: number;
  category: string;
  site: string;
  title: string;
  date: string;
}

/**
 * 專案專屬儀表板頁面
 *
 * 根據選定的專案 ID 顯示該專案的詳細儀表板內容
 */
export default function ProjectDashboardPage() {
  const params = useParams();
  const router = useRouter();
  // const { getProject, initialize, initialized } = useProjectStore()
  // const { currentProject, selectProject } = useProjectScopeStore()

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectId = params.projectId as string;

  useEffect(() => {
    // 簡化載入邏輯，避免 store 相關問題
    const timer = setTimeout(() => {
      setLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [projectId]);

  // 處理返回專案選擇
  const handleBackToSelection = () => {
    router.push('/project-selection');
  };

  // 載入中狀態
  if (loading) {
    return (
      <div className='w-full px-4 sm:px-6 lg:px-8 py-6'>
        <div className='text-center'>載入中...</div>
      </div>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className='w-full px-4 sm:px-6 lg:px-8 py-6'>
        <div className='text-center text-red-600'>錯誤: {error}</div>
        <div className='text-center mt-4'>
          <Button onClick={handleBackToSelection}>返回專案選擇</Button>
        </div>
      </div>
    );
  }

  // 模擬專案資料
  const currentProject = {
    id: projectId,
    name:
      projectId === 'proj001'
        ? 'FAB20 Phase1'
        : projectId === 'proj002'
          ? 'FAB21 Phase2 專案'
          : 'Unknown Project',
  };

  // 里程碑數據 (根據專案動態生成)
  const milestones = [
    { date: '2024/11/01', label: '開工', status: 'completed' as const },
    { date: '2025/01/15', label: 'M1', status: 'completed' as const },
    { date: '2025/05/01', label: 'M2', status: 'current' as const },
    { date: '2025/08/01', label: 'M3', status: 'upcoming' as const },
    { date: '2026/11/01', label: '完工', status: 'upcoming' as const },
  ];

  // KPI數據 (根據專案動態生成)
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
  ];

  // 工地ESH要覽數據
  const eshEvents: ESHEvent[] = [
    {
      id: 1,
      type: '事件',
      site: 'F22P1',
      location: '廠欣(F22P3)',
      person: '20250715 廠欣/黃昱 人員過度架高場',
      date: '2025/07/15',
    },
    {
      id: 2,
      type: '意外',
      site: 'AP8P1',
      location: '廠欣',
      person: '20250713 AP8 廠欣/維安TK廠孔網阻可動火 花灑落至鐵板造成燒熔破損',
      date: '2025/07/13',
    },
    {
      id: 3,
      type: '事件',
      site: 'F22P1',
      location: '賴明(F22P3O)',
      person: '20250630 F22P3 賴明/金球 人員從獨工無上背帶',
      date: '2025/06/30',
    },
  ];

  // 最新消息數據
  const newsItems: NewsItem[] = [
    {
      id: 1,
      category: 'Others',
      site: 'F21P2',
      title: 'F21 share folder',
      date: '2024/10/22',
    },
    {
      id: 2,
      category: 'Arch',
      site: 'F20P2',
      title:
        'F20P2純水管行動架&吊重場重疊資訊編號J63A4921之場工地安定性復水供應量',
      date: '2023/08/16',
    },
  ];

  return (
    <div className='min-h-screen bg-white'>
      {/* 主要內容區域 */}
      <div className='w-full px-4 sm:px-6 lg:px-8 py-6'>
        <div className='space-y-4'>
          {/* Header */}
          <div className='bg-[#FFFFFF] border border-[#F0F0F0] p-4 rounded shadow-[0_2px_8px_rgba(0,0,0,0.06)]'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0'>
              <div className='flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0'>
                <h1 className='text-xl sm:text-2xl font-bold text-[#1A1A1A]'>
                  {currentProject.name}
                </h1>
                <span className='text-xs sm:text-sm text-[#595959]'>
                  PCM Professional Construction Management
                </span>
              </div>
              <div className='text-xs sm:text-sm text-[#595959]'>
                今天是 {new Date().toLocaleDateString('zh-TW')} | PCM
                平台風險SOP
              </div>
            </div>
          </div>

          {/* 第一列：Project Status Cards - 專案狀態卡片 */}
          <div className='@container/main'>
            <ProjectStatusCards />
          </div>

          {/* 第二列：Milestone Timeline 和 KPI Section - 並排布局 */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            {/* 左側 - 完整版里程碑時間軸 */}
            <div className='space-y-4'>
              <MilestoneTimeline
                milestones={milestones}
                currentDate='2024/11/01'
              />
            </div>

            {/* 右側 - KPI Progress Section */}
            <div className='space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle className='text-base sm:text-lg text-[#1A1A1A]'>
                    實決算工時 KPI
                  </CardTitle>
                  <CardDescription className='text-xs sm:text-sm text-[#8C8C8C]'>
                    千小時
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {kpiData.map((kpi, index) => {
                    const maxValue = kpi.label === 'TNZWM' ? 12500 : 2500;
                    const percentage = Math.round((kpi.value / maxValue) * 100);

                    return (
                      <div key={index} className='space-y-2'>
                        <div className='flex justify-between items-center'>
                          <span className='text-sm font-medium text-[#1A1A1A]'>
                            {kpi.label}
                          </span>
                          <span className='text-sm text-[#595959]'>
                            {kpi.value.toLocaleString()} /{' '}
                            {maxValue.toLocaleString()}
                          </span>
                        </div>
                        <Progress value={percentage} className='h-2' />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 底部表格區域 */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            {/* 工地ESH要覽 */}
            <Card>
              <CardHeader className='flex items-center justify-between'>
                <CardTitle>工地ESH 要覽</CardTitle>
                <Button variant='link' size='sm'>
                  ...more
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-20'>類型</TableHead>
                      <TableHead className='w-24'>工地</TableHead>
                      <TableHead className='w-32'>廠欣</TableHead>
                      <TableHead>事件描述</TableHead>
                      <TableHead className='w-24'>日期</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eshEvents.map(event => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <Badge
                            variant={
                              event.type === '意外'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {event.type}
                          </Badge>
                        </TableCell>
                        <TableCell className='font-medium'>
                          {event.site}
                        </TableCell>
                        <TableCell>{event.location}</TableCell>
                        <TableCell className='text-sm'>
                          {event.person}
                        </TableCell>
                        <TableCell className='text-sm'>{event.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* 最新消息 */}
            <Card>
              <CardHeader className='flex items-center justify-between'>
                <CardTitle>最新消息</CardTitle>
                <Button variant='link' size='sm'>
                  ...more
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-20'>類別</TableHead>
                      <TableHead className='w-20'>工地</TableHead>
                      <TableHead>消息內容</TableHead>
                      <TableHead className='w-24'>日期</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newsItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant='outline'>{item.category}</Badge>
                        </TableCell>
                        <TableCell className='font-medium'>
                          {item.site}
                        </TableCell>
                        <TableCell className='text-sm'>{item.title}</TableCell>
                        <TableCell className='text-sm'>{item.date}</TableCell>
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
  );
}
