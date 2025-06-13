import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/rbacMiddleware';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Access the admin dashboard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful access to the admin dashboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Welcome to the Admin Dashboard
 *       401:
 *         description: Unauthorized - Token is missing or invalid
 *       403:
 *         description: Forbidden - User does not have admin role
 */
router.get(
  '/dashboard',
  authenticateToken,
  authorizeRoles('admin'),
  (req: AuthenticatedRequest, res: Response) => {
    logger.info(`Admin dashboard accessed by user: ${req.user?.email}`, { userId: req.user?.id });
    res.status(200).json({ message: `Welcome to the Admin Dashboard, ${req.user?.firstName || req.user?.email}!` });
  }
);

// Add more admin-specific routes here if needed

export { router as adminRoutes };
