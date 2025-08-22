// =====================================================
// backend/src/models/User.ts - User Model Example
// =====================================================

import { executeQuery } from '../config/database';
import bcrypt from 'bcrypt';

export interface AdminUser {
  ID: number;
  USERNAME: string;
  EMAIL: string;
  PASSWORD_HASH: string;
  FIRST_NAME: string;
  LAST_NAME: string;
  PHONE?: string;
  IS_ACTIVE: boolean;
  IS_LOCKED: boolean;
  FAILED_LOGIN_ATTEMPTS: number;
  LOCKED_UNTIL_TS?: Date;
  LAST_LOGIN_TS?: Date;
  INACTIVITY_LOCK_ENABLED: boolean;
  INACTIVITY_LOCK_DAYS: number;
  CREATED_BY?: number;
  CREATED_TS: Date;
  UPDATED_BY?: number;
  UPDATED_TS: Date;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  createdBy: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export class UserModel {
  // Create new user
  static async createUser(userData: CreateUserData): Promise<number> {
    const { username, email, password, firstName, lastName, phone, createdBy } = userData;
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));
    
    const query = `
      INSERT INTO AdminUsers (USERNAME, EMAIL, PASSWORD_HASH, FIRST_NAME, LAST_NAME, PHONE, CREATED_BY)
      OUTPUT INSERTED.ID
      VALUES (@username, @email, @passwordHash, @firstName, @lastName, @phone, @createdBy)
    `;
    
    const result = await executeQuery(query, {
      username,
      email,
      passwordHash,
      firstName,
      lastName,
      phone: phone || null,
      createdBy,
    });
    
    return result.recordset[0].ID;
  }
  
  // Find user by username or email
  static async findByUsernameOrEmail(identifier: string): Promise<AdminUser | null> {
    const query = `
      SELECT * FROM AdminUsers 
      WHERE (USERNAME = @identifier OR EMAIL = @identifier) 
        AND IS_ACTIVE = 1
    `;
    
    const result = await executeQuery(query, { identifier });
    
    if (result.recordset.length === 0) {
      return null;
    }
    
    return result.recordset[0] as AdminUser;
  }
  
  // Find user by ID
  static async findById(id: number): Promise<AdminUser | null> {
    const query = `
      SELECT * FROM AdminUsers 
      WHERE ID = @id AND IS_ACTIVE = 1
    `;
    
    const result = await executeQuery(query, { id });
    
    if (result.recordset.length === 0) {
      return null;
    }
    
    return result.recordset[0] as AdminUser;
  }
  
  // Verify password
  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
  
  // Update last login
  static async updateLastLogin(userId: number): Promise<void> {
    const query = `
      UPDATE AdminUsers 
      SET LAST_LOGIN_TS = GETDATE(), 
          FAILED_LOGIN_ATTEMPTS = 0,
          IS_LOCKED = 0,
          LOCKED_UNTIL_TS = NULL
      WHERE ID = @userId
    `;
    
    await executeQuery(query, { userId });
  }
  
  // Increment failed login attempts
  static async incrementFailedLogins(userId: number): Promise<void> {
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
    const lockoutTime = parseInt(process.env.LOCKOUT_TIME || '3600000'); // milliseconds
    
    const query = `
      UPDATE AdminUsers 
      SET FAILED_LOGIN_ATTEMPTS = FAILED_LOGIN_ATTEMPTS + 1,
          IS_LOCKED = CASE 
            WHEN FAILED_LOGIN_ATTEMPTS + 1 >= @maxAttempts THEN 1 
            ELSE IS_LOCKED 
          END,
          LOCKED_UNTIL_TS = CASE 
            WHEN FAILED_LOGIN_ATTEMPTS + 1 >= @maxAttempts THEN DATEADD(MILLISECOND, @lockoutTime, GETDATE())
            ELSE LOCKED_UNTIL_TS 
          END
      WHERE ID = @userId
    `;
    
    await executeQuery(query, { userId, maxAttempts, lockoutTime });
  }
  
  // Check if user is locked
  static async isUserLocked(user: AdminUser): Promise<boolean> {
    if (!user.IS_LOCKED) return false;
    
    if (user.LOCKED_UNTIL_TS && new Date() > user.LOCKED_UNTIL_TS) {
      // Unlock user if lockout period has expired
      await this.unlockUser(user.ID);
      return false;
    }
    
    return true;
  }
  
  // Unlock user
  static async unlockUser(userId: number): Promise<void> {
    const query = `
      UPDATE AdminUsers 
      SET IS_LOCKED = 0,
          LOCKED_UNTIL_TS = NULL,
          FAILED_LOGIN_ATTEMPTS = 0
      WHERE ID = @userId
    `;
    
    await executeQuery(query, { userId });
  }
  
  // Get user permissions
  static async getUserPermissions(userId: number): Promise<string[]> {
    const query = `
      SELECT DISTINCT p.PERMISSION_NAME
      FROM AdminUsers u
      INNER JOIN UserRoles ur ON u.ID = ur.USER_ID AND ur.IS_ACTIVE = 1
      INNER JOIN Roles r ON ur.ROLE_ID = r.ID AND r.IS_ACTIVE = 1
      INNER JOIN RolePermissions rp ON r.ID = rp.ROLE_ID AND rp.IS_GRANTED = 1
      INNER JOIN Permissions p ON rp.PERMISSION_ID = p.ID
      WHERE u.ID = @userId AND u.IS_ACTIVE = 1
    `;
    
    const result = await executeQuery(query, { userId });
    
    return result.recordset.map(row => row.PERMISSION_NAME);
  }
  
  // Get all users with pagination
  static async getAllUsers(page: number = 1, limit: number = 10): Promise<{ users: AdminUser[], total: number }> {
    const offset = (page - 1) * limit;
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM AdminUsers WHERE IS_ACTIVE = 1`;
    const countResult = await executeQuery(countQuery);
    const total = countResult.recordset[0].total;
    
    // Get users with pagination
    const query = `
      SELECT u.*, 
             STRING_AGG(r.ROLE_NAME, ', ') as ROLES
      FROM AdminUsers u
      LEFT JOIN UserRoles ur ON u.ID = ur.USER_ID AND ur.IS_ACTIVE = 1
      LEFT JOIN Roles r ON ur.ROLE_ID = r.ID AND r.IS_ACTIVE = 1
      WHERE u.IS_ACTIVE = 1
      GROUP BY u.ID, u.USERNAME, u.EMAIL, u.FIRST_NAME, u.LAST_NAME, u.PHONE, 
               u.IS_ACTIVE, u.IS_LOCKED, u.FAILED_LOGIN_ATTEMPTS, u.LOCKED_UNTIL_TS,
               u.LAST_LOGIN_TS, u.INACTIVITY_LOCK_ENABLED, u.INACTIVITY_LOCK_DAYS,
               u.CREATED_BY, u.CREATED_TS, u.UPDATED_BY, u.UPDATED_TS
      ORDER BY u.CREATED_TS DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;
    
    const result = await executeQuery(query, { offset, limit });
    
    return {
      users: result.recordset,
      total
    };
  }
}