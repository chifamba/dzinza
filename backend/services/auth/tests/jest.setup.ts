import { setup as setupMongo, teardown as teardownMongo, clearDatabase } from './setup'; // From our DB setup file
import { logger } from '../src/utils/logger'; // Optional: for logging during test setup

// Mock nodemailer before all tests
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mocked-message-id' }),
  }),
}));

// Mock parts of passport if needed for specific unit tests,
// but for integration tests, we often let Passport initialize and mock the strategy's verify callback.
// jest.mock('passport');


// Connect to the in-memory database before all tests run
beforeAll(async () => {
  logger.info('Jest setup: Connecting to in-memory MongoDB...');
  await setupMongo();
});

// Clear all test data after every test
afterEach(async () => {
  // logger.info('Jest setup: Clearing database after test...');
  await clearDatabase();
});

// Disconnect from the in-memory database after all tests run
afterAll(async () => {
  logger.info('Jest setup: Disconnecting from in-memory MongoDB...');
  await teardownMongo();
});
