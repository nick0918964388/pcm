/**
 * @fileoverview 專案人員查詢相關 React Query Hooks
 * @version 2.0
 * @date 2025-09-01
 *
 * 提供專案人員管理的完整 API 整合功能，包括：
 * - 分頁查詢專案人員列表
 * - 搜索和篩選功能
 * - 專案人員統計資訊
 * - 專案人員詳細資訊查詢
 * - 批量操作功能
 * - 專案人員變更管理
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
} from '@tanstack/react-query';
import { useCallback, useState, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { useProjectScopeStore } from '@/store/projectScopeStore';
import {
  ProjectMember,
  ProjectMemberExtended,
  ProjectMemberFilters,
  ProjectMemberQueryResult,
  ProjectMemberSearchParams,
  CreateProjectMemberRequest,
  UpdateProjectMemberRequest,
  BulkMemberOperationRequest,
  WorkStatus,
} from '@/types/project';
import {
  ProjectStaffWBSApiService,
  ProjectMemberQueryOptions,
  SearchSuggestion,
  ProjectMemberStats,
  StaffApiResponse,
} from '@/services/projectStaffWbsApi';

// ==================== ADDITIONAL TYPES ====================

/**
 * 專案人員查詢選項（擴展 API 選項）
 */
export interface ProjectMembersQueryOptions extends ProjectMemberQueryOptions {
  /** 是否啟用查詢 */
  enabled?: boolean;
}

/**
 * 搜索選項
 */
export interface SearchOptions {
  /** 防抖延遲時間（毫秒） */
  debounceMs?: number;
  /** 最小搜索字符數 */
  minLength?: number;
}

// ==================== HOOKS ====================

/**
 * 專案人員查詢 Hook
 *
 * @param projectId 專案 ID
 * @param options 查詢選項
 * @returns 查詢結果
 */
