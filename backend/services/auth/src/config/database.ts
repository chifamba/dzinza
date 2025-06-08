import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dzinza_auth';
    
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });

    logger.info('MongoDB connected successfully', { 
      service: 'auth',
      database: mongoUri.split('@').pop() || mongoUri // Hide credentials in logs
    });

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error, { service: 'auth' });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected', { service: 'auth' });
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected', { service: 'auth' });
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error, { service: 'auth' });
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed', { service: 'auth' });
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error, { service: 'auth' });
  }
};
