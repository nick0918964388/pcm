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
        href: '/project-scope/members'
      },
      {
        id: 'wbs-settings',
        label: 'WBS 項目設定',
        href: '/project-scope/wbs'
      }
    ]
  },
  {
    id: 'human-resources',
    label: '人力資源',
    children: [
      {
        id: 'vendor-contacts',
        label: '廠商人員通訊錄',
        href: '/human-resources/contacts'
      },
      {
        id: 'attendance-stats-card',
        label: '出工人數統計 (刷卡機)',
        href: '/human-resources/attendance-card'
      },
      {
        id: 'attendance-stats-powerbi',
        label: '出工人數統計 (PowerBI)',
        href: '/human-resources/attendance-powerbi'
      },
      {
        id: 'attendance-history',
        label: '刷卡歷史紀錄查詢',
        href: '/human-resources/attendance-history'
      },
      {
        id: 'no-card-notification',
        label: '廠商未刷卡通知',
        href: '/human-resources/no-card-notification'
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
        href: '/schedule/milestones'
      },
      {
        id: 'package-status',
        label: '發包狀況',
        href: '/schedule/packages'
      },
      {
        id: 'permit-management',
        label: '法規許可證管理',
        href: '/schedule/permits'
      },
      {
        id: 'historical-comparison',
        label: '連動歷史工期比對',
        href: '/schedule/historical-comparison'
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
        href: '/cost/control'
      },
      {
        id: 'package-documents',
        label: '發包文件',
        href: '/cost/documents'
      },
      {
        id: 'dcr-management',
        label: 'DCR 管理',
        href: '/cost/dcr'
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
        href: '/quality/reports'
      },
      {
        id: 'quality-audit',
        label: '品質稽核',
        href: '/quality/audit'
      },
      {
        id: 'quality-kpi',
        label: '品質 KPI',
        href: '/quality/kpi'
      },
      {
        id: 'quality-summary',
        label: '品質稽核彙總表',
        href: '/quality/summary'
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
        href: '/communication/news'
      },
      {
        id: 'document-management',
        label: '文件管理 (IDC)',
        href: '/communication/documents'
      },
      {
        id: 'meeting-room-booking',
        label: '會議室預約系統',
        href: '/communication/meeting-rooms'
      },
      {
        id: 'photo-gallery',
        label: 'iPhoto 2.0 (工程照片庫)',
        href: '/communication/photos'
      }
    ]
  },
  {
    id: 'risk-safety-environmental',
    label: '風險與工安環保',
    children: [
      {
        id: 'esh-platform',
        label: 'ESH 管理平台',
        href: '/esh/platform'
      },
      {
        id: 'esh-reports',
        label: 'ESH 週/日報',
        href: '/esh/reports'
      },
      {
        id: 'environmental-gps',
        label: '環保 GPS 即時監控',
        href: '/esh/gps-monitoring'
      },
      {
        id: 'environmental-monitoring',
        label: '環保數值即時監測',
        href: '/esh/environmental-monitoring'
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
        href: '/video/site-cameras'
      }
    ]
  }
]