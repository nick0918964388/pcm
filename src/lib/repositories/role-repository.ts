import { BaseRepository, FindOptions } from '../database/base-repository';
import { Role, UserRole } from '../types/database';
import { QueryBuilder } from '../database/query-builder';
import { db } from '../database/connection';

export class RoleRepository extends BaseRepository<Role> {
  constructor() {
    super('roles', 'id', ['name', 'description']);
  }

  mapFromDB(row: any): Role {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: Array.isArray(row.permissions) ? row.permissions : [],
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  mapToDB(entity: Partial<Role>): Record<string, any> {
    const mapped: Record<string, any> = {};
    
    if (entity.name !== undefined) mapped.name = entity.name;
    if (entity.description !== undefined) mapped.description = entity.description;
    if (entity.permissions !== undefined) {
      mapped.permissions = JSON.stringify(entity.permissions);
    }
    if (entity.is_active !== undefined) mapped.is_active = entity.is_active;

    return mapped;
  }

  // 根據角色名稱查找
  async findByName(name: string): Promise<Role | null> {
    const query = `SELECT * FROM roles WHERE name = $1 AND is_active = true`;
    const row = await db.queryOne(query, [name]);
    return row ? this.mapFromDB(row) : null;
  }

  // 檢查角色名稱是否已存在
  async isNameExists(name: string, excludeRoleId?: string): Promise<boolean> {
    let query = `SELECT 1 FROM roles WHERE name = $1 AND is_active = true`;
    const params = [name];

    if (excludeRoleId) {
      query += ` AND id != $2`;
      params.push(excludeRoleId);
    }

    const row = await db.queryOne(query, params);
    return !!row;
  }

  // 獲取用戶的所有角色
  async findUserRoles(userId: string): Promise<Role[]> {
    const query = `
      SELECT r.* FROM roles r
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1 AND r.is_active = true
      ORDER BY r.name
    `;
    const rows = await db.query(query, [userId]);
    return rows.map(row => this.mapFromDB(row));
  }

  // 根據權限查找角色
  async findByPermission(permission: string): Promise<Role[]> {
    const query = `
      SELECT * FROM roles 
      WHERE permissions::jsonb ? $1 
      AND is_active = true
      ORDER BY name
    `;
    const rows = await db.query(query, [permission]);
    return rows.map(row => this.mapFromDB(row));
  }

  // 獲取角色的用戶數量
  async getRoleUserCount(roleId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count 
      FROM user_roles ur
      INNER JOIN users u ON ur.user_id = u.id
      WHERE ur.role_id = $1 AND u.is_active = true
    `;
    const result = await db.queryOne<{ count: number }>(query, [roleId]);
    return result?.count || 0;
  }

  // 分配角色給用戶
  async assignRoleToUser(userId: string, roleId: string, assignedBy: string): Promise<void> {
    // 檢查是否已經分配過
    const existing = await db.queryOne(
      'SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    );

    if (!existing) {
      await db.query(`
        INSERT INTO user_roles (user_id, role_id, assigned_at, assigned_by)
        VALUES ($1, $2, NOW(), $3)
      `, [userId, roleId, assignedBy]);
    }
  }

  // 移除用戶角色
  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await db.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    );
  }

  // 更新用戶的所有角色 (完全替換)
  async updateUserRoles(userId: string, roleIds: string[], assignedBy: string): Promise<void> {
    await db.transaction(async (client) => {
      // 刪除現有角色
      await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);

      // 分配新角色
      if (roleIds.length > 0) {
        const values = roleIds.map((roleId, index) => {
          const base = index * 4;
          return `($${base + 1}, $${base + 2}, NOW(), $${base + 3})`;
        }).join(', ');

        const params = roleIds.flatMap(roleId => [userId, roleId, assignedBy]);
        
        await client.query(`
          INSERT INTO user_roles (user_id, role_id, assigned_at, assigned_by)
          VALUES ${values}
        `, params);
      }
    });
  }

  // 檢查用戶是否有特定角色
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1 AND r.name = $2 AND r.is_active = true
    `;
    const row = await db.queryOne(query, [userId, roleName]);
    return !!row;
  }

  // 檢查用戶是否有特定權限
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1 
      AND r.permissions::jsonb ? $2 
      AND r.is_active = true
    `;
    const row = await db.queryOne(query, [userId, permission]);
    return !!row;
  }

  // 獲取用戶的所有權限
  async getUserPermissions(userId: string): Promise<string[]> {
    const query = `
      SELECT r.permissions FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1 AND r.is_active = true
    `;
    const rows = await db.query<{ permissions: string }>(query, [userId]);
    
    const allPermissions = new Set<string>();
    rows.forEach(row => {
      const permissions = JSON.parse(row.permissions || '[]');
      permissions.forEach((permission: string) => allPermissions.add(permission));
    });

    return Array.from(allPermissions);
  }

  // 獲取角色統計
  async getRoleStats(): Promise<{
    totalRoles: number;
    totalUserRoles: number;
    mostUsedRole: { name: string; userCount: number } | null;
  }> {
    const queries = [
      'SELECT COUNT(*) as total FROM roles WHERE is_active = true',
      'SELECT COUNT(*) as total FROM user_roles',
      `SELECT r.name, COUNT(ur.user_id) as user_count
       FROM roles r
       LEFT JOIN user_roles ur ON r.id = ur.role_id
       WHERE r.is_active = true
       GROUP BY r.id, r.name
       ORDER BY user_count DESC
       LIMIT 1`
    ];

    const [totalRoles, totalUserRoles, mostUsed] = await Promise.all([
      db.queryOne<{ total: number }>(queries[0]),
      db.queryOne<{ total: number }>(queries[1]),
      db.queryOne<{ name: string; user_count: number }>(queries[2])
    ]);

    return {
      totalRoles: totalRoles?.total || 0,
      totalUserRoles: totalUserRoles?.total || 0,
      mostUsedRole: mostUsed ? {
        name: mostUsed.name,
        userCount: mostUsed.user_count
      } : null
    };
  }

  // 複製角色
  async duplicateRole(sourceRoleId: string, newName: string, newDescription?: string): Promise<Role> {
    const sourceRole = await this.findById(sourceRoleId);
    if (!sourceRole) {
      throw new Error('來源角色不存在');
    }

    return this.create({
      name: newName,
      description: newDescription || `複製自 ${sourceRole.name}`,
      permissions: sourceRole.permissions
    });
  }
}