/**
 * Oracle Base Repository
 * Task 3.3: 更新Repository抽象層以支援Oracle
 */

import { OracleQueryExecutor } from './oracle-query-executor';
import {
  IOracleBaseRepository,
  OracleQueryOptions,
  OraclePaginationOptions,
  OraclePaginationResult,
  OracleBatchOptions,
  OracleJsonQueryOptions,
  OracleSortOptions,
  OracleAggregateOptions,
  OracleTransactionOptions,
  OracleQueryBuilder,
  OracleRepositoryConfig,
  OracleRepositoryMetrics
} from './oracle-repository-types';
import { QueryResult, Transaction } from './oracle-query-types';

export abstract class OracleBaseRepository<T> implements IOracleBaseRepository<T> {
  protected queryExecutor: OracleQueryExecutor;
  protected config: OracleRepositoryConfig;
  protected metrics: OracleRepositoryMetrics;

  constructor(
    tableName: string,
    queryExecutor?: OracleQueryExecutor,
    options: Partial<OracleRepositoryConfig> = {}
  ) {
    this.config = {
      tableName,
      primaryKey: 'id',
      ...options
    };

    // 如果沒有提供 queryExecutor，創建默認的
    this.queryExecutor = queryExecutor || new OracleQueryExecutor({} as any);

    this.metrics = {
      totalQueries: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      cacheHitRate: 0,
      errorRate: 0,
      lastResetTime: new Date()
    };
  }

  // 抽象方法 - 子類別需要實作
  protected abstract mapFromOracle(row: any): T;
  protected abstract mapToOracle(entity: Partial<T>): Record<string, any>;

  // 向後相容的方法名稱
  protected mapRowToEntity(row: any): T {
    return this.mapFromOracle(row);
  }

  protected mapEntityToRow(entity: Partial<T>): Record<string, any> {
    return this.mapToOracle(entity);
  }

  // 取得完整的表格名稱
  protected getTableName(): string {
    return this.config.schema ? `${this.config.schema}.${this.config.tableName}` : this.config.tableName;
  }

