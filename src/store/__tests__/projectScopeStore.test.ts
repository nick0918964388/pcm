/**
 * Project Scope Store Tests
 *
 * 測試專案範疇管理 store 的所有功能，包括：
 * - 專案選擇和切換
 * - 最近存取專案管理
 * - 收藏專案功能
 * - 使用者偏好設定
 * - 權限管理
 */

import { act, renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  useProjectScopeStore,
  ProjectPermission,
  useCurrentProject,
  useRecentProjects,
  useFavoriteProjects,
  useUserPreferences,
} from '../projectScopeStore';
import { Project } from '@/types/project';

// Mock zustand persist
vi.mock('zustand/middleware', () => ({
  devtools: (fn: any) => fn,
  persist: (fn: any) => fn,
}));

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('ProjectScopeStore', () => {
  const mockProject1: Project = {
    id: 'proj001',
    code: 'F20P1',
    name: 'FAB20 Phase1 專案',
    description: '半導體廠建設專案',
    status: '進行中',
    type: '建築工程',
    progress: 65,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-12-31'),
    actualStartDate: new Date('2024-01-01'),
    managerId: 'mgr001',
    managerName: '王建民',
    teamMembers: [],
    totalBudget: 500000000,
    usedBudget: 325000000,
    currency: 'TWD',
    totalMilestones: 5,
    completedMilestones: 3,
    permissions: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-08-31'),
    tags: ['建築', '半導體'],
    location: '台南科學園區',
  };

  const mockProject2: Project = {
    id: 'proj002',
    code: 'F21P2',
    name: 'FAB21 Phase2 專案',
    description: '廠房擴建專案',
    status: '規劃中',
    type: '基礎設施',
    progress: 25,
    startDate: new Date('2024-06-01'),
    endDate: new Date('2026-05-31'),
    managerId: 'mgr002',
    managerName: '李美玲',
    teamMembers: [],
    totalBudget: 750000000,
    usedBudget: 187500000,
    currency: 'TWD',
    totalMilestones: 8,
    completedMilestones: 2,
    permissions: [],
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-08-31'),
    tags: ['擴建', '半導體'],
    location: '新竹科學園區',
  };

  beforeEach(() => {
    // 重設 store 狀態
    act(() => {
      const { getState } = useProjectScopeStore;
      const store = getState();
      store.clearCurrentProject();
      store.clearAccessHistory();
      store.resetUserPreferences();
    });

    vi.clearAllMocks();
  });

  describe('專案選擇功能', () => {
    it('應該能夠選擇專案', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      act(() => {
        result.current.selectProject(mockProject1, ProjectPermission.EDITOR);
      });

      expect(result.current.currentProject).toEqual(mockProject1);
      expect(result.current.currentProjectPermission).toBe(
        ProjectPermission.EDITOR
      );
      expect(result.current.error).toBeNull();
    });

    it('選擇專案時應該記錄存取歷史', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      act(() => {
        result.current.selectProject(mockProject1);
      });

      expect(result.current.recentProjects).toHaveLength(1);
      expect(result.current.recentProjects[0]).toMatchObject({
        projectId: mockProject1.id,
        projectName: mockProject1.name,
        projectCode: mockProject1.code,
        accessCount: 1,
        isFavorite: false,
      });
    });

    it('選擇專案時應該儲存到 sessionStorage', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      act(() => {
        result.current.selectProject(mockProject1);
      });

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'selectedProject',
        JSON.stringify(mockProject1)
      );
    });

    it('應該能夠清除當前專案', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      act(() => {
        result.current.selectProject(mockProject1);
      });

      expect(result.current.currentProject).toBeTruthy();

      act(() => {
        result.current.clearCurrentProject();
      });

      expect(result.current.currentProject).toBeNull();
      expect(result.current.currentProjectPermission).toBe(
        ProjectPermission.VIEWER
      );
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        'selectedProject'
      );
    });
  });

  describe('最近存取專案管理', () => {
    it('應該記錄新的專案存取', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      act(() => {
        result.current.recordProjectAccess(mockProject1);
      });

      expect(result.current.recentProjects).toHaveLength(1);
      expect(result.current.recentProjects[0].projectId).toBe(mockProject1.id);
      expect(result.current.recentProjects[0].accessCount).toBe(1);
    });

    it('重複存取同一專案應該更新存取次數', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      act(() => {
        result.current.recordProjectAccess(mockProject1);
      });

      act(() => {
        result.current.recordProjectAccess(mockProject1);
      });

      expect(result.current.recentProjects).toHaveLength(1);
      expect(result.current.recentProjects[0].accessCount).toBe(2);
    });

    it('存取新專案應該將其移到最前面', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      act(() => {
        result.current.recordProjectAccess(mockProject1);
        result.current.recordProjectAccess(mockProject2);
      });

      expect(result.current.recentProjects).toHaveLength(2);
      expect(result.current.recentProjects[0].projectId).toBe(mockProject2.id);
      expect(result.current.recentProjects[1].projectId).toBe(mockProject1.id);
    });

    it('應該限制最近專案記錄數量', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      // 建立 25 個模擬專案（超過限制的 20 個）
      for (let i = 0; i < 25; i++) {
        const project = {
          ...mockProject1,
          id: `proj${i.toString().padStart(3, '0')}`,
        };
        act(() => {
          result.current.recordProjectAccess(project);
        });
      }

      expect(result.current.recentProjects).toHaveLength(20);
    });

    it('應該能夠清除存取歷史', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      act(() => {
        result.current.recordProjectAccess(mockProject1);
        result.current.recordProjectAccess(mockProject2);
      });

      expect(result.current.recentProjects).toHaveLength(2);

      act(() => {
        result.current.clearAccessHistory();
      });

      expect(result.current.recentProjects).toHaveLength(0);
    });

    it('應該能夠移除特定專案的存取記錄', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      act(() => {
        result.current.recordProjectAccess(mockProject1);
        result.current.recordProjectAccess(mockProject2);
      });

      expect(result.current.recentProjects).toHaveLength(2);

      act(() => {
        result.current.removeProjectFromHistory(mockProject1.id);
      });

      expect(result.current.recentProjects).toHaveLength(1);
      expect(result.current.recentProjects[0].projectId).toBe(mockProject2.id);
    });
  });

  describe('收藏專案功能', () => {
    it('應該能夠切換專案收藏狀態', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      // 收藏專案
      act(() => {
        result.current.toggleProjectFavorite(mockProject1.id);
      });

      expect(result.current.favoriteProjects).toContain(mockProject1.id);
      expect(result.current.isProjectFavorite(mockProject1.id)).toBe(true);

      // 取消收藏
      act(() => {
        result.current.toggleProjectFavorite(mockProject1.id);
      });

      expect(result.current.favoriteProjects).not.toContain(mockProject1.id);
      expect(result.current.isProjectFavorite(mockProject1.id)).toBe(false);
    });

    it('切換收藏狀態時應該同時更新最近專案記錄', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      act(() => {
        result.current.recordProjectAccess(mockProject1);
      });

      expect(result.current.recentProjects[0].isFavorite).toBe(false);

      act(() => {
        result.current.toggleProjectFavorite(mockProject1.id);
      });

      expect(result.current.recentProjects[0].isFavorite).toBe(true);
    });
  });

  describe('使用者偏好設定', () => {
    it('應該能夠更新使用者偏好', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      const newPreferences = {
        defaultViewMode: 'table' as const,
        defaultSortBy: 'name' as const,
        defaultPageSize: 20,
      };

      act(() => {
        result.current.updateUserPreferences(newPreferences);
      });

      expect(result.current.userPreferences).toMatchObject(newPreferences);
    });

    it('應該能夠重設使用者偏好', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      // 先更新偏好
      act(() => {
        result.current.updateUserPreferences({
          defaultViewMode: 'table',
          defaultPageSize: 50,
        });
      });

      // 重設偏好
      act(() => {
        result.current.resetUserPreferences();
      });

      expect(result.current.userPreferences.defaultViewMode).toBe('grid');
      expect(result.current.userPreferences.defaultPageSize).toBe(12);
    });
  });

  describe('權限管理', () => {
    it('應該能夠檢查權限', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      // 設定為編輯者權限
      act(() => {
        result.current.selectProject(mockProject1, ProjectPermission.EDITOR);
      });

      expect(result.current.hasPermission(ProjectPermission.VIEWER)).toBe(true);
      expect(result.current.hasPermission(ProjectPermission.EDITOR)).toBe(true);
      expect(result.current.hasPermission(ProjectPermission.ADMIN)).toBe(false);
      expect(result.current.hasPermission(ProjectPermission.SUPER_ADMIN)).toBe(
        false
      );
    });

    it('應該能夠更新當前專案權限', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      act(() => {
        result.current.selectProject(mockProject1, ProjectPermission.VIEWER);
      });

      expect(result.current.currentProjectPermission).toBe(
        ProjectPermission.VIEWER
      );

      act(() => {
        result.current.updateCurrentProjectPermission(ProjectPermission.ADMIN);
      });

      expect(result.current.currentProjectPermission).toBe(
        ProjectPermission.ADMIN
      );
    });
  });

  describe('UI 控制', () => {
    it('應該能夠切換專案選擇器狀態', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      expect(result.current.isProjectSelectorOpen).toBe(false);

      act(() => {
        result.current.toggleProjectSelector();
      });

      expect(result.current.isProjectSelectorOpen).toBe(true);

      act(() => {
        result.current.toggleProjectSelector();
      });

      expect(result.current.isProjectSelectorOpen).toBe(false);
    });

    it('應該能夠設定載入狀態', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.loading).toBe(false);
    });

    it('應該能夠設定錯誤狀態', () => {
      const { result } = renderHook(() => useProjectScopeStore());

      const errorMessage = '載入專案失敗';

      act(() => {
        result.current.setError(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Utility Hooks', () => {
    it('useCurrentProject 應該返回當前專案', () => {
      const { result: storeResult } = renderHook(() => useProjectScopeStore());
      const { result: hookResult } = renderHook(() => useCurrentProject());

      act(() => {
        storeResult.current.selectProject(mockProject1);
      });

      expect(hookResult.current).toEqual(mockProject1);
    });

    it('useRecentProjects 應該返回限制數量的最近專案', () => {
      const { result: storeResult } = renderHook(() => useProjectScopeStore());
      const { result: hookResult } = renderHook(() => useRecentProjects(2));

      act(() => {
        storeResult.current.recordProjectAccess(mockProject1);
        storeResult.current.recordProjectAccess(mockProject2);
        storeResult.current.recordProjectAccess({
          ...mockProject1,
          id: 'proj003',
        });
      });

      expect(hookResult.current).toHaveLength(2);
    });

    it('useFavoriteProjects 應該返回收藏相關功能', () => {
      const { result: storeResult } = renderHook(() => useProjectScopeStore());
      const { result: hookResult } = renderHook(() => useFavoriteProjects());

      act(() => {
        storeResult.current.toggleProjectFavorite(mockProject1.id);
      });

      expect(hookResult.current.favoriteProjectIds).toContain(mockProject1.id);
      expect(hookResult.current.isFavorite(mockProject1.id)).toBe(true);

      act(() => {
        hookResult.current.toggleFavorite(mockProject1.id);
      });

      expect(hookResult.current.favoriteProjectIds).not.toContain(
        mockProject1.id
      );
    });

    it('useUserPreferences 應該返回偏好相關功能', () => {
      const { result: storeResult } = renderHook(() => useProjectScopeStore());
      const { result: hookResult } = renderHook(() => useUserPreferences());

      const newPreferences = { defaultPageSize: 25 };

      act(() => {
        hookResult.current.updatePreferences(newPreferences);
      });

      expect(hookResult.current.preferences.defaultPageSize).toBe(25);

      act(() => {
        hookResult.current.resetPreferences();
      });

      expect(hookResult.current.preferences.defaultPageSize).toBe(12);
    });
  });
});
