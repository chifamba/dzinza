import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

export const rateLimitByEmail = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each email to 5 requests per windowMs
  message: {
    error: "Too Many Requests",
    message: "Too many requests from this email, please try again later.",
  },
  keyGenerator: (req: Request): string => {
    return req.body.email || req.ip; // Use email from request body, fallback to IP
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: "Too Many Requests",
      message: "Too many requests from this email, please try again later.",
    });
  },
});
