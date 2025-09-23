import { BaseRepository, FindOptions } from '../database/base-repository';
import { Vendor, VendorType, VendorStatus, DutyPerson } from '../types/database';
import { QueryBuilder } from '../database/query-builder';
import { db } from '../database/connection';

export class VendorRepository extends BaseRepository<Vendor> {
  constructor() {
    super('vendors', 'id', ['name', 'contact_person', 'phone', 'email']);
  }

  mapFromDB(row: any): Vendor {
    // Oracle 返回大寫欄位名，需要處理兩種情況
    return {
      id: row.ID || row.id,
      name: row.NAME || row.name,
      type: (row.VENDOR_TYPE || row.vendor_type || row.TYPE || row.type) as VendorType,
      status: (row.STATUS || row.status) as VendorStatus,
      contact_person: row.CONTACT_PERSON || row.contact_person,
      phone: row.PHONE || row.phone,
      email: row.EMAIL || row.email,
      address: row.ADDRESS || row.address,
      contract_start: row.CONTRACT_START || row.contract_start,
      contract_end: row.CONTRACT_END || row.contract_end,
      rating: parseFloat(row.RATING || row.rating) || 0,
      metadata: (row.METADATA || row.metadata) ? JSON.parse(row.METADATA || row.metadata) : null,
      is_active: row.IS_ACTIVE !== undefined ? row.IS_ACTIVE : row.is_active,
      created_at: row.CREATED_AT || row.created_at,
      updated_at: row.UPDATED_AT || row.updated_at,
    };
  }

  mapToDB(entity: Partial<Vendor>): Record<string, any> {
    const mapped: Record<string, any> = {};
    
    if (entity.name !== undefined) mapped.name = entity.name;
    if (entity.type !== undefined) mapped.type = entity.type;
    if (entity.status !== undefined) mapped.status = entity.status;
    if (entity.contact_person !== undefined) mapped.contact_person = entity.contact_person;
    if (entity.phone !== undefined) mapped.phone = entity.phone;
    if (entity.email !== undefined) mapped.email = entity.email;
    if (entity.address !== undefined) mapped.address = entity.address;
    if (entity.contract_start !== undefined) mapped.contract_start = entity.contract_start;
    if (entity.contract_end !== undefined) mapped.contract_end = entity.contract_end;
    if (entity.rating !== undefined) mapped.rating = entity.rating;
    if (entity.metadata !== undefined) {
      mapped.metadata = JSON.stringify(entity.metadata);
    }
    if (entity.is_active !== undefined) mapped.is_active = entity.is_active;

    return mapped;
  }

  // 根據類型查找廠商
  async findByType(type: VendorType, options: FindOptions = {}): Promise<Vendor[]> {
    const filters = { type, ...(options.filters || {}) };
    const result = await this.findAll({ ...options, filters });
    return result.data;
  }

  // 根據狀態查找廠商
  async findByStatus(status: VendorStatus, options: FindOptions = {}): Promise<Vendor[]> {
    const filters = { status, ...(options.filters || {}) };
    const result = await this.findAll({ ...options, filters });
    return result.data;
  }

  // 查找活躍廠商
  async findActiveVendors(options: FindOptions = {}): Promise<Vendor[]> {
    const filters = { status: 'active', ...(options.filters || {}) };
    const result = await this.findAll({ ...options, filters });
    return result.data;
  }

  // 查找即將到期的合約
  async findExpiringContracts(days = 30): Promise<Vendor[]> {
    const query = `
      SELECT * FROM vendors 
      WHERE contract_end BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '${days} days')
      AND status = 'active'
      AND is_active = true
      ORDER BY contract_end ASC
    `;
    const rows = await db.query(query);
    return rows.map(row => this.mapFromDB(row));
  }

  // 查找已過期的合約
  async findExpiredContracts(): Promise<Vendor[]> {
    const query = `
      SELECT * FROM vendors 
      WHERE contract_end < CURRENT_DATE
      AND status = 'active'
      AND is_active = true
      ORDER BY contract_end ASC
    `;
    const rows = await db.query(query);
    return rows.map(row => this.mapFromDB(row));
  }

  // 根據評分範圍查找廠商
  async findByRatingRange(minRating: number, maxRating: number): Promise<Vendor[]> {
    const query = `
      SELECT * FROM vendors 
      WHERE rating BETWEEN $1 AND $2
      AND is_active = true
      ORDER BY rating DESC
    `;
    const rows = await db.query(query, [minRating, maxRating]);
    return rows.map(row => this.mapFromDB(row));
  }

