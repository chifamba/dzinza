import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";
import "../types/express";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key";
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    (req as any).user = {
      id: decoded.userId || decoded.id,
      role: decoded.role || "user",
      email: decoded.email,
    };

    next();
  } catch (error) {
    logger.error("Auth middleware error:", error);
    res.status(401).json({ error: "Invalid token." });
  }
};
