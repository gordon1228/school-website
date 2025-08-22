// src/services/roleService.ts
import { getDatabase, createTransaction } from '../config/database';
import { AuditService } from './auditService';

export interface Role {
  id: number;
  roleName: string;
  description?: string;
  isSystemRole: boolean;
  isActive: boolean;
  inactivityLockEnabled: boolean;
  inactivityLockDays: number;
  createdBy: number;
  createdTs: Date;
  updatedBy?: number;
  updatedTs?: Date;
  permissions?: Permission[];
  userCount?: number;
}

export interface Permission {
  id: number;
  permissionName: string;
  description?: string;
  module: string;
  action: string;
}

export interface CreateRoleData {
  roleName: string;
  description?: string;
  inactivityLockEnabled?: boolean;
  inactivityLockDays?: number;
  permissions?: number[];
  createdBy: number;
}

export class RoleService {
  /**
   * Get all roles with pagination and search
   */
  static async getAllRoles(
    page: number = 1, 
    limit: number = 10, 
    search?: string
  ): Promise<{ roles: Role[], total: number }> {
    const db = getDatabase();
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE r.IS_ACTIVE = 1';
    const params: any = { offset, limit };

    if (search) {
      whereClause += ' AND (r.ROLE_NAME LIKE @search OR r.DESCRIPTION LIKE @search)';
      params.search = `%${search}%`;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM Roles r 
      ${whereClause}
    `;
    const countResult = await db.request();
    Object.keys(params).forEach(key => {
      if (key !== 'offset' && key !== 'limit') {
        countResult.input(key, params[key]);
      }
    });
    const totalResult = await countResult.query(countQuery);
    const total = totalResult.recordset[0].total;

    // Get roles with user count
    const rolesQuery = `
      SELECT 
        r.ID, r.ROLE_NAME, r.DESCRIPTION, r.IS_SYSTEM_ROLE, r.IS_ACTIVE,
        r.INACTIVITY_LOCK_ENABLED, r.INACTIVITY_LOCK_DAYS,
        r.CREATED_BY, r.CREATED_TS, r.UPDATED_BY, r.UPDATED_TS,
        COUNT(ur.USER_ID) as USER_COUNT
      FROM Roles r
      LEFT JOIN UserRoles ur ON r.ID = ur.ROLE_ID AND ur.IS_ACTIVE = 1
      ${whereClause}
      GROUP BY r.ID, r.ROLE_NAME, r.DESCRIPTION, r.IS_SYSTEM_ROLE, r.IS_ACTIVE,
               r.INACTIVITY_LOCK_ENABLED, r.INACTIVITY_LOCK_DAYS,
               r.CREATED_BY, r.CREATED_TS, r.UPDATED_BY, r.UPDATED_TS
      ORDER BY r.CREATED_TS DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const request = db.request();
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });

    const result = await request.query(rolesQuery);

    const roles = result.recordset.map((row: any): Role => ({
      id: row.ID,
      roleName: row.ROLE_NAME,
      description: row.DESCRIPTION,
      isSystemRole: row.IS_SYSTEM_ROLE,
      isActive: row.IS_ACTIVE,
      inactivityLockEnabled: row.INACTIVITY_LOCK_ENABLED,
      inactivityLockDays: row.INACTIVITY_LOCK_DAYS,
      createdBy: row.CREATED_BY,
      createdTs: row.CREATED_TS,
      updatedBy: row.UPDATED_BY,
      updatedTs: row.UPDATED_TS,
      userCount: row.USER_COUNT
    }));

