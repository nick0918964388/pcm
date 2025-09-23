/**
 * New Base Repository Implementation
 * 新基礎儲存庫實作 - 實施任務 1.2
 */

import {
  IRepository,
  DatabaseConnection,
  SearchCriteria,
  PaginatedResult,
  ValidationResult,
  AuditFields
} from './types'

export class NewBaseRepository<T extends AuditFields> implements IRepository<T> {
  constructor(
    protected connection: DatabaseConnection,
    protected tableName: string
  ) {}

  async findById(id: string): Promise<T | null> {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ? AND deleted_at IS NULL`
      return await this.connection.queryOne<T>(sql, [id])
    } catch (error) {
      throw new Error(`Failed to find ${this.tableName} by id ${id}: ${(error as Error).message}`)
    }
  }

  async findMany(criteria: SearchCriteria): Promise<PaginatedResult<T>> {
    try {
      const queryBuilder = this.buildQuery(criteria)
      const countQuery = this.buildCountQuery(criteria)

      // Execute count and data queries in parallel
      const [totalResult, dataResult] = await Promise.all([
        this.connection.queryOne<{ count: number }>(countQuery.sql, countQuery.params),
        this.connection.query<T>(queryBuilder.sql, queryBuilder.params)
      ])

      const total = totalResult?.count || 0
      const { page = 1, limit = 20 } = criteria.pagination || {}

      return {
        data: dataResult,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (error) {
      throw new Error(`Failed to find ${this.tableName}: ${(error as Error).message}`)
    }
  }

  async create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    // Validate entity before creating
    const validation = this.validateEntity(entity as any)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }

    try {
      const id = this.generateId()
      const now = new Date()

      const entityWithAudit = {
        ...entity,
        id,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      } as T

      const fields = Object.keys(entityWithAudit)
      const values = Object.values(entityWithAudit)
      const placeholders = fields.map(() => '?').join(', ')

      const sql = `
        INSERT INTO ${this.tableName} (${fields.join(', ')})
        VALUES (${placeholders})
      `

      await this.connection.query(sql, values)

      return entityWithAudit
    } catch (error) {
      throw new Error(`Failed to create ${this.tableName}: ${(error as Error).message}`)
    }
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    // Validate updates
    const validation = this.validateUpdates(updates)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }

    try {
      // Check if entity exists
      const existing = await this.findById(id)
      if (!existing) {
        throw new Error(`${this.tableName} with id ${id} not found`)
      }

      const updatesWithAudit = {
        ...updates,
        updatedAt: new Date()
      }

      const fields = Object.keys(updatesWithAudit)
      const values = Object.values(updatesWithAudit)
      const setClause = fields.map(field => `${field} = ?`).join(', ')

      const sql = `
        UPDATE ${this.tableName}
        SET ${setClause}
        WHERE id = ? AND deleted_at IS NULL
      `

      await this.connection.query(sql, [...values, id])

      // Return updated entity
      return await this.findById(id) as T
    } catch (error) {
      throw new Error(`Failed to update ${this.tableName}: ${(error as Error).message}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      // Check if entity exists
      const existing = await this.findById(id)
      if (!existing) {
        throw new Error(`${this.tableName} with id ${id} not found`)
      }

      // Soft delete
      const sql = `
        UPDATE ${this.tableName}
        SET deleted_at = ?, updated_at = ?
        WHERE id = ? AND deleted_at IS NULL
      `

      const now = new Date()
      await this.connection.query(sql, [now, now, id])
    } catch (error) {
      throw new Error(`Failed to delete ${this.tableName}: ${(error as Error).message}`)
    }
  }

  // Helper methods

  private buildQuery(criteria: SearchCriteria): { sql: string; params: any[] } {
    let sql = `SELECT * FROM ${this.tableName} WHERE deleted_at IS NULL`
    const params: any[] = []

    // Add filters
    if (criteria.filters) {
      Object.entries(criteria.filters).forEach(([field, value]) => {
        sql += ` AND ${field} = ?`
        params.push(value)
      })
    }

    // Add sorting
    if (criteria.sort) {
      sql += ` ORDER BY ${criteria.sort.field} ${criteria.sort.order.toUpperCase()}`
    } else {
      sql += ` ORDER BY created_at DESC`
    }

    // Add pagination
    if (criteria.pagination) {
      const { page = 1, limit = 20 } = criteria.pagination
      const offset = (page - 1) * limit
      sql += ` LIMIT ? OFFSET ?`
      params.push(limit, offset)
    }

    return { sql, params }
  }

  private buildCountQuery(criteria: SearchCriteria): { sql: string; params: any[] } {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE deleted_at IS NULL`
    const params: any[] = []

    // Add filters
    if (criteria.filters) {
      Object.entries(criteria.filters).forEach(([field, value]) => {
        sql += ` AND ${field} = ?`
        params.push(value)
      })
    }

    return { sql, params }
  }

  protected validateEntity(entity: any): ValidationResult {
    const errors: string[] = []

    // Basic validation - can be overridden in derived classes
    if (!entity) {
      errors.push('Entity cannot be null or undefined')
      return { isValid: false, errors }
    }

    // Table-specific validations
    switch (this.tableName) {
      case 'photos':
        if (!entity.fileName || entity.fileName.trim() === '') {
          errors.push('fileName is required')
        }
        if (!entity.projectId) {
          errors.push('projectId is required')
        }
        if (entity.fileSize && entity.fileSize < 0) {
          errors.push('fileSize must be positive')
        }
        break

      case 'albums':
        if (!entity.name || entity.name.trim() === '') {
          errors.push('name is required')
        }
        if (!entity.projectId) {
          errors.push('projectId is required')
        }
        break

      case 'projects':
        if (!entity.name || entity.name.trim() === '') {
          errors.push('name is required')
        }
        if (!entity.code || entity.code.trim() === '') {
          errors.push('code is required')
        }
        break
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  protected validateUpdates(updates: Partial<T>): ValidationResult {
    const errors: string[] = []

    // Prevent updating audit fields directly
    const protectedFields = ['id', 'createdAt', 'deletedAt']
    protectedFields.forEach(field => {
      if (field in updates) {
        errors.push(`Cannot update protected field: ${field}`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  protected generateId(): string {
    return `${this.tableName.slice(0, -1)}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Advanced query methods

  async findByField(field: string, value: any): Promise<T[]> {
    const sql = `SELECT * FROM ${this.tableName} WHERE ${field} = ? AND deleted_at IS NULL`
    return this.connection.query<T>(sql, [value])
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.connection.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE id = ? AND deleted_at IS NULL`,
      [id]
    )
    return (result?.count || 0) > 0
  }

  async count(filters?: Record<string, any>): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE deleted_at IS NULL`
    const params: any[] = []

    if (filters) {
      Object.entries(filters).forEach(([field, value]) => {
        sql += ` AND ${field} = ?`
        params.push(value)
      })
    }

    const result = await this.connection.queryOne<{ count: number }>(sql, params)
    return result?.count || 0
  }

  async hardDelete(id: string): Promise<void> {
    // Only for administrative purposes - use with caution
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`
    await this.connection.query(sql, [id])
  }
}