import { BaseRepository, FindOptions } from '../database/base-repository';
import { Project, ProjectStatus, ProjectType, ProjectQueryParams } from '../types/database';
import { QueryBuilder } from '../database/query-builder';
import { db } from '../database/connection';

export class ProjectRepository extends BaseRepository<Project> {
  constructor() {
    super('projects', 'id', ['name', 'description']);
  }

  mapFromDB(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status as ProjectStatus,
      type: row.type as ProjectType,
      priority: row.priority,
      start_date: row.start_date,
      end_date: row.end_date,
      budget: parseFloat(row.budget) || 0,
      progress: parseFloat(row.progress) || 0,
      manager_id: row.manager_id,
      client_info: row.client_info ? JSON.parse(row.client_info) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  mapToDB(entity: Partial<Project>): Record<string, any> {
    const mapped: Record<string, any> = {};
    
    if (entity.id !== undefined) mapped.id = entity.id;
    if (entity.name !== undefined) mapped.name = entity.name;
    if (entity.description !== undefined) mapped.description = entity.description;
    if (entity.status !== undefined) mapped.status = entity.status;
    if (entity.type !== undefined) mapped.type = entity.type;
    if (entity.priority !== undefined) mapped.priority = entity.priority;
    if (entity.start_date !== undefined) mapped.start_date = entity.start_date;
    if (entity.end_date !== undefined) mapped.end_date = entity.end_date;
    if (entity.budget !== undefined) mapped.budget = entity.budget;
    if (entity.progress !== undefined) mapped.progress = entity.progress;
    if (entity.manager_id !== undefined) mapped.manager_id = entity.manager_id;
    if (entity.client_info !== undefined) {
      mapped.client_info = JSON.stringify(entity.client_info);
    }
    if (entity.metadata !== undefined) {
      mapped.metadata = JSON.stringify(entity.metadata);
    }
    if (entity.is_active !== undefined) mapped.is_active = entity.is_active;

    return mapped;
  }

  // 根據狀態查找專案
  async findByStatus(status: ProjectStatus, options: FindOptions = {}): Promise<Project[]> {
    const filters = { status, ...(options.filters || {}) };
    const result = await this.findAll({ ...options, filters });
    return result.data;
  }

  // 根據類型查找專案
  async findByType(type: ProjectType, options: FindOptions = {}): Promise<Project[]> {
    const filters = { type, ...(options.filters || {}) };
    const result = await this.findAll({ ...options, filters });
    return result.data;
  }

  // 根據專案經理查找專案
  async findByManager(managerId: string, options: FindOptions = {}): Promise<Project[]> {
    const filters = { manager_id: managerId, ...(options.filters || {}) };
    const result = await this.findAll({ ...options, filters });
    return result.data;
  }

  // 查找用戶參與的專案
  async findUserProjects(userId: string, options: FindOptions = {}): Promise<Project[]> {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    const builder = new QueryBuilder()
      .select(['p.*'])
      .from('projects p')
      .leftJoin('project_members pm', 'p.id = pm.project_id')
      .where('(p.manager_id = ? OR pm.user_id = ?)', userId)
      .where('p.is_active = ?', true)
      .orderBy(`p.${sortBy}`, sortOrder)
      .paginate({ page, pageSize });

    const { query, params } = builder.build();
    const rows = await db.query(query, [userId, userId, true]);
    return rows.map(row => this.mapFromDB(row));
  }

  // 根據日期範圍查找專案
  async findByDateRange(startDate?: Date, endDate?: Date, options: FindOptions = {}): Promise<Project[]> {
    const builder = new QueryBuilder()
      .from(this.tableName)
      .where('is_active = ?', true);

    if (startDate) {
      builder.where('start_date >= ?', startDate);
    }
    if (endDate) {
      builder.where('end_date <= ?', endDate);
    }

    // 套用其他篩選條件
    this.applyFilters(builder, options.filters || {});

    if (options.pageSize) {
      builder.paginate({ page: options.page || 1, pageSize: options.pageSize });
    }

    const { query, params } = builder.build();
    const rows = await db.query(query, params);
    return rows.map(row => this.mapFromDB(row));
  }

  // 查找逾期專案
  async findOverdueProjects(): Promise<Project[]> {
    const query = `
      SELECT * FROM projects 
      WHERE is_active = true 
      AND end_date < CURRENT_DATE 
      AND status IN ('planning', 'active', 'on_hold')
      ORDER BY end_date ASC
    `;
    const rows = await db.query(query);
    return rows.map(row => this.mapFromDB(row));
  }

  // 查找即將到期的專案 (預設 7 天內)
  async findUpcomingDeadlines(days = 7): Promise<Project[]> {
    const query = `
      SELECT * FROM projects 
      WHERE is_active = true 
      AND end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '${days} days')
      AND status IN ('planning', 'active')
      ORDER BY end_date ASC
    `;
    const rows = await db.query(query);
    return rows.map(row => this.mapFromDB(row));
  }

  // 更新專案進度
  async updateProgress(projectId: string, progress: number): Promise<void> {
    const query = `
      UPDATE projects 
      SET progress = $1, updated_at = NOW()
      WHERE id = $2 AND is_active = true
    `;
    await db.query(query, [progress, projectId]);
  }

  // 更新專案狀態
  async updateStatus(projectId: string, status: ProjectStatus): Promise<void> {
    const query = `
      UPDATE projects 
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND is_active = true
    `;
    await db.query(query, [status, projectId]);
  }

  // 獲取專案統計
  async getProjectStats(): Promise<{
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    overdueProjects: number;
    averageProgress: number;
    projectsByStatus: Record<ProjectStatus, number>;
    projectsByType: Record<ProjectType, number>;
  }> {
    const queries = [
      // 總專案數
      'SELECT COUNT(*) as total FROM projects WHERE is_active = true',
      
      // 進行中專案數
      'SELECT COUNT(*) as active FROM projects WHERE is_active = true AND status = \'active\'',
      
      // 已完成專案數
      'SELECT COUNT(*) as completed FROM projects WHERE is_active = true AND status = \'completed\'',
      
      // 逾期專案數
      `SELECT COUNT(*) as overdue FROM projects 
       WHERE is_active = true AND end_date < CURRENT_DATE 
       AND status IN ('planning', 'active', 'on_hold')`,
      
      // 平均進度
      'SELECT AVG(progress) as avg_progress FROM projects WHERE is_active = true',
      
      // 按狀態分組
      'SELECT status, COUNT(*) as count FROM projects WHERE is_active = true GROUP BY status',
      
      // 按類型分組
      'SELECT type, COUNT(*) as count FROM projects WHERE is_active = true GROUP BY type'
    ];

    const [
      totalResult,
      activeResult,
      completedResult,
      overdueResult,
      avgProgressResult,
      statusResults,
      typeResults
    ] = await Promise.all([
      db.queryOne<{ total: number }>(queries[0]),
      db.queryOne<{ active: number }>(queries[1]),
      db.queryOne<{ completed: number }>(queries[2]),
      db.queryOne<{ overdue: number }>(queries[3]),
      db.queryOne<{ avg_progress: number }>(queries[4]),
      db.query<{ status: ProjectStatus; count: number }>(queries[5]),
      db.query<{ type: ProjectType; count: number }>(queries[6])
    ]);

    const projectsByStatus = {} as Record<ProjectStatus, number>;
    statusResults.forEach(result => {
      projectsByStatus[result.status] = result.count;
    });

    const projectsByType = {} as Record<ProjectType, number>;
    typeResults.forEach(result => {
      projectsByType[result.type] = result.count;
    });

    return {
      totalProjects: totalResult?.total || 0,
      activeProjects: activeResult?.active || 0,
      completedProjects: completedResult?.completed || 0,
      overdueProjects: overdueResult?.overdue || 0,
      averageProgress: avgProgressResult?.avg_progress || 0,
      projectsByStatus,
      projectsByType
    };
  }

  // 複製專案
  async duplicateProject(sourceProjectId: string, newProjectData: Partial<Project>): Promise<Project> {
    const sourceProject = await this.findById(sourceProjectId);
    if (!sourceProject) {
      throw new Error('來源專案不存在');
    }

    // 創建新專案，排除 id 和時間戳欄位
    const { id, created_at, updated_at, ...projectData } = sourceProject;
    
    return this.create({
      ...projectData,
      ...newProjectData,
      status: 'planning', // 新專案預設為規劃中
      progress: 0, // 重置進度
    });
  }

  // 自訂篩選條件處理
  protected applyFilters(builder: QueryBuilder, filters: Record<string, any>): void {
    super.applyFilters(builder, filters);

    // 處理狀態陣列篩選
    if (filters.statuses && Array.isArray(filters.statuses)) {
      builder.whereIn('status', filters.statuses);
    }

    // 處理類型陣列篩選
    if (filters.types && Array.isArray(filters.types)) {
      builder.whereIn('type', filters.types);
    }

    // 處理優先級陣列篩選
    if (filters.priorities && Array.isArray(filters.priorities)) {
      builder.whereIn('priority', filters.priorities);
    }

    // 處理進度範圍篩選
    if (filters.progressMin !== undefined) {
      builder.where('progress >= ?', filters.progressMin);
    }
    if (filters.progressMax !== undefined) {
      builder.where('progress <= ?', filters.progressMax);
    }

    // 處理預算範圍篩選
    if (filters.budgetMin !== undefined) {
      builder.where('budget >= ?', filters.budgetMin);
    }
    if (filters.budgetMax !== undefined) {
      builder.where('budget <= ?', filters.budgetMax);
    }

    // 處理日期範圍篩選
    if (filters.startDateFrom) {
      builder.where('start_date >= ?', filters.startDateFrom);
    }
    if (filters.startDateTo) {
      builder.where('start_date <= ?', filters.startDateTo);
    }
    if (filters.endDateFrom) {
      builder.where('end_date >= ?', filters.endDateFrom);
    }
    if (filters.endDateTo) {
      builder.where('end_date <= ?', filters.endDateTo);
    }

    // 逾期篩選
    if (filters.isOverdue) {
      builder.where('end_date < CURRENT_DATE');
      builder.where('status IN (\'planning\', \'active\', \'on_hold\')');
    }

    // 即將到期篩選
    if (filters.upcomingDeadlineDays) {
      builder.where(`end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '${filters.upcomingDeadlineDays} days')`);
    }
  }
}