/**
 * Mock Service Worker (MSW) Handlers for Project Selection API
 *
 * This module provides comprehensive MSW handlers that simulate API endpoints
 * for the project selection functionality during development and testing.
 * Supports requirements US2 (AC2.1, AC2.2) and US6 (AC6.1).
 *
 * @module MSWHandlers
 * @version 1.0
 * @date 2025-08-29
 */

import { http, HttpResponse } from 'msw';
import {
  mockProjects,
  mockProjectSummary,
  mockProjectStatistics,
  getMockProjectById,
} from './projects';
import {
  Project,
  ProjectStatus,
  ProjectType,
  ApiResponse,
  ProjectListResponse,
  ProjectResponse,
  ProjectStatistics,
} from '../types/project';

// ==================== UTILITY FUNCTIONS ====================

/**
 * Create a standardized API response
 */
function createApiResponse<T>(
  success: boolean,
  data?: T,
  message?: string,
  errorCode?: string
): ApiResponse<T> {
  return {
    success,
    data: data!,
    message,
    errorCode,
    timestamp: new Date(),
  };
}

/**
 * Add realistic delay to simulate network latency
 */
function addRealisticDelay(): Promise<void> {
  const delay = Math.random() * 800 + 200; // 200-1000ms random delay
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Parse URL search parameters with type safety
 */
function parseSearchParams(url: URL) {
  const params = {
    // Pagination
    page: parseInt(url.searchParams.get('page') || '1', 10),
    limit: Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50),

    // Search and filters
    search: url.searchParams.get('search') || '',
    status: url.searchParams.getAll('status[]') as ProjectStatus[],
    type: url.searchParams.getAll('type[]') as ProjectType[],

    // Date range filters
    dateFrom: url.searchParams.get('dateFrom')
      ? new Date(url.searchParams.get('dateFrom')!)
      : null,
    dateTo: url.searchParams.get('dateTo')
      ? new Date(url.searchParams.get('dateTo')!)
      : null,

    // Sorting
    sortBy: url.searchParams.get('sortBy') || 'updatedAt',
    sortOrder: (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',

    // Additional filters
    managerId: url.searchParams.get('managerId') || '',
    location: url.searchParams.get('location') || '',
    minProgress: url.searchParams.get('minProgress')
      ? parseInt(url.searchParams.get('minProgress')!, 10)
      : null,
    maxProgress: url.searchParams.get('maxProgress')
      ? parseInt(url.searchParams.get('maxProgress')!, 10)
      : null,
  };

  return params;
}

/**
 * Apply search filter to projects (AC2.1 - Support search by project name and code)
 */
function applySearchFilter(projects: Project[], search: string): Project[] {
  if (!search || search.length < 2) {
    return projects;
  }

  const searchTerm = search.toLowerCase().trim();
  return projects.filter(
    project =>
      project.name.toLowerCase().includes(searchTerm) ||
      project.code.toLowerCase().includes(searchTerm) ||
      project.description.toLowerCase().includes(searchTerm) ||
      project.managerName.toLowerCase().includes(searchTerm) ||
      project.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      project.client?.toLowerCase().includes(searchTerm) ||
      project.location?.toLowerCase().includes(searchTerm)
  );
}

/**
 * Apply status filter to projects (AC2.2 - Support filtering by status)
 */
function applyStatusFilter(
  projects: Project[],
  statuses: ProjectStatus[]
): Project[] {
  if (!statuses.length) {
    return projects;
  }
  return projects.filter(project => statuses.includes(project.status));
}

/**
 * Apply type filter to projects
 */
function applyTypeFilter(projects: Project[], types: ProjectType[]): Project[] {
  if (!types.length) {
    return projects;
  }
  return projects.filter(project => types.includes(project.type));
}

/**
 * Apply date range filter to projects
 */
function applyDateRangeFilter(
  projects: Project[],
  dateFrom: Date | null,
  dateTo: Date | null
): Project[] {
  if (!dateFrom && !dateTo) {
    return projects;
  }

  return projects.filter(project => {
    const projectDate = project.startDate;

    if (dateFrom && projectDate < dateFrom) {
      return false;
    }

    if (dateTo && projectDate > dateTo) {
      return false;
    }

    return true;
  });
}

/**
 * Apply progress range filter to projects
 */
function applyProgressFilter(
  projects: Project[],
  minProgress: number | null,
  maxProgress: number | null
): Project[] {
  if (minProgress === null && maxProgress === null) {
    return projects;
  }

  return projects.filter(project => {
    if (minProgress !== null && project.progress < minProgress) {
      return false;
    }

    if (maxProgress !== null && project.progress > maxProgress) {
      return false;
    }

    return true;
  });
}

/**
 * Apply additional filters to projects
 */
function applyAdditionalFilters(
  projects: Project[],
  managerId: string,
  location: string
): Project[] {
  let filtered = projects;

  if (managerId) {
    filtered = filtered.filter(project => project.managerId === managerId);
  }

  if (location) {
    filtered = filtered.filter(project =>
      project.location?.toLowerCase().includes(location.toLowerCase())
    );
  }

  return filtered;
}

/**
 * Sort projects by specified field and direction
 */
function sortProjects(
  projects: Project[],
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): Project[] {
  const sorted = [...projects].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'name':
        aValue = a.name;
        bValue = b.name;
        break;
      case 'code':
        aValue = a.code;
        bValue = b.code;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      case 'progress':
        aValue = a.progress;
        bValue = b.progress;
        break;
      case 'startDate':
        aValue = new Date(a.startDate).getTime();
        bValue = new Date(b.startDate).getTime();
        break;
      case 'endDate':
        aValue = new Date(a.endDate).getTime();
        bValue = new Date(b.endDate).getTime();
        break;
      case 'updatedAt':
      default:
        aValue = new Date(a.updatedAt).getTime();
        bValue = new Date(b.updatedAt).getTime();
        break;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue, 'zh-TW')
        : bValue.localeCompare(aValue, 'zh-TW');
    }

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  return sorted;
}

