/**
 * Task 4.1: Oracle Project Repository
 *
 * GREEN階段：實作Project Repository整合Oracle資料庫
 */

import { OracleBaseRepository } from '../database/oracle-base-repository';
import { OracleQueryExecutor } from '../database/oracle-query-executor';
import {
  OracleQueryOptions,
  OraclePaginationOptions,
  OraclePaginationResult,
  OracleJsonQueryOptions,
} from '../database/oracle-repository-types';
import { Project, ProjectStatus, ProjectType } from '../types/database';
import { getOracleConnection } from '../database/oracle-connection';

export class OracleProjectRepository extends OracleBaseRepository<Project> {
  constructor() {
    // 延遲初始化Oracle連線，避免在模組載入時就建立連線
    super('PROJECTS', undefined, {
      tableName: 'PROJECTS',
      primaryKey: 'ID',
      schema: 'PCM',
      enableSoftDelete: true,
      softDeleteColumn: 'DELETED_AT',
      enableAuditColumns: true,
      auditColumns: {
        createdAt: 'CREATED_AT',
        updatedAt: 'UPDATED_AT',
      },
    });
  }

  /**
   * 延遲初始化查詢執行器
   */
  private getQueryExecutor(): OracleQueryExecutor {
    if (!this.queryExecutor) {
      const oracleConnection = getOracleConnection();
      this.queryExecutor = new OracleQueryExecutor(oracleConnection);
    }
    return this.queryExecutor;
  }

  /**
   * 將Oracle資料庫記錄映射為Project實體
   */
  protected mapFromOracle(row: any): Project {
    return {
      id: row.ID,
      name: row.NAME,
      description: row.DESCRIPTION,
      status: row.STATUS as ProjectStatus,
      type: row.TYPE as ProjectType,
      priority: row.PRIORITY ? Number(row.PRIORITY) : 1,
      start_date: row.START_DATE ? new Date(row.START_DATE) : undefined,
      end_date: row.END_DATE ? new Date(row.END_DATE) : undefined,
      budget: row.BUDGET ? Number(row.BUDGET) : undefined,
      progress: row.PROGRESS ? Number(row.PROGRESS) : 0,
      manager_id: row.MANAGER_ID,

      // Oracle JSON處理
      client_info: row.CLIENT_INFO
        ? this.parseOracleJson(row.CLIENT_INFO)
        : null,
      metadata: row.METADATA ? this.parseOracleJson(row.METADATA) : null,

      is_active: row.IS_ACTIVE === 1 || row.IS_ACTIVE === '1',
      created_at: row.CREATED_AT ? new Date(row.CREATED_AT) : new Date(),
      updated_at: row.UPDATED_AT ? new Date(row.UPDATED_AT) : new Date(),
    };
  }

  /**
   * 將Project實體映射為Oracle資料庫記錄
   */
  protected mapToOracle(entity: Partial<Project>): Record<string, any> {
    const mapped: Record<string, any> = {};

    if (entity.id !== undefined) mapped.ID = entity.id;
    if (entity.name !== undefined) mapped.NAME = entity.name;
    if (entity.description !== undefined)
      mapped.DESCRIPTION = entity.description;
    if (entity.status !== undefined) mapped.STATUS = entity.status;
    if (entity.type !== undefined) mapped.TYPE = entity.type;
    if (entity.priority !== undefined) mapped.PRIORITY = entity.priority;
    if (entity.start_date !== undefined) mapped.START_DATE = entity.start_date;
    if (entity.end_date !== undefined) mapped.END_DATE = entity.end_date;
    if (entity.budget !== undefined) mapped.BUDGET = entity.budget;
    if (entity.progress !== undefined) mapped.PROGRESS = entity.progress;
    if (entity.manager_id !== undefined) mapped.MANAGER_ID = entity.manager_id;

    // Oracle JSON處理
    if (entity.client_info !== undefined) {
      mapped.CLIENT_INFO = this.stringifyOracleJson(entity.client_info);
    }
    if (entity.metadata !== undefined) {
      mapped.METADATA = this.stringifyOracleJson(entity.metadata);
    }

    if (entity.is_active !== undefined)
      mapped.IS_ACTIVE = entity.is_active ? 1 : 0;

    return mapped;
  }

