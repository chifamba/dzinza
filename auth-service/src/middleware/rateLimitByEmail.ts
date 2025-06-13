import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// Create a rate limiter that uses email as the key for auth endpoints
export const rateLimitByEmail = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each email to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts for this email, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use email from request body as the key, fallback to IP
    return req.body?.email || req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts for this email, please try again later.',
      retryAfter: '15 minutes',
      timestamp: new Date().toISOString(),
    });
  },
});