/**
 * Apply pagination to projects
 */
function paginateProjects(
  projects: Project[],
  page: number,
  limit: number
): { projects: Project[]; pagination: any } {
  const total = projects.length;
  const totalPages = Math.ceil(total / limit);
  const validPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (validPage - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedProjects = projects.slice(startIndex, endIndex);

  return {
    projects: paginatedProjects,
    pagination: {
      page: validPage,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Get available filter options from current dataset
 */
function getAvailableFilters(projects: Project[]) {
  const statuses = [...new Set(projects.map(p => p.status))];
  const types = [...new Set(projects.map(p => p.type))];
  const managers = [
    ...new Set(
      projects.map(p => ({
        id: p.managerId,
        name: p.managerName,
      }))
    ),
  ];
  const locations = [...new Set(projects.map(p => p.location).filter(Boolean))];
  const tags = [...new Set(projects.flatMap(p => p.tags))];

  return {
    statuses,
    types,
    managers,
    locations,
    tags,
  };
}

// ==================== MSW HANDLERS ====================

/**
 * Convert Date objects to ISO strings to simulate JSON serialization
 */
function serializeProjectDates(project: Project): Project {
  return {
    ...project,
    startDate: new Date(project.startDate).toISOString(),
    endDate: new Date(project.endDate).toISOString(),
    actualStartDate: project.actualStartDate
      ? new Date(project.actualStartDate).toISOString()
      : undefined,
    actualEndDate: project.actualEndDate
      ? new Date(project.actualEndDate).toISOString()
      : undefined,
    createdAt: new Date(project.createdAt).toISOString(),
    updatedAt: new Date(project.updatedAt).toISOString(),
    lastAccessDate: project.lastAccessDate
      ? new Date(project.lastAccessDate).toISOString()
      : undefined,
    teamMembers: project.teamMembers.map(member => ({
      ...member,
      joinedAt: new Date(member.joinedAt).toISOString(),
    })),
    permissions: project.permissions.map(permission => ({
      ...permission,
      grantedAt: new Date(permission.grantedAt).toISOString(),
      expiresAt: permission.expiresAt
        ? new Date(permission.expiresAt).toISOString()
        : undefined,
    })),
  } as Project;
}

/**
 * Handler for GET /api/projects - Get project list with comprehensive filtering and pagination
 * Supports AC2.1 (search by name/code) and AC2.2 (status filtering)
 */
const getProjectsHandler = http.get('/api/projects', async ({ request }) => {
  await addRealisticDelay();

  try {
    const url = new URL(request.url);
    const params = parseSearchParams(url);

    // Start with all projects and serialize dates
    let filteredProjects = [...mockProjects].map(serializeProjectDates);

    // Apply search filter (AC2.1)
    if (params.search) {
      filteredProjects = applySearchFilter(filteredProjects, params.search);
    }

    // Apply status filter (AC2.2)
    if (params.status.length > 0) {
      filteredProjects = applyStatusFilter(filteredProjects, params.status);
    }

    // Apply type filter
    if (params.type.length > 0) {
      filteredProjects = applyTypeFilter(filteredProjects, params.type);
    }

    // Apply date range filter
    filteredProjects = applyDateRangeFilter(
      filteredProjects,
      params.dateFrom,
      params.dateTo
    );

    // Apply progress filter
    filteredProjects = applyProgressFilter(
      filteredProjects,
      params.minProgress,
      params.maxProgress
    );

    // Apply additional filters
    filteredProjects = applyAdditionalFilters(
      filteredProjects,
      params.managerId,
      params.location
    );

    // Sort projects
    filteredProjects = sortProjects(
      filteredProjects,
      params.sortBy,
      params.sortOrder
    );

    // Apply pagination
    const result = paginateProjects(
      filteredProjects,
      params.page,
      params.limit
    );

    // Get available filter options
    const availableFilters = getAvailableFilters(mockProjects);

    const response: ProjectListResponse = {
      ...createApiResponse(true, result.projects),
      pagination: result.pagination,
    };

    // Add metadata for filters
    const responseWithMeta = {
      ...response,
      metadata: {
        availableFilters,
        appliedFilters: {
          search: params.search,
          status: params.status,
          type: params.type,
          dateRange:
            params.dateFrom || params.dateTo
              ? {
                  from: params.dateFrom,
                  to: params.dateTo,
                }
              : null,
          progressRange:
            params.minProgress !== null || params.maxProgress !== null
              ? {
                  min: params.minProgress,
                  max: params.maxProgress,
                }
              : null,
        },
        sorting: {
          field: params.sortBy,
          direction: params.sortOrder,
        },
      },
    };

    return HttpResponse.json(responseWithMeta);
  } catch (error) {
    console.error('Error in getProjectsHandler:', error);
    return HttpResponse.json(
      createApiResponse(
        false,
        null,
        '獲取專案列表時發生錯誤',
        'INTERNAL_ERROR'
      ),
      { status: 500 }
    );
  }
});

/**
 * Handler for GET /api/projects/:id - Get single project details
 */
const getProjectHandler = http.get('/api/projects/:id', async ({ params }) => {
  await addRealisticDelay();

  try {
    const projectId = params.id as string;

    if (!projectId) {
      return HttpResponse.json(
        createApiResponse(false, null, '專案ID不能為空', 'MISSING_PROJECT_ID'),
        { status: 400 }
      );
    }

    const project = getMockProjectById(projectId);

    if (!project) {
      return HttpResponse.json(
        createApiResponse(false, null, '找不到指定的專案', 'PROJECT_NOT_FOUND'),
        { status: 404 }
      );
    }

    const response: ProjectResponse = createApiResponse(true, project);
    return HttpResponse.json(response);
  } catch (error) {
    console.error('Error in getProjectHandler:', error);
    return HttpResponse.json(
      createApiResponse(
        false,
        null,
        '獲取專案詳情時發生錯誤',
        'INTERNAL_ERROR'
      ),
      { status: 500 }
    );
  }
});

/**
 * Handler for POST /api/projects/:id/access - Record project access
 * Updates lastAccessDate for the project
 */
const recordProjectAccessHandler = http.post(
  '/api/projects/:id/access',
  async ({ params }) => {
    await addRealisticDelay();

    try {
      const projectId = params.id as string;

      if (!projectId) {
        return HttpResponse.json(
          createApiResponse(
            false,
            null,
            '專案ID不能為空',
            'MISSING_PROJECT_ID'
          ),
          { status: 400 }
        );
      }

      const project = getMockProjectById(projectId);

      if (!project) {
        return HttpResponse.json(
          createApiResponse(
            false,
            null,
            '找不到指定的專案',
            'PROJECT_NOT_FOUND'
          ),
          { status: 404 }
        );
      }

      // Simulate updating lastAccessDate
      const updatedProject = {
        ...project,
        lastAccessDate: new Date(),
        updatedAt: new Date(),
      };

      // In a real application, this would update the database
      // For mock purposes, we just return success
      const response = createApiResponse(true, {
        projectId,
        lastAccessDate: updatedProject.lastAccessDate,
        message: '已記錄專案存取時間',
      });

      return HttpResponse.json(response);
    } catch (error) {
      console.error('Error in recordProjectAccessHandler:', error);
      return HttpResponse.json(
        createApiResponse(
          false,
          null,
          '記錄專案存取時發生錯誤',
          'INTERNAL_ERROR'
        ),
        { status: 500 }
      );
    }
  }
);

/**
 * Handler for GET /api/projects/summary - Get project statistics summary
 * Supports dashboard display requirements
 */
const getProjectSummaryHandler = http.get('/api/projects/summary', async () => {
  await addRealisticDelay();

  try {
    const response = createApiResponse(true, {
      statistics: mockProjectStatistics,
      summary: mockProjectSummary,
      recentProjects: mockProjects
        .filter(p => p.lastAccessDate)
        .sort(
          (a, b) =>
            new Date(b.lastAccessDate!).getTime() -
            new Date(a.lastAccessDate!).getTime()
        )
        .slice(0, 5),
      upcomingDeadlines: mockProjects
        .filter(p => p.status === ProjectStatus.IN_PROGRESS)
        .sort(
          (a, b) =>
            new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
        )
        .slice(0, 5),
      attentionRequired: mockProjects
        .filter(
          p =>
            p.status === ProjectStatus.PAUSED ||
            (p.status === ProjectStatus.IN_PROGRESS &&
              p.progress < 50 &&
              new Date(p.endDate).getTime() - new Date().getTime() <
                90 * 24 * 60 * 60 * 1000)
        )
        .slice(0, 5),
    });

    return HttpResponse.json(response);
  } catch (error) {
    console.error('Error in getProjectSummaryHandler:', error);
    return HttpResponse.json(
      createApiResponse(
        false,
        null,
        '獲取專案摘要時發生錯誤',
        'INTERNAL_ERROR'
      ),
      { status: 500 }
    );
  }
});

/**
 * Handler for GET /api/projects/statistics - Get detailed project statistics
 */
const getProjectStatisticsHandler = http.get(
  '/api/projects/statistics',
  async ({ request }) => {
    await addRealisticDelay();

    try {
      const url = new URL(request.url);
      const timeRange = url.searchParams.get('timeRange') || 'all'; // all, year, quarter, month
      const groupBy = url.searchParams.get('groupBy') || 'status'; // status, type, manager

      // Generate statistics based on query parameters
      let filteredProjects = [...mockProjects];

      // Apply time range filter if specified
      if (timeRange !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (timeRange) {
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            startDate = new Date(
              now.getFullYear(),
              Math.floor(now.getMonth() / 3) * 3,
              1
            );
            break;
          case 'year':
          default:
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        }

        filteredProjects = filteredProjects.filter(
          p => new Date(p.createdAt) >= startDate
        );
      }

      // Generate grouped statistics
      const statistics = {
        ...mockProjectStatistics,
        timeRange,
        groupBy,
        breakdown:
          groupBy === 'status'
            ? mockProjectSummary.projectsByStatus
            : mockProjectSummary.projectsByType,
      };

      const response = createApiResponse(true, statistics);
      return HttpResponse.json(response);
    } catch (error) {
      console.error('Error in getProjectStatisticsHandler:', error);
      return HttpResponse.json(
        createApiResponse(
          false,
          null,
          '獲取專案統計時發生錯誤',
          'INTERNAL_ERROR'
        ),
        { status: 500 }
      );
    }
  }
);

/**
 * Handler for simulating real-time project progress updates (AC6.1)
 * This would typically use WebSocket or Server-Sent Events in a real application
 */
const getProjectProgressUpdatesHandler = http.get(
  '/api/projects/progress-updates',
  async ({ request }) => {
    await addRealisticDelay();

    try {
      const url = new URL(request.url);
      const projectIds = url.searchParams.getAll('projectId');
      const since = url.searchParams.get('since')
        ? new Date(url.searchParams.get('since')!)
        : new Date(Date.now() - 60 * 60 * 1000); // Last hour

      // Simulate progress updates for requested projects
      const updates = projectIds
        .map(id => {
          const project = getMockProjectById(id);
          if (!project) return null;

          // Simulate random progress update
          const progressDelta = Math.random() * 5; // 0-5% progress change
          const newProgress = Math.min(100, project.progress + progressDelta);

          return {
            projectId: id,
            projectName: project.name,
            previousProgress: project.progress,
            currentProgress: Math.round(newProgress),
            updatedAt: new Date(),
            updatedBy: project.managerName,
            description: `專案進度更新：${Math.round(newProgress)}%`,
          };
        })
        .filter(Boolean);

      const response = createApiResponse(true, {
        updates,
        timestamp: new Date(),
        hasMore: false,
      });

      return HttpResponse.json(response);
    } catch (error) {
      console.error('Error in getProjectProgressUpdatesHandler:', error);
      return HttpResponse.json(
        createApiResponse(
          false,
          null,
          '獲取進度更新時發生錯誤',
          'INTERNAL_ERROR'
        ),
        { status: 500 }
      );
    }
  }
);

/**
 * Error handler for unmatched routes
 */
const catchAllHandler = http.all('/api/*', async ({ request }) => {
  const url = new URL(request.url);
  console.warn(`Unhandled API request: ${request.method} ${url.pathname}`);

  return HttpResponse.json(
    createApiResponse(
      false,
      null,
      `API 端點 ${request.method} ${url.pathname} 未找到`,
      'ENDPOINT_NOT_FOUND'
    ),
    { status: 404 }
  );
});

// ==================== EXPORT HANDLERS ====================

/**
 * All MSW handlers for project selection functionality
 */
export const handlers = [
  getProjectsHandler,
  getProjectHandler,
  recordProjectAccessHandler,
  getProjectSummaryHandler,
  getProjectStatisticsHandler,
  getProjectProgressUpdatesHandler,
  catchAllHandler, // Keep this last
];

// Export individual handlers for testing
export {
  getProjectsHandler,
  getProjectHandler,
  recordProjectAccessHandler,
  getProjectSummaryHandler,
  getProjectStatisticsHandler,
  getProjectProgressUpdatesHandler,
};

// Export utility functions for testing
export {
  parseSearchParams,
  applySearchFilter,
  applyStatusFilter,
  sortProjects,
  paginateProjects,
};

export default handlers;
