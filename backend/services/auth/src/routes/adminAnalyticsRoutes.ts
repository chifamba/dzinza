import express, { Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { authMiddleware, AuthenticatedRequest } from '@shared/middleware/auth'; // Adjust path
import { adminAuth } from '@shared/middleware/adminAuth'; // Adjust path
import { logger } from '@shared/utils/logger'; // Adjust path

const router = express.Router();

// Valid enum values for request parameters
const validTrendPeriods = ['daily', 'weekly', 'monthly'];
const validContentTypes = ['events', 'comments', 'persons', 'trees'];

// GET /api/admin/analytics/summary - Overall Summary Stats Stub
router.get(
  '/summary',
  authMiddleware,
  adminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    logger.info('Admin: Fetching analytics summary (stub).', { adminUserId: req.user?.id });
    try {
      // Hardcoded response for the stub
      const summaryData = {
        totalUsers: 1250,
        newUsersLast7Days: 75,
        activeUsersLast24Hours: 350, // Added an example extra field
        totalFamilyTrees: 300,
        totalEvents: 5000,
        totalComments: 15000,
        totalMediaItems: 8000, // Added an example extra field
        lastUpdatedAt: new Date().toISOString(), // Use current time for stub
      };
      res.status(200).json(summaryData);
    } catch (error) {
      logger.error('Admin: Error fetching analytics summary (stub):', { error, adminUserId: req.user?.id });
      res.status(500).json({ message: 'Server error while fetching summary analytics.' });
    }
  }
);

// GET /api/admin/analytics/user-trends - User Sign-up Trends Stub
router.get(
  '/user-trends',
  authMiddleware,
  adminAuth,
  [
    query('period').optional().isIn(validTrendPeriods)
      .withMessage(`Period must be one of: ${validTrendPeriods.join(', ')}.`).default('daily'),
    query('startDate').optional().isISO8601().toDate().withMessage('Start date must be a valid ISO8601 date.'),
    query('endDate').optional().isISO8601().toDate().withMessage('End date must be a valid ISO8601 date.')
      .custom((value, { req }) => {
        if (req.query?.startDate && value < req.query.startDate) {
          throw new Error('End date must be after start date.');
        }
        return true;
      }),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
        period = 'daily', // Default from validation if not provided
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 7 days ago
        endDate = new Date().toISOString().split('T')[0] // Default to today
    } = req.query as any; // Cast after validation

    logger.info('Admin: Fetching user trends (stub).', { period, startDate, endDate, adminUserId: req.user?.id });

    try {
      // Hardcoded response for the stub
      const userTrendsData = {
        period,
        startDate,
        endDate,
        dataPoints: [
          { date: new Date(new Date(endDate).setDate(new Date(endDate).getDate() - 2)).toISOString().split('T')[0], count: 8 },
          { date: new Date(new Date(endDate).setDate(new Date(endDate).getDate() - 1)).toISOString().split('T')[0], count: 12 },
          { date: endDate, count: 10 },
        ],
      };
      res.status(200).json(userTrendsData);
    } catch (error) {
      logger.error('Admin: Error fetching user trends (stub):', { error, adminUserId: req.user?.id });
      res.status(500).json({ message: 'Server error while fetching user trends.' });
    }
  }
);

// GET /api/admin/analytics/content-trends - Content Creation Trends Stub
router.get(
  '/content-trends',
  authMiddleware,
  adminAuth,
  [
    query('contentType').optional().isIn(validContentTypes)
      .withMessage(`Content type must be one of: ${validContentTypes.join(', ')}.`).default('events'),
    query('period').optional().isIn(validTrendPeriods)
      .withMessage(`Period must be one of: ${validTrendPeriods.join(', ')}.`).default('daily'),
    query('startDate').optional().isISO8601().toDate().withMessage('Start date must be a valid ISO8601 date.'),
    query('endDate').optional().isISO8601().toDate().withMessage('End date must be a valid ISO8601 date.')
      .custom((value, { req }) => {
        if (req.query?.startDate && value < req.query.startDate) {
          throw new Error('End date must be after start date.');
        }
        return true;
      }),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
        contentType = 'events', // Default from validation
        period = 'daily', // Default from validation
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate = new Date().toISOString().split('T')[0]
    } = req.query as any; // Cast after validation

    logger.info('Admin: Fetching content trends (stub).', { contentType, period, startDate, endDate, adminUserId: req.user?.id });

    try {
      // Hardcoded response for the stub
      const contentTrendsData = {
        contentType,
        period,
        startDate,
        endDate,
        dataPoints: [
          { date: new Date(new Date(endDate).setDate(new Date(endDate).getDate() - 2)).toISOString().split('T')[0], count: contentType === 'events' ? 55 : (contentType === 'comments' ? 150 : (contentType === 'persons' ? 20 : 5)) },
          { date: new Date(new Date(endDate).setDate(new Date(endDate).getDate() - 1)).toISOString().split('T')[0], count: contentType === 'events' ? 65 : (contentType === 'comments' ? 180 : (contentType === 'persons' ? 25 : 8)) },
          { date: endDate, count: contentType === 'events' ? 50 : (contentType === 'comments' ? 160 : (contentType === 'persons' ? 18 : 6)) },
        ],
      };
      res.status(200).json(contentTrendsData);
    } catch (error) {
      logger.error('Admin: Error fetching content trends (stub):', { error, adminUserId: req.user?.id });
      res.status(500).json({ message: 'Server error while fetching content trends.' });
    }
  }
);

export default router;
