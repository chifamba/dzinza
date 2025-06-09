import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User'; // Assuming User model might be needed for role checks etc.
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      logger.warn('Authentication attempt with no token');
      return res.status(401).json({ message: 'Access token is missing or invalid' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-default-secret') as any;

      // Optional: Check if user still exists or is active, if necessary
      // const user = await User.findById(decoded.id);
      // if (!user || !user.isActive) {
      //   logger.warn(`Authentication failed for user ${decoded.id} - user not found or inactive`);
      //   return res.status(401).json({ message: 'User not found or account inactive' });
      // }

      // The TokenPayload interface in jwt.ts uses 'userId', 'email', 'roles', 'sessionId'
      req.user = {
        id: decoded.userId, // Corrected from decoded.id to decoded.userId
        email: decoded.email,
        roles: decoded.roles || [], // Ensure roles is always an array
      };
      next();
    } catch (error: any) {
      logger.error('JWT verification failed', { error: error.message });
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Access token expired' });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid access token' });
      }
      return res.status(403).json({ message: 'Failed to authenticate token' });
    }
  } else {
    logger.warn('Authentication attempt with no Authorization header or incorrect format');
    return res.status(401).json({ message: 'Authorization header is missing or not in Bearer format' });
  }
};
