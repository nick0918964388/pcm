/**
 * @fileoverview WBS 工具函數庫
 * @version 1.0
 * @date 2025-09-01
 *
 * 提供 WBS 樹狀結構處理、編碼生成、路徑計算等工具函數
 */

import { WBSItem, WBSStatus } from '@/types/wbs';

// ==================== TYPES ====================

/**
 * 扁平化 WBS 節點
 */
export interface FlatWBSNode extends WBSItem {
  /** 層級深度 */
  level: number;
  /** 節點路徑 (從根到當前節點的 ID 路徑) */
  path: string[];
  /** 是否為葉節點 */
  isLeaf: boolean;
  /** 父節點引用 */
  parent?: WBSItem;
}

/**
 * WBS 編碼生成選項
 */
export interface WBSCodeGenerationOptions {
  /** 編碼格式 (default: 'numeric') */
  format?: 'numeric' | 'alphanumeric' | 'custom';
  /** 分隔符 (default: '.') */
  separator?: string;
  /** 起始編號 (default: 1) */
  startFrom?: number;
  /** 數字填充寬度 (default: 1) */
  padWidth?: number;
  /** 自定義編碼映射函數 */
  customMapper?: (level: number, index: number) => string;
}

/**
 * 樹結構驗證結果
 */
export interface WBSValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 錯誤列表 */
  errors: WBSValidationError[];
  /** 警告列表 */
  warnings: WBSValidationWarning[];
}

/**
 * WBS 驗證錯誤
 */
export interface WBSValidationError {
  /** 錯誤類型 */
  type:
    | 'CIRCULAR_DEPENDENCY'
    | 'INVALID_CODE'
    | 'MISSING_PARENT'
    | 'INVALID_DATE'
    | 'INVALID_ASSIGNEE';
  /** 錯誤訊息 */
  message: string;
  /** 相關節點 ID */
  nodeId: string;
  /** 嚴重程度 */
  severity: 'error' | 'warning';
}

/**
 * WBS 驗證警告
 */
export interface WBSValidationWarning extends WBSValidationError {
  /** 修復建議 */
  suggestion?: string;
}

/**
 * 路徑計算結果
 */
export interface WBSPathResult {
  /** 完整路徑 */
  fullPath: WBSItem[];
  /** 路徑名稱數組 */
  pathNames: string[];
  /** 路徑編碼數組 */
  pathCodes: string[];
  /** 路徑深度 */
  depth: number;
}

// ==================== TREE STRUCTURE UTILITIES ====================

/**
 * 將樹狀結構扁平化為一維數組
 *
 * @param tree WBS 樹狀結構
 * @param includeParentRef 是否包含父節點引用
 * @returns 扁平化的節點數組
 */
export const flattenWBSTree = (
  tree: WBSItem[],
  includeParentRef: boolean = false
): FlatWBSNode[] => {
  const result: FlatWBSNode[] = [];

  const traverse = (
    nodes: WBSItem[],
    level: number = 0,
    path: string[] = [],
    parent?: WBSItem
  ) => {
    for (const node of nodes) {
      const currentPath = [...path, node.id];
      const flatNode: FlatWBSNode = {
        ...node,
        level,
        path: currentPath,
        isLeaf: !node.children || node.children.length === 0,
        ...(includeParentRef && parent && { parent }),
      };

      result.push(flatNode);

      if (node.children && node.children.length > 0) {
        traverse(node.children, level + 1, currentPath, node);
      }
    }
  };

  traverse(tree);
  return result;
};

/**
 * 將扁平化數組重建為樹狀結構
 *
 * @param flatNodes 扁平化的節點數組
 * @returns WBS 樹狀結構
 */
export const buildWBSTreeFromFlat = (flatNodes: WBSItem[]): WBSItem[] => {
  const nodeMap = new Map<string, WBSItem>();
  const rootNodes: WBSItem[] = [];

  // 建立節點映射
  for (const node of flatNodes) {
    nodeMap.set(node.id, { ...node, children: [] });
  }

  // 建立父子關係
  for (const node of flatNodes) {
    const currentNode = nodeMap.get(node.id)!;

    if (node.parentId) {
      const parentNode = nodeMap.get(node.parentId);
      if (parentNode) {
        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(currentNode);
      }
    } else {
      rootNodes.push(currentNode);
    }
  }

  return rootNodes;
};

