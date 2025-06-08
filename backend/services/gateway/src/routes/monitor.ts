import { Router } from 'express';
import { serviceDiscovery, validateServiceAvailability } from '../config/services';
import { logger } from '../../../../shared/utils/logger';

const router = Router();

/**
 * @swagger
 * /monitor/health:
 *   get:
 *     summary: Comprehensive health check for all services
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Health status of all services
 */
router.get('/health', async (req, res) => {
  try {
    const services = await validateServiceAvailability();
    const allHealthy = services.every(service => service.healthy);
    
    const healthStatus = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      gateway: {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      },
      services: services.reduce((acc, service) => {
        acc[service.name] = {
          status: service.healthy ? 'healthy' : 'unhealthy',
          url: service.url
        };
        return acc;
      }, {} as Record<string, any>)
    };

    res.status(allHealthy ? 200 : 503).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /monitor/services:
 *   get:
 *     summary: Get service discovery configuration
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Service configuration
 */
router.get('/services', (req, res) => {
  const services = serviceDiscovery();
  res.json({
    services,
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /monitor/metrics:
 *   get:
 *     summary: Get basic system metrics
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: System metrics
 */
router.get('/metrics', (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  };

  res.json(metrics);
});

export default router;
