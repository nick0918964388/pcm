import { BaseRepository, FindOptions } from '../database/base-repository';
import { DutySchedule, ShiftType, DutyStatus, UrgencyLevel, DutyScheduleQueryParams } from '../types/database';
import { QueryBuilder } from '../database/query-builder';
import { db } from '../database/connection';

export class DutyScheduleRepository extends BaseRepository<DutySchedule> {
  constructor() {
    super('duty_schedules', 'id', ['notes']);
  }

  mapFromDB(row: any): DutySchedule {
    return {
      id: row.id,
      project_id: row.project_id,
      person_id: row.person_id,
      duty_date: row.duty_date,
      shift_type: row.shift_type as ShiftType,
      work_area: row.work_area,
      status: row.status as DutyStatus,
      urgency_level: row.urgency_level as UrgencyLevel,
      notes: row.notes,
      check_in_time: row.check_in_time,
      check_out_time: row.check_out_time,
      replacement_person_id: row.replacement_person_id,
      replacement_reason: row.replacement_reason,
      created_by: row.created_by,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  mapToDB(entity: Partial<DutySchedule>): Record<string, any> {
    const mapped: Record<string, any> = {};
    
    if (entity.project_id !== undefined) mapped.project_id = entity.project_id;
    if (entity.person_id !== undefined) mapped.person_id = entity.person_id;
    if (entity.duty_date !== undefined) mapped.duty_date = entity.duty_date;
    if (entity.shift_type !== undefined) mapped.shift_type = entity.shift_type;
    if (entity.work_area !== undefined) mapped.work_area = entity.work_area;
    if (entity.status !== undefined) mapped.status = entity.status;
    if (entity.urgency_level !== undefined) mapped.urgency_level = entity.urgency_level;
    if (entity.notes !== undefined) mapped.notes = entity.notes;
    if (entity.check_in_time !== undefined) mapped.check_in_time = entity.check_in_time;
    if (entity.check_out_time !== undefined) mapped.check_out_time = entity.check_out_time;
    if (entity.replacement_person_id !== undefined) mapped.replacement_person_id = entity.replacement_person_id;
    if (entity.replacement_reason !== undefined) mapped.replacement_reason = entity.replacement_reason;
    if (entity.created_by !== undefined) mapped.created_by = entity.created_by;
    if (entity.approved_by !== undefined) mapped.approved_by = entity.approved_by;
    if (entity.approved_at !== undefined) mapped.approved_at = entity.approved_at;
    if (entity.metadata !== undefined) {
      mapped.metadata = JSON.stringify(entity.metadata);
    }
    if (entity.is_active !== undefined) mapped.is_active = entity.is_active;

    return mapped;
  }

  // 查找特定專案的排班記錄
  async findByProjectId(projectId: string, options: FindOptions = {}): Promise<DutySchedule[]> {
    const filters = { project_id: projectId, ...(options.filters || {}) };
    const result = await this.findAll({ 
      ...options, 
      filters,
      sortBy: 'duty_date',
      sortOrder: 'DESC'
    });
    return result.data;
  }

  // 查找特定人員的排班記錄
  async findByPersonId(personId: string, options: FindOptions = {}): Promise<DutySchedule[]> {
    const filters = { person_id: personId, ...(options.filters || {}) };
    const result = await this.findAll({ 
      ...options, 
      filters,
      sortBy: 'duty_date',
      sortOrder: 'DESC'
    });
    return result.data;
  }

  // 根據日期範圍查找排班記錄
  async findByDateRange(startDate: Date, endDate: Date, projectId?: string): Promise<DutySchedule[]> {
    let query = `
      SELECT ds.*, dp.name as person_name, v.name as vendor_name
      FROM duty_schedules ds
      LEFT JOIN duty_persons dp ON ds.person_id = dp.id
      LEFT JOIN vendors v ON dp.vendor_id = v.id
      WHERE ds.duty_date BETWEEN $1 AND $2 AND ds.is_active = true
    `;
    const params = [startDate, endDate];

    if (projectId) {
      query += ` AND ds.project_id = $3`;
      params.push(projectId);
    }

    query += ` ORDER BY ds.duty_date ASC, ds.shift_type ASC`;

    const rows = await db.query(query, params);
    return rows.map(row => this.mapFromDB(row));
  }

  // 查找當前值班人員
  async findCurrentDuty(projectId?: string): Promise<DutySchedule[]> {
    let query = `
      SELECT ds.*, dp.name as person_name, v.name as vendor_name
      FROM duty_schedules ds
      LEFT JOIN duty_persons dp ON ds.person_id = dp.id
      LEFT JOIN vendors v ON dp.vendor_id = v.id
      WHERE ds.status = '值班中' 
      AND ds.duty_date = CURRENT_DATE 
      AND ds.is_active = true
    `;
    const params: any[] = [];

    if (projectId) {
      query += ` AND ds.project_id = $1`;
      params.push(projectId);
    }

    query += ` ORDER BY ds.shift_type ASC`;

    const rows = await db.query(query, params);
    return rows.map(row => this.mapFromDB(row));
  }

  // 檢查排班衝突
  async checkScheduleConflict(
    personId: string, 
    dutyDate: Date, 
    shiftType: ShiftType,
    excludeScheduleId?: string
  ): Promise<DutySchedule[]> {
    let query = `
      SELECT * FROM duty_schedules 
      WHERE person_id = $1 
      AND duty_date = $2 
      AND shift_type = $3
      AND status NOT IN ('取消', '請假')
      AND is_active = true
    `;
    const params = [personId, dutyDate, shiftType];

    if (excludeScheduleId) {
      query += ` AND id != $4`;
      params.push(excludeScheduleId);
    }

    const rows = await db.query(query, params);
    return rows.map(row => this.mapFromDB(row));
  }

  // 查找需要代班的記錄
  async findReplacementNeeded(projectId?: string): Promise<DutySchedule[]> {
    let query = `
      SELECT ds.*, dp.name as person_name
      FROM duty_schedules ds
      LEFT JOIN duty_persons dp ON ds.person_id = dp.id
      WHERE ds.status = '請假' 
      AND ds.replacement_person_id IS NULL
      AND ds.duty_date >= CURRENT_DATE
      AND ds.is_active = true
    `;
    const params: any[] = [];

    if (projectId) {
      query += ` AND ds.project_id = $1`;
      params.push(projectId);
    }

    query += ` ORDER BY ds.duty_date ASC`;

    const rows = await db.query(query, params);
    return rows.map(row => this.mapFromDB(row));
  }

  // 查找緊急排班
  async findUrgentSchedules(projectId?: string): Promise<DutySchedule[]> {
    let query = `
      SELECT ds.*, dp.name as person_name
      FROM duty_schedules ds
      LEFT JOIN duty_persons dp ON ds.person_id = dp.id
      WHERE ds.urgency_level IN ('緊急', '危急')
      AND ds.status != '已完成'
      AND ds.is_active = true
    `;
    const params: any[] = [];

    if (projectId) {
      query += ` AND ds.project_id = $1`;
      params.push(projectId);
    }

    query += ` ORDER BY 
      CASE ds.urgency_level 
        WHEN '危急' THEN 1 
        WHEN '緊急' THEN 2 
        ELSE 3 
      END,
      ds.duty_date ASC`;

    const rows = await db.query(query, params);
    return rows.map(row => this.mapFromDB(row));
  }

  // 更新排班狀態
  async updateStatus(scheduleId: string, status: DutyStatus, updatedBy?: string): Promise<void> {
    const query = `
      UPDATE duty_schedules 
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND is_active = true
    `;
    await db.query(query, [status, scheduleId]);

    // 記錄狀態變更
    if (updatedBy) {
      await this.logStatusChange(scheduleId, status, updatedBy);
    }
  }

  // 簽到
  async checkIn(scheduleId: string, checkInTime?: Date): Promise<void> {
    const query = `
      UPDATE duty_schedules 
      SET status = '值班中', 
          check_in_time = $1, 
          updated_at = NOW()
      WHERE id = $2 AND is_active = true
    `;
    await db.query(query, [checkInTime || new Date(), scheduleId]);
  }

  // 簽退
  async checkOut(scheduleId: string, checkOutTime?: Date): Promise<void> {
    const query = `
      UPDATE duty_schedules 
      SET status = '已完成', 
          check_out_time = $1, 
          updated_at = NOW()
      WHERE id = $2 AND is_active = true
    `;
    await db.query(query, [checkOutTime || new Date(), scheduleId]);
  }

  // 設定代班人員
  async setReplacement(
    scheduleId: string, 
    replacementPersonId: string, 
    reason: string,
    updatedBy: string
  ): Promise<void> {
    await db.transaction(async (client) => {
      // 更新原排班記錄
      await client.query(`
        UPDATE duty_schedules 
        SET replacement_person_id = $1, 
            replacement_reason = $2,
            status = '代班',
            updated_at = NOW()
        WHERE id = $3
      `, [replacementPersonId, reason, scheduleId]);

      // 創建代班記錄
      const original = await this.findById(scheduleId);
      if (original) {
        await client.query(`
          INSERT INTO duty_schedules (
            project_id, person_id, duty_date, shift_type, work_area,
            status, urgency_level, notes, created_by, is_active,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, '已排班', $6, $7, $8, true, NOW(), NOW()
          )
        `, [
          original.project_id, replacementPersonId, original.duty_date,
          original.shift_type, original.work_area, original.urgency_level,
          `代班 - ${reason}`, updatedBy
        ]);
      }
    });
  }

  // 批准排班
  async approveSchedule(scheduleId: string, approvedBy: string): Promise<void> {
    const query = `
      UPDATE duty_schedules 
      SET approved_by = $1, 
          approved_at = NOW(), 
          updated_at = NOW()
      WHERE id = $2 AND is_active = true
    `;
    await db.query(query, [approvedBy, scheduleId]);
  }

  // 獲取排班統計
  async getScheduleStats(projectId?: string, dateFrom?: Date, dateTo?: Date): Promise<{
    totalSchedules: number;
    completedSchedules: number;
    cancelledSchedules: number;
    onDutySchedules: number;
    pendingApprovalSchedules: number;
    replacementNeeded: number;
    schedulesByStatus: Record<DutyStatus, number>;
    schedulesByShift: Record<ShiftType, number>;
    schedulesByUrgency: Record<UrgencyLevel, number>;
    averageWorkHours: number;
  }> {
    const whereClause = this.buildStatsWhereClause(projectId, dateFrom, dateTo);
    const params = this.buildStatsParams(projectId, dateFrom, dateTo);

    const queries = [
      `SELECT COUNT(*) as total FROM duty_schedules WHERE ${whereClause}`,
      `SELECT COUNT(*) as completed FROM duty_schedules WHERE ${whereClause} AND status = '已完成'`,
      `SELECT COUNT(*) as cancelled FROM duty_schedules WHERE ${whereClause} AND status = '取消'`,
      `SELECT COUNT(*) as on_duty FROM duty_schedules WHERE ${whereClause} AND status = '值班中'`,
      `SELECT COUNT(*) as pending FROM duty_schedules WHERE ${whereClause} AND approved_by IS NULL`,
      `SELECT COUNT(*) as replacement FROM duty_schedules WHERE ${whereClause} AND status = '請假' AND replacement_person_id IS NULL`,
      `SELECT status, COUNT(*) as count FROM duty_schedules WHERE ${whereClause} GROUP BY status`,
      `SELECT shift_type, COUNT(*) as count FROM duty_schedules WHERE ${whereClause} GROUP BY shift_type`,
      `SELECT urgency_level, COUNT(*) as count FROM duty_schedules WHERE ${whereClause} GROUP BY urgency_level`,
      `SELECT AVG(
         CASE WHEN check_in_time IS NOT NULL AND check_out_time IS NOT NULL
         THEN EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600
         ELSE NULL END
       ) as avg_hours FROM duty_schedules WHERE ${whereClause}`
    ];

    const results = await Promise.all(
      queries.map(query => 
        query.includes('GROUP BY') ?
          db.query<{ [key: string]: any }>(query, params) :
          db.queryOne<{ [key: string]: number }>(query, params)
      )
    );

    const schedulesByStatus = {} as Record<DutyStatus, number>;
    (results[6] as any[]).forEach((result: any) => {
      schedulesByStatus[result.status as DutyStatus] = result.count;
    });

    const schedulesByShift = {} as Record<ShiftType, number>;
    (results[7] as any[]).forEach((result: any) => {
      schedulesByShift[result.shift_type as ShiftType] = result.count;
    });

    const schedulesByUrgency = {} as Record<UrgencyLevel, number>;
    (results[8] as any[]).forEach((result: any) => {
      schedulesByUrgency[result.urgency_level as UrgencyLevel] = result.count;
    });

    return {
      totalSchedules: (results[0] as any)?.total || 0,
      completedSchedules: (results[1] as any)?.completed || 0,
      cancelledSchedules: (results[2] as any)?.cancelled || 0,
      onDutySchedules: (results[3] as any)?.on_duty || 0,
      pendingApprovalSchedules: (results[4] as any)?.pending || 0,
      replacementNeeded: (results[5] as any)?.replacement || 0,
      schedulesByStatus,
      schedulesByShift,
      schedulesByUrgency,
      averageWorkHours: (results[9] as any)?.avg_hours || 0
    };
  }

  private buildStatsWhereClause(projectId?: string, dateFrom?: Date, dateTo?: Date): string {
    let clause = 'is_active = true';
    
    if (projectId) clause += ` AND project_id = $${this.getParamIndex(1, projectId, dateFrom, dateTo)}`;
    if (dateFrom) clause += ` AND duty_date >= $${this.getParamIndex(2, projectId, dateFrom, dateTo)}`;
    if (dateTo) clause += ` AND duty_date <= $${this.getParamIndex(3, projectId, dateFrom, dateTo)}`;
    
    return clause;
  }

  private buildStatsParams(projectId?: string, dateFrom?: Date, dateTo?: Date): any[] {
    const params: any[] = [];
    if (projectId) params.push(projectId);
    if (dateFrom) params.push(dateFrom);
    if (dateTo) params.push(dateTo);
    return params;
  }

  private getParamIndex(baseIndex: number, projectId?: string, dateFrom?: Date, dateTo?: Date): number {
    let index = 0;
    if (projectId) index++;
    if (baseIndex === 1) return index;
    if (dateFrom) index++;
    if (baseIndex === 2) return index;
    if (dateTo) index++;
    return index;
  }

  // 記錄狀態變更
  private async logStatusChange(scheduleId: string, newStatus: DutyStatus, updatedBy: string): Promise<void> {
    // 這裡可以實作審計日誌功能
    console.log(`Schedule ${scheduleId} status changed to ${newStatus} by ${updatedBy}`);
  }

  // 自訂篩選條件處理
  protected applyFilters(builder: QueryBuilder, filters: Record<string, any>): void {
    super.applyFilters(builder, filters);

    // 特殊篩選條件
    if (filters.shiftTypes && Array.isArray(filters.shiftTypes)) {
      builder.whereIn('shift_type', filters.shiftTypes);
    }

    if (filters.statuses && Array.isArray(filters.statuses)) {
      builder.whereIn('status', filters.statuses);
    }

    if (filters.urgencyLevels && Array.isArray(filters.urgencyLevels)) {
      builder.whereIn('urgency_level', filters.urgencyLevels);
    }

    if (filters.workAreas && Array.isArray(filters.workAreas)) {
      builder.whereIn('work_area', filters.workAreas);
    }

    if (filters.currentOnly) {
      builder.where('duty_date = CURRENT_DATE');
      builder.where('status = ?', '值班中');
    }

    if (filters.includeReplacements === false) {
      builder.where('replacement_person_id IS NULL');
    }

    if (filters.pendingApproval) {
      builder.where('approved_by IS NULL');
    }

    if (filters.hasReplacement) {
      builder.where('replacement_person_id IS NOT NULL');
    }
  }
}