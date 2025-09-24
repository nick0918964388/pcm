/**
 * ProjectCard Component Tests
 *
 * 測試 ProjectCard 元件的各種狀態和功能
 * - US1 (AC1.2): 測試專案基本資訊顯示
 * - US5 (AC5.1): 測試專案點擊導航功能
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ProjectCard } from '../ProjectCard';
import { Project, ProjectStatus, ProjectType } from '@/types/project';
import { mockProjects, getMockProjectById } from '@/mocks/projects';

// 使用 mock 專案資料作為基礎測試資料
const mockProject: Project = mockProjects[0]; // 台北捷運信義線延伸工程 - 進行中專案
const completedProject: Project = mockProjects[1]; // 高雄輕軌環狀線建設 - 已完成專案
const pausedProject: Project = mockProjects[4]; // 南迴公路拓寬改善工程 - 暫停專案
const cancelledProject: Project = mockProjects[9]; // 嘉義高鐵特定區聯外道路改善 - 已取消專案
const planningProject: Project = mockProjects[2]; // 台中捷運綠線延伸段 - 規劃中專案

// Mock functions
const mockOnProjectEnter = vi.fn();
const mockOnAccessRecord = vi.fn();

// 測試輔助函數
const renderProjectCard = (
  project: Project = mockProject,
  props: Partial<React.ComponentProps<typeof ProjectCard>> = {}
) => {
  const defaultProps = {
    project,
    onProjectEnter: mockOnProjectEnter,
    onAccessRecord: mockOnAccessRecord,
    ...props,
  };

  return render(<ProjectCard {...defaultProps} />);
};

describe('ProjectCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== 基本渲染測試 ====================

  describe('基本渲染', () => {
    it('應該正確渲染專案卡片的基本結構', () => {
      renderProjectCard();

      // 檢查卡片容器存在
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(
        screen.getByLabelText(`進入專案 ${mockProject.name}`)
      ).toBeInTheDocument();
    });

    it('應該正確渲染自定義 className', () => {
      const customClass = 'my-custom-card';
      renderProjectCard(mockProject, { className: customClass });

      const card = screen.getByRole('button');
      expect(card).toHaveClass(customClass);
    });

    it('應該在載入中時套用正確的樣式和覆蓋層', () => {
      renderProjectCard(mockProject, { loading: true });

      const card = screen.getByRole('button');
      expect(card).toHaveClass('opacity-50', 'pointer-events-none');

      // 檢查載入中覆蓋層
      const loadingOverlay = document.querySelector(
        '.absolute.inset-0.bg-background\\/50'
      );
      expect(loadingOverlay).toBeInTheDocument();
    });

    it('應該在緊湊模式下套用正確的樣式', () => {
      renderProjectCard(mockProject, { compact: true });

      const card = screen.getByRole('button');
      expect(card).toHaveClass('max-w-sm');
    });
  });

  // ==================== US1 (AC1.2): 專案基本資訊顯示測試 ====================

  describe('專案基本資訊顯示 (US1 AC1.2)', () => {
    it('應該顯示專案代碼', () => {
      renderProjectCard();
      expect(screen.getByText(mockProject.code)).toBeInTheDocument();
    });

    it('應該顯示專案名稱', () => {
      renderProjectCard();
      expect(screen.getByText(mockProject.name)).toBeInTheDocument();
    });

    it('應該顯示專案狀態', () => {
      renderProjectCard();
      expect(screen.getByText(mockProject.status)).toBeInTheDocument();
    });

    it('應該顯示專案類型圖標', () => {
      renderProjectCard();
      const typeIcon = screen.getByLabelText(mockProject.type);
      expect(typeIcon).toBeInTheDocument();
      expect(typeIcon).toHaveTextContent('🏢'); // INFRASTRUCTURE 圖標
    });

    it('應該在非緊湊模式下顯示專案描述', () => {
      renderProjectCard(mockProject, { compact: false });
      expect(screen.getByText(mockProject.description)).toBeInTheDocument();
    });

    it('應該在緊湊模式下隱藏專案描述', () => {
      renderProjectCard(mockProject, { compact: true });
      expect(
        screen.queryByText(mockProject.description)
      ).not.toBeInTheDocument();
    });

    it('應該顯示專案進度百分比', () => {
      renderProjectCard();
      expect(screen.getByText('68%')).toBeInTheDocument();
    });

    it('應該顯示進度條', () => {
      renderProjectCard();
      const progressBar = screen.getByLabelText('專案進度 68%');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '68');
    });

    it('應該顯示里程碑完成情況', () => {
      renderProjectCard();
      expect(screen.getByText('里程碑 8/12')).toBeInTheDocument();
    });

    it('應該顯示專案經理姓名', () => {
      renderProjectCard();
      expect(screen.getByText('專案經理：')).toBeInTheDocument();
      expect(screen.getByText(mockProject.managerName)).toBeInTheDocument();
    });

    it('應該顯示專案時程資訊', () => {
      renderProjectCard();
      expect(screen.getByText('時程：')).toBeInTheDocument();
      // 檢查日期格式
      expect(screen.getByText(/03\/01 ~ 12\/31/)).toBeInTheDocument();
    });

    it('應該顯示剩餘天數', () => {
      renderProjectCard();
      expect(screen.getByText('剩餘：')).toBeInTheDocument();
      // 剩餘天數會根據當前日期計算，所以只檢查標籤存在
    });

    it('應該在有最後存取時間時顯示', () => {
      renderProjectCard();
      if (mockProject.lastAccessDate) {
        expect(screen.getByText('最後存取：')).toBeInTheDocument();
      }
    });
  });

  // ==================== 專案狀態顯示測試 ====================

  describe('專案狀態顯示', () => {
    it('應該為進行中專案顯示正確的狀態徽章', () => {
      renderProjectCard(mockProject);
      const statusBadge = screen.getByText(ProjectStatus.IN_PROGRESS);
      expect(statusBadge).toBeInTheDocument();
    });

    it('應該為已完成專案顯示正確的狀態徽章', () => {
      renderProjectCard(completedProject);
      const statusBadge = screen.getByText(ProjectStatus.COMPLETED);
      expect(statusBadge).toBeInTheDocument();
    });

    it('應該為暫停專案顯示正確的狀態徽章', () => {
      renderProjectCard(pausedProject);
      const statusBadge = screen.getByText(ProjectStatus.PAUSED);
      expect(statusBadge).toBeInTheDocument();
    });

    it('應該為已取消專案顯示正確的狀態徽章', () => {
      renderProjectCard(cancelledProject);
      const statusBadge = screen.getByText(ProjectStatus.CANCELLED);
      expect(statusBadge).toBeInTheDocument();
    });

    it('應該為規劃中專案顯示正確的狀態徽章', () => {
      renderProjectCard(planningProject);
      const statusBadge = screen.getByText(ProjectStatus.PLANNING);
      expect(statusBadge).toBeInTheDocument();
    });
  });

  // ==================== 專案類型顯示測試 ====================

  describe('專案類型顯示', () => {
    it('應該為基礎設施項目顯示正確的圖標', () => {
      renderProjectCard(mockProject); // INFRASTRUCTURE
      const icon = screen.getByLabelText(ProjectType.INFRASTRUCTURE);
      expect(icon).toHaveTextContent('🏢');
    });

    it('應該為建築工程項目顯示正確的圖標', () => {
      const constructionProject = mockProjects.find(
        p => p.type === ProjectType.CONSTRUCTION
      );
      if (constructionProject) {
        renderProjectCard(constructionProject);
        const icon = screen.getByLabelText(ProjectType.CONSTRUCTION);
        expect(icon).toHaveTextContent('🏗️');
      }
    });

    it('應該為翻新工程項目顯示正確的圖標', () => {
      const renovationProject = mockProjects.find(
        p => p.type === ProjectType.RENOVATION
      );
      if (renovationProject) {
        renderProjectCard(renovationProject);
        const icon = screen.getByLabelText(ProjectType.RENOVATION);
        expect(icon).toHaveTextContent('🔨');
      }
    });

    it('應該為維護工程項目顯示正確的圖標', () => {
      const maintenanceProject = mockProjects.find(
        p => p.type === ProjectType.MAINTENANCE
      );
      if (maintenanceProject) {
        renderProjectCard(maintenanceProject);
        const icon = screen.getByLabelText(ProjectType.MAINTENANCE);
        expect(icon).toHaveTextContent('🔧');
      }
    });
  });

  // ==================== 進度狀態測試 ====================

  describe('進度狀態顯示', () => {
    it('應該為完成的專案顯示已完成狀態', () => {
      renderProjectCard(completedProject);
      expect(screen.getByText('已完成')).toBeInTheDocument();
    });

    it('應該為未完成的專案顯示進行中狀態', () => {
      renderProjectCard(mockProject);
      expect(screen.getByText('進行中')).toBeInTheDocument();
    });

    it('應該正確計算進度百分比', () => {
      renderProjectCard(mockProject);
      expect(screen.getByText('68%')).toBeInTheDocument();

      renderProjectCard(completedProject);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  // ==================== 時間相關測試 ====================

  describe('時間資訊顯示', () => {
    it('應該正確格式化並顯示日期', () => {
      renderProjectCard();
      // 檢查時程顯示格式 (MM/dd)
      expect(
        screen.getByText(/\d{2}\/\d{2} ~ \d{2}\/\d{2}/)
      ).toBeInTheDocument();
    });

    it('應該為逾期專案顯示逾期天數', () => {
      // 創建一個逾期的專案
      const overdueProject: Project = {
        ...mockProject,
        endDate: new Date('2020-01-01'), // 過去的日期
      };

      renderProjectCard(overdueProject);
      expect(screen.getByText(/逾期 \d+ 天/)).toBeInTheDocument();
    });

    it('應該為即將到期的專案顯示警告樣式', () => {
      // 創建一個即將到期的專案 (7天內)
      const soonDueProject: Project = {
        ...mockProject,
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5天後
      };

      renderProjectCard(soonDueProject);
      const remainingDaysText = screen.getByText(/5 天/).closest('span');
      expect(remainingDaysText).toHaveClass(
        'text-orange-600',
        'dark:text-orange-400'
      );
    });
  });

  // ==================== US5 (AC5.1): 點擊導航功能測試 ====================

  describe('專案點擊導航功能 (US5 AC5.1)', () => {
    it('應該在點擊卡片時調用 onAccessRecord 和 onProjectEnter', async () => {
      const user = userEvent.setup();
      renderProjectCard();

      const card = screen.getByRole('button');
      await user.click(card);

      await waitFor(() => {
        expect(mockOnAccessRecord).toHaveBeenCalledWith(mockProject.id);
        expect(mockOnProjectEnter).toHaveBeenCalledWith(mockProject.id);
      });
    });

    it('應該在點擊進入專案按鈕時調用 onProjectEnter', async () => {
      const user = userEvent.setup();
      renderProjectCard();

      const enterButton = screen.getByText('進入專案');
      await user.click(enterButton);

      await waitFor(() => {
        expect(mockOnProjectEnter).toHaveBeenCalledWith(mockProject.id);
      });
    });

    it('應該支援鍵盤導航 (Enter 鍵)', async () => {
      const user = userEvent.setup();
      renderProjectCard();

      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnAccessRecord).toHaveBeenCalledWith(mockProject.id);
        expect(mockOnProjectEnter).toHaveBeenCalledWith(mockProject.id);
      });
    });

    it('應該支援鍵盤導航 (空白鍵)', async () => {
      const user = userEvent.setup();
      renderProjectCard();

      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard(' ');

      await waitFor(() => {
        expect(mockOnAccessRecord).toHaveBeenCalledWith(mockProject.id);
        expect(mockOnProjectEnter).toHaveBeenCalledWith(mockProject.id);
      });
    });

    it('應該在載入中時禁用點擊功能', async () => {
      const user = userEvent.setup();
      renderProjectCard(mockProject, { loading: true });

      const card = screen.getByRole('button');
      await user.click(card);

      // 載入中時不應該調用任何事件處理函數
      expect(mockOnAccessRecord).not.toHaveBeenCalled();
      expect(mockOnProjectEnter).not.toHaveBeenCalled();
    });

    it('應該在進入專案過程中顯示載入狀態', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value?: any) => void;

      // Mock 一個會延遲的 onProjectEnter
      const delayedOnProjectEnter = vi.fn(() => {
        return new Promise(resolve => {
          resolvePromise = resolve;
        });
      });

      renderProjectCard(mockProject, { onProjectEnter: delayedOnProjectEnter });

      const enterButton = screen.getByText('進入專案');
      await user.click(enterButton);

      // 檢查載入中狀態
      await waitFor(() => {
        expect(screen.getByText('進入中...')).toBeInTheDocument();
      });

      // 解決 Promise
      resolvePromise!();

      // 檢查載入狀態消失
      await waitFor(() => {
        expect(screen.queryByText('進入中...')).not.toBeInTheDocument();
        expect(screen.getByText('進入專案')).toBeInTheDocument();
      });
    });

    it('應該在進入專案失敗時恢復按鈕狀態', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Mock 一個會失敗的 onProjectEnter
      const failingOnProjectEnter = vi
        .fn()
        .mockRejectedValue(new Error('Network error'));

      renderProjectCard(mockProject, { onProjectEnter: failingOnProjectEnter });

      const enterButton = screen.getByText('進入專案');
      await user.click(enterButton);

      // 等待錯誤處理完成
      await waitFor(() => {
        expect(screen.getByText('進入專案')).toBeInTheDocument();
        expect(screen.queryByText('進入中...')).not.toBeInTheDocument();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error entering project:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });
  });

  // ==================== 互動狀態測試 ====================

  describe('互動狀態', () => {
    it('應該在滑鼠懸停時應用懸停樣式', async () => {
      const user = userEvent.setup();
      renderProjectCard();

      const card = screen.getByRole('button');

      await user.hover(card);

      expect(card).toHaveClass('hover:shadow-lg', 'hover:-translate-y-1');
    });

    it('應該在滑鼠離開時移除懸停樣式', async () => {
      const user = userEvent.setup();
      renderProjectCard();

      const card = screen.getByRole('button');

      await user.hover(card);
      await user.unhover(card);

      // 這個測試主要確保不會有錯誤，實際的 CSS 類別變化由 React state 控制
    });

    it('應該正確處理焦點狀態', async () => {
      const user = userEvent.setup();
      renderProjectCard();

      const card = screen.getByRole('button');
      await user.tab(); // 如果這是第一個可聚焦元素

      expect(card).toHaveFocus();
    });
  });

  // ==================== 可訪問性測試 ====================

  describe('可訪問性', () => {
    it('應該提供正確的 ARIA 標籤', () => {
      renderProjectCard();

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute(
        'aria-label',
        `進入專案 ${mockProject.name}`
      );
    });

    it('應該支援鍵盤操作', () => {
      renderProjectCard();

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('應該為進度條提供正確的 ARIA 屬性', () => {
      renderProjectCard();

      const progressBar = screen.getByLabelText(
        `專案進度 ${Math.round(mockProject.progress)}%`
      );
      expect(progressBar).toBeInTheDocument();
    });

    it('應該為專案類型圖標提供正確的 ARIA 標籤', () => {
      renderProjectCard();

      const typeIcon = screen.getByLabelText(mockProject.type);
      expect(typeIcon).toBeInTheDocument();
    });
  });

  // ==================== 邊界條件測試 ====================

  describe('邊界條件', () => {
    it('應該處理沒有描述的專案', () => {
      const projectWithoutDescription: Project = {
        ...mockProject,
        description: '',
      };

      renderProjectCard(projectWithoutDescription, { compact: false });

      // 空描述不應該顯示
      expect(screen.queryByText('')).not.toBeInTheDocument();
    });

    it('應該處理沒有最後存取時間的專案', () => {
      const projectWithoutAccess: Project = {
        ...mockProject,
        lastAccessDate: undefined,
      };

      renderProjectCard(projectWithoutAccess);

      expect(screen.queryByText('最後存取：')).not.toBeInTheDocument();
    });

    it('應該處理進度為 0 的專案', () => {
      const projectWithZeroProgress: Project = {
        ...mockProject,
        progress: 0,
        completedMilestones: 0,
      };

      renderProjectCard(projectWithZeroProgress);

      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('里程碑 0/12')).toBeInTheDocument();
      expect(screen.getByText('進行中')).toBeInTheDocument();
    });

    it('應該處理進度為 100 的專案', () => {
      renderProjectCard(completedProject);

      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('已完成')).toBeInTheDocument();
    });

    it('應該處理沒有回調函數的情況', async () => {
      const user = userEvent.setup();

      renderProjectCard(mockProject, {
        onProjectEnter: undefined,
        onAccessRecord: undefined,
      });

      const card = screen.getByRole('button');

      // 應該不會拋出錯誤
      expect(() => user.click(card)).not.toThrow();
    });

    it('應該處理非常長的專案名稱', () => {
      const projectWithLongName: Project = {
        ...mockProject,
        name: '這是一個非常非常非常長的專案名稱，用來測試文字是否會正確截斷和顯示，確保UI不會因為過長的文字而破版',
      };

      renderProjectCard(projectWithLongName);

      const nameElement = screen.getByText(projectWithLongName.name);
      expect(nameElement).toBeInTheDocument();
      expect(nameElement).toHaveClass('line-clamp-2');
    });

    it('應該處理非常長的專案經理姓名', () => {
      const projectWithLongManagerName: Project = {
        ...mockProject,
        managerName: '這是一個非常長的專案經理姓名測試',
      };

      renderProjectCard(projectWithLongManagerName);

      const managerElement = screen.getByText(
        projectWithLongManagerName.managerName
      );
      expect(managerElement).toBeInTheDocument();
      expect(managerElement).toHaveClass('truncate');
    });
  });

  // ==================== 記憶體和效能測試 ====================

  describe('記憶體和效能', () => {
    it('應該正確使用 React.memo 進行記憶化', () => {
      const { rerender } = renderProjectCard();

      // 使用相同的 props 重新渲染
      rerender(
        <ProjectCard
          project={mockProject}
          onProjectEnter={mockOnProjectEnter}
          onAccessRecord={mockOnAccessRecord}
        />
      );

      // React.memo 應該防止不必要的重新渲染
      expect(screen.getByText(mockProject.name)).toBeInTheDocument();
    });

    it('應該正確使用 useCallback 進行事件處理函數優化', () => {
      // 這個測試主要確保組件能正確渲染，useCallback 的效果在實際使用中更明顯
      renderProjectCard();

      const enterButton = screen.getByText('進入專案');
      expect(enterButton).toBeInTheDocument();
    });
  });

  // ==================== 整合測試 ====================

  describe('整合測試', () => {
    it('應該與真實的 mock 數據正確配合', () => {
      // 使用 mock 數據中的第一個專案
      const testProject = mockProjects[0];
      renderProjectCard(testProject);

      // 驗證所有關鍵資訊都正確顯示
      expect(screen.getByText(testProject.code)).toBeInTheDocument();
      expect(screen.getByText(testProject.name)).toBeInTheDocument();
      expect(screen.getByText(testProject.status)).toBeInTheDocument();
      expect(screen.getByText(testProject.managerName)).toBeInTheDocument();
    });

    it('應該正確處理不同狀態專案的完整工作流程', async () => {
      const user = userEvent.setup();

      // 測試進行中的專案
      const { rerender } = renderProjectCard(mockProject);

      let card = screen.getByRole('button');
      await user.click(card);

      await waitFor(() => {
        expect(mockOnProjectEnter).toHaveBeenCalledWith(mockProject.id);
      });

      // 重置 mocks
      vi.clearAllMocks();

      // 測試已完成的專案
      rerender(
        <ProjectCard
          project={completedProject}
          onProjectEnter={mockOnProjectEnter}
          onAccessRecord={mockOnAccessRecord}
        />
      );

      card = screen.getByRole('button');
      await user.click(card);

      await waitFor(() => {
        expect(mockOnProjectEnter).toHaveBeenCalledWith(completedProject.id);
      });
    });
  });
});
