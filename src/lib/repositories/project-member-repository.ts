import { BaseRepository, BaseEntity, PaginationResult, FindOptions } from '@/lib/database/base-repository';
import { QueryBuilder } from '@/lib/database/query-builder';

// 專案成員實體介面
export interface ProjectMember extends BaseEntity {
  id: string;
  projectId: string;
  userId: string;
  roleId: string;
  joinedAt: Date;
  leftAt?: Date;
  isActive: boolean;
  canViewProject: boolean;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canManageMembers: boolean;
  canManageWbs: boolean;
  canManageSchedules: boolean;
  canViewReports: boolean;
  canExportData: boolean;
  notes?: string;
  // 關聯資料（查詢時可包含）
  user?: {
    id: string;
    name: string;
    email: string;
    department?: string;
    position?: string;
  };
  role?: {
    id: string;
    name: string;
    description?: string;
    level: number;
  };
  project?: {
    id: string;
    name: string;
    description?: string;
  };
}

// 查詢選項介面
export interface ProjectMemberQueryOptions extends FindOptions {
  projectId?: string;
  userId?: string;
  roleId?: string;
  department?: string;
  position?: string;
  includeLeft?: boolean; // 是否包含已離開的成員
  permissions?: string[]; // 依權限篩選
}

// 成員統計介面
export interface MemberStats {
  totalMembers: number;
  activeMembers: number;
  leftMembers: number;
  roleDistribution: {
    roleId: string;
    roleName: string;
    count: number;
  }[];
  departmentDistribution: {
    department: string;
    count: number;
  }[];
  joinedThisMonth: number;
  leftThisMonth: number;
}

export class ProjectMemberRepository extends BaseRepository<ProjectMember> {
  constructor() {
    super('project_members', 'id', ['user_name', 'user_email', 'role_name', 'notes']);
  }

  // 映射資料庫記錄到實體
  mapFromDB(row: any): ProjectMember {
    return {
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      roleId: row.role_id,
      joinedAt: new Date(row.joined_at),
      leftAt: row.left_at ? new Date(row.left_at) : undefined,
      isActive: row.is_active,
      canViewProject: row.can_view_project,
      canEditProject: row.can_edit_project,
      canDeleteProject: row.can_delete_project,
      canManageMembers: row.can_manage_members,
      canManageWbs: row.can_manage_wbs,
      canManageSchedules: row.can_manage_schedules,
      canViewReports: row.can_view_reports,
      canExportData: row.can_export_data,
      notes: row.notes,
      created_at: row.created_at ? new Date(row.created_at) : undefined,
      updated_at: row.updated_at ? new Date(row.updated_at) : undefined,
      // 關聯資料
      user: row.user_name ? {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        department: row.user_department,
        position: row.user_position
      } : undefined,
      role: row.role_name ? {
        id: row.role_id,
        name: row.role_name,
        description: row.role_description,
        level: row.role_level
      } : undefined,
      project: row.project_name ? {
        id: row.project_id,
        name: row.project_name,
        description: row.project_description
      } : undefined
    };
  }

  // 映射實體到資料庫記錄
  mapToDB(entity: Partial<ProjectMember>): Record<string, any> {
    return {
      project_id: entity.projectId,
      user_id: entity.userId,
      role_id: entity.roleId,
      joined_at: entity.joinedAt,
      left_at: entity.leftAt,
      is_active: entity.isActive,
      can_view_project: entity.canViewProject,
      can_edit_project: entity.canEditProject,
      can_delete_project: entity.canDeleteProject,
      can_manage_members: entity.canManageMembers,
      can_manage_wbs: entity.canManageWbs,
      can_manage_schedules: entity.canManageSchedules,
      can_view_reports: entity.canViewReports,
      can_export_data: entity.canExportData,
      notes: entity.notes
    };
  }