  // 更新廠商評分
  async updateRating(vendorId: string, rating: number): Promise<void> {
    if (rating < 1 || rating > 5) {
      throw new Error('評分必須在 1-5 之間');
    }

    const query = `
      UPDATE vendors 
      SET rating = $1, updated_at = NOW()
      WHERE id = $2 AND is_active = true
    `;
    await db.query(query, [rating, vendorId]);
  }

  // 更新廠商狀態
  async updateStatus(vendorId: string, status: VendorStatus): Promise<void> {
    const query = `
      UPDATE vendors 
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND is_active = true
    `;
    await db.query(query, [status, vendorId]);
  }

  // 續約
  async renewContract(vendorId: string, newEndDate: Date): Promise<void> {
    const query = `
      UPDATE vendors 
      SET contract_end = $1, 
          status = 'active',
          updated_at = NOW()
      WHERE id = $2 AND is_active = true
    `;
    await db.query(query, [newEndDate, vendorId]);
  }

  // 獲取廠商統計
  async getVendorStats(): Promise<{
    totalVendors: number;
    activeVendors: number;
    suspendedVendors: number;
    expiredContracts: number;
    expiringContracts: number;
    averageRating: number;
    vendorsByType: Record<VendorType, number>;
    vendorsByStatus: Record<VendorStatus, number>;
    topRatedVendors: Array<{ id: string; name: string; rating: number; }>;
  }> {
    const queries = [
      // 總廠商數
      'SELECT COUNT(*) as total FROM vendors WHERE is_active = true',
      
      // 活躍廠商數
      'SELECT COUNT(*) as active FROM vendors WHERE is_active = true AND status = \'active\'',
      
      // 暫停廠商數
      'SELECT COUNT(*) as suspended FROM vendors WHERE is_active = true AND status = \'suspended\'',
      
      // 已過期合約數
      'SELECT COUNT(*) as expired FROM vendors WHERE is_active = true AND contract_end < CURRENT_DATE',
      
      // 即將到期合約數 (30天內)
      `SELECT COUNT(*) as expiring FROM vendors 
       WHERE is_active = true 
       AND contract_end BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')`,
      
      // 平均評分
      'SELECT AVG(rating) as avg_rating FROM vendors WHERE is_active = true AND rating IS NOT NULL',
      
      // 按類型分組
      'SELECT type, COUNT(*) as count FROM vendors WHERE is_active = true GROUP BY type',
      
      // 按狀態分組
      'SELECT status, COUNT(*) as count FROM vendors WHERE is_active = true GROUP BY status',
      
      // 評分最高的廠商
      'SELECT id, name, rating FROM vendors WHERE is_active = true AND rating IS NOT NULL ORDER BY rating DESC LIMIT 5'
    ];

    const [
      totalResult,
      activeResult,
      suspendedResult,
      expiredResult,
      expiringResult,
      avgRatingResult,
      typeResults,
      statusResults,
      topRatedResults
    ] = await Promise.all([
      db.queryOne<{ total: number }>(queries[0]),
      db.queryOne<{ active: number }>(queries[1]),
      db.queryOne<{ suspended: number }>(queries[2]),
      db.queryOne<{ expired: number }>(queries[3]),
      db.queryOne<{ expiring: number }>(queries[4]),
      db.queryOne<{ avg_rating: number }>(queries[5]),
      db.query<{ type: VendorType; count: number }>(queries[6]),
      db.query<{ status: VendorStatus; count: number }>(queries[7]),
      db.query<{ id: string; name: string; rating: number }>(queries[8])
    ]);

    const vendorsByType = {} as Record<VendorType, number>;
    typeResults.forEach(result => {
      vendorsByType[result.type] = result.count;
    });

    const vendorsByStatus = {} as Record<VendorStatus, number>;
    statusResults.forEach(result => {
      vendorsByStatus[result.status] = result.count;
    });

    return {
      totalVendors: totalResult?.total || 0,
      activeVendors: activeResult?.active || 0,
      suspendedVendors: suspendedResult?.suspended || 0,
      expiredContracts: expiredResult?.expired || 0,
      expiringContracts: expiringResult?.expiring || 0,
      averageRating: avgRatingResult?.avg_rating || 0,
      vendorsByType,
      vendorsByStatus,
      topRatedVendors: topRatedResults
    };
  }

  // 檢查廠商名稱是否重複
  async isNameExists(name: string, excludeVendorId?: string): Promise<boolean> {
    let query = `SELECT 1 FROM vendors WHERE name = $1 AND is_active = true`;
    const params = [name];

    if (excludeVendorId) {
      query += ` AND id != $2`;
      params.push(excludeVendorId);
    }

    const row = await db.queryOne(query, params);
    return !!row;
  }

