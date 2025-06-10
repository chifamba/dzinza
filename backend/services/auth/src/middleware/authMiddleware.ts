import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken'; // Import JwtPayload
// import { User } from '../models/User'; // User model not directly used here currently
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
      // Define a more specific type for the decoded payload if possible, matching your JWT structure
      interface DecodedToken extends JwtPayload {
        userId: string;
        email: string;
        roles?: string[];
        // Add other fields you expect in your token
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-default-secret') as DecodedToken;

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
    } catch (error) { // Type error more generally, then check properties
      const err = error as Error & { name?: string }; // Cast to Error and allow checking for name
      logger.error('JWT verification failed', { error: err.message });
      if (err.name === 'TokenExpiredError') {
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
