// src/routes/auth.ts
import express, { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { requireAuth, requirePermission } from '../middleware/auth';
import { getDatabase } from '../config/database';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { 
    success: false, 
    message: 'Too many login attempts, please try again later.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login rate limiting
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per window per IP
  skipSuccessfulRequests: true,
  message: { 
    success: false, 
    message: 'Too many login attempts from this IP, please try again later.' 
  }
});

/**
 * @route POST /api/auth/login
 * @desc User login
 * @access Public
 */
router.post('/login', loginRateLimit, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Input validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Authenticate user
    const authResult = await AuthService.authenticateUser(username, password);

    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        message: authResult.message
      });
    }

    if (!authResult.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
    }

    // Create session
    req.session.userId = authResult.user.id;
    req.session.user = {
      id: authResult.user.id,
      username: authResult.user.username,
      email: authResult.user.email,
      fullName: authResult.user.fullName,
      roles: authResult.user.roles.map(r => r.roleName),
      permissions: authResult.user.permissions.map(p => p.permissionName)
    };
    req.session.lastActivity = Date.now();

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: authResult.user.id,
        username: authResult.user.username,
        email: authResult.user.email,
        fullName: authResult.user.fullName,
        roles: authResult.user.roles.map(r => r.roleName),
        permissions: authResult.user.permissions.map(p => p.permissionName),
        lastLoginTs: authResult.user.lastLoginTs
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route POST /api/auth/register
 * @desc Register new user (Admin only)
 * @access Private
 */
router.post('/register', 
  requireAuth, 
  requirePermission('user.create'), 
  async (req: Request, res: Response) => {
    try {
      const { username, email, password, fullName } = req.body;

      // Input validation
      if (!username || !email || !password || !fullName) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      // Password strength validation
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Register user
      const registerResult = await AuthService.registerUser({
        username,
        email,
        password,
        fullName,
        createdBy: req.user!.id
      });

      if (!registerResult.success) {
        return res.status(400).json({
          success: false,
          message: registerResult.message
        });
      }

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        userId: registerResult.userId
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route POST /api/auth/logout
 * @desc User logout
 * @access Private
 */
router.post('/logout', requireAuth, (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }

    res.clearCookie(process.env.SESSION_NAME || 'school_session');
    res.json({
      success: true,
      message: 'Logout successful'
    });
  });
});

/**
 * @route GET /api/auth/me
 * @desc Get current user info
 * @access Private
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  
  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles.map(r => r.roleName),
      permissions: user.permissions.map(p => p.permissionName),
      lastLoginTs: user.lastLoginTs,
      isActive: user.isActive
    }
  });
});

/**
 * @route POST /api/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    // Verify current password
    const db = getDatabase();
    const result = await db.request()
      .input('userId', userId)
      .query(`
        SELECT password_hash FROM AdminUsers WHERE id = @userId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isCurrentPasswordValid = await AuthService.verifyPassword(
      currentPassword, 
      result.recordset[0].password_hash
    );

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password and update
    const newPasswordHash = await AuthService.hashPassword(newPassword);
    await db.request()
      .input('passwordHash', newPasswordHash)
      .input('userId', userId)
      .query(`
        UPDATE AdminUsers 
        SET password_hash = @passwordHash, updated_ts = GETDATE()
        WHERE id = @userId
      `);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/auth/session-status
 * @desc Check session status
 * @access Public
 */
router.get('/session-status', (req: Request, res: Response) => {
  res.json({
    success: true,
    authenticated: !!req.session.userId,
    sessionId: req.sessionID,
    lastActivity: req.session.lastActivity
  });
});

export default router;