  // 取得專案成員列表（含關聯資料）
  async findProjectMembers(
    projectId: string, 
    options: ProjectMemberQueryOptions = {}
  ): Promise<PaginationResult<ProjectMember>> {
    const queryBuilder = new QueryBuilder();
    
    // 基本查詢 - 包含用戶和角色資訊
    queryBuilder
      .select([
        'pm.*',
        'u.name as user_name',
        'u.email as user_email',
        'u.department as user_department',
        'u.position as user_position',
        'r.name as role_name',
        'r.description as role_description',
        'r.level as role_level'
      ])
      .from(`${this.tableName} pm`)
      .leftJoin('users u', 'pm.user_id = u.id')
      .leftJoin('roles r', 'pm.role_id = r.id')
      .where('pm.project_id = $1', [projectId]);

    // 是否包含已離開的成員
    if (!options.includeLeft) {
      queryBuilder.where('pm.is_active = true');
    }

    // 角色篩選
    if (options.roleId) {
      queryBuilder.where('pm.role_id = ?', [options.roleId]);
    }

    // 用戶篩選
    if (options.userId) {
      queryBuilder.where('pm.user_id = ?', [options.userId]);
    }

    // 部門篩選
    if (options.department) {
      queryBuilder.where('u.department = ?', [options.department]);
    }

    // 職位篩選
    if (options.position) {
      queryBuilder.where('u.position = ?', [options.position]);
    }

    // 權限篩選
    if (options.permissions && options.permissions.length > 0) {
      const permissionConditions = options.permissions.map(permission => {
        switch (permission) {
          case 'view': return 'pm.can_view_project = true';
          case 'edit': return 'pm.can_edit_project = true';
          case 'delete': return 'pm.can_delete_project = true';
          case 'manage_members': return 'pm.can_manage_members = true';
          case 'manage_wbs': return 'pm.can_manage_wbs = true';
          case 'manage_schedules': return 'pm.can_manage_schedules = true';
          case 'view_reports': return 'pm.can_view_reports = true';
          case 'export_data': return 'pm.can_export_data = true';
          default: return null;
        }
      }).filter(condition => condition);
      
      if (permissionConditions.length > 0) {
        queryBuilder.where(`(${permissionConditions.join(' OR ')})`);
      }
    }

    // 搜尋功能
    if (options.search) {
      queryBuilder.where(
        '(u.name ILIKE ? OR u.email ILIKE ? OR r.name ILIKE ? OR pm.notes ILIKE ?)',
        Array(4).fill(`%${options.search}%`)
      );
    }

    // 排序
    const sortBy = options.sortBy || 'joined_at';
    const sortOrder = options.sortOrder || 'DESC';
    queryBuilder.orderBy(`${sortBy === 'userName' ? 'u.name' : sortBy === 'roleName' ? 'r.name' : 'pm.' + sortBy}`, sortOrder);

    // 分頁
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    queryBuilder.limit(pageSize).offset((page - 1) * pageSize);

    const { query, params } = queryBuilder.build();
    
    try {
      // 取得資料
      const rows = await this.db.query(query, params);
      const members = rows.map(row => this.mapFromDB(row));

      // 計算總數
      const countQuery = queryBuilder.buildCountQuery();
      const countResult = await this.db.queryOne<{ count: number }>(countQuery.query, countQuery.params);
      const total = parseInt(countResult?.count?.toString() || '0');

      return {
        data: members,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: page < Math.ceil(total / pageSize),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('查詢專案成員失敗:', error);
      throw new Error('查詢專案成員失敗');
    }
  }

  // 取得用戶的專案列表
  async findUserProjects(
    userId: string, 
    options: FindOptions = {}
  ): Promise<PaginationResult<ProjectMember>> {
    const queryBuilder = new QueryBuilder();
    
    queryBuilder
      .select([
        'pm.*',
        'p.name as project_name',
        'p.description as project_description',
        'p.start_date as project_start_date',
        'p.end_date as project_end_date',
        'p.status as project_status',
        'r.name as role_name',
        'r.description as role_description',
        'r.level as role_level'
      ])
      .from(`${this.tableName} pm`)
      .leftJoin('projects p', 'pm.project_id = p.id')
      .leftJoin('roles r', 'pm.role_id = r.id')
      .where('pm.user_id = $1 AND pm.is_active = true', [userId]);

    // 搜尋
    if (options.search) {
      queryBuilder.where(
        '(p.name ILIKE ? OR p.description ILIKE ? OR r.name ILIKE ?)',
        Array(3).fill(`%${options.search}%`)
      );
    }

    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    queryBuilder
      .orderBy('pm.joined_at', 'DESC')
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const { query, params } = queryBuilder.build();
    
    try {
      const rows = await this.db.query(query, params);
      const members = rows.map(row => this.mapFromDB(row));

      const countQuery = queryBuilder.buildCountQuery();
      const countResult = await this.db.queryOne<{ count: number }>(countQuery.query, countQuery.params);
      const total = parseInt(countResult?.count?.toString() || '0');

      return {
        data: members,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: page < Math.ceil(total / pageSize),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('查詢用戶專案失敗:', error);
      throw new Error('查詢用戶專案失敗');
    }
  }

  // 檢查用戶是否為專案成員
  async isProjectMember(projectId: string, userId: string): Promise<boolean> {
    const query = 'SELECT COUNT(*) as count FROM project_members WHERE project_id = $1 AND user_id = $2 AND is_active = true';
    try {
      const result = await this.db.queryOne<{ count: number }>(query, [projectId, userId]);
      return (result?.count || 0) > 0;
    } catch (error) {
      console.error('檢查專案成員失敗:', error);
      return false;
    }
  }

  // 檢查用戶權限
  async checkPermission(projectId: string, userId: string, permission: string): Promise<boolean> {
    const permissionColumn = this.getPermissionColumn(permission);
    if (!permissionColumn) return false;

    const query = `SELECT ${permissionColumn} FROM project_members WHERE project_id = $1 AND user_id = $2 AND is_active = true`;
    try {
      const result = await this.db.queryOne<Record<string, boolean>>(query, [projectId, userId]);
      return result?.[permissionColumn] || false;
    } catch (error) {
      console.error('檢查用戶權限失敗:', error);
      return false;
    }
  }

  // 批量更新成員權限
  async updateMemberPermissions(
    memberId: string, 
    permissions: Partial<Pick<ProjectMember, 
      'canViewProject' | 'canEditProject' | 'canDeleteProject' | 
      'canManageMembers' | 'canManageWbs' | 'canManageSchedules' |
      'canViewReports' | 'canExportData'>>
  ): Promise<void> {
    const updateData = this.mapToDB(permissions);
    updateData.updated_at = new Date();
    
    const setClause = Object.keys(updateData)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const query = `UPDATE project_members SET ${setClause} WHERE id = $1`;
    const params = [memberId, ...Object.values(updateData)];
    
    try {
      await this.db.query(query, params);
    } catch (error) {
      console.error('更新成員權限失敗:', error);
      throw new Error('更新成員權限失敗');
    }
  }

  // 移除專案成員（軟刪除）
  async removeMember(memberId: string, removedBy: string): Promise<void> {
    const query = `
      UPDATE project_members 
      SET is_active = false, left_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `;
    
    try {
      await this.db.query(query, [memberId]);
    } catch (error) {
      console.error('移除專案成員失敗:', error);
      throw new Error('移除專案成員失敗');
    }
  }

  // 取得專案成員統計
  async getProjectMemberStats(projectId: string): Promise<MemberStats> {
    try {
      // 基本統計
      const basicStatsQuery = `
        SELECT 
          COUNT(*) as total_members,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_members,
          COUNT(CASE WHEN is_active = false THEN 1 END) as left_members,
          COUNT(CASE WHEN joined_at >= date_trunc('month', CURRENT_DATE) AND is_active = true THEN 1 END) as joined_this_month,
          COUNT(CASE WHEN left_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as left_this_month
        FROM project_members 
        WHERE project_id = $1
      `;
      const basicStats = await this.db.queryOne(basicStatsQuery, [projectId]);

      // 角色分佈統計
      const roleStatsQuery = `
        SELECT 
          pm.role_id,
          r.name as role_name,
          COUNT(*) as count
        FROM project_members pm
        LEFT JOIN roles r ON pm.role_id = r.id
        WHERE pm.project_id = $1 AND pm.is_active = true
        GROUP BY pm.role_id, r.name
        ORDER BY count DESC
      `;
      const roleStats = await this.db.query(roleStatsQuery, [projectId]);

      // 部門分佈統計
      const deptStatsQuery = `
        SELECT 
          u.department,
          COUNT(*) as count
        FROM project_members pm
        LEFT JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = $1 AND pm.is_active = true AND u.department IS NOT NULL
        GROUP BY u.department
        ORDER BY count DESC
      `;
      const deptStats = await this.db.query(deptStatsQuery, [projectId]);

      return {
        totalMembers: parseInt(basicStats?.total_members || '0'),
        activeMembers: parseInt(basicStats?.active_members || '0'),
        leftMembers: parseInt(basicStats?.left_members || '0'),
        roleDistribution: roleStats.map(row => ({
          roleId: row.role_id,
          roleName: row.role_name,
          count: parseInt(row.count)
        })),
        departmentDistribution: deptStats.map(row => ({
          department: row.department,
          count: parseInt(row.count)
        })),
        joinedThisMonth: parseInt(basicStats?.joined_this_month || '0'),
        leftThisMonth: parseInt(basicStats?.left_this_month || '0')
      };
    } catch (error) {
      console.error('取得專案成員統計失敗:', error);
      throw new Error('取得專案成員統計失敗');
    }
  }

  // 輔助方法：權限名稱轉換為欄位名
  private getPermissionColumn(permission: string): string | null {
    const permissionMap: Record<string, string> = {
      'view': 'can_view_project',
      'edit': 'can_edit_project',
      'delete': 'can_delete_project',
      'manage_members': 'can_manage_members',
      'manage_wbs': 'can_manage_wbs',
      'manage_schedules': 'can_manage_schedules',
      'view_reports': 'can_view_reports',
      'export_data': 'can_export_data'
    };
    return permissionMap[permission] || null;
  }

  // 取得資料庫連接（用於查詢）
  private get db() {
    return (this as any).constructor.prototype.db || 
           require('@/lib/database/connection').db;
  }
}

// 匯出單例
export const projectMemberRepository = new ProjectMemberRepository();