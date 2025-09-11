import { BaseRepository, FindOptions } from '../database/base-repository';
import { WBSItem, WBSStatus, WBSPriority } from '../types/database';
import { QueryBuilder } from '../database/query-builder';
import { db } from '../database/connection';

export class WBSRepository extends BaseRepository<WBSItem> {
  constructor() {
    super('wbs_items', 'id', ['name', 'description', 'wbs_code']);
  }

  mapFromDB(row: any): WBSItem {
    return {
      id: row.id,
      project_id: row.project_id,
      parent_id: row.parent_id,
      wbs_code: row.wbs_code,
      name: row.name,
      description: row.description,
      level: row.level,
      status: row.status as WBSStatus,
      priority: row.priority as WBSPriority,
      assigned_to: row.assigned_to,
      estimated_hours: parseFloat(row.estimated_hours) || 0,
      actual_hours: parseFloat(row.actual_hours) || 0,
      start_date: row.start_date,
      end_date: row.end_date,
      completion_percentage: parseFloat(row.completion_percentage) || 0,
      dependencies: row.dependencies || [],
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  mapToDB(entity: Partial<WBSItem>): Record<string, any> {
    const mapped: Record<string, any> = {};
    
    if (entity.project_id !== undefined) mapped.project_id = entity.project_id;
    if (entity.parent_id !== undefined) mapped.parent_id = entity.parent_id;
    if (entity.wbs_code !== undefined) mapped.wbs_code = entity.wbs_code;
    if (entity.name !== undefined) mapped.name = entity.name;
    if (entity.description !== undefined) mapped.description = entity.description;
    if (entity.level !== undefined) mapped.level = entity.level;
    if (entity.status !== undefined) mapped.status = entity.status;
    if (entity.priority !== undefined) mapped.priority = entity.priority;
    if (entity.assigned_to !== undefined) mapped.assigned_to = entity.assigned_to;
    if (entity.estimated_hours !== undefined) mapped.estimated_hours = entity.estimated_hours;
    if (entity.actual_hours !== undefined) mapped.actual_hours = entity.actual_hours;
    if (entity.start_date !== undefined) mapped.start_date = entity.start_date;
    if (entity.end_date !== undefined) mapped.end_date = entity.end_date;
    if (entity.completion_percentage !== undefined) mapped.completion_percentage = entity.completion_percentage;
    if (entity.dependencies !== undefined) mapped.dependencies = entity.dependencies;
    if (entity.metadata !== undefined) {
      mapped.metadata = JSON.stringify(entity.metadata);
    }
    if (entity.is_active !== undefined) mapped.is_active = entity.is_active;

    return mapped;
  }

  // 根據專案 ID 查找所有 WBS 項目
  async findByProjectId(projectId: string, options: FindOptions = {}): Promise<WBSItem[]> {
    const filters = { project_id: projectId, ...(options.filters || {}) };
    const result = await this.findAll({ 
      ...options, 
      filters,
      sortBy: 'wbs_code',
      sortOrder: 'ASC'
    });
    return result.data;
  }

  // 根據父節點查找子項目
  async findByParentId(parentId: string, options: FindOptions = {}): Promise<WBSItem[]> {
    const filters = { parent_id: parentId, ...(options.filters || {}) };
    const result = await this.findAll({ 
      ...options, 
      filters,
      sortBy: 'wbs_code',
      sortOrder: 'ASC'
    });
    return result.data;
  }

  // 查找根節點項目 (level = 1)
  async findRootItems(projectId: string): Promise<WBSItem[]> {
    const query = `
      SELECT * FROM wbs_items 
      WHERE project_id = $1 AND parent_id IS NULL AND level = 1 AND is_active = true
      ORDER BY wbs_code ASC
    `;
    const rows = await db.query(query, [projectId]);
    return rows.map(row => this.mapFromDB(row));
  }

  // 獲取 WBS 樹狀結構
  async getWBSTree(projectId: string): Promise<WBSItem[]> {
    const query = `
      WITH RECURSIVE wbs_tree AS (
        -- 根節點
        SELECT *, ARRAY[wbs_code] as path, 1 as tree_level
        FROM wbs_items 
        WHERE project_id = $1 AND parent_id IS NULL AND is_active = true
        
        UNION ALL
        
        -- 子節點
        SELECT w.*, wt.path || w.wbs_code, wt.tree_level + 1
        FROM wbs_items w
        INNER JOIN wbs_tree wt ON w.parent_id = wt.id
        WHERE w.is_active = true
      )
      SELECT * FROM wbs_tree
      ORDER BY path
    `;
    const rows = await db.query(query, [projectId]);
    return rows.map(row => this.mapFromDB(row));
  }

  // 根據 WBS 代碼查找
  async findByWBSCode(projectId: string, wbsCode: string): Promise<WBSItem | null> {
    const query = `
      SELECT * FROM wbs_items 
      WHERE project_id = $1 AND wbs_code = $2 AND is_active = true
    `;
    const row = await db.queryOne(query, [projectId, wbsCode]);
    return row ? this.mapFromDB(row) : null;
  }

  // 檢查 WBS 代碼是否已存在
  async isWBSCodeExists(projectId: string, wbsCode: string, excludeId?: string): Promise<boolean> {
    let query = `
      SELECT 1 FROM wbs_items 
      WHERE project_id = $1 AND wbs_code = $2 AND is_active = true
    `;
    const params = [projectId, wbsCode];

    if (excludeId) {
      query += ` AND id != $3`;
      params.push(excludeId);
    }

    const row = await db.queryOne(query, params);
    return !!row;
  }

  // 根據分配者查找任務
  async findByAssignee(assigneeId: string, projectId?: string): Promise<WBSItem[]> {
    let query = `
      SELECT * FROM wbs_items 
      WHERE assigned_to = $1 AND is_active = true
    `;
    const params = [assigneeId];

    if (projectId) {
      query += ` AND project_id = $2`;
      params.push(projectId);
    }

    query += ` ORDER BY priority DESC, end_date ASC NULLS LAST`;

    const rows = await db.query(query, params);
    return rows.map(row => this.mapFromDB(row));
  }

  // 根據狀態查找 WBS 項目
  async findByStatus(status: WBSStatus, projectId?: string): Promise<WBSItem[]> {
    let query = `
      SELECT * FROM wbs_items 
      WHERE status = $1 AND is_active = true
    `;
    const params = [status];

    if (projectId) {
      query += ` AND project_id = $2`;
      params.push(projectId);
    }

    query += ` ORDER BY wbs_code ASC`;

    const rows = await db.query(query, params);
    return rows.map(row => this.mapFromDB(row));
  }

  // 查找逾期任務
  async findOverdueTasks(projectId?: string): Promise<WBSItem[]> {
    let query = `
      SELECT * FROM wbs_items 
      WHERE end_date < CURRENT_DATE 
      AND status NOT IN ('completed', 'cancelled')
      AND is_active = true
    `;
    const params: any[] = [];

    if (projectId) {
      query += ` AND project_id = $1`;
      params.push(projectId);
    }

    query += ` ORDER BY end_date ASC`;

    const rows = await db.query(query, params);
    return rows.map(row => this.mapFromDB(row));
  }

  // 查找即將到期的任務
  async findUpcomingTasks(days = 7, projectId?: string): Promise<WBSItem[]> {
    let query = `
      SELECT * FROM wbs_items 
      WHERE end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '${days} days')
      AND status NOT IN ('completed', 'cancelled')
      AND is_active = true
    `;
    const params: any[] = [];

    if (projectId) {
      query += ` AND project_id = $1`;
      params.push(projectId);
    }

    query += ` ORDER BY end_date ASC`;

    const rows = await db.query(query, params);
    return rows.map(row => this.mapFromDB(row));
  }

  // 更新完成度
  async updateCompletion(wbsId: string, completionPercentage: number): Promise<void> {
    const query = `
      UPDATE wbs_items 
      SET completion_percentage = $1, updated_at = NOW()
      WHERE id = $2 AND is_active = true
    `;
    await db.query(query, [completionPercentage, wbsId]);
  }

  // 更新實際工時
  async updateActualHours(wbsId: string, actualHours: number): Promise<void> {
    const query = `
      UPDATE wbs_items 
      SET actual_hours = $1, updated_at = NOW()
      WHERE id = $2 AND is_active = true
    `;
    await db.query(query, [actualHours, wbsId]);
  }

  // 計算專案總進度 (根據 WBS 項目)
  async calculateProjectProgress(projectId: string): Promise<number> {
    const query = `
      SELECT 
        AVG(completion_percentage) as avg_progress,
        SUM(estimated_hours) as total_estimated,
        SUM(actual_hours) as total_actual
      FROM wbs_items 
      WHERE project_id = $1 AND is_active = true
    `;
    const result = await db.queryOne<{
      avg_progress: number;
      total_estimated: number;
      total_actual: number;
    }>(query, [projectId]);

    return result?.avg_progress || 0;
  }

  // 獲取 WBS 統計
  async getWBSStats(projectId: string): Promise<{
    totalItems: number;
    completedItems: number;
    inProgressItems: number;
    notStartedItems: number;
    overdueItems: number;
    totalEstimatedHours: number;
    totalActualHours: number;
    averageCompletion: number;
    itemsByStatus: Record<WBSStatus, number>;
    itemsByPriority: Record<WBSPriority, number>;
  }> {
    const queries = [
      // 總項目數
      'SELECT COUNT(*) as total FROM wbs_items WHERE project_id = $1 AND is_active = true',
      
      // 已完成項目數
      'SELECT COUNT(*) as completed FROM wbs_items WHERE project_id = $1 AND status = \'completed\' AND is_active = true',
      
      // 進行中項目數
      'SELECT COUNT(*) as in_progress FROM wbs_items WHERE project_id = $1 AND status = \'in_progress\' AND is_active = true',
      
      // 未開始項目數
      'SELECT COUNT(*) as not_started FROM wbs_items WHERE project_id = $1 AND status = \'not_started\' AND is_active = true',
      
      // 逾期項目數
      `SELECT COUNT(*) as overdue FROM wbs_items 
       WHERE project_id = $1 AND end_date < CURRENT_DATE 
       AND status NOT IN ('completed', 'cancelled') AND is_active = true`,
      
      // 工時統計
      `SELECT 
         SUM(estimated_hours) as total_estimated,
         SUM(actual_hours) as total_actual,
         AVG(completion_percentage) as avg_completion
       FROM wbs_items WHERE project_id = $1 AND is_active = true`,
      
      // 按狀態分組
      'SELECT status, COUNT(*) as count FROM wbs_items WHERE project_id = $1 AND is_active = true GROUP BY status',
      
      // 按優先級分組
      'SELECT priority, COUNT(*) as count FROM wbs_items WHERE project_id = $1 AND is_active = true GROUP BY priority'
    ];

    const [
      totalResult,
      completedResult,
      inProgressResult,
      notStartedResult,
      overdueResult,
      hoursResult,
      statusResults,
      priorityResults
    ] = await Promise.all(
      queries.map(query => 
        query.includes('GROUP BY') ? 
          db.query<{ [key: string]: any }>(query, [projectId]) :
          db.queryOne<{ [key: string]: number }>(query, [projectId])
      )
    );

    const itemsByStatus = {} as Record<WBSStatus, number>;
    (statusResults as any[]).forEach((result: any) => {
      itemsByStatus[result.status as WBSStatus] = result.count;
    });

    const itemsByPriority = {} as Record<WBSPriority, number>;
    (priorityResults as any[]).forEach((result: any) => {
      itemsByPriority[result.priority as WBSPriority] = result.count;
    });

    return {
      totalItems: (totalResult as any)?.total || 0,
      completedItems: (completedResult as any)?.completed || 0,
      inProgressItems: (inProgressResult as any)?.in_progress || 0,
      notStartedItems: (notStartedResult as any)?.not_started || 0,
      overdueItems: (overdueResult as any)?.overdue || 0,
      totalEstimatedHours: (hoursResult as any)?.total_estimated || 0,
      totalActualHours: (hoursResult as any)?.total_actual || 0,
      averageCompletion: (hoursResult as any)?.avg_completion || 0,
      itemsByStatus,
      itemsByPriority
    };
  }

  // 移動 WBS 項目 (重新指定父節點)
  async moveItem(itemId: string, newParentId?: string): Promise<void> {
    await db.transaction(async (client) => {
      // 獲取原始項目信息
      const item = await this.findById(itemId);
      if (!item) throw new Error('WBS 項目不存在');

      // 計算新的層級
      let newLevel = 1;
      if (newParentId) {
        const parent = await this.findById(newParentId);
        if (!parent) throw new Error('父節點不存在');
        newLevel = parent.level + 1;
      }

      // 更新項目
      await client.query(`
        UPDATE wbs_items 
        SET parent_id = $1, level = $2, updated_at = NOW()
        WHERE id = $3
      `, [newParentId, newLevel, itemId]);

      // 遞迴更新所有子項目的層級
      await this.updateChildLevels(client, itemId, newLevel);
    });
  }

  // 遞迴更新子項目層級
  private async updateChildLevels(client: any, parentId: string, parentLevel: number): Promise<void> {
    const children = await client.query(
      'SELECT id FROM wbs_items WHERE parent_id = $1 AND is_active = true',
      [parentId]
    );

    const newChildLevel = parentLevel + 1;
    
    for (const child of children.rows) {
      await client.query(`
        UPDATE wbs_items 
        SET level = $1, updated_at = NOW()
        WHERE id = $2
      `, [newChildLevel, child.id]);

      // 遞迴更新孫子項目
      await this.updateChildLevels(client, child.id, newChildLevel);
    }
  }

  // 刪除 WBS 項目及其所有子項目
  async deleteWithChildren(itemId: string): Promise<void> {
    await db.transaction(async (client) => {
      // 遞迴標記刪除所有子項目
      await this.markChildrenAsDeleted(client, itemId);
      
      // 標記主項目為已刪除
      await client.query(`
        UPDATE wbs_items 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `, [itemId]);
    });
  }

  // 遞迴標記子項目為已刪除
  private async markChildrenAsDeleted(client: any, parentId: string): Promise<void> {
    const children = await client.query(
      'SELECT id FROM wbs_items WHERE parent_id = $1 AND is_active = true',
      [parentId]
    );

    for (const child of children.rows) {
      // 先處理孫子項目
      await this.markChildrenAsDeleted(client, child.id);
      
      // 標記子項目為已刪除
      await client.query(`
        UPDATE wbs_items 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `, [child.id]);
    }
  }
}