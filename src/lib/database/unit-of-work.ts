/**
 * Unit of Work Implementation
 * 工作單元實作 - 實施任務 1.2
 */

import {
  IUnitOfWork,
  IRepository,
  RepositoryType,
  IDatabaseAbstraction,
  DatabaseConnection
} from './types'
import { NewBaseRepository } from './new-base-repository'

export class UnitOfWork implements IUnitOfWork {
  private connection: DatabaseConnection | null = null
  private repositories: Map<string, IRepository<any>> = new Map()
  private isTransactionActive = false

  constructor(
    private databaseAbstraction: IDatabaseAbstraction,
    private database: 'oracle' | 'postgresql' = 'oracle'
  ) {}

  async begin(): Promise<void> {
    if (this.isTransactionActive) {
      throw new Error('Transaction is already active')
    }

    this.connection = await this.databaseAbstraction.getConnection(this.database)

    try {
      if (this.database === 'oracle') {
        await this.connection.query('BEGIN')
      } else {
        await this.connection.query('BEGIN')
      }

      this.isTransactionActive = true
    } catch (error) {
      await this.databaseAbstraction.releaseConnection(this.connection)
      this.connection = null
      throw error
    }
  }

  async commit(): Promise<void> {
    if (!this.isTransactionActive || !this.connection) {
      throw new Error('No active transaction to commit')
    }

    try {
      await this.connection.query('COMMIT')
    } finally {
      await this.cleanup()
    }
  }

  async rollback(): Promise<void> {
    if (!this.isTransactionActive || !this.connection) {
      throw new Error('No active transaction to rollback')
    }

    try {
      await this.connection.query('ROLLBACK')
    } finally {
      await this.cleanup()
    }
  }

  getRepository<T>(type: RepositoryType<T>): IRepository<T> {
    const typeName = this.getTypeName(type)

    if (!this.repositories.has(typeName)) {
      if (!this.connection) {
        throw new Error('No active transaction. Call begin() first.')
      }

      const repository = this.createRepository<T>(typeName, this.connection)
      this.repositories.set(typeName, repository)
    }

    return this.repositories.get(typeName)!
  }

  private createRepository<T>(typeName: string, connection: DatabaseConnection): IRepository<T> {
    // Factory method to create specific repository types
    switch (typeName) {
      case 'Photo':
        return new PhotoRepository(connection) as any
      case 'Album':
        return new AlbumRepository(connection) as any
      case 'Project':
        return new ProjectRepository(connection) as any
      default:
        return new NewBaseRepository<T>(connection, typeName)
    }
  }

  private getTypeName(type: RepositoryType<any>): string {
    if (typeof type === 'string') {
      return type
    } else if (typeof type === 'function') {
      return type.name
    } else {
      throw new Error('Invalid repository type')
    }
  }

  private async cleanup(): Promise<void> {
    this.isTransactionActive = false
    this.repositories.clear()

    if (this.connection) {
      await this.databaseAbstraction.releaseConnection(this.connection)
      this.connection = null
    }
  }
}

// Specific repository implementations
class PhotoRepository extends NewBaseRepository<any> {
  constructor(connection: DatabaseConnection) {
    super(connection, 'photos')
  }

  // Photo-specific methods can be added here
  async findByProjectId(projectId: string): Promise<any[]> {
    return this.connection.query(
      'SELECT * FROM photos WHERE project_id = ? AND deleted_at IS NULL',
      [projectId]
    )
  }

  async findByAlbumId(albumId: string): Promise<any[]> {
    return this.connection.query(
      'SELECT * FROM photos WHERE album_id = ? AND deleted_at IS NULL',
      [albumId]
    )
  }
}

class AlbumRepository extends NewBaseRepository<any> {
  constructor(connection: DatabaseConnection) {
    super(connection, 'albums')
  }

  // Album-specific methods can be added here
  async updatePhotoCount(albumId: string): Promise<void> {
    await this.connection.query(`
      UPDATE albums
      SET photo_count = (
        SELECT COUNT(*) FROM photos
        WHERE album_id = ? AND deleted_at IS NULL
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [albumId, albumId])
  }
}

class ProjectRepository extends NewBaseRepository<any> {
  constructor(connection: DatabaseConnection) {
    super(connection, 'projects')
  }

  // Project-specific methods can be added here
  async findByUserId(userId: string): Promise<any[]> {
    return this.connection.query(`
      SELECT p.* FROM projects p
      JOIN user_projects up ON p.id = up.project_id
      WHERE up.user_id = ? AND p.deleted_at IS NULL
    `, [userId])
  }
}