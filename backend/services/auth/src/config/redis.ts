import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType;

export const connectRedis = async (): Promise<void> => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true,
      },
    });

    redisClient.on('error', (error) => {
      logger.error('Redis connection error:', error, { service: 'auth' });
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected', { service: 'auth' });
    });

    redisClient.on('ready', () => {
      logger.info('Redis ready', { service: 'auth' });
    });

    redisClient.on('end', () => {
      logger.warn('Redis connection ended', { service: 'auth' });
    });

    await redisClient.connect();
    
    // Test the connection
    await redisClient.ping();
    logger.info('Redis connection successful', { service: 'auth' });

  } catch (error) {
    logger.error('Failed to connect to Redis:', error, { service: 'auth' });
    // Don't exit process for Redis failure, auth can work without it
  }
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis connection closed', { service: 'auth' });
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error, { service: 'auth' });
  }
};
