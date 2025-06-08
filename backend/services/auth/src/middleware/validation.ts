import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : error.type,
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined,
    }));

    res.status(400).json({
      error: 'Validation failed',
      details: formattedErrors,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};
