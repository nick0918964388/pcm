import { describe, it, expect, beforeEach } from 'vitest';
import {
  WBSItem,
  WBSStatus,
  WBSPriority,
  WBSResourceType,
  WBSTreeOperations,
  WBSFilters,
  WBSImportExportFormat,
  WBSBatchOperations,
  WBSBatchDeleteRequest,
  WBSBatchUpdateRequest,
  WBSBatchMoveRequest,
  WBSValidationRule,
  WBSValidationResult,
  WBSTemplate,
  WBSStatistics,
  WBSResourceRequirement,
  WBSRisk,
  WBSMilestone,
  WBSDependency,
} from '../wbs';

describe('WBS 數據模型測試', () => {
  describe('WBSItem 基本功能', () => {
    it('應該創建有效的 WBS 項目', () => {
      const wbsItem: WBSItem = {
        id: 'wbs-001',
        code: '1.1',
        name: '專案需求分析',
        description: '進行專案需求收集與分析',
        status: WBSStatus.PENDING,
        priority: WBSPriority.HIGH,
        level: 2,
        parentId: 'wbs-parent',
        projectId: 'proj-001',
        assigneeIds: ['user-001', 'user-002'],
        estimatedHours: 40,
        actualHours: 0,
        progress: 0,
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-15'),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-admin',
        updatedBy: 'user-admin',
      };

      expect(wbsItem.id).toBe('wbs-001');
      expect(wbsItem.code).toBe('1.1');
      expect(wbsItem.name).toBe('專案需求分析');
      expect(wbsItem.status).toBe(WBSStatus.PENDING);
      expect(wbsItem.priority).toBe(WBSPriority.HIGH);
      expect(wbsItem.level).toBe(2);
      expect(wbsItem.estimatedHours).toBe(40);
    });

    it('應該支援選擇性欄位', () => {
      const minimalWbs: WBSItem = {
        id: 'wbs-002',
        code: '2.1',
        name: '基礎開發',
        status: WBSStatus.IN_PROGRESS,
        priority: WBSPriority.MEDIUM,
        level: 1,
        projectId: 'proj-001',
        assigneeIds: [],
        estimatedHours: 20,
        actualHours: 5,
        progress: 25,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-001',
        updatedBy: 'user-001',
      };

      expect(minimalWbs.parentId).toBeUndefined();
      expect(minimalWbs.description).toBeUndefined();
      expect(minimalWbs.startDate).toBeUndefined();
      expect(minimalWbs.endDate).toBeUndefined();
    });
  });

  describe('WBS 狀態枚舉', () => {
    it('應該包含所有必要的狀態', () => {
      expect(WBSStatus.PENDING).toBe('pending');
      expect(WBSStatus.IN_PROGRESS).toBe('in_progress');
      expect(WBSStatus.ON_HOLD).toBe('on_hold');
      expect(WBSStatus.COMPLETED).toBe('completed');
      expect(WBSStatus.CANCELLED).toBe('cancelled');
      expect(WBSStatus.OVERDUE).toBe('overdue');
    });
  });

  describe('WBS 優先級枚舉', () => {
    it('應該包含所有優先級選項', () => {
      expect(WBSPriority.CRITICAL).toBe('critical');
      expect(WBSPriority.HIGH).toBe('high');
      expect(WBSPriority.MEDIUM).toBe('medium');
      expect(WBSPriority.LOW).toBe('low');
    });
  });

  describe('WBS 樹狀結構操作', () => {
    it('應該支援添加子項目操作', () => {
      const operations: WBSTreeOperations = {
        addChild: async () => ({}) as WBSItem,
        removeChild: async () => {},
        moveItem: async () => ({}) as WBSItem,
        updateItem: async () => ({}) as WBSItem,
        getChildren: async () => [],
        getParent: async () => null,
        getPath: async () => [],
        validateTree: async () => ({ isValid: true, errors: [] }),
        copyItem: async () => ({}) as WBSItem,
        toggleExpand: () => {},
        expandAll: () => {},
        collapseAll: () => {},
        expandToLevel: () => {},
        recalculateHierarchy: async () => {},
        validateTreeStructure: async () => true,
        findPath: () => [],
        getAncestors: () => [],
        getDescendants: () => [],
        getSiblings: () => [],
      };

      expect(typeof operations.addChild).toBe('function');
      expect(typeof operations.removeChild).toBe('function');
      expect(typeof operations.moveItem).toBe('function');
      expect(typeof operations.updateItem).toBe('function');
    });
  });

  describe('WBS 篩選功能', () => {
    it('應該支援多種篩選條件', () => {
      const filters: WBSFilters = {
        status: [WBSStatus.IN_PROGRESS, WBSStatus.PENDING],
        priority: [WBSPriority.HIGH, WBSPriority.CRITICAL],
        assigneeIds: ['user-001'],
        startDateRange: {
          from: new Date('2025-01-01'),
          to: new Date('2025-12-31'),
        },
        endDateRange: {
          from: new Date('2025-01-01'),
          to: new Date('2025-12-31'),
        },
        searchText: '需求分析',
        parentId: 'wbs-parent',
        level: 2,
        hasChildren: true,
      };

      expect(filters.status).toContain(WBSStatus.IN_PROGRESS);
      expect(filters.priority).toContain(WBSPriority.HIGH);
      expect(filters.assigneeIds).toContain('user-001');
      expect(filters.searchText).toBe('需求分析');
    });
  });

  describe('WBS 批次操作', () => {
    it('應該支援批次刪除請求', () => {
      const batchDelete: WBSBatchDeleteRequest = {
        itemIds: ['wbs-001', 'wbs-002', 'wbs-003'],
        force: false,
      };

      expect(batchDelete.itemIds).toHaveLength(3);
      expect(batchDelete.force).toBe(false);
    });

    it('應該支援批次更新請求', () => {
      const batchUpdate: WBSBatchUpdateRequest = {
        itemIds: ['wbs-001', 'wbs-002'],
        updates: {
          status: WBSStatus.IN_PROGRESS,
          priority: WBSPriority.HIGH,
          assigneeIds: ['user-001'],
        },
      };

      expect(batchUpdate.itemIds).toHaveLength(2);
      expect(batchUpdate.updates.status).toBe(WBSStatus.IN_PROGRESS);
      expect(batchUpdate.updates.priority).toBe(WBSPriority.HIGH);
    });

    it('應該支援批次移動請求', () => {
      const batchMove: WBSBatchMoveRequest = {
        itemIds: ['wbs-001', 'wbs-002'],
        targetParentId: 'wbs-parent-new',
        insertPosition: 0,
      };

      expect(batchMove.itemIds).toHaveLength(2);
      expect(batchMove.targetParentId).toBe('wbs-parent-new');
      expect(batchMove.insertPosition).toBe(0);
    });
  });

  describe('WBS 驗證功能', () => {
    it('應該支援驗證規則定義', () => {
      const validationRule: WBSValidationRule = {
        field: 'estimatedHours',
        type: 'range',
        min: 1,
        max: 1000,
        required: true,
        message: '預估工時必須在 1-1000 小時之間',
      };

      expect(validationRule.field).toBe('estimatedHours');
      expect(validationRule.type).toBe('range');
      expect(validationRule.min).toBe(1);
      expect(validationRule.max).toBe(1000);
      expect(validationRule.required).toBe(true);
    });

    it('應該支援驗證結果', () => {
      const validationResult: WBSValidationResult = {
        isValid: false,
        errors: [
          {
            field: 'name',
            message: '項目名稱不能為空',
          },
          {
            field: 'estimatedHours',
            message: '預估工時必須大於 0',
          },
        ],
      };

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(2);
      expect(validationResult.errors[0].field).toBe('name');
    });
  });

  describe('WBS 模板功能', () => {
    it('應該支援 WBS 模板定義', () => {
      const template: WBSTemplate = {
        id: 'template-001',
        name: '軟體開發標準模板',
        description: '適用於軟體開發專案的標準 WBS 模板',
        category: 'software_development',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-admin',
        isPublic: true,
        tags: ['軟體開發', '標準流程'],
      };

      expect(template.id).toBe('template-001');
      expect(template.name).toBe('軟體開發標準模板');
      expect(template.category).toBe('software_development');
      expect(template.isPublic).toBe(true);
      expect(template.tags).toContain('軟體開發');
    });
  });

  describe('WBS 統計功能', () => {
    it('應該支援統計數據結構', () => {
      const statistics: WBSStatistics = {
        totalItems: 50,
        completedItems: 20,
        inProgressItems: 15,
        pendingItems: 10,
        overdueItems: 5,
        completionRate: 40,
        totalEstimatedHours: 1000,
        totalActualHours: 600,
        averageProgress: 45,
        riskItems: 3,
      };

      expect(statistics.totalItems).toBe(50);
      expect(statistics.completedItems).toBe(20);
      expect(statistics.completionRate).toBe(40);
      expect(statistics.totalEstimatedHours).toBe(1000);
      expect(statistics.averageProgress).toBe(45);
    });
  });

  describe('WBS 資源需求', () => {
    it('應該支援資源需求定義', () => {
      const resourceReq: WBSResourceRequirement = {
        id: 'res-001',
        wbsItemId: 'wbs-001',
        resourceType: WBSResourceType.HUMAN,
        name: 'Java 高級開發工程師',
        quantity: 2,
        unit: '人',
        estimatedCost: 200000,
        actualCost: 0,
        requiredSkills: ['Java', 'Spring Boot', 'MySQL'],
        notes: '需要具備 5 年以上開發經驗',
      };

      expect(resourceReq.resourceType).toBe(WBSResourceType.HUMAN);
      expect(resourceReq.quantity).toBe(2);
      expect(resourceReq.estimatedCost).toBe(200000);
      expect(resourceReq.requiredSkills).toContain('Java');
    });
  });

  describe('WBS 風險管理', () => {
    it('應該支援風險定義', () => {
      const risk: WBSRisk = {
        id: 'risk-001',
        wbsItemId: 'wbs-001',
        title: '技術風險',
        description: '新技術學習曲線可能影響開發進度',
        probability: 0.3,
        impact: 0.8,
        riskLevel: 'medium',
        mitigation: '提前進行技術培訓和 POC 驗證',
        contingency: '尋找替代技術方案',
        owner: 'user-tech-lead',
        status: 'identified',
        identifiedAt: new Date(),
        lastReviewAt: new Date(),
      };

      expect(risk.title).toBe('技術風險');
      expect(risk.probability).toBe(0.3);
      expect(risk.impact).toBe(0.8);
      expect(risk.riskLevel).toBe('medium');
    });
  });

  describe('WBS 里程碑', () => {
    it('應該支援里程碑定義', () => {
      const milestone: WBSMilestone = {
        id: 'milestone-001',
        wbsItemId: 'wbs-001',
        name: '需求分析完成',
        description: '所有功能需求分析文檔完成並通過評審',
        targetDate: new Date('2025-02-15'),
        actualDate: undefined,
        status: 'pending',
        criteria: ['需求文檔完成', '利害關係人評審通過', '技術可行性確認'],
        dependencies: ['wbs-req-001', 'wbs-req-002'],
      };

      expect(milestone.name).toBe('需求分析完成');
      expect(milestone.status).toBe('pending');
      expect(milestone.criteria).toHaveLength(3);
      expect(milestone.dependencies).toContain('wbs-req-001');
    });
  });

  describe('WBS 依賴關係', () => {
    it('應該支援依賴關係定義', () => {
      const dependency: WBSDependency = {
        id: 'dep-001',
        predecessorId: 'wbs-001',
        successorId: 'wbs-002',
        type: 'finish_to_start',
        lagDays: 2,
        description: '需求分析完成後才能開始設計',
      };

      expect(dependency.predecessorId).toBe('wbs-001');
      expect(dependency.successorId).toBe('wbs-002');
      expect(dependency.type).toBe('finish_to_start');
      expect(dependency.lagDays).toBe(2);
    });
  });
});
