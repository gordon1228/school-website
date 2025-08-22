// src/services/authService.ts
import bcrypt from 'bcrypt';
import { getDatabase } from '../config/database';
import { UserRole, Permission } from '../types/auth';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  isActive: boolean;
  lastLoginTs?: Date;
  lockedUntilTs?: Date;
  failedLoginAttempts: number;
  roles: UserRole[];
  permissions: Permission[];
}

export class AuthService {
  private static readonly BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
  private static readonly MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
  private static readonly LOCKOUT_TIME = parseInt(process.env.LOCKOUT_TIME || '900000'); // 15 minutes

  /**
   * Hash password with bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Register new user
   */
  static async registerUser(userData: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    createdBy: number;
  }): Promise<{ success: boolean; userId?: number; message?: string }> {
    try {
      // Check if username or email already exists
      const db = getDatabase();
      const existingUser = await db.request()
        .input('username', userData.username)
        .input('email', userData.email)
        .query(`
          SELECT id FROM AdminUsers 
          WHERE username = @username OR email = @email
        `);

      if (existingUser.recordset.length > 0) {
        return { success: false, message: 'Username or email already exists' };
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Insert new user
      const result = await db.request()
        .input('username', userData.username)
        .input('email', userData.email)
        .input('passwordHash', hashedPassword)
        .input('fullName', userData.fullName)
        .input('createdBy', userData.createdBy)
        .query(`
          INSERT INTO AdminUsers (
            username, email, password_hash, full_name, 
            is_active, created_by, created_ts, failed_login_attempts
          ) 
          OUTPUT INSERTED.id
          VALUES (
            @username, @email, @passwordHash, @fullName, 
            1, @createdBy, GETDATE(), 0
          )
        `);

      const userId = result.recordset[0].id;

      // Assign default role (e.g., 'user' role)
      await db.request()
        .input('userId', userId)
        .input('createdBy', userData.createdBy)
        .query(`
          INSERT INTO UserRoles (user_id, role_id, assigned_by, assigned_ts)
          SELECT @userId, id, @createdBy, GETDATE()
          FROM Roles WHERE role_name = 'user'
        `);

      return { success: true, userId };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed' };
    }
  }

  /**
   * Authenticate user login
   */
  static async authenticateUser(
    username: string, 
    password: string
  ): Promise<{ success: boolean; user?: AuthUser; message?: string }> {
    try {
      // Get user with roles and permissions
      const db = getDatabase();
      const userResult = await db.request()
        .input('username', username)
        .query(`
          SELECT 
            au.id, au.username, au.email, au.full_name, au.password_hash,
            au.is_active, au.last_login_ts, au.locked_until_ts, 
            au.failed_login_attempts,
            r.id as role_id, r.role_name, r.description as role_description,
            p.id as permission_id, p.permission_name, p.description as permission_description
          FROM AdminUsers au
          LEFT JOIN UserRoles ur ON au.id = ur.user_id
          LEFT JOIN Roles r ON ur.role_id = r.id AND r.is_active = 1
          LEFT JOIN RolePermissions rp ON r.id = rp.role_id
          LEFT JOIN Permissions p ON rp.permission_id = p.id AND p.is_active = 1
          WHERE au.username = @username OR au.email = @username
        `);

      if (userResult.recordset.length === 0) {
        return { success: false, message: 'Invalid credentials' };
      }

      const userData = userResult.recordset[0];

      // Check if account is locked
      if (userData.locked_until_ts && new Date() < userData.locked_until_ts) {
        const lockTimeRemaining = Math.ceil((userData.locked_until_ts.getTime() - Date.now()) / (1000 * 60));
        return { 
          success: false, 
          message: `Account is locked. Try again in ${lockTimeRemaining} minutes.` 
        };
      }

      // Check if account is active
      if (!userData.is_active) {
        return { success: false, message: 'Account is disabled' };
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, userData.password_hash);

      if (!isValidPassword) {
        // Increment failed login attempts
        await this.handleFailedLogin(userData.id, userData.failed_login_attempts);
        return { success: false, message: 'Invalid credentials' };
      }

      // Reset failed attempts and update last login
      await db.request()
        .input('userId', userData.id)
        .query(`
          UPDATE AdminUsers 
          SET failed_login_attempts = 0, 
              locked_until_ts = NULL,
              last_login_ts = GETDATE()
          WHERE id = @userId
        `);

      // Build user object with roles and permissions
      const user = this.buildUserFromResults(userResult.recordset);
      return { success: true, user };

    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, message: 'Authentication failed' };
    }
  }

  /**
   * Handle failed login attempt
   */
  private static async handleFailedLogin(userId: number, currentAttempts: number): Promise<void> {
    const newAttempts = currentAttempts + 1;
    const db = getDatabase();
    
    if (newAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      // Lock the account
      const lockUntil = new Date(Date.now() + this.LOCKOUT_TIME);
      await db.request()
        .input('attempts', newAttempts)
        .input('lockUntil', lockUntil)
        .input('userId', userId)
        .query(`
          UPDATE AdminUsers 
          SET failed_login_attempts = @attempts,
              locked_until_ts = @lockUntil
          WHERE id = @userId
        `);
    } else {
      await db.request()
        .input('attempts', newAttempts)
        .input('userId', userId)
        .query(`
          UPDATE AdminUsers 
          SET failed_login_attempts = @attempts
          WHERE id = @userId
        `);
    }
  }

  /**
   * Build user object from query results
   */
  private static buildUserFromResults(results: any[]): AuthUser {
    const user = results[0];
    const roles = new Map<number, UserRole>();
    const permissions = new Map<number, Permission>();

    results.forEach(row => {
      // Build roles map
      if (row.role_id && !roles.has(row.role_id)) {
        roles.set(row.role_id, {
          id: row.role_id,
          roleName: row.role_name,
          description: row.role_description
        });
      }

      // Build permissions map
      if (row.permission_id && !permissions.has(row.permission_id)) {
        permissions.set(row.permission_id, {
          id: row.permission_id,
          permissionName: row.permission_name,
          description: row.permission_description
        });
      }
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      isActive: user.is_active,
      lastLoginTs: user.last_login_ts,
      lockedUntilTs: user.locked_until_ts,
      failedLoginAttempts: user.failed_login_attempts,
      roles: Array.from(roles.values()),
      permissions: Array.from(permissions.values())
    };
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(user: AuthUser, permissionName: string): boolean {
    return user.permissions.some(p => p.permissionName === permissionName);
  }

  /**
   * Check if user has any of the specified roles
   */
  static hasRole(user: AuthUser, roleNames: string[]): boolean {
    return user.roles.some(r => roleNames.includes(r.roleName));
  }
}