/**
 * 根據條件過濾樹狀結構
 *
 * @param tree WBS 樹狀結構
 * @param predicate 過濾條件函數
 * @param includeParents 是否包含符合條件節點的父節點
 * @returns 過濾後的樹狀結構
 */
export const filterWBSTree = (
  tree: WBSItem[],
  predicate: (node: WBSItem) => boolean,
  includeParents: boolean = true
): WBSItem[] => {
  const filterNode = (node: WBSItem): WBSItem | null => {
    const filteredChildren =
      node.children
        ?.map(filterNode)
        .filter((child): child is WBSItem => child !== null) || [];

    const nodeMatches = predicate(node);
    const hasMatchingChildren = filteredChildren.length > 0;

    if (nodeMatches || (includeParents && hasMatchingChildren)) {
      return {
        ...node,
        children: filteredChildren,
      };
    }

    return null;
  };

  return tree.map(filterNode).filter((node): node is WBSItem => node !== null);
};

/**
 * 查找節點在樹中的位置路徑
 *
 * @param tree WBS 樹狀結構
 * @param nodeId 要查找的節點 ID
 * @returns 路徑計算結果，如果未找到則為 null
 */
export const findWBSNodePath = (
  tree: WBSItem[],
  nodeId: string
): WBSPathResult | null => {
  const findPath = (
    nodes: WBSItem[],
    targetId: string,
    currentPath: WBSItem[] = []
  ): WBSItem[] | null => {
    for (const node of nodes) {
      const newPath = [...currentPath, node];

      if (node.id === targetId) {
        return newPath;
      }

      if (node.children && node.children.length > 0) {
        const result = findPath(node.children, targetId, newPath);
        if (result) {
          return result;
        }
      }
    }

    return null;
  };

  const fullPath = findPath(tree, nodeId);

  if (!fullPath) {
    return null;
  }

  return {
    fullPath,
    pathNames: fullPath.map(node => node.name),
    pathCodes: fullPath.map(node => node.code || ''),
    depth: fullPath.length,
  };
};

// ==================== WBS CODE GENERATION ====================

/**
 * 為 WBS 節點生成編碼
 *
 * @param tree WBS 樹狀結構
 * @param options 編碼生成選項
 * @returns 更新編碼後的樹狀結構
 */
export const generateWBSCodes = (
  tree: WBSItem[],
  options: WBSCodeGenerationOptions = {}
): WBSItem[] => {
  const {
    format = 'numeric',
    separator = '.',
    startFrom = 1,
    padWidth = 1,
    customMapper,
  } = options;

  const generateCode = (
    level: number,
    index: number,
    parentCode?: string
  ): string => {
    let levelCode: string;

    if (customMapper) {
      levelCode = customMapper(level, index);
    } else {
      switch (format) {
        case 'alphanumeric':
          levelCode =
            index < 26 ? String.fromCharCode(65 + index) : `A${index - 25}`;
          break;
        case 'numeric':
        default:
          levelCode = (startFrom + index).toString().padStart(padWidth, '0');
          break;
      }
    }

    return parentCode ? `${parentCode}${separator}${levelCode}` : levelCode;
  };

  const processNodes = (
    nodes: WBSItem[],
    level: number = 0,
    parentCode?: string
  ): WBSItem[] => {
    return nodes.map((node, index) => ({
      ...node,
      code: generateCode(level, index, parentCode),
      children: node.children
        ? processNodes(
            node.children,
            level + 1,
            generateCode(level, index, parentCode)
          )
        : [],
    }));
  };

  return processNodes(tree);
};

/**
 * 重新排序並更新 WBS 編碼
 *
 * @param tree WBS 樹狀結構
 * @param options 編碼生成選項
 * @returns 重新排序並更新編碼的樹狀結構
 */
