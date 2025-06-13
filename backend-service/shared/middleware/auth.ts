import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        permissions?: string[];
      };
    }
  }
}

interface JWTPayload {
  id: string;
  email: string;
  role: string;
  permissions?: string[];
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "Access denied. No token provided." });
      return;
    }

    const secret = process.env.JWT_SECRET || "fallback-secret-for-development";
    const decoded = jwt.verify(token, secret) as JWTPayload;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
    };

    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token." });
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  next();
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    if (
      req.user.role !== "admin" &&
      !req.user.permissions?.includes(permission)
    ) {
      res.status(403).json({ error: `Permission required: ${permission}` });
      return;
    }

    next();
  };
};
