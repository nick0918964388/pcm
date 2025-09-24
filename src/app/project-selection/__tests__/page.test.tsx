/**
 * Project Selection Page Integration Tests
 *
 * 測試專案選擇頁面的完整功能，包括：
 * - 頁面載入和顯示
 * - 專案搜尋功能
 * - 專案選擇功能
 * - 檢視模式切換
 * - 最近存取專案顯示
 * - 導向儀表板功能
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useRouter } from 'next/navigation';
import ProjectSelectionPage from '../page';
import { useProjectStore } from '@/store/projectStore';
import { useProjectScopeStore } from '@/store/projectScopeStore';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock stores
vi.mock('@/store/projectStore', () => ({
  useProjectStore: vi.fn(),
}));

vi.mock('@/store/projectScopeStore', () => ({
  useProjectScopeStore: vi.fn(),
  useRecentProjects: vi.fn(),
}));

// Mock components
vi.mock('@/components/projects/ProjectGrid', () => ({
  ProjectGrid: ({ projects, onProjectClick }: any) => (
    <div data-testid='project-grid'>
      {projects.map((project: any) => (
        <div
          key={project.id}
          data-testid={`project-${project.id}`}
          onClick={() => onProjectClick?.(project)}
        >
          {project.name}
        </div>
      ))}
    </div>
  ),
}));

describe('ProjectSelectionPage', () => {
  const mockRouter = {
    push: vi.fn(),
  };

  const mockProjectStore = {
    projects: [
      {
        id: 'proj001',
        code: 'F20P1',
        name: 'FAB20 Phase1 專案',
        description: '半導體廠建設專案',
        status: '進行中',
        progress: 65,
        startDate: '2024-01-01',
        endDate: '2025-12-31',
        managerName: '王建民',
        totalBudget: 500000000,
        usedBudget: 325000000,
        currency: 'TWD',
        teamMembers: [],
        totalMilestones: 5,
        completedMilestones: 3,
        permissions: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-08-31',
        tags: ['建築', '半導體'],
        type: '建築工程',
        location: '台南科學園區',
      },
      {
        id: 'proj002',
        code: 'F21P2',
        name: 'FAB21 Phase2 專案',
        description: '廠房擴建專案',
        status: '規劃中',
        progress: 25,
        startDate: '2024-06-01',
        endDate: '2026-05-31',
        managerName: '李美玲',
        totalBudget: 750000000,
        usedBudget: 187500000,
        currency: 'TWD',
        teamMembers: [],
        totalMilestones: 8,
        completedMilestones: 2,
        permissions: [],
        createdAt: '2024-06-01',
        updatedAt: '2024-08-31',
        tags: ['擴建', '半導體'],
        type: '基礎設施',
        location: '新竹科學園區',
      },
    ],
    filteredProjects: [],
    loading: false,
    searchQuery: '',
    viewMode: 'grid',
    initialized: true,
    initialize: vi.fn(),
    searchProjects: vi.fn(),
    setViewMode: vi.fn(),
  };

  const mockScopeStore = {
    selectProject: vi.fn(),
  };

  const mockRecentProjects = [
    {
      projectId: 'proj001',
      projectName: 'FAB20 Phase1 專案',
      projectCode: 'F20P1',
      lastAccessTime: new Date(),
      accessCount: 5,
      isFavorite: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
    (useProjectStore as any).mockReturnValue({
      ...mockProjectStore,
      filteredProjects: mockProjectStore.projects,
    });
    (useProjectScopeStore as any).mockReturnValue(mockScopeStore);

    // Mock useRecentProjects hook
    const { useRecentProjects } = require('@/store/projectScopeStore');
    (useRecentProjects as any).mockReturnValue(mockRecentProjects);
  });

  describe('頁面載入和顯示', () => {
    it('應該正確顯示頁面標題和描述', async () => {
      render(<ProjectSelectionPage />);

      expect(screen.getByText('選擇專案')).toBeInTheDocument();
      expect(
        screen.getByText('選擇您要管理的專案以存取專案儀表板')
      ).toBeInTheDocument();
    });

    it('應該顯示專案統計資訊', async () => {
      render(<ProjectSelectionPage />);

      await waitFor(() => {
        expect(screen.getByText('總計 2 個專案')).toBeInTheDocument();
        expect(screen.getByText('進行中 1')).toBeInTheDocument();
      });
    });

    it('載入中時應該顯示載入狀態', () => {
      (useProjectStore as jest.Mock).mockReturnValue({
        ...mockProjectStore,
        loading: true,
        initialized: false,
      });

      render(<ProjectSelectionPage />);

      expect(screen.getByText('載入專案資料中...')).toBeInTheDocument();
    });
  });

  describe('最近存取專案', () => {
    it('應該顯示最近存取的專案', async () => {
      render(<ProjectSelectionPage />);

      await waitFor(() => {
        expect(screen.getByText('最近存取的專案')).toBeInTheDocument();
        expect(screen.getByText('FAB20 Phase1 專案')).toBeInTheDocument();
      });
    });

    it('當沒有最近專案時不應該顯示最近專案區塊', async () => {
      const { useRecentProjects } = require('@/store/projectScopeStore');
      (useRecentProjects as any).mockReturnValue([]);

      render(<ProjectSelectionPage />);

      expect(screen.queryByText('最近存取的專案')).not.toBeInTheDocument();
    });
  });

  describe('專案搜尋功能', () => {
    it('應該能夠搜尋專案', async () => {
      const user = userEvent.setup();
      render(<ProjectSelectionPage />);

      const searchInput = screen.getByPlaceholderText('搜尋專案名稱、代碼...');
      await user.type(searchInput, 'FAB20');

      expect(mockProjectStore.searchProjects).toHaveBeenCalledWith('FAB20');
    });

    it('搜尋輸入應該更新輸入欄位的值', async () => {
      const user = userEvent.setup();
      render(<ProjectSelectionPage />);

      const searchInput = screen.getByPlaceholderText('搜尋專案名稱、代碼...');
      await user.type(searchInput, 'test query');

      expect(searchInput).toHaveValue('test query');
    });
  });

  describe('檢視模式切換', () => {
    it('應該能夠切換到網格模式', async () => {
      const user = userEvent.setup();
      render(<ProjectSelectionPage />);

      const gridButton = screen.getByRole('button', { name: /grid/i });
      await user.click(gridButton);

      expect(mockProjectStore.setViewMode).toHaveBeenCalledWith('grid');
    });

    it('應該能夠切換到表格模式', async () => {
      const user = userEvent.setup();
      render(<ProjectSelectionPage />);

      const tableButton = screen.getByRole('button', { name: /table/i });
      await user.click(tableButton);

      expect(mockProjectStore.setViewMode).toHaveBeenCalledWith('table');
    });
  });

  describe('專案選擇功能', () => {
    it('應該能夠選擇專案並導向儀表板', async () => {
      render(<ProjectSelectionPage />);

      await waitFor(() => {
        expect(screen.getByTestId('project-grid')).toBeInTheDocument();
      });

      const projectElement = screen.getByTestId('project-proj001');
      fireEvent.click(projectElement);

      expect(mockScopeStore.selectProject).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'proj001',
          name: 'FAB20 Phase1 專案',
        })
      );
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/proj001');
    });
  });

  describe('專案列表顯示', () => {
    it('應該顯示專案列表', async () => {
      render(<ProjectSelectionPage />);

      await waitFor(() => {
        expect(screen.getByText('所有專案 (2)')).toBeInTheDocument();
        expect(screen.getByTestId('project-grid')).toBeInTheDocument();
      });
    });

    it('當沒有專案時應該顯示空狀態', async () => {
      (useProjectStore as any).mockReturnValue({
        ...mockProjectStore,
        filteredProjects: [],
      });

      render(<ProjectSelectionPage />);

      await waitFor(() => {
        expect(screen.getByText('找不到專案')).toBeInTheDocument();
        expect(
          screen.getByText('嘗試調整您的搜尋條件或清除篩選器')
        ).toBeInTheDocument();
      });
    });
  });

  describe('快速操作區域', () => {
    it('應該顯示快速操作卡片', () => {
      render(<ProjectSelectionPage />);

      expect(screen.getByText('快速操作')).toBeInTheDocument();
      expect(screen.getByText('檢視所有專案')).toBeInTheDocument();
      expect(screen.getByText('進行中專案')).toBeInTheDocument();
      expect(screen.getByText('進階搜尋')).toBeInTheDocument();
    });

    it('進行中專案卡片應該顯示正確數量', () => {
      render(<ProjectSelectionPage />);

      expect(screen.getByText('檢視 1 個進行中專案')).toBeInTheDocument();
    });
  });

  describe('響應式設計', () => {
    it('應該在小螢幕上正確顯示', () => {
      // 模擬小螢幕
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640,
      });

      render(<ProjectSelectionPage />);

      // 檢查響應式元素是否存在
      expect(screen.getByText('選擇專案')).toBeInTheDocument();
    });
  });

  describe('錯誤處理', () => {
    it('應該處理初始化錯誤', async () => {
      const mockInitializeWithError = vi
        .fn()
        .mockRejectedValue(new Error('Initialize failed'));
      (useProjectStore as any).mockReturnValue({
        ...mockProjectStore,
        initialized: false,
        initialize: mockInitializeWithError,
      });

      render(<ProjectSelectionPage />);

      // 驗證錯誤不會導致崩潰
      await waitFor(() => {
        expect(mockInitializeWithError).toHaveBeenCalled();
      });
    });

    it('應該處理搜尋錯誤', async () => {
      const mockSearchWithError = vi.fn().mockImplementation(() => {
        throw new Error('Search failed');
      });
      (useProjectStore as any).mockReturnValue({
        ...mockProjectStore,
        searchProjects: mockSearchWithError,
      });

      const user = userEvent.setup();
      render(<ProjectSelectionPage />);

      const searchInput = screen.getByPlaceholderText('搜尋專案名稱、代碼...');

      // 搜尋不應該導致崩潰
      await user.type(searchInput, 'test');
      expect(mockSearchWithError).toHaveBeenCalled();
    });
  });
});
