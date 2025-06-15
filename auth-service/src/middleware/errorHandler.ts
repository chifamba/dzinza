import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error("Error occurred:", {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Default error
  let status = 500;
  let message = "Internal Server Error";

  // Handle specific error types
  if (error.name === "ValidationError") {
    status = 400;
    message = "Validation Error";
  } else if (error.name === "UnauthorizedError") {
    status = 401;
    message = "Unauthorized";
  } else if (error.message.includes("duplicate key")) {
    status = 409;
    message = "Resource already exists";
  }

  res.status(status).json({
    error: error.name || "Error",
    message,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};