export const useProjectMembersQuery = (
  projectId: string,
  options: ProjectMembersQueryOptions = {}
): UseQueryResult<ProjectMemberQueryResult, Error> => {
  const {
    page = 1,
    pageSize = 10,
    filters,
    sortBy,
    sortOrder,
    enabled = true,
  } = options;

  const apiService = useMemo(() => new ProjectStaffWBSApiService(), []);

  return useQuery({
    queryKey: [
      'projectMembers',
      projectId,
      { page, pageSize, filters, sortBy, sortOrder },
    ],
    queryFn: async () => {
      const queryOptions = {
        page,
        pageSize,
        ...(filters && { filters }),
        ...(sortBy && { sortBy }),
        ...(sortOrder && { sortOrder }),
      };

      return await apiService.queryProjectMembers(projectId, queryOptions);
    },
    enabled: enabled && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 分鐘
    gcTime: 10 * 60 * 1000, // 10 分鐘
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // 對於 4xx 錯誤不重試，對於其他錯誤最多重試 2 次
      if ((error as any)?.status >= 400 && (error as any)?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * 專案人員搜索建議 Hook
 *
 * @param projectId 專案 ID
 * @param options 搜索選項
 * @returns 搜索功能
 */
export const useProjectMemberSearch = (
  projectId: string,
  options: SearchOptions = {}
) => {
  const { debounceMs = 300, minLength = 1 } = options;

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [debouncedQuery] = useDebounce(searchQuery, debounceMs);

  const apiService = useMemo(() => new ProjectStaffWBSApiService(), []);

  // 執行搜索
  const performSearch = useCallback(
    async (query: string) => {
      if (!query || query.length < minLength) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await apiService.searchProjectMembers(projectId, query);
        setSuggestions(result.data || []);
      } catch (err) {
        setError(err as Error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [apiService, projectId, minLength]
  );

  // 當防抖查詢改變時執行搜索
  useMemo(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  // 搜索函數
  const search = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // 清除搜索
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSuggestions([]);
    setError(null);
  }, []);

  return {
    /** 搜索查詢 */
    query: searchQuery,
    /** 搜索建議 */
    suggestions,
    /** 是否載入中 */
    isLoading,
    /** 錯誤資訊 */
    error,
    /** 執行搜索 */
    search,
    /** 清除搜索 */
    clearSearch,
  };
};

/**
 * 專案人員統計資料 Hook
 *
 * @param projectId 專案 ID
 * @param enabled 是否啟用查詢
 * @returns 統計資料查詢結果
 */
export const useProjectMemberStats = (
  projectId: string,
  enabled: boolean = true
): UseQueryResult<ProjectMemberStats, Error> => {
  const apiService = useMemo(() => new ProjectStaffWBSApiService(), []);

  return useQuery({
    queryKey: ['projectMemberStats', projectId],
    queryFn: async () => {
      const result = await apiService.getProjectMemberStats(projectId);
      return result.data;
    },
    enabled: enabled && !!projectId,
    staleTime: 10 * 60 * 1000, // 10 分鐘
    gcTime: 30 * 60 * 1000, // 30 分鐘
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

// ==================== UTILITIES ====================

/**
 * 獲取專案人員查詢鍵
 *
 * @param projectId 專案 ID
 * @param options 查詢選項
 * @returns 查詢鍵
 */
export const getProjectMembersQueryKey = (
  projectId: string,
  options: ProjectMembersQueryOptions = {}
) => {
  const { page = 1, pageSize = 10, filters, sortBy, sortOrder } = options;
  return [
    'projectMembers',
    projectId,
    { page, pageSize, filters, sortBy, sortOrder },
  ];
};

/**
 * 預填充專案人員查詢快取
 *
 * @param queryClient QueryClient 實例
 * @param projectId 專案 ID
 * @param data 要快取的資料
 * @param options 查詢選項
 */
export const prefetchProjectMembers = (
  queryClient: any,
  projectId: string,
  data: ProjectMemberQueryResult,
  options: ProjectMembersQueryOptions = {}
) => {
  const queryKey = getProjectMembersQueryKey(projectId, options);
  queryClient.setQueryData(queryKey, data);
};

/**
 * 使查詢無效
 *
 * @param queryClient QueryClient 實例
 * @param projectId 專案 ID
 */
export const invalidateProjectMembersQuery = (
  queryClient: any,
  projectId?: string
) => {
  if (projectId) {
    queryClient.invalidateQueries({
      queryKey: ['projectMembers', projectId],
    });
    queryClient.invalidateQueries({
      queryKey: ['projectMemberStats', projectId],
    });
  } else {
    queryClient.invalidateQueries({
      queryKey: ['projectMembers'],
    });
    queryClient.invalidateQueries({
      queryKey: ['projectMemberStats'],
    });
  }
};

// ==================== ENHANCED HOOKS (TASK-2.1) ====================

// Query Keys for better cache management
export const projectMembersKeys = {
  all: ['projectMembers'] as const,
  lists: () => [...projectMembersKeys.all, 'list'] as const,
  list: (projectId: string, params: ProjectMemberSearchParams) =>
    [...projectMembersKeys.lists(), projectId, params] as const,
  details: () => [...projectMembersKeys.all, 'detail'] as const,
  detail: (projectId: string, memberId: string) =>
    [...projectMembersKeys.details(), projectId, memberId] as const,
  stats: (projectId: string) =>
    [...projectMembersKeys.all, 'stats', projectId] as const,
  search: (projectId: string, query: string) =>
    [...projectMembersKeys.all, 'search', projectId, query] as const,
};

/**
 * 增強版專案人員查詢 Hook - 支援更多篩選和排序選項
 */
export function useProjectMembersQueryEnhanced(
  projectId: string,
  params: ProjectMemberSearchParams = {},
  options?: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
  }
) {
  const {
    page = 1,
    pageSize = 20,
    sortBy = 'joinDate',
    sortOrder = 'desc',
    ...filterParams
  } = params;

  return useQuery({
    queryKey: projectMembersKeys.list(projectId, params),
    queryFn: async () => {
      const apiService = new ProjectStaffWBSApiService();
      return await apiService.getProjectMembers(projectId, params);
    },
    enabled: !!projectId && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 分鐘
    gcTime: options?.cacheTime ?? 10 * 60 * 1000, // 10 分鐘
    select: data => ({
      ...data,
      members: data.members || [],
      pagination: {
        page,
        pageSize,
        total: data.pagination?.total || 0,
        totalPages: Math.ceil((data.pagination?.total || 0) / pageSize),
      },
    }),
  });
}

/**
 * 增強版專案人員搜索 Hook - 支援實時搜索建議
 */
export function useProjectMemberSearchEnhanced(
  projectId: string,
  searchQuery: string,
  options?: {
    enabled?: boolean;
    debounceMs?: number;
  }
) {
  const enabled =
    !!projectId &&
    !!searchQuery &&
    searchQuery.length >= 2 &&
    (options?.enabled ?? true);

  return useQuery({
    queryKey: projectMembersKeys.search(projectId, searchQuery),
    queryFn: async () => {
      const apiService = new ProjectStaffWBSApiService();
      return await apiService.searchProjectMembers(projectId, searchQuery);
    },
    enabled,
    staleTime: 30 * 1000, // 30 秒
    gcTime: 2 * 60 * 1000, // 2 分鐘
  });
}

/**
 * 專案人員詳細資訊 Hook
 */
export function useProjectMemberDetail(
  projectId: string,
  memberId: string,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: projectMembersKeys.detail(projectId, memberId),
    queryFn: async () => {
      const apiService = new ProjectStaffWBSApiService();
      return await apiService.getProjectMemberDetail(projectId, memberId);
    },
    enabled: !!projectId && !!memberId && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000, // 5 分鐘
    gcTime: 10 * 60 * 1000, // 10 分鐘
  });
}

/**
 * 新增專案成員 Hook
 */
export function useCreateProjectMember(projectId: string) {
  const queryClient = useQueryClient();
  const store = useProjectScopeStore();

  return useMutation({
    mutationFn: async (data: CreateProjectMemberRequest) => {
      const apiService = new ProjectStaffWBSApiService();
      return await apiService.createProjectMember(projectId, data);
    },
    onMutate: async newMember => {
      // 樂觀更新：取消相關查詢
      await queryClient.cancelQueries({
        queryKey: projectMembersKeys.lists(),
      });

      // 獲取當前成員列表快照
      const previousMembers = queryClient.getQueryData(
        projectMembersKeys.list(projectId, {})
      );

      return { previousMembers };
    },
    onSuccess: (newMember, variables) => {
      // 更新所有相關查詢
      queryClient.invalidateQueries({
        queryKey: projectMembersKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: projectMembersKeys.stats(projectId),
      });

      // TODO: 更新 Zustand store
      // store.updateMemberCache?.(projectId, newMember.id, newMember)
      // store.invalidateProjectMembers?.(projectId)
    },
    onError: (error, variables, context) => {
      // 發生錯誤時回滾樂觀更新
      if (context?.previousMembers) {
        queryClient.setQueryData(
          projectMembersKeys.list(projectId, {}),
          context.previousMembers
        );
      }
    },
  });
}

/**
 * 更新專案成員 Hook
 */
export function useUpdateProjectMember(projectId: string) {
  const queryClient = useQueryClient();
  const store = useProjectScopeStore();

  return useMutation({
    mutationFn: async ({
      memberId,
      data,
    }: {
      memberId: string;
      data: UpdateProjectMemberRequest;
    }) => {
      const apiService = new ProjectStaffWBSApiService();
      return await apiService.updateProjectMember(projectId, memberId, data);
    },
    onMutate: async ({ memberId, data }) => {
      // 樂觀更新成員詳情
      await queryClient.cancelQueries({
        queryKey: projectMembersKeys.detail(projectId, memberId),
      });

      const previousMember = queryClient.getQueryData(
        projectMembersKeys.detail(projectId, memberId)
      );

      // 樂觀更新
      if (previousMember) {
        queryClient.setQueryData(
          projectMembersKeys.detail(projectId, memberId),
          { ...previousMember, ...data }
        );
      }

      return { previousMember };
    },
    onSuccess: (updatedMember, { memberId }) => {
      // 更新所有相關查詢
      queryClient.setQueryData(
        projectMembersKeys.detail(projectId, memberId),
        updatedMember
      );
      queryClient.invalidateQueries({
        queryKey: projectMembersKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: projectMembersKeys.stats(projectId),
      });

      // TODO: 更新 Zustand store
      // store.updateMemberCache?.(projectId, memberId, updatedMember)
      // store.invalidateProjectMembers?.(projectId)
    },
    onError: (error, { memberId }, context) => {
      // 回滾樂觀更新
      if (context?.previousMember) {
        queryClient.setQueryData(
          projectMembersKeys.detail(projectId, memberId),
          context.previousMember
        );
      }
    },
  });
}

/**
 * 刪除專案成員 Hook
 */
export function useDeleteProjectMember(projectId: string) {
  const queryClient = useQueryClient();
  const store = useProjectScopeStore();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const apiService = new ProjectStaffWBSApiService();
      return await apiService.deleteProjectMember(projectId, memberId);
    },
    onSuccess: (_, memberId) => {
      // 移除相關快取
      queryClient.removeQueries({
        queryKey: projectMembersKeys.detail(projectId, memberId),
      });
      queryClient.invalidateQueries({
        queryKey: projectMembersKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: projectMembersKeys.stats(projectId),
      });

      // TODO: 更新 Zustand store
      // store.removeMemberFromCache?.(projectId, memberId)
      // store.invalidateProjectMembers?.(projectId)
    },
  });
}

/**
 * 專案成員批量操作 Hook
 */
export function useProjectMemberBulkOperations(projectId: string) {
  const queryClient = useQueryClient();
  const store = useProjectScopeStore();

  return useMutation({
    mutationFn: async (request: BulkMemberOperationRequest) => {
      const apiService = new ProjectStaffWBSApiService();
      return await apiService.bulkOperateProjectMembers(projectId, request);
    },
    onSuccess: () => {
      // 批量操作後清除所有相關快取
      queryClient.invalidateQueries({
        queryKey: projectMembersKeys.all,
      });
      // TODO: 更新 Zustand store
      // store.invalidateProjectMembers?.(projectId)
    },
  });
}

/**
 * 專案成員角色統計 Hook
 */
export function useProjectMemberRoleStats(projectId: string) {
  return useQuery({
    queryKey: [...projectMembersKeys.stats(projectId), 'roles'],
    queryFn: async () => {
      const apiService = new ProjectStaffWBSApiService();
      return await apiService.getProjectMemberRoleStats(projectId);
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 分鐘
    select: data => {
      // 處理角色統計資料，確保有預設值
      const defaultRoles = [
        'PROJECT_MANAGER',
        'SENIOR_ENGINEER',
        'ENGINEER',
        'COORDINATOR',
        'ADMIN_STAFF',
        'SITE_SUPERVISOR',
        'QA_ENGINEER',
      ];

      const roleStats = defaultRoles.map(role => ({
        role,
        count: data?.find((item: any) => item.role === role)?.count || 0,
        percentage: 0,
      }));

      const total = roleStats.reduce((sum, item) => sum + item.count, 0);

      return roleStats.map(item => ({
        ...item,
        percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
      }));
    },
  });
}

/**
 * 整合所有專案人員相關 Hook 的組合 Hook
 */
export function useProjectMembersIntegration(
  projectId: string,
  initialParams: ProjectMemberSearchParams = {}
) {
  const membersQuery = useProjectMembersQueryEnhanced(projectId, initialParams);
  const statsQuery = useProjectMemberStats(projectId);
  const roleStatsQuery = useProjectMemberRoleStats(projectId);

  const createMutation = useCreateProjectMember(projectId);
  const updateMutation = useUpdateProjectMember(projectId);
  const deleteMutation = useDeleteProjectMember(projectId);
  const bulkMutation = useProjectMemberBulkOperations(projectId);

  return {
    // 查詢
    members: membersQuery.data?.members || [],
    pagination: membersQuery.data?.pagination,
    stats: statsQuery.data,
    roleStats: roleStatsQuery.data,

    // 狀態
    isLoading: membersQuery.isLoading || statsQuery.isLoading,
    isError: membersQuery.isError || statsQuery.isError,
    error: membersQuery.error || statsQuery.error,

    // 操作
    createMember: createMutation.mutateAsync,
    updateMember: updateMutation.mutateAsync,
    deleteMember: deleteMutation.mutateAsync,
    bulkOperate: bulkMutation.mutateAsync,

    // 操作狀態
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBulkOperating: bulkMutation.isPending,

    // 重新整理
    refetch: () => {
      membersQuery.refetch();
      statsQuery.refetch();
      roleStatsQuery.refetch();
    },
  };
}

// ==================== EXPORTS ====================

export type {
  ProjectMembersQueryOptions,
  SearchSuggestion,
  SearchOptions,
  ProjectMemberStats,
  CreateProjectMemberRequest,
  UpdateProjectMemberRequest,
  BulkMemberOperationRequest,
};
