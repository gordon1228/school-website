// src/types/auth.ts
export interface UserRole {
  id: number;
  roleName: string;
  description?: string;
}

export interface Permission {
  id: number;
  permissionName: string;
  description?: string;
}

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

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    fullName: string;
    roles: string[];
    permissions: string[];
    lastLoginTs?: Date;
    isActive: boolean;
  };
}

export interface SessionUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

// Common permission constants
export const PERMISSIONS = {
  // User management
  USER_CREATE: 'user.create',
  USER_READ: 'user.read',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  
  // Role management
  ROLE_CREATE: 'role.create',
  ROLE_READ: 'role.read',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',
  
  // News management
  NEWS_CREATE: 'news.create',
  NEWS_READ: 'news.read',
  NEWS_UPDATE: 'news.update',
  NEWS_DELETE: 'news.delete',
  
  // Event management
  EVENT_CREATE: 'event.create',
  EVENT_READ: 'event.read',
  EVENT_UPDATE: 'event.update',
  EVENT_DELETE: 'event.delete',
  EVENT_MANAGE_SIGNUPS: 'event.manage_signups',
  
  // Gallery management
  GALLERY_CREATE: 'gallery.create',
  GALLERY_READ: 'gallery.read',
  GALLERY_UPDATE: 'gallery.update',
  GALLERY_DELETE: 'gallery.delete',
  
  // System administration
  SYSTEM_CONFIG: 'system.config',
  AUDIT_LOGS: 'audit.logs',
  
  // Content management
  CONTENT_MANAGE: 'content.manage'
} as const;

// Common role constants
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
  USER: 'user'
} as const;