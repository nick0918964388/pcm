/**
 * Mock Project Data for Development and Testing
 *
 * This file contains comprehensive mock data for Taiwan construction projects
 * that covers all Project interface fields and scenarios for testing the
 * project selection functionality.
 *
 * @module MockProjects
 * @version 1.0
 * @date 2025-08-29
 */

import {
  Project,
  ProjectStatus,
  ProjectType,
  ProjectMember,
  ProjectPermission,
  PermissionLevel,
  ProjectStatistics,
} from '../types/project';

// ==================== MOCK TEAM MEMBERS ====================

/**
 * Mock team members data for various projects
 */
const mockTeamMembers: ProjectMember[] = [
  {
    id: 'tm001',
    name: '王志明',
    role: '資深工程師',
    department: '工程部',
    email: 'wang.zhiming@pcm.com.tw',
    phone: '02-2345-6789',
    avatarUrl: 'https://via.placeholder.com/40/4F46E5/FFFFFF?text=王',
    joinedAt: new Date('2023-01-15'),
  },
  {
    id: 'tm002',
    name: '陳美玲',
    role: '專案協調員',
    department: '專案管理部',
    email: 'chen.meiling@pcm.com.tw',
    phone: '02-2345-6790',
    avatarUrl: 'https://via.placeholder.com/40/10B981/FFFFFF?text=陳',
    joinedAt: new Date('2023-02-01'),
  },
  {
    id: 'tm003',
    name: '李建國',
    role: '品質控制員',
    department: '品質保證部',
    email: 'li.jianguo@pcm.com.tw',
    phone: '02-2345-6791',
    avatarUrl: 'https://via.placeholder.com/40/F59E0B/FFFFFF?text=李',
    joinedAt: new Date('2023-03-10'),
  },
  {
    id: 'tm004',
    name: '張淑華',
    role: '財務分析師',
    department: '財務部',
    email: 'zhang.shuhua@pcm.com.tw',
    phone: '02-2345-6792',
    avatarUrl: 'https://via.placeholder.com/40/EF4444/FFFFFF?text=張',
    joinedAt: new Date('2023-01-20'),
  },
  {
    id: 'tm005',
    name: '林志偉',
    role: '承包商代表',
    department: '施工部',
    email: 'lin.zhiwei@contractor.com.tw',
    phone: '02-2345-6793',
    avatarUrl: 'https://via.placeholder.com/40/8B5CF6/FFFFFF?text=林',
    joinedAt: new Date('2023-04-01'),
  },
  {
    id: 'tm006',
    name: '黃麗芬',
    role: '安全督導員',
    department: '安全部',
    email: 'huang.lifen@pcm.com.tw',
    phone: '02-2345-6794',
    avatarUrl: 'https://via.placeholder.com/40/06B6D4/FFFFFF?text=黃',
    joinedAt: new Date('2023-02-15'),
  },
  {
    id: 'tm007',
    name: '劉宗翰',
    role: '技術主管',
    department: '技術部',
    email: 'liu.zonghan@pcm.com.tw',
    phone: '02-2345-6795',
    avatarUrl: 'https://via.placeholder.com/40/F97316/FFFFFF?text=劉',
    joinedAt: new Date('2023-03-01'),
  },
  {
    id: 'tm008',
    name: '周雅文',
    role: '環境監測師',
    department: '環境部',
    email: 'zhou.yawen@pcm.com.tw',
    phone: '02-2345-6796',
    avatarUrl: 'https://via.placeholder.com/40/84CC16/FFFFFF?text=周',
    joinedAt: new Date('2023-01-25'),
  },
];

// ==================== MOCK PERMISSIONS ====================

/**
 * Mock permission configurations for different users
 */
const createMockPermissions = (userIds: string[]): ProjectPermission[] => {
  return userIds.map((userId, index) => ({
    userId,
    level:
      index === 0
        ? PermissionLevel.ADMIN
        : index === 1
          ? PermissionLevel.WRITE
          : PermissionLevel.READ,
    grantedAt: new Date('2023-01-01'),
    grantedBy: 'admin001',
    expiresAt: undefined,
  }));
};

// ==================== MOCK PROJECTS DATA ====================

/**
 * Comprehensive mock project data covering all scenarios and types
 */
