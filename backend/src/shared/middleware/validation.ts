import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { logger } from '../utils/logger';

/**
 * Middleware to validate request using express-validator
 * Should be used after validation chain
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', {
      service: 'validation',
      url: req.url,
      method: req.method,
      errors: errors.array(),
      ip: req.ip
    });

    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid request parameters',
      details: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg,
        value: err.type === 'field' ? err.value : undefined,
        location: err.type === 'field' ? err.location : undefined
      }))
    });
  }

  next();
};

/**
 * Middleware to sanitize request data
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  next();
};

/**
 * Helper function to sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip prototype pollution attempts
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  if (typeof obj === 'string') {
    // Basic XSS protection - strip potentially dangerous content
    return obj
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  return obj;
}

export default validateRequest;
