import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log error
  logger.error(
    `${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`
  );
  logger.error(err.stack);

  // Send response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
