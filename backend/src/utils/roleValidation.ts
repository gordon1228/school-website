// src/utils/roleValidation.ts
import Joi from 'joi';

export const createRoleSchema = Joi.object({
  roleName: Joi.string()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.min': 'Role name must be at least 3 characters long',
      'string.max': 'Role name cannot exceed 50 characters',
      'any.required': 'Role name is required'
    }),

  description: Joi.string()
    .max(255)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 255 characters'
    }),

  inactivityLockEnabled: Joi.boolean()
    .default(false),

  inactivityLockDays: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .default(30)
    .messages({
      'number.min': 'Inactivity lock days must be at least 1',
      'number.max': 'Inactivity lock days cannot exceed 365'
    }),

  permissions: Joi.array()
    .items(Joi.number().integer().positive())
    .optional()
    .messages({
      'array.base': 'Permissions must be an array of permission IDs'
    })
});

export const updateRoleSchema = Joi.object({
  roleName: Joi.string()
    .min(3)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Role name must be at least 3 characters long',
      'string.max': 'Role name cannot exceed 50 characters'
    }),

  description: Joi.string()
    .max(255)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 255 characters'
    }),

  inactivityLockEnabled: Joi.boolean()
    .optional(),

  inactivityLockDays: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .optional()
    .messages({
      'number.min': 'Inactivity lock days must be at least 1',
      'number.max': 'Inactivity lock days cannot exceed 365'
    }),

  permissions: Joi.array()
    .items(Joi.number().integer().positive())
    .optional()
    .messages({
      'array.base': 'Permissions must be an array of permission IDs'
    })
});

export const assignRoleSchema = Joi.object({
  userId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'User ID must be a number',
      'number.positive': 'User ID must be positive',
      'any.required': 'User ID is required'
    })
});

export const createPermissionSchema = Joi.object({
  permissionName: Joi.string()
    .min(3)
    .max(50)
    .pattern(/^[a-z0-9._]+$/)
    .required()
    .messages({
      'string.min': 'Permission name must be at least 3 characters long',
      'string.max': 'Permission name cannot exceed 50 characters',
      'string.pattern.base': 'Permission name can only contain lowercase letters, numbers, dots, and underscores',
      'any.required': 'Permission name is required'
    }),

  description: Joi.string()
    .max(255)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 255 characters'
    }),

  module: Joi.string()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.min': 'Module must be at least 3 characters long',
      'string.max': 'Module cannot exceed 50 characters',
      'any.required': 'Module is required'
    }),

  action: Joi.string()
    .valid('create', 'read', 'update', 'delete', 'manage', 'publish', 'approve')
    .required()
    .messages({
      'any.only': 'Action must be one of: create, read, update, delete, manage, publish, approve',
      'any.required': 'Action is required'
    })
});