  // 檢查信箱是否重複
  async isEmailExists(email: string, excludeVendorId?: string): Promise<boolean> {
    let query = `SELECT 1 FROM vendors WHERE email = $1 AND is_active = true`;
    const params = [email];

    if (excludeVendorId) {
      query += ` AND id != $2`;
      params.push(excludeVendorId);
    }

    const row = await db.queryOne(query, params);
    return !!row;
  }

  // 獲取廠商的人員數量
  async getVendorPersonCount(vendorId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count 
      FROM duty_persons 
      WHERE vendor_id = $1 AND is_active = true
    `;
    const result = await db.queryOne<{ count: number }>(query, [vendorId]);
    return result?.count || 0;
  }

  // 獲取廠商的排班統計
  async getVendorScheduleStats(vendorId: string, dateFrom?: Date, dateTo?: Date): Promise<{
    totalSchedules: number;
    completedSchedules: number;
    ongoingSchedules: number;
    cancelledSchedules: number;
  }> {
    let whereClause = 'dp.vendor_id = $1 AND ds.is_active = true';
    const params = [vendorId];

    if (dateFrom) {
      whereClause += ` AND ds.duty_date >= $${params.length + 1}`;
      params.push(dateFrom);
    }

    if (dateTo) {
      whereClause += ` AND ds.duty_date <= $${params.length + 1}`;
      params.push(dateTo);
    }

    const queries = [
      `SELECT COUNT(*) as total FROM duty_schedules ds 
       INNER JOIN duty_persons dp ON ds.person_id = dp.id 
       WHERE ${whereClause}`,
      
      `SELECT COUNT(*) as completed FROM duty_schedules ds 
       INNER JOIN duty_persons dp ON ds.person_id = dp.id 
       WHERE ${whereClause} AND ds.status = '已完成'`,
      
      `SELECT COUNT(*) as ongoing FROM duty_schedules ds 
       INNER JOIN duty_persons dp ON ds.person_id = dp.id 
       WHERE ${whereClause} AND ds.status IN ('已排班', '值班中')`,
      
      `SELECT COUNT(*) as cancelled FROM duty_schedules ds 
       INNER JOIN duty_persons dp ON ds.person_id = dp.id 
       WHERE ${whereClause} AND ds.status IN ('取消', '請假')`
    ];

    const [totalResult, completedResult, ongoingResult, cancelledResult] = 
      await Promise.all(
        queries.map(query => db.queryOne<{ [key: string]: number }>(query, params))
      );

    return {
      totalSchedules: totalResult?.total || 0,
      completedSchedules: completedResult?.completed || 0,
      ongoingSchedules: ongoingResult?.ongoing || 0,
      cancelledSchedules: cancelledResult?.cancelled || 0
    };
  }

  // 自訂篩選條件處理
  protected applyFilters(builder: QueryBuilder, filters: Record<string, any>): void {
    super.applyFilters(builder, filters);

    // 處理類型陣列篩選
    if (filters.types && Array.isArray(filters.types)) {
      builder.whereIn('type', filters.types);
    }

    // 處理狀態陣列篩選
    if (filters.statuses && Array.isArray(filters.statuses)) {
      builder.whereIn('status', filters.statuses);
    }

    // 處理評分範圍篩選
    if (filters.ratingMin !== undefined) {
      builder.where('rating >= ?', filters.ratingMin);
    }
    if (filters.ratingMax !== undefined) {
      builder.where('rating <= ?', filters.ratingMax);
    }

    // 處理合約日期篩選
    if (filters.contractStartFrom) {
      builder.where('contract_start >= ?', filters.contractStartFrom);
    }
    if (filters.contractStartTo) {
      builder.where('contract_start <= ?', filters.contractStartTo);
    }
    if (filters.contractEndFrom) {
      builder.where('contract_end >= ?', filters.contractEndFrom);
    }
    if (filters.contractEndTo) {
      builder.where('contract_end <= ?', filters.contractEndTo);
    }

    // 特殊篩選條件
    if (filters.isExpired) {
      builder.where('contract_end < CURRENT_DATE');
    }

    if (filters.isExpiring) {
      const days = filters.expiringDays || 30;
      builder.where(`contract_end BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '${days} days')`);
    }

    if (filters.hasRating) {
      builder.where('rating IS NOT NULL');
    }

    if (filters.hasContact) {
      builder.where('contact_person IS NOT NULL');
      builder.where('phone IS NOT NULL OR email IS NOT NULL');
    }
  }
}