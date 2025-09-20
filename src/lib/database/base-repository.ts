import { db } from './connection';
import { QueryBuilder, PaginationOption } from './query-builder';

export interface BaseEntity {
  id: string;
  created_at?: Date;
  updated_at?: Date;
  is_active?: boolean;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface FindOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
  search?: string;
  includeInactive?: boolean;
}

export abstract class BaseRepository<T extends BaseEntity> {
  protected tableName: string;
  protected primaryKey: string;
  protected searchFields: string[];

  constructor(tableName: string, primaryKey = 'id', searchFields: string[] = []) {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
    this.searchFields = searchFields;
  }

  // 抽象方法，子類必須實作
  abstract mapFromDB(row: any): T;
  abstract mapToDB(entity: Partial<T>): Record<string, any>;

  // CRUD 基本操作
  async findById(id: string): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1 AND is_active = true`;
    const row = await db.queryOne(query, [id]);
    return row ? this.mapFromDB(row) : null;
  }

  async findAll(options: FindOptions = {}): Promise<PaginationResult<T>> {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      filters = {},
      search,
      includeInactive = false
    } = options;

    const builder = new QueryBuilder()
      .from(this.tableName)
      .orderBy(sortBy, sortOrder);

    // 軟刪除篩選
    if (!includeInactive) {
      builder.where('is_active = ?', true);
    }

    // 套用篩選條件
    this.applyFilters(builder, filters);

    // 搜尋條件
    if (search && this.searchFields.length > 0) {
      const searchClauses = this.searchFields.map(field => 
        `${field} ILIKE '%${search}%'`
      );
      builder.where(`(${searchClauses.join(' OR ')})`);
    }

    // 分頁
    const clonedBuilder = builder.clone();
    const countQuery = clonedBuilder.buildCountQuery();
    const totalResult = await db.queryOne<{ total: number }>(countQuery.query, countQuery.params);
    const total = totalResult?.total || 0;

    builder.paginate({ page, pageSize });
    const { query, params } = builder.build();
    const rows = await db.query(query, params);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: rows.map(row => this.mapFromDB(row)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async create(data: Partial<T>): Promise<T> {
    const mappedData = this.mapToDB(data);
    
    // 自動加入時間戳
    const now = new Date();
    mappedData.created_at = now;
    mappedData.updated_at = now;
    mappedData.is_active = true;

    // 產生 UUID 主鍵 (如果沒有提供)
    if (!mappedData[this.primaryKey]) {
      mappedData[this.primaryKey] = await this.generateId();
    }

    const fields = Object.keys(mappedData);
    const values = Object.values(mappedData);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const row = await db.queryOne(query, values);
    return this.mapFromDB(row);
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const mappedData = this.mapToDB(data);
    
    // 自動更新時間戳
    mappedData.updated_at = new Date();

    const fields = Object.keys(mappedData);
    const values = Object.values(mappedData);
    
    const setClause = fields.map((field, index) => 
      `${field} = $${index + 1}`
    ).join(', ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE ${this.primaryKey} = $${values.length + 1} AND is_active = true
      RETURNING *
    `;

    const row = await db.queryOne(query, [...values, id]);
    return row ? this.mapFromDB(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const query = `
      UPDATE ${this.tableName}
      SET is_active = false, updated_at = $1
      WHERE ${this.primaryKey} = $2 AND is_active = true
    `;

    const result = await db.query(query, [new Date(), id]);
    return result.length > 0;
  }

  async hardDelete(id: string): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
    const result = await db.query(query, [id]);
    return result.length > 0;
  }

  async exists(id: string): Promise<boolean> {
    const query = `SELECT 1 FROM ${this.tableName} WHERE ${this.primaryKey} = $1 AND is_active = true`;
    const row = await db.queryOne(query, [id]);
    return !!row;
  }

  async count(filters: Record<string, any> = {}): Promise<number> {
    const builder = new QueryBuilder()
      .from(this.tableName)
      .where('is_active = ?', true);

    this.applyFilters(builder, filters);

    const { query, params } = builder.buildCountQuery();
    const result = await db.queryOne<{ total: number }>(query, params);
    return result?.total || 0;
  }

  // 批次操作
  async batchCreate(dataList: Partial<T>[]): Promise<T[]> {
    if (dataList.length === 0) return [];

    const results: T[] = [];
    
    return db.transaction(async (client) => {
      for (const data of dataList) {
        const mappedData = this.mapToDB(data);
        const now = new Date();
        mappedData.created_at = now;
        mappedData.updated_at = now;
        mappedData.is_active = true;

        if (!mappedData[this.primaryKey]) {
          mappedData[this.primaryKey] = await this.generateId();
        }

        const fields = Object.keys(mappedData);
        const values = Object.values(mappedData);
        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

        const query = `
          INSERT INTO ${this.tableName} (${fields.join(', ')})
          VALUES (${placeholders})
          RETURNING *
        `;

        const result = await client.query(query, values);
        results.push(this.mapFromDB(result.rows[0]));
      }
      return results;
    });
  }

  async batchUpdate(updates: { id: string; data: Partial<T> }[]): Promise<T[]> {
    if (updates.length === 0) return [];

    const results: T[] = [];

    return db.transaction(async (client) => {
      for (const { id, data } of updates) {
        const mappedData = this.mapToDB(data);
        mappedData.updated_at = new Date();

        const fields = Object.keys(mappedData);
        const values = Object.values(mappedData);
        
        const setClause = fields.map((field, index) => 
          `${field} = $${index + 1}`
        ).join(', ');

        const query = `
          UPDATE ${this.tableName}
          SET ${setClause}
          WHERE ${this.primaryKey} = $${values.length + 1} AND is_active = true
          RETURNING *
        `;

        const result = await client.query(query, [...values, id]);
        if (result.rows.length > 0) {
          results.push(this.mapFromDB(result.rows[0]));
        }
      }
      return results;
    });
  }

  // 輔助方法
  protected applyFilters(builder: QueryBuilder, filters: Record<string, any>): void {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          builder.whereIn(key, value);
        } else if (key.includes('_date') || key.includes('Date')) {
          // 日期範圍處理
          if (key.endsWith('_from')) {
            const field = key.replace('_from', '');
            builder.where(`${field} >= ?`, value);
          } else if (key.endsWith('_to')) {
            const field = key.replace('_to', '');
            builder.where(`${field} <= ?`, value);
          } else {
            builder.where(`${key} = ?`, value);
          }
        } else {
          builder.where(`${key} = ?`, value);
        }
      }
    });
  }

  protected async generateId(): Promise<string> {
    const result = await db.queryOne<{ id: string }>('SELECT gen_random_uuid() as id');
    return result?.id || '';
  }

  // 自訂查詢方法
  async customQuery(query: string, params: any[] = []): Promise<T[]> {
    const rows = await db.query(query, params);
    return rows.map(row => this.mapFromDB(row));
  }

  async customQueryOne(query: string, params: any[] = []): Promise<T | null> {
    const row = await db.queryOne(query, params);
    return row ? this.mapFromDB(row) : null;
  }
}