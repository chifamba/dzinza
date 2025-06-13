import express from 'express';
import { query, validationResult } from 'express-validator';
import { ElasticsearchService } from '../services/elasticsearch';
import { logger } from '../../../shared/utils/logger';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     SearchAnalytics:
 *       type: object
 *       properties:
 *         search_volume:
 *           type: object
 *           description: Search volume over time
 *         popular_queries:
 *           type: object
 *           description: Most popular search queries
 *         search_types:
 *           type: object
 *           description: Distribution of search types
 *         avg_results:
 *           type: object
 *           description: Average number of results per search
 */

/**
 * @swagger
 * /api/analytics/search:
 *   get:
 *     summary: Get search analytics data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (ISO format)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (ISO format)
 *       - in: query
 *         name: global
 *         schema:
 *           type: boolean
 *         description: Include global analytics (admin only)
 *     responses:
 *       200:
 *         description: Search analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SearchAnalytics'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     dateRange:
 *                       type: object
 *                     userId:
 *                       type: string
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (for global analytics without admin role)
 *       500:
 *         description: Internal server error
 */
router.get('/search', [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('global').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { from, to, global } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user can access global analytics
    if (global === 'true' && userRole !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin role required for global analytics'
      });
    }

    const dateRange = from && to ? {
      from: from as string,
      to: to as string
    } : undefined;

    const analyticsUserId = global === 'true' ? undefined : userId;

    const analytics = await ElasticsearchService.getSearchAnalytics(
      analyticsUserId,
      dateRange
    );

    res.json({
      success: true,
      data: analytics,
      meta: {
        dateRange,
        userId: analyticsUserId,
        global: global === 'true'
      }
    });
  } catch (error) {
    logger.error('Analytics error:', error);
    res.status(500).json({
      error: 'Analytics failed',
      message: 'An error occurred while retrieving analytics'
    });
  }
});

/**
 * @swagger
 * /api/analytics/popular-searches:
 *   get:
 *     summary: Get popular search terms
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of popular searches to return
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of days to look back
 *     responses:
 *       200:
 *         description: Popular search terms
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       query:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       percentage:
 *                         type: number
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/popular-searches', [
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('days').optional().isInt({ min: 1, max: 365 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const days = parseInt(req.query.days as string) || 30;
    const userId = req.user.id;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const analytics = await ElasticsearchService.getSearchAnalytics(
      userId,
      {
        from: fromDate.toISOString(),
        to: new Date().toISOString()
      }
    );

    // Extract popular queries and calculate percentages
    const popularQueries = analytics.popular_queries?.buckets || [];
    const totalSearches = popularQueries.reduce((sum: number, bucket: any) => sum + bucket.doc_count, 0);

    const formattedData = popularQueries
      .slice(0, limit)
      .map((bucket: any) => ({
        query: bucket.key,
        count: bucket.doc_count,
        percentage: totalSearches > 0 ? (bucket.doc_count / totalSearches) * 100 : 0
      }));

    res.json({
      success: true,
      data: formattedData,
      meta: {
        limit,
        days,
        totalSearches
      }
    });
  } catch (error) {
    logger.error('Popular searches error:', error);
    res.status(500).json({
      error: 'Popular searches failed',
      message: 'An error occurred while retrieving popular searches'
    });
  }
});

/**
 * @swagger
 * /api/analytics/search-trends:
 *   get:
 *     summary: Get search volume trends over time
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 7
 *           maximum: 365
 *           default: 30
 *         description: Number of days to analyze
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month]
 *           default: day
 *         description: Time interval for aggregation
 *     responses:
 *       200:
 *         description: Search volume trends
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       count:
 *                         type: integer
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/search-trends', [
  query('days').optional().isInt({ min: 7, max: 365 }),
  query('interval').optional().isIn(['hour', 'day', 'week', 'month'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const days = parseInt(req.query.days as string) || 30;
    const interval = req.query.interval as string || 'day';
    const userId = req.user.id;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const analytics = await ElasticsearchService.getSearchAnalytics(
      userId,
      {
        from: fromDate.toISOString(),
        to: new Date().toISOString()
      }
    );

    // Extract search volume data
    const searchVolume = analytics.search_volume?.buckets || [];
    const formattedData = searchVolume.map((bucket: any) => ({
      date: bucket.key_as_string || bucket.key,
      count: bucket.doc_count
    }));

    res.json({
      success: true,
      data: formattedData,
      meta: {
        days,
        interval,
        totalDataPoints: formattedData.length
      }
    });
  } catch (error) {
    logger.error('Search trends error:', error);
    res.status(500).json({
      error: 'Search trends failed',
      message: 'An error occurred while retrieving search trends'
    });
  }
});

/**
 * @swagger
 * /api/analytics/search-performance:
 *   get:
 *     summary: Get search performance metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search performance metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     avgResults:
 *                       type: number
 *                       description: Average number of results per search
 *                     totalSearches:
 *                       type: integer
 *                       description: Total number of searches
 *                     searchTypes:
 *                       type: object
 *                       description: Distribution of search types
 *                     zeroResultSearches:
 *                       type: integer
 *                       description: Number of searches with no results
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/search-performance', async (req, res) => {
  try {
    const userId = req.user.id;

    const analytics = await ElasticsearchService.getSearchAnalytics(userId);

    const searchTypes = analytics.search_types?.buckets || [];
    const avgResults = analytics.avg_results?.value || 0;

    // Calculate total searches and zero result searches
    const totalSearches = searchTypes.reduce((sum: number, bucket: any) => sum + bucket.doc_count, 0);
    
    res.json({
      success: true,
      data: {
        avgResults: Math.round(avgResults * 100) / 100,
        totalSearches,
        searchTypes: searchTypes.reduce((acc: any, bucket: any) => {
          acc[bucket.key] = bucket.doc_count;
          return acc;
        }, {}),
        performance: {
          avgResultsPerSearch: avgResults,
          searchesWithResults: Math.round((avgResults > 0 ? totalSearches : 0) * 100 / totalSearches) || 0
        }
      },
      meta: {
        userId,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Search performance error:', error);
    res.status(500).json({
      error: 'Search performance failed',
      message: 'An error occurred while retrieving search performance metrics'
    });
  }
});

export default router;
