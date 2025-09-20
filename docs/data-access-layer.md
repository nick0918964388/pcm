# 資料存取層 (DAL) 和服務層設計

## 1. 架構層次設計

### 1.1 分層架構
```
┌──────────────────────────┐
│   API Routes Layer       │ ← Next.js API Routes
├──────────────────────────┤
│   Service Layer         │ ← 業務邏輯層
├──────────────────────────┤
│   Repository Layer      │ ← 資料存取抽象層
├──────────────────────────┤
│   Data Access Layer     │ ← 資料庫操作層
├──────────────────────────┤
│   Database Layer        │ ← PostgreSQL
└──────────────────────────┘
```

### 1.2 設計原則
- **關注點分離**: 每層負責不同功能
- **依賴注入**: 降低耦合度
- **Interface抽象**: 便於測試和替換
- **事務一致性**: 保證資料完整性
- **錯誤處理**: 統一錯誤處理機制

## 2. 資料庫連接層

### 2.1 連接池管理
```typescript
// src/lib/database/connection.ts
import { Pool, PoolClient, PoolConfig } from 'pg';

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;

  private constructor() {
    const config: PoolConfig = {
      host: process.env.HOSTNAME!,
      database: process.env.DATABASE!,
      user: process.env.USERNAME!,
      password: process.env.PASSWORD!,
      port: parseInt(process.env.PORT || '5432'),
      max: 20,
      min: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };

    this.pool = new Pool(config);
    
    // 連接池事件監聽
    this.pool.on('connect', () => console.log('Database connected'));
    this.pool.on('error', (err) => console.error('Database connection error:', err));
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  public async query<T>(text: string, params?: any[]): Promise<T[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const db = DatabaseConnection.getInstance();
```

### 2.2 查詢建構器
```typescript
// src/lib/database/query-builder.ts
export class QueryBuilder {
  private query: string = '';
  private conditions: string[] = [];
  private params: any[] = [];
  private paramCount: number = 0;

  select(fields: string[]): QueryBuilder {
    this.query = `SELECT ${fields.join(', ')}`;
    return this;
  }

  from(table: string): QueryBuilder {
    this.query += ` FROM ${table}`;
    return this;
  }

  leftJoin(table: string, condition: string): QueryBuilder {
    this.query += ` LEFT JOIN ${table} ON ${condition}`;
    return this;
  }

  where(condition: string, value?: any): QueryBuilder {
    if (value !== undefined) {
      this.paramCount++;
      this.conditions.push(condition.replace('?', `$${this.paramCount}`));
      this.params.push(value);
    } else {
      this.conditions.push(condition);
    }
    return this;
  }

  whereIn(field: string, values: any[]): QueryBuilder {
    if (values.length > 0) {
      const placeholders = values.map(() => `$${++this.paramCount}`).join(', ');
      this.conditions.push(`${field} IN (${placeholders})`);
      this.params.push(...values);
    }
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.query += ` ORDER BY ${field} ${direction}`;
    return this;
  }

  limit(count: number): QueryBuilder {
    this.query += ` LIMIT $${++this.paramCount}`;
    this.params.push(count);
    return this;
  }

  offset(count: number): QueryBuilder {
    this.query += ` OFFSET $${++this.paramCount}`;
    this.params.push(count);
    return this;
  }

  build(): { query: string; params: any[] } {
    let finalQuery = this.query;
    if (this.conditions.length > 0) {
      finalQuery += ` WHERE ${this.conditions.join(' AND ')}`;
    }
    return { query: finalQuery, params: this.params };
  }
}
```

## 3. 資料模型定義

