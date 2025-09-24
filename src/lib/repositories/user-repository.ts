import { BaseRepository, FindOptions } from '../database/base-repository';
import { User, UserQueryParams } from '../types/database';
import { QueryBuilder } from '../database/query-builder';
import { db } from '../database/connection';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users', 'id', ['username', 'email', 'first_name', 'last_name']);
  }

  mapFromDB(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      password_hash: row.password_hash,
      first_name: row.first_name,
      last_name: row.last_name,
      is_verified: row.is_verified,
      is_active: row.is_active,
      last_login: row.last_login,
      failed_login_attempts: row.failed_login_attempts,
      locked_until: row.locked_until,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  mapToDB(entity: Partial<User>): Record<string, any> {
    const mapped: Record<string, any> = {};

    if (entity.username !== undefined) mapped.username = entity.username;
    if (entity.email !== undefined) mapped.email = entity.email;
    if (entity.password_hash !== undefined)
      mapped.password_hash = entity.password_hash;
    if (entity.first_name !== undefined) mapped.first_name = entity.first_name;
    if (entity.last_name !== undefined) mapped.last_name = entity.last_name;
    if (entity.is_verified !== undefined)
      mapped.is_verified = entity.is_verified;
    if (entity.is_active !== undefined) mapped.is_active = entity.is_active;
    if (entity.last_login !== undefined) mapped.last_login = entity.last_login;
    if (entity.failed_login_attempts !== undefined)
      mapped.failed_login_attempts = entity.failed_login_attempts;
    if (entity.locked_until !== undefined)
      mapped.locked_until = entity.locked_until;

    return mapped;
  }

  // 根據使用者名稱或信箱查找用戶
  async findByUsernameOrEmail(usernameOrEmail: string): Promise<User | null> {
    const query = `
      SELECT * FROM users 
      WHERE (username = $1 OR email = $1) 
      AND is_active = true
    `;
    const row = await db.queryOne(query, [usernameOrEmail]);
    return row ? this.mapFromDB(row) : null;
  }

  // 根據使用者名稱查找
  async findByUsername(username: string): Promise<User | null> {
    const query = `SELECT * FROM users WHERE username = $1 AND is_active = true`;
    const row = await db.queryOne(query, [username]);
    return row ? this.mapFromDB(row) : null;
  }

  // 根據信箱查找
  async findByEmail(email: string): Promise<User | null> {
    const query = `SELECT * FROM users WHERE email = $1 AND is_active = true`;
    const row = await db.queryOne(query, [email]);
    return row ? this.mapFromDB(row) : null;
  }

  // 檢查使用者名稱是否已存在
  async isUsernameExists(
    username: string,
    excludeUserId?: string
  ): Promise<boolean> {
    let query = `SELECT 1 FROM users WHERE username = $1 AND is_active = true`;
    const params = [username];

    if (excludeUserId) {
      query += ` AND id != $2`;
      params.push(excludeUserId);
    }

    const row = await db.queryOne(query, params);
    return !!row;
  }

  // 檢查信箱是否已存在
  async isEmailExists(email: string, excludeUserId?: string): Promise<boolean> {
    let query = `SELECT 1 FROM users WHERE email = $1 AND is_active = true`;
    const params = [email];

    if (excludeUserId) {
      query += ` AND id != $2`;
      params.push(excludeUserId);
    }

    const row = await db.queryOne(query, params);
    return !!row;
  }

  // 更新登入失敗次數
  async incrementFailedLoginAttempts(userId: string): Promise<void> {
    const query = `
      UPDATE users 
      SET failed_login_attempts = failed_login_attempts + 1,
          updated_at = NOW()
      WHERE id = $1
    `;
    await db.query(query, [userId]);
  }

  // 重置登入失敗次數
  async resetFailedLoginAttempts(userId: string): Promise<void> {
    const query = `
      UPDATE users 
      SET failed_login_attempts = 0,
          locked_until = NULL,
          updated_at = NOW()
      WHERE id = $1
    `;
    await db.query(query, [userId]);
  }

  // 鎖定用戶帳號
  async lockUser(userId: string, lockDurationMinutes = 30): Promise<void> {
    const query = `
      UPDATE users 
      SET locked_until = NOW() + INTERVAL '${lockDurationMinutes} minutes',
          updated_at = NOW()
      WHERE id = $1
    `;
    await db.query(query, [userId]);
  }

  // 更新最後登入時間
  async updateLastLogin(userId: string): Promise<void> {
    const query = `
      UPDATE users 
      SET last_login = NOW(),
          failed_login_attempts = 0,
          locked_until = NULL,
          updated_at = NOW()
      WHERE id = $1
    `;
    await db.query(query, [userId]);
  }

  // 驗證用戶帳號
  async verifyUser(userId: string): Promise<void> {
    const query = `
      UPDATE users 
      SET is_verified = true,
          updated_at = NOW()
      WHERE id = $1
    `;
    await db.query(query, [userId]);
  }

  // 檢查用戶是否被鎖定
  async isUserLocked(userId: string): Promise<boolean> {
    const query = `
      SELECT locked_until FROM users 
      WHERE id = $1 AND locked_until > NOW()
    `;
    const row = await db.queryOne(query, [userId]);
    return !!row;
  }

  // 根據角色查找用戶
  async findByRole(roleId: string, options: FindOptions = {}): Promise<User[]> {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = options;

    const builder = new QueryBuilder()
      .select(['u.*'])
      .from('users u')
      .innerJoin('user_roles ur', 'u.id = ur.user_id')
      .where('ur.role_id = ?', roleId)
      .where('u.is_active = ?', true)
      .orderBy(`u.${sortBy}`, sortOrder)
      .paginate({ page, pageSize });

    const { query, params } = builder.build();
    const rows = await db.query(query, params);
    return rows.map(row => this.mapFromDB(row));
  }

  // 查找已驗證的用戶
  async findVerifiedUsers(options: FindOptions = {}): Promise<User[]> {
    const filters = { is_verified: true, ...(options.filters || {}) };
    const result = await this.findAll({ ...options, filters });
    return result.data;
  }

  // 查找最近登入的用戶
  async findRecentlyLoggedIn(
    days = 30,
    options: FindOptions = {}
  ): Promise<User[]> {
    const builder = new QueryBuilder()
      .from(this.tableName)
      .where('is_active = ?', true)
      .where(
        'last_login >= ?',
        new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      )
      .orderBy('last_login', 'DESC');

    if (options.pageSize) {
      builder.paginate({ page: options.page || 1, pageSize: options.pageSize });
    }

    const { query, params } = builder.build();
    const rows = await db.query(query, params);
    return rows.map(row => this.mapFromDB(row));
  }

  // 統計用戶數據
  async getUserStats(): Promise<{
    total: number;
    verified: number;
    locked: number;
    recentlyActive: number;
  }> {
    const queries = [
      // 總用戶數
      'SELECT COUNT(*) as total FROM users WHERE is_active = true',

      // 已驗證用戶數
      'SELECT COUNT(*) as verified FROM users WHERE is_active = true AND is_verified = true',

      // 被鎖定用戶數
      'SELECT COUNT(*) as locked FROM users WHERE is_active = true AND locked_until > NOW()',

      // 最近活躍用戶數 (7天內)
      `SELECT COUNT(*) as recent FROM users 
       WHERE is_active = true AND last_login >= NOW() - INTERVAL '7 days'`,
    ];

    const results = await Promise.all(
      queries.map(query => db.queryOne<{ [key: string]: number }>(query))
    );

    return {
      total: results[0]?.total || 0,
      verified: results[1]?.verified || 0,
      locked: results[2]?.locked || 0,
      recentlyActive: results[3]?.recent || 0,
    };
  }

  // 自訂查詢參數處理
  protected applyFilters(
    builder: QueryBuilder,
    filters: Record<string, any>
  ): void {
    super.applyFilters(builder, filters);

    // 特殊篩選條件
    if (filters.isVerified !== undefined) {
      builder.where('is_verified = ?', filters.isVerified);
    }

    if (filters.hasRecentLogin) {
      builder.where(
        'last_login >= ?',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );
    }

    if (filters.isLocked) {
      builder.where('locked_until > NOW()');
    }

    if (filters.role) {
      builder
        .innerJoin('user_roles ur', 'users.id = ur.user_id')
        .innerJoin('roles r', 'ur.role_id = r.id')
        .where('r.name = ?', filters.role);
    }
  }
}
