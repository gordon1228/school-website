// src/routes/permissions.ts
import express, { Request, Response } from 'express';
import { PermissionService } from '../services/permissionService';
import { requireAuth, requirePermission } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createPermissionSchema } from '../utils/roleValidation';

const router = express.Router();

/**
 * @route GET /api/permissions
 * @desc Get all permissions
 * @access Private - roles.read permission required
 */
router.get('/',
  requireAuth,
  requirePermission('roles.read'),
  async (req: Request, res: Response) => {
    try {
      const module = req.query.module as string;
      const permissions = await PermissionService.getAllPermissions(module);

      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      console.error('Get permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch permissions'
      });
    }
  }
);

/**
 * @route POST /api/permissions
 * @desc Create new permission (Super Admin only)
 * @access Private - Super Admin only
 */
router.post('/',
  requireAuth,
  requirePermission('roles.manage'),
  validateRequest(createPermissionSchema),
  async (req: Request, res: Response) => {
    try {
      const { permissionName, description, module, action } = req.body;
      const createdBy = req.user!.id;

      const result = await PermissionService.createPermission({
        permissionName,
        description,
        module,
        action,
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
        message: 'Permission created successfully',
        data: { permissionId: result.permissionId }
      });
    } catch (error) {
      console.error('Create permission error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create permission'
      });
    }
  }
);

export default router;