### 3.1 基礎資料模型
```typescript
// src/lib/models/base.ts
export abstract class BaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;

  constructor(data: Partial<BaseModel>) {
    Object.assign(this, data);
  }

  public toJSON(): Record<string, any> {
    return { ...this };
  }
}

// src/lib/models/vendor.ts
export class Vendor extends BaseModel {
  name: string;
  vendorType: string;
  status: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  taxId?: string;
  businessLicense?: string;
  safetyCertification?: any;

  constructor(data: Partial<Vendor>) {
    super(data);
    Object.assign(this, data);
  }
}

// src/lib/models/duty-person.ts
export class DutyPerson extends BaseModel {
  vendorId: string;
  name: string;
  position: string;
  mobile: string;
  extension?: string;
  email?: string;
  mvpn?: string;
  isPrimary: boolean;
  supervisor?: string;
  emergencyContact?: string;
  specialSkills: string[];
  safetyQualifications: string[];
  languageRequirements: string[];
  active: boolean;

  constructor(data: Partial<DutyPerson>) {
    super(data);
    Object.assign(this, data);
  }
}

// src/lib/models/duty-schedule.ts
export class DutySchedule extends BaseModel {
  projectId: string;
  dutyDate: Date;
  shiftType: string;
  status: string;
  personId: string;
  workArea: string;
  workLocation?: string;
  specialSkillsRequired: string[];
  safetyQualificationsRequired: string[];
  languageRequirementsRequired: string[];
  notes?: string;
  specialInstructions?: string;
  urgencyLevel?: string;

  // 關聯資料
  person?: DutyPerson;
  replacement?: DutyReplacement;
  checkIn?: DutyCheckIn;

  constructor(data: Partial<DutySchedule>) {
    super(data);
    Object.assign(this, data);
  }
}
```

## 4. Repository 模式實現

### 4.1 基礎 Repository 抽象類
```typescript
// src/lib/repositories/base-repository.ts
export interface IRepository<T, TKey = string> {
  findById(id: TKey): Promise<T | null>;
  findAll(filters?: any): Promise<T[]>;
  create(entity: Partial<T>): Promise<T>;
  update(id: TKey, updates: Partial<T>): Promise<T>;
  delete(id: TKey): Promise<boolean>;
  count(filters?: any): Promise<number>;
}

export abstract class BaseRepository<T extends BaseModel> implements IRepository<T> {
  protected tableName: string;
  protected db = DatabaseConnection.getInstance();

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  protected abstract mapFromDB(row: any): T;
  protected abstract mapToDB(entity: Partial<T>): any;

  async findById(id: string): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const rows = await this.db.query(query, [id]);
    return rows.length > 0 ? this.mapFromDB(rows[0]) : null;
  }

  async findAll(filters: any = {}): Promise<T[]> {
    const builder = new QueryBuilder();
    builder.select(['*']).from(this.tableName);
    
    this.applyFilters(builder, filters);
    
    const { query, params } = builder.build();
    const rows = await this.db.query(query, params);
    return rows.map(row => this.mapFromDB(row));
  }

  async create(entity: Partial<T>): Promise<T> {
    const data = this.mapToDB(entity);
    const fields = Object.keys(data);
    const placeholders = fields.map((_, index) => `$${index + 1}`);
    const values = Object.values(data);

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const rows = await this.db.query(query, values);
    return this.mapFromDB(rows[0]);
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const data = this.mapToDB(updates);
    const fields = Object.keys(data);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(data)];

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const rows = await this.db.query(query, values);
    if (rows.length === 0) throw new Error('Record not found');
    return this.mapFromDB(rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const result = await this.db.query(query, [id]);
    return result.length > 0;
  }

  async count(filters: any = {}): Promise<number> {
    const builder = new QueryBuilder();
    builder.select(['COUNT(*) as count']).from(this.tableName);
    
    this.applyFilters(builder, filters);
    
    const { query, params } = builder.build();
    const rows = await this.db.query<{ count: string }>(query, params);
    return parseInt(rows[0].count);
  }

  protected abstract applyFilters(builder: QueryBuilder, filters: any): void;
}
```