  // 基本CRUD操作
  async findById(id: string | number, options: OracleQueryOptions = {}): Promise<T | null> {
    const startTime = Date.now();
    try {
      const sql = `SELECT * FROM ${this.getTableName()} WHERE ${this.config.primaryKey} = :id`;
      const binds = { id };

      if (this.config.enableSoftDelete) {
        const softDeleteSql = `${sql} AND ${this.config.softDeleteColumn} IS NULL`;
        const result = await this.queryExecutor.execute(softDeleteSql, binds, options);
        this.updateMetrics(startTime, true);
        return result.rows && result.rows.length > 0 ? this.mapRowToEntity(result.rows[0]) : null;
      }

      const result = await this.queryExecutor.execute(sql, binds, options);
      this.updateMetrics(startTime, true);
      return result.rows && result.rows.length > 0 ? this.mapRowToEntity(result.rows[0]) : null;
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  async findAll(options: OracleQueryOptions = {}): Promise<T[]> {
    const startTime = Date.now();
    try {
      let sql = `SELECT * FROM ${this.getTableName()}`;
      const binds: Record<string, any> = {};

      if (this.config.enableSoftDelete) {
        sql += ` WHERE ${this.config.softDeleteColumn} IS NULL`;
      }

      const result = await this.queryExecutor.execute(sql, binds, options);
      this.updateMetrics(startTime, true);
      return result.rows ? result.rows.map(row => this.mapRowToEntity(row)) : [];
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  async create(entity: Partial<T>, options: OracleQueryOptions = {}): Promise<T> {
    const startTime = Date.now();
    try {
      const row = this.mapEntityToRow(entity);

      // 加入審計欄位
      if (this.config.enableAuditColumns) {
        if (this.config.auditColumns?.createdAt) {
          row[this.config.auditColumns.createdAt] = new Date();
        }
        if (this.config.auditColumns?.updatedAt) {
          row[this.config.auditColumns.updatedAt] = new Date();
        }
      }

      const columns = Object.keys(row);
      const values = columns.map(col => `:${col}`);

      const sql = `
        INSERT INTO ${this.getTableName()} (${columns.join(', ')})
        VALUES (${values.join(', ')})
        RETURNING ${this.config.primaryKey} INTO :newId
      `;

      const binds = { ...row, newId: { dir: 'out', type: 'NUMBER' } };
      const result = await this.queryExecutor.execute(sql, binds, options);

      this.updateMetrics(startTime, true);

      // 查詢新建立的實體
      const newId = result.outBinds?.newId;
      if (newId) {
        return await this.findById(newId, options) as T;
      }

      throw new Error('Failed to retrieve created entity');
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  async update(id: string | number, updates: Partial<T>, options: OracleQueryOptions = {}): Promise<T> {
    const startTime = Date.now();
    try {
      const row = this.mapEntityToRow(updates);

      // 加入審計欄位
      if (this.config.enableAuditColumns && this.config.auditColumns?.updatedAt) {
        row[this.config.auditColumns.updatedAt] = new Date();
      }

      const setClause = Object.keys(row).map(col => `${col} = :${col}`).join(', ');
      let sql = `UPDATE ${this.getTableName()} SET ${setClause} WHERE ${this.config.primaryKey} = :id`;

      if (this.config.enableSoftDelete) {
        sql += ` AND ${this.config.softDeleteColumn} IS NULL`;
      }

      const binds = { ...row, id };
      await this.queryExecutor.execute(sql, binds, options);

      this.updateMetrics(startTime, true);
      return await this.findById(id, options) as T;
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  async delete(id: string | number, options: OracleQueryOptions = {}): Promise<boolean> {
    const startTime = Date.now();
    try {
      let sql: string;
      const binds = { id };

      if (this.config.enableSoftDelete) {
        // 軟刪除
        sql = `UPDATE ${this.getTableName()} SET ${this.config.softDeleteColumn} = SYSDATE WHERE ${this.config.primaryKey} = :id`;
        if (this.config.enableAuditColumns && this.config.auditColumns?.updatedAt) {
          sql = sql.replace('SYSDATE', `SYSDATE, ${this.config.auditColumns.updatedAt} = SYSDATE`);
        }
      } else {
        // 硬刪除
        sql = `DELETE FROM ${this.getTableName()} WHERE ${this.config.primaryKey} = :id`;
      }

      const result = await this.queryExecutor.execute(sql, binds, options);
      this.updateMetrics(startTime, true);
      return (result.rows?.length || 0) > 0;
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  // 批次操作
  async createMany(entities: Partial<T>[], options: OracleBatchOptions = {}): Promise<T[]> {
    const startTime = Date.now();
    try {
      if (entities.length === 0) return [];

      const batchSize = options.batchSize || 1000;
      const results: T[] = [];

      for (let i = 0; i < entities.length; i += batchSize) {
        const batch = entities.slice(i, i + batchSize);
        const batchRows = batch.map(entity => {
          const row = this.mapEntityToRow(entity);
          if (this.config.enableAuditColumns) {
            if (this.config.auditColumns?.createdAt) {
              row[this.config.auditColumns.createdAt] = new Date();
            }
            if (this.config.auditColumns?.updatedAt) {
              row[this.config.auditColumns.updatedAt] = new Date();
            }
          }
          return row;
        });

        if (options.useForallStatement) {
          // 使用FORALL語句進行批次插入
          const columns = Object.keys(batchRows[0]);
          const sql = `
            INSERT INTO ${this.getTableName()} (${columns.join(', ')})
            VALUES (${columns.map(col => `:${col}`).join(', ')})
          `;

          await this.queryExecutor.executeBatch({ sql, binds: batchRows }, options);
        } else {
          // 逐一插入
          for (const row of batchRows) {
            const createdEntity = await this.create(row as Partial<T>, options);
            results.push(createdEntity);
          }
        }
      }

      this.updateMetrics(startTime, true);
      return results;
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  async updateMany(updates: Array<{ id: string | number; data: Partial<T> }>, options: OracleBatchOptions = {}): Promise<T[]> {
    const startTime = Date.now();
    try {
      const results: T[] = [];

      for (const update of updates) {
        const updatedEntity = await this.update(update.id, update.data, options);
        results.push(updatedEntity);
      }

      this.updateMetrics(startTime, true);
      return results;
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  async deleteMany(ids: (string | number)[], options: OracleBatchOptions = {}): Promise<number> {
    const startTime = Date.now();
    try {
      if (ids.length === 0) return 0;

      const placeholders = ids.map((_, index) => `:id${index}`).join(', ');
      const binds = ids.reduce((acc, id, index) => {
        acc[`id${index}`] = id;
        return acc;
      }, {} as Record<string, any>);

      let sql: string;
      if (this.config.enableSoftDelete) {
        sql = `UPDATE ${this.getTableName()} SET ${this.config.softDeleteColumn} = SYSDATE WHERE ${this.config.primaryKey} IN (${placeholders})`;
      } else {
        sql = `DELETE FROM ${this.getTableName()} WHERE ${this.config.primaryKey} IN (${placeholders})`;
      }

      const result = await this.queryExecutor.execute(sql, binds, options);
      this.updateMetrics(startTime, true);
      return result.rows?.length || 0;
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  // 查詢操作
  async findBy(criteria: Partial<T>, options: OracleQueryOptions = {}): Promise<T[]> {
    const startTime = Date.now();
    try {
      const row = this.mapEntityToRow(criteria);
      const whereClause = Object.keys(row).map(col => `${col} = :${col}`).join(' AND ');

      let sql = `SELECT * FROM ${this.getTableName()}`;
      if (whereClause) {
        sql += ` WHERE ${whereClause}`;
      }

      if (this.config.enableSoftDelete) {
        sql += whereClause ? ` AND ${this.config.softDeleteColumn} IS NULL` : ` WHERE ${this.config.softDeleteColumn} IS NULL`;
      }

      const result = await this.queryExecutor.execute(sql, row, options);
      this.updateMetrics(startTime, true);
      return result.rows ? result.rows.map(r => this.mapRowToEntity(r)) : [];
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  async findOne(criteria: Partial<T>, options: OracleQueryOptions = {}): Promise<T | null> {
    const results = await this.findBy(criteria, { ...options, fetchSize: 1 });
    return results.length > 0 ? results[0] : null;
  }

  async count(criteria?: Partial<T>, options: OracleQueryOptions = {}): Promise<number> {
    const startTime = Date.now();
    try {
      let sql = `SELECT COUNT(*) as count FROM ${this.getTableName()}`;
      let binds: Record<string, any> = {};

      if (criteria) {
        const row = this.mapEntityToRow(criteria);
        const whereClause = Object.keys(row).map(col => `${col} = :${col}`).join(' AND ');
        if (whereClause) {
          sql += ` WHERE ${whereClause}`;
          binds = row;
        }
      }

      if (this.config.enableSoftDelete) {
        const hasWhere = sql.includes('WHERE');
        sql += hasWhere ? ` AND ${this.config.softDeleteColumn} IS NULL` : ` WHERE ${this.config.softDeleteColumn} IS NULL`;
      }

      const result = await this.queryExecutor.execute(sql, binds, options);
      this.updateMetrics(startTime, true);
      return result.rows?.[0]?.count || 0;
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  async exists(criteria: Partial<T>, options: OracleQueryOptions = {}): Promise<boolean> {
    const count = await this.count(criteria, options);
    return count > 0;
  }

  // 分頁操作
  async paginate(options: OraclePaginationOptions, criteria?: Partial<T>): Promise<OraclePaginationResult<T>> {
    const startTime = Date.now();
    try {
      const offset = (options.page - 1) * options.limit;
      const totalCount = await this.count(criteria);

      let sql = `SELECT * FROM ${this.getTableName()}`;
      let binds: Record<string, any> = {};

      if (criteria) {
        const row = this.mapEntityToRow(criteria);
        const whereClause = Object.keys(row).map(col => `${col} = :${col}`).join(' AND ');
        if (whereClause) {
          sql += ` WHERE ${whereClause}`;
          binds = row;
        }
      }

      if (this.config.enableSoftDelete) {
        const hasWhere = sql.includes('WHERE');
        sql += hasWhere ? ` AND ${this.config.softDeleteColumn} IS NULL` : ` WHERE ${this.config.softDeleteColumn} IS NULL`;
      }

      if (options.orderBy) {
        sql += ` ORDER BY ${options.orderBy}`;
      }

      if (options.useOffsetFetch) {
        sql += ` OFFSET ${offset} ROWS FETCH NEXT ${options.limit} ROWS ONLY`;
      } else {
        // 使用ROW_NUMBER()
        sql = `
          SELECT * FROM (
            SELECT t.*, ROW_NUMBER() OVER (${options.orderBy ? `ORDER BY ${options.orderBy}` : 'ORDER BY 1'}) as rn
            FROM (${sql}) t
          ) WHERE rn > ${offset} AND rn <= ${offset + options.limit}
        `;
      }

      const result = await this.queryExecutor.execute(sql, binds);
      const data = result.rows ? result.rows.map(row => this.mapRowToEntity(row)) : [];

      this.updateMetrics(startTime, true);

      return {
        data,
        totalCount,
        page: options.page,
        limit: options.limit,
        hasNext: (options.page * options.limit) < totalCount,
        hasPrevious: options.page > 1,
        totalPages: Math.ceil(totalCount / options.limit)
      };
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  // Oracle特有操作
  async findByRowid(rowid: string, options: OracleQueryOptions = {}): Promise<T | null> {
    const startTime = Date.now();
    try {
      const sql = `SELECT * FROM ${this.getTableName()} WHERE ROWID = :rowid`;
      const binds = { rowid };

      const result = await this.queryExecutor.execute(sql, binds, options);
      this.updateMetrics(startTime, true);
      return result.rows && result.rows.length > 0 ? this.mapRowToEntity(result.rows[0]) : null;
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  async merge(entity: Partial<T>, matchColumns: string[], options: OracleQueryOptions = {}): Promise<T> {
    const startTime = Date.now();
    try {
      const row = this.mapEntityToRow(entity);

      // 構建MERGE語句
      const matchCondition = matchColumns.map(col => `target.${col} = source.${col}`).join(' AND ');
      const insertColumns = Object.keys(row);
      const updateColumns = insertColumns.filter(col => !matchColumns.includes(col));

      const sql = `
        MERGE INTO ${this.getTableName()} target
        USING (SELECT ${insertColumns.map(col => `:${col} as ${col}`).join(', ')} FROM dual) source
        ON (${matchCondition})
        WHEN MATCHED THEN
          UPDATE SET ${updateColumns.map(col => `${col} = source.${col}`).join(', ')}
        WHEN NOT MATCHED THEN
          INSERT (${insertColumns.join(', ')})
          VALUES (${insertColumns.map(col => `source.${col}`).join(', ')})
      `;

      await this.queryExecutor.execute(sql, row, options);
      this.updateMetrics(startTime, true);

      // 查詢合併後的實體
      const matchCriteria = matchColumns.reduce((acc, col) => {
        acc[col] = row[col];
        return acc;
      }, {} as Record<string, any>);

      return await this.findOne(matchCriteria as Partial<T>, options) as T;
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  // JSON操作
  async findByJson(jsonOptions: OracleJsonQueryOptions, options: OracleQueryOptions = {}): Promise<T[]> {
    const startTime = Date.now();
    try {
      let sql = `SELECT * FROM ${this.getTableName()}`;
      const binds: Record<string, any> = {};

      switch (jsonOptions.operator) {
        case 'EXISTS':
          sql += ` WHERE JSON_EXISTS(${jsonOptions.path.split('.')[0]}, '$.${jsonOptions.path.split('.').slice(1).join('.')}')`;
          break;
        case 'VALUE':
          sql += ` WHERE JSON_VALUE(${jsonOptions.path.split('.')[0]}, '$.${jsonOptions.path.split('.').slice(1).join('.')}') = :jsonValue`;
          binds.jsonValue = jsonOptions.value;
          break;
        default:
          throw new Error(`Unsupported JSON operator: ${jsonOptions.operator}`);
      }

      if (this.config.enableSoftDelete) {
        sql += ` AND ${this.config.softDeleteColumn} IS NULL`;
      }

      const result = await this.queryExecutor.execute(sql, binds, options);
      this.updateMetrics(startTime, true);
      return result.rows ? result.rows.map(row => this.mapRowToEntity(row)) : [];
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  async updateJson(id: string | number, jsonPath: string, value: any, options: OracleQueryOptions = {}): Promise<T> {
    const startTime = Date.now();
    try {
      const pathParts = jsonPath.split('.');
      const column = pathParts[0];
      const path = pathParts.slice(1).join('.');

      // 使用JSON_MERGEPATCH替代JSON_MODIFY，兼容Oracle 19c+
      const patchObject = this.buildJsonPatch(path, value);

      const sql = `
        UPDATE ${this.getTableName()}
        SET ${column} = JSON_MERGEPATCH(${column}, :jsonPatch)
        WHERE ${this.config.primaryKey} = :id
      `;

      const binds = { jsonPatch: JSON.stringify(patchObject), id };
      await this.queryExecutor.execute(sql, binds, options);

      this.updateMetrics(startTime, true);
      return await this.findById(id, options) as T;
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  /**
   * 建構JSON patch物件，支援巢狀路徑
   */
  private buildJsonPatch(path: string, value: any): any {
    const pathParts = path.split('.');
    let result: any = value;

    // 從最深層開始建構物件
    for (let i = pathParts.length - 1; i >= 0; i--) {
      const key = pathParts[i];
      result = { [key]: result };
    }

    return result;
  }

  // 聚合操作
  async aggregate(aggregateOptions: OracleAggregateOptions, options: OracleQueryOptions = {}): Promise<any[]> {
    const startTime = Date.now();
    try {
      let sql = `SELECT `;

      if (aggregateOptions.groupBy) {
        sql += aggregateOptions.groupBy.join(', ');
      }

      sql += ` FROM ${this.getTableName()}`;

      if (this.config.enableSoftDelete) {
        sql += ` WHERE ${this.config.softDeleteColumn} IS NULL`;
      }

      if (aggregateOptions.groupBy) {
        sql += ` GROUP BY ${aggregateOptions.groupBy.join(', ')}`;
      }

      if (aggregateOptions.having) {
        sql += ` HAVING ${aggregateOptions.having}`;
      }

      if (aggregateOptions.orderBy) {
        const orderClauses = aggregateOptions.orderBy.map(sort =>
          `${sort.column} ${sort.direction}${sort.nullsHandling ? ` ${sort.nullsHandling}` : ''}`
        );
        sql += ` ORDER BY ${orderClauses.join(', ')}`;
      }

      const result = await this.queryExecutor.execute(sql, {}, options);
      this.updateMetrics(startTime, true);
      return result.rows || [];
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  // 查詢建構器
  query(): OracleQueryBuilder {
    return new OracleQueryBuilderImpl(this.getTableName(), this.queryExecutor);
  }

  // 原始SQL執行
  async executeRaw(sql: string, binds: Record<string, any> = {}, options: OracleQueryOptions = {}): Promise<QueryResult> {
    const startTime = Date.now();
    try {
      const result = await this.queryExecutor.execute(sql, binds, options);
      this.updateMetrics(startTime, true);
      return result;
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  // 事務支援
  async withTransaction<R>(callback: (repo: this) => Promise<R>, options: OracleTransactionOptions = {}): Promise<R> {
    return await this.queryExecutor.withTransaction(async (transaction: Transaction) => {
      // 建立事務範圍內的repository實例
      const transactionRepo = Object.create(this);
      transactionRepo.queryExecutor = transaction;

      return await callback(transactionRepo);
    }, options);
  }

  // 測試期望的額外方法
  async findMany(ids: (string | number)[], options: OracleQueryOptions = {}): Promise<T[]> {
    const startTime = Date.now();
    try {
      if (ids.length === 0) return [];

      const placeholders = ids.map((_, index) => `:id${index}`).join(', ');
      const binds = ids.reduce((acc, id, index) => {
        acc[`id${index}`] = id;
        return acc;
      }, {} as Record<string, any>);

      let sql = `SELECT * FROM ${this.getTableName()} WHERE ${this.config.primaryKey} IN (${placeholders})`;

      if (this.config.enableSoftDelete) {
        sql += ` AND ${this.config.softDeleteColumn} IS NULL`;
      }

      const result = await this.queryExecutor.execute(sql, binds, options);
      this.updateMetrics(startTime, true);
      return result.rows ? result.rows.map(row => this.mapRowToEntity(row)) : [];
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  async batchCreate(entities: Partial<T>[], options: OracleBatchOptions = {}): Promise<T[]> {
    return await this.createMany(entities, options);
  }

  async batchUpdate(updates: Array<{ id: string | number; data: Partial<T> }>, options: OracleBatchOptions = {}): Promise<T[]> {
    return await this.updateMany(updates, options);
  }

  async batchDelete(ids: (string | number)[], options: OracleBatchOptions = {}): Promise<number> {
    return await this.deleteMany(ids, options);
  }

  async generateSequenceId(sequenceName?: string): Promise<number> {
    const startTime = Date.now();
    try {
      const seqName = sequenceName || `${this.config.tableName}_seq`;
      const sql = `SELECT ${seqName}.NEXTVAL as nextval FROM dual`;

      const result = await this.queryExecutor.execute(sql, {});
      this.updateMetrics(startTime, true);
      return result.rows?.[0]?.nextval || 0;
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  async bulkInsert(entities: Partial<T>[], options: OracleBatchOptions = {}): Promise<void> {
    await this.createMany(entities, options);
  }

  async upsert(entity: Partial<T>, matchColumns: string[], options: OracleQueryOptions = {}): Promise<T> {
    return await this.merge(entity, matchColumns, options);
  }

  async findWithCursor(options: { batchSize: number; cursor?: string }, criteria?: Partial<T>): Promise<{ data: T[]; nextCursor?: string; hasMore: boolean }> {
    const startTime = Date.now();
    try {
      let sql = `SELECT * FROM ${this.getTableName()}`;
      let binds: Record<string, any> = {};

      if (criteria) {
        const row = this.mapEntityToRow(criteria);
        const whereClause = Object.keys(row).map(col => `${col} = :${col}`).join(' AND ');
        if (whereClause) {
          sql += ` WHERE ${whereClause}`;
          binds = row;
        }
      }

      if (this.config.enableSoftDelete) {
        const hasWhere = sql.includes('WHERE');
        sql += hasWhere ? ` AND ${this.config.softDeleteColumn} IS NULL` : ` WHERE ${this.config.softDeleteColumn} IS NULL`;
      }

      if (options.cursor) {
        const hasWhere = sql.includes('WHERE');
        sql += hasWhere ? ` AND ${this.config.primaryKey} > :cursor` : ` WHERE ${this.config.primaryKey} > :cursor`;
        binds.cursor = options.cursor;
      }

      sql += ` ORDER BY ${this.config.primaryKey} FETCH FIRST ${options.batchSize + 1} ROWS ONLY`;

      const result = await this.queryExecutor.execute(sql, binds);
      const rows = result.rows || [];

      const hasMore = rows.length > options.batchSize;
      const data = (hasMore ? rows.slice(0, -1) : rows).map(row => this.mapRowToEntity(row));
      const nextCursor = hasMore ? rows[rows.length - 2][this.config.primaryKey] : undefined;

      this.updateMetrics(startTime, true);
      return { data, nextCursor, hasMore };
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  async softDelete(id: string | number, options: OracleQueryOptions = {}): Promise<boolean> {
    if (!this.config.enableSoftDelete) {
      throw new Error('Soft delete is not enabled for this repository');
    }

    const startTime = Date.now();
    try {
      let sql = `UPDATE ${this.getTableName()} SET ${this.config.softDeleteColumn} = SYSDATE`;

      if (this.config.enableAuditColumns && this.config.auditColumns?.updatedAt) {
        sql += `, ${this.config.auditColumns.updatedAt} = SYSDATE`;
      }

      sql += ` WHERE ${this.config.primaryKey} = :id AND ${this.config.softDeleteColumn} IS NULL`;

      const binds = { id };
      const result = await this.queryExecutor.execute(sql, binds, options);

      this.updateMetrics(startTime, true);
      return (result.rows?.length || 0) > 0;
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  async restore(id: string | number, options: OracleQueryOptions = {}): Promise<T | null> {
    if (!this.config.enableSoftDelete) {
      throw new Error('Soft delete is not enabled for this repository');
    }

    const startTime = Date.now();
    try {
      let sql = `UPDATE ${this.getTableName()} SET ${this.config.softDeleteColumn} = NULL`;

      if (this.config.enableAuditColumns && this.config.auditColumns?.updatedAt) {
        sql += `, ${this.config.auditColumns.updatedAt} = SYSDATE`;
      }

      sql += ` WHERE ${this.config.primaryKey} = :id`;

      const binds = { id };
      await this.queryExecutor.execute(sql, binds, options);

      this.updateMetrics(startTime, true);
      return await this.findById(id, options);
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  async findDeleted(options: OracleQueryOptions = {}): Promise<T[]> {
    if (!this.config.enableSoftDelete) {
      return [];
    }

    const startTime = Date.now();
    try {
      const sql = `SELECT * FROM ${this.getTableName()} WHERE ${this.config.softDeleteColumn} IS NOT NULL`;

      const result = await this.queryExecutor.execute(sql, {}, options);
      this.updateMetrics(startTime, true);
      return result.rows ? result.rows.map(row => this.mapRowToEntity(row)) : [];
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  // 效能監控
  getMetrics(): OracleRepositoryMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      cacheHitRate: 0,
      errorRate: 0,
      lastResetTime: new Date()
    };
  }

  private updateMetrics(startTime: number, success: boolean): void {
    const executionTime = Date.now() - startTime;
    this.metrics.totalQueries++;

    if (success) {
      const totalTime = this.metrics.averageQueryTime * (this.metrics.totalQueries - 1) + executionTime;
      this.metrics.averageQueryTime = totalTime / this.metrics.totalQueries;

      if (executionTime > 1000) { // 1秒以上視為慢查詢
        this.metrics.slowQueries++;
      }
    } else {
      this.metrics.errorRate = (this.metrics.errorRate * (this.metrics.totalQueries - 1) + 1) / this.metrics.totalQueries;
    }
  }
}

// Oracle查詢建構器實作
class OracleQueryBuilderImpl implements OracleQueryBuilder {
  private selectClause: string = '*';
  private fromClause: string = '';
  private whereClause: string = '';
  private joinClause: string = '';
  private orderByClause: string = '';
  private groupByClause: string = '';
  private havingClause: string = '';
  private limitClause: string = '';
  private hintClause: string = '';
  private binds: Record<string, any> = {};
  private bindCounter: number = 0;

  constructor(private tableName: string, private queryExecutor: OracleQueryExecutor) {
    this.fromClause = tableName;
  }

  select(columns: string | string[]): OracleQueryBuilder {
    this.selectClause = Array.isArray(columns) ? columns.join(', ') : columns;
    return this;
  }

  from(table: string, alias?: string): OracleQueryBuilder {
    this.fromClause = alias ? `${table} ${alias}` : table;
    return this;
  }

  where(condition: string, binds?: Record<string, any>): OracleQueryBuilder {
    if (this.whereClause) {
      this.whereClause += ` AND ${condition}`;
    } else {
      this.whereClause = condition;
    }

    if (binds) {
      Object.assign(this.binds, binds);
    }

    return this;
  }

  whereIn(column: string, values: any[]): OracleQueryBuilder {
    const bindKeys = values.map(() => {
      const key = `bind${this.bindCounter++}`;
      return `:${key}`;
    });

    values.forEach((value, index) => {
      this.binds[`bind${this.bindCounter - values.length + index}`] = value;
    });

    const condition = `${column} IN (${bindKeys.join(', ')})`;
    return this.where(condition);
  }

  whereExists(subquery: string): OracleQueryBuilder {
    const condition = `EXISTS (${subquery})`;
    return this.where(condition);
  }

  whereJson(options: OracleJsonQueryOptions): OracleQueryBuilder {
    const pathParts = options.path.split('.');
    const column = pathParts[0];
    const path = pathParts.slice(1).join('.');

    let condition: string;
    switch (options.operator) {
      case 'EXISTS':
        condition = `JSON_EXISTS(${column}, '$.${path}')`;
        break;
      case 'VALUE':
        const bindKey = `jsonValue${this.bindCounter++}`;
        condition = `JSON_VALUE(${column}, '$.${path}') = :${bindKey}`;
        this.binds[bindKey] = options.value;
        break;
      default:
        throw new Error(`Unsupported JSON operator: ${options.operator}`);
    }

    return this.where(condition);
  }

  join(table: string, condition: string, type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS' = 'INNER'): OracleQueryBuilder {
    const joinType = type === 'CROSS' ? 'CROSS JOIN' : `${type} JOIN`;
    this.joinClause += ` ${joinType} ${table} ON ${condition}`;
    return this;
  }

  orderBy(sorts: OracleSortOptions[]): OracleQueryBuilder {
    const orderClauses = sorts.map(sort =>
      `${sort.column} ${sort.direction}${sort.nullsHandling ? ` ${sort.nullsHandling}` : ''}`
    );
    this.orderByClause = orderClauses.join(', ');
    return this;
  }

  groupBy(columns: string[]): OracleQueryBuilder {
    this.groupByClause = columns.join(', ');
    return this;
  }

  having(condition: string): OracleQueryBuilder {
    this.havingClause = condition;
    return this;
  }

  limit(count: number, offset?: number): OracleQueryBuilder {
    if (offset) {
      this.limitClause = `OFFSET ${offset} ROWS FETCH NEXT ${count} ROWS ONLY`;
    } else {
      this.limitClause = `FETCH FIRST ${count} ROWS ONLY`;
    }
    return this;
  }

  hint(hints: string[]): OracleQueryBuilder {
    this.hintClause = `/*+ ${hints.join(' ')} */`;
    return this;
  }

  build(): { sql: string; binds: Record<string, any> } {
    let sql = `SELECT ${this.hintClause ? this.hintClause + ' ' : ''}${this.selectClause}`;
    sql += ` FROM ${this.fromClause}`;

    if (this.joinClause) {
      sql += this.joinClause;
    }

    if (this.whereClause) {
      sql += ` WHERE ${this.whereClause}`;
    }

    if (this.groupByClause) {
      sql += ` GROUP BY ${this.groupByClause}`;
    }

    if (this.havingClause) {
      sql += ` HAVING ${this.havingClause}`;
    }

    if (this.orderByClause) {
      sql += ` ORDER BY ${this.orderByClause}`;
    }

    if (this.limitClause) {
      sql += ` ${this.limitClause}`;
    }

    return { sql, binds: this.binds };
  }
}