    return { roles, total };
  }

  /**
   * Get role by ID with permissions
   */
  static async getRoleById(roleId: number): Promise<Role | null> {
    const db = getDatabase();
    
    const query = `
      SELECT 
        r.ID, r.ROLE_NAME, r.DESCRIPTION, r.IS_SYSTEM_ROLE, r.IS_ACTIVE,
        r.INACTIVITY_LOCK_ENABLED, r.INACTIVITY_LOCK_DAYS,
        r.CREATED_BY, r.CREATED_TS, r.UPDATED_BY, r.UPDATED_TS,
        p.ID as PERMISSION_ID, p.PERMISSION_NAME, p.DESCRIPTION as PERMISSION_DESC,
        p.MODULE, p.ACTION
      FROM Roles r
      LEFT JOIN RolePermissions rp ON r.ID = rp.ROLE_ID AND rp.IS_GRANTED = 1
      LEFT JOIN Permissions p ON rp.PERMISSION_ID = p.ID
      WHERE r.ID = @roleId AND r.IS_ACTIVE = 1
    `;

    const result = await db.request()
      .input('roleId', roleId)
      .query(query);

    if (result.recordset.length === 0) {
      return null;
    }

    const roleData = result.recordset[0];
    const permissions: Permission[] = [];

    result.recordset.forEach(row => {
      if (row.PERMISSION_ID && !permissions.find(p => p.id === row.PERMISSION_ID)) {
        permissions.push({
          id: row.PERMISSION_ID,
          permissionName: row.PERMISSION_NAME,
          description: row.PERMISSION_DESC,
          module: row.MODULE,
          action: row.ACTION
        });
      }
    });

    return {
      id: roleData.ID,
      roleName: roleData.ROLE_NAME,
      description: roleData.DESCRIPTION,
      isSystemRole: roleData.IS_SYSTEM_ROLE,
      isActive: roleData.IS_ACTIVE,
      inactivityLockEnabled: roleData.INACTIVITY_LOCK_ENABLED,
      inactivityLockDays: roleData.INACTIVITY_LOCK_DAYS,
      createdBy: roleData.CREATED_BY,
      createdTs: roleData.CREATED_TS,
      updatedBy: roleData.UPDATED_BY,
      updatedTs: roleData.UPDATED_TS,
      permissions
    };
  }

  /**
   * Create new role
   */
  static async createRole(roleData: CreateRoleData): Promise<{ success: boolean; roleId?: number; message?: string }> {
    const transaction = createTransaction();
    
    try {
      await transaction.begin();

      // Check if role name already exists
      const existingRole = await transaction.request()
        .input('roleName', roleData.roleName)
        .query(`SELECT ID FROM Roles WHERE ROLE_NAME = @roleName`);

      if (existingRole.recordset.length > 0) {
        await transaction.rollback();
        return { success: false, message: 'Role name already exists' };
      }

      // Insert new role
      const result = await transaction.request()
        .input('roleName', roleData.roleName)
        .input('description', roleData.description || null)
        .input('inactivityLockEnabled', roleData.inactivityLockEnabled || false)
        .input('inactivityLockDays', roleData.inactivityLockDays || 0)
        .input('createdBy', roleData.createdBy)
        .query(`
          INSERT INTO Permissions (PERMISSION_NAME, DESCRIPTION, MODULE, ACTION, CREATED_BY)
          OUTPUT INSERTED.ID
          VALUES (@permissionName, @description, @module, @action, @createdBy)
        `);

      const roleId: number = result.recordset[0].ID;
      return { success: true, roleId };

    } catch (error) {
      console.error('Create permission error:', error);
      return { success: false, message: 'Failed to create permission' };
    }
  }

  /**
   * Get permissions grouped by module
   */
  static async getPermissionsByModule(): Promise<{ [module: string]: Permission[] }> {
    const permissions = await this.getAllPermissions();
    const grouped: { [module: string]: Permission[] } = {};

    permissions.forEach((permission: Permission) => {
      if (!grouped[permission.module]) {
        grouped[permission.module] = [];
      }
      grouped[permission.module].push(permission);
    });

    return grouped;
  }
    static async getAllPermissions(): Promise<Permission[]> {
        const db = getDatabase();
        const result = await db.request().query(`
            SELECT ID, PERMISSION_NAME, DESCRIPTION, MODULE, ACTION
            FROM Permissions
            WHERE IS_ACTIVE = 1
        `);
        return result.recordset.map((row: any): Permission => ({
            id: row.ID,
            permissionName: row.PERMISSION_NAME,
            description: row.DESCRIPTION,
            module: row.MODULE,
            action: row.ACTION
        }));
    }


    static async assignRoleToUser(roleId: number, userId: number, assignedBy: number) {
    // existing implementation
    const db = getDatabase();
    await db.request()
      .input('roleId', roleId)
      .input('userId', userId)
      .input('assignedBy', assignedBy)
      .query(`
        INSERT INTO UserRoles (ROLE_ID, USER_ID, ASSIGNED_BY)
        VALUES (@roleId, @userId, @assignedBy)
      `);
  }

  static async removeRoleFromUser(roleId: number, userId: number): Promise<{ success: boolean; message?: string }> {
    try {
      const db = getDatabase();
      await db.request()
        .input('roleId', roleId)
        .input('userId', userId)
        .query(`
          UPDATE UserRoles 
          SET IS_ACTIVE = 0 
          WHERE ROLE_ID = @roleId 
          AND USER_ID = @userId
        `);
      
      return { success: true };
    } catch (error) {
      return { success: false, message: 'Failed to remove role from user' };
    }
  }


  async updateRole(roleId: number, updateData: any): Promise<{ success: boolean; message?: string }> {
    try {
      const db = getDatabase();
      await db.request()
        .input('roleId', roleId)
        .input('roleName', updateData.roleName)
        .input('description', updateData.description)
        .input('inactivityLockEnabled', updateData.inactivityLockEnabled)
        .input('inactivityLockDays', updateData.inactivityLockDays)
        .query(`
          UPDATE Roles
          SET ROLE_NAME = @roleName,
              DESCRIPTION = @description,
              INACTIVITY_LOCK_ENABLED = @inactivityLockEnabled,
              INACTIVITY_LOCK_DAYS = @inactivityLockDays
          WHERE ID = @roleId
        `);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return { success: false, message: errorMessage };
    }
  }

    static async deleteRole(roleId: number): Promise<{ success: boolean; message?: string }> {
    try {
      const db = getDatabase();
      await db.request()
        .input('roleId', roleId)
        .query(`
          UPDATE Roles
          SET IS_ACTIVE = 0
          WHERE ID = @roleId
        `);
      return { success: true };
    } catch (error) {
      return { success: false, message: 'Failed to delete role' };
    }
  }

    static async updateRole(roleId: number, updateData: any) {
      const db = getDatabase();
      await db.request()
        .input('roleId', roleId)
        .input('roleName', updateData.roleName)
        .input('description', updateData.description)
        .input('inactivityLockEnabled', updateData.inactivityLockEnabled)
        .input('inactivityLockDays', updateData.inactivityLockDays)
        .query(`
          UPDATE Roles
          SET ROLE_NAME = @roleName,
              DESCRIPTION = @description,
              INACTIVITY_LOCK_ENABLED = @inactivityLockEnabled,
              INACTIVITY_LOCK_DAYS = @inactivityLockDays
          WHERE ID = @roleId
        `);
    }

}
