import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { logger } from '../src/utils/logger'; // Assuming logger can be used or use console

let mongoServer: MongoMemoryServer;

const setup = async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  try {
    await mongoose.connect(mongoUri);
    logger.info('Test MongoDB connected at ' + mongoUri);
  } catch (err) {
    logger.error('Test MongoDB connection error:', err);
    process.exit(1);
  }
};

const teardown = async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  logger.info('Test MongoDB stopped.');
};

const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

// Global beforeAll and afterAll hooks if this file is configured as globalSetup/globalTeardown in Jest
// For now, these can be imported and used in test suites.

export { setup, teardown, clearDatabase };
