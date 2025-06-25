import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";

export interface User {
  id: string;
  email: string;
  roles: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      logger.error("JWT_SECRET is not defined in environment variables");
      return res
        .status(500)
        .json({ error: "Authentication configuration error" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      roles: string[];
    };

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Auth middleware error: ${error.message}`);
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token has expired" });
      }
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ error: "Invalid token" });
      }
    }
    return res.status(500).json({ error: "Authentication error" });
  }
};
