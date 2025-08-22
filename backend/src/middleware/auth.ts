// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService, AuthUser } from '../services/authService';
import { getDatabase } from '../config/database';

// Extend Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Middleware to check if user is authenticated
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Check for inactivity timeout
    const inactivityTimeout = await getInactivityTimeout(req.session.userId);
    if (inactivityTimeout > 0) {
      const lastActivity = req.session.lastActivity || Date.now();
      const timeSinceActivity = Date.now() - lastActivity;

      if (timeSinceActivity > inactivityTimeout) {
        // Session expired due to inactivity
        req.session.destroy((err) => {
          if (err) console.error('Session destroy error:', err);
        });
        return res.status(401).json({ 
          success: false, 
          message: 'Session expired due to inactivity' 
        });
      }
    }

    // Update last activity
    req.session.lastActivity = Date.now();

    // Get fresh user data (in case permissions changed)
    const authResult = await getUserById(req.session.userId);
    if (!authResult.success || !authResult.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found or inactive' 
      });
    }

    req.user = authResult.user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

/**
 * Middleware to check for specific permissions
 */
export const requirePermission = (permissionName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!AuthService.hasPermission(req.user, permissionName)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

/**
 * Middleware to check for specific roles
 */
export const requireRole = (roleNames: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!AuthService.hasRole(req.user, roleNames)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient role privileges' 
      });
    }

    next();
  };
};

/**
 * Optional auth middleware - sets req.user if authenticated but doesn't require it
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.session.userId) {
      const authResult = await getUserById(req.session.userId);
      if (authResult.success && authResult.user) {
        req.user = authResult.user;
        req.session.lastActivity = Date.now();
      }
    }
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue without authentication
  }
};

/**
 * Get user by ID with roles and permissions
 */
async function getUserById(userId: number): Promise<{ success: boolean; user?: AuthUser }> {
  try {
    const db = getDatabase();
    const userResult = await db.request()
      .input('userId', userId)
      .query(`
        SELECT 
          au.id, au.username, au.email, au.full_name,
          au.is_active, au.last_login_ts, au.locked_until_ts, 
          au.failed_login_attempts,
          r.id as role_id, r.role_name, r.description as role_description,
          p.id as permission_id, p.permission_name, p.description as permission_description
        FROM AdminUsers au
        LEFT JOIN UserRoles ur ON au.id = ur.user_id
        LEFT JOIN Roles r ON ur.role_id = r.id AND r.is_active = 1
        LEFT JOIN RolePermissions rp ON r.id = rp.role_id
        LEFT JOIN Permissions p ON rp.permission_id = p.id AND p.is_active = 1
        WHERE au.id = @userId AND au.is_active = 1
      `);

    if (userResult.recordset.length === 0) {
      return { success: false };
    }

    const user = buildUserFromResults(userResult.recordset);
    return { success: true, user };
  } catch (error) {
    console.error('Get user by ID error:', error);
    return { success: false };
  }
}

/**
 * Get inactivity timeout for user's roles
 */
async function getInactivityTimeout(userId: number): Promise<number> {
  try {
    const db = getDatabase();
    const result = await db.request()
      .input('userId', userId)
      .query(`
        SELECT MIN(r.inactivity_timeout_minutes) as min_timeout
        FROM AdminUsers au
        JOIN UserRoles ur ON au.id = ur.user_id
        JOIN Roles r ON ur.role_id = r.id
        WHERE au.id = @userId AND r.is_active = 1 AND r.inactivity_timeout_minutes > 0
      `);

    const timeoutMinutes = result.recordset[0]?.min_timeout;
    return timeoutMinutes ? timeoutMinutes * 60 * 1000 : 0; // Convert to milliseconds
  } catch (error) {
    console.error('Get inactivity timeout error:', error);
    return 0; // No timeout on error
  }
}

/**
 * Build user object from query results
 */
function buildUserFromResults(results: any[]): AuthUser {
  const user = results[0];
  const roles = new Map();
  const permissions = new Map();

  results.forEach(row => {
    if (row.role_id && !roles.has(row.role_id)) {
      roles.set(row.role_id, {
        id: row.role_id,
        roleName: row.role_name,
        description: row.role_description
      });
    }

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