export const reorderAndUpdateWBSCodes = (
  tree: WBSItem[],
  options: WBSCodeGenerationOptions = {}
): WBSItem[] => {
  // 先按現有順序排序，然後重新生成編碼
  const sortedTree = [...tree].sort((a, b) => (a.order || 0) - (b.order || 0));
  return generateWBSCodes(sortedTree, options);
};

// ==================== VALIDATION UTILITIES ====================

/**
 * 檢查 WBS 樹的循環依賴
 *
 * @param tree WBS 樹狀結構
 * @returns 循環依賴檢查結果
 */
export const checkCircularDependencies = (
  tree: WBSItem[]
): WBSValidationError[] => {
  const errors: WBSValidationError[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const checkNode = (node: WBSItem, path: string[] = []): void => {
    if (visiting.has(node.id)) {
      errors.push({
        type: 'CIRCULAR_DEPENDENCY',
        message: `檢測到循環依賴: ${[...path, node.id].join(' -> ')}`,
        nodeId: node.id,
        severity: 'error',
      });
      return;
    }

    if (visited.has(node.id)) {
      return;
    }

    visiting.add(node.id);

    // 檢查前置任務依賴
    if (node.dependencies) {
      for (const depId of node.dependencies) {
        if (path.includes(depId)) {
          errors.push({
            type: 'CIRCULAR_DEPENDENCY',
            message: `檢測到前置任務循環依賴: ${node.id} -> ${depId}`,
            nodeId: node.id,
            severity: 'error',
          });
        }
      }
    }

    // 遞歸檢查子節點
    if (node.children) {
      for (const child of node.children) {
        checkNode(child, [...path, node.id]);
      }
    }

    visiting.delete(node.id);
    visited.add(node.id);
  };

  for (const node of tree) {
    checkNode(node);
  }

  return errors;
};

/**
 * 驗證 WBS 編碼格式
 *
 * @param tree WBS 樹狀結構
 * @param codePattern 編碼格式正則表達式
 * @returns 編碼格式驗證錯誤
 */
export const validateWBSCodes = (
  tree: WBSItem[],
  codePattern: RegExp = /^[\d.]+$/
): WBSValidationError[] => {
  const errors: WBSValidationError[] = [];
  const codeSet = new Set<string>();

  const validateNode = (node: WBSItem): void => {
    if (!node.code) {
      errors.push({
        type: 'INVALID_CODE',
        message: `節點缺少 WBS 編碼`,
        nodeId: node.id,
        severity: 'error',
      });
    } else {
      if (!codePattern.test(node.code)) {
        errors.push({
          type: 'INVALID_CODE',
          message: `WBS 編碼格式無效: ${node.code}`,
          nodeId: node.id,
          severity: 'error',
        });
      }

      if (codeSet.has(node.code)) {
        errors.push({
          type: 'INVALID_CODE',
          message: `重複的 WBS 編碼: ${node.code}`,
          nodeId: node.id,
          severity: 'error',
        });
      } else {
        codeSet.add(node.code);
      }
    }

    if (node.children) {
      for (const child of node.children) {
        validateNode(child);
      }
    }
  };

  for (const node of tree) {
    validateNode(node);
  }

  return errors;
};

/**
 * 驗證日期邏輯
 *
 * @param tree WBS 樹狀結構
 * @returns 日期邏輯驗證錯誤
 */
export const validateWBSDates = (tree: WBSItem[]): WBSValidationError[] => {
  const errors: WBSValidationError[] = [];

  const validateNode = (node: WBSItem): void => {
    // 檢查起止日期邏輯
    if (node.startDate && node.endDate) {
      const start = new Date(node.startDate);
      const end = new Date(node.endDate);

      if (start > end) {
        errors.push({
          type: 'INVALID_DATE',
          message: `起始日期不能晚於結束日期`,
          nodeId: node.id,
          severity: 'error',
        });
      }
    }

    // 檢查子節點日期與父節點的關係
    if (node.children) {
      for (const child of node.children) {
        if (node.startDate && child.startDate) {
          const parentStart = new Date(node.startDate);
          const childStart = new Date(child.startDate);

          if (childStart < parentStart) {
            errors.push({
              type: 'INVALID_DATE',
              message: `子任務起始日期不能早於父任務`,
              nodeId: child.id,
              severity: 'warning',
            });
          }
        }

        if (node.endDate && child.endDate) {
          const parentEnd = new Date(node.endDate);
          const childEnd = new Date(child.endDate);

          if (childEnd > parentEnd) {
            errors.push({
              type: 'INVALID_DATE',
              message: `子任務結束日期不能晚於父任務`,
              nodeId: child.id,
              severity: 'warning',
            });
          }
        }

        validateNode(child);
      }
    }
  };

  for (const node of tree) {
    validateNode(node);
  }

  return errors;
};

/**
 * 完整的 WBS 樹驗證
 *
 * @param tree WBS 樹狀結構
 * @returns 完整的驗證結果
 */
export const validateWBSTree = (tree: WBSItem[]): WBSValidationResult => {
  const errors: WBSValidationError[] = [];
  const warnings: WBSValidationWarning[] = [];

  // 檢查循環依賴
  errors.push(...checkCircularDependencies(tree));

  // 檢查編碼格式
  errors.push(...validateWBSCodes(tree));

  // 檢查日期邏輯
  const dateErrors = validateWBSDates(tree);
  errors.push(...dateErrors.filter(e => e.severity === 'error'));
  warnings.push(
    ...(dateErrors.filter(
      e => e.severity === 'warning'
    ) as WBSValidationWarning[])
  );

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// ==================== SEARCH AND FILTER UTILITIES ====================

/**
 * 在 WBS 樹中搜索節點
 *
 * @param tree WBS 樹狀結構
 * @param searchTerm 搜索關鍵詞
 * @param searchFields 搜索欄位
 * @returns 搜索結果節點數組
 */
export const searchWBSNodes = (
  tree: WBSItem[],
  searchTerm: string,
  searchFields: (keyof WBSItem)[] = ['name', 'description', 'code']
): WBSItem[] => {
  if (!searchTerm.trim()) {
    return [];
  }

  const results: WBSItem[] = [];
  const term = searchTerm.toLowerCase();

  const searchNode = (node: WBSItem): void => {
    const matches = searchFields.some(field => {
      const value = node[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(term);
      }
      return false;
    });

    if (matches) {
      results.push(node);
    }

    if (node.children) {
      for (const child of node.children) {
        searchNode(child);
      }
    }
  };

  for (const node of tree) {
    searchNode(node);
  }

  return results;
};

/**
 * 統計 WBS 樹的信息
 *
 * @param tree WBS 樹狀結構
 * @returns 統計信息
 */
export const getWBSTreeStats = (tree: WBSItem[]) => {
  let totalNodes = 0;
  let maxDepth = 0;
  const statusCounts: Record<WBSStatus, number> = {
    [WBSStatus.NOT_STARTED]: 0,
    [WBSStatus.IN_PROGRESS]: 0,
    [WBSStatus.COMPLETED]: 0,
    [WBSStatus.CANCELLED]: 0,
    [WBSStatus.ON_HOLD]: 0,
  };

  const traverse = (nodes: WBSItem[], depth: number = 1): void => {
    maxDepth = Math.max(maxDepth, depth);

    for (const node of nodes) {
      totalNodes++;
      statusCounts[node.status as WBSStatus]++;

      if (node.children && node.children.length > 0) {
        traverse(node.children, depth + 1);
      }
    }
  };

  traverse(tree);

  return {
    totalNodes,
    maxDepth,
    statusCounts,
    completionRate:
      totalNodes > 0
        ? Math.round((statusCounts[WBSStatus.COMPLETED] / totalNodes) * 100)
        : 0,
  };
};

// ==================== EXPORTS ====================

export type {
  FlatWBSNode,
  WBSCodeGenerationOptions,
  WBSValidationResult,
  WBSValidationError,
  WBSValidationWarning,
  WBSPathResult,
};
