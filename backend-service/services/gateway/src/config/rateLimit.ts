export const rateLimitConfig = {
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: any) => {
      // Skip rate limiting for health checks and metrics
      return req.path === '/health' || req.path === '/metrics';
    }
  },

  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Stricter limit for auth endpoints
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
  },

  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // Limit file uploads
    message: {
      error: 'Too many upload attempts, please try again later.',
      retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false
  },

  search: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Higher limit for search queries
    message: {
      error: 'Too many search requests, please try again later.',
      retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false
  }
};