  /**
   * 根據項目代碼查找項目（支援VARCHAR2格式）
   */
  async findByProjectCode(
    code: string,
    options: OracleQueryOptions = {}
  ): Promise<Project | null> {
    const sql = `
      SELECT * FROM ${this.getTableName()}
      WHERE ID = :code
      AND ${this.config.softDeleteColumn} IS NULL
    `;

    const queryExecutor = this.getQueryExecutor();
    const result = await queryExecutor.execute(sql, { code }, options);
    return result.rows && result.rows.length > 0
      ? this.mapFromOracle(result.rows[0])
      : null;
  }

  /**
   * 根據狀態查找項目（使用Oracle語法）
   */
  async findByStatus(
    status: ProjectStatus,
    options: OraclePaginationOptions
  ): Promise<OraclePaginationResult<Project>> {
    const criteria = { STATUS: status };
    return await this.paginate(options, criteria);
  }

  /**
   * 根據類型查找項目
   */
  async findByType(
    type: ProjectType,
    options: OraclePaginationOptions
  ): Promise<OraclePaginationResult<Project>> {
    const criteria = { TYPE: type };
    return await this.paginate(options, criteria);
  }

  /**
   * 使用Oracle JSON查詢功能查找項目
   */
  async findByMetadata(
    jsonPath: string,
    value: any,
    options: OracleQueryOptions = {}
  ): Promise<Project[]> {
    const jsonOptions: OracleJsonQueryOptions = {
      path: `metadata.${jsonPath}`,
      operator: 'VALUE',
      value,
    };

    return await this.findByJson(jsonOptions, options);
  }

  /**
   * 更新項目的metadata JSON欄位
   */
  async updateMetadata(
    id: string,
    metadataPath: string,
    value: any,
    options: OracleQueryOptions = {}
  ): Promise<Project> {
    return await this.updateJson(
      id,
      `metadata.${metadataPath}`,
      value,
      options
    );
  }

  /**
   * 查找逾期項目（使用Oracle日期函數）
   */
  async findOverdueProjects(
    options: OracleQueryOptions = {}
  ): Promise<Project[]> {
    const sql = `
      SELECT * FROM ${this.getTableName()}
      WHERE ${this.config.softDeleteColumn} IS NULL
      AND END_DATE < SYSDATE
      AND STATUS IN ('planning', 'active', 'on_hold')
      ORDER BY END_DATE ASC
    `;

    const queryExecutor = this.getQueryExecutor();
    const result = await queryExecutor.execute(sql, {}, options);
    return result.rows ? result.rows.map(row => this.mapFromOracle(row)) : [];
  }

  /**
   * 查找即將到期的項目
   */
  async findUpcomingDeadlines(
    days: number = 7,
    options: OracleQueryOptions = {}
  ): Promise<Project[]> {
    const sql = `
      SELECT * FROM ${this.getTableName()}
      WHERE ${this.config.softDeleteColumn} IS NULL
      AND END_DATE BETWEEN SYSDATE AND (SYSDATE + :days)
      AND STATUS IN ('planning', 'active')
      ORDER BY END_DATE ASC
    `;

    const queryExecutor = this.getQueryExecutor();
    const result = await queryExecutor.execute(sql, { days }, options);
    return result.rows ? result.rows.map(row => this.mapFromOracle(row)) : [];
  }

  /**
   * 更新項目進度（使用Oracle TIMESTAMP）
   */
  async updateProgress(
    projectId: string,
    progress: number,
    options: OracleQueryOptions = {}
  ): Promise<boolean> {
    const sql = `
      UPDATE ${this.getTableName()}
      SET PROGRESS = :progress, UPDATED_AT = SYSTIMESTAMP
      WHERE ID = :projectId
      AND ${this.config.softDeleteColumn} IS NULL
    `;

    const queryExecutor = this.getQueryExecutor();
    const result = await queryExecutor.execute(
      sql,
      { progress, projectId },
      options
    );
    return (result.rows?.length || 0) > 0;
  }

