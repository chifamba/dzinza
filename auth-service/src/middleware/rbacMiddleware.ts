import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware'; // Assuming AuthenticatedRequest is exported from authMiddleware
import { logger } from '../utils/logger';

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.roles) {
      logger.warn('RBAC: User object or roles not found on request. Ensure authenticateToken runs first.', {
        path: req.path,
        userId: req.user?.id,
      });
      return res.status(403).json({ message: 'Access Forbidden: User roles not available.' });
    }

    const userRoles = req.user.roles;
    const hasPermission = userRoles.some(role => allowedRoles.includes(role));

    if (hasPermission) {
      next();
    } else {
      logger.warn('RBAC: Forbidden access attempt.', {
        userId: req.user.id,
        email: req.user.email,
        requiredRoles: allowedRoles,
        userRoles: userRoles,
        path: req.path,
        ip: req.ip,
      });
      return res.status(403).json({
        message: `Access Forbidden: You do not have the required permission. Required role(s): ${allowedRoles.join(', ')}.`
      });
    }
  };
};