### 4.2 值班排程 Repository
```typescript
// src/lib/repositories/duty-schedule-repository.ts
export class DutyScheduleRepository extends BaseRepository<DutySchedule> {
  constructor() {
    super('duty_schedules');
  }

  protected mapFromDB(row: any): DutySchedule {
    return new DutySchedule({
      id: row.id,
      projectId: row.project_id,
      dutyDate: new Date(row.duty_date),
      shiftType: row.shift_type,
      status: row.status,
      personId: row.person_id,
      workArea: row.work_area,
      workLocation: row.work_location,
      specialSkillsRequired: row.special_skills_required || [],
      safetyQualificationsRequired: row.safety_qualifications_required || [],
      languageRequirementsRequired: row.language_requirements_required || [],
      notes: row.notes,
      specialInstructions: row.special_instructions,
      urgencyLevel: row.urgency_level,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    });
  }

  protected mapToDB(entity: Partial<DutySchedule>): any {
    return {
      ...(entity.id && { id: entity.id }),
      project_id: entity.projectId,
      duty_date: entity.dutyDate,
      shift_type: entity.shiftType,
      status: entity.status,
      person_id: entity.personId,
      work_area: entity.workArea,
      work_location: entity.workLocation,
      special_skills_required: entity.specialSkillsRequired,
      safety_qualifications_required: entity.safetyQualificationsRequired,
      language_requirements_required: entity.languageRequirementsRequired,
      notes: entity.notes,
      special_instructions: entity.specialInstructions,
      urgency_level: entity.urgencyLevel,
      created_by: entity.createdBy,
      updated_by: entity.updatedBy,
    };
  }

  protected applyFilters(builder: QueryBuilder, filters: any): void {
    if (filters.projectId) {
      builder.where('project_id = ?', filters.projectId);
    }
    
    if (filters.dateFrom) {
      builder.where('duty_date >= ?', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      builder.where('duty_date <= ?', filters.dateTo);
    }
    
    if (filters.specificDate) {
      builder.where('duty_date = ?', filters.specificDate);
    }
    
    if (filters.personIds?.length) {
      builder.whereIn('person_id', filters.personIds);
    }
    
    if (filters.shiftTypes?.length) {
      builder.whereIn('shift_type', filters.shiftTypes);
    }
    
    if (filters.statuses?.length) {
      builder.whereIn('status', filters.statuses);
    }
    
    if (filters.workAreas?.length) {
      builder.whereIn('work_area', filters.workAreas);
    }
    
    if (filters.urgencyLevels?.length) {
      builder.whereIn('urgency_level', filters.urgencyLevels);
    }
    
    if (filters.currentOnly) {
      builder.where("status = '值班中'");
    }
    
    if (filters.search) {
      builder.where(`(
        EXISTS (
          SELECT 1 FROM duty_persons dp 
          WHERE dp.id = person_id 
          AND (dp.name ILIKE '%' || ? || '%' OR dp.position ILIKE '%' || ? || '%')
        )
      )`, [filters.search, filters.search]);
    }
  }

  // 特定查詢方法
  async findWithPersonDetails(filters: any = {}): Promise<(DutySchedule & { person: DutyPerson })[]> {
    const builder = new QueryBuilder();
    builder
      .select([
        'ds.*',
        'dp.name as person_name',
        'dp.position as person_position', 
        'dp.mobile as person_mobile',
        'dp.email as person_email',
        'v.name as vendor_name',
        'v.vendor_type'
      ])
      .from('duty_schedules ds')
      .leftJoin('duty_persons dp', 'ds.person_id = dp.id')
      .leftJoin('vendors v', 'dp.vendor_id = v.id');

    this.applyFilters(builder, filters);

    const { query, params } = builder.build();
    const rows = await this.db.query(query, params);
    
    return rows.map(row => {
      const schedule = this.mapFromDB(row);
      schedule.person = new DutyPerson({
        id: row.person_id,
        name: row.person_name,
        position: row.person_position,
        mobile: row.person_mobile,
        email: row.person_email,
        vendorId: row.vendor_id,
        vendorName: row.vendor_name,
        vendorType: row.vendor_type,
      });
      return schedule as DutySchedule & { person: DutyPerson };
    });
  }

  async findCurrentDuty(projectId: string): Promise<DutySchedule[]> {
    const query = `
      SELECT ds.*, dp.name as person_name, dp.mobile as person_mobile
      FROM duty_schedules ds
      JOIN duty_persons dp ON ds.person_id = dp.id
      WHERE ds.project_id = $1 
        AND ds.status = '值班中'
        AND ds.duty_date = CURRENT_DATE
      ORDER BY ds.shift_type, dp.name
    `;
    
    const rows = await this.db.query(query, [projectId]);
    return rows.map(row => this.mapFromDB(row));
  }

  async getStatistics(projectId: string, filters: any = {}): Promise<any> {
    const baseQuery = `
      FROM duty_schedules ds
      JOIN duty_persons dp ON ds.person_id = dp.id
      JOIN vendors v ON dp.vendor_id = v.id
      WHERE ds.project_id = $1
    `;
    
    const totalQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const statusQuery = `
      SELECT ds.status, COUNT(*) as count 
      ${baseQuery} 
      GROUP BY ds.status
    `;
    const shiftQuery = `
      SELECT ds.shift_type, COUNT(*) as count 
      ${baseQuery} 
      GROUP BY ds.shift_type
    `;
    
    const [totalResult, statusResult, shiftResult] = await Promise.all([
      this.db.query(totalQuery, [projectId]),
      this.db.query(statusQuery, [projectId]),
      this.db.query(shiftQuery, [projectId]),
    ]);
    
    return {
      total: parseInt(totalResult[0].total),
      byStatus: statusResult.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
      byShiftType: shiftResult.reduce((acc, row) => {
        acc[row.shift_type] = parseInt(row.count);
        return acc;
      }, {}),
    };
  }
}
```

