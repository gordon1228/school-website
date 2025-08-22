// src/services/permissionService.ts
import { getDatabase } from '../config/database';

export interface Permission {
  id: number;
  permissionName: string;
  description?: string;
  module: string;
  action: string;
  isSystemPermission: boolean;
}

export interface CreatePermissionData {
  permissionName: string;
  description?: string;
  module: string;
  action: string;
  createdBy: number;
}

export class PermissionService {
  /**
   * Get all permissions, optionally filtered by module
   */
  static async getAllPermissions(module?: string): Promise<Permission[]> {
    const db = getDatabase();
    
    let query = `
      SELECT ID, PERMISSION_NAME, DESCRIPTION, MODULE, ACTION, IS_SYSTEM_PERMISSION
      FROM Permissions
      ORDER BY MODULE, ACTION, PERMISSION_NAME
    `;
    
    const request = db.request();
    
    if (module) {
      query = `
        SELECT ID, PERMISSION_NAME, DESCRIPTION, MODULE, ACTION, IS_SYSTEM_PERMISSION
        FROM Permissions
        WHERE MODULE = @module
        ORDER BY ACTION, PERMISSION_NAME
      `;
      request.input('module', module);
    }

    const result = await request.query(query);

    return result.recordset.map((row: any): Permission => ({
      id: row.ID,
      permissionName: row.PERMISSION_NAME,
      description: row.DESCRIPTION,
      module: row.MODULE,
      action: row.ACTION,
      isSystemPermission: row.IS_SYSTEM_PERMISSION
    }));
  }

  /**
   * Create new permission (typically only used by super admin)
   */
  static async createPermission(
    permissionData: CreatePermissionData
  ): Promise<{ success: boolean; permissionId?: number; message?: string }> {
    const db = getDatabase();
    
    try {
      // Check if permission already exists
      const existing = await db.request()
        .input('permissionName', permissionData.permissionName)
        .query(`SELECT ID FROM Permissions WHERE PERMISSION_NAME = @permissionName`);

      if (existing.recordset.length > 0) {
        return { success: false, message: 'Permission already exists' };
      }

      // Create new permission
      const result = await db.request()
        .input('permissionName', permissionData.permissionName)
        .input('description', permissionData.description)
        .input('module', permissionData.module)
        .input('action', permissionData.action)
        .input('createdBy', permissionData.createdBy)
        .query(`
          INSERT INTO Permissions (PERMISSION_NAME, DESCRIPTION, MODULE, ACTION, CREATED_BY)
          OUTPUT INSERTED.ID
          VALUES (@permissionName, @description, @module, @action, @createdBy)
        `);

      return { success: true, permissionId: result.recordset[0].ID };
    } catch (error) {
      console.error('Error creating permission:', error);
      return { success: false, message: 'Failed to create permission' };
    }
  }
    
}
