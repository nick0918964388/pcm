/**
 * Database Abstraction Layer
 * 資料庫抽象層 - 實施任務 1.1 和 1.2
 */

import {
  IDatabaseAbstraction,
  IConnectionPoolManager,
  DatabaseConnection,
  HealthStatus,
  IUnitOfWork,
  DatabaseError,
} from './types';
import { UnitOfWork } from './unit-of-work';

export class DatabaseAbstraction implements IDatabaseAbstraction {
  constructor(private connectionPoolManager: IConnectionPoolManager) {}

  async getConnection(
    database: 'oracle' | 'postgresql'
  ): Promise<DatabaseConnection> {
    try {
      return await this.connectionPoolManager.getConnection(database);
    } catch (error) {
      throw this.wrapDatabaseError(error as Error, 'getConnection');
    }
  }

  async releaseConnection(connection: DatabaseConnection): Promise<void> {
    try {
      await this.connectionPoolManager.releaseConnection(connection);
    } catch (error) {
      // Log error but don't throw - connection release errors should not fail operations
      console.error(`Failed to release connection ${connection.id}:`, error);
    }
  }

  async query<T = any>(
    sql: string,
    params: any[] = [],
    database: 'oracle' | 'postgresql' = 'oracle'
  ): Promise<T[]> {
    const connection = await this.getConnection(database);

    try {
      const startTime = Date.now();
      const result = await connection.query<T>(sql, params);
      const duration = Date.now() - startTime;

      // Log slow queries (> 500ms)
      if (duration > 500) {
        console.warn(
          `Slow query detected: ${duration}ms - ${sql.substring(0, 100)}...`
        );
      }

      return result;
    } catch (error) {
      throw this.wrapDatabaseError(error as Error, 'query', { sql, params });
    } finally {
      await this.releaseConnection(connection);
    }
  }

  async queryOne<T = any>(
    sql: string,
    params: any[] = [],
    database: 'oracle' | 'postgresql' = 'oracle'
  ): Promise<T | null> {
    const connection = await this.getConnection(database);

    try {
      return await connection.queryOne<T>(sql, params);
    } catch (error) {
      throw this.wrapDatabaseError(error as Error, 'queryOne', { sql, params });
    } finally {
      await this.releaseConnection(connection);
    }
  }

  async transaction<T>(
    callback: (connection: DatabaseConnection) => Promise<T>,
    database: 'oracle' | 'postgresql' = 'oracle'
  ): Promise<T> {
    const connection = await this.getConnection(database);

    try {
      // Begin transaction
      if (database === 'oracle') {
        await connection.query('BEGIN');
      } else {
        await connection.query('BEGIN');
      }

      const result = await callback(connection);

      // Commit transaction
      await connection.query('COMMIT');
      return result;
    } catch (error) {
      // Rollback on error
      try {
        await connection.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to rollback transaction:', rollbackError);
      }

      throw this.wrapDatabaseError(error as Error, 'transaction');
    } finally {
      await this.releaseConnection(connection);
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      return await this.connectionPoolManager.healthCheck();
    } catch (error) {
      throw this.wrapDatabaseError(error as Error, 'healthCheck');
    }
  }

  createUnitOfWork(): IUnitOfWork {
    return new UnitOfWork(this);
  }

  private wrapDatabaseError(
    originalError: Error,
    operation: string,
    context?: Record<string, any>
  ): DatabaseError {
    // Parse specific database errors
    let code = 'DATABASE_ERROR';
    let message = originalError.message;
    let retryable = false;

    // Oracle specific errors
    if (originalError.message.includes('ORA-')) {
      if (originalError.message.includes('ORA-00942')) {
        code = 'TABLE_NOT_FOUND';
        message = 'Table or view does not exist';
      } else if (originalError.message.includes('ORA-12154')) {
        code = 'CONNECTION_ERROR';
        message = 'Could not resolve database connection';
        retryable = true;
      } else if (originalError.message.includes('ORA-01017')) {
        code = 'AUTHENTICATION_ERROR';
        message = 'Invalid username or password';
      }
    }

    // PostgreSQL specific errors
    if (
      originalError.message.includes('relation') &&
      originalError.message.includes('does not exist')
    ) {
      code = 'TABLE_NOT_FOUND';
      message = 'Table or relation does not exist';
    }

    // Connection timeout errors
    if (
      originalError.message.includes('timeout') ||
      originalError.message.includes('TIMEOUT')
    ) {
      code = 'TIMEOUT_ERROR';
      message = 'Database operation timed out';
      retryable = true;
    }

    // Connection pool errors
    if (originalError.message.includes('pool exhausted')) {
      code = 'POOL_EXHAUSTED';
      message = 'Connection pool exhausted';
      retryable = true;
    }

    const error = new Error(`${operation}: ${message}`) as DatabaseError;
    error.name = 'DatabaseError';
    error.code = code;
    error.originalError = originalError;
    error.retryable = retryable;

    // Add context information
    if (context) {
      console.error(`Database error in ${operation}:`, {
        code,
        message,
        context,
        originalError: originalError.message,
        stack: originalError.stack,
      });
    }

    return error;
  }
}
