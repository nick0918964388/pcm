export interface NavigationItem {
  id: string
  label: string
  href?: string
  icon?: string
  children?: NavigationItem[]
}

export const navigationConfig: NavigationItem[] = [
  {
    id: 'project-scope',
    label: '專案範疇',
    children: [
      {
        id: 'project-members',
        label: '專案成員查詢',
        href: '/staff'
      },
      {
        id: 'wbs-settings',
        label: 'WBS 項目設定',
        href: '/wbs'
      }
    ]
  },
  {
    id: 'human-resources',
    label: '人力資源',
    children: [
      {
        id: 'vendor-directory',
        label: '廠商通訊錄查詢',
        href: '/vendors'
      },
      {
        id: 'attendance-stats-card',
        label: '出工人數統計 (刷卡機)',
        href: '/under-development'
      },
      {
        id: 'attendance-stats-powerbi',
        label: '出工人數統計 (PowerBI)',
        href: '/under-development'
      },
      {
        id: 'attendance-history',
        label: '刷卡歷史紀錄查詢',
        href: '/under-development'
      },
      {
        id: 'no-card-notification',
        label: '廠商未刷卡通知',
        href: '/under-development'
      }
    ]
  },
  {
    id: 'schedule-management',
    label: '時程管理',
    children: [
      {
        id: 'milestones',
        label: '專案里程碑',
        href: '/under-development'
      },
      {
        id: 'package-status',
        label: '發包狀況',
        href: '/under-development'
      },
      {
        id: 'permit-management',
        label: '法規許可證管理',
        href: '/under-development'
      },
      {
        id: 'historical-comparison',
        label: '連動歷史工期比對',
        href: '/under-development'
      }
    ]
  },
  {
    id: 'cost-management',
    label: '成本管理',
    children: [
      {
        id: 'cost-control',
        label: '成本管控',
        href: '/under-development'
      },
      {
        id: 'package-documents',
        label: '發包文件',
        href: '/under-development'
      },
      {
        id: 'dcr-management',
        label: 'DCR 管理',
        href: '/under-development'
      }
    ]
  },
  {
    id: 'quality-management',
    label: '品質管理',
    children: [
      {
        id: 'quality-reports',
        label: '品質日報/週報',
        href: '/under-development'
      },
      {
        id: 'quality-audit',
        label: '品質稽核',
        href: '/under-development'
      },
      {
        id: 'quality-kpi',
        label: '品質 KPI',
        href: '/under-development'
      },
      {
        id: 'quality-summary',
        label: '品質稽核彙總表',
        href: '/under-development'
      }
    ]
  },
  {
    id: 'communication-management',
    label: '溝通管理',
    children: [
      {
        id: 'news',
        label: '最新消息',
        href: '/under-development'
      },
      {
        id: 'document-management',
        label: '文件管理 (IDC)',
        href: '/under-development'
      },
      {
        id: 'meeting-room-booking',
        label: '會議室預約系統',
        href: '/under-development'
      },
      {
        id: 'photo-gallery',
        label: 'iPhoto 2.0 (工程照片庫)',
        href: '/under-development'
      }
    ]
  },
  {
    id: 'risk-safety-environmental',
    label: '風險工安',
    children: [
      {
        id: 'esh-platform',
        label: 'ESH 管理平台',
        href: '/under-development'
      },
      {
        id: 'esh-reports',
        label: 'ESH 週/日報',
        href: '/under-development'
      },
      {
        id: 'environmental-gps',
        label: '環保 GPS 即時監控',
        href: '/under-development'
      },
      {
        id: 'environmental-monitoring',
        label: '環保數值即時監測',
        href: '/under-development'
      }
    ]
  },
  {
    id: 'realtime-video',
    label: '即時影像',
    children: [
      {
        id: 'site-cameras',
        label: '工地即時影像',
        href: '/under-development'
      }
    ]
  }
]