## 5. 服務層設計

### 5.1 基礎服務類
```typescript
// src/lib/services/base-service.ts
export abstract class BaseService<T, TRepository extends IRepository<T>> {
  protected repository: TRepository;
  protected logger: any; // 可以整合日誌系統

  constructor(repository: TRepository) {
    this.repository = repository;
  }

  protected async validateEntity(entity: Partial<T>): Promise<void> {
    // 實現資料驗證邏輯
  }

  protected handleError(error: any, operation: string): never {
    console.error(`Service error in ${operation}:`, error);
    throw new Error(`操作失敗: ${operation}`);
  }
}
```

### 5.2 值班管理服務
```typescript
// src/lib/services/duty-schedule-service.ts
import { DutyScheduleRepository } from '../repositories/duty-schedule-repository';
import { DutyPersonRepository } from '../repositories/duty-person-repository';

export class DutyScheduleService extends BaseService<DutySchedule, DutyScheduleRepository> {
  private personRepository: DutyPersonRepository;

  constructor(
    dutyScheduleRepository: DutyScheduleRepository,
    personRepository: DutyPersonRepository
  ) {
    super(dutyScheduleRepository);
    this.personRepository = personRepository;
  }

  async getSchedules(
    projectId: string,
    filters: any = {},
    pagination: any = {}
  ): Promise<{
    schedules: DutySchedule[];
    total: number;
    pagination: any;
  }> {
    try {
      const { page = 1, pageSize = 20 } = pagination;
      const offset = (page - 1) * pageSize;

      const scheduleFilters = {
        ...filters,
        projectId,
        limit: pageSize,
        offset,
      };

      const [schedules, total] = await Promise.all([
        this.repository.findWithPersonDetails(scheduleFilters),
        this.repository.count({ ...filters, projectId }),
      ]);

      return {
        schedules,
        total,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      this.handleError(error, '查詢值班排程');
    }
  }

  async createSchedule(
    projectId: string,
    scheduleData: Partial<DutySchedule>,
    createdBy: string
  ): Promise<DutySchedule> {
    try {
      // 驗證人員是否存在
      const person = await this.personRepository.findById(scheduleData.personId!);
      if (!person) {
        throw new Error('指定的值班人員不存在');
      }

      // 檢查是否有衝突的排程
      await this.checkScheduleConflict(
        projectId,
        scheduleData.personId!,
        scheduleData.dutyDate!,
        scheduleData.shiftType!
      );

      // 建立排程
      const schedule = await this.repository.create({
        ...scheduleData,
        projectId,
        status: '已排班',
        createdBy,
      });

      return schedule;
    } catch (error) {
      this.handleError(error, '建立值班排程');
    }
  }

  async updateSchedule(
    scheduleId: string,
    updates: Partial<DutySchedule>,
    updatedBy: string
  ): Promise<DutySchedule> {
    try {
      const existingSchedule = await this.repository.findById(scheduleId);
      if (!existingSchedule) {
        throw new Error('值班排程不存在');
      }

      // 如果更新人員或時間，需要檢查衝突
      if (updates.personId || updates.dutyDate || updates.shiftType) {
        await this.checkScheduleConflict(
          existingSchedule.projectId,
          updates.personId || existingSchedule.personId,
          updates.dutyDate || existingSchedule.dutyDate,
          updates.shiftType || existingSchedule.shiftType,
          scheduleId
        );
      }

      const updatedSchedule = await this.repository.update(scheduleId, {
        ...updates,
        updatedBy,
      });

      return updatedSchedule;
    } catch (error) {
      this.handleError(error, '更新值班排程');
    }
  }

  async deleteSchedule(scheduleId: string): Promise<boolean> {
    try {
      const schedule = await this.repository.findById(scheduleId);
      if (!schedule) {
        throw new Error('值班排程不存在');
      }

      if (schedule.status === '值班中') {
        throw new Error('無法刪除進行中的值班排程');
      }

      return await this.repository.delete(scheduleId);
    } catch (error) {
      this.handleError(error, '刪除值班排程');
    }
  }

  async getCurrentDuty(projectId: string): Promise<{
    currentShifts: DutySchedule[];
    nextShifts: DutySchedule[];
    emergencyContacts: DutySchedule[];
  }> {
    try {
      const [currentShifts, nextShifts, emergencyContacts] = await Promise.all([
        this.repository.findCurrentDuty(projectId),
        this.getUpcomingShifts(projectId),
        this.getEmergencyContacts(projectId),
      ]);

      return {
        currentShifts,
        nextShifts,
        emergencyContacts,
      };
    } catch (error) {
      this.handleError(error, '取得當前值班資訊');
    }
  }

  private async checkScheduleConflict(
    projectId: string,
    personId: string,
    dutyDate: Date,
    shiftType: string,
    excludeScheduleId?: string
  ): Promise<void> {
    const conflictingSchedules = await this.repository.findAll({
      projectId,
      personId,
      specificDate: dutyDate,
      shiftType,
    });

    const hasConflict = conflictingSchedules.some(
      schedule => schedule.id !== excludeScheduleId && 
                  schedule.status !== '取消'
    );

    if (hasConflict) {
      throw new Error('該時段已有其他值班排程');
    }
  }

  private async getUpcomingShifts(projectId: string): Promise<DutySchedule[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.repository.findAll({
      projectId,
      specificDate: tomorrow,
      statuses: ['已排班'],
    });
  }

  private async getEmergencyContacts(projectId: string): Promise<DutySchedule[]> {
    return this.repository.findAll({
      projectId,
      shiftTypes: ['緊急'],
      statuses: ['值班中', '已排班'],
    });
  }
}
```

