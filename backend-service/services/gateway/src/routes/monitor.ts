import express from "express";

const router = express.Router();

/**
 * @swagger
 * /monitor/health:
 *   get:
 *     summary: Gateway health check
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Gateway is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "gateway",
    version: process.env.npm_package_version || "1.0.0",
  });
});

/**
 * @swagger
 * /monitor/metrics:
 *   get:
 *     summary: Gateway metrics
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Gateway metrics
 */
router.get("/metrics", (req, res) => {
  // Basic metrics - extend as needed
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
