import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// More specific error structure for known error types
export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: number; // For MongoError code 11000
  errors?: any[]; // For validation errors from express-validator
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction // next is not used, prefix with underscore
): void => {
  const { method, originalUrl, ip } = req;
  const correlationId = req.headers['x-correlation-id'] as string;

  // Default to 500 server error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.name === 'MongoError' && err.code === 11000) { // Now err.code can be accessed if AppError includes it
    statusCode = 409;
    message = 'Duplicate field value';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Log error details
  logger.error('Request error', {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      statusCode,
    },
    request: {
      method,
      url: originalUrl,
      ip,
      correlationId,
    },
    service: 'auth',
  });

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err,
    }),
    correlationId,
    timestamp: new Date().toISOString(),
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const { method, originalUrl } = req;
  const correlationId = req.headers['x-correlation-id'] as string;

  logger.warn('Route not found', {
    request: {
      method,
      url: originalUrl,
      ip: req.ip,
      correlationId,
    },
    service: 'auth',
  });

  res.status(404).json({
    error: 'Route not found',
    path: originalUrl,
    correlationId,
    timestamp: new Date().toISOString(),
  });
};

// Define a more specific type for Express route handlers
export type ExpressRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void> | void;


export const asyncHandler = (fn: ExpressRouteHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