  /**
   * 更新項目狀態
   */
  async updateStatus(
    projectId: string,
    status: ProjectStatus,
    options: OracleQueryOptions = {}
  ): Promise<boolean> {
    const sql = `
      UPDATE ${this.getTableName()}
      SET STATUS = :status, UPDATED_AT = SYSTIMESTAMP
      WHERE ID = :projectId
      AND ${this.config.softDeleteColumn} IS NULL
    `;

    const queryExecutor = this.getQueryExecutor();
    const result = await queryExecutor.execute(
      sql,
      { status, projectId },
      options
    );
    return (result.rows?.length || 0) > 0;
  }

  /**
   * 獲取項目統計（使用Oracle聚合函數）
   */
  async getProjectStats(options: OracleQueryOptions = {}): Promise<{
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    overdueProjects: number;
    averageProgress: number;
    projectsByStatus: Record<ProjectStatus, number>;
    projectsByType: Record<ProjectType, number>;
  }> {
    // 基本統計查詢
    const basicStatsSQL = `
      SELECT
        COUNT(*) as total_projects,
        COUNT(CASE WHEN STATUS = 'active' THEN 1 END) as active_projects,
        COUNT(CASE WHEN STATUS = 'completed' THEN 1 END) as completed_projects,
        COUNT(CASE WHEN END_DATE < SYSDATE AND STATUS IN ('planning', 'active', 'on_hold') THEN 1 END) as overdue_projects,
        AVG(PROGRESS) as average_progress
      FROM ${this.getTableName()}
      WHERE ${this.config.softDeleteColumn} IS NULL
    `;

    // 按狀態分組統計
    const statusStatsSQL = `
      SELECT STATUS, COUNT(*) as count
      FROM ${this.getTableName()}
      WHERE ${this.config.softDeleteColumn} IS NULL
      GROUP BY STATUS
    `;

    // 按類型分組統計
    const typeStatsSQL = `
      SELECT TYPE, COUNT(*) as count
      FROM ${this.getTableName()}
      WHERE ${this.config.softDeleteColumn} IS NULL
      GROUP BY TYPE
    `;

    const queryExecutor = this.getQueryExecutor();
    const [basicStats, statusStats, typeStats] = await Promise.all([
      queryExecutor.execute(basicStatsSQL, {}, options),
      queryExecutor.execute(statusStatsSQL, {}, options),
      queryExecutor.execute(typeStatsSQL, {}, options),
    ]);

    const basic = basicStats.rows?.[0] || {};

    const projectsByStatus = {} as Record<ProjectStatus, number>;
    statusStats.rows?.forEach((row: any) => {
      projectsByStatus[row.STATUS as ProjectStatus] = Number(row.COUNT) || 0;
    });

    const projectsByType = {} as Record<ProjectType, number>;
    typeStats.rows?.forEach((row: any) => {
      projectsByType[row.TYPE as ProjectType] = Number(row.COUNT) || 0;
    });

    return {
      totalProjects: Number(basic.TOTAL_PROJECTS) || 0,
      activeProjects: Number(basic.ACTIVE_PROJECTS) || 0,
      completedProjects: Number(basic.COMPLETED_PROJECTS) || 0,
      overdueProjects: Number(basic.OVERDUE_PROJECTS) || 0,
      averageProgress: Number(basic.AVERAGE_PROGRESS) || 0,
      projectsByStatus,
      projectsByType,
    };
  }

  /**
   * 使用Oracle MERGE語句進行Upsert操作
   */
  async upsertProject(
    project: Partial<Project>,
    options: OracleQueryOptions = {}
  ): Promise<Project> {
    if (!project.id) {
      throw new Error('Project ID is required for upsert operation');
    }

    return await this.merge(project, ['ID'], options);
  }

  // 私有輔助方法

  /**
   * 解析Oracle JSON資料
   */
  private parseOracleJson(jsonData: any): any {
    if (!jsonData) return null;

    try {
      if (typeof jsonData === 'string') {
        return JSON.parse(jsonData);
      }
      return jsonData;
    } catch (error) {
      console.warn('Failed to parse Oracle JSON data:', error);
      return null;
    }
  }

  /**
   * 轉換為Oracle JSON格式
   */
  private stringifyOracleJson(data: any): string | null {
    if (data === null || data === undefined) return null;

    try {
      return typeof data === 'string' ? data : JSON.stringify(data);
    } catch (error) {
      console.warn('Failed to stringify Oracle JSON data:', error);
      return null;
    }
  }
}
