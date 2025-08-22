// src/routes/roles.ts
import express, { Request, Response } from 'express';
import { RoleService } from '../services/roleService';
import { requireAuth, requirePermission } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createRoleSchema, updateRoleSchema, assignRoleSchema } from '../utils/roleValidation';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for role management
const roleRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: { 
    success: false, 
    message: 'Too many role management requests, please try again later.' 
  }
});

/**
 * @route GET /api/roles
 * @desc Get all roles with pagination
 * @access Private - roles.read permission required
 */
router.get('/', 
  requireAuth, 
  requirePermission('roles.read'),
  roleRateLimit,
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      const result = await RoleService.getAllRoles(page, limit, search);

      res.json({
        success: true,
        data: result.roles,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      console.error('Get roles error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch roles'
      });
    }
  }
);

/**
 * @route GET /api/roles/:id
 * @desc Get specific role with permissions
 * @access Private - roles.read permission required
 */
router.get('/:id',
  requireAuth,
  requirePermission('roles.read'),
  async (req: Request, res: Response) => {
    try {
      const roleId = parseInt(req.params.id);

      if (isNaN(roleId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role ID'
        });
      }

      const role = await RoleService.getRoleById(roleId);

      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      res.json({
        success: true,
        data: role
      });
    } catch (error) {
      console.error('Get role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch role'
      });
    }
  }
);

/**
 * @route POST /api/roles
 * @desc Create new role
 * @access Private - roles.create permission required
 */
router.post('/',
  requireAuth,
  requirePermission('roles.create'),
  validateRequest(createRoleSchema),
  async (req: Request, res: Response) => {
    try {
      const { roleName, description, inactivityLockEnabled, inactivityLockDays, permissions } = req.body;
      const createdBy = req.user!.id;

      const result = await RoleService.createRole({
        roleName,
        description,
        inactivityLockEnabled: inactivityLockEnabled || false,
        inactivityLockDays: inactivityLockDays || 30,
        permissions: permissions || [],
        createdBy
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: { roleId: result.roleId }
      });
    } catch (error) {
      console.error('Create role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create role'
      });
    }
  }
);

/**
 * @route PUT /api/roles/:id
 * @desc Update existing role
 * @access Private - roles.update permission required
 */
router.put('/:id',
  requireAuth,
  requirePermission('roles.update'),
  validateRequest(updateRoleSchema),
  async (req: Request, res: Response) => {
    try {
      const roleId = parseInt(req.params.id);
      const updatedBy = req.user!.id;

      if (isNaN(roleId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role ID'
        });
      }

      const updateData = {
        ...req.body,
        updatedBy
      };

      const result = await RoleService.updateRole(roleId, updateData);

      if (typeof result === 'string') {
        return res.status(400).json({
          success: false,
          message: result
        });
      }

      res.json({
        success: true,
        message: 'Role updated successfully'
      });
    } catch (error) {
      console.error('Update role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update role'
      });
    }
  }
);

/**
 * @route DELETE /api/roles/:id
 * @desc Delete role (soft delete for non-system roles)
 * @access Private - roles.delete permission required
 */
router.delete('/:id',
  requireAuth,
  requirePermission('roles.delete'),
  async (req: Request, res: Response) => {
    try {
      const roleId = parseInt(req.params.id);

      if (isNaN(roleId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role ID'
        });
      }

      const result = await RoleService.deleteRole(roleId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      res.json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error) {
      console.error('Delete role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete role'
      });
    }
  }
);

/**
 * @route POST /api/roles/:id/users
 * @desc Assign role to user
 * @access Private - roles.update permission required
 */
router.post('/:id/users',
  requireAuth,
  requirePermission('roles.update'),
  validateRequest(assignRoleSchema),
  async (req: Request, res: Response) => {
    try {
      const roleId = parseInt(req.params.id);
      const { userId } = req.body;
      const assignedBy = req.user!.id;

      if (isNaN(roleId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role ID'
        });
      }

      
      const result = await RoleService.assignRoleToUser(roleId, userId, assignedBy);

        if (typeof result === 'string') {
            return res.status(400).json({
            success: false,
            message: result
            });
        }

            res.json({
                success: true,
                message: 'Role assigned successfully'
            });
        } catch (error) {
            console.error('Assign role error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to assign role'
            });
         }
  }
);

/**
 * @route DELETE /api/roles/:id/users/:userId
 * @desc Remove role from user
 * @access Private - roles.update permission required
 */
router.delete('/:id/users/:userId',
  requireAuth,
  requirePermission('roles.update'),
  async (req: Request, res: Response) => {
    try {
      const roleId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);

      if (isNaN(roleId) || isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role or user ID'
        });
      }

      const result = await RoleService.removeRoleFromUser(roleId, userId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      res.json({
        success: true,
        message: 'Role removed successfully'
      });
    } catch (error) {
      console.error('Remove role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove role'
      });
    }
  }
);

export default router;