// =====================================================
// backend/src/utils/validation.ts - Validation Schemas
// =====================================================

import Joi from 'joi';

// User validation schemas
export const createUserSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 50 characters',
      'any.required': 'Username is required'
    }),
  
  email: Joi.string()
    .email()
    .max(100)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email cannot exceed 100 characters',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  firstName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required'
    }),
  
  lastName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required'
    }),
  
  phone: Joi.string()
    .pattern(new RegExp('^[+]?[0-9\s\-\(\)]{10,20}'))
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    })
});

// Login validation schema
export const loginSchema = Joi.object({
  username: Joi.string()
    .required()
    .messages({
      'any.required': 'Username or email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// News validation schema
export const createNewsSchema = Joi.object({
  title: Joi.string()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.min': 'Title must be at least 5 characters long',
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Title is required'
    }),
  
  content: Joi.string()
    .min(10)
    .required()
    .messages({
      'string.min': 'Content must be at least 10 characters long',
      'any.required': 'Content is required'
    }),
  
  excerpt: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Excerpt cannot exceed 500 characters'
    }),
  
  isPublished: Joi.boolean().default(false),
  isFeatured: Joi.boolean().default(false),
  languageCode: Joi.string().valid('en', 'ms').default('en'),
  metaTitle: Joi.string().max(60).optional(),
  metaDescription: Joi.string().max(160).optional()
});

// Event validation schema
export const createEventSchema = Joi.object({
  title: Joi.string()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.min': 'Title must be at least 5 characters long',
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Title is required'
    }),
  
  description: Joi.string()
    .min(10)
    .required()
    .messages({
      'string.min': 'Description must be at least 10 characters long',
      'any.required': 'Description is required'
    }),
  
  eventStartTs: Joi.date()
    .greater('now')
    .required()
    .messages({
      'date.greater': 'Event start date must be in the future',
      'any.required': 'Event start date is required'
    }),
  
  eventEndTs: Joi.date()
    .greater(Joi.ref('eventStartTs'))
    .required()
    .messages({
      'date.greater': 'Event end date must be after start date',
      'any.required': 'Event end date is required'
    }),
  
  location: Joi.string()
    .max(200)
    .optional(),
  
  maxParticipants: Joi.number()
    .integer()
    .min(1)
    .optional(),
  
  registrationDeadline: Joi.date()
    .less(Joi.ref('eventStartTs'))
    .optional()
    .messages({
      'date.less': 'Registration deadline must be before event start date'
    }),
  
  isPublished: Joi.boolean().default(false),
  isRegistrationOpen: Joi.boolean().default(true),
  requiresApproval: Joi.boolean().default(false)
});

// Event signup validation schema
export const eventSignupSchema = Joi.object({
  participantType: Joi.string()
    .valid('student', 'parent', 'teacher', 'staff', 'other')
    .required()
    .messages({
      'any.only': 'Participant type must be one of: student, parent, teacher, staff, other',
      'any.required': 'Participant type is required'
    }),
  
  firstName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required'
    }),
  
  lastName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required'
    }),
  
  email: Joi.string()
    .email()
    .max(100)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email cannot exceed 100 characters',
      'any.required': 'Email is required'
    }),
  
  phone: Joi.string()
    .pattern(new RegExp('^[+]?[0-9\s\-\(\)]{10,20}'))
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  studentId: Joi.when('participantType', {
    is: 'student',
    then: Joi.string().required().messages({
      'any.required': 'Student ID is required for student participants'
    }),
    otherwise: Joi.string().optional()
  }),
  
  classGrade: Joi.when('participantType', {
    is: 'student',
    then: Joi.string().optional(),
    otherwise: Joi.string().optional()
  }),
  
  identityNo: Joi.string()
    .max(20)
    .optional(),
  
  specialRequirements: Joi.string()
    .max(500)
    .optional(),
  
  emergencyContact: Joi.string()
    .max(100)
    .optional(),
  
  emergencyPhone: Joi.string()
    .pattern(new RegExp('^[+]?[0-9\s\-\(\)]{10,20}'))
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid emergency contact phone number'
    })
});
