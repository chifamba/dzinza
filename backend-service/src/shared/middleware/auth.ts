import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Access token required",
      });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      logger.error("JWT_SECRET not configured");
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Authentication configuration error",
      });
    }

    const decoded = jwt.verify(token, jwtSecret) as any;

    // Validate token structure
    if (!decoded.id || !decoded.email) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid token structure",
      });
    }

    // Add user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || "user",
      permissions: decoded.permissions || [],
    };

    // Log authentication success
    logger.info("User authenticated successfully", {
      userId: req.user.id,
      email: req.user.email,
      endpoint: req.originalUrl,
      method: req.method,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Token expired",
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid token",
      });
    }

    logger.error("Authentication error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Authentication processing error",
    });
  }
};

export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authMiddleware(req, res, next);
  }

  next();
};

export const requireRole = (requiredRoles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void | Response => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    if (!requiredRoles.includes(req.user.role)) {
      logger.warn("Access denied - insufficient role", {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles,
        endpoint: req.originalUrl,
      });

      return res.status(403).json({
        error: "Forbidden",
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

export const requirePermission = (requiredPermission: string) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void | Response => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    if (!req.user.permissions.includes(requiredPermission)) {
      logger.warn("Access denied - missing permission", {
        userId: req.user.id,
        requiredPermission,
        userPermissions: req.user.permissions,
        endpoint: req.originalUrl,
      });

      return res.status(403).json({
        error: "Forbidden",
        message: "Permission denied",
      });
    }

    next();
  };
};
