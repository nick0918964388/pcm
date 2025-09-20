// SQL Query Builder for dynamic query construction
export interface QueryFilter {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'ILIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL';
  value?: any;
}

export interface SortOption {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface PaginationOption {
  page: number;
  pageSize: number;
}

export class QueryBuilder {
  private selectFields: string[] = [];
  private fromClause = '';
  private joinClauses: string[] = [];
  private whereClauses: string[] = [];
  private groupByFields: string[] = [];
  private havingClauses: string[] = [];
  private orderByFields: string[] = [];
  private limitClause = '';
  private offsetClause = '';
  private parameters: any[] = [];

  select(fields: string | string[]): QueryBuilder {
    if (typeof fields === 'string') {
      this.selectFields.push(fields);
    } else {
      this.selectFields.push(...fields);
    }
    return this;
  }

  from(table: string): QueryBuilder {
    this.fromClause = table;
    return this;
  }

  leftJoin(table: string, condition: string): QueryBuilder {
    this.joinClauses.push(`LEFT JOIN ${table} ON ${condition}`);
    return this;
  }

  innerJoin(table: string, condition: string): QueryBuilder {
    this.joinClauses.push(`INNER JOIN ${table} ON ${condition}`);
    return this;
  }

  where(condition: string, value?: any): QueryBuilder {
    if (value !== undefined) {
      this.parameters.push(value);
      const paramIndex = this.parameters.length;
      this.whereClauses.push(condition.replace('?', `$${paramIndex}`));
    } else {
      this.whereClauses.push(condition);
    }
    return this;
  }

  whereIn(field: string, values: any[]): QueryBuilder {
    if (values.length === 0) return this;
    
    const placeholders = values.map((_, index) => {
      this.parameters.push(values[index]);
      return `$${this.parameters.length}`;
    }).join(', ');
    
    this.whereClauses.push(`${field} IN (${placeholders})`);
    return this;
  }

  whereLike(field: string, value: string): QueryBuilder {
    this.parameters.push(`%${value}%`);
    this.whereClauses.push(`${field} ILIKE $${this.parameters.length}`);
    return this;
  }

  whereDateRange(field: string, startDate?: string, endDate?: string): QueryBuilder {
    if (startDate) {
      this.parameters.push(startDate);
      this.whereClauses.push(`${field} >= $${this.parameters.length}`);
    }
    if (endDate) {
      this.parameters.push(endDate);
      this.whereClauses.push(`${field} <= $${this.parameters.length}`);
    }
    return this;
  }

  groupBy(fields: string | string[]): QueryBuilder {
    if (typeof fields === 'string') {
      this.groupByFields.push(fields);
    } else {
      this.groupByFields.push(...fields);
    }
    return this;
  }

  having(condition: string): QueryBuilder {
    this.havingClauses.push(condition);
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByFields.push(`${field} ${direction}`);
    return this;
  }

  limit(count: number): QueryBuilder {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }

  offset(count: number): QueryBuilder {
    this.offsetClause = `OFFSET ${count}`;
    return this;
  }

  paginate(pagination: PaginationOption): QueryBuilder {
    const offset = (pagination.page - 1) * pagination.pageSize;
    this.limit(pagination.pageSize);
    this.offset(offset);
    return this;
  }

  build(): { query: string; params: any[] } {
    let query = '';

    // SELECT clause
    if (this.selectFields.length > 0) {
      query += `SELECT ${this.selectFields.join(', ')}`;
    } else {
      query += 'SELECT *';
    }

    // FROM clause
    if (this.fromClause) {
      query += ` FROM ${this.fromClause}`;
    }

    // JOIN clauses
    if (this.joinClauses.length > 0) {
      query += ` ${this.joinClauses.join(' ')}`;
    }

    // WHERE clause
    if (this.whereClauses.length > 0) {
      query += ` WHERE ${this.whereClauses.join(' AND ')}`;
    }

    // GROUP BY clause
    if (this.groupByFields.length > 0) {
      query += ` GROUP BY ${this.groupByFields.join(', ')}`;
    }

    // HAVING clause
    if (this.havingClauses.length > 0) {
      query += ` HAVING ${this.havingClauses.join(' AND ')}`;
    }

    // ORDER BY clause
    if (this.orderByFields.length > 0) {
      query += ` ORDER BY ${this.orderByFields.join(', ')}`;
    }

    // LIMIT clause
    if (this.limitClause) {
      query += ` ${this.limitClause}`;
    }

    // OFFSET clause
    if (this.offsetClause) {
      query += ` ${this.offsetClause}`;
    }

    return {
      query: query.trim(),
      params: this.parameters
    };
  }

  // 建立 COUNT 查詢
  buildCountQuery(): { query: string; params: any[] } {
    let query = 'SELECT COUNT(*) as total';

    if (this.fromClause) {
      query += ` FROM ${this.fromClause}`;
    }

    if (this.joinClauses.length > 0) {
      query += ` ${this.joinClauses.join(' ')}`;
    }

    if (this.whereClauses.length > 0) {
      query += ` WHERE ${this.whereClauses.join(' AND ')}`;
    }

    return {
      query: query.trim(),
      params: this.parameters
    };
  }

  clone(): QueryBuilder {
    const cloned = new QueryBuilder();
    cloned.selectFields = [...this.selectFields];
    cloned.fromClause = this.fromClause;
    cloned.joinClauses = [...this.joinClauses];
    cloned.whereClauses = [...this.whereClauses];
    cloned.groupByFields = [...this.groupByFields];
    cloned.havingClauses = [...this.havingClauses];
    cloned.orderByFields = [...this.orderByFields];
    cloned.limitClause = this.limitClause;
    cloned.offsetClause = this.offsetClause;
    cloned.parameters = [...this.parameters];
    return cloned;
  }
}

// 輔助函數
export function createQueryBuilder(): QueryBuilder {
  return new QueryBuilder();
}

// 常用查詢模式
export const QueryPatterns = {
  // 軟刪除查詢
  activeOnly: (builder: QueryBuilder) => {
    return builder.where('is_active = ?', true);
  },

  // 日期範圍查詢
  dateRange: (builder: QueryBuilder, field: string, startDate?: string, endDate?: string) => {
    return builder.whereDateRange(field, startDate, endDate);
  },

  // 搜尋查詢
  search: (builder: QueryBuilder, fields: string[], searchTerm: string) => {
    if (!searchTerm) return builder;
    
    const searchClauses = fields.map(field => `${field} ILIKE '%${searchTerm}%'`);
    return builder.where(`(${searchClauses.join(' OR ')})`);
  },

  // 分頁查詢
  paginated: (builder: QueryBuilder, page: number, pageSize: number) => {
    return builder.paginate({ page, pageSize });
  }
};