## 6. 依賴注入容器

### 6.1 服務容器
```typescript
// src/lib/container/service-container.ts
export class ServiceContainer {
  private static instance: ServiceContainer;
  private services = new Map<string, any>();

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  public register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory);
  }

  public get<T>(key: string): T {
    const factory = this.services.get(key);
    if (!factory) {
      throw new Error(`Service ${key} not registered`);
    }
    return factory();
  }
}

// 註冊服務
const container = ServiceContainer.getInstance();

container.register('dutyScheduleRepository', () => new DutyScheduleRepository());
container.register('dutyPersonRepository', () => new DutyPersonRepository());
container.register('vendorRepository', () => new VendorRepository());

container.register('dutyScheduleService', () => new DutyScheduleService(
  container.get('dutyScheduleRepository'),
  container.get('dutyPersonRepository')
));
```

## 7. 使用範例

### 7.1 在 API Route 中使用
```typescript
// src/app/api/projects/[projectId]/duty-schedules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ServiceContainer } from '@/lib/container/service-container';
import { DutyScheduleService } from '@/lib/services/duty-schedule-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const container = ServiceContainer.getInstance();
    const dutyScheduleService = container.get<DutyScheduleService>('dutyScheduleService');
    
    const { searchParams } = new URL(request.url);
    const filters = {
      search: searchParams.get('search'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      // ... 其他篩選條件
    };
    
    const pagination = {
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
    };

    const result = await dutyScheduleService.getSchedules(
      params.projectId,
      filters,
      pagination
    );

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
```

這個設計提供了完整的資料存取層架構，包括連接管理、查詢建構、資料映射、事務處理和服務層業務邏輯，為真實的PostgreSQL CRUD操作提供了堅實的基礎。