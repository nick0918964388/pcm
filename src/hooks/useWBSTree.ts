/**
 * @fileoverview WBS 樹狀結構管理相關 hooks
 * @version 1.0
 * @date 2025-09-01
 *
 * 提供 WBS 樹狀結構的載入、管理、操作等功能，
 * 整合 React Query 進行快取和狀態管理。
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
} from '@tanstack/react-query';
import { useCallback, useState, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import {
  WBSItem,
  WBSFilters,
  WBSTreeOperations,
  WBSStatistics,
} from '@/types/wbs';
import {
  ProjectStaffWBSApiService,
  WBSQueryOptions,
  WBSResponse,
  BatchUpdateWBSRequest,
} from '@/services/projectStaffWbsApi';
import { useProjectScopeStore } from '@/store/projectScopeStore';

// ==================== ADDITIONAL TYPES ====================

/**
 * WBS 樹狀查詢選項
 */
export interface WBSTreeQueryOptions extends WBSQueryOptions {
  /** 是否啟用查詢 */
  enabled?: boolean;
  /** 是否延遲載入 */
  lazy?: boolean;
}

/**
 * WBS 節點操作選項
 */
export interface WBSNodeOperationOptions {
  /** 是否樂觀更新 */
  optimistic?: boolean;
  /** 操作完成回調 */
  onSuccess?: (data?: any) => void;
  /** 操作失敗回調 */
  onError?: (error: Error) => void;
}

/**
 * WBS 樹狀操作結果
 */
export interface WBSTreeOperationResult<T = any> {
  /** 操作結果資料 */
  data: T;
  /** 受影響的節點 ID 列表 */
  affectedNodeIds: string[];
  /** 操作後的樹狀結構版本 */
  treeVersion: number;
}

// ==================== HOOKS ====================

/**
 * WBS 樹狀結構查詢 Hook
 *
 * @param projectId 專案 ID
 * @param options 查詢選項
 * @returns WBS 樹狀查詢結果
 */
export const useWBSTreeQuery = (
  projectId: string,
  options: WBSTreeQueryOptions = {}
): UseQueryResult<WBSItem[], Error> => {
  const {
    filters,
    includeCompleted = true,
    maxDepth,
    sortBy,
    sortOrder,
    enabled = true,
    lazy = false,
  } = options;

  const apiService = useMemo(() => new ProjectStaffWBSApiService(), []);

  return useQuery({
    queryKey: [
      'wbsTree',
      projectId,
      { filters, includeCompleted, maxDepth, sortBy, sortOrder },
    ],
    queryFn: async () => {
      const queryOptions = {
        ...(filters && { filters }),
        includeCompleted,
        ...(maxDepth && { maxDepth }),
        ...(sortBy && { sortBy }),
        ...(sortOrder && { sortOrder }),
      };

      const result = await apiService.getWBSTree(projectId, queryOptions);
      return result.data || [];
    },
    enabled: enabled && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 分鐘
    gcTime: 15 * 60 * 1000, // 15 分鐘
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if ((error as any)?.status >= 400 && (error as any)?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    // 延遲載入時初始為空數據
    initialData: lazy ? [] : undefined,
    // 延遲載入時禁用初始查詢
    refetchOnMount: !lazy,
  });
};

/**
 * WBS 節點操作 Hook
 *
 * @param projectId 專案 ID
 * @returns WBS 節點操作方法
 */
export const useWBSOperations = (projectId: string) => {
  const queryClient = useQueryClient();
  const apiService = useMemo(() => new ProjectStaffWBSApiService(), []);

  // 創建節點 Mutation
  const createNodeMutation = useMutation({
    mutationFn: async (nodeData: Partial<WBSItem>) => {
      const result = await apiService.createWBSNode(projectId, nodeData);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbsTree', projectId] });
      queryClient.invalidateQueries({ queryKey: ['wbsStatistics', projectId] });
    },
  });

  // 更新節點 Mutation
  const updateNodeMutation = useMutation({
    mutationFn: async ({
      nodeId,
      nodeData,
    }: {
      nodeId: string;
      nodeData: Partial<WBSItem>;
    }) => {
      const result = await apiService.updateWBSNode(
        projectId,
        nodeId,
        nodeData
      );
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbsTree', projectId] });
      queryClient.invalidateQueries({ queryKey: ['wbsStatistics', projectId] });
    },
  });

  // 刪除節點 Mutation
  const deleteNodeMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      await apiService.deleteWBSNode(projectId, nodeId);
      return nodeId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbsTree', projectId] });
      queryClient.invalidateQueries({ queryKey: ['wbsStatistics', projectId] });
    },
  });

  // 移動節點 Mutation
  const moveNodeMutation = useMutation({
    mutationFn: async ({
      nodeId,
      newParentId,
      newIndex,
    }: {
      nodeId: string;
      newParentId?: string;
      newIndex: number;
    }) => {
      const result = await apiService.moveWBSNode(projectId, nodeId, {
        parentId: newParentId,
        index: newIndex,
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbsTree', projectId] });
    },
  });

  // 批量更新 Mutation
  const batchUpdateMutation = useMutation({
    mutationFn: async (request: BatchUpdateWBSRequest) => {
      const result = await apiService.batchUpdateWBSNodes(projectId, request);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbsTree', projectId] });
      queryClient.invalidateQueries({ queryKey: ['wbsStatistics', projectId] });
    },
  });

  // 操作方法
  const createNode = useCallback(
    async (
      nodeData: Partial<WBSItem>,
      options: WBSNodeOperationOptions = {}
    ) => {
      try {
        const result = await createNodeMutation.mutateAsync(nodeData);
        options.onSuccess?.(result);
        return result;
      } catch (error) {
        options.onError?.(error as Error);
        throw error;
      }
    },
    [createNodeMutation]
  );

  const updateNode = useCallback(
    async (
      nodeId: string,
      nodeData: Partial<WBSItem>,
      options: WBSNodeOperationOptions = {}
    ) => {
      try {
        const result = await updateNodeMutation.mutateAsync({
          nodeId,
          nodeData,
        });
        options.onSuccess?.(result);
        return result;
      } catch (error) {
        options.onError?.(error as Error);
        throw error;
      }
    },
    [updateNodeMutation]
  );

  const deleteNode = useCallback(
    async (nodeId: string, options: WBSNodeOperationOptions = {}) => {
      try {
        await deleteNodeMutation.mutateAsync(nodeId);
        options.onSuccess?.();
      } catch (error) {
        options.onError?.(error as Error);
        throw error;
      }
    },
    [deleteNodeMutation]
  );

  const moveNode = useCallback(
    async (
      nodeId: string,
      newParentId: string | undefined,
      newIndex: number,
      options: WBSNodeOperationOptions = {}
    ) => {
      try {
        const result = await moveNodeMutation.mutateAsync({
          nodeId,
          newParentId,
          newIndex,
        });
        options.onSuccess?.(result);
        return result;
      } catch (error) {
        options.onError?.(error as Error);
        throw error;
      }
    },
    [moveNodeMutation]
  );

  const batchUpdate = useCallback(
    async (
      request: BatchUpdateWBSRequest,
      options: WBSNodeOperationOptions = {}
    ) => {
      try {
        const result = await batchUpdateMutation.mutateAsync(request);
        options.onSuccess?.(result);
        return result;
      } catch (error) {
        options.onError?.(error as Error);
        throw error;
      }
    },
    [batchUpdateMutation]
  );

  return {
    // 操作方法
    createNode,
    updateNode,
    deleteNode,
    moveNode,
    batchUpdate,

    // Mutation 狀態
    creating: createNodeMutation.isPending,
    updating: updateNodeMutation.isPending,
    deleting: deleteNodeMutation.isPending,
    moving: moveNodeMutation.isPending,
    batchUpdating: batchUpdateMutation.isPending,

    // 錯誤狀態
    createError: createNodeMutation.error,
    updateError: updateNodeMutation.error,
    deleteError: deleteNodeMutation.error,
    moveError: moveNodeMutation.error,
    batchUpdateError: batchUpdateMutation.error,
  };
};

/**
 * WBS 統計資料 Hook
 *
 * @param projectId 專案 ID
 * @param enabled 是否啟用查詢
 * @returns WBS 統計資料查詢結果
 */
export const useWBSStatistics = (
  projectId: string,
  enabled: boolean = true
): UseQueryResult<WBSStatistics, Error> => {
  const apiService = useMemo(() => new ProjectStaffWBSApiService(), []);

  return useQuery({
    queryKey: ['wbsStatistics', projectId],
    queryFn: async () => {
      const result = await apiService.getWBSStatistics(projectId);
      return result.data;
    },
    enabled: enabled && !!projectId,
    staleTime: 10 * 60 * 1000, // 10 分鐘
    gcTime: 30 * 60 * 1000, // 30 分鐘
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

/**
 * WBS 樹狀結構管理 Hook (整合 Store)
 *
 * @param projectId 專案 ID
 * @returns WBS 樹狀結構管理功能
 */
export const useWBSTreeManager = (projectId: string) => {
  const wbsState = useProjectScopeStore(state => state.wbsManagement);
  const wbsActions = useProjectScopeStore(state => ({
    loadTree: state.loadWBSTree,
    toggleNode: state.toggleWBSNode,
    selectNode: state.selectWBSNode,
    startDrag: state.startWBSDrag,
    setDropTarget: state.setWBSDropTarget,
    endDrag: state.endWBSDrag,
    applyFilters: state.applyWBSFilters,
    clearFilters: state.clearWBSFilters,
    loadStatistics: state.loadWBSStatistics,
    setViewMode: state.setWBSViewMode,
    toggleShowCompleted: state.toggleWBSShowCompleted,
    toggleFilterPanel: state.toggleWBSFilterPanel,
    setLoading: state.setWBSLoading,
    setError: state.setWBSError,
  }));

  // 查詢 WBS 樹
  const treeQuery = useWBSTreeQuery(projectId, {
    filters: wbsState.currentFilters,
    includeCompleted: wbsState.viewState.showCompleted,
  });

  // WBS 統計
  const statisticsQuery = useWBSStatistics(projectId);

  // WBS 操作
  const operations = useWBSOperations(projectId);

  // 同步查詢結果到 Store
  useMemo(() => {
    if (treeQuery.data) {
      wbsActions.loadTree(treeQuery.data);
    }
  }, [treeQuery.data, wbsActions.loadTree]);

  useMemo(() => {
    if (statisticsQuery.data) {
      wbsActions.loadStatistics(statisticsQuery.data);
    }
  }, [statisticsQuery.data, wbsActions.loadStatistics]);

  useMemo(() => {
    wbsActions.setLoading(treeQuery.isLoading || statisticsQuery.isLoading);
  }, [treeQuery.isLoading, statisticsQuery.isLoading, wbsActions.setLoading]);

  useMemo(() => {
    const error = treeQuery.error || statisticsQuery.error;
    wbsActions.setError(error?.message || null);
  }, [treeQuery.error, statisticsQuery.error, wbsActions.setError]);

  return {
    // 狀態
    treeData: wbsState.treeData,
    expandedNodes: wbsState.expandedNodes,
    selectedNodes: wbsState.selectedNodes,
    dragState: wbsState.dragState,
    viewState: wbsState.viewState,
    filters: wbsState.currentFilters,
    statistics: wbsState.statistics,
    loading: wbsState.loading,
    error: wbsState.error,

    // 查詢狀態
    isLoading: treeQuery.isLoading,
    isError: treeQuery.isError,

    // 操作方法
    ...operations,
    ...wbsActions,

    // 刷新方法
    refetch: treeQuery.refetch,
    refetchStatistics: statisticsQuery.refetch,
  };
};

// ==================== UTILITIES ====================

/**
 * 獲取 WBS 樹狀查詢鍵
 *
 * @param projectId 專案 ID
 * @param options 查詢選項
 * @returns 查詢鍵
 */
export const getWBSTreeQueryKey = (
  projectId: string,
  options: WBSTreeQueryOptions = {}
) => {
  const {
    filters,
    includeCompleted = true,
    maxDepth,
    sortBy,
    sortOrder,
  } = options;
  return [
    'wbsTree',
    projectId,
    { filters, includeCompleted, maxDepth, sortBy, sortOrder },
  ];
};

/**
 * 使 WBS 查詢無效
 *
 * @param queryClient QueryClient 實例
 * @param projectId 專案 ID
 */
export const invalidateWBSQueries = (queryClient: any, projectId?: string) => {
  if (projectId) {
    queryClient.invalidateQueries({
      queryKey: ['wbsTree', projectId],
    });
    queryClient.invalidateQueries({
      queryKey: ['wbsStatistics', projectId],
    });
  } else {
    queryClient.invalidateQueries({
      queryKey: ['wbsTree'],
    });
    queryClient.invalidateQueries({
      queryKey: ['wbsStatistics'],
    });
  }
};

// ==================== EXPORTS ====================

export type {
  WBSTreeQueryOptions,
  WBSNodeOperationOptions,
  WBSTreeOperationResult,
};