export const mockProjects: Project[] = [
  // === 台北捷運項目 ===
  {
    id: 'proj001',
    code: 'F20P1',
    name: '台北捷運信義線延伸工程',
    description:
      '台北捷運信義線由象山站延伸至信義區東側，新增3站點，總長度約4.8公里，包含地下段及高架段建設。',
    status: ProjectStatus.IN_PROGRESS,
    type: ProjectType.INFRASTRUCTURE,
    progress: 68,
    startDate: new Date('2023-03-01'),
    endDate: new Date('2025-12-31'),
    actualStartDate: new Date('2023-03-15'),
    actualEndDate: undefined,
    managerId: 'mgr001',
    managerName: '蔡志強',
    teamMembers: [
      mockTeamMembers[0],
      mockTeamMembers[1],
      mockTeamMembers[2],
      mockTeamMembers[5],
    ],
    totalBudget: 18500000000,
    usedBudget: 12580000000,
    currency: 'TWD',
    totalMilestones: 12,
    completedMilestones: 8,
    permissions: createMockPermissions(['user001', 'user002', 'user003']),
    lastAccessDate: new Date('2025-08-28'),
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2025-08-28'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/3B82F6/FFFFFF?text=捷運建設',
    tags: ['捷運', '軌道建設', '都市交通', '地下工程'],
    location: '台北市信義區',
    client: '台北市政府交通局',
    notes: '需配合周邊商圈營運時間進行施工調整',
  },

  // === 高雄輕軌項目 ===
  {
    id: 'proj002',
    code: 'F22P4',
    name: '高雄輕軌環狀線建設',
    description:
      '高雄輕軌環狀線第二階段工程，連接愛河兩岸，包含12個車站及相關配套設施建設。',
    status: ProjectStatus.COMPLETED,
    type: ProjectType.INFRASTRUCTURE,
    progress: 100,
    startDate: new Date('2022-06-01'),
    endDate: new Date('2024-08-31'),
    actualStartDate: new Date('2022-06-15'),
    actualEndDate: new Date('2024-08-15'),
    managerId: 'mgr002',
    managerName: '林美惠',
    teamMembers: [
      mockTeamMembers[1],
      mockTeamMembers[3],
      mockTeamMembers[4],
      mockTeamMembers[6],
    ],
    totalBudget: 12800000000,
    usedBudget: 12350000000,
    currency: 'TWD',
    totalMilestones: 10,
    completedMilestones: 10,
    permissions: createMockPermissions(['user004', 'user005', 'user006']),
    lastAccessDate: new Date('2025-08-25'),
    createdAt: new Date('2022-04-10'),
    updatedAt: new Date('2024-08-15'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/10B981/FFFFFF?text=輕軌建設',
    tags: ['輕軌', '環狀線', '綠色交通', '都市規劃'],
    location: '高雄市前鎮區、苓雅區',
    client: '高雄市政府捷運工程局',
    notes: '已順利完工並通車營運',
  },

  // === 台中捷運項目 ===
  {
    id: 'proj003',
    code: 'F23P7',
    name: '台中捷運綠線延伸段',
    description:
      '台中捷運綠線北延段工程，從北屯總站延伸至彰化縣界，新增8個車站。',
    status: ProjectStatus.PLANNING,
    type: ProjectType.INFRASTRUCTURE,
    progress: 15,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2027-12-31'),
    actualStartDate: undefined,
    actualEndDate: undefined,
    managerId: 'mgr003',
    managerName: '陳建男',
    teamMembers: [mockTeamMembers[0], mockTeamMembers[2], mockTeamMembers[7]],
    totalBudget: 15600000000,
    usedBudget: 780000000,
    currency: 'TWD',
    totalMilestones: 15,
    completedMilestones: 2,
    permissions: createMockPermissions(['user007', 'user008']),
    lastAccessDate: new Date('2025-08-27'),
    createdAt: new Date('2024-11-01'),
    updatedAt: new Date('2025-08-27'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/8B5CF6/FFFFFF?text=捷運規劃',
    tags: ['捷運', '延伸線', '跨縣市', '環評中'],
    location: '台中市北屯區',
    client: '台中市政府交通局',
    notes: '目前進行環境影響評估階段',
  },

  // === 桃園機場項目 ===
  {
    id: 'proj004',
    code: 'F21P9',
    name: '桃園機場第三航廈建設',
    description:
      '桃園國際機場第三航廈主體建築及相關配套設施建設，包含航廈大樓、停機坪、聯絡橋等。',
    status: ProjectStatus.IN_PROGRESS,
    type: ProjectType.CONSTRUCTION,
    progress: 45,
    startDate: new Date('2021-09-01'),
    endDate: new Date('2025-06-30'),
    actualStartDate: new Date('2021-10-15'),
    actualEndDate: undefined,
    managerId: 'mgr004',
    managerName: '王大明',
    teamMembers: [
      mockTeamMembers[3],
      mockTeamMembers[4],
      mockTeamMembers[5],
      mockTeamMembers[6],
      mockTeamMembers[7],
    ],
    totalBudget: 61500000000,
    usedBudget: 27675000000,
    currency: 'TWD',
    totalMilestones: 20,
    completedMilestones: 9,
    permissions: createMockPermissions(['user009', 'user010', 'user011']),
    lastAccessDate: new Date('2025-08-29'),
    createdAt: new Date('2021-07-01'),
    updatedAt: new Date('2025-08-29'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/F59E0B/FFFFFF?text=機場建設',
    tags: ['機場', '航廈', '國際工程', '大型建設'],
    location: '桃園市大園區',
    client: '桃園國際機場股份有限公司',
    notes: '配合疫情影響調整施工進度',
  },

  // === 南迴公路項目 ===
  {
    id: 'proj005',
    code: 'F19P3',
    name: '南迴公路拓寬改善工程',
    description:
      '台9線南迴公路段拓寬改善，全長約40公里，包含隧道、橋樑及路面改善工程。',
    status: ProjectStatus.PAUSED,
    type: ProjectType.INFRASTRUCTURE,
    progress: 72,
    startDate: new Date('2019-04-01'),
    endDate: new Date('2024-03-31'),
    actualStartDate: new Date('2019-05-01'),
    actualEndDate: undefined,
    managerId: 'mgr005',
    managerName: '李春花',
    teamMembers: [mockTeamMembers[1], mockTeamMembers[4], mockTeamMembers[6]],
    totalBudget: 8900000000,
    usedBudget: 6408000000,
    currency: 'TWD',
    totalMilestones: 8,
    completedMilestones: 6,
    permissions: createMockPermissions(['user012', 'user013']),
    lastAccessDate: new Date('2025-08-20'),
    createdAt: new Date('2019-01-15'),
    updatedAt: new Date('2025-08-20'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/EF4444/FFFFFF?text=公路工程',
    tags: ['公路', '拓寬', '山區工程', '原住民部落'],
    location: '台東縣達仁鄉、屏東縣獅子鄉',
    client: '交通部公路總局',
    notes: '因颱風影響暫停施工，評估復工時程中',
  },

  // === 台北社會住宅項目 ===
  {
    id: 'proj006',
    code: 'F24P2',
    name: '台北市南港社會住宅建設',
    description:
      '南港區社會住宅新建工程，規劃400戶住宅單位及公共設施，採綠建築設計。',
    status: ProjectStatus.IN_PROGRESS,
    type: ProjectType.CONSTRUCTION,
    progress: 32,
    startDate: new Date('2024-02-01'),
    endDate: new Date('2026-08-31'),
    actualStartDate: new Date('2024-02-20'),
    actualEndDate: undefined,
    managerId: 'mgr006',
    managerName: '張文華',
    teamMembers: [
      mockTeamMembers[0],
      mockTeamMembers[2],
      mockTeamMembers[5],
      mockTeamMembers[7],
    ],
    totalBudget: 4200000000,
    usedBudget: 1344000000,
    currency: 'TWD',
    totalMilestones: 14,
    completedMilestones: 4,
    permissions: createMockPermissions(['user014', 'user015']),
    lastAccessDate: new Date('2025-08-28'),
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2025-08-28'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/06B6D4/FFFFFF?text=住宅建設',
    tags: ['社會住宅', '綠建築', '都市更新', '公共建設'],
    location: '台北市南港區',
    client: '台北市政府都市發展局',
    notes: '已取得綠建築標章候選證書',
  },

  // === 高雄港區項目 ===
  {
    id: 'proj007',
    code: 'F20P8',
    name: '高雄港洲際貨櫃中心二期擴建',
    description:
      '高雄港洲際貨櫃中心第二期擴建工程，新增6個貨櫃碼頭泊位及相關設施。',
    status: ProjectStatus.COMPLETED,
    type: ProjectType.INFRASTRUCTURE,
    progress: 100,
    startDate: new Date('2020-03-01'),
    endDate: new Date('2023-12-31'),
    actualStartDate: new Date('2020-03-20'),
    actualEndDate: new Date('2023-11-30'),
    managerId: 'mgr007',
    managerName: '蘇志明',
    teamMembers: [mockTeamMembers[1], mockTeamMembers[3], mockTeamMembers[6]],
    totalBudget: 22300000000,
    usedBudget: 21650000000,
    currency: 'TWD',
    totalMilestones: 16,
    completedMilestones: 16,
    permissions: createMockPermissions(['user016', 'user017', 'user018']),
    lastAccessDate: new Date('2025-08-15'),
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2023-11-30'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/F97316/FFFFFF?text=港口建設',
    tags: ['港口', '貨櫃', '海運', '國際貿易'],
    location: '高雄市小港區',
    client: '台灣港務股份有限公司',
    notes: '已完工啟用，大幅提升港口處理能量',
  },

  // === 台中水湳項目 ===
  {
    id: 'proj008',
    code: 'F23P5',
    name: '台中水湳智慧城中央公園景觀工程',
    description:
      '台中水湳智慧城中央公園景觀改善工程，包含植栽、步道、水景及智慧設施建置。',
    status: ProjectStatus.IN_PROGRESS,
    type: ProjectType.RENOVATION,
    progress: 78,
    startDate: new Date('2023-05-01'),
    endDate: new Date('2025-04-30'),
    actualStartDate: new Date('2023-05-15'),
    actualEndDate: undefined,
    managerId: 'mgr008',
    managerName: '陳雅芳',
    teamMembers: [mockTeamMembers[2], mockTeamMembers[4], mockTeamMembers[7]],
    totalBudget: 1800000000,
    usedBudget: 1404000000,
    currency: 'TWD',
    totalMilestones: 9,
    completedMilestones: 7,
    permissions: createMockPermissions(['user019', 'user020']),
    lastAccessDate: new Date('2025-08-26'),
    createdAt: new Date('2023-03-01'),
    updatedAt: new Date('2025-08-26'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/84CC16/FFFFFF?text=景觀工程',
    tags: ['景觀', '智慧城市', '公園', '綠化'],
    location: '台中市西屯區',
    client: '台中市政府建設局',
    notes: '配合智慧城市發展計畫進行',
  },

  // === 新竹科學園區項目 ===
  {
    id: 'proj009',
    code: 'F24P6',
    name: '新竹科學園區三期開發工程',
    description:
      '新竹科學園區第三期擴建工程，包含廠房、道路、管線及綠能設施建設。',
    status: ProjectStatus.PLANNING,
    type: ProjectType.INFRASTRUCTURE,
    progress: 8,
    startDate: new Date('2025-06-01'),
    endDate: new Date('2028-05-31'),
    actualStartDate: undefined,
    actualEndDate: undefined,
    managerId: 'mgr009',
    managerName: '黃志豪',
    teamMembers: [mockTeamMembers[0], mockTeamMembers[1], mockTeamMembers[5]],
    totalBudget: 35000000000,
    usedBudget: 1750000000,
    currency: 'TWD',
    totalMilestones: 18,
    completedMilestones: 1,
    permissions: createMockPermissions(['user021', 'user022', 'user023']),
    lastAccessDate: new Date('2025-08-29'),
    createdAt: new Date('2024-10-01'),
    updatedAt: new Date('2025-08-29'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/6366F1/FFFFFF?text=科技園區',
    tags: ['科學園區', '高科技', '產業發展', '環評進行中'],
    location: '新竹市東區',
    client: '科技部新竹科學園區管理局',
    notes: '正進行土地徵收及環境評估程序',
  },

  // === 嘉義高鐵項目 ===
  {
    id: 'proj010',
    code: 'F21P6',
    name: '嘉義高鐵特定區聯外道路改善',
    description:
      '嘉義高鐵特定區聯外道路系統改善工程，包含道路拓寬、交流道改建及號誌系統更新。',
    status: ProjectStatus.CANCELLED,
    type: ProjectType.INFRASTRUCTURE,
    progress: 0,
    startDate: new Date('2021-08-01'),
    endDate: new Date('2024-07-31'),
    actualStartDate: undefined,
    actualEndDate: undefined,
    managerId: 'mgr010',
    managerName: '林國華',
    teamMembers: [mockTeamMembers[3], mockTeamMembers[6]],
    totalBudget: 2500000000,
    usedBudget: 125000000,
    currency: 'TWD',
    totalMilestones: 8,
    completedMilestones: 0,
    permissions: createMockPermissions(['user024']),
    lastAccessDate: new Date('2025-08-10'),
    createdAt: new Date('2021-06-01'),
    updatedAt: new Date('2025-08-10'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/6B7280/FFFFFF?text=取消專案',
    tags: ['道路', '高鐵', '聯外交通', '已取消'],
    location: '嘉義縣太保市',
    client: '嘉義縣政府',
    notes: '因預算調整及用地取得困難而取消',
  },

  // === 台南古蹟維護項目 ===
  {
    id: 'proj011',
    code: 'F22P11',
    name: '台南赤崁樓古蹟維護工程',
    description:
      '國定古蹟赤崁樓結構補強及文物保存環境改善工程，包含建築修復及展示設施更新。',
    status: ProjectStatus.IN_PROGRESS,
    type: ProjectType.MAINTENANCE,
    progress: 85,
    startDate: new Date('2022-09-01'),
    endDate: new Date('2025-02-28'),
    actualStartDate: new Date('2022-09-15'),
    actualEndDate: undefined,
    managerId: 'mgr011',
    managerName: '鄭文雄',
    teamMembers: [mockTeamMembers[2], mockTeamMembers[5], mockTeamMembers[7]],
    totalBudget: 450000000,
    usedBudget: 382500000,
    currency: 'TWD',
    totalMilestones: 6,
    completedMilestones: 5,
    permissions: createMockPermissions(['user025', 'user026']),
    lastAccessDate: new Date('2025-08-25'),
    createdAt: new Date('2022-07-01'),
    updatedAt: new Date('2025-08-25'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/DC2626/FFFFFF?text=古蹟維護',
    tags: ['古蹟', '文化資產', '維護', '觀光'],
    location: '台南市中西區',
    client: '台南市政府文化局',
    notes: '需配合文化資產保存法規進行施工',
  },

  // === 花蓮太魯閣項目 ===
  {
    id: 'proj012',
    code: 'F23P9',
    name: '太魯閣國家公園步道設施改善',
    description:
      '太魯閣國家公園主要登山步道設施改善工程，包含安全設施、指標系統及休憩設施更新。',
    status: ProjectStatus.IN_PROGRESS,
    type: ProjectType.RENOVATION,
    progress: 55,
    startDate: new Date('2023-04-01'),
    endDate: new Date('2025-09-30'),
    actualStartDate: new Date('2023-04-20'),
    actualEndDate: undefined,
    managerId: 'mgr012',
    managerName: '王美玲',
    teamMembers: [mockTeamMembers[0], mockTeamMembers[4], mockTeamMembers[6]],
    totalBudget: 680000000,
    usedBudget: 374000000,
    currency: 'TWD',
    totalMilestones: 8,
    completedMilestones: 4,
    permissions: createMockPermissions(['user027', 'user028']),
    lastAccessDate: new Date('2025-08-24'),
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2025-08-24'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/059669/FFFFFF?text=國家公園',
    tags: ['國家公園', '步道', '觀光', '安全設施'],
    location: '花蓮縣秀林鄉',
    client: '太魯閣國家公園管理處',
    notes: '需配合登山季節調整施工時程',
  },

  // === 屏東農業設施項目 ===
  {
    id: 'proj013',
    code: 'F24P8',
    name: '屏東農業科技園區溫室設施建設',
    description:
      '屏東農業科技園區智慧溫室及相關農業設施建設，包含自動化設備及綠能系統。',
    status: ProjectStatus.PLANNING,
    type: ProjectType.CONSTRUCTION,
    progress: 12,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2026-12-31'),
    actualStartDate: undefined,
    actualEndDate: undefined,
    managerId: 'mgr013',
    managerName: '李淑芬',
    teamMembers: [mockTeamMembers[1], mockTeamMembers[3], mockTeamMembers[7]],
    totalBudget: 890000000,
    usedBudget: 106800000,
    currency: 'TWD',
    totalMilestones: 10,
    completedMilestones: 1,
    permissions: createMockPermissions(['user029', 'user030']),
    lastAccessDate: new Date('2025-08-27'),
    createdAt: new Date('2024-11-15'),
    updatedAt: new Date('2025-08-27'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/16A34A/FFFFFF?text=農業設施',
    tags: ['農業', '智慧溫室', '科技', '綠能'],
    location: '屏東縣長治鄉',
    client: '屏東縣政府農業處',
    notes: '結合AI技術發展精緻農業',
  },

  // === 基隆港務項目 ===
  {
    id: 'proj014',
    code: 'F20P12',
    name: '基隆港東岸碼頭改建工程',
    description:
      '基隆港東岸碼頭設施改建及現代化工程，提升港口作業效率及安全性。',
    status: ProjectStatus.COMPLETED,
    type: ProjectType.RENOVATION,
    progress: 100,
    startDate: new Date('2020-06-01'),
    endDate: new Date('2023-05-31'),
    actualStartDate: new Date('2020-07-01'),
    actualEndDate: new Date('2023-04-30'),
    managerId: 'mgr014',
    managerName: '張志豪',
    teamMembers: [mockTeamMembers[2], mockTeamMembers[4], mockTeamMembers[5]],
    totalBudget: 3200000000,
    usedBudget: 3080000000,
    currency: 'TWD',
    totalMilestones: 12,
    completedMilestones: 12,
    permissions: createMockPermissions(['user031', 'user032']),
    lastAccessDate: new Date('2025-08-20'),
    createdAt: new Date('2020-04-01'),
    updatedAt: new Date('2023-04-30'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/7C3AED/FFFFFF?text=港口改建',
    tags: ['港口', '碼頭', '海運', '現代化'],
    location: '基隆市中正區',
    client: '台灣港務股份有限公司基隆港務分公司',
    notes: '已完工啟用，大幅改善港口作業環境',
  },

  // === 雲林離岸風電項目 ===
  {
    id: 'proj015',
    code: 'F23P12',
    name: '雲林離岸風電場陸域設施建設',
    description:
      '雲林離岸風電場陸域變電站及輸電設施建設工程，包含海纜登陸點及維運基地。',
    status: ProjectStatus.IN_PROGRESS,
    type: ProjectType.INFRASTRUCTURE,
    progress: 41,
    startDate: new Date('2023-08-01'),
    endDate: new Date('2025-12-31'),
    actualStartDate: new Date('2023-08-20'),
    actualEndDate: undefined,
    managerId: 'mgr015',
    managerName: '吳建志',
    teamMembers: [
      mockTeamMembers[0],
      mockTeamMembers[3],
      mockTeamMembers[5],
      mockTeamMembers[6],
    ],
    totalBudget: 5600000000,
    usedBudget: 2296000000,
    currency: 'TWD',
    totalMilestones: 11,
    completedMilestones: 4,
    permissions: createMockPermissions(['user033', 'user034', 'user035']),
    lastAccessDate: new Date('2025-08-29'),
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2025-08-29'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/0EA5E9/FFFFFF?text=再生能源',
    tags: ['離岸風電', '再生能源', '綠能', '環保'],
    location: '雲林縣四湖鄉',
    client: '台電再生能源處',
    notes: '配合國家能源轉型政策推動',
  },

  // === 澎湖觀光設施項目 ===
  {
    id: 'proj016',
    code: 'F24P10',
    name: '澎湖跨海大橋景觀改善工程',
    description:
      '澎湖跨海大橋及周邊觀光設施景觀改善工程，包含橋體美化、觀景台及停車場建設。',
    status: ProjectStatus.PLANNING,
    type: ProjectType.RENOVATION,
    progress: 5,
    startDate: new Date('2025-03-01'),
    endDate: new Date('2026-10-31'),
    actualStartDate: undefined,
    actualEndDate: undefined,
    managerId: 'mgr016',
    managerName: '陳月娥',
    teamMembers: [mockTeamMembers[1], mockTeamMembers[7]],
    totalBudget: 320000000,
    usedBudget: 16000000,
    currency: 'TWD',
    totalMilestones: 6,
    completedMilestones: 0,
    permissions: createMockPermissions(['user036']),
    lastAccessDate: new Date('2025-08-26'),
    createdAt: new Date('2024-12-01'),
    updatedAt: new Date('2025-08-26'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/F472B6/FFFFFF?text=觀光設施',
    tags: ['觀光', '景觀', '橋樑', '離島建設'],
    location: '澎湖縣白沙鄉',
    client: '澎湖縣政府觀光處',
    notes: '配合離島觀光發展計畫執行',
  },

  // === 新北市學校建設項目 ===
  {
    id: 'proj017',
    code: 'F23P15',
    name: '新北市板橋區國小校舍重建工程',
    description:
      '新北市板橋區某國小老舊校舍拆除重建工程，包含教學大樓、體育館及附屬設施。',
    status: ProjectStatus.IN_PROGRESS,
    type: ProjectType.CONSTRUCTION,
    progress: 63,
    startDate: new Date('2023-02-01'),
    endDate: new Date('2025-01-31'),
    actualStartDate: new Date('2023-02-20'),
    actualEndDate: undefined,
    managerId: 'mgr017',
    managerName: '劉志明',
    teamMembers: [
      mockTeamMembers[0],
      mockTeamMembers[2],
      mockTeamMembers[4],
      mockTeamMembers[6],
    ],
    totalBudget: 1200000000,
    usedBudget: 756000000,
    currency: 'TWD',
    totalMilestones: 8,
    completedMilestones: 5,
    permissions: createMockPermissions(['user037', 'user038']),
    lastAccessDate: new Date('2025-08-28'),
    createdAt: new Date('2022-12-01'),
    updatedAt: new Date('2025-08-28'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/3B82F6/FFFFFF?text=學校建設',
    tags: ['學校', '教育', '重建', '公共建設'],
    location: '新北市板橋區',
    client: '新北市政府教育局',
    notes: '配合學期安排調整施工時程',
  },

  // === 宜蘭溫泉區項目 ===
  {
    id: 'proj018',
    code: 'F22P18',
    name: '宜蘭礁溪溫泉區管線更新工程',
    description:
      '宜蘭礁溪溫泉區溫泉供應管線及配套設施更新工程，提升供水品質及系統可靠性。',
    status: ProjectStatus.COMPLETED,
    type: ProjectType.MAINTENANCE,
    progress: 100,
    startDate: new Date('2022-10-01'),
    endDate: new Date('2024-03-31'),
    actualStartDate: new Date('2022-10-15'),
    actualEndDate: new Date('2024-03-15'),
    managerId: 'mgr018',
    managerName: '黃秀蘭',
    teamMembers: [mockTeamMembers[1], mockTeamMembers[3], mockTeamMembers[5]],
    totalBudget: 180000000,
    usedBudget: 174000000,
    currency: 'TWD',
    totalMilestones: 5,
    completedMilestones: 5,
    permissions: createMockPermissions(['user039', 'user040']),
    lastAccessDate: new Date('2025-08-18'),
    createdAt: new Date('2022-08-01'),
    updatedAt: new Date('2024-03-15'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/F59E0B/FFFFFF?text=溫泉設施',
    tags: ['溫泉', '管線', '觀光', '維護'],
    location: '宜蘭縣礁溪鄉',
    client: '宜蘭縣政府工務處',
    notes: '已完工，大幅改善溫泉供應穩定性',
  },

  // === 金門保育項目 ===
  {
    id: 'proj019',
    code: 'F24P14',
    name: '金門國家公園生態保育設施建設',
    description:
      '金門國家公園生態保育設施及環境教育中心建設工程，包含觀察站、步道及解說設施。',
    status: ProjectStatus.PLANNING,
    type: ProjectType.CONSTRUCTION,
    progress: 3,
    startDate: new Date('2025-04-01'),
    endDate: new Date('2027-03-31'),
    actualStartDate: undefined,
    actualEndDate: undefined,
    managerId: 'mgr019',
    managerName: '許文龍',
    teamMembers: [mockTeamMembers[2], mockTeamMembers[6], mockTeamMembers[7]],
    totalBudget: 420000000,
    usedBudget: 12600000,
    currency: 'TWD',
    totalMilestones: 9,
    completedMilestones: 0,
    permissions: createMockPermissions(['user041', 'user042']),
    lastAccessDate: new Date('2025-08-25'),
    createdAt: new Date('2024-12-15'),
    updatedAt: new Date('2025-08-25'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/065F46/FFFFFF?text=生態保育',
    tags: ['生態保育', '國家公園', '環境教育', '離島'],
    location: '金門縣金城鎮',
    client: '金門國家公園管理處',
    notes: '結合生態保育與環境教育功能',
  },

  // === 苗栗產業園區項目 ===
  {
    id: 'proj020',
    code: 'F23P20',
    name: '苗栗頭份產業園區基礎設施建設',
    description:
      '苗栗頭份產業園區基礎設施建設工程，包含道路、管線、污水處理及綠地規劃。',
    status: ProjectStatus.IN_PROGRESS,
    type: ProjectType.INFRASTRUCTURE,
    progress: 29,
    startDate: new Date('2023-11-01'),
    endDate: new Date('2026-10-31'),
    actualStartDate: new Date('2023-11-20'),
    actualEndDate: undefined,
    managerId: 'mgr020',
    managerName: '楊國強',
    teamMembers: [
      mockTeamMembers[0],
      mockTeamMembers[1],
      mockTeamMembers[4],
      mockTeamMembers[5],
    ],
    totalBudget: 2800000000,
    usedBudget: 812000000,
    currency: 'TWD',
    totalMilestones: 13,
    completedMilestones: 3,
    permissions: createMockPermissions(['user043', 'user044', 'user045']),
    lastAccessDate: new Date('2025-08-29'),
    createdAt: new Date('2023-09-01'),
    updatedAt: new Date('2025-08-29'),
    thumbnailUrl:
      'https://via.placeholder.com/300x200/7C2D12/FFFFFF?text=產業園區',
    tags: ['產業園區', '基礎設施', '經濟發展', '環保'],
    location: '苗栗縣頭份市',
    client: '苗栗縣政府工商發展處',
    notes: '配合產業轉型政策推動',
  },
];

// ==================== MOCK PROJECT SUMMARY ====================

/**
 * Generate project summary statistics from mock data
 */
export const mockProjectSummary = {
  totalProjects: mockProjects.length,
  projectsByStatus: {
    [ProjectStatus.PLANNING]: mockProjects.filter(
      p => p.status === ProjectStatus.PLANNING
    ).length,
    [ProjectStatus.IN_PROGRESS]: mockProjects.filter(
      p => p.status === ProjectStatus.IN_PROGRESS
    ).length,
    [ProjectStatus.PAUSED]: mockProjects.filter(
      p => p.status === ProjectStatus.PAUSED
    ).length,
    [ProjectStatus.COMPLETED]: mockProjects.filter(
      p => p.status === ProjectStatus.COMPLETED
    ).length,
    [ProjectStatus.CANCELLED]: mockProjects.filter(
      p => p.status === ProjectStatus.CANCELLED
    ).length,
  },
  projectsByType: {
    [ProjectType.CONSTRUCTION]: mockProjects.filter(
      p => p.type === ProjectType.CONSTRUCTION
    ).length,
    [ProjectType.INFRASTRUCTURE]: mockProjects.filter(
      p => p.type === ProjectType.INFRASTRUCTURE
    ).length,
    [ProjectType.RENOVATION]: mockProjects.filter(
      p => p.type === ProjectType.RENOVATION
    ).length,
    [ProjectType.MAINTENANCE]: mockProjects.filter(
      p => p.type === ProjectType.MAINTENANCE
    ).length,
  },
  recentlyAccessed: mockProjects
    .filter(p => p.lastAccessDate)
    .sort(
      (a, b) =>
        new Date(b.lastAccessDate!).getTime() -
        new Date(a.lastAccessDate!).getTime()
    )
    .slice(0, 5),
};

/**
 * Mock project statistics for dashboard display
 */
export const mockProjectStatistics: ProjectStatistics = {
  totalProjects: mockProjects.length,
  activeProjects: mockProjects.filter(
    p => p.status === ProjectStatus.IN_PROGRESS
  ).length,
  completedProjects: mockProjects.filter(
    p => p.status === ProjectStatus.COMPLETED
  ).length,
  pausedProjects: mockProjects.filter(p => p.status === ProjectStatus.PAUSED)
    .length,
  cancelledProjects: mockProjects.filter(
    p => p.status === ProjectStatus.CANCELLED
  ).length,
  averageProgress: Math.round(
    mockProjects.reduce((sum, p) => sum + p.progress, 0) / mockProjects.length
  ),
  totalBudget: mockProjects.reduce((sum, p) => sum + p.totalBudget, 0),
  usedBudget: mockProjects.reduce((sum, p) => sum + p.usedBudget, 0),
  budgetUtilization: Math.round(
    (mockProjects.reduce((sum, p) => sum + p.usedBudget, 0) /
      mockProjects.reduce((sum, p) => sum + p.totalBudget, 0)) *
      100
  ),
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get mock projects by status
 */
export const getMockProjectsByStatus = (status: ProjectStatus): Project[] => {
  return mockProjects.filter(project => project.status === status);
};

/**
 * Get mock projects by type
 */
export const getMockProjectsByType = (type: ProjectType): Project[] => {
  return mockProjects.filter(project => project.type === type);
};

/**
 * Get mock project by ID
 */
export const getMockProjectById = (id: string): Project | undefined => {
  return mockProjects.find(project => project.id === id);
};

/**
 * Get mock project by code
 */
export const getMockProjectByCode = (code: string): Project | undefined => {
  return mockProjects.find(project => project.code === code);
};

/**
 * Search mock projects by name or description
 */
export const searchMockProjects = (query: string): Project[] => {
  const lowercaseQuery = query.toLowerCase();
  return mockProjects.filter(
    project =>
      project.name.toLowerCase().includes(lowercaseQuery) ||
      project.description.toLowerCase().includes(lowercaseQuery) ||
      project.managerName.toLowerCase().includes(lowercaseQuery) ||
      project.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

/**
 * Get mock projects with pagination
 */
export const getMockProjectsWithPagination = (
  page: number = 1,
  pageSize: number = 10
): { projects: Project[]; total: number; totalPages: number } => {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const projects = mockProjects.slice(startIndex, endIndex);

  return {
    projects,
    total: mockProjects.length,
    totalPages: Math.ceil(mockProjects.length / pageSize),
  };
};

// ==================== EXPORT DEFAULT ====================

export default mockProjects;
