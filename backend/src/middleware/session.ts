// src/middleware/session.ts
import session from 'express-session';
import { Request, Response, NextFunction } from 'express';

// Extend Express Session type
declare module 'express-session' {
  interface SessionData {
    userId: number;
    user: {
      id: number;
      username: string;
      email: string;
      fullName: string;
      roles: string[];
      permissions: string[];
    };
    lastActivity: number;
  }
}

export const sessionConfig = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  name: process.env.SESSION_NAME || 'school_session',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '3600000'), // 1 hour default
    sameSite: 'strict' // CSRF protection
  },
  rolling: true // Reset